import { Request, Response } from 'express';
import { Rental, Customer, Billing } from '../models';
import { Item, InventoryUnit } from '../models/Item';
import { generateRentalPDF } from '../utils/pdfUtils';
import { Op } from 'sequelize';

import { calculateMonthsRented } from '../utils/billingUtils';

/**
 * Returns all active and historical Rentals
 */
export const getAllRentals = async (req: Request, res: Response) => {
  try {
    // Eager loading the related models
    const rentals = await Rental.findAll({ include: [Item, Customer] });
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
    const { itemId, quantity } = req.body;
    const requestedQuantity = quantity || 1;

    // Fetch the target Item
    const item: any = await Item.findByPk(itemId);
    if (!item) return res.status(404).json({ message: 'Target item not found for rental.' });

    // Ensure InventoryUnit records exist for all item quantities
    const existingUnits = await InventoryUnit.count({ where: { itemId } });
    const itemQuantity = item.quantity || 0;
    if (existingUnits < itemQuantity) {
      const unitsToCreate = itemQuantity - existingUnits;
      const inventoryUnitsPayload = [];
      for (let i = 0; i < unitsToCreate; i++) {
        inventoryUnitsPayload.push({
          itemId: item.id,
          status: 'available'
        });
      }
      await InventoryUnit.bulkCreate(inventoryUnitsPayload as any);
    }

    // Grab EXACT specific units out of MySQL based on oldest added date (FIFO)
    const availableUnits: any = await InventoryUnit.findAll({
      where: {
        itemId: itemId,
        status: 'available'
      },
      order: [['dateAdded', 'ASC']],
      limit: requestedQuantity
    });

    if (availableUnits.length < requestedQuantity) {
      return res.status(400).json({ message: `Insufficient inventory units. Only ${availableUnits.length} physically available out of total ${item.quantity}.` });
    }

    const assignedUnitIds = availableUnits.map((u: any) => u.id);

    // Ensure required date/amount fields are present to satisfy DB constraints
    const providedStart = req.body.startDate ? new Date(req.body.startDate) : new Date();
    // default endDate to 1 day after start if not provided
    const providedEnd = req.body.endDate ? new Date(req.body.endDate) : (() => {
      const d = new Date(providedStart);
      d.setDate(d.getDate() + 30);
      return d;
    })();

    // default depositAmount to item's monthlyRate * quantity when missing, else 0
    let providedDeposit = req.body.depositAmount;
    if (providedDeposit == null) {
      const monthlyRate = item.monthlyRate ? parseFloat(item.monthlyRate) : 0;
      providedDeposit = monthlyRate * requestedQuantity;
    }

    // Create tracking Object extending original body payload and injecting defaults
    const rentalPayload = {
      ...req.body,
      inventoryUnitIds: assignedUnitIds,
      startDate: providedStart,
      endDate: providedEnd,
      depositAmount: providedDeposit,
    };

    const rental = await Rental.create(rentalPayload);

    // Substract virtual total 
    await item.update({ quantity: item.quantity - requestedQuantity });

    // Mark physical specific units as rented!
    await InventoryUnit.update(
        { status: 'rented' },
        { where: { id: assignedUnitIds } }
    );

    res.status(201).json(rental);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating rental', error: error.message });
  }
};

/**
 * Isolate single transaction
 */
export const getRentalById = async (req: Request, res: Response) => {
  try {
    const rental = await Rental.findByPk(req.params.id as string, { include: [Item, Customer] });
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    res.json(rental);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching rental', error: error.message });
  }
};

/**
 * Mostly used to alter Status states like when marking something arbitrarily as "cancelled"
 */
export const updateRental = async (req: Request, res: Response) => {
  try {
    const rental: any = await Rental.findByPk(req.params.id as string);
    if (!rental) return res.status(404).json({ message: 'Rental not found' });

    // If extending rental period, validate dates and status
    if (req.body && req.body.endDate) {
      const newEnd = new Date(req.body.endDate);
      const start = new Date(rental.startDate);
      const currentEnd = new Date(rental.endDate);

      if (rental.status !== 'active') {
        return res.status(400).json({ message: 'Only active rentals can be extended' });
      }
      if (isNaN(newEnd.getTime())) {
        return res.status(400).json({ message: 'Invalid endDate provided' });
      }
      if (newEnd <= start) {
        return res.status(400).json({ message: 'New end date must be after start date' });
      }
      if (newEnd <= currentEnd) {
        return res.status(400).json({ message: 'New end date must be after current end date to extend the rental' });
      }
    }
    
    await rental.update(req.body);
    res.json(rental);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating rental', error: error.message });
  }
};

/**
 * Obliterates target Rental (also deletes cascading generated Billings under MySQL rule)
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
      include: [Customer, Item]
    });

    if (!rental) {
      return res.status(404).json({ message: 'Rental not found.' });
    }

    // Calculate estimation logic same as return bill but based on scheduled duration
    const startDate = new Date(rental.startDate);
    const endDate = new Date(rental.endDate);
    const monthsRented = calculateMonthsRented(startDate, endDate);

    const monthlyRate = rental.Item ? parseFloat(rental.Item.monthlyRate) : 0;
    const billAmount = rental.quantity * monthlyRate * monthsRented;

    // Construct mock billing object to feed into shared PDF generator
    const mockBilling = {
      id: rental.id, 
      createdAt: rental.createdAt,
      dueDate: rental.endDate,
      status: 'pending',
      amount: billAmount,
      returnedQuantity: null,
      Rental: rental
    };

    generateRentalPDF(mockBilling, res);
  } catch (error: any) {
    res.status(500).json({ message: 'Error generating estimation PDF', error: error.message });
  }
};
