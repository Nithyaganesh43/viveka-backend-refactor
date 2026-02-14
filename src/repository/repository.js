import {
  Client,
  OtpSession,
  DeviceSession,
  clientCustomer,
  ItemGroup,
  Item,
  Cart,
  CartItem,
  Invoice,
  PurchaseHistory,
  Payment,
} from '../models/Model.js';

/**
 * Generic Repository Layer for Mongoose Models
 * Provides collection-based CRUD operations to eliminate duplication across services
 * Usage: repository.create('clients', data) instead of Client.create(data)
 */
class Repository {
  constructor() {
    // Map collection names to Mongoose models
    this.models = {
      clients: Client,
      otpsessions: OtpSession,
      devicesessions: DeviceSession,
      clientcustomers: clientCustomer,
      itemgroups: ItemGroup,
      items: Item,
      carts: Cart,
      cartitems: CartItem,
      invoices: Invoice,
      purchasehistories: PurchaseHistory,
      payments: Payment,
    };
  }

  /**
   * Get Mongoose model by collection name
   * @param {string} collectionName - Name of the collection (e.g., 'clients', 'items')
   * @returns {mongoose.Model} Mongoose model instance
   */
  getModel(collectionName) {
    const model = this.models[collectionName.toLowerCase()];
    if (!model) {
      throw new Error(
        `Model not found for collection: ${collectionName}. Available: ${Object.keys(this.models).join(', ')}`,
      );
    }
    return model;
  }

  /**
   * Create a single document
   * @param {string} collectionName - Collection name
   * @param {object} data - Document data
   * @param {object} options - Mongoose options (session, etc.)
   * @returns {Promise<object>} Created document
   */
  async create(collectionName, data, options = {}) {
    const Model = this.getModel(collectionName);
    const doc = new Model(data);
    return await doc.save(options);
  }

  /**
   * Bulk create multiple documents
   * @param {string} collectionName - Collection name
   * @param {Array<object>} dataArr - Array of document data
   * @param {object} options - Mongoose insertMany options
   * @returns {Promise<Array<object>>} Created documents
   */
  async bulkCreate(collectionName, dataArr, options = {}) {
    const Model = this.getModel(collectionName);
    return await Model.insertMany(dataArr, options);
  }

  /**
   * Find a single document
   * @param {string} collectionName - Collection name
   * @param {object} filter - Query filter
   * @param {object|string} projection - Fields to include/exclude
   * @param {object} options - Query options (populate, sort, etc.)
   * @returns {Promise<object|null>} Found document or null
   */
  async findOne(collectionName, filter = {}, projection = null, options = {}) {
    const Model = this.getModel(collectionName);
    let query = Model.findOne(filter, projection);

    if (options.populate) {
      if (Array.isArray(options.populate)) {
        options.populate.forEach((pop) => {
          query = query.populate(pop);
        });
      } else {
        query = query.populate(options.populate);
      }
    }

    if (options.sort) {
      query = query.sort(options.sort);
    }

    if (options.lean) {
      query = query.lean();
    }

    if (options.session) {
      query = query.session(options.session);
    }

    return await query.exec();
  }

  /**
   * Find document by ID
   * @param {string} collectionName - Collection name
   * @param {string} id - Document ID
   * @param {object|string} projection - Fields to include/exclude
   * @param {object} options - Query options
   * @returns {Promise<object|null>} Found document or null
   */
  async findById(collectionName, id, projection = null, options = {}) {
    const Model = this.getModel(collectionName);
    let query = Model.findById(id, projection);

    if (options.populate) {
      if (Array.isArray(options.populate)) {
        options.populate.forEach((pop) => {
          query = query.populate(pop);
        });
      } else {
        query = query.populate(options.populate);
      }
    }

    if (options.lean) {
      query = query.lean();
    }

    if (options.session) {
      query = query.session(options.session);
    }

    return await query.exec();
  }

  /**
   * Find multiple documents
   * @param {string} collectionName - Collection name
   * @param {object} filter - Query filter
   * @param {object|string} projection - Fields to include/exclude
   * @param {object} options - Query options (sort, limit, skip, populate, etc.)
   * @returns {Promise<Array<object>>} Array of documents
   */
  async find(collectionName, filter = {}, projection = null, options = {}) {
    const Model = this.getModel(collectionName);
    let query = Model.find(filter, projection);

    if (options.populate) {
      if (Array.isArray(options.populate)) {
        options.populate.forEach((pop) => {
          query = query.populate(pop);
        });
      } else {
        query = query.populate(options.populate);
      }
    }

    if (options.sort) {
      query = query.sort(options.sort);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.skip) {
      query = query.skip(options.skip);
    }

    if (options.lean) {
      query = query.lean();
    }

    if (options.session) {
      query = query.session(options.session);
    }

    return await query.exec();
  }

