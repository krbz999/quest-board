import AbstractPageSheet from "./abstract-page-sheet.mjs";

export default class ShopPageSheet extends AbstractPageSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    viewClasses: ["shop"],
    actions: {
      editStock: ShopPageSheet.#editStock,
      removeStock: ShopPageSheet.#removeStock,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "identity", icon: "fa-solid fa-gears" },
        { id: "stock", icon: "fa-solid fa-shop" },
      ],
      initial: "identity",
      labelPrefix: "QUESTBOARD.SHOP.EDIT.TABS",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static EDIT_PARTS = {
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    identity: {
      template: "modules/quest-board/templates/shop/edit/identity.hbs",
      templates: ["modules/quest-board/templates/shared/edit/basics.hbs"],
      classes: ["tab"],
    },
    stock: {
      template: "modules/quest-board/templates/shop/edit/stock.hbs",
      classes: ["scrollable", "tab"],
      scrollable: [""],
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

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    Object.assign(context.fields, {
      owner: this._prepareField("system.owner"),
      each: {
        value: this._prepareField("system.stock.element.price.each.value"),
        denom: this._prepareField("system.stock.element.price.each.denomination"),
      },
      stack: {
        value: this._prepareField("system.stock.element.price.stack.value"),
        denom: this._prepareField("system.stock.element.price.stack.denomination"),
      },
      quantity: this._prepareField("system.stock.element.quantity"),
      stock: await this.document.system.loadStock(),
    });

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContentContext(context, options) {
    if (!this.#customer) this.#customer = game.user.character ?? null;
    context.customer = this.#customer;
    context.stock = await this.document.system.loadStock();
    for (const stock of context.stock) {
      stock.link = stock.item.toAnchor({ name: stock.label }).outerHTML;
      stock.disabled = !this.#customer;
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.getDragEventData(event);
    if (data.type !== "Item") {
      ui.notifications.error("QUESTBOARD.SHOP.EDIT.WARNING.onlyItems", { localize: true });
      return;
    }
    if (!data.uuid.startsWith("Compendium.")) {
      ui.notifications.error("QUESTBOARD.SHOP.EDIT.WARNING.onlyPack", { localize: true });
      return;
    }
    this.document.system.addStock(data.uuid);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _attachPartListeners(partId, element, options) {
    super._attachPartListeners(partId, element, options);

    if (partId === "store") {
      for (const button of element.querySelectorAll("[data-action=purchase]")) {
        button.addEventListener("click", ShopPageSheet.#purchase.bind(this));
      }
      element.querySelector("[data-action=changeCustomer]")
        .addEventListener("click", ShopPageSheet.#changeCustomer.bind(this));
    }
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
    const uuid = target.closest("[data-uuid]").dataset.uuid;
    this.document.system.editStockDialog(uuid);
  }

  /* -------------------------------------------------- */

  /**
   * Remove an entry from the stock.
   * @this {ShopPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #removeStock(event, target) {
    const uuid = target.closest("[data-uuid]").dataset.uuid;
    this.document.system.removeStock(uuid);
  }

  /* -------------------------------------------------- */

  /**
   * Purchase an item in the store.
   * @this {ShopPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   */
  static async #purchase(event) {
    const gm = game.users.activeGM;
    if (!gm) {
      ui.notifications.error("QUESTBOARD.PURCHASE.WARNING.noGM", { localize: true });
      return;
    }

    const target = event.currentTarget;
    target.disabled = true;
    const uuid = target.closest("[data-uuid]").dataset.uuid;

    const stock = this.document.system.stock.find(s => s.uuid === uuid);
    const quantity = await QUESTBOARD.applications.apps.PurchasePrompt.create(stock);
    if (!quantity) {
      target.disabled = false;
      return;
    }

    const configuration = {
      quantity,
      pageUuid: this.document.uuid,
      stockUuid: uuid,
      customerUuid: this.#customer.uuid,
    };

    const result = await gm.query("questboardPurchase", configuration);
    if (!result || (result.success === false)) {
      const message = [
        game.i18n.localize("QUESTBOARD.PURCHASE.WARNING.failure"),
        result?.reason ?? null,
      ].filterJoin(" ");
      ui.notifications.warn(message);
      target.disabled = false;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Change the current active customer.
   * @this {ShopPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   */
  static async #changeCustomer(event) {
    const result = await foundry.applications.api.Dialog.input({
      content: new foundry.data.fields.StringField({
        label: game.i18n.localize("QUESTBOARD.SHOP.VIEW.CUSTOMER.label"),
        hint: game.i18n.localize("QUESTBOARD.SHOP.VIEW.CUSTOMER.hint"),
        required: true,
      }).toFormGroup({}, {
        value: this.#customer?.id,
        options: game.actors.filter(actor => actor.isOwner).map(actor => ({ value: actor.id, label: actor.name })),
        name: "customer",
        autofocus: true,
      }).outerHTML,
      window: {
        title: "QUESTBOARD.SHOP.VIEW.CUSTOMER.title",
      },
    });
    if (!result) return;
    this.#customer = game.actors.get(result.customer) ?? null;
    this.document.parent.sheet.render();
  }
}
