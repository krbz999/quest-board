import ItemRewardsField from "./item-rewards-field.mjs";

const {
  BooleanField, DocumentUUIDField, HTMLField, IntegerSortField,
  NumberField, SchemaField, StringField, TypedObjectField,
} = foundry.data.fields;

const objectiveField = fields => {
  return new TypedObjectField(new SchemaField({
    label: new StringField({ required: true }),
    checked: new BooleanField(),
    sort: new IntegerSortField(),
    ...fields,
  }), { validateKey: key => foundry.data.validators.isValidId(key) });
};

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
        items: new ItemRewardsField(new SchemaField({
          uuid: new DocumentUUIDField({ type: "Item", embedded: false }),
          quantity: new NumberField({ nullable: false, min: 1, integer: true, initial: 1 }),
        })),
        currency: new TypedObjectField(new NumberField({ min: 0, nullable: true, integer: true })),
      }),
      objectives: objectiveField({ objectives: objectiveField() }),
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
      v.checked = nested.every(n => n.checked);
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
    for (const { uuid } of this.rewards.items) {
      try {
        const target = fromUuidSync(uuid);
        if (target) return true;
      } catch (err) {
        // Ignore any errors.
      }
    }
    return false;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["QUESTBOARD.PAGE"];

  /* -------------------------------------------------- */

  /**
   * Retrieve an object of rewards for this quest.
   * @returns {Promise<object>}
   */
  async retrieveRewards() {
    return {
      items: await this.#prepareItemRewards(),
      currency: await this.#prepareCurrencyRewards(),
    };
  }

  /* -------------------------------------------------- */

  /**
   * Prepare the quest reward items.
   * @returns {Promise<Item5e[]>}
   */
  async #prepareItemRewards() {
    const items = [];
    for (const { uuid, quantity } of this.rewards.items) {
      let item = await fromUuid(uuid);
      if (!item) continue;

      const change = {};
      if (item.system.schema.has("quantity") && (item.type !== "container")) {
        change["system.quantity"] = quantity;
      }

      item = item.clone(change, { keepId: true });
      items.push(item);
    }
    return items;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare the currency rewards.
   * @returns {Promise<object>}
   */
  async #prepareCurrencyRewards() {
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

    if (!this.hasItemRewards && foundry.utils.isEmpty(await this.#prepareCurrencyRewards())) {
      ui.notifications.warn("QUESTBOARD.REWARD.WARNING.rewards", { localize: true });
      return null;
    }

    const hint = `<p>${game.i18n.format("QUESTBOARD.REWARD.DIALOG.content", {
      name: this.parent.name,
    })}</p>`;

    const party = game.settings.get("dnd5e", "primaryParty")?.actor;

    const actorField = new StringField({
      required: false,
      label: "QUESTBOARD.REWARD.DIALOG.ACTOR.label",
      hint: "QUESTBOARD.REWARD.DIALOG.ACTOR.hint",
    }).toFormGroup({ localize: true }, {
      name: "actor",
      value: party?.id,
      options: Array.from(new Set([
        party,
        ...game.users.map(user => user.character),
      ].filter(actor => {
        return !!actor && ["character", "group", "npc"].includes(actor.type);
      }))).map(actor => ({ value: actor.id, label: actor.name, disabled: !actor.isOwner })),
    }).outerHTML;

    const confirm = await foundry.applications.api.DialogV2.wait({
      id: id,
      content: [hint, "<fieldset>", actorField, "</fieldset>"].join(""),
      window: {
        icon: "fa-solid fa-award",
        title: "QUESTBOARD.REWARD.DIALOG.title",
      },
      buttons: [{
        default: true,
        callback: (event, button) => new FormDataExtended(button.form).object,
        action: "ok",
        label: "Confirm",
      }],
      position: {
        width: 400,
      },
    });
    if (!confirm) return null;
    return this.grantRewards({
      ...confirm,
      actor: game.actors.get(confirm.actor),
    });
  }

  /* -------------------------------------------------- */

  /**
   * Grant the rewards of this quest to an actor, defaulting to the primary party.
   * @param {Actor5e} [actor]           An actor receive the rewards.
   * @returns {Promise<Actor5e|null>}   A promise that resolves to the receiving actor.
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

    let { items, currency } = await this.#prepareRewardsUpdate(actor);
    [items, currency] = await Promise.all([
      foundry.utils.isEmpty(items) ? null : actor.createEmbeddedDocuments("Item", items),
      foundry.utils.isEmpty(currency) ? null : actor.update(currency),
    ]);

    if (complete) {
      await this.parent.update({ "system.complete": true });
    }

    const content = await this.#prepareRewardsMessage(actor, items);
    if (content) ChatMessage.implementation.create({ content: content });

    return actor;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare the contents of the chat message when rewarding quest rewards.
   * @param {Actor5e} actor       The actor receiving rewards.
   * @param {Item5e[]} [items]    The items that were rewarded.
   * @returns {string}            A (possibly empty) string.
   */
  async #prepareRewardsMessage(actor, items) {
    const contents = [];

    contents.push(`<p>${game.i18n.format("QUESTBOARD.REWARD.MESSAGE.CONTENT.completed", {
      name: this.parent.name,
    })}</p>`);

    const currency = await this.#prepareCurrencyRewards();
    if (items?.length || !foundry.utils.isEmpty(currency)) {
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

    if (items?.length) {
      contents.push("<ul>");
      for (const item of items) {
        const qty = item.system.quantity;
        contents.push(`<li>${qty > 1 ? `${qty} &times; ` : ""}${item.link}</li>`);
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
    const items = [...this.rewards.items];
    const index = items.findIndex(item => item.uuid === uuid);
    if (index === -1) items.push({ uuid, quantity: 1 });
    else items[index] = { uuid, quantity: (items[index].quantity ?? 1) + 1 };
    return this.parent.update({ "system.rewards.items": items });
  }

  /* -------------------------------------------------- */

  /**
   * Remove a reward item.
   * @param {string} uuid                   The uuid of the item.
   * @returns {Promise<JournalEntryPage>}   A promise that resolves to the updated page.
   */
  async removeReward(uuid) {
    const items = this.rewards.items.filter(r => r.uuid !== uuid);
    return this.parent.update({ "system.rewards.items": Array.from(items) });
  }

  /* -------------------------------------------------- */

  /**
   * Prepare rewards from this quest to be added to an actor.
   * @param {Actor5e} actor     The actor receiving the rewards.
   * @returns {Promise<object>}
   */
  async #prepareRewardsUpdate(actor) {
    let { items, currency } = await this.retrieveRewards();
    items = items.map(item => game.items.fromCompendium(item));
    currency = Object.entries(currency).reduce((acc, [k, v]) => {
      const path = `system.currency.${k}`;
      acc[path] = (foundry.utils.getProperty(actor, path) ?? 0) + v;
      return acc;
    }, {});

    return { items, currency };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async toEmbed(config, options = {}) {
    const sheet = new QUESTBOARD.applications.sheets.QuestPageEditor({
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
}
