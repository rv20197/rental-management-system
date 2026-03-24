import sequelize from '../config/database';
import User from './User';
import { Item, InventoryUnit } from './Item';
import Customer from './Customer';
import Rental from './Rental';
import RentalItem from './RentalItem';
import Billing from './Billing';
import BillingItem from './BillingItem';
import BillingDamage from './BillingDamage';

/**
 * Relational Mapping Declarations
 * 
 * Sets up 1-to-Many associations across all Sequelize models explicitly
 * and defines CASCADE behaviors on deletion.
 */

// Item to Rentals (deprecated: see RentalItem)
Item.hasMany(Rental, { foreignKey: 'itemId', onDelete: 'CASCADE' });
Rental.belongsTo(Item, { foreignKey: 'itemId' });

// Item to RentalItems
Item.hasMany(RentalItem, { foreignKey: 'itemId', onDelete: 'CASCADE' });
RentalItem.belongsTo(Item, { foreignKey: 'itemId' });

// Rental to RentalItems
Rental.hasMany(RentalItem, { foreignKey: 'rentalId', onDelete: 'CASCADE' });
RentalItem.belongsTo(Rental, { foreignKey: 'rentalId' });

// Item to BillingItems
Item.hasMany(BillingItem, { foreignKey: 'itemId', onDelete: 'CASCADE' });
BillingItem.belongsTo(Item, { foreignKey: 'itemId' });

// Customer to Rentals
Customer.hasMany(Rental, { foreignKey: 'customerId', onDelete: 'CASCADE' });
Rental.belongsTo(Customer, { foreignKey: 'customerId' });

// Customer to Billings
Customer.hasMany(Billing, { foreignKey: 'customerId', onDelete: 'CASCADE' });
Billing.belongsTo(Customer, { foreignKey: 'customerId' });

// Rental to Billings
Rental.hasMany(Billing, { foreignKey: 'rentalId', onDelete: 'CASCADE' });
Billing.belongsTo(Rental, { foreignKey: 'rentalId' });

// Billing to BillingItems
Billing.hasMany(BillingItem, { foreignKey: 'billingId', onDelete: 'CASCADE' });
BillingItem.belongsTo(Billing, { foreignKey: 'billingId' });

// Billing to BillingDamages
Billing.hasMany(BillingDamage, { foreignKey: 'billingId', onDelete: 'CASCADE' });
BillingDamage.belongsTo(Billing, { foreignKey: 'billingId' });

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
  RentalItem,
  Billing,
  BillingItem,
  BillingDamage,
};
