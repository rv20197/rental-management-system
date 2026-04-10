import {
  Rental as RentalModel,
  Customer as CustomerModel,
  RentalItem as RentalItemModel,
  Billing as BillingModel,
} from '../models';
import { Item, InventoryUnit } from '../models/Item';
import sequelize from '../config/database';
import { calculateMonthsRented } from '../utils/billingUtils';
import { calculateDefaultDeposit } from '../utils/rentalUtils';
import { Rental, RentalItem } from '../types';

export const RentalService = {
  async getAllRentals(filters: { customerId?: string; status?: string }) {
    const { customerId, status } = filters;
    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const rentals = await RentalModel.findAll({
      where,
      include: [
        { model: RentalItemModel, include: [Item] },
        { model: BillingModel },
        Item,
        CustomerModel
      ]
    });

    return rentals.map((rental: any) => {
      const rentalData = rental.toJSON() as any;
      const months = calculateMonthsRented(new Date(rentalData.startDate), new Date(rentalData.endDate), new Date(rentalData.endDate));
      let baseAmount = 0;

      let totalQuantity = 0;
      let totalReturnedQuantity = 0;

      if (rentalData.RentalItems && rentalData.RentalItems.length > 0) {
        rentalData.RentalItems.forEach((ri: any) => {
          const rate = ri.Item?.monthlyRate ? parseFloat(ri.Item.monthlyRate) : 0;
          baseAmount += ri.quantity * rate * months;
          totalQuantity += ri.quantity;
          totalReturnedQuantity += ri.returnedQuantity || 0;
        });
      } else {
        const rate = rentalData.Item?.monthlyRate ? parseFloat(rentalData.Item.monthlyRate) : 0;
        baseAmount = (rentalData.quantity || 0) * rate * months;
        totalQuantity = rentalData.quantity || 0;
        totalReturnedQuantity = rentalData.returnedQuantity || 0;
      }

      const transportCost = Number(rentalData.transportCost || 0);
      const labourCost = Number(rentalData.labourCost || 0);
      const totalAmount = baseAmount + transportCost + labourCost;
      const outstandingAmount = (rentalData.Billings || []).reduce((sum: number, billing: any) => {
        if (billing.status === 'paid') return sum;
        return sum + Number(billing.amount || 0);
      }, 0);

      return {
        ...rentalData,
        baseAmount,
        transportCost,
        labourCost,
        depositAmount: Number(rentalData.depositAmount || 0),
        totalAmount,
        outstandingAmount,
        outstandingQty: totalQuantity - totalReturnedQuantity
      };
    });
  },

  async createRental(payload: any) {
    const { items, ...rentalData } = payload;
    const transaction = await sequelize.transaction();

    try {
      let requestedItems = [];
      if (items && Array.isArray(items) && items.length > 0) {
        requestedItems = items;
      } else if (payload.itemId) {
        requestedItems = [{
          itemId: payload.itemId,
          quantity: payload.quantity || 1
        }];
      }

      if (requestedItems.length === 0) {
        throw new Error('At least one item is required for rental.');
      }

      const allAssignedUnits: { itemId: number, unitIds: number[], quantity: number }[] = [];
      const itemIds = requestedItems.map(ri => ri.itemId);
      const itemsData = await Item.findAll({ where: { id: itemIds }, transaction });
      const itemMap = new Map(itemsData.map(i => [i.id, i]));

      for (const requestedItem of requestedItems) {
        const { itemId, quantity } = requestedItem;
        const requestedQuantity = Number(quantity) || 1;

        const item = itemMap.get(itemId);
        if (!item) throw new Error(`Target item ${itemId} not found for rental.`);

        const existingUnitsCount = await InventoryUnit.count({ where: { itemId }, transaction });
        const itemQuantity = item.quantity || 0;
        if (existingUnitsCount < itemQuantity) {
          const unitsToCreate = itemQuantity - existingUnitsCount;
          const inventoryUnitsPayload = [];
          for (let i = 0; i < unitsToCreate; i++) {
            inventoryUnitsPayload.push({ itemId: item.id, status: 'available' });
          }
          await InventoryUnit.bulkCreate(inventoryUnitsPayload as any, { transaction });
        }

        const availableUnits: any = await InventoryUnit.findAll({
          where: { itemId: itemId, status: 'available' },
          order: [['dateAdded', 'ASC']],
          limit: requestedQuantity,
          transaction
        });

        if (availableUnits.length < requestedQuantity) {
          throw new Error(`Insufficient stock for item: ${item.name}`);
        }

        allAssignedUnits.push({
          itemId,
          unitIds: availableUnits.map((u: any) => u.id),
          quantity: requestedQuantity
        });
      }

      const providedStart = rentalData.startDate ? new Date(rentalData.startDate) : new Date();
      const providedEnd = rentalData.endDate ? new Date(rentalData.endDate) : (() => {
        const d = new Date(providedStart);
        d.setDate(d.getDate() + 30);
        return d;
      })();

      let totalDeposit = rentalData.depositAmount;
      if (totalDeposit == null) {
        totalDeposit = 0;
        for (const assigned of allAssignedUnits) {
          const item = itemMap.get(assigned.itemId);
          const monthlyRate = item?.monthlyRate ? parseFloat(item.monthlyRate.toString()) : 0;
          totalDeposit += calculateDefaultDeposit(monthlyRate, assigned.quantity);
        }
      }

      const rental = await RentalModel.create({
        ...rentalData,
        startDate: providedStart,
        endDate: providedEnd,
        depositAmount: totalDeposit,
        itemId: allAssignedUnits.length > 0 ? allAssignedUnits[0].itemId : null,
        quantity: allAssignedUnits.length > 0 ? allAssignedUnits[0].quantity : 0,
        inventoryUnitIds: allAssignedUnits.length > 0 ? allAssignedUnits[0].unitIds : []
      }, { transaction });

      const rentalItemPayloads = allAssignedUnits.map(assigned => ({
        rentalId: rental.id,
        itemId: assigned.itemId,
        quantity: assigned.quantity,
        inventoryUnitIds: assigned.unitIds
      }));
      await RentalItemModel.bulkCreate(rentalItemPayloads, { transaction });

      for (const assigned of allAssignedUnits) {
        const item = itemMap.get(assigned.itemId);
        if (item) {
          await item.update({ quantity: item.quantity - assigned.quantity }, { transaction });
        }
        await InventoryUnit.update({ status: 'rented' }, { where: { id: assigned.unitIds.map(String) }, transaction });
      }

      await transaction.commit();

      return await RentalModel.findByPk(rental.id, {
        include: [{ model: RentalItemModel, include: [Item] }, CustomerModel]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async getRentalById(id: string) {
    const rental = await RentalModel.findByPk(id, {
      include: [{ model: RentalItemModel, include: [Item] }, { model: BillingModel }, Item, CustomerModel]
    });
    if (!rental) return null;

    const rentalData = rental.toJSON() as any;
    const months = calculateMonthsRented(new Date(rentalData.startDate), new Date(rentalData.endDate), new Date(rentalData.endDate));
    let baseAmount = 0;

    if (rentalData.RentalItems && rentalData.RentalItems.length > 0) {
      rentalData.RentalItems.forEach((ri: any) => {
        const rate = ri.Item?.monthlyRate ? parseFloat(ri.Item.monthlyRate) : 0;
        baseAmount += ri.quantity * rate * months;
      });
    } else {
      const rate = rentalData.Item?.monthlyRate ? parseFloat(rentalData.Item.monthlyRate) : 0;
      baseAmount = (rentalData.quantity || 0) * rate * months;
    }

    const transportCost = Number(rentalData.transportCost || 0);
    const labourCost = Number(rentalData.labourCost || 0);
    const totalAmount = baseAmount + transportCost + labourCost;
    const outstandingAmount = (rentalData.Billings || []).reduce((sum: number, billing: any) => {
      if (billing.status === 'paid') return sum;
      return sum + Number(billing.amount || 0);
    }, 0);

    return {
      ...rentalData,
      baseAmount,
      transportCost,
      labourCost,
      depositAmount: Number(rentalData.depositAmount || 0),
      totalAmount,
      outstandingAmount
    };
  },

  async updateRental(id: string, payload: any) {
    const { items, ...rentalData } = payload;
    const transaction = await sequelize.transaction();

    try {
      const rental = await RentalModel.findByPk(id, { include: [{ model: RentalItemModel }], transaction });
      if (!rental) throw new Error('Rental not found');
      if (rental.status === 'returned' || rental.status === 'completed') {
        throw new Error('This rental can no longer be edited.');
      }

      if (rentalData.endDate) {
        const newEnd = new Date(rentalData.endDate);
        const start = new Date(rental.startDate);
        if (isNaN(newEnd.getTime())) throw new Error('Invalid endDate provided');
        if (newEnd <= start) throw new Error('New end date must be after start date');
      }

      if (items && Array.isArray(items)) {
        const existingRentalItems = rental.RentalItems || [];
        const updatedItemIds = items.map(i => i.itemId);

        const itemsToRemove = existingRentalItems.filter((eri: any) => !updatedItemIds.includes(eri.itemId));
        if (itemsToRemove.length > 0) {
          const itemIdsToRemove = itemsToRemove.map(eri => eri.itemId);
          const itemsToRemoveData = await Item.findAll({ where: { id: itemIdsToRemove }, transaction });
          const itemMap = new Map(itemsToRemoveData.map(i => [i.id, i]));

          for (const eri of itemsToRemove) {
            const item = itemMap.get(eri.itemId);
            if (item) await item.update({ quantity: item.quantity + eri.quantity }, { transaction });
            await InventoryUnit.update({ status: 'available' }, { where: { id: eri.inventoryUnitIds.map(String) }, transaction });
            await eri.destroy({ transaction });
          }
        }

        const itemIdsToProcess = items.map(i => i.itemId);
        const itemsData = await Item.findAll({ where: { id: itemIdsToProcess }, transaction });
        const itemMap = new Map(itemsData.map(i => [i.id, i]));

        for (const requestedItem of items) {
          const { itemId, quantity } = requestedItem;
          const requestedQuantity = Number(quantity);
          if (requestedQuantity <= 0) continue;

          const existingItem = existingRentalItems.find((eri: any) => eri.itemId === itemId);

          if (existingItem) {
            const diff = requestedQuantity - existingItem.quantity;
            if (diff > 0) {
              const availableUnits: any = await InventoryUnit.findAll({
                where: { itemId: itemId, status: 'available' },
                order: [['dateAdded', 'ASC']],
                limit: diff,
                transaction
              });
              if (availableUnits.length < diff) {
                const item = itemMap.get(itemId);
                throw new Error(`Insufficient stock for item: ${item?.name || itemId}`);
              }
              const newUnitIds = availableUnits.map((u: any) => u.id);
              await InventoryUnit.update({ status: 'rented' }, { where: { id: newUnitIds }, transaction });
              await existingItem.update({ quantity: requestedQuantity, inventoryUnitIds: [...existingItem.inventoryUnitIds, ...newUnitIds] }, { transaction });
              const item = itemMap.get(itemId);
              if (item) await item.update({ quantity: item.quantity - diff }, { transaction });
            } else if (diff < 0) {
              const releaseCount = Math.abs(diff);
              const releaseUnitIds = existingItem.inventoryUnitIds.slice(0, releaseCount);
              const remainUnitIds = existingItem.inventoryUnitIds.slice(releaseCount);
              await InventoryUnit.update({ status: 'available' }, { where: { id: releaseUnitIds }, transaction });
              await existingItem.update({ quantity: requestedQuantity, inventoryUnitIds: remainUnitIds }, { transaction });
              const item = itemMap.get(itemId);
              if (item) await item.update({ quantity: item.quantity + releaseCount }, { transaction });
            }
          } else {
            const item = itemMap.get(itemId);
            if (!item) throw new Error(`Item ${itemId} not found.`);
            const availableUnits: any = await InventoryUnit.findAll({
              where: { itemId: itemId, status: 'available' },
              order: [['dateAdded', 'ASC']],
              limit: requestedQuantity,
              transaction
            });
            if (availableUnits.length < requestedQuantity) throw new Error(`Insufficient stock for item: ${item.name}`);
            const unitIds = availableUnits.map((u: any) => u.id);
            await RentalItemModel.create({ rentalId: rental.id, itemId, quantity: requestedQuantity, inventoryUnitIds: unitIds }, { transaction });
            await item.update({ quantity: item.quantity - requestedQuantity }, { transaction });
            await InventoryUnit.update({ status: 'rented' }, { where: { id: unitIds.map(String) }, transaction });
          }
        }
      }

      let finalDeposit = rentalData.depositAmount;
      if (finalDeposit == null) {
        finalDeposit = 0;
        const currentRentalItems = await RentalItemModel.findAll({ where: { rentalId: rental.id }, include: [Item], transaction });
        const itemIds = currentRentalItems.map(ri => ri.itemId);
        const itemsData = await Item.findAll({ where: { id: itemIds }, transaction });
        const itemMap = new Map(itemsData.map(i => [i.id, i]));
        for (const ri of currentRentalItems) {
          const item = itemMap.get(ri.itemId);
          const monthlyRate = item?.monthlyRate ? parseFloat(item.monthlyRate.toString()) : 0;
          finalDeposit += calculateDefaultDeposit(monthlyRate, ri.quantity);
        }
      }

      const updatedRentalItems = await RentalItemModel.findAll({ where: { rentalId: rental.id }, transaction });
      const firstItem = updatedRentalItems.length > 0 ? updatedRentalItems[0] : null;

      await rental.update({
        ...rentalData,
        depositAmount: finalDeposit,
        itemId: firstItem ? firstItem.itemId : rental.itemId,
        quantity: firstItem ? firstItem.quantity : rental.quantity,
        inventoryUnitIds: firstItem ? firstItem.inventoryUnitIds : rental.inventoryUnitIds
      }, { transaction });

      await transaction.commit();

      return await RentalModel.findByPk(rental.id, {
        include: [{ model: RentalItemModel, include: [Item] }, CustomerModel]
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async deleteRental(id: string) {
    const rental = await RentalModel.findByPk(id);
    if (!rental) throw new Error('Rental not found');
    await rental.destroy();
    return { message: 'Rental deleted successfully' };
  }
};
