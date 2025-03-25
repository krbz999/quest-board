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
      stock: new QUESTBOARD.data.fields.UniqueSchemaField(new SchemaField({
        alias: new StringField({ required: true }),
        price: new SchemaField({
          each: new SchemaField({
            value: new NumberField({ required: true, step: 0.1, nullable: false, positive: true }),
            denomination: new StringField({ required: true, initial: "gp", choices: CONFIG.DND5E.currencies }),
          }),
          stack: new SchemaField({
            value: new NumberField({ required: true, step: 0.1, min: 0 }),
            denomination: new StringField({ required: true, initial: "gp", choices: CONFIG.DND5E.currencies }),
          }),
        }),
        quantity: new NumberField({ integer: true, nullable: false, initial: 1, positive: true }),
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

    /** @type {TYPES.ShopStockEntry} */
    const stock = page.system.stock.find(s => s.uuid === configuration.stockUuid);
    if (!stock) {
      return {
        success: false,
        reason: game.i18n.localize("QUESTBOARD.PURCHASE.WARNING.stockNotFound"),
      };
    }
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

    const item = await foundry.utils.fromUuid(stock.uuid);
    const itemData = [];

    if (item.type === "container") {
      const Cls = foundry.utils.getDocumentClass("Item");
      for (let i = 0; i < configuration.quantity; i++) {
        const data = await Cls.createWithContents([item]);
        itemData.push(...data);
      }
    } else {
      itemData.push(foundry.utils.mergeObject(game.items.fromCompendium(item), {
        "system.quantity": configuration.quantity,
      }));
    }

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
    for (const stock of [...this.stock]) {
      const item = fromUuidSync(stock.uuid);
      if (!item || !ShopData.#ALLOWED_ITEM_TYPES.has(item.type)) {
        this.stock.delete(stock);
        continue;
      }

      const source = this._source.stock.find(s => s.uuid === stock.uuid);

      // If the stack price is not explicitly set, multiply the each price.
      if (!source.price.stack.value) {
        stock.price.stack.value = (stock.price.each.value * stock.quantity).toNearest(0.1);
        stock.price.stack.denomination = stock.price.each.denomination;
      }

      stock.label = stock.alias ? stock.alias : item.name;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Load the stock.
   * @returns {Promise<object[]>}   A promise that resolves to an object describing the stock.
   */
  async loadStock() {
    const loaded = [];
    for (const stock of this.stock) {
      const item = await foundry.utils.fromUuid(stock.uuid);
      loaded.push({ item, ...stock });
    }
    return loaded;
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
    const index = stock.findIndex(item => item.uuid === uuid);
    if (index === -1) stock.push({
      uuid,
      price: {
        each: { ...item.system._source.price },
      },
      quantity: item.system._source.quantity,
    });
    else stock[index] = foundry.utils.mergeObject(stock[index], {
      quantity: stock[index].quantity + item.system._source.quantity,
    }, { inplace: false });
    return this.parent.update({ "system.stock": stock });
  }

  /* -------------------------------------------------- */

  /**
   * Remove an entry from the stock.
   * @param {string} uuid                   The uuid of the entry to remove.
   * @returns {Promise<JournalEntryPage>}   A promise that resolves to the updated page.
   */
  async removeStock(uuid) {
    const stock = this.toObject().stock.filter(s => s.uuid !== uuid);
    return this.parent.update({ "system.stock": stock });
  }

  /* -------------------------------------------------- */

  /**
   * Perform changes to an entry in stock.
   * @param {string} uuid                         The uuid of the entry.
   * @returns {Promise<JournalEntryPage>}    A promise that resolves to the updated page.
   */
  async editStock(uuid, update = {}) {
    const stocks = this.toObject().stock;
    const source = stocks.find(s => s.uuid === uuid);
    if (!source) throw new Error("Stock not found for editing!");

    delete update.uuid;
    foundry.utils.mergeObject(source, update);
    return this.parent.update({ "system.stock": stocks });
  }

  /* -------------------------------------------------- */

  /**
   * Create a dialog for editing an entry in the stock.
   * @param {string} uuid                         The uuid of the entry.
   * @returns {Promise<JournalEntryPage|null>}    A promise that resolves to the updated page.
   */
  async editStockDialog(uuid) {
    const source = this.toObject().stock.find(s => s.uuid === uuid);
    const getField = path => {
      const field = this.schema.getField(`stock.element.${path}`);
      const value = foundry.utils.getProperty(source, path);
      return field.toFormGroup({}, { value, name: path }).outerHTML;
    };

    const fields = [];
    fields.push(getField("alias"));
    fields.push(getField("price.each.value"));
    fields.push(getField("price.each.denomination"));
    fields.push(getField("price.stack.value"));
    fields.push(getField("price.stack.denomination"));
    fields.push(getField("quantity"));

    const update = await foundry.applications.api.Dialog.input({
      content: `<fieldset>${fields.join("")}</fieldset>`,
      window: {
        title: "QUESTBOARD.STOCK.DIALOG.TITLE",
      },
      position: {
        width: 400,
      },
    });
    if (!update) return null;
    return this.editStock(uuid, update);
  }
}
