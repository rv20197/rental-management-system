import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

/**
 * Defines attributes for a damage record within a Bill
 */
interface BillingDamageAttributes {
  id: number;
  billingId: number;
  description: string;
  amount: number;
}

/**
 * Attributes used in BillingDamage creation
 */
interface BillingDamageCreationAttributes extends Optional<BillingDamageAttributes, 'id'> {}

/**
 * BillingDamage Model
 * Represents a single damage entry in a billing record.
 */
interface BillingDamageInstance extends Model<BillingDamageAttributes, BillingDamageCreationAttributes>, BillingDamageAttributes {}

const BillingDamage = sequelize.define<BillingDamageInstance>('BillingDamage', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  billingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL,
    allowNull: false,
  },
}, {
  timestamps: true,
});

export default BillingDamage;
