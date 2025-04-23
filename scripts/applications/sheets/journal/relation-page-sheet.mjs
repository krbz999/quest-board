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
        { id: "connections", icon: "fa-solid fa-sitemap" },
        { id: "public", icon: "fa-solid fa-user" },
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
    connections: {
      template: "modules/quest-board/templates/relation/edit/connections.hbs",
      classes: ["tab"],
    },
    public: {
      template: "modules/quest-board/templates/relation/edit/public.hbs",
      classes: ["tab", "prose"],
    },
    private: {
      template: "modules/quest-board/templates/relation/edit/private.hbs",
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
      case "connections":
        await this.#prepareConnections(context, options);
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
          birth: {
            day: this._prepareField("system.age.birth.day"),
            year: this._prepareField("system.age.birth.year"),
          },
        },
        avatar: this._prepareField("system.avatar"),
        gender: this._prepareField("system.gender"),
        properties: this._prepareField("system.properties"),
        titles: this._prepareField("system.titles"),
      },
    });

    if (this.document.system.properties.has("dead")) {
      context.fields.age.death = {
        day: this._prepareField("system.age.death.day"),
        year: this._prepareField("system.age.death.year"),
      };
    }

    context.fields.properties.options = QUESTBOARD.config.RELATION_PROPERTIES.toOptions;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for a particular part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<void>}   A promise that resolves once the context has been mutated.
   */
  async #prepareConnections(context, options) {
    Object.assign(context, {
      fields: {
        groups: {
          ideologies: this._prepareField("system.groups.ideologies"),
          organizations: this._prepareField("system.groups.organizations"),
          teachings: this._prepareField("system.groups.teachings"),
        },
        locations: {
          residences: this._prepareField("system.locations.residences"),
          origins: this._prepareField("system.locations.origins"),
        },
      },
    });

    if (this.document.system.properties.has("dead")) {
      context.fields.locations.demises = this._prepareField("system.locations.demises");
    }
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
    const isDead = this.document.system.properties.has("dead");

    const stats = [{
      label: "QUESTBOARD.RELATION.VIEW.birthdate",
      value: this.document.system.age.birth.label,
      show: true,
    }, {
      label: "QUESTBOARD.RELATION.VIEW.deathdate",
      value: this.document.system.age.death.label,
      show: isDead,
    }, {
      label: "QUESTBOARD.RELATION.VIEW.age",
      value: this.document.system.age.label,
      show: true,
    }];

    for (const field of ["residences", "origins", "demises"]) {
      if ((field === "demises") && !isDead) continue;
      if (this.document.system.locations[field].size) {
        stats.push({
          show: true,
          label: `QUESTBOARD.RELATION.FIELDS.locations.${field}.label`,
          value: Array.from(this.document.system.locations[field]).join(", "),
        });
      }
    }

    for (const field of ["ideologies", "organizations", "teachings"]) {
      if (this.document.system.groups[field].size) {
        stats.push({
          show: true,
          label: `QUESTBOARD.RELATION.FIELDS.groups.${field}.label`,
          value: Array.from(this.document.system.groups[field]).join(", "),
        });
      }
    }

    const enrichOptions = { relativeTo: this.document, rollData: this.document.getRollData?.() };
    Object.assign(context, {
      titles, avatar, stats,
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
