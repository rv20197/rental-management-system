import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

/**
 * Defines attributes for an Inventory Item
 */
interface ItemAttributes {
  id: number;
  name: string;
  description?: string;
  category?: string;
  status: 'available' | 'rented' | 'maintenance';
  monthlyRate: number;
  quantity: number;
}

/**
 * Attributes used in Item creation
 */
interface ItemCreationAttributes extends Optional<ItemAttributes, 'id' | 'status' | 'quantity'> {}

/**
 * Item Model
 * Represents the goods/inventory being rented out.
 */
interface ItemInstance extends Model<ItemAttributes, ItemCreationAttributes>, ItemAttributes {}

const Item = sequelize.define<ItemInstance>('Item', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false, // Name of the equipment or item
  },
  description: {
    type: DataTypes.TEXT, // Optional longer description
  },
  category: {
    type: DataTypes.STRING, // Defines category like "Electronics", "Machinery"
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('available', 'rented', 'maintenance'),
    defaultValue: 'available', // Defaults to available upon creation
  },
  monthlyRate: {
    type: DataTypes.DECIMAL, // Price to rent the item per month
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1, // Represents total stock units available
  },
}, {
  timestamps: true, // Auto-adds timestamps
});

/**
 * Inventory Unit Model
 * Tracks individual physical units of an Item for FIFO dispatching.
 */
interface InventoryUnitAttributes {
  id: number;
  itemId: number;
  status: 'available' | 'rented' | 'maintenance';
  dateAdded: Date;
}

interface InventoryUnitCreationAttributes extends Optional<InventoryUnitAttributes, 'id' | 'status' | 'dateAdded'> {}

interface InventoryUnitInstance extends Model<InventoryUnitAttributes, InventoryUnitCreationAttributes>, InventoryUnitAttributes {}

const InventoryUnit = sequelize.define<InventoryUnitInstance>('InventoryUnit', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  itemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('available', 'rented', 'maintenance'),
    defaultValue: 'available',
  },
  dateAdded: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: true,
});

export { Item, InventoryUnit };
