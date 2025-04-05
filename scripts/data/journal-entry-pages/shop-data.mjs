/** @import * as TYPES from "../../types.mjs" */

const {
  DocumentUUIDField, ForeignDocumentField, NumberField,
  SchemaField, StringField,
} = foundry.data.fields;

export default class ShopData extends foundry.abstract.TypeDataModel {
  /**
   * Allowed item types.
   * @type {Set<string>}
   */
  static #ALLOWED_ITEM_TYPES = new Set([
    "consumable",
    "container",
    "equipment",
    "loot",
    "tool",
    "weapon",
  ]);

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      owner: new ForeignDocumentField(foundry.documents.Actor),
      stock: new QUESTBOARD.data.fields.StockField(new SchemaField({
        alias: new StringField({ required: true }),
        price: new SchemaField({
          each: new SchemaField({
            value: new NumberField({ required: true, step: 0.1, min: 0 }),
            denomination: new StringField({ required: true, blank: true, choices: CONFIG.DND5E.currencies }),
          }),
          stack: new SchemaField({
            value: new NumberField({ required: true, step: 0.1, min: 0 }),
            denomination: new StringField({ required: true, blank: true, choices: CONFIG.DND5E.currencies }),
          }),
        }),
        quantity: new NumberField({ required: true, step: 1, min: 0 }),
        uuid: new DocumentUUIDField({ type: "Item", embedded: false }),
      })),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["QUESTBOARD.SHOP"];

  /* -------------------------------------------------- */

  /**
   * Query method to purchase an item from the shop.
   * @param {TYPES.ShopPurchaseQueryConfiguration} configuration
   * @returns {Promise<TYPES.QueryResult>}
   */
  static _query = async (configuration) => {
    if (!ShopData.#semaphore) {
      ShopData.#semaphore = new foundry.utils.Semaphore(1);
    }

    return ShopData.#semaphore.add(ShopData.#query, configuration);
  };

  /* -------------------------------------------------- */

  /**
   * Query method to purchase an item from the shop.
   * @param {TYPES.ShopPurchaseQueryConfiguration} configuration
   * @returns {Promise<QueryResult>}
   */
  static #query = async (configuration) => {
    const page = await foundry.utils.fromUuid(configuration.pageUuid);

    let stock = page.system.stock.find(s => s.uuid === configuration.stockUuid);
    if (!stock) {
      return {
        success: false,
        reason: game.i18n.localize("QUESTBOARD.PURCHASE.WARNING.stockNotFound"),
      };
    }
    stock = await ShopData.loadSingleStock(stock);

    if (configuration.quantity > stock.quantity) {
      return {
        success: false,
        reason: game.i18n.localize("QUESTBOARD.PURCHASE.WARNING.tooHighQuantity"),
      };
    }

    const isStack = configuration.quantity === stock.quantity;
    const { value, denomination } = isStack
      ? stock.price.stack
      : {
        value: (stock.price.each.value * configuration.quantity).toNearest(0.1),
        denomination: stock.price.each.denomination,
      };

    const customer = await foundry.utils.fromUuid(configuration.customerUuid);
    const available = customer.system.currency[denomination];
    if (available < value) {
      return {
        success: false,
        reason: game.i18n.format("QUESTBOARD.PURCHASE.WARNING.insufficientFunds", {
          name: customer.name, value, denomination,
        }),
      };
    }

    const item = stock.item;
    const { itemData, itemUpdates } = await QUESTBOARD.utils.batchCreateItems(customer, [{
      item, quantity: configuration.quantity,
    }]);

    if (isStack) {
      await page.system.removeStock(configuration.stockUuid);
    } else {
      await page.system.editStock(configuration.stockUuid, {
        quantity: stock.quantity - configuration.quantity,
      });
    }

    await Promise.all([
      customer.update({ [`system.currency.${denomination}`]: available - value }),
      customer.createEmbeddedDocuments("Item", itemData, { keepId: true }),
      customer.updateEmbeddedDocuments("Item", itemUpdates),
    ]);

    return { success: true };
  };

  /* -------------------------------------------------- */

  /**
   * Assign the query handlers to the global object.
   */
  static assignQueries() {
    CONFIG.queries.questboardPurchase = ShopData._query;
  }

  /* -------------------------------------------------- */

  /**
   * A semaphore for handling purchases in order.
   * @type {Semaphore}
   */
  static #semaphore;

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    for (const [id, stock] of Object.entries(this.stock)) {
      const item = fromUuidSync(stock.uuid);
      if (!item || !ShopData.#ALLOWED_ITEM_TYPES.has(item.type)) {
        delete this.stock[id];
        continue;
      }
      stock.label = stock.alias ? stock.alias : item.name;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Load the stock. This retrieves the item and configures shop data for the item.
   * @returns {Promise<object[]>}   A promise that resolves to objects describing the full stock.
   */
  async loadStock() {
    const loaded = [];
    for (const stock of Object.values(this.stock)) {
      const entry = await ShopData.loadSingleStock(stock);
      loaded.push(entry);
    }
    return loaded;
  }

  /* -------------------------------------------------- */

  /**
   * Get the id of the stock entry that stores the item by a given uuid.
   * @param {string} uuid     An item's uuid.
   * @returns {string|null}   The id or null if not found.
   */
  getStockId(uuid) {
    for (const [id, v] of Object.entries(this.stock)) {
      if (v.uuid === uuid) return id;
    }
    return null;
  }

  /* -------------------------------------------------- */

  /**
   * Load a stock and prepare it for rendering.
   * @param {Object} stock        The unprepared stock entry.
   * @returns {Promise<object>}   A promise that resolves to an object describing the stock.
   */
  static async loadSingleStock(stock) {
    stock = foundry.utils.deepClone(stock);
    stock.item = await foundry.utils.fromUuid(stock.uuid);

    // Set fallback quantity.
    if (!stock.quantity) stock.quantity = stock.item.system.quantity;

    // Set fallback unit price.
    if (!Number.isNumeric(stock.price.each.value)) {
      stock.price.each.value = stock.item.system.price.value;
    }
    if (!stock.price.each.denomination) {
      stock.price.each.denomination = stock.item.system.price.denomination;
    }

    // Set fallback stack price.
    if (!Number.isNumeric(stock.price.stack.value)) {
      stock.price.stack.value = (stock.price.each.value * stock.quantity).toNearest(0.1);
    }
    if (!stock.price.stack.denomination) {
      stock.price.stack.denomination = stock.price.each.denomination;
    }
    return stock;
  }

  /* -------------------------------------------------- */

  /**
   * Add a new entry to the stock.
   * @param {string} uuid                   The uuid of the item to add.
   * @returns {Promise<JournalEntryPage>}   A promise that resolves to the updated page.
   */
  async addStock(uuid) {
    const item = await foundry.utils.fromUuid(uuid);
    if (!ShopData.#ALLOWED_ITEM_TYPES.has(item.type)) {
      throw new Error(`You cannot add a '${item.type}' item to the stock!`);
    }
    const stock = this.toObject().stock;
    const id = this.getStockId(uuid);

    if (id) {
      const quantity = (stock[id].quantity ?? item.system._source.quantity) + item.system._source.quantity;
      stock[id].quantity = quantity;
    } else {
      stock[foundry.utils.randomID()] = { uuid };
    }

    return this.parent.update({ "system.stock": stock });
  }

  /* -------------------------------------------------- */

  /**
   * Remove an entry from the stock.
   * @param {string} uuid                   The uuid of the entry to remove.
   * @returns {Promise<JournalEntryPage>}   A promise that resolves to the updated page.
   */
  async removeStock(uuid) {
    const id = this.getStockId(uuid);
    return this.parent.update({ [`system.stock.-=${id}`]: null });
  }

  /* -------------------------------------------------- */

  /**
   * Create a dialog for editing an entry in the stock.
   * @param {string} uuid                   The uuid of the entry.
   * @returns {Promise<ShopStockConfig>}    A promise that resolves to a rendered stock config.
   */
  async editStockDialog(uuid) {
    return new QUESTBOARD.applications.apps.ShopStockConfig({
      document: this.parent,
      stockId: this.getStockId(uuid),
    }).render({ force: true });
  }
}
