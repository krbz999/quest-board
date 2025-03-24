const { HandlebarsApplicationMixin, Application, Dialog } = foundry.applications.api;
const { NumberField } = foundry.data.fields;

export default class PurchasePrompt extends Dialog {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    position: {
      width: 400,
    },
    window: {
      icon: "fa-solid fa-shop",
    },
  };

  /* -------------------------------------------------- */

  /**
   * Prompt to confirm a purchase and quantity.
   * @param {object} stock                The stock entry.
   * @returns {Promise<number|boolean>}   The quantity to purchase, or `false` if cancelled.
   */
  static async create(stock) {
    if (stock.quantity === 1) return this.#confirm(stock);
    return this.#pickQuantity(stock);
  }

  /* -------------------------------------------------- */

  /**
   * Confirm the purchase of a single-quantity item.
   * @param {object} stock                The stock entry.
   * @returns {Promise<number|boolean>}   Either `1` or `false` if cancelled.
   */
  static async #confirm(stock) {
    const { label, price, quantity } = stock;
    const result = await this.confirm({
      window: {
        title: game.i18n.format("QUESTBOARD.PURCHASE.CONFIRM.title", { name: label }),
      },
      content: `<p>${game.i18n.format("QUESTBOARD.PURCHASE.CONFIRM.areYouSure", {
        name: label, ...price.each,
      })}</p>`,
    });
    return result ? 1 : false;
  }

  /* -------------------------------------------------- */

  /**
   * Confirm the purchase of an item with greater-than-one quantity.
   * @param {object} stock                The stock entry.
   * @returns {Promise<number|boolean>}   Either the quantity picked or `false` if cancelled.
   */
  static async #pickQuantity(stock) {
    const { label, quantity, price } = stock;

    const field = new NumberField({
      label: game.i18n.localize("QUESTBOARD.PURCHASE.QUANTITY.label"),
      min: 1,
      max: quantity,
      integer: true,
      nullable: false,
    }).toFormGroup({}, {
      name: "quantity",
      value: 1,
    }).outerHTML;

    const content = [
      field,
      `<p data-hint>${game.i18n.format("QUESTBOARD.PURCHASE.QUANTITY.content", {
        name: label,
        quantity: 1,
        value: (quantity === 1) ? price.stack.value : (price.each.value * 1).toNearest(0.1),
        denom: (quantity === 1) ? price.stack.denomination : price.each.denomination,
      })}</p>`,
    ].join("");

    const render = (event, html) => {
      const [input, range, hint] = html.querySelectorAll("[name=quantity], [name=quantity] [type=range], [data-hint]");

      const fn = event => {
        const value = Number(event.currentTarget.value);
        hint.textContent = game.i18n.format("QUESTBOARD.PURCHASE.QUANTITY.content", {
          name: label,
          quantity: value,
          value: (quantity === value) ? price.stack.value : (price.each.value * value).toNearest(0.1),
          denom: (quantity === value) ? price.stack.denomination : price.each.denomination,
        });
      };
      input.addEventListener("change", fn);
      range.addEventListener("input", fn);
    };

    const result = await this.input({
      content,
      render,
      window: {
        title: game.i18n.format("QUESTBOARD.PURCHASE.QUANTITY.title", { name: label }),
      },
    });
    return result ? result.quantity : false;
  }
}
