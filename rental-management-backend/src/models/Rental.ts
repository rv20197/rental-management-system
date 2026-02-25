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
  status: 'active' | 'completed' | 'cancelled';
  Item?: any;
  Customer?: any;
}

/**
 * Attributes needed to create a Rental
 */
interface RentalCreationAttributes extends Optional<RentalAttributes, 'id' | 'status' | 'Item' | 'Customer' | 'inventoryUnitIds'> {}

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
    type: DataTypes.JSON, // MySQL JSON array of IDs
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
  status: {
    type: DataTypes.ENUM('active', 'completed', 'cancelled'),
    defaultValue: 'active', // Defines state of rental
  },
}, {
  timestamps: true,
});

export default Rental;
