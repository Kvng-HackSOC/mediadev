// server/src/models/User.ts
import { 
    Model, DataTypes, Optional, Association, HasManyCreateAssociationMixin,
    HasManyGetAssociationsMixin, HasManyCountAssociationsMixin
  } from 'sequelize';
  import bcrypt from 'bcryptjs';
  import { sequelize } from '../config/database';
  import { SearchHistory } from './SearchHistory';
  
  // User attributes interface
  export interface UserAttributes {
    id: string;
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    isActive: boolean;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
  }
  
  // User creation attributes (optional fields for creation)
  export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'isActive' | 'createdAt' | 'updatedAt'> {}
  
  // User model class
  export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    public id!: string;
    public username!: string;
    public email!: string;
    public password!: string;
    public firstName?: string;
    public lastName?: string;
    public isActive!: boolean;
    public lastLogin?: Date;
    public createdAt!: Date;
    public updatedAt!: Date;
  
    // Define associations
    public readonly searches?: SearchHistory[];
    
    public static associations: {
      searches: Association<User, SearchHistory>;
    };
  
    // Association methods
    public createSearch!: HasManyCreateAssociationMixin<SearchHistory>;
    public getSearches!: HasManyGetAssociationsMixin<SearchHistory>;
    public countSearches!: HasManyCountAssociationsMixin;
  
    // Instance methods
    public async comparePassword(candidatePassword: string): Promise<boolean> {
      return bcrypt.compare(candidatePassword, this.password);
    }
  
    // Helper to return user without sensitive data
    public toJSON(): object {
      const values = { ...this.get() };
      delete values.password;
      return values;
    }
  }
  
  // Initialize User model
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          len: [3, 50],
        },
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      firstName: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      lastName: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      hooks: {
        // Hash password before saving
        beforeCreate: async (user: User) => {
          if (user.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        },
        beforeUpdate: async (user: User) => {
          if (user.changed('password')) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        },
      },
    }
  );
  
  export default User;