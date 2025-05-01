const { HandlebarsApplicationMixin, Application } = foundry.applications.api;

export default class TrackCounterConfig extends HandlebarsApplicationMixin(Application) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "{id}",
    classes: ["quest-board"],
    document: null,
    counterId: null,
    tag: "form",
    window: {
      icon: "fa-solid fa-chart-gantt",
      contentClasses: ["standard-form"],
    },
    position: {
      width: 500,
      height: "auto",
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
      handler: TrackCounterConfig.#onSubmit,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "modules/quest-board/templates/apps/track-counter-config/form.hbs",
      classes: ["standard-form"],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("QUESTBOARD.COUNTER.TITLE", { id: this.options.counterId });
  }

  /* -------------------------------------------------- */

  /**
   * The counter object.
   * @type {object}
   */
  get counter() {
    return this.document.system.counters[this.options.counterId];
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

  /** @inheritdoc */
  _canRender(options) {
    if (!this.counter) {
      if (this.rendered) this.close();
      return false;
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.document.apps[this.id] = this;
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
    opts.uniqueId = `${options.document.uuid.replaceAll(".", "-")}-Counter-${options.counterId}`;
    return opts;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const counter = this.document.system._source.counters[this.options.counterId];
    Object.assign(context, {
      name: {
        field: this.document.system.schema.getField("counters.element.name"),
        value: counter.name,
      },
      description: {
        field: this.document.system.schema.getField("counters.element.description"),
        value: counter.description,
        enriched: await foundry.applications.ux.TextEditor.enrichHTML(counter.description, {
          rollData: this.document.getRollData(), relativeTo: this.document,
        }),
      },
      value: {
        field: this.document.system.schema.getField("counters.element.config.value"),
        value: Math.clamp(counter.config.value, 0, counter.config.max ?? 20) || null,
      },
      max: {
        field: this.document.system.schema.getField("counters.element.config.max"),
        value: counter.config.max,
      },
    });
    return context;
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle form submission.
   * @this {TrackCounterConfig}
   * @param {SubmitEvent} event           The initiating submit event.
   * @param {HTMLFormElement} form        The form element.
   * @param {FormDataExtended} formData   The form data.
   */
  static #onSubmit(event, form, formData) {
    if (!this.counter) return;
    formData = foundry.utils.expandObject(formData.object);
    this.document.update({ [`system.counters.${this.options.counterId}`]: formData });
  }
}
