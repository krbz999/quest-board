const {
  BooleanField, HTMLField, NumberField, SchemaField, StringField, TypedObjectField,
} = foundry.data.fields;

/* -------------------------------------------------- */

/**
 * The quest page data model.
 * @extends {TypeDataModel}
 */
export default class QuestData extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      complete: new BooleanField(),
      type: new StringField({
        required: true,
        initial: "major",
        choices: () => QUESTBOARD.config.QUEST_TYPES,
      }),
      description: new SchemaField({
        private: new HTMLField(),
      }),
      rewards: new SchemaField({
        items: new QUESTBOARD.data.fields.CollectionField(QUESTBOARD.data.RewardItem),
        currency: new TypedObjectField(new NumberField({ min: 0, nullable: true, integer: true })),
      }),
      objectives: new QUESTBOARD.data.fields.ObjectiveField({
        objectives: new QUESTBOARD.data.fields.ObjectiveField({
          optional: new BooleanField(),
        }),
      }),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Set checked state of top-level objectives.
    for (const [k, v] of Object.entries(this.objectives)) {
      const nested = Object.values(v.objectives);
      if (!nested.length) continue;
      v.checked = nested.every(n => n.checked || n.optional);
    }

    // Remove invalid currencies.
    for (const [k, v] of Object.entries(this.rewards.currency)) {
      if (!(k in CONFIG.DND5E.currencies)) delete this.rewards.currency[k];
    }
  }

  /* -------------------------------------------------- */

  /**
   * Does this quest have any item rewards?
   * @type {boolean}
   */
  get hasItemRewards() {
    return this.rewards.items.some(r => r.isValidReward);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["QUESTBOARD.QUEST"];

  /* -------------------------------------------------- */

  /**
   * Prepared currency rewards.
   * @returns {object}
   */
  get currencyRewards() {
    const keys = Object.keys(CONFIG.DND5E.currencies);
    return Object.entries(this.rewards.currency).reduce((acc, [k, v]) => {
      if (keys.includes(k) && (v > 0)) acc[k] = v;
      return acc;
    }, {});
  }

  /* -------------------------------------------------- */

  /**
   * Create a dialog to confirm and configure the granting of rewards from this quest.
   * @returns {Promise<Actor5e|null>}   A promise that resolves to the receiving actor.
   */
  async grantRewardsDialog() {
    const id = `${this.parent.uuid.replaceAll(".", "-")}-grant-rewards-dialog`;
    if (foundry.applications.instances.get(id)) throw new Error("Already a grant in progress.");

    if (!this.hasItemRewards && foundry.utils.isEmpty(this.currencyRewards)) {
      ui.notifications.warn("QUESTBOARD.REWARD.WARNING.rewards", { localize: true });
      return null;
    }

    const hint = `<p>${game.i18n.format("QUESTBOARD.REWARD.DIALOG.content", {
      name: this.parent.name,
    })}</p>`;

    const party = game.settings.get("dnd5e", "primaryParty")?.actor;

    const actorField = foundry.applications.fields.createFormGroup({
      label: game.i18n.localize("QUESTBOARD.REWARD.DIALOG.ACTOR.label"),
      hint: game.i18n.localize("QUESTBOARD.REWARD.DIALOG.ACTOR.hint"),
      input: foundry.applications.fields.createSelectInput({
        required: true,
        name: "actor",
        value: party?.id,
        blank: false,
        options: Array.from(
          new Set([party, ...game.users.map(user => user.character)].filter(_ => _)),
        ).map(actor => ({ value: actor.id, label: actor.name, disabled: !actor.isOwner })),
      }),
    }).outerHTML;

    const result = await foundry.applications.api.Dialog.input({
      id: id,
      content: [hint, "<fieldset>", actorField, "</fieldset>"].join(""),
      window: {
        icon: "fa-solid fa-award",
        title: "QUESTBOARD.REWARD.DIALOG.title",
      },
      position: {
        width: 400,
      },
    });

    const actor = game.actors.get(result?.actor);
    if (!actor) return null;
    return this.grantRewards({ ...result, actor });
  }

  /* -------------------------------------------------- */

  /**
   * Grant the rewards of this quest to an actor, defaulting to the primary party.
   * @param {object} [options]              Reward options.
   * @param {Actor5e} [options.actor]       The actor receive the rewards, falling back to the primary party.
   * @param {boolean} [options.complete]    Should the quest be marked as completed?
   * @returns {Promise<Actor5e|null>}       A promise that resolves to the receiving actor.
   */
  async grantRewards({ actor = null, complete = true } = {}) {
    // Grant to given actor.
    if (actor && !actor.isOwner) {
      ui.notifications.error("QUESTBOARD.REWARD.WARNING.actor", { localize: true });
      return null;
    }

    // Fall back to party actor.
    if (!actor) actor = game.settings.get("dnd5e", "primaryParty")?.actor;
    if (!actor) {
      ui.notifications.error("QUESTBOARD.REWARD.WARNING.party", { localize: true });
      return null;
    }

    // Warn about lack of ownership of the party actor.
    if (!actor.isOwner) {
      ui.notifications.error("QUESTBOARD.REWARD.WARNING.actor", { localize: true });
      return null;
    }

    // TODO: Use CONFIG.queries to award the rewards.

    const configs = [];
    for (const reward of this.rewards.items) {
      const data = await reward.prepareEntryData();
      if (!data) continue;
      const { item, quantity } = data;
      configs.push({ item, quantity });
    }
    const { itemData, itemUpdates } = await QUESTBOARD.utils.batchCreateItems(actor, configs);
    const currencyUpdate = {};
    const keys = Object.keys(CONFIG.DND5E.currencies);
    for (const [k, v] of Object.entries(this.rewards.currency)) {
      if (keys.includes(k) && (v > 0)) {
        currencyUpdate[`system.currency.${k}`] = actor.system.currency[k] + v;
      }
    }

    // Perform changes.
    const [, created] = await Promise.all([
      actor.update(currencyUpdate),
      actor.createEmbeddedDocuments("Item", itemData, { keepId: true }),
      actor.updateEmbeddedDocuments("Item", itemUpdates),
    ]);

    if (complete) {
      await this.parent.update({ "system.complete": true });
    }

    const content = await this.#prepareRewardsMessage(actor, { created, itemData, itemUpdates, currencyUpdate });
    if (content) foundry.utils.getDocumentClass("ChatMessage").create({ content: content });

    return actor;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare the contents of the chat message when rewarding quest rewards.
   * @param {Actor5e} actor       The actor receiving rewards.
   * @param {object} changes      The created items, item creation data, update data, and currency update data.
   * @returns {Promise<string>}   A promise that resolves to a (possibly empty) string.
   */
  async #prepareRewardsMessage(actor, changes) {
    const contents = [];

    contents.push(`<p>${game.i18n.format("QUESTBOARD.REWARD.MESSAGE.CONTENT.completed", {
      name: this.parent.name,
    })}</p>`);

    const currency = this.currencyRewards;
    if (changes.created.length || changes.itemUpdates.length || !foundry.utils.isEmpty(currency)) {
      contents.push(
        "<h4>Rewards</h4>",
        `<p>${game.i18n.format("QUESTBOARD.REWARD.MESSAGE.CONTENT.rewarded", {
          name: actor.name,
        })}</p>`,
      );
    }

    if (!foundry.utils.isEmpty(currency)) {
      const content = [];
      for (const [k, v] of Object.entries(currency)) {
        content.push(`${v} <i class="currency ${k}"></i>`);
      }
      contents.push("<p class='dnd5e2'>" + content.join(", ") + "</p>");
    }

    if (changes.created.length || changes.itemUpdates.length) {
      contents.push("<ul>");
      for (const item of changes.created) {
        if (item.system.container) continue; // Ignore items in containers.
        const qty = item.system.quantity;
        contents.push(`<li>${qty > 1 ? `${qty} &times; ` : ""}${item.link}</li>`);
      }
      for (const { _id, delta } of changes.itemUpdates) {
        const item = actor.items.get(_id);
        contents.push(`<li>${delta > 1 ? `${delta} &times; ` : ""}${item.link}</li>`);
      }
      contents.push("</ul>");
    }

    return contents.join("");
  }

  /* -------------------------------------------------- */

  /**
   * Add a reward item by uuid.
   * @param {string} uuid                   The uuid of the item.
   * @returns {Promise<JournalEntryPage>}   A promise that resolves to the updated page.
   */
  async addReward(uuid) {
    const item = await fromUuid(uuid);
    if (!QUESTBOARD.data.RewardItem.ALLOWED_ITEM_TYPES.has(item.type)) {
      ui.notifications.error("QUESTBOARD.QUEST.EDIT.HINTS.invalidItemType", { format: { type: item.type } });
      return;
    }
    const reward = this.rewards.items.find(r => r.uuid === uuid);
    if (reward) {
      const data = await reward.prepareEntryData();
      return reward.update({ quantity: data.quantity + item.system._source.quantity });
    } else {
      return QUESTBOARD.data.RewardItem.create({ uuid }, { parent: this.parent });
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async toEmbed(config, options = {}) {
    const sheet = new QUESTBOARD.applications.sheets.journal.QuestPageSheet({
      document: this.parent,
      mode: "view",
    });

    sheet._configureRenderOptions(options);
    const context = await sheet._prepareContext(options);
    const element = await sheet._renderFrame(options);
    const content = element.querySelector(".window-content");
    const result = await sheet._renderHTML(context, options);
    sheet._replaceHTML(result, content, options);

    return content.children;
  }

  /* -------------------------------------------------- */

  /**
   * Add context menu options in a journal entry for awarding and/or completing a quest.
   * @param {Application|ApplicationV2} sheet   The journal entry sheet.
   * @param {object[]} contextOptions           The context options.
   */
  static addContextMenuOptions(sheet, contextOptions) {
    const getPage = li => sheet.document.pages.get(li.dataset.pageId);
    contextOptions.push({
      name: "QUESTBOARD.QUEST.VIEW.CONTEXT.award",
      icon: "<i class='fa-solid fa-fw fa-award'></i>",
      condition: li => game.user.isGM && (getPage(li).type === `${QUESTBOARD.id}.quest`),
      callback: li => getPage(li).system.grantRewardsDialog(),
    }, {
      name: "QUESTBOARD.QUEST.VIEW.CONTEXT.complete",
      icon: "<i class='fa-solid fa-fw fa-circle-check'></i>",
      condition: li => {
        const page = getPage(li);
        return game.user.isGM && (page.type === `${QUESTBOARD.id}.quest`) && !page.system.complete;
      },
      callback: li => getPage(li).update({ "system.complete": true }),
    });
  }
}
