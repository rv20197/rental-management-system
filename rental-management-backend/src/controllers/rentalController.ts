import { Request, Response } from 'express';
import { RentalService } from '../services/rentalService';
import { generateRentalPDF } from '../utils/pdfUtils';
import { Rental as RentalModel, RentalItem as RentalItemModel, Customer as CustomerModel } from '../models';
import { Item } from '../models/Item';
import { Billing } from '../types';

/**
 * Returns all active and historical Rentals
 */
export const getAllRentals = async (req: Request, res: Response) => {
  try {
    const rentals = await RentalService.getAllRentals(req.query as any);
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
    const result = await RentalService.createRental(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : error.message.includes('Insufficient') ? 400 : 500)
      .json({ message: error.message });
  }
};

/**
 * Isolate single transaction
 */
export const getRentalById = async (req: Request, res: Response) => {
  try {
    const rental = await RentalService.getRentalById(req.params.id as string);
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
    const result = await RentalService.updateRental(req.params.id as string, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : error.message.includes('edited') ? 403 : error.message.includes('Insufficient') ? 400 : 500)
      .json({ message: error.message });
  }
};

/**
 * Obliterates target Rental (cascading relationships handled by the ORM rules)
 */
export const deleteRental = async (req: Request, res: Response) => {
  try {
    const result = await RentalService.deleteRental(req.params.id as string);
    res.json(result);
  } catch (error: any) {
    res.status(error.message === 'Rental not found' ? 404 : 500)
      .json({ message: error.message });
  }
};

/**
 * Generates an estimation PDF for a rental
 */
export const downloadEstimationPDF = async (req: Request, res: Response) => {
  try {
    const rentalId = req.params.id;
    const rental = await RentalModel.findByPk(rentalId as string, {
      include: [
        { model: RentalItemModel, include: [Item] },
        CustomerModel
      ]
    }) as any;

    if (!rental) {
      return res.status(404).json({ message: 'Rental not found.' });
    }

    const startDate = new Date(rental.startDate);
    const endDate = new Date(rental.endDate);
    const monthsRented = (rental as any).calculateMonthsRented ?
      (rental as any).calculateMonthsRented(startDate, endDate, endDate) :
      0; // Note: In a real scenario, I'd use the utility here

    // We keep this in controller for now as it's a PDF stream response,
    // but the data fetching could be moved to service.

    // Simplified for this refactor: keep the original logic for PDF generation
    // but use the service-like structure for data.

    // Actually, let's stick to the original logic to ensure PDF generation doesn't break
    // since it requires a specific "mockBilling" object.

    // I'll use the original PDF logic but cleaner.
    const { calculateMonthsRented: calcMonths } = require('../utils/billingUtils');
    const mRented = calcMonths(startDate, endDate, endDate);

    let billAmount = 0;
    if (rental.RentalItems && rental.RentalItems.length > 0) {
      for (const ri of rental.RentalItems) {
        const monthlyRate = ri.Item ? parseFloat(ri.Item.monthlyRate) : 0;
        billAmount += ri.quantity * monthlyRate * mRented;
      }
    } else {
      const monthlyRate = rental.Item ? parseFloat(rental.Item.monthlyRate) : 0;
      billAmount = rental.quantity * monthlyRate * mRented;
    }

    const labourCost = Number(rental.labourCost) || 0;
    const transportCost = Number(rental.transportCost) || 0;
    const depositAmount = Number(rental.depositAmount) || 0;
    const totalAmount = billAmount + labourCost + transportCost + depositAmount;

    const mockBilling: Billing = {
      id: rental.id,
      createdAt: rental.createdAt,
      dueDate: rental.endDate,
      status: 'pending',
      amount: totalAmount,
      returnedQuantity: null,
      Rental: rental,
      BillingItems: [],
      labourCost: labourCost,
      transportCost: transportCost,
      depositAmount: depositAmount,
      totalDamages: 0,
      depositUsed: 0,
      availableDeposit: depositAmount
    };

    if (rental.RentalItems && rental.RentalItems.length > 0) {
      mockBilling.BillingItems = rental.RentalItems.map((ri: any) => ({
        Item: ri.Item,
        quantity: ri.quantity,
        rate: ri.Item ? parseFloat(ri.Item.monthlyRate) : 0,
        total: (ri.Item ? parseFloat(ri.Item.monthlyRate) : 0) * ri.quantity * mRented
      })) as any;
    }

    generateRentalPDF(mockBilling, res);
  } catch (error: any) {
    res.status(500).json({ message: 'Error generating estimation PDF', error: error.message });
  }
};
