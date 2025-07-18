import AbstractPageSheet from "../../api/abstract-page-sheet.mjs";

export default class ShopPageSheet extends AbstractPageSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    viewClasses: ["shop-page"],
    window: {
      icon: "fa-solid fa-fw fa-shop",
    },
    actions: {
      editStock: ShopPageSheet.#editStock,
      removeStock: ShopPageSheet.#removeStock,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {};

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static EDIT_PARTS = {
    configuration: {
      template: "modules/quest-board/templates/shop/edit/configuration.hbs",
      templates: ["modules/quest-board/templates/shared/edit/basics.hbs"],
      classes: ["standard-form", "scrollable"],
      scrollable: [".scrollable"],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static VIEW_PARTS = {
    content: {
      template: "modules/quest-board/templates/shared/view/content.hbs",
      root: true,
    },
    header: {
      template: "modules/quest-board/templates/shop/view/header.hbs",
      classes: ["quest-board"],
    },
    store: {
      template: "modules/quest-board/templates/shop/view/store.hbs",
      classes: ["quest-board", "journal-page-content"],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("QUESTBOARD.SHOP.EDIT.TITLE", { name: this.document.name });
  }

  /* -------------------------------------------------- */

  /**
   * The current customer making purchases in View Mode.
   * @type {Actor|null}
   */
  #customer = null;

  /* -------------------------------------------------- */

  /**
   * A set of stock ids to help persist the disabled state of buttons across re-renders.
   * @type {Set<string>}
   */
  #disabledStock = new Set();

  /* -------------------------------------------------- */

  /**
   * Since it is not possible to use `this.element` for view mode, we have to record
   * each of the individual purchase buttons.
   * @type {Map<string, HTMLButtonElement>}
   */
  #purchaseButtons = new Map();

  /* -------------------------------------------------- */

  /**
   * Toggle and store the disabled state of a button.
   * @param {HTMLButtonElement} button    The button element.
   * @param {boolean} state               The disabled state.
   */
  #toggleStockButton(button, state) {
    const id = button.closest("[data-stock-id]").dataset.stockId;
    if (state) {
      this.#disabledStock.add(id);
    } else {
      this.#disabledStock.delete(id);
    }
    this.#purchaseButtons.get(id).disabled = state;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    Object.assign(context.ctx, {
      stockFields: {
        each: {
          value: this.document.system.schema.getField("stock.element.price.each.value"),
          denom: this.document.system.schema.getField("stock.element.price.each.denomination"),
        },
        stack: {
          value: this.document.system.schema.getField("stock.element.price.stack.value"),
          denom: this.document.system.schema.getField("stock.element.price.stack.denomination"),
        },
        qty: this.document.system.schema.getField("stock.element.quantity"),
      },
    });

    context.ctx.stock = [];
    for (const stock of this.document.system.stock) {
      const data = await stock.prepareEntryData();
      if (!data) continue;
      context.ctx.stock.push({ stock, ctx: data });
    }

    await this.#prepareContextProprietor(context);

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Modify rendering context for the `proprietor` part.
   * @param {object} context    Rendering context. **will be mutated**
   * @returns {Promise}         A promise that resolves once the context has been prepared.
   */
  async #prepareContextProprietor(context) {}

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContentContext(context, options) {
    if (!this.#customer) this.#customer = game.user.character ?? null;
    context.customer = this.#customer;
    context.stock = [];
    for (const stock of this.document.system.stock) {
      const data = await stock.prepareEntryData();
      if (!data) continue;
      context.stock.push({
        stock,
        ctx: data,
        disabled: !this.#customer || this.#disabledStock.has(stock.id),
      });
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    let uuids;

    // Drop a compendium.
    if (data.type === "Compendium") {
      const pack = game.packs.get(data.collection);
      if (pack.metadata.type !== "Item") {
        ui.notifications.error("QUESTBOARD.SHOP.EDIT.WARNING.onlyItems", { localize: true });
        return;
      }

      uuids = pack.index.map(index => index.uuid);
    }

    // Drop a folder.
    else if (data.type === "Folder") {
      const folder = fromUuidSync(data.uuid);
      if (folder.type !== "Item") {
        ui.notifications.error("QUESTBOARD.SHOP.EDIT.WARNING.onlyItems", { localize: true });
        return;
      }
      uuids = folder.contents.map(item => item.uuid);
    }

    // The drop must otherwise be an item.
    else if (data.type === "Item") {
      uuids = [data.uuid];
    }

    else {
      ui.notifications.error("QUESTBOARD.SHOP.EDIT.WARNING.onlyItems", { localize: true });
      return;
    }

    // All uuids must be in a pack.
    if (!uuids.every(uuid => uuid.startsWith("Compendium."))) {
      ui.notifications.error("QUESTBOARD.SHOP.EDIT.WARNING.onlyPack", { localize: true });
      return;
    }

    if (uuids.length > 50) {
      const confirm = await foundry.applications.api.Dialog.confirm({
        content: `<p>${game.i18n.format("QUESTBOARD.SHOP.EDIT.areYouSure", { length: uuids.length })}</p>`,
      });
      if (!confirm) return;
    }

    for (const uuid of uuids) await this.document.system.addStock(uuid);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _attachPartListeners(partId, element, options) {
    super._attachPartListeners(partId, element, options);

    if (this.isView) {
      switch (partId) {
        case "store":
          for (const button of element.querySelectorAll("[data-action=purchase]")) {
            const id = button.closest("[data-stock-id]").dataset.stockId;
            button.addEventListener("click", ShopPageSheet.#purchase.bind(this));
            this.#purchaseButtons.set(id, button);
          }
          break;
        case "header":
          element.querySelector("[data-action=changeCustomer]")
            .addEventListener("click", ShopPageSheet.#changeCustomer.bind(this));
          break;
      }
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    if (!this.document.system.owner) delete parts.proprietor;
    return parts;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _prepareTabs(group) {
    const tabs = super._prepareTabs(group);
    if (!this.document.system.owner) delete tabs.proprietor;
    return tabs;
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Configure an entry in the stock.
   * @this {ShopPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #editStock(event, target) {
    const stockId = target.closest("[data-stock-id]").dataset.stockId;
    this.document.system.editStockDialog(stockId);
  }

  /* -------------------------------------------------- */

  /**
   * Remove an entry from the stock.
   * @this {ShopPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #removeStock(event, target) {
    const stockId = target.closest("[data-stock-id]").dataset.stockId;
    this.document.system.stock.get(stockId).delete();
  }

  /* -------------------------------------------------- */

  /**
   * Purchase an item in the store.
   * @this {ShopPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   */
  static async #purchase(event) {
    if (!game.user.can("QUERY_USER")) {
      ui.notifications.error("QUESTBOARD.PURCHASE.WARNING.queryPermission", { localize: true });
      return;
    }

    const gm = game.users.activeGM;
    if (!gm) {
      ui.notifications.error("QUESTBOARD.PURCHASE.WARNING.noGM", { localize: true });
      return;
    }

    const target = event.currentTarget;
    this.#toggleStockButton(target, true);
    const stockId = target.closest("[data-stock-id]").dataset.stockId;
    const stock = await this.document.system.stock.get(stockId).prepareEntryData();
    const quantity = await QUESTBOARD.applications.apps.ShopPurchasePrompt.create(stock);
    if (!quantity) {
      this.#toggleStockButton(target, false);
      return;
    }

    /** @type {import("../../../types.mjs").ShopPurchaseQueryConfiguration} */
    const configuration = {
      quantity, stockId,
      pageUuid: this.document.uuid,
      customerUuid: this.#customer.uuid,
    };

    const result = await gm.query("questboard", { type: "purchase", config: configuration }, { timeout: 10_000 });
    if (!result || (result.success === false)) {
      const message = [
        game.i18n.localize("QUESTBOARD.PURCHASE.WARNING.failure"),
        result?.reason ?? null,
      ].filterJoin(" ");
      ui.notifications.warn(message);
    }

    this.#toggleStockButton(target, false);
  }

  /* -------------------------------------------------- */

  /**
   * Change the current active customer.
   * @this {ShopPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   */
  static async #changeCustomer(event) {
    const html = foundry.applications.fields.createFormGroup({
      label: game.i18n.localize("QUESTBOARD.SHOP.VIEW.CUSTOMER.label"),
      hint: game.i18n.localize("QUESTBOARD.SHOP.VIEW.CUSTOMER.hint"),
      input: foundry.applications.fields.createSelectInput({
        required: true,
        value: this.#customer?.id,
        options: game.actors.filter(actor => actor.isOwner).map(actor => ({ value: actor.id, label: actor.name })),
        name: "customer",
        autofocus: true,
      }),
    }).outerHTML;

    const result = await foundry.applications.api.Dialog.input({
      content: html,
      window: {
        title: "QUESTBOARD.SHOP.VIEW.CUSTOMER.title",
      },
    });
    if (!result) return;
    this.#customer = game.actors.get(result.customer) ?? null;
    this.document.parent.sheet.render();
  }
}
