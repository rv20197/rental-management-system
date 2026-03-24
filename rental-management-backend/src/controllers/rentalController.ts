import { Request, Response } from 'express';
import { Rental, Customer, Billing, RentalItem } from '../models';
import { Item, InventoryUnit } from '../models/Item';
import { generateRentalPDF } from '../utils/pdfUtils';
import { Op } from 'sequelize';
import { calculateMonthsRented } from '../utils/billingUtils';
import { calculateDefaultDeposit } from '../utils/rentalUtils';

/**
 * Returns all active and historical Rentals
 */
export const getAllRentals = async (req: Request, res: Response) => {
  try {
    const { customerId, status } = req.query;
    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    // Eager loading the related models
    const rentals = await Rental.findAll({ 
      where,
      include: [
        { model: RentalItem, include: [Item] },
        Item, // Keep for backward compatibility
        Customer
      ] 
    });
    res.json(rentals);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching rentals', error: error.message });
  }
};

/**
 * Issue new Goods request. Requires existing Item Id and Customer Id.
 */
export const createRental = async (req: Request, res: Response) => {
  try {
    const { items, ...rentalData } = req.body;
    
    // Normalize items array
    let requestedItems = [];
    if (items && Array.isArray(items) && items.length > 0) {
      requestedItems = items;
    } else if (req.body.itemId) {
      requestedItems = [{
        itemId: req.body.itemId,
        quantity: req.body.quantity || 1
      }];
    }

    if (requestedItems.length === 0) {
      return res.status(400).json({ message: 'At least one item is required for rental.' });
    }

    // Prepare to track all inventory units being assigned
    const allAssignedUnits: { itemId: number, unitIds: number[], quantity: number }[] = [];
    
    // First pass: Validate inventory for all items
    for (const requestedItem of requestedItems) {
      const { itemId, quantity } = requestedItem;
      const requestedQuantity = Number(quantity) || 1;

      // Fetch the target Item
      const item: any = await Item.findByPk(itemId);
      if (!item) return res.status(404).json({ message: `Target item ${itemId} not found for rental.` });

      // Ensure InventoryUnit records exist
      const existingUnits = await InventoryUnit.count({ where: { itemId } });
      const itemQuantity = item.quantity || 0;
      if (existingUnits < itemQuantity) {
        const unitsToCreate = itemQuantity - existingUnits;
        const inventoryUnitsPayload = [];
        for (let i = 0; i < unitsToCreate; i++) {
          inventoryUnitsPayload.push({ itemId: item.id, status: 'available' });
        }
        await InventoryUnit.bulkCreate(inventoryUnitsPayload as any);
      }

      // Grab available units
      const availableUnits: any = await InventoryUnit.findAll({
        where: { itemId: itemId, status: 'available' },
        order: [['dateAdded', 'ASC']],
        limit: requestedQuantity
      });

      if (availableUnits.length < requestedQuantity) {
        return res.status(400).json({ 
          message: `Insufficient inventory units for ${item.name}. Only ${availableUnits.length} physically available out of total ${item.quantity}.` 
        });
      }

      allAssignedUnits.push({
        itemId,
        unitIds: availableUnits.map((u: any) => u.id),
        quantity: requestedQuantity
      });
    }

    // Ensure required date/amount fields are present
    const providedStart = rentalData.startDate ? new Date(rentalData.startDate) : new Date();
    const providedEnd = rentalData.endDate ? new Date(rentalData.endDate) : (() => {
      const d = new Date(providedStart);
      d.setDate(d.getDate() + 30);
      return d;
    })();

    // Calculate total deposit if not provided
    let totalDeposit = rentalData.depositAmount;
    if (totalDeposit == null) {
      totalDeposit = 0;
      for (const assigned of allAssignedUnits) {
        const item: any = await Item.findByPk(assigned.itemId);
        const monthlyRate = item.monthlyRate ? parseFloat(item.monthlyRate) : 0;
        totalDeposit += calculateDefaultDeposit(monthlyRate, assigned.quantity);
      }
    }

    // Create the main rental record
    const rental: any = await Rental.create({
      ...rentalData,
      startDate: providedStart,
      endDate: providedEnd,
      depositAmount: totalDeposit,
      // For backward compatibility, store the first item's details if available
      itemId: allAssignedUnits.length > 0 ? allAssignedUnits[0].itemId : null,
      quantity: allAssignedUnits.length > 0 ? allAssignedUnits[0].quantity : 0,
      inventoryUnitIds: allAssignedUnits.length > 0 ? allAssignedUnits[0].unitIds : []
    });

    // Create RentalItem records and update inventory
    for (const assigned of allAssignedUnits) {
      await RentalItem.create({
        rentalId: rental.id,
        itemId: assigned.itemId,
        quantity: assigned.quantity,
        inventoryUnitIds: assigned.unitIds
      });

      // Update virtual quantity
      const item: any = await Item.findByPk(assigned.itemId);
      await item.update({ quantity: item.quantity - assigned.quantity });

      // Mark physical units as rented
      await InventoryUnit.update(
        { status: 'rented' },
        { where: { id: assigned.unitIds } }
      );
    }

    const result = await Rental.findByPk(rental.id, {
      include: [
        { model: RentalItem, include: [Item] },
        Customer
      ]
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating rental', error: error.message });
  }
};

/**
 * Isolate single transaction
 */
export const getRentalById = async (req: Request, res: Response) => {
  try {
    const rental = await Rental.findByPk(req.params.id as string, { 
      include: [
        { model: RentalItem, include: [Item] },
        Item, 
        Customer
      ] 
    });
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    res.json(rental);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching rental', error: error.message });
  }
};

/**
 * Mostly used to alter Status states, extend dates, or manage line items.
 */
export const updateRental = async (req: Request, res: Response) => {
  try {
    const { items, ...rentalData } = req.body;
    const rental: any = await Rental.findByPk(req.params.id as string, {
      include: [{ model: RentalItem }]
    });
    if (!rental) return res.status(404).json({ message: 'Rental not found' });

    // 1. Handle date extensions and status changes
    if (rentalData.endDate) {
      const newEnd = new Date(rentalData.endDate);
      const start = new Date(rental.startDate);
      const currentEnd = new Date(rental.endDate);

      if (rental.status !== 'active' && rental.status !== 'pending' && rental.status !== 'created') {
        return res.status(400).json({ message: 'Only active or pending rentals can be updated' });
      }
      if (isNaN(newEnd.getTime())) {
        return res.status(400).json({ message: 'Invalid endDate provided' });
      }
      if (newEnd <= start) {
        return res.status(400).json({ message: 'New end date must be after start date' });
      }
    }

    // 2. Handle Line Items (Multiple Items)
    if (items && Array.isArray(items)) {
      const existingRentalItems = rental.RentalItems || [];
      const updatedItemIds = items.map(i => i.itemId);

      // A. Items to remove
      const itemsToRemove = existingRentalItems.filter((eri: any) => !updatedItemIds.includes(eri.itemId));
      for (const eri of itemsToRemove) {
        // Increase virtual quantity
        const item: any = await Item.findByPk(eri.itemId);
        if (item) {
          await item.update({ quantity: item.quantity + eri.quantity });
        }
        // Mark physical units as available
        await InventoryUnit.update(
          { status: 'available' },
          { where: { id: eri.inventoryUnitIds } }
        );
        // Delete RentalItem record
        await eri.destroy();
      }

      // B. Items to add or update
      for (const requestedItem of items) {
        const { itemId, quantity } = requestedItem;
        const requestedQuantity = Number(quantity);
        if (requestedQuantity <= 0) continue;

        const existingItem = existingRentalItems.find((eri: any) => eri.itemId === itemId);

        if (existingItem) {
          // Update existing item quantity
          const diff = requestedQuantity - existingItem.quantity;
          if (diff > 0) {
            // Need more units
            const availableUnits: any = await InventoryUnit.findAll({
              where: { itemId: itemId, status: 'available' },
              order: [['dateAdded', 'ASC']],
              limit: diff
            });
            if (availableUnits.length < diff) {
              const item: any = await Item.findByPk(itemId);
              return res.status(400).json({ 
                message: `Insufficient inventory units for ${item?.name || itemId}. Need ${diff} more, but only ${availableUnits.length} available.` 
              });
            }
            const newUnitIds = availableUnits.map((u: any) => u.id);
            await InventoryUnit.update({ status: 'rented' }, { where: { id: newUnitIds } });
            
            await existingItem.update({
              quantity: requestedQuantity,
              inventoryUnitIds: [...existingItem.inventoryUnitIds, ...newUnitIds]
            });
            
            const item: any = await Item.findByPk(itemId);
            await item.update({ quantity: item.quantity - diff });
          } else if (diff < 0) {
            // Releasing some units
            const releaseCount = Math.abs(diff);
            const releaseUnitIds = existingItem.inventoryUnitIds.slice(0, releaseCount);
            const remainUnitIds = existingItem.inventoryUnitIds.slice(releaseCount);
            
            await InventoryUnit.update({ status: 'available' }, { where: { id: releaseUnitIds } });
            
            await existingItem.update({
              quantity: requestedQuantity,
              inventoryUnitIds: remainUnitIds
            });
            
            const item: any = await Item.findByPk(itemId);
            await item.update({ quantity: item.quantity + releaseCount });
          }
        } else {
          // Add new item
          const item: any = await Item.findByPk(itemId);
          if (!item) return res.status(404).json({ message: `Item ${itemId} not found.` });

          const availableUnits: any = await InventoryUnit.findAll({
            where: { itemId: itemId, status: 'available' },
            order: [['dateAdded', 'ASC']],
            limit: requestedQuantity
          });

          if (availableUnits.length < requestedQuantity) {
            return res.status(400).json({ 
              message: `Insufficient inventory units for ${item.name}. Only ${availableUnits.length} available.` 
            });
          }

          const unitIds = availableUnits.map((u: any) => u.id);
          await RentalItem.create({
            rentalId: rental.id,
            itemId,
            quantity: requestedQuantity,
            inventoryUnitIds: unitIds
          });

          await item.update({ quantity: item.quantity - requestedQuantity });
          await InventoryUnit.update({ status: 'rented' }, { where: { id: unitIds } });
        }
      }
    }

    // 3. Recalculate depositAmount if not explicitly provided
    let finalDeposit = rentalData.depositAmount;
    if (finalDeposit == null) {
      finalDeposit = 0;
      const currentRentalItems: any = await RentalItem.findAll({ where: { rentalId: rental.id }, include: [Item] });
      for (const ri of currentRentalItems) {
        const monthlyRate = ri.Item?.monthlyRate ? parseFloat(ri.Item.monthlyRate) : 0;
        finalDeposit += calculateDefaultDeposit(monthlyRate, ri.quantity);
      }
    }

    // 4. Update the main rental record
    // Ensure we handle backward compatibility fields
    const updatedRentalItems: any = await RentalItem.findAll({ where: { rentalId: rental.id } });
    const firstItem = updatedRentalItems.length > 0 ? updatedRentalItems[0] : null;

    await rental.update({
      ...rentalData,
      depositAmount: finalDeposit,
      itemId: firstItem ? firstItem.itemId : rental.itemId,
      quantity: firstItem ? firstItem.quantity : rental.quantity,
      inventoryUnitIds: firstItem ? firstItem.inventoryUnitIds : rental.inventoryUnitIds
    });

    const result = await Rental.findByPk(rental.id, {
      include: [
        { model: RentalItem, include: [Item] },
        Customer
      ]
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating rental', error: error.message });
  }
};

/**
 * Obliterates target Rental (cascading relationships handled by the ORM rules)
 */
export const deleteRental = async (req: Request, res: Response) => {
  try {
    const rental = await Rental.findByPk(req.params.id as string);
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    
    await rental.destroy();
    res.json({ message: 'Rental deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting rental', error: error.message });
  }
};

/**
 * Generates an estimation PDF for a rental
 */
export const downloadEstimationPDF = async (req: Request, res: Response) => {
  try {
    const rentalId = req.params.id;
    const rental: any = await Rental.findByPk(rentalId as string, {
      include: [
        { model: RentalItem, include: [Item] },
        Customer, 
        Item
      ]
    });

    if (!rental) {
      return res.status(404).json({ message: 'Rental not found.' });
    }

    // Calculate estimation logic same as return bill but based on scheduled duration
    const startDate = new Date(rental.startDate);
    const endDate = new Date(rental.endDate);
    const monthsRented = calculateMonthsRented(startDate, endDate, endDate);

    let billAmount = 0;
    if (rental.RentalItems && rental.RentalItems.length > 0) {
      for (const ri of rental.RentalItems) {
        const monthlyRate = ri.Item ? parseFloat(ri.Item.monthlyRate) : 0;
        billAmount += ri.quantity * monthlyRate * monthsRented;
      }
    } else {
      const monthlyRate = rental.Item ? parseFloat(rental.Item.monthlyRate) : 0;
      billAmount = rental.quantity * monthlyRate * monthsRented;
    }

    // Construct mock billing object to feed into shared PDF generator
    const mockBilling: any = {
      id: rental.id, 
      createdAt: rental.createdAt,
      dueDate: rental.endDate,
      status: 'pending',
      amount: billAmount,
      returnedQuantity: null,
      Rental: rental,
      BillingItems: []
    };

    if (rental.RentalItems && rental.RentalItems.length > 0) {
      mockBilling.BillingItems = rental.RentalItems.map((ri: any) => ({
        Item: ri.Item,
        quantity: ri.quantity,
        rate: ri.Item ? parseFloat(ri.Item.monthlyRate) : 0,
        total: (ri.Item ? parseFloat(ri.Item.monthlyRate) : 0) * ri.quantity * monthsRented
      }));
    }

    generateRentalPDF(mockBilling, res);
  } catch (error: any) {
    res.status(500).json({ message: 'Error generating estimation PDF', error: error.message });
  }
};
