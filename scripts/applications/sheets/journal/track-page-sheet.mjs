import AbstractPageSheet from "../../api/abstract-page-sheet.mjs";

export default class TrackPageSheet extends AbstractPageSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    viewClasses: ["track-page"],
    window: {
      icon: "fa-solid fa-fw fa-chart-gantt",
    },
    actions: {
      configureCounter: TrackPageSheet.#configureCounter,
      createCounter: TrackPageSheet.#createCounter,
      deleteCounter: TrackPageSheet.#deleteCounter,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {};

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static EDIT_PARTS = {
    configuration: {
      template: "modules/quest-board/templates/track/edit/configuration.hbs",
      templates: ["modules/quest-board/templates/shared/edit/basics.hbs"],
      classes: ["standard-form"],
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
      template: "modules/quest-board/templates/track/view/header.hbs",
      classes: ["quest-board"],
    },
    counters: {
      template: "modules/quest-board/templates/track/view/counters.hbs",
      templates: ["modules/quest-board/templates/track/view/battery.hbs"],
      classes: ["quest-board", "journal-page-content"],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("QUESTBOARD.TRACK.EDIT.TITLE", { name: this.document.name });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const prepCounter = id => {
      const counter = foundry.utils.deepClone(this.document.system._source.counters[id]);
      const ctx = { id };
      for (const name of ["name", "description", "config.max", "config.value"]) {
        const field = this.document.system.schema.getField(`counters.element.${name}`);
        const value = foundry.utils.getProperty(counter, name);
        foundry.utils.setProperty(ctx, name, {
          field, value, name: `system.counters.${id}.${name}`,
        });
      }
      ctx.config.value.value = Math.clamp(ctx.config.value.value, 0, ctx.config.max.value ?? 20) || null;
      return ctx;
    };

    Object.assign(context.ctx, {
      counters: Object.keys(this.document.system.counters).map(prepCounter),
    });

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContentContext(context, options) {
    const counters = [];
    for (const [id, v] of Object.entries(this.document.system.counters)) {
      const data = {
        id, ...v,
        text: await foundry.applications.ux.TextEditor.enrichHTML(v.description, {
          rollData: this.document.getRollData(),
          relativeTo: this.document,
        }),
      };
      data.value = Math.clamp(data.config.value, 0, data.config.max) || null;
      data.bars = [];
      for (let i = 0; i < v.config.max; i++) {
        data.bars.push({ filled: i < v.config.value });
      }
      counters.push(data);
    }
    Object.assign(context, { counters });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _attachPartListeners(partId, element, options) {
    super._attachPartListeners(partId, element, options);

    switch (partId) {
      case "counters":
        if (this.isView) this.#attachViewListeners(element, options);
        break;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Attach listeners to the `counters` part in view mode.
   * @param {HTMLElement} element   The injected element.
   * @param {object} options        Rendering options.
   */
  #attachViewListeners(element, options) {
    const isOwner = this.document.isOwner;

    for (const input of element.querySelectorAll(".battery input")) {
      if (isOwner) input.addEventListener("change", TrackPageSheet.#onChangeBarInput.bind(this));
      else input.disabled = true;
    }

    if (!isOwner) return;
    for (const bar of element.querySelectorAll(".battery .bars .bar")) {
      bar.addEventListener("click", TrackPageSheet.#onClickBar.bind(this));
    }
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Configure a specific counter in a separate application.
   * @this {TrackPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #configureCounter(event, target) {
    new QUESTBOARD.applications.apps.TrackCounterConfig({
      document: this.document,
      counterId: target.closest("[data-counter-id]").dataset.counterId,
    }).render({ force: true });
  }

  /* -------------------------------------------------- */

  /**
   * Create a new counter on the page.
   * @this {TrackPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #createCounter(event, target) {
    this.document.system.createCounter();
  }

  /* -------------------------------------------------- */

  /**
   * Delete a counter from the page.
   * @this {TrackPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #deleteCounter(event, target) {
    const id = target.closest("[data-counter-id]").dataset.counterId;
    this.document.system.deleteCounters([id]);
  }

  /* -------------------------------------------------- */

  /**
   * In view mode, update the counter when clicking a bar.
   * @this {TrackPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   */
  static #onClickBar(event) {
    const target = event.currentTarget;
    const idx = Number(target.dataset.idx);
    const id = target.closest("[data-counter-id]").dataset.counterId;
    this.document.update({ [ `system.counters.${id}.config.value`]: idx + !target.classList.contains("filled") });
  }

  /* -------------------------------------------------- */

  /**
   * In view mode, update the counter when changing the input.
   * @this {TrackPageSheet}
   * @param {ChangeEvent} event   Initiating change event.
   */
  static #onChangeBarInput(event) {
    const id = event.currentTarget.closest("[data-counter-id]").dataset.counterId;
    this.document.update({ [ `system.counters.${id}.config.value`]: event.currentTarget.value });
  }
}
