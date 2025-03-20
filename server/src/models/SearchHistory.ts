// server/src/models/SearchHistory.ts
import { Model, DataTypes, Optional, Association, BelongsToCreateAssociationMixin, BelongsToGetAssociationMixin } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './User';

// SearchHistory attributes interface
export interface SearchHistoryAttributes {
  id: string;
  userId: string;
  query: string;
  filters: object;
  mediaType: 'image' | 'audio' | 'video' | 'all';
  resultCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// SearchHistory creation attributes
export interface SearchHistoryCreationAttributes extends Optional<SearchHistoryAttributes, 'id' | 'resultCount' | 'createdAt' | 'updatedAt'> {}

// SearchHistory model class
export class SearchHistory extends Model<SearchHistoryAttributes, SearchHistoryCreationAttributes> implements SearchHistoryAttributes {
  public id!: string;
  public userId!: string;
  public query!: string;
  public filters!: object;
  public mediaType!: 'image' | 'audio' | 'video' | 'all';
  public resultCount!: number;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Define associations
  public readonly user?: User;
  
  public static associations: {
    user: Association<SearchHistory, User>;
  };

  // Association methods
  public createUser!: BelongsToCreateAssociationMixin<User>;
  public getUser!: BelongsToGetAssociationMixin<User>;
}

// Initialize SearchHistory model
SearchHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    query: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    filters: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    mediaType: {
      type: DataTypes.ENUM('image', 'audio', 'video', 'all'),
      allowNull: false,
      defaultValue: 'all',
    },
    resultCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    modelName: 'SearchHistory',
    tableName: 'search_histories',
    timestamps: true,
  }
);

// Define associations
export const initializeAssociations = (): void => {
  User.hasMany(SearchHistory, {
    sourceKey: 'id',
    foreignKey: 'userId',
    as: 'searches',
  });

  SearchHistory.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });
};

export default SearchHistory;