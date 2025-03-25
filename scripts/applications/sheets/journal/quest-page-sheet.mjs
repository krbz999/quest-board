import AbstractPageSheet from "./abstract-page-sheet.mjs";

export default class QuestPageSheet extends AbstractPageSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    viewClasses: ["quest"],
    actions: {
      addObjective: QuestPageSheet.#addObjective,
      addObjectiveNested: QuestPageSheet.#addObjectiveNested,
      removeObjective: QuestPageSheet.#removeObjective,
      removeObjectiveNested: QuestPageSheet.#removeObjectiveNested,
      deleteReward: QuestPageSheet.#deleteReward,
      grantRewards: QuestPageSheet.#grantRewards,
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
      labelPrefix: "QUESTBOARD.QUEST.EDIT.TABS",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static EDIT_PARTS = {
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    configuration: {
      template: "modules/quest-board/templates/quest/edit/configuration.hbs",
      templates: ["modules/quest-board/templates/shared/edit/basics.hbs"],
      classes: ["scrollable", "tab"],
      scrollable: [""],
    },
    details: {
      template: "modules/quest-board/templates/quest/edit/details.hbs",
      classes: ["tab"],
    },
    notes: {
      template: "modules/quest-board/templates/quest/edit/notes.hbs",
      classes: ["tab"],
    },
    rewards: {
      template: "modules/quest-board/templates/quest/edit/rewards.hbs",
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
      template: "modules/quest-board/templates/quest/view/header.hbs",
      classes: ["quest-board"],
    },
    public: {
      template: "modules/quest-board/templates/quest/view/public.hbs",
      classes: ["quest-board"],
    },
    objectives: {
      template: "modules/quest-board/templates/quest/view/objectives.hbs",
      classes: ["quest-board"],
    },
    private: {
      template: "modules/quest-board/templates/quest/view/private.hbs",
      classes: ["quest-board"],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("QUESTBOARD.QUEST.EDIT.TITLE", { name: this.document.name });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    Object.assign(context.fields, {
      type: this._prepareField("system.type"),
      public: this._prepareField("text.content"),
      private: this._prepareField("system.description.private"),
      complete: this._prepareField("system.complete"),
    });

    const _options = { relativeTo: this.document };
    context.fields.public.enriched = await TextEditor.enrichHTML(context.fields.public.value, _options);
    context.fields.public.hint = game.i18n.localize("QUESTBOARD.QUEST.EDIT.HINTS.content");
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

    const canUpdate = this.document.canUserModify(game.user, "update");
    context.objectives = Object.entries(this.document.system.objectives).map(([k, v]) => {
      return {
        ...v,
        id: k,
        disabled: !canUpdate || !!Object.keys(v.objectives).length,
        objectives: Object.entries(v.objectives).map(([k, v]) => {
          return {
            ...v,
            id: k,
            disabled: !canUpdate,
          };
        }) };
    });

    context.questType = QUESTBOARD.config.QUEST_TYPES[this.document.system.type].label;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.getDragEventData(event);
    if (data.type !== "Item") {
      ui.notifications.error("QUESTBOARD.QUEST.EDIT.WARNING.onlyItems", { localize: true });
      return;
    }
    if (!data.uuid.startsWith("Compendium.")) {
      ui.notifications.error("QUESTBOARD.QUEST.EDIT.WARNING.onlyPack", { localize: true });
      return;
    }
    this.document.system.addReward(data.uuid);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _attachPartListeners(partId, element, options) {
    super._attachPartListeners(partId, element, options);

    if (partId === "objectives") {
      if (!this.document.canUserModify(game.user, "update")) return;
      for (const checkbox of element.querySelectorAll(".objectives dnd5e-checkbox[data-id]")) {
        checkbox.addEventListener("change", QuestPageSheet.#toggleObjective.bind(this));
      }
    }
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Add a top-level objective.
   * @this {QuestPageSheet}
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
   * @this {QuestPageSheet}
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
   * @this {QuestPageSheet}
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
   * @this {QuestPageSheet}
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
   * @this {QuestPageSheet}
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
   * @this {QuestPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #grantRewards(event, target) {
    this.document.system.grantRewardsDialog();
  }

  /* -------------------------------------------------- */

  /**
   * Toggle an objective from the journal sheet.
   * @param {Event} event   The initiating change event.
   */
  static #toggleObjective(event) {
    const target = event.currentTarget;
    const id = target.dataset.id;
    const parentId = target.dataset.parentId;
    const name = [
      "system.objectives",
      parentId ? `${parentId}.objectives` : null,
      id,
      "checked",
    ].filterJoin(".");
    this.document.update({ [name]: target.checked });
  }
}
