/** @import * as TYPES from "../../../types.mjs" */

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
   * @returns {TYPES.FieldContext}
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
        name: this._prepareField("name"),
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
  _onRender(context, options) {
    super._onRender(context, options);

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
