export default class AbstractPageSheet extends foundry.applications.sheets.journal.JournalEntryPageHandlebarsSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["quest-board"],
    viewClasses: ["quest-board"],
    includeTOC: false,
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

  /** @inheritdoc */
  async _prepareContext(options) {
    return {
      isGM: game.user.isGM,
      rootId: this.document.uuid,
      page: this.document,
      fields: this.document.schema.fields,
      systemFields: this.document.system.schema.fields,
      source: this.document._source,
      tabs: this._prepareTabs("primary"),
      ctx: {
        category: {
          label: game.i18n.localize("JOURNALENTRYPAGE.Category"),
          options: [{
            value: "",
            label: game.i18n.localize("JOURNAL.Uncategorized"),
          }].concat(
            this.document.parent.categories.contents.sort(foundry.utils.getDocumentClass("JournalEntry").sortCategories)
              .map(c => ({ value: c.id, label: c.name })),
          ),
        },
        titleLevel: {
          label: game.i18n.localize("JOURNALENTRYPAGE.HeadingLevel"),
          options: this._prepareHeadingLevels(),
        },
      },
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    new foundry.applications.ux.DragDrop.implementation({
      dropSelector: ".drop-area",
      callbacks: {
        drop: this._onDrop.bind(this),
      },
      permissions: {},
    }).bind(this.element);

    // new Promise(r => setTimeout(r, 200)).then(() => this.element.classList.remove("dnd5e2"));
  }

  /* -------------------------------------------------- */

  /**
   * Handle drop events.
   * @param {Event} event   The initiating drop event.
   */
  _onDrop(event) {}
}
