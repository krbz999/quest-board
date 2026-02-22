const { HandlebarsApplicationMixin, Application } = foundry.applications.api;

export default class ShopStockConfig extends HandlebarsApplicationMixin(Application) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "{id}",
    classes: ["quest-board"],
    stockId: null,
    document: null,
    tag: "form",
    window: {
      icon: "fa-solid fa-bag-shopping",
      contentClasses: ["standard-form"],
    },
    position: {
      width: 500,
      height: "auto",
    },
    form: {
      closeOnSubmit: false,
      submitOnChange: true,
      handler: ShopStockConfig.#onSubmit,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    inputs: {
      template: "modules/quest-board/templates/apps/shop-stock-config/inputs.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.localize("QUESTBOARD.STOCK.DIALOG.TITLE");
  }

  /* -------------------------------------------------- */

  /**
   * The stock entry.
   * @type {object}
   */
  get stock() {
    return this.document.system.stock.get(this.options.stockId);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.document.apps[this.id] = this;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _canRender(options) {
    if (!this.stock) {
      if (this.rendered) this.close();
      return false;
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onClose(options) {
    super._onClose(options);
    delete this.document.apps[this.id];
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _initializeApplicationOptions(options) {
    const opts = super._initializeApplicationOptions(options);
    opts.uniqueId = `${options.document.uuid.replaceAll(".", "-")}-Stock-${options.stockId}`;
    return opts;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const stock = this.stock;
    const prepared = await stock.prepareEntryData();
    const item = prepared.item;

    const prepareField = path => {
      return {
        field: stock.schema.getField(path),
        name: path,
        value: foundry.utils.getProperty(stock, path),
      };
    };

    Object.assign(context, {
      alias: {
        ...prepareField("alias"),
        label: "QUESTBOARD.SHOP.FIELDS.stock.alias.label",
        placeholder: item.name,
      },
      pev: {
        ...prepareField("price.each.value"),
        placeholder: item.system.price.value,
      },
      ped: {
        ...prepareField("price.each.denomination"),
        blank: game.i18n.format("QUESTBOARD.STOCK.DIALOG.DEFAULT", {
          value: CONFIG.DND5E.currencies[item.system.price.denomination || "gp"].label,
        }),
      },
      psv: prepareField("price.stack.value"),
      psd: prepareField("price.stack.denomination"),
      quantity: {
        ...prepareField("quantity"),
        placeholder: item.system.quantity,
        label: "QUESTBOARD.SHOP.FIELDS.stock.quantity.label",
      },
    });
    context.quantity.value ||= null;
    context.psv.placeholder = Number(prepared.pev * prepared.quantity).toNearest(0.1);
    context.psd.blank = game.i18n.format("QUESTBOARD.STOCK.DIALOG.DEFAULT", {
      value: CONFIG.DND5E.currencies[context.ped.value || item.system.price.denomination || "gp"].label,
    });

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * The journal entry page.
   * @type {JournalEntryPage}
   */
  get document() {
    return this.options.document;
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle form submission.
   * @this {ShopStockConfig}
   * @param {SubmitEvent} event           The initiating submit event.
   * @param {HTMLFormElement} form        The form element.
   * @param {FormDataExtended} formData   The form data.
   */
  static #onSubmit(event, form, formData) {
    this.stock?.update(formData.object);
  }
}
