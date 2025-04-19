export default class AbstractPageSheet extends foundry.applications.sheets.journal.JournalEntryPageHandlebarsSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["quest-board"],
    viewClasses: ["quest-board"],
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
  };

  /* -------------------------------------------------- */

  /**
   * Configure basic data for the form group.
   * @param {string} path   The path to the field.
   * @returns {import("../../types.mjs").FieldContext}
   */
  _prepareField(path) {
    const field = path.startsWith("system.")
      ? this.document.system.schema.getField(path.slice(7))
      : this.document.schema.getField(path);
    return {
      field,
      value: foundry.utils.getProperty(this.document, path),
      source: foundry.utils.getProperty(this.document._source, path),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return Object.assign(context, {
      isGM: game.user.isGM,
      rootId: this.document.uuid,
      fields: {
        // TODO: remove label once https://github.com/foundryvtt/foundryvtt/issues/12272 is resolved
        name: { ...this._prepareField("name"), label: "Name" },
        titleLevel: {
          ...this._prepareField("title.level"),
          label: game.i18n.localize("JOURNALENTRYPAGE.HeadingLevel"),
          options: this._prepareHeadingLevels(),
        },
        category: {
          ...this._prepareField("category"),
          label: game.i18n.localize("JOURNALENTRYPAGE.Category"),
          options: [{
            value: "",
            label: game.i18n.localize("JOURNAL.Uncategorized"),
          }].concat(
            this.document.parent.categories.contents.sort(foundry.utils.getDocumentClass("JournalEntry").sortCategories)
              .map(c => ({ value: c.id, label: c.name })),
          ),
        },
      },
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    new foundry.applications.ux.DragDrop({
      dropSelector: ".drop-area",
      callbacks: {
        drop: this._onDrop.bind(this),
      },
      permissions: {},
    }).bind(this.element);
  }

  /* -------------------------------------------------- */

  /**
   * Handle drop events.
   * @param {Event} event   The initiating drop event.
   */
  _onDrop(event) {}
}
