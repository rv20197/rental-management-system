import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

/**
 * Defines standard Billing record attributes
 */
interface BillingAttributes {
  id: number;
  rentalId?: number;
  amount: number;
  dueDate: Date | string;
  status: 'pending' | 'paid' | 'overdue';
  paymentDate?: Date;
  returnedQuantity?: number;
  returnedUnitIds?: number[];
  Rental?: any;
}

/**
 * Attributes used to generate a Bill
 */
interface BillingCreationAttributes extends Optional<BillingAttributes, 'id' | 'status' | 'paymentDate' | 'returnedQuantity' | 'returnedUnitIds' | 'Rental'> {}

/**
 * Billing Model
 * Handles invoicing or rent payments relating directly to a specific Rental record.
 */
interface BillingInstance extends Model<BillingAttributes, BillingCreationAttributes>, BillingAttributes {}

const Billing = sequelize.define<BillingInstance>('Billing', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  rentalId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL, // Explicit value of the bill
    allowNull: false,
  },
  dueDate: {
    type: DataTypes.DATEONLY, // Used by cron job to scan for late fees/notices
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'overdue'),
    defaultValue: 'pending', // Starts unpaid
  },
  paymentDate: {
    type: DataTypes.DATEONLY, // Track when it actually was settled
    allowNull: true,
  },
  returnedQuantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  returnedUnitIds: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  timestamps: true,
});

export default Billing;
