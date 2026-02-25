import sequelize from '../config/database';
import User from './User';
import { Item, InventoryUnit } from './Item';
import Customer from './Customer';
import Rental from './Rental';
import Billing from './Billing';

/**
 * Relational Mapping Declarations
 * 
 * Sets up 1-to-Many associations across all Sequelize models explicitly
 * and defines CASCADE behaviors on deletion.
 */

// Item to Rentals
Item.hasMany(Rental, { foreignKey: 'itemId', onDelete: 'CASCADE' });
Rental.belongsTo(Item, { foreignKey: 'itemId' });

// Customer to Rentals
Customer.hasMany(Rental, { foreignKey: 'customerId', onDelete: 'CASCADE' });
Rental.belongsTo(Customer, { foreignKey: 'customerId' });

// Rental to Billings
Rental.hasMany(Billing, { foreignKey: 'rentalId', onDelete: 'CASCADE' });
Billing.belongsTo(Rental, { foreignKey: 'rentalId' });

// Item to Unit mapping
Item.hasMany(InventoryUnit, { foreignKey: 'itemId', onDelete: 'CASCADE' });
InventoryUnit.belongsTo(Item, { foreignKey: 'itemId' });

export {
  sequelize,
  User,
  Item,
  InventoryUnit,
  Customer,
  Rental,
  Billing,
};
