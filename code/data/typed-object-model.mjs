export default class TypedObjectModel extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      _id: new foundry.data.fields.DocumentIdField(),
      uuid: new foundry.data.fields.DocumentUUIDField({ type: "Item", embedded: false }),
      quantity: new foundry.data.fields.NumberField({ nullable: true, min: 1, integer: true, initial: null }),
    };
  }

  /* -------------------------------------------------- */

  /**
   * The item types that are allowed to be referenced by this model.
   * @type {Set<string>}
   */
  static ALLOWED_ITEM_TYPES = new Set([
    "consumable",
    "container",
    "equipment",
    "loot",
    "tool",
    "weapon",
  ]);

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _initialize(options = {}) {
    const result = super._initialize(options);
    this.prepareData();
    return result;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare any other temporary data on this model.
   */
  prepareData() {}

  /* -------------------------------------------------- */

  /**
   * The document on which this is stored.
   * @type {JournalEntryPage}
   */
  get document() {
    return this.parent.parent;
  }

  /* -------------------------------------------------- */

  /**
   * The id of this model.
   * @type {string}
   */
  get id() {
    return this._id;
  }

  /* -------------------------------------------------- */

  /**
   * The path to the collection that holds this model.
   * @type {string}
   */
  get path() {
    return "";
  }

  /* -------------------------------------------------- */

  /**
   * Get the referenced item.
   * @returns {Promise<Item5e|null>}    A promise that resolves to the referenced item.
   */
  async getItem() {
    return fromUuid(this.uuid);
  }

  /* -------------------------------------------------- */

  /**
   * Prepare entry data.
   * @returns {Promise<object|null>}    A promise that resolves to an object with the item and other data.
   */
  async prepareEntryData() {
    const item = await this.getItem();
    if (!item) return null;
    const quantity = this.quantity ? this.quantity : item.system.quantity;
    return { item, quantity };
  }

  /* -------------------------------------------------- */

  /**
   * Create an instance of this model on a parent.
   * @param {object} [data]                       Initial data of the model.
   * @param {object} operation                    Operation options.
   * @param {JournalEntryPage} operation.parent   The page to create this model on.
   * @returns {Promise<JournalEntryPage>}         A promise that resolves to the updated journal entry page.
   */
  static async create(data = {}, { parent, ...operation } = {}) {
    const id = foundry.utils.randomID();
    const instance = new this({ ...data, _id: id });
    const path = [instance.path, instance.id].join(".");
    return parent.update({ [path]: instance.toObject() }, operation);
  }

  /* -------------------------------------------------- */

  /**
   * Perform an update to this model.
   * @param {object} [changes]              The changes to make.
   * @returns {Promise<JournalEntryPage>}   A promise that resolves to the updated journal entry page.
   */
  async update(changes = {}) {
    const path = [this.path, this.id].join(".");
    return this.document.update({ [path]: changes });
  }

  /* -------------------------------------------------- */

  /**
   * Delete this model.
   * @returns {Promise<JournalEntryPage>}   A promise that resolves to the updated journal entry page.
   */
  async delete() {
    const path = [this.path, `-=${this.id}`].join(".");
    return this.document.update({ [path]: null });
  }
}
