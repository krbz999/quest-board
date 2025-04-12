import AbstractPageSheet from "../../api/abstract-page-sheet.mjs";

export default class QuestPageSheet extends AbstractPageSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    viewClasses: ["quest-page"],
    window: {
      icon: "fa-solid fa-award",
    },
    actions: {
      addObjective: QuestPageSheet.#addObjective,
      addSubobjective: QuestPageSheet.#addSubobjective,
      configureObjective: QuestPageSheet.#configureObjective,
      removeObjective: QuestPageSheet.#removeObjective,
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
        { id: "objectives", icon: "fa-solid fa-list-check" },
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
      classes: ["tab"],
    },
    objectives: {
      template: "modules/quest-board/templates/quest/edit/objectives.hbs",
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
    context.fields.public.enriched = await foundry.applications.ux.TextEditor.enrichHTML(
      context.fields.public.value, _options,
    );
    context.fields.public.hint = game.i18n.localize("QUESTBOARD.QUEST.EDIT.HINTS.content");
    context.fields.private.enriched = await foundry.applications.ux.TextEditor.enrichHTML(
      context.fields.private.value, _options,
    );

    context.objectives = {
      fields: {
        checked: this.document.system.schema.getField("objectives.element.checked"),
        text: this.document.system.schema.getField("objectives.element.text"),
        textPlaceholder: game.i18n.localize("QUESTBOARD.QUEST.FIELDS.objectives.text.placeholder"),
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
          }).sort((a, b) => a.sort - b.sort),
        };
      }).sort((a, b) => a.sort - b.sort),
    };

    const currency = this.document.system.currencyRewards;
    const itemRewards = [];
    for (const r of this.document.system.rewards.items) {
      const item = await r.item;
      if (!item) continue;
      itemRewards.push({ item, quantity: r.quantity ?? item.system.quantity });
    }

    // Currencies
    context.currencies = [];
    for (const [k, v] of Object.entries(CONFIG.DND5E.currencies)) {
      context.currencies.push({
        field: this.document.system.schema.getField("rewards.currency.element"),
        name: `system.rewards.currency.${k}`,
        value: currency[k] ?? null,
        placeholder: v.label,
      });
    }

    context.items = [];
    for (const reward of this.document.system.rewards.items) {
      const ctx = await reward.prepareEntryData();
      if (!ctx) continue;
      const ph = ctx.item.system.quantity;
      context.items.push({
        ctx, reward,
        quantity: {
          value: reward.quantity,
          field: new foundry.data.fields.NumberField({ integer: true, positive: true, nullable: true }),
          name: `system.rewards.items.${reward.id}.quantity`,
          placeholder: ph,
        },
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

    const questType = QUESTBOARD.config.QUEST_TYPES[this.document.system.type];
    context.questType = `${questType.label} ${Array(questType.priority).fill("★").join("")}`;
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
    this.document.update({ [`system.objectives.${id}.text`]: "" });
  }

  /* -------------------------------------------------- */

  /**
   * Add a subobjective.
   * @this {QuestPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #addSubobjective(event, target) {
    const path = [
      "system.objectives",
      target.closest("[data-objective]").dataset.objective,
      "objectives",
      foundry.utils.randomID(),
      "text",
    ].filterJoin(".");
    this.document.update({ [path]: "" });
  }

  /* -------------------------------------------------- */

  /**
   * Configure an existing objective.
   * @this {QuestPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static async #configureObjective(event, target) {
    const { objective: id, parentObjective } = target.closest("[data-objective]").dataset;
    const path = [
      "system.objectives",
      parentObjective ? `${parentObjective}.objectives` : null,
      id,
    ].filterJoin(".");
    const objective = foundry.utils.getProperty(this.document, path);
    const isRoot = !parentObjective;

    const {
      checked, optional, text, sort,
    } = this.document.system.schema.getField(isRoot ? "objectives.element" : "objectives.element.objectives.element").fields;

    const html = [
      text.toFormGroup({
        label: game.i18n.localize("QUESTBOARD.QUEST.FIELDS.objectives.text.label"),
      }, {
        value: objective.text,
        placeholder: game.i18n.localize("QUESTBOARD.QUEST.FIELDS.objectives.text.placeholder"),
      }).outerHTML,
      sort.toFormGroup({
        label: game.i18n.localize("QUESTBOARD.QUEST.FIELDS.objectives.sort.label"),
        hint: "",
      }, { value: objective.sort, placeholder: "0" }).outerHTML,
      checked.toFormGroup({
        label: game.i18n.localize("QUESTBOARD.QUEST.FIELDS.objectives.checked.label"),
      }, { value: objective.checked }).outerHTML,
      optional?.toFormGroup({
        label: game.i18n.localize("QUESTBOARD.QUEST.FIELDS.objectives.optional.label"),
      }, { value: objective.optional }).outerHTML,
    ].filterJoin("");

    const update = await foundry.applications.api.Dialog.input({
      window: {
        title: "QUESTBOARD.QUEST.EDIT.OBJECTIVE_TITLE",
      },
      position: {
        width: 400,
      },
      content: `<fieldset>${html}</fieldset>`,
    });
    if (!update) return;

    this.document.update({ [path]: isRoot
      ? foundry.utils.expandObject(update).system.objectives
      : foundry.utils.expandObject(update).system.objectives.objectives,
    });
  }

  /* -------------------------------------------------- */

  /**
   * Remove an objective.
   * @this {QuestPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #removeObjective(event, target) {
    const { objective, parentObjective } = target.closest("[data-objective]").dataset;
    const path = [
      "system.objectives",
      parentObjective ? `${parentObjective}.objectives` : null,
      `-=${objective}`,
    ].filterJoin(".");
    this.document.update({ [path]: null });
  }

  /* -------------------------------------------------- */

  /**
   * Remove an item reward.
   * @this {QuestPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #deleteReward(event, target) {
    const id = target.closest("[data-reward-id]").dataset.rewardId;
    this.document.system.rewards.items.get(id).delete();
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
