const { HandlebarsApplicationMixin, Application } = foundry.applications.api;

export default class QuestObjectiveConfig extends HandlebarsApplicationMixin(Application) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "{id}",
    classes: ["quest-board"],
    document: null,
    objectivePath: null,
    tag: "form",
    window: {
      icon: "fa-solid fa-list-check",
      contentClasses: ["standard-form"],
    },
    position: {
      width: 500,
      height: "auto",
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
      handler: QuestObjectiveConfig.#onSubmit,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "modules/quest-board/templates/apps/quest-objective-config/form.hbs",
      classes: ["standard-form"],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("QUESTBOARD.OBJECTIVE.TITLE", {
      id: this.options.objectivePath.split(".").at(-1),
    });
  }

  /* -------------------------------------------------- */

  /**
   * The objective object.
   * @type {object}
   */
  get objective() {
    const path = this.options.objectivePath;
    return foundry.utils.getProperty(this.document, path);
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
    if (!this.objective) {
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
    opts.uniqueId = `${options.document.uuid.replaceAll(".", "-")}-${options.objectivePath.replaceAll(".", "-")}`;
    return opts;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const source = foundry.utils.getProperty(this.document, this.options.objectivePath);
    const objective = this.objective;
    const path = (this.options.objectivePath.split(".").length <= 3)
      ? "system.objectives.element"
      : "system.objectives.element.objectives.element";

    const makeField = name => {
      return {
        name,
        field: this.document.system.schema.getField(path.slice(7) + "." + name),
        value: foundry.utils.getProperty(source, name),
        // TODO: remove this once element can be localized properly
        // TODO: this also adds the placeholder for 'text'
        ...foundry.utils.getProperty(game.i18n.translations, ["QUESTBOARD.QUEST.FIELDS", path.slice(7), name].join(".")),
      };
    };

    Object.assign(context, {
      disableChecked: !foundry.utils.isEmpty(objective.objectives),
      showOptional: !objective.objectives,
      fields: {
        text: makeField("text"),
        sort: makeField("sort"),
        checked: makeField("checked"),
        optional: makeField("optional"),
      },
    });

    return context;
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle form submission.
   * @this {QuestObjectiveConfig}
   * @param {SubmitEvent} event           The initiating submit event.
   * @param {HTMLFormElement} form        The form element.
   * @param {FormDataExtended} formData   The form data.
   */
  static #onSubmit(event, form, formData) {
    if (!this.objective) return;
    formData = foundry.utils.expandObject(formData.object);
    this.document.update({ [this.options.objectivePath]: formData });
  }
}
