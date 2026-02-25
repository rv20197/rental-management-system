import { Request, Response } from 'express';
import { Customer } from '../models';

/**
 * Fetches all registered Customers
 */
export const getAllCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await Customer.findAll();
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching customers', error: error.message });
  }
};

/**
 * Stores brand new Customer Object linked internally 
 */
export const createCustomer = async (req: Request, res: Response) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating customer', error: error.message });
  }
};

/**
 * Search Customer explicitly via ID
 */
export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const customer = await Customer.findByPk(req.params.id as string);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching customer', error: error.message });
  }
};

/**
 * Modify Personal Identifiable info
 */
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const customer = await Customer.findByPk(req.params.id as string);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    
    await customer.update(req.body);
    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating customer', error: error.message });
  }
};

/**
 * Delete a user and implicitly cascade-destroy linked Rentals/Billing
 */
export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const customer = await Customer.findByPk(req.params.id as string);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    
    await customer.destroy();
    res.json({ message: 'Customer deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting customer', error: error.message });
  }
};
