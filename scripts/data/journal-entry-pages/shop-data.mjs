const {
  ForeignDocumentField,
} = foundry.data.fields;

export default class ShopData extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      owner: new ForeignDocumentField(foundry.documents.Actor),
      stock: new QUESTBOARD.data.fields.CollectionField(QUESTBOARD.data.StockItem),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["QUESTBOARD.SHOP"];

  /* -------------------------------------------------- */

  /**
   * Query method to purchase an item from the shop.
   * @param {import("../../types.mjs").ShopPurchaseQueryConfiguration} configuration
   * @returns {Promise<import("../../types.mjs").QueryResult>}
   */
  static _query = async (configuration) => {
    return QUESTBOARD.semaphore.add(ShopData.#query, configuration);
  };

  /* -------------------------------------------------- */

  /**
   * Query method to purchase an item from the shop.
   * @param {import("../../types.mjs").ShopPurchaseQueryConfiguration} configuration
   * @returns {Promise<import("../../types.mjs").QueryResult>}
   */
  static #query = async (configuration) => {
    const page = await fromUuid(configuration.pageUuid);

    const stock = page.system.stock.get(configuration.stockId);
    if (!stock) {
      return {
        success: false,
        reason: game.i18n.localize("QUESTBOARD.PURCHASE.WARNING.stockNotFound"),
      };
    }
    const prepared = await stock.prepareEntryData();

    if (configuration.quantity > prepared.quantity) {
      return {
        success: false,
        reason: game.i18n.localize("QUESTBOARD.PURCHASE.WARNING.tooHighQuantity"),
      };
    }

    const isStack = configuration.quantity === prepared.quantity;
    const value = isStack ? prepared.psv : (configuration.quantity * prepared.pev);
    const denomination = isStack ? prepared.psd : prepared.ped;

    const customer = await fromUuid(configuration.customerUuid);
    const available = customer.system.currency[denomination];
    if (available < value) {
      return {
        success: false,
        reason: game.i18n.format("QUESTBOARD.PURCHASE.WARNING.insufficientFunds", {
          name: customer.name, value, denomination: CONFIG.DND5E.currencies[denomination].label,
        }),
      };
    }

    const { itemData, itemUpdates } = await QUESTBOARD.utils.batchCreateItems(customer, [{
      item: prepared.item, quantity: configuration.quantity,
    }]);

    if (isStack) {
      await stock.delete();
    } else {
      await stock.update({ quantity: prepared.quantity - configuration.quantity });
    }

    await Promise.all([
      customer.update({ [`system.currency.${denomination}`]: available - value }),
      customer.createEmbeddedDocuments("Item", itemData, { keepId: true }),
      customer.updateEmbeddedDocuments("Item", itemUpdates),
    ]);

    // Create receipt message.
    const Cls = foundry.utils.getDocumentClass("ChatMessage");
    await Cls.create({
      content: `<p class="dnd5e2">${game.i18n.format("QUESTBOARD.PURCHASE.CONFIRM.receipt", {
        value, denomination,
        link: prepared.item.link,
        quantity: configuration.quantity,
      })}</p>`,
      speaker: Cls.getSpeaker({ actor: customer }),
    });

    return { success: true };
  };

  /* -------------------------------------------------- */

  /**
   * Add a new entry to the stock.
   * @param {string} uuid                   The uuid of the item to add.
   * @returns {Promise<JournalEntryPage>}   A promise that resolves to the updated page.
   */
  async addStock(uuid) {
    const item = await fromUuid(uuid);
    if (!QUESTBOARD.data.StockItem.ALLOWED_ITEM_TYPES.has(item.type)) {
      ui.notifications.error("QUESTBOARD.SHOP.EDIT.HINTS.invalidItemType", { format: { type: item.type } });
      return;
    }

    const stock = this.stock.find(stock => stock.uuid === uuid);
    if (stock) {
      const data = await stock.prepareEntryData();
      return stock.update({ quantity: data.quantity + item.system._source.quantity });
    } else {
      return QUESTBOARD.data.StockItem.create({ uuid }, { parent: this.parent });
    }
  }

  /* -------------------------------------------------- */

  /**
   * Create a dialog for editing an entry in the stock.
   * @param {string} stockId                The stock id of the entry.
   * @returns {Promise<ShopStockConfig>}    A promise that resolves to a rendered stock config.
   */
  async editStockDialog(stockId) {
    return new QUESTBOARD.applications.apps.ShopStockConfig({
      stockId,
      document: this.parent,
    }).render({ force: true });
  }
}
