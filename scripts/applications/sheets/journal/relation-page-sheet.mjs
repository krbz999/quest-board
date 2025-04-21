import AbstractPageSheet from "../../api/abstract-page-sheet.mjs";

export default class RelationPageSheet extends AbstractPageSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    viewClasses: ["relation-page"],
    window: {
      icon: "fa-solid fa-fw fa-circle-user",
    },
    position: {
      height: "auto",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "configuration", icon: "fa-solid fa-gears" },
        { id: "identity", icon: "fa-solid fa-user-tag" },
        { id: "private", icon: "fa-solid fa-user-secret" },
      ],
      initial: "configuration",
      labelPrefix: "QUESTBOARD.RELATION.EDIT.TABS",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static EDIT_PARTS = {
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    configuration: {
      template: "modules/quest-board/templates/relation/edit/configuration.hbs",
      templates: ["modules/quest-board/templates/shared/edit/basics.hbs"],
      classes: ["tab"],
    },
    identity: {
      template: "modules/quest-board/templates/relation/edit/identity.hbs",
      classes: ["tab"],
    },
    private: {
      template: "modules/quest-board/templates/relation/edit/private.hbs",
      classes: ["tab"],
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
      template: "modules/quest-board/templates/relation/view/header.hbs",
      classes: ["quest-board"],
    },
    details: {
      template: "modules/quest-board/templates/relation/view/details.hbs",
      classes: ["quest-board", "two-column"],
    },
    biography: {
      template: "modules/quest-board/templates/relation/view/biography.hbs",
      classes: ["quest-board"],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    if (!game.user.isGM) delete parts.private;
    return parts;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _prepareTabs(group) {
    const tabs = super._prepareTabs(group);
    if (!game.user.isGM) delete parts.private;
    return tabs;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("QUESTBOARD.RELATION.EDIT.TITLE", { name: this.document.name });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch (partId) {
      case "identity":
        await this.#prepareIdentity(context, options);
        break;
      case "private":
        await this.#preparePrivate(context, options);
        break;
    }
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for a particular part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<void>}   A promise that resolves once the context has been mutated.
   */
  async #prepareIdentity(context, options) {
    Object.assign(context, {
      fields: {
        age: {
          birth: {
            day: this._prepareField("system.age.birth.day"),
            year: this._prepareField("system.age.birth.year"),
          },
        },
        avatar: this._prepareField("system.avatar"),
        titles: this._prepareField("system.titles"),
        public: this._prepareField("system.biography.public"),
      },
    });
    context.fields.public.enriched = await foundry.applications.ux.TextEditor.enrichHTML(
      context.fields.public.source,
      { relativeTo: this.document, rollData: this.document.getRollData?.() },
    );
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for a particular part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<void>}   A promise that resolves once the context has been mutated.
   */
  async #preparePrivate(context, options) {
    Object.assign(context, {
      fields: {
        private: this._prepareField("system.biography.private"),
      },
    });
    context.fields.private.enriched = await foundry.applications.ux.TextEditor.enrichHTML(
      context.fields.private.source,
      { relativeTo: this.document, rollData: this.document.getRollData?.() },
    );
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContentContext(context, options) {
    const titles = Array.from(this.document.system.titles).join(", ");
    const avatar = this.document.system.avatar || "icons/svg/mystery-man.svg";

    const enrichOptions = { relativeTo: this.document, rollData: this.document.getRollData?.() };
    Object.assign(context, {
      titles, avatar,
      date: this.document.system.age.label,
      isGM: game.user.isGM,
      public: await foundry.applications.ux.TextEditor.enrichHTML(this.document.system.biography.public, enrichOptions),
      private: await foundry.applications.ux.TextEditor.enrichHTML(this.document.system.biography.private, enrichOptions),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _attachPartListeners(partId, element, options) {
    super._attachPartListeners(partId, element, options);

    switch (partId) {
      case "details":
        if (this.isView) this.#attachViewListeners(element, options);
        break;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Attach listeners to the `details` part in view mode.
   * @param {HTMLElement} element   The injected element.
   * @param {object} options        Rendering options.
   */
  #attachViewListeners(element, options) {
    element.querySelector("[data-action=showImage]").addEventListener("click", () => this.document.system.showImage());
  }
}
