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
    const itemData = [];
    const itemUpdates = [];

    if (item.type === "container") {
      // Containers get created multiple times.
      const Cls = foundry.utils.getDocumentClass("Item");
      for (let i = 0; i < configuration.quantity; i++) {
        const data = await Cls.createWithContents([item]);
        itemData.push(...data);
      }
    } else {
      // Check for existing stack of consumable items.
      const existing = customer.itemTypes.consumable.find(c => {
        return c._stats.compendiumSource
          && (c.name === item.name)
          && (c._stats.compendiumSource === item.uuid);
      });
      if (existing) {
        const update = itemUpdates.find(u => u._id === existing.id) ?? {
          _id: existing.id, "system.quantity": existing.system.quantity,
        };
        if (!itemUpdates.includes(update)) itemUpdates.push(update);
        update["system.quantity"] += configuration.quantity;
      } else {
        itemData.push(foundry.utils.mergeObject(game.items.fromCompendium(item), {
          "system.quantity": configuration.quantity,
        }));
      }
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
    for (const stock of [...this.stock]) {
      const item = fromUuidSync(stock.uuid);
      if (!item || !ShopData.#ALLOWED_ITEM_TYPES.has(item.type)) {
        this.stock.delete(stock);
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
    for (const stock of this.stock) {
      const entry = await ShopData.loadSingleStock(stock);
      loaded.push(entry);
    }
    return loaded;
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
    const index = stock.findIndex(item => item.uuid === uuid);
    if (index === -1) {
      stock.push({ uuid });
    } else {
      const quantity = (stock[index].quantity ?? item.system._source.quantity) + item.system._source.quantity;
      stock[index] = foundry.utils.mergeObject(stock[index], { quantity }, { inplace: false });
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
      return { field, value, name: path };
    };

    const prepared = await ShopData.loadSingleStock(this.stock.find(s => s.uuid === uuid));
    const item = prepared.item;

    const context = {
      alias: getField("alias"),
      pev: getField("price.each.value"),
      ped: getField("price.each.denomination"),
      psv: getField("price.stack.value"),
      psd: getField("price.stack.denomination"),
      quantity: getField("quantity"),
    };
    context.alias.placeholder = item.name;
    context.pev.placeholder = item.system.price.value;
    context.ped.blank = game.i18n.format("QUESTBOARD.STOCK.DIALOG.DEFAULT", {
      value: CONFIG.DND5E.currencies[item.system.price.denomination || "gp"].label,
    });
    context.psv.placeholder = Number(context.pev.value * context.quantity.value).toNearest(0.1);
    context.psd.blank = game.i18n.format("QUESTBOARD.STOCK.DIALOG.DEFAULT", {
      value: CONFIG.DND5E.currencies[context.ped.value || item.system.price.denomination || "gp"].label,
    });
    context.quantity.placeholder = item.system.quantity;
    const html = await foundry.applications.handlebars.renderTemplate(
      "modules/quest-board/templates/shop/edit/edit-stock.hbs",
      context,
    );

    const update = await foundry.applications.api.Dialog.input({
      content: html,
      window: {
        title: game.i18n.format("QUESTBOARD.STOCK.DIALOG.TITLE", { name: item.name }),
      },
      position: {
        width: 400,
      },
    });
    if (!update) return null;
    return this.editStock(uuid, update);
  }
}
