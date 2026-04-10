import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

/**
 * Defines attributes for Rental records
 */
interface RentalAttributes {
  id: number;
  itemId?: number;
  customerId?: number;
  quantity: number;
  inventoryUnitIds: number[]; // Track which specific physical units are rented
  startDate: Date;
  endDate: Date;
  depositAmount: number;
  labourCost?: number;
  transportCost?: number;
  returnLabourCost?: number;
  returnTransportCost?: number;
  damagesCost?: number;
  status: 'active' | 'completed' | 'cancelled' | 'pending' | 'created' | 'returned';
  Item?: any;
  RentalItems?: any[];
  Customer?: any;
}

/**
 * Attributes needed to create a Rental
 */
interface RentalCreationAttributes extends Optional<RentalAttributes, 'id' | 'status' | 'Item' | 'Customer' | 'inventoryUnitIds' | 'labourCost' | 'transportCost' | 'returnLabourCost' | 'returnTransportCost' | 'damagesCost'> {}

/**
 * Rental Model
 * Combines an Item, a Customer, and a time duration to signify an active rental phase.
 */
export interface RentalInstance extends Model<RentalAttributes, RentalCreationAttributes>, RentalAttributes {}

const Rental = sequelize.define<RentalInstance>('Rental', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1, // Default to 1 item if not specified
  },
  inventoryUnitIds: {
    type: DataTypes.JSON, // stores array of inventory unit IDs
    allowNull: false,
    defaultValue: []
  },
  startDate: {
    type: DataTypes.DATE, // Full Date-Time for exact hand-off
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE, // Full Date-Time for required return exact time
    allowNull: false,
  },
  depositAmount: {
    type: DataTypes.DECIMAL, // Initial safety deposit held
    allowNull: false,
  },
  labourCost: {
    type: DataTypes.DECIMAL,
    allowNull: true,
    defaultValue: 0,
  },
  transportCost: {
    type: DataTypes.DECIMAL,
    allowNull: true,
    defaultValue: 0,
  },
  returnLabourCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  returnTransportCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  damagesCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'cancelled', 'pending', 'created', 'returned'),
    defaultValue: 'active', // Defines state of rental
  },
}, {
  timestamps: true,
});

export default Rental;
