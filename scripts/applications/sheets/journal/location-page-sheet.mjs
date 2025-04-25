import AbstractPageSheet from "../../api/abstract-page-sheet.mjs";

export default class LocationPageSheet extends AbstractPageSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    viewClasses: ["location-page"],
    window: {
      icon: "fa-solid fa-fw fa-mountain-city",
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
        { id: "public", icon: "fa-solid fa-user" },
        { id: "private", icon: "fa-solid fa-user-secret" },
      ],
      initial: "configuration",
      labelPrefix: "QUESTBOARD.LOCATION.EDIT.TABS",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static EDIT_PARTS = {
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    configuration: {
      template: "modules/quest-board/templates/location/edit/configuration.hbs",
      templates: ["modules/quest-board/templates/shared/edit/basics.hbs"],
      classes: ["tab"],
    },
    identity: {
      template: "modules/quest-board/templates/location/edit/identity.hbs",
      classes: ["tab"],
    },
    public: {
      template: "modules/quest-board/templates/location/edit/public.hbs",
      classes: ["tab", "prose"],
    },
    private: {
      template: "modules/quest-board/templates/location/edit/private.hbs",
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
      template: "modules/quest-board/templates/location/view/header.hbs",
      classes: ["quest-board"],
    },
    details: {
      template: "modules/quest-board/templates/location/view/details.hbs",
      classes: ["quest-board"],
    },
    biography: {
      template: "modules/quest-board/templates/location/view/biography.hbs",
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
    return game.i18n.format("QUESTBOARD.LOCATION.EDIT.TITLE", { name: this.document.name });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch (partId) {
      case "identity":
        await this.#prepareIdentity(context, options);
        break;
      case "public":
        await this.#preparePublic(context, options);
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
          founding: {
            day: this._prepareField("system.age.founding.day"),
            year: this._prepareField("system.age.founding.year"),
          },
        },
        avatar: this._prepareField("system.avatar"),
        properties: this._prepareField("system.properties"),
        stats: {
          population: this._prepareField("system.stats.population"),
        },
        titles: this._prepareField("system.titles"),
      },
    });

    if (this.document.system.properties.has("defunct")) {
      context.fields.age.defunct = {
        day: this._prepareField("system.age.defunct.day"),
        year: this._prepareField("system.age.defunct.year"),
      };
    }

    context.fields.properties.options = QUESTBOARD.config.LOCATION_PROPERTIES.toOptions;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for a particular part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<void>}   A promise that resolves once the context has been mutated.
   */
  async #preparePublic(context, options) {
    Object.assign(context, {
      fields: {
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
    const isDead = this.document.system.properties.has("defunct");

    const stats = [{
      label: "QUESTBOARD.LOCATION.VIEW.founding",
      value: this.document.system.age.founding.label,
      show: true,
    }, {
      label: "QUESTBOARD.LOCATION.VIEW.defunctdate",
      value: this.document.system.age.defunct.label,
      show: isDead,
    }, {
      label: "QUESTBOARD.LOCATION.VIEW.population",
      value: dnd5e.utils.formatNumber(this.document.system.stats.population),
      show: true,
    }];

    const enrichOptions = { relativeTo: this.document, rollData: this.document.getRollData?.() };
    Object.assign(context, {
      titles, avatar, stats,
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
