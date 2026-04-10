import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

/**
 * Defines attributes for a line item within a Bill or Estimate
 */
interface BillingItemAttributes {
  id: number;
  billingId: number;
  itemId: number | null;
  description?: string;
  quantity: number;
  rate: number;
  total: number;
}

/**
 * Attributes used in BillingItem creation
 */
interface BillingItemCreationAttributes extends Optional<BillingItemAttributes, 'id'> {}

/**
 * BillingItem Model
 * Represents a single line item in a billing record.
 */
interface BillingItemInstance extends Model<BillingItemAttributes, BillingItemCreationAttributes>, BillingItemAttributes {
    Item?: any;
}

const BillingItem = sequelize.define<BillingItemInstance>('BillingItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  billingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  itemId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  rate: {
    type: DataTypes.DECIMAL,
    allowNull: false,
  },
  total: {
    type: DataTypes.DECIMAL,
    allowNull: false,
  },
}, {
  timestamps: true,
});

export default BillingItem;
