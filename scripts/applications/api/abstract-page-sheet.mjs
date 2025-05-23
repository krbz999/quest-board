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

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _preSyncPartState(partId, newElement, priorElement, state) {
    super._preSyncPartState(partId, newElement, priorElement, state);
    if (state.focus) return;
    const focused = priorElement.querySelector(":focus");
    if (!focused) return;
    if (focused.parentElement.tagName === "STRING-TAGS") {
      state.focus = [focused.parentElement.name, focused.tagName, partId].join(":");
      state.focusSpc = true;
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _syncPartState(partId, newElement, priorElement, state) {
    if (state.focusSpc) {
      const [focus, tagName, _partId] = state.focus.split(":");
      if (_partId === partId) {
        newElement.querySelector(`string-tags[name="${focus}"] > ${tagName}`).focus();
        delete state.focus;
      }
    }
    super._syncPartState(partId, newElement, priorElement, state);
  }
}
