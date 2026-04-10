import {
  Billing as BillingModel,
  Rental as RentalModel,
  Customer as CustomerModel,
  BillingItem as BillingItemModel,
  RentalItem as RentalItemModel,
  BillingDamage as BillingDamageModel
} from '../models';
import { Item, InventoryUnit } from '../models/Item';
import sequelize from '../config/database';
import { calculateMonthsRented } from '../utils/billingUtils';
import { Billing, BillingItem, BillingDamage } from '../types';

export const BillingService = {
  async getAllBillings() {
    const billings = await BillingModel.findAll({
      include: [
        {
          model: RentalModel,
          include: [
            CustomerModel,
            Item,
            { model: RentalItemModel, include: [Item] }
          ]
        },
        { model: CustomerModel },
        { model: BillingItemModel, include: [Item] },
        { model: BillingDamageModel }
      ]
    });

    return billings.map((billing: any) => {
      const billingData = billing.toJSON() as Billing;
      const labourCost = parseFloat(billingData.labourCost?.toString() || "0");
      const transportCost = parseFloat(billingData.transportCost?.toString() || "0");
      const baseAmount = parseFloat(billingData.amount?.toString() || "0") - labourCost - transportCost;
      const totalAmount = parseFloat(billingData.amount?.toString() || "0");

      return {
        ...billingData,
        baseAmount,
        transportCost,
        labourCost,
        depositAmount: parseFloat(billingData.Rental?.depositAmount?.toString() || "0"),
        totalAmount
      };
    });
  },

  async createBilling(payload: any) {
    const { items, damages, ...billingData } = payload;

    let itemsTotal = 0;
    let processedItems: BillingItem[] = [];

    if (items && Array.isArray(items) && items.length > 0) {
      processedItems = items.map((item: any) => {
        const quantity = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;
        const total = quantity * rate;
        itemsTotal += total;
        return { ...item, quantity, rate, total };
      });
    } else {
      itemsTotal = Number(billingData.amount) || 0;
    }

    let totalDamages = 0;
    let processedDamages: BillingDamage[] = [];
    if (damages && Array.isArray(damages) && damages.length > 0) {
      processedDamages = damages.map((damage: any) => {
        const amount = Number(damage.amount) || 0;
        totalDamages += amount;
        return { ...damage, amount };
      });
    }

    const availableDeposit = Number(billingData.availableDeposit) || 0;
    const depositUsed = Math.min(availableDeposit, totalDamages);
    const excessDamages = Math.max(0, totalDamages - availableDeposit);
    const finalAmount = itemsTotal + excessDamages;

    const billing = await BillingModel.create({
      ...billingData,
      totalDamages,
      depositUsed,
      amount: finalAmount
    });

    if (processedItems.length > 0) {
      await BillingItemModel.bulkCreate(processedItems.map(item => ({ ...item, billingId: billing.id })));
    }

    if (processedDamages.length > 0) {
      await BillingDamageModel.bulkCreate(processedDamages.map(damage => ({ ...damage, billingId: billing.id })));
    }

    return await BillingModel.findByPk(billing.id, {
      include: [
        { model: RentalModel, include: [CustomerModel, Item] },
        { model: CustomerModel },
        { model: BillingItemModel, include: [Item] },
        { model: BillingDamageModel }
      ]
    });
  },

  async payBilling(id: string) {
    const billing = await BillingModel.findByPk(id, { include: [RentalModel] });
    if (!billing) throw new Error('Billing not found');
    if (billing.status === 'paid') throw new Error('Billing is already paid');

    await billing.update({ status: 'paid', paymentDate: new Date() });
    return billing;
  },

  async getBillingById(id: string) {
    const billing = await BillingModel.findByPk(id, {
      include: [
        {
          model: RentalModel,
          include: [CustomerModel, Item, { model: RentalItemModel, include: [Item] }]
        },
        { model: CustomerModel },
        { model: BillingItemModel, include: [Item] },
        { model: BillingDamageModel }
      ]
    });

    if (!billing) return null;

    const billingData = billing.toJSON();
    const labourCost = Number(billingData.labourCost || 0);
    const transportCost = Number(billingData.transportCost || 0);
    const baseAmount = Number(billingData.amount || 0) - labourCost - transportCost;
    const totalAmount = Number(billingData.amount || 0);

    return {
      ...billingData,
      baseAmount,
      transportCost,
      labourCost,
      depositAmount: parseFloat(billingData.Rental?.depositAmount || 0),
      totalAmount
    };
  },

  async returnAndBill(payload: any) {
    const { rentalId, items, labourCost, transportCost, returnLabourCost, returnTransportCost, damagesCost } = payload;

    const returnLabourCostNum = Number(returnLabourCost) || 0;
    const returnTransportCostNum = Number(returnTransportCost) || 0;
    const damagesCostNum = Number(damagesCost) || 0;

    if (returnLabourCostNum < 0 || returnTransportCostNum < 0 || damagesCostNum < 0) {
      throw new Error('Return costs cannot be negative');
    }

    const rental = await RentalModel.findByPk(rentalId, {
      include: [{ model: RentalItemModel, include: [Item] }, CustomerModel]
    });

    if (!rental) throw new Error('Rental not found');
    if (rental.status !== 'active') throw new Error('Rental is no longer active');
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('No items specified for return');
    }

    let totalBillAmount = 0;
    let totalReturnedQuantity = 0;
    const now = new Date();
    const startDate = new Date(rental.startDate);
    const endDate = new Date(rental.endDate);
    const monthsRented = calculateMonthsRented(startDate, now, endDate);

    const labourCostAmount = Number(labourCost) || 0;
    const transportCostAmount = Number(transportCost) || 0;
    totalBillAmount += labourCostAmount + transportCostAmount;
    totalBillAmount += returnLabourCostNum + returnTransportCostNum + damagesCostNum;

    for (const returnSpec of items) {
      totalReturnedQuantity += returnSpec.quantity;
    }

    const billing = await BillingModel.create({
      rentalId: rental.id,
      customerId: rental.customerId,
      amount: 0,
      dueDate: now,
      status: 'pending',
      labourCost: labourCostAmount,
      transportCost: transportCostAmount,
      returnLabourCost: returnLabourCostNum,
      returnTransportCost: returnTransportCostNum,
      damagesCost: damagesCostNum,
      returnedQuantity: totalReturnedQuantity,
    });

    const processedReturns: any[] = [];
    const billingItemsToCreate: any[] = [];

    const transaction = await sequelize.transaction();
    try {
      for (const returnSpec of items) {
        const rentalItem = rental.RentalItems?.find((ri: any) => ri.id === returnSpec.rentalItemId);
        if (!rentalItem) throw new Error(`Item with ID ${returnSpec.rentalItemId} not found in this rental`);

        const availableToReturn = rentalItem.quantity - rentalItem.returnedQuantity;
        if (returnSpec.quantity > availableToReturn || returnSpec.quantity <= 0) {
          throw new Error(`Invalid return quantity for ${rentalItem.Item?.name}. Available: ${availableToReturn}, Requested: ${returnSpec.quantity}`);
        }

        const monthlyRate = rentalItem.Item ? parseFloat(rentalItem.Item.monthlyRate) : 0;
        const itemBillAmount = returnSpec.quantity * monthlyRate * monthsRented;
        totalBillAmount += itemBillAmount;

        billingItemsToCreate.push({
          billingId: billing.id,
          itemId: rentalItem.itemId,
          quantity: returnSpec.quantity,
          rate: monthlyRate * monthsRented,
          total: itemBillAmount
        });

        if (rentalItem.Item) {
          await rentalItem.Item.update({ quantity: rentalItem.Item.quantity + returnSpec.quantity }, { transaction });
          if (rentalItem.inventoryUnitIds && rentalItem.inventoryUnitIds.length > 0) {
            const unitsToReturn = rentalItem.inventoryUnitIds.slice(rentalItem.returnedQuantity, rentalItem.returnedQuantity + returnSpec.quantity);
            await InventoryUnit.update({ status: 'available' }, { where: { id: unitsToReturn }, transaction });
          }
        }

        await rentalItem.update({ returnedQuantity: rentalItem.returnedQuantity + returnSpec.quantity }, { transaction });
        processedReturns.push({ itemId: rentalItem.itemId, quantity: returnSpec.quantity, amount: itemBillAmount });
      }

      if (billingItemsToCreate.length > 0) {
        await BillingItemModel.bulkCreate(billingItemsToCreate, { transaction });
      }

      if (returnLabourCostNum > 0) {
        await BillingItemModel.create({ billingId: billing.id, itemId: null, description: 'Return Labour Cost', quantity: 1, rate: returnLabourCostNum, total: returnLabourCostNum }, { transaction });
      }
      if (returnTransportCostNum > 0) {
        await BillingItemModel.create({ billingId: billing.id, itemId: null, description: 'Return Transport Cost', quantity: 1, rate: returnTransportCostNum, total: returnTransportCostNum }, { transaction });
      }
      if (damagesCostNum > 0) {
        await BillingItemModel.create({ billingId: billing.id, itemId: null, description: 'Return Damages', quantity: 1, rate: damagesCostNum, total: damagesCostNum }, { transaction });
      }

      await billing.update({ amount: totalBillAmount }, { transaction });

      const allItems = await RentalItemModel.findAll({ where: { rentalId: rental.id }, transaction });
      if (allItems.every(ri => ri.returnedQuantity >= ri.quantity)) {
        await rental.update({ status: 'returned', returnLabourCost: returnLabourCostNum, returnTransportCost: returnTransportCostNum, damagesCost: damagesCostNum }, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    return { billing, processedReturns };
  }
};
