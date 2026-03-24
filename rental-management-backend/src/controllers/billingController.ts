import { Request, Response } from 'express';
import { Billing, Rental, Customer, BillingItem, RentalItem, BillingDamage } from '../models';
import { Item, InventoryUnit } from '../models/Item';
import { generateRentalPDF } from '../utils/pdfUtils';

import { calculateMonthsRented } from '../utils/billingUtils';

/**
 * Grabs all system billing instances alongside deeper rental structure
 */
export const getAllBillings = async (req: Request, res: Response) => {
  try {
    const billings = await Billing.findAll({ 
      include: [
        {
          model: Rental,
          include: [
            Customer, 
            Item,
            { model: RentalItem, include: [Item] }
          ]
        },
        {
          model: Customer
        },
        {
          model: BillingItem,
          include: [Item]
        },
        {
          model: BillingDamage
        }
      ]
    });
    res.json(billings);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching billings', error: error.message });
  }
};

/**
 * Generates an unpaid invoice based on Rental details mapped internally
 */
export const createBilling = async (req: Request, res: Response) => {
  try {
    const { items, damages, ...billingData } = req.body;
    
    // Calculate total amount from items if provided, otherwise use provided amount
    let itemsTotal = 0;
    let processedItems = [];

    if (items && Array.isArray(items) && items.length > 0) {
      processedItems = items.map((item: any) => {
        const quantity = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;
        const total = quantity * rate;
        itemsTotal += total;
        return {
          ...item,
          quantity,
          rate,
          total
        };
      });
    } else {
      itemsTotal = Number(billingData.amount) || 0;
    }

    // Calculate total damages
    let totalDamages = 0;
    let processedDamages = [];
    if (damages && Array.isArray(damages) && damages.length > 0) {
      processedDamages = damages.map((damage: any) => {
        const amount = Number(damage.amount) || 0;
        totalDamages += amount;
        return {
          ...damage,
          amount
        };
      });
    }

    const availableDeposit = Number(billingData.availableDeposit) || 0;
    const depositUsed = Math.min(availableDeposit, totalDamages);
    const excessDamages = Math.max(0, totalDamages - availableDeposit);
    
    const finalAmount = itemsTotal + excessDamages;
    
    // Create the main billing record
    const billing: any = await Billing.create({
      ...billingData,
      totalDamages,
      depositUsed,
      amount: finalAmount
    });
    
    // Create billing items if provided
    if (processedItems.length > 0) {
      const billingItemsWithId = processedItems.map((item: any) => ({
        ...item,
        billingId: billing.id
      }));
      await BillingItem.bulkCreate(billingItemsWithId);
    }

    // Create billing damages if provided
    if (processedDamages.length > 0) {
      const billingDamagesWithId = processedDamages.map((damage: any) => ({
        ...damage,
        billingId: billing.id
      }));
      await BillingDamage.bulkCreate(billingDamagesWithId);
    }
    
    const result = await Billing.findByPk(billing.id, {
      include: [
        { model: Rental, include: [Customer, Item] },
        { model: Customer },
        { model: BillingItem, include: [Item] },
        { model: BillingDamage }
      ]
    });
    
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating billing', error: error.message });
  }
};

/**
 * Quick API route meant purely to update `status` to paid instantly
 */
export const payBilling = async (req: Request, res: Response) => {
  try {
    const billing: any = await Billing.findByPk(req.params.id as string, { include: [Rental] });
    if (!billing) return res.status(404).json({ message: 'Billing not found' });
    
    if (billing.status === 'paid') {
      return res.status(400).json({ message: 'Billing is already paid' });
    }

    // Updates internal paid status and logs exactly when via Date()
    await billing.update({ status: 'paid', paymentDate: new Date() });

    res.json({ message: 'Billing updated to paid successfully', billing });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating billing', error: error.message });
  }
};

/**
 * Dynamically calculates cost based on number of items physically returned and elapsed time.
 * Automates creating the invoice and restructuring master inventory instantly.
 */
