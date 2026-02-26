import { Request, Response } from 'express';
import { Billing, Rental, Customer } from '../models';
import { Item, InventoryUnit } from '../models/Item';
import { generateRentalPDF } from '../utils/pdfUtils';

import { calculateMonthsRented } from '../utils/billingUtils';

/**
 * Grabs all system billing instances alongside deeper rental structure
 */
export const getAllBillings = async (req: Request, res: Response) => {
  try {
    const billings = await Billing.findAll({ 
      include: [{
        model: Rental,
        include: [Customer]
      }]
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
    const billing = await Billing.create(req.body);
    res.status(201).json(billing);
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
    const { rentalId, returnedQuantity } = req.body;
    
    const rental: any = await Rental.findByPk(rentalId, { include: [Item] });
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    if (rental.status !== 'active') return res.status(400).json({ message: 'Rental is no longer active' });

    const qtyToReturn = returnedQuantity || rental.quantity;
    if (qtyToReturn > rental.quantity || qtyToReturn <= 0) {
      return res.status(400).json({ message: `Invalid return quantity. Customer currently holds ${rental.quantity} units.` });
    }

    // Isolate unit IDs physically being given back
    const returnedUnitIds = rental.inventoryUnitIds.slice(0, qtyToReturn);
    const remainingUnitIds = rental.inventoryUnitIds.slice(qtyToReturn);

    // Calculate dynamic cost based on return day rules
    const startDate = new Date(rental.startDate);
    const now = new Date();
    const monthsRented = calculateMonthsRented(startDate, now);

    const monthlyRate = rental.Item ? parseFloat(rental.Item.monthlyRate) : 0;
    const billAmount = qtyToReturn * monthlyRate * monthsRented;

    // Create appropriate Billing invoice for exactly this return event
    const billing = await Billing.create({
      rentalId: rental.id,
      amount: billAmount,
      dueDate: now, // generated right now for exact moment of return
      status: 'pending',
      returnedQuantity: qtyToReturn,
      returnedUnitIds: returnedUnitIds
    });

    // Update the overarching Rental state
    const newQuantity = rental.quantity - qtyToReturn;
    await rental.update({
      quantity: newQuantity,
      inventoryUnitIds: remainingUnitIds,
      status: newQuantity === 0 ? 'completed' : 'active'
    });

    // Resupply physical inventory master records early
    if (rental.Item) {
        await rental.Item.update({ quantity: rental.Item.quantity + qtyToReturn });
        
        await InventoryUnit.update(
            { status: 'available' },
            { where: { id: returnedUnitIds } }
        );
    }

    res.status(201).json({ message: 'Items returned, inventory adjusted, and bill generated dynamically!', billing });
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
      include: [{
        model: Rental,
        include: [Customer]
      }]
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
      include: [{
        model: Rental,
        include: [Customer, Item]
      }]
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
