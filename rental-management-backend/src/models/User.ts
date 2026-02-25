import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

/**
 * Defines attributes for the User model
 */
interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'manager';
}

/**
 * Defines optional attributes used during User creation
 */
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'role'> {}

/**
 * User Model
 * Defines staff (admin/manager) accounts that can use the system APIs.
 */
interface UserInstance extends Model<UserAttributes, UserCreationAttributes>, UserAttributes {}

const User = sequelize.define<UserInstance>('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false, // Name is required
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Prevents duplicate registrations
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false, // Passwords are required to log in
  },
  role: {
    type: DataTypes.ENUM('admin', 'manager'),
    defaultValue: 'manager', // Default to manager if unspecified
  },
}, {
  timestamps: true, // Provides createdAt and updatedAt
});

export default User;