  /**
   * Paginate query results
   * @param {string} collectionName - Collection name
   * @param {object} filter - Query filter
   * @param {object|string} projection - Fields to include/exclude
   * @param {object} options - Pagination options {page, limit, sort, populate}
   * @returns {Promise<object>} {data, total, page, limit, pages}
   */
  async paginate(
    collectionName,
    filter = {},
    projection = null,
    { page = 1, limit = 20, sort = { createdAt: -1 }, populate = null } = {},
  ) {
    const Model = this.getModel(collectionName);
    const skip = (page - 1) * limit;

    let query = Model.find(filter, projection).sort(sort).skip(skip).limit(limit);

    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach((pop) => {
          query = query.populate(pop);
        });
      } else {
        query = query.populate(populate);
      }
    }

    const data = await query.exec();
    const total = await Model.countDocuments(filter);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Update a single document by filter
   * @param {string} collectionName - Collection name
   * @param {object} filter - Query filter
   * @param {object} data - Update data
   * @param {object} options - Update options (new, upsert, session, etc.)
   * @returns {Promise<object|null>} Updated document or null
   */
  async updateOne(collectionName, filter, data, options = { new: true }) {
    const Model = this.getModel(collectionName);
    return await Model.findOneAndUpdate(filter, data, options);
  }

  /**
   * Update document by ID
   * @param {string} collectionName - Collection name
   * @param {string} id - Document ID
   * @param {object} data - Update data
   * @param {object} options - Update options (new, session, etc.)
   * @returns {Promise<object|null>} Updated document or null
   */
  async updateById(collectionName, id, data, options = { new: true }) {
    const Model = this.getModel(collectionName);
    return await Model.findByIdAndUpdate(id, data, options);
  }

  /**
   * Update multiple documents
   * @param {string} collectionName - Collection name
   * @param {object} filter - Query filter
   * @param {object} data - Update data
   * @param {object} options - Update options (session, etc.)
   * @returns {Promise<object>} {acknowledged, modifiedCount, upsertedId, upsertedCount, matchedCount}
   */
  async updateMany(collectionName, filter, data, options = {}) {
    const Model = this.getModel(collectionName);
    return await Model.updateMany(filter, data, options);
  }

  /**
   * Delete a single document by filter
   * @param {string} collectionName - Collection name
   * @param {object} filter - Query filter
   * @param {object} options - Delete options (session, etc.)
   * @returns {Promise<object>} {acknowledged, deletedCount}
   */
  async deleteOne(collectionName, filter, options = {}) {
    const Model = this.getModel(collectionName);
    return await Model.deleteOne(filter, options);
  }

  /**
   * Delete document by ID
   * @param {string} collectionName - Collection name
   * @param {string} id - Document ID
   * @param {object} options - Delete options (session, etc.)
   * @returns {Promise<object|null>} Deleted document or null
   */
  async deleteById(collectionName, id, options = {}) {
    const Model = this.getModel(collectionName);
    return await Model.findByIdAndDelete(id, options);
  }

  /**
   * Delete multiple documents
   * @param {string} collectionName - Collection name
   * @param {object} filter - Query filter
   * @param {object} options - Delete options (session, etc.)
   * @returns {Promise<object>} {acknowledged, deletedCount}
   */
  async deleteMany(collectionName, filter, options = {}) {
    const Model = this.getModel(collectionName);
    return await Model.deleteMany(filter, options);
  }

  /**
   * Check if document exists
   * @param {string} collectionName - Collection name
   * @param {object} filter - Query filter
   * @returns {Promise<object|null>} Document ID if exists, null otherwise
   */
  async exists(collectionName, filter) {
    const Model = this.getModel(collectionName);
    return await Model.exists(filter);
  }

  /**
   * Count documents
   * @param {string} collectionName - Collection name
   * @param {object} filter - Query filter
   * @returns {Promise<number>} Document count
   */
  async count(collectionName, filter = {}) {
    const Model = this.getModel(collectionName);
    return await Model.countDocuments(filter);
  }

  /**
   * Execute aggregation pipeline
   * @param {string} collectionName - Collection name
   * @param {Array<object>} pipeline - Aggregation pipeline stages
   * @param {object} options - Aggregation options (session, etc.)
   * @returns {Promise<Array<object>>} Aggregation results
   */
  async aggregate(collectionName, pipeline = [], options = {}) {
    const Model = this.getModel(collectionName);
    return await Model.aggregate(pipeline, options);
  }

  /**
   * Bulk write operations
   * @param {string} collectionName - Collection name
   * @param {Array<object>} operations - Array of bulk operations
   * @param {object} options - Bulk write options
   * @returns {Promise<object>} Bulk write result
   */
  async bulkWrite(collectionName, operations, options = {}) {
    const Model = this.getModel(collectionName);
    return await Model.bulkWrite(operations, options);
  }
}

// Export singleton instance
export default new Repository();
