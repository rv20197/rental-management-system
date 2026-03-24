import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

/**
 * Defines attributes for an item within a Rental
 */
interface RentalItemAttributes {
  id: number;
  rentalId: number;
  itemId: number;
  quantity: number;
  returnedQuantity: number;
  inventoryUnitIds: number[]; // Track which specific physical units are rented for this line item
  Item?: any;
}

/**
 * Attributes used in RentalItem creation
 */
interface RentalItemCreationAttributes extends Optional<RentalItemAttributes, 'id' | 'inventoryUnitIds' | 'returnedQuantity'> {}

/**
 * RentalItem Model
 * Represents a single item type in a rental record.
 */
export interface RentalItemInstance extends Model<RentalItemAttributes, RentalItemCreationAttributes>, RentalItemAttributes {}

const RentalItem = sequelize.define<RentalItemInstance>('RentalItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  rentalId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  itemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  returnedQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  inventoryUnitIds: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
}, {
  timestamps: true,
});

export default RentalItem;