export const returnAndBill = async (req: Request, res: Response) => {
  try {
    const { rentalId, items } = req.body; // items: [{ rentalItemId: number, quantity: number }]
    
    const rental: any = await Rental.findByPk(rentalId, { 
      include: [
        { model: RentalItem, include: [Item] },
        Customer
      ] 
    });
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    if (rental.status !== 'active') return res.status(400).json({ message: 'Rental is no longer active' });

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items specified for return' });
    }

    let totalBillAmount = 0;
    const now = new Date();
    const startDate = new Date(rental.startDate);
    const endDate = new Date(rental.endDate);
    const monthsRented = calculateMonthsRented(startDate, now, endDate);

    // Create appropriate Billing invoice for exactly this return event
    const billing: any = await Billing.create({
      rentalId: rental.id,
      customerId: rental.customerId,
      amount: 0, // Will update after calculating all items
      dueDate: now, 
      status: 'pending',
    });

    const processedReturns = [];

    for (const returnSpec of items) {
      const rentalItem = rental.RentalItems.find((ri: any) => ri.id === returnSpec.rentalItemId);
      if (!rentalItem) {
        throw new Error(`Item with ID ${returnSpec.rentalItemId} not found in this rental`);
      }

      const availableToReturn = rentalItem.quantity - rentalItem.returnedQuantity;
      if (returnSpec.quantity > availableToReturn || returnSpec.quantity <= 0) {
        throw new Error(`Invalid return quantity for ${rentalItem.Item?.name}. Available: ${availableToReturn}, Requested: ${returnSpec.quantity}`);
      }

      const monthlyRate = rentalItem.Item ? parseFloat(rentalItem.Item.monthlyRate) : 0;
      const itemBillAmount = returnSpec.quantity * monthlyRate * monthsRented;
      totalBillAmount += itemBillAmount;

      // Create BillingItem
      await BillingItem.create({
        billingId: billing.id,
        itemId: rentalItem.itemId,
        quantity: returnSpec.quantity,
        rate: monthlyRate * monthsRented,
        total: itemBillAmount
      });

      // Update Item master inventory and physical units
      if (rentalItem.Item) {
        await rentalItem.Item.update({ quantity: rentalItem.Item.quantity + returnSpec.quantity });
        
        if (rentalItem.inventoryUnitIds && rentalItem.inventoryUnitIds.length > 0) {
          const unitsToReturn = rentalItem.inventoryUnitIds.slice(rentalItem.returnedQuantity, rentalItem.returnedQuantity + returnSpec.quantity);
          await InventoryUnit.update(
            { status: 'available' },
            { where: { id: unitsToReturn } }
          );
        }
      }

      // Update RentalItem
      const newReturnedQty = rentalItem.returnedQuantity + returnSpec.quantity;
      await rentalItem.update({
        returnedQuantity: newReturnedQty
      });

      processedReturns.push({
        itemId: rentalItem.itemId,
        quantity: returnSpec.quantity,
        amount: itemBillAmount
      });
    }

    // Update total billing amount
    await billing.update({ amount: totalBillAmount });

    // Check if entire rental is completed
    const allItems = await RentalItem.findAll({ where: { rentalId: rental.id } });
    const isFullyReturned = allItems.every(ri => ri.returnedQuantity >= ri.quantity);
    
    if (isFullyReturned) {
      await rental.update({ status: 'completed' });
    }

    res.status(201).json({ 
      message: 'Items returned, inventory adjusted, and bill generated dynamically!', 
      billing,
      processedReturns
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error generating return bill', error: error.message });
  }
};

/**
 * Retrieve explicit bill specifics for displaying or querying dynamically
 */
export const getBillingById = async (req: Request, res: Response) => {
  try {
    const billing = await Billing.findByPk(req.params.id as string, { 
      include: [
        {
          model: Rental,
          include: [
            Customer, 
            Item,
            { model: RentalItem, include: [Item] }
          ]
        },
        {
          model: Customer
        },
        {
          model: BillingItem,
          include: [Item]
        },
        {
          model: BillingDamage
        }
      ]
    });
    if (!billing) return res.status(404).json({ message: 'Billing not found' });
    res.json(billing);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching billing', error: error.message });
  }
};

/**
 * Removes standard Invoice from db mapping completely
 */
export const deleteBilling = async (req: Request, res: Response) => {
  try {
    const billing = await Billing.findByPk(req.params.id as string);
    if (!billing) return res.status(404).json({ message: 'Billing not found' });
    
    await billing.destroy();
    res.json({ message: 'Billing deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting billing', error: error.message });
  }
};

/**
 * Generates a PDF for a specific bill and streams it to the client
 */
export const downloadBillPDF = async (req: Request, res: Response) => {
  try {
    const billing: any = await Billing.findByPk(req.params.id as string, {
      include: [
        {
          model: Rental,
          include: [
            Customer, 
            Item,
            { model: RentalItem, include: [Item] }
          ]
        },
        {
          model: Customer
        },
        {
          model: BillingItem,
          include: [Item]
        },
        {
          model: BillingDamage
        }
      ]
    });

    if (!billing) return res.status(404).json({ message: 'Billing not found' });

    generateRentalPDF(billing, res);

  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error generating PDF', error: error.message });
    }
  }
};
