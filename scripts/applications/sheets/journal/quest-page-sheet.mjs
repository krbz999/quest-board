import AbstractPageSheet from "../../api/abstract-page-sheet.mjs";

export default class QuestPageSheet extends AbstractPageSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    viewClasses: ["quest-page"],
    window: {
      icon: "fa-solid fa-fw fa-award",
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
      classes: ["tab", "prose"],
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

    Object.assign(context.ctx, {
      enriched: {
        public: await foundry.applications.ux.TextEditor.enrichHTML(this.document.text.content, { relativeTo: this.document }),
      },
      objectives: {
        fields: {
          checked: this.document.system.schema.getField("objectives.element.checked"),
          text: this.document.system.schema.getField("objectives.element.text"),
          textPlaceholder: game.i18n.localize("QUESTBOARD.QUEST.FIELDS.objectives.element.text.placeholder"),
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
      },
    });

    const currency = this.document.system.currencyRewards;
    const itemRewards = [];
    for (const r of this.document.system.rewards.items) {
      const item = await r.item;
      if (!item) continue;
      itemRewards.push({ item, quantity: r.quantity ?? item.system.quantity });
    }

    // Currencies
    context.ctx.currencies = [];
    for (const [k, v] of Object.entries(CONFIG.DND5E.currencies)) {
      context.ctx.currencies.push({
        field: this.document.system.schema.getField("rewards.currency.element"),
        name: `system.rewards.currency.${k}`,
        value: currency[k] ?? null,
        placeholder: v.label,
      });
    }

    context.ctx.items = [];
    for (const reward of this.document.system.rewards.items) {
      const ctx = await reward.prepareEntryData();
      if (!ctx) continue;
      const ph = ctx.item.system.quantity;
      context.ctx.items.push({
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
    if (!game.user.isGM) delete parts.rewards;
    return parts;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _prepareTabs(group) {
    const tabs = super._prepareTabs(group);
    if (!game.user.isGM) delete tabs.rewards;
    return tabs;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContentContext(context, options) {
    const page = this.document;
    const enrichOptions = { relativeTo: page };

    const ctx = context.ctx = { enriched: {} };

    if (page.text.content) {
      ctx.enriched.public = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        page.text.content, enrichOptions,
      );
    }

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
        }).sort((a, b) => a.sort - b.sort),
      };
    }).sort((a, b) => a.sort - b.sort);

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

    const application = new QUESTBOARD.applications.apps.QuestObjectiveConfig({
      document: this.document,
      objectivePath: path,
    });
    application.render({ force: true });
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
