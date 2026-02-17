import mongoose, { Model, ClientSession, FilterQuery, UpdateQuery } from "mongoose";
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
  Payment,
  PurchaseHistory,
} from "../models/Model";

type PopulateOption = any;

interface QueryOptions {
  populate?: PopulateOption | PopulateOption[];
  sort?: any;
  limit?: number;
  skip?: number;
  lean?: boolean;
  session?: ClientSession;
}

class Repository {
  private models: Record<string, Model<any>> = {
    clients: Client,
    otpsessions: OtpSession,
    devicesessions: DeviceSession,
    clientcustomers: clientCustomer,
    itemgroups: ItemGroup,
    items: Item,
    carts: Cart,
    cartitems: CartItem,
    invoices: Invoice,
    payments: Payment,
    purchasehistories: PurchaseHistory,
  };

  private getModel(collectionName: string): Model<any> {
    const model = this.models[collectionName.toLowerCase()];
    if (!model) {
      throw new Error(
        `Model not found for collection: ${collectionName}. Available: ${Object.keys(
          this.models
        ).join(", ")}`
      );
    }
    return model;
  }

  async create<T>(
    collectionName: string,
    data: Partial<T>,
    options = {}
  ): Promise<T> {
    const Model = this.getModel(collectionName);
    const doc = new Model(data);
    return (await doc.save(options)) as T;
  }

  async bulkCreate<T>(
    collectionName: string,
    dataArr: Partial<T>[],
    options = {}
  ): Promise<T[]> {
    const Model = this.getModel(collectionName);
    return (await Model.insertMany(dataArr, options)) as T[];
  }

  async findOne<T = any>(
    collectionName: string,
    filter: FilterQuery<any> = {},
    projection: any = null,
    options: QueryOptions = {}
  ): Promise<T | null> {
    const Model = this.getModel(collectionName);
    let query = Model.findOne(filter, projection);

    if (options.populate) {
      const pops = Array.isArray(options.populate)
        ? options.populate
        : [options.populate];
      pops.forEach(p => (query = query.populate(p)));
    }

    if (options.sort) query = query.sort(options.sort);
    if (options.lean) query = query.lean();
    if (options.session) query = query.session(options.session);

    return query.exec();
  }

  async findById<T = any>(
    collectionName: string,
    id: string,
    projection: any = null,
    options: QueryOptions = {}
  ): Promise<T | null> {
    const Model = this.getModel(collectionName);
    let query = Model.findById(id, projection);

    if (options.populate) {
      const pops = Array.isArray(options.populate)
        ? options.populate
        : [options.populate];
      pops.forEach(p => (query = query.populate(p)));
    }

    if (options.lean) query = query.lean();
    if (options.session) query = query.session(options.session);

    return query.exec();
  }

  async find<T = any>(
    collectionName: string,
    filter: FilterQuery<any> = {},
    projection: any = null,
    options: QueryOptions = {}
  ): Promise<T[]> {
    const Model = this.getModel(collectionName);
    let query = Model.find(filter, projection);

    if (options.populate) {
      const pops = Array.isArray(options.populate)
        ? options.populate
        : [options.populate];
      pops.forEach(p => (query = query.populate(p)));
    }

    if (options.sort) query = query.sort(options.sort);
    if (options.limit) query = query.limit(options.limit);
    if (options.skip) query = query.skip(options.skip);
    if (options.lean) query = query.lean();
    if (options.session) query = query.session(options.session);

    return query.exec();
  }

  async paginate<T>(
    collectionName: string,
    filter: FilterQuery<T> = {},
    projection: any = null,
    { page = 1, limit = 20, sort = { createdAt: -1 } as any, populate = null } = {}
  ) {
    const Model = this.getModel(collectionName);
    const skip = (page - 1) * limit;

    let query = Model.find(filter, projection).sort(sort).skip(skip).limit(limit);

    if (populate) {
      const pops = Array.isArray(populate) ? populate : [populate];
      pops.forEach(p => (query = query.populate(p)));
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

  async updateOne<T = any>(
    collectionName: string,
    filter: FilterQuery<any>,
    data: UpdateQuery<T>,
    options: any = { new: true }
  ) {
    const Model = this.getModel(collectionName);
    return Model.findOneAndUpdate(filter, data, options);
  }

  async updateById<T = any>(
    collectionName: string,
    id: string,
    data: UpdateQuery<T>,
    options: any = { new: true }
  ) {
    const Model = this.getModel(collectionName);
    return Model.findByIdAndUpdate(id, data, options);
  }

  async updateMany<T>(
    collectionName: string,
    filter: FilterQuery<T>,
    data: UpdateQuery<T>,
    options = {}
  ) {
    const Model = this.getModel(collectionName);
    return Model.updateMany(filter, data, options);
  }

  async deleteOne(
    collectionName: string,
    filter: object,
    options = {}
  ) {
    const Model = this.getModel(collectionName);
    return Model.deleteOne(filter, options);
  }

  async deleteById(collectionName: string, id: string, options = {}) {
    const Model = this.getModel(collectionName);
    return Model.findByIdAndDelete(id, options);
  }

  async deleteMany(
    collectionName: string,
    filter: object,
    options = {}
  ) {
    const Model = this.getModel(collectionName);
    return Model.deleteMany(filter, options);
  }

  async exists(collectionName: string, filter: object) {
    const Model = this.getModel(collectionName);
    return Model.exists(filter);
  }

  async count(collectionName: string, filter = {}) {
    const Model = this.getModel(collectionName);
    return Model.countDocuments(filter);
  }

  async aggregate(collectionName: string, pipeline: any[] = [], options = {}) {
    const Model = this.getModel(collectionName);
    return Model.aggregate(pipeline, options);
  }

  async bulkWrite(collectionName: string, operations: any[], options = {}) {
    const Model = this.getModel(collectionName);
    return Model.bulkWrite(operations, options);
  }
}

export default new Repository();
