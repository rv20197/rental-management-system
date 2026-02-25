import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

/**
 * Defines attributes for Customer
 */
interface CustomerAttributes {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
}

/**
 * Attributes allowed during Customer creation
 */
interface CustomerCreationAttributes extends Optional<CustomerAttributes, 'id' | 'address'> {}

/**
 * Customer Model
 * People or organizations that are renting goods.
 */
interface CustomerInstance extends Model<CustomerAttributes, CustomerCreationAttributes>, CustomerAttributes {}

const Customer = sequelize.define<CustomerInstance>('Customer', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false, // Core fields required for identity
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: true, // Prevents registering the same customer multiple times inadvertently
    allowNull: false,
    validate: {
      isEmail: true, // Validation provided by sequelize
    },
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false, // Used for communications/reminders
  },
  address: {
    type: DataTypes.STRING, // Used for delivery or contractual record
  },
}, {
  timestamps: true,
});

export default Customer;
