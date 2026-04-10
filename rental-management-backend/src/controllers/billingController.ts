import { Request, Response } from 'express';
import { BillingService } from '../services/billingService';
import { generateRentalPDF } from '../utils/pdfUtils';
import { Billing as BillingModel, Rental as RentalModel, Customer as CustomerModel, BillingItem as BillingItemModel, RentalItem as RentalItemModel, BillingDamage as BillingDamageModel } from '../models';
import { Item } from '../models/Item';
import { Billing } from '../types';

/**
 * Grabs all system billing instances alongside deeper rental structure
 */
export const getAllBillings = async (req: Request, res: Response) => {
  try {
    const billings = await BillingService.getAllBillings();
    res.json(billings);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching billings', error: error.message });
  }
};

export const createBilling = async (req: Request, res: Response) => {
  try {
    const result = await BillingService.createBilling(req.body);
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
    const billing = await BillingService.payBilling(req.params.id as string);
    res.json({ message: 'Billing updated to paid successfully', billing });
  } catch (error: any) {
    res.status(error.message === 'Billing not found' ? 404 : error.message === 'Billing is already paid' ? 400 : 500)
      .json({ message: error.message });
  }
};

/**
 * Dynamically calculates cost based on number of items physically returned and elapsed time.
 * Automates creating the invoice and restructuring master inventory instantly.
 */
export const returnAndBill = async (req: Request, res: Response) => {
  try {
    const { billing, processedReturns } = await BillingService.returnAndBill(req.body);
    res.status(201).json({
      message: 'Items returned, inventory adjusted, and bill generated dynamically!',
      billing,
      processedReturns
    });
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : error.message.includes('active') ? 400 : 500)
      .json({ message: 'Error generating return bill', error: error.message });
  }
};

/**
 * Retrieve explicit bill specifics for displaying or querying dynamically
 */
export const getBillingById = async (req: Request, res: Response) => {
  try {
    const billing = await BillingService.getBillingById(req.params.id as string);
    if (!billing) return res.status(404).json({ message: 'Billing not found' });
    res.json(billing);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching billing', error: error.message });
  }
};

/**
 * Generates a PDF for a specific bill and streams it to the client
 */
export const downloadBillPDF = async (req: Request, res: Response) => {
  try {
    const billing = await BillingModel.findByPk(req.params.id as string, {
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
    }) as any;

    if (!billing) return res.status(404).json({ message: 'Billing not found' });

    if (billing.returnedQuantity === null || billing.returnedQuantity === undefined) {
      console.warn(`⚠️ WARNING: Billing ${billing.id} missing returnedQuantity - may be rendering as estimation`);
    }

    generateRentalPDF(billing, res);

  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error generating PDF', error: error.message });
    }
  }
};
