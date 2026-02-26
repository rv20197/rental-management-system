import { Request, Response } from 'express';
import { Item, InventoryUnit } from '../models';

/**
 * Returns all Items globally
 */
export const getAllItems = async (req: Request, res: Response) => {
  try {
    const items = await Item.findAll();
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching items', error: error.message });
  }
};

/**
 * Add brand new item into stock rotation
 */
export const createItem = async (req: Request, res: Response) => {
  try {
    const item = await Item.create(req.body);
    // Auto-generate distinct physical units to build out the FIFO structure 
    const unitsToCreate = item.quantity || 1;
    const inventoryUnitsPayload = [];
    for (let i = 0; i < unitsToCreate; i++) {
      inventoryUnitsPayload.push({
        itemId: item.id,
        status: 'available'
      });
    }

    await InventoryUnit.bulkCreate(inventoryUnitsPayload as any);

    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating item', error: error.message });
  }
};

/**
 * Locate single Item by its ID
 */
export const getItemById = async (req: Request, res: Response) => {
  try {
    const item = await Item.findByPk(req.params.id as string);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching item', error: error.message });
  }
};

/**
 * Change Item Properties dynamically (i.e update cost of rent/status/category)
 */
export const updateItem = async (req: Request, res: Response) => {
  try {
    const item = await Item.findByPk(req.params.id as string);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    const oldQuantity = item.quantity || 0;

    await item.update(req.body);

    // If quantity was updated, create additional InventoryUnit records to match
    const newQuantity = item.quantity || 0;
    if (newQuantity > oldQuantity) {
      const unitsToCreate = newQuantity - oldQuantity;
      const inventoryUnitsPayload = [];
      for (let i = 0; i < unitsToCreate; i++) {
        inventoryUnitsPayload.push({
          itemId: item.id,
          status: 'available'
        });
      }
      await InventoryUnit.bulkCreate(inventoryUnitsPayload as any);
    }

    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating item', error: error.message });
  }
};

/**
 * Remove an item permanently from rotation
 */
export const deleteItem = async (req: Request, res: Response) => {
  try {
    const item = await Item.findByPk(req.params.id as string);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    await item.destroy();
    res.json({ message: 'Item deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting item', error: error.message });
  }
};
