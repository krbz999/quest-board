export default class QuestPageEditor extends foundry.applications.sheets.journal.JournalEntryPageHandlebarsSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["quest-board"],
    includeTOC: true,
    position: {
      width: 550,
      height: "auto",
    },
    window: {
      contentClasses: ["standard-form"],
      resizable: false,
    },
    form: {
      closeOnSubmit: false,
    },
    actions: {
      addObjective: QuestPageEditor.#addObjective,
      addObjectiveNested: QuestPageEditor.#addObjectiveNested,
      removeObjective: QuestPageEditor.#removeObjective,
      removeObjectiveNested: QuestPageEditor.#removeObjectiveNested,
      deleteReward: QuestPageEditor.#deleteReward,
      grantRewards: QuestPageEditor.#grantRewards,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "configuration", icon: "fa-solid fa-gears" },
        { id: "details", icon: "fa-solid fa-comment" },
        { id: "notes", icon: "fa-solid fa-eye-slash" },
        { id: "rewards", icon: "fa-solid fa-gem" },
      ],
      initial: "configuration",
      labelPrefix: "QUESTBOARD.SHEET.TABS",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static EDIT_PARTS = {
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    configuration: {
      template: "modules/quest-board/templates/editor/configuration.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
    details: {
      template: "modules/quest-board/templates/editor/details.hbs",
    },
    notes: {
      template: "modules/quest-board/templates/editor/notes.hbs",
    },
    rewards: {
      template: "modules/quest-board/templates/editor/rewards.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static VIEW_PARTS = {
    content: {
      template: "modules/quest-board/templates/page-view.hbs",
      root: true,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("QUESTBOARD.SHEET.TITLE", { name: this.document.name });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const prepareField = path => {
      const field = path.startsWith("system.")
        ? this.document.system.schema.getField(path.slice(7))
        : this.document.schema.getField(path);
      const value = foundry.utils.getProperty(this.document, path);
      return { field, value };
    };

    Object.assign(context, {
      isGM: game.user.isGM,
      page: this.document,
      rootId: this.document.uuid,
      fields: {
        name: prepareField("name"),
        type: prepareField("system.type"),
        public: prepareField("text.content"),
        private: prepareField("system.description.private"),
        complete: prepareField("system.complete"),
      },
    });

    const _options = { relativeTo: this.document };
    context.fields.public.enriched = await TextEditor.enrichHTML(context.fields.public.value, _options);
    context.fields.public.hint = game.i18n.localize("QUESTBOARD.SHEET.HINTS.content");
    context.fields.private.enriched = await TextEditor.enrichHTML(context.fields.private.value, _options);

    context.objectives = {
      fields: {
        checked: this.document.system.schema.getField("objectives.element.checked"),
        label: this.document.system.schema.getField("objectives.element.label"),
        sort: this.document.system.schema.getField("objectives.element.sort"),
      },
      objectives: Object.entries(this.document.system.objectives).map(([k, v]) => {
        return {
          ...v,
          id: k,
          prefix: `system.objectives.${k}.`,
          objectives: Object.entries(v.objectives).map(([u, w]) => {
            return {
              ...w,
              id: u,
              parent: k,
              prefix: `system.objectives.${k}.objectives.${u}.`,
            };
          }),
        };
      }),
    };

    const rewards = await this.document.system.retrieveRewards();

    // Currencies
    context.currencies = [];
    for (const [k, v] of Object.entries(CONFIG.DND5E.currencies)) {
      context.currencies.push({
        field: this.document.system.schema.getField("rewards.currency.element"),
        name: `system.rewards.currency.${k}`,
        value: rewards.currency[k] ?? null,
        placeholder: v.label,
      });
    }

    context.items = [];
    for (const item of rewards.items) {
      context.items.push({
        item,
        hasQuantity: item.system.schema.has("quantity") && (item.type !== "container"),
      });
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    this.#removeGMOnlyTabs(parts);
    return parts;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _prepareTabs(group) {
    const tabs = super._prepareTabs(group);
    this.#removeGMOnlyTabs(tabs);
    return tabs;
  }

  /* -------------------------------------------------- */

  /**
   * Remove any properties that should be present only for game masters.
   * @param {object} object     The main object. **will be mutated**
   */
  #removeGMOnlyTabs(object) {
    if (!game.user.isGM) {
      delete object.notes;
      delete object.rewards;
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContentContext(context, options) {
    const enrichOptions = {
      relativeTo: this.document,
    };

    context.fields = {
      public: {
        enriched: await TextEditor.enrichHTML(this.document.text.content, enrichOptions),
      },
      private: {
        enriched: this.document.isOwner
          ? await TextEditor.enrichHTML(this.document.system.description.private, enrichOptions)
          : null,
      },
    };

    context.objectives = Object.entries(this.document.system.objectives).map(([k, v]) => {
      return { id: k, ...v, objectives: Object.entries(v.objectives).map(([k, v]) => {
        return { id: k, ...v };
      }) };
    });

    context.questType = QUESTBOARD.config.QUEST_TYPES[this.document.system.type].label;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onRender(...args) {
    super._onRender(...args);

    new DragDrop({
      dropSelector: ".reward-items",
      callbacks: {
        drop: event => {
          const data = TextEditor.getDragEventData(event);
          if (data.type !== "Item") {
            ui.notifications.error("Only items!");
            return;
          }
          if (!data.uuid.startsWith("Compendium.")) {
            ui.notifications.error("Not a pack item!");
            return;
          }
          this.document.system.addReward(data.uuid);
        },
      },
      permissions: {},
    }).bind(this.element);
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Add a top-level objective.
   * @this {QuestPageEditor}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #addObjective(event, target) {
    const id = foundry.utils.randomID();
    this.document.update({ [`system.objectives.${id}.label`]: "" });
  }

  /* -------------------------------------------------- */

  /**
   * Add a second-level objective.
   * @this {QuestPageEditor}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #addObjectiveNested(event, target) {
    const id = target.dataset.objective;
    const nested = foundry.utils.randomID();
    this.document.update({ [`system.objectives.${id}.objectives.${nested}.label`]: "" });
  }

  /* -------------------------------------------------- */

  /**
   * Remove a top-level objective.
   * @this {QuestPageEditor}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #removeObjective(event, target) {
    const id = target.dataset.objective;
    this.document.update({ [`system.objectives.-=${id}`]: null });
  }

  /* -------------------------------------------------- */

  /**
   * Remove a second-level objective.
   * @this {QuestPageEditor}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #removeObjectiveNested(event, target) {
    const id = target.dataset.objective;
    const nested = target.dataset.nested;
    this.document.update({ [`system.objectives.${id}.objectives.-=${nested}`]: null });
  }

  /* -------------------------------------------------- */

  /**
   * Remove an item reward.
   * @this {QuestPageEditor}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #deleteReward(event, target) {
    const uuid = target.dataset.uuid;
    this.document.system.removeReward(uuid);
  }

  /* -------------------------------------------------- */

  /**
   * Grant financial and material rewards.
   * @this {QuestPageEditor}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #grantRewards(event, target) {
    this.document.system.grantRewardsDialog();
  }
}
