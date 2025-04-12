const { HandlebarsApplicationMixin, Application } = foundry.applications.api;
const { NumberField } = foundry.data.fields;

export default class ShopPurchasePrompt extends HandlebarsApplicationMixin(Application) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    stock: null,
    tag: "form",
    position: {
      width: 400,
    },
    window: {
      icon: "fa-solid fa-shop",
      contentClasses: ["standard-form"],
    },
    form: {
      handler: ShopPurchasePrompt.#onSubmit,
      closeOnSubmit: true,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    inputs: {
      template: "modules/quest-board/templates/apps/shop-purchase-prompt/inputs.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  /* -------------------------------------------------- */

  /**
   * The stock entry.
   * @type {object}
   */
  get stock() {
    return this.options.stock;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    const name = this.stock.item.name;
    return game.i18n.format("QUESTBOARD.PURCHASE.CONFIRM.title", { name });
  }

  /* -------------------------------------------------- */

  /**
   * The returned value.
   * @type {number|null}
   */
  get result() {
    return this.#result;
  }
  #result = null;

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const data = this.stock;
    const context = {
      showRange: data.quantity > 1,
      buttons: [{ type: "submit", label: "Confirm", action: "ok", icon: "fa-solid fa-check" }],
    };

    if (context.showRange) {
      context.input = {
        field: new NumberField({
          integer: true,
          label: game.i18n.localize("QUESTBOARD.PURCHASE.QUANTITY.label"),
          max: data.quantity,
          min: 1,
          nullable: false,
        }),
        value: 1,
        name: "quantity",
      };
      context.hint = this.#constructHint(1);
    } else {
      context.content = game.i18n.format("QUESTBOARD.PURCHASE.CONFIRM.areYouSure", {
        name: data.item.name, value: data.pev, denomination: data.ped,
      });
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    const rangePicker = this.element.querySelector("range-picker");
    if (!rangePicker) return;
    const range = rangePicker.querySelector("[type=range]");
    const hint = this.element.querySelector("[data-hint]");

    const fn = event => {
      const value = Number(event.currentTarget.value);
      hint.textContent = this.#constructHint(value);
    };

    rangePicker.addEventListener("change", fn);
    range.addEventListener("input", fn);
  }

  /* -------------------------------------------------- */

  /**
   * Construct hint text for range picker.
   * @param {number} value    Current quantity.
   * @returns {string}        Localized hint.
   */
  #constructHint(value) {
    return game.i18n.format("QUESTBOARD.PURCHASE.QUANTITY.content", {
      name: this.stock.item.name,
      quantity: value,
      value: (this.stock.quantity === value) ? this.stock.psv : (this.stock.pev * value).toNearest(0.1),
      denomination: CONFIG.DND5E.currencies[(this.stock.quantity === value) ? this.stock.psd : this.stock.ped].label,
    });
  }

  /* -------------------------------------------------- */

  /**
   * Asynchronous factory method.
   * @param {object} [stock]            The stock entry.
   * @returns {Promise<number|null>}    A promise that resolves to the selected quantity.
   */
  static async create(stock) {
    const { promise, resolve } = Promise.withResolvers();
    const application = new this({ stock });
    application.addEventListener("close", () => resolve(application.result), { once: true });
    application.render({ force: true });
    return promise;
  }

  /* -------------------------------------------------- */

  /**
   * @this {ShopPurchasePrompt}
   * @param {SubmitEvent} event           The submit event.
   * @param {HTMLFormElement} form        The form element.
   * @param {FormDataExtended} formData   The form data.
   */
  static #onSubmit(event, form, formData) {
    this.#result = (this.stock.quantity > 1) ? formData.object.quantity : 1;
  }
}
