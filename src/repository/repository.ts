export class Repository<T> {
  private readonly model: any;

  constructor(model: any) {
    this.model = model;
  }

  create(payload: Partial<T>) {
    return this.model.create(payload);
  }

  findById(id: string) {
    return this.model.findById(id);
  }

  find(filter: Record<string, unknown>) {
    return this.model.find(filter);
  }

  update(id: string, updates: Partial<T>) {
    return this.model.findByIdAndUpdate(id, updates, { new: true });
  }

  delete(id: string) {
    return this.model.findByIdAndDelete(id);
  }
}
