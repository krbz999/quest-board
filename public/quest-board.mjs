class AbstractPageSheet extends foundry.applications.sheets.journal.JournalEntryPageHandlebarsSheet {
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

var _module$5 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  AbstractPageSheet: AbstractPageSheet
});

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$5, Application: Application$5 } = foundry.applications.api;

class CalendarEventDeletionDialog extends HandlebarsApplicationMixin$5(Application$5) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["quest-board"],
    date: null,
    actions: {
      deleteEvent: CalendarEventDeletionDialog.#deleteEvent,
    },
    window: {
      title: "QUESTBOARD.CALENDAR.contextDeleteEventsDialogTitle",
      icon: "fa-solid fa-calendar-xmark",
      contentClasses: ["standard-form"],
    },
    position: {
      width: 500,
      height: "auto",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    events: {
      template: "modules/quest-board/templates/apps/calendar-event-deletion-dialog/events.hbs",
      classes: ["scrollable"],
      scrollable: [".scrollable"],
    },
  };

  /* -------------------------------------------------- */

  /**
   * The date to find events for.
   * @type {import("../../data/calendar-event-storage.mjs").EventDate}
   */
  get date() {
    return this.options.date;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const uuids = QUESTBOARD.data.CalendarEventStorage.getSetting().getUuidsByDate(this.date);

    const pages = [];
    for (const uuid of uuids) {
      const page = await fromUuid(uuid);
      const name = page?.name ?? game.i18n.localize("QUESTBOARD.CALENDAR.contextDeleteEventsDialogUnknownPage");
      const link = await foundry.applications.ux.TextEditor.enrichHTML(page ? page.link : `@UUID[${uuid}]{${name}}`);
      pages.push({ page, name, uuid, link });
    }
    return { pages };
  }

  /* -------------------------------------------------- */

  /**
   * Delete an event.
   * @this {CalendarEventDeletionDialog}
   * @param {PointerEvent} event          The initiating click event.
   * @param {HTMLButtonElement} target    The button that defined the [data-action].
   */
  static async #deleteEvent(event, target) {
    const uuid = target.closest("[data-page-uuid]").dataset.pageUuid;
    await QUESTBOARD.data.CalendarEventStorage.getSetting().removeEvent(uuid);
    this.render();
  }
}

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$4, Application: Application$4 } = foundry.applications.api;

class CalendarView extends HandlebarsApplicationMixin$4(Application$4) {
  /**
   * Format a date as a human-readable string.
   * @param {CalendarData} calendar   The current calendar.
   * @param {Components} components   The time components to format.
   * @param {object} _options         Options for the formatter.
   * @returns {string}                The formatted string.
   */
  static formatDateNatural(calendar, components, _options) {
    const day = calendar.days.values[components.dayOfWeek];
    const month = calendar.months.values[components.month];

    return [
      game.i18n.localize(day.name),
      `${game.i18n.localize(month.name)} ${(components.dayOfMonth + 1).ordinalString()}`,
      components.year,
    ].join(", ");
  }

  /* -------------------------------------------------- */

  /**
   * Get what day of the year a certain day of a certain month is.
   * @param {CalendarData} calendar   The calendar.
   * @param {number} dayOfMonth       The zero-indexed day of the month.
   * @param {number} month            The zero-indexed month.
   * @param {number} year             The year.
   * @returns {number}                The zero-indexed day of the year.
   */
  static getDayOfYear(calendar, dayOfMonth, month, year) {
    const daysInMonth = this.getDaysInMonth(calendar, month, year);
    dayOfMonth = Math.clamp(dayOfMonth, 0, daysInMonth - 1);

    let day = 0;
    for (let i = 0; i < month; i++) {
      const daysInMonth = this.getDaysInMonth(calendar, i, year);
      day += daysInMonth;
    }
    return day + dayOfMonth;
  }

  /* -------------------------------------------------- */

  /**
   * Get how many days are in a given month of a given year.
   * @param {CalendarData} calendar   The calendar.
   * @param {number} month            The zero-indexed month.
   * @param {number} year             The year.
   * @returns {number}                The number of days in the month.
   */
  static getDaysInMonth(calendar, month, year) {
    month = calendar.months.values[month];
    return calendar.isLeapYear(year) ? (month.leapDays ?? month.days) : month.days;
  }

  /* -------------------------------------------------- */

  /**
   * Get whether a given time is between a start time and end time.
   * @param {CalendarData} calendar         The calendar.
   * @param {number|Components} time        The date.
   * @param {number|Components} startTime   The start time.
   * @param {number|Components} endTime     The end time.
   * @returns {boolean}
   */
  static isTimeBetween(calendar, time, startTime, endTime) {
    if (typeof time === "object") time = calendar.componentsToTime(time);
    if (typeof startTime === "object") startTime = calendar.componentsToTime(startTime);
    if (typeof endTime === "object") endTime = calendar.componentsToTime(endTime);
    return time.between(startTime, endTime);
  }

  /* -------------------------------------------------- */

  /**
   * Hook function for injecting an element on the hotbar.
   * @param {Players} players       The Players application.
   * @param {HTMLElement} element   The aside element.
   * @param {object} context        Rendering context.
   * @param {object} options        Rendering options.
   */
  static renderPlayers(players, element, context, options) {
    if (!game.settings.get(QUESTBOARD.id, "displayCalendar")) return;
    if (document.getElementById("view-calendar")) return;
    const button = foundry.utils.parseHTML(`
    <button id="view-calendar" class="faded-ui" type="button" data-action="viewCalendar">
      <i class="fa-solid fa-calendar-days"></i>
      ${game.i18n.localize("QUESTBOARD.CALENDAR.viewCalendar")}
    </button>`);
    button.addEventListener("click", () => ui.calendar.render({ force: true }));
    element.insertAdjacentElement("beforebegin", button);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    actions: {
      changeMonth: CalendarView.#changeMonth,
      pickDate: CalendarView.#pickDate,
    },
    classes: ["quest-board", "calendar"],
    id: "quest-board-calendar",
    position: {
      height: "auto",
    },
    window: {
      icon: "fa-solid fa-calendar-days",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    format: {
      template: "modules/quest-board/templates/calendar/view/format.hbs",
    },
    calendar: {
      template: "modules/quest-board/templates/calendar/view/calendar.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("QUESTBOARD.CALENDAR.title", {
      name: game.i18n.localize(game.time.calendar.name),
    });
  }

  /* -------------------------------------------------- */

  /**
   * A delta for showing a different month, equal to the number of months backwards or forwards.
   * I.e., if the current month is also the month shown, this value is 0; if viewing previous months,
   * this value is negative; and if looking forward, this value is positive.
   * @type {number}
   */
  #month = 0;

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async render(options, _options) {
    if (options?.force === true) this.#month = 0;
    return super.render(options, _options);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch (partId) {
      case "format":
        await this.#preparePartContextFormat(context);
        break;
      case "calendar":
        await this.#preparePartContextCalendar(context);
        break;
    }
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare the rendering context for this specific part.
   * @param {object} context    The rendering context. **will be mutated**
   * @returns {Promise<void>}   A promise that resolves once the context has been modified.
   */
  async #preparePartContextFormat(context) {
    Object.assign(context, {
      natural: game.time.calendar.format(game.time.components, "natural"),
      timestamp: game.time.calendar.format(game.time.components, "timestamp"),
    });
  }

  /* -------------------------------------------------- */

  /**
   * Prepare the rendering context for this specific part.
   * @param {object} context    The rendering context. **will be mutated**
   * @returns {Promise<void>}   A promise that resolves once the context has been modified.
   */
  async #preparePartContextCalendar(context) {
    const cal = game.time.calendar;
    let c = game.time.components;

    if (this.#month < 0) {
      for (let i = 0; i > this.#month; i--) {
        // Go to last day of previous month.
        c = cal.add(c, { day: -(c.dayOfMonth + 1) });
      }
    } else if (this.#month > 0) {
      for (let i = 0; i < this.#month; i++) {
        // Go to first day of next month.
        c = cal.add(c, { day: CalendarView.getDaysInMonth(cal, c.month, c.year) - c.dayOfMonth });
      }
    }

    const days = CalendarView.getDaysInMonth(cal, c.month, c.year);
    const eventData = QUESTBOARD.data.CalendarEventStorage.getSetting();

    const buttons = {
      days: Array.fromRange(days).map(n => {
        const day = CalendarView.getDayOfYear(cal, n, c.month, c.year);
        const active = !this.#month && (day === c.day);

        return {
          active, day,
          label: String(n + 1),
          cssClass: [
            "date",
            active ? "active" : null,
            eventData.hasEvents({ year: c.year, day }) ? "events" : null,
          ].filterJoin(" "),
        };
      }),
    };

    const dayOfWeekFirstOfMonth = cal.add(c, { day: -c.dayOfMonth }).dayOfWeek;
    buttons.days.unshift(...Array(dayOfWeekFirstOfMonth).fill({ blank: true }));

    Object.assign(context, {
      buttons,
      daysOfWeek: cal.days.values.map(k => {
        return {
          label: game.i18n.localize(k.abbreviation),
          tooltip: k.name,
        };
      }),
      year: c.year,
      month: game.i18n.localize(cal.months.values[c.month].name),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this._createContextMenu(this.#createDateContextMenuOptions, ".date", {
      container: this.element,
      parentClassHooks: false,
      hookName: "DateContextMenuOptions",
      fixed: true,
    });
  }

  /* -------------------------------------------------- */
  /*   Context Menu                                     */
  /* -------------------------------------------------- */

  /**
   * Prepare context menu options for dates on the calendar.
   * @returns {object[]}    Context menu options.
   */
  #createDateContextMenuOptions() {
    const getData = li => ({ day: Number(li.dataset.day), year: Number(li.closest("[data-year]").dataset.year) });

    return [{
      name: "QUESTBOARD.CALENDAR.contextShowEvents",
      icon: "<i class='fa-solid fa-fw fa-calendar-days'></i>",
      condition: li => QUESTBOARD.data.CalendarEventStorage.getSetting().hasEvents(getData(li)),
      callback: li => this.#showDateEvents(getData(li)),
    }, {
      name: "QUESTBOARD.CALENDAR.contextAddEvent",
      icon: "<i class='fa-solid fa-fw fa-calendar-plus'></i>",
      condition: li => game.user.isGM,
      callback: li => this.#addEventToDate(getData(li)),
    }, {
      name: "QUESTBOARD.CALENDAR.contextDeleteEvents",
      icon: "<i class='fa-solid fa-fw fa-calendar-xmark'></i>",
      condition: li => game.user.isGM && QUESTBOARD.data.CalendarEventStorage.getSetting().hasEvents(getData(li)),
      callback: li => this.#removeEventFromDate(getData(li)),
    }];
  }

  /* -------------------------------------------------- */

  /**
   * Handle adding an event to a given date.
   * @param {import("../../data/calendar-event-storage.mjs").EventDate} date    The date.
   */
  #addEventToDate({ day, year }) {
    const callback = (event, button) => {
      const formData = new foundry.applications.ux.FormDataExtended(button.form);
      const { pages, repeat, duration } = foundry.utils.expandObject(formData.object).events.element;
      if (!pages.length) return;

      const store = QUESTBOARD.data.CalendarEventStorage.getSetting();
      store.storeEvents(pages, { date: { day, year }, duration, repeat });
    };

    const schema = QUESTBOARD.data.CalendarEventStorage.schema;

    foundry.applications.api.Dialog.prompt({
      content: [
        schema.getField("events.element.pages").toInput({}),
        schema.getField("events.element.repeat").toFormGroup({
          label: "QUESTBOARD.CALENDAR.FIELDS.events.element.repeat.label",
          localize: true,
        }, { localize: true }),
        schema.getField("events.element.duration").toFormGroup({
          label: "QUESTBOARD.CALENDAR.FIELDS.events.element.duration.label",
          hint: "QUESTBOARD.CALENDAR.FIELDS.events.element.duration.hint",
          localize: true,
        }, {}),
      ].map(html => html.outerHTML).join(""),
      ok: { callback },
      window: {
        title: "QUESTBOARD.CALENDAR.contextAddEventPromptTitle",
        icon: "fa-solid fa-calendar-plus",
      },
    });
  }

  /* -------------------------------------------------- */

  /**
   * Handle showing events for a given date.
   * @param {import("../../data/calendar-event-storage.mjs").EventDate} date    The date.
   */
  async #showDateEvents({ day, year }) {
    const events = await QUESTBOARD.data.CalendarEventStorage.getSetting().getEventsByDate({ day, year });
    if (!events.length) {
      return void ui.notifications.info("QUESTBOARD.CALENDAR.contextNoEvents", { localize: true });
    }

    const callback = (event, button) => {
      const uuid = button.form.elements.pageUuid.value;
      foundry.documents.collections.Journal._showEntry(uuid, true);
    };

    foundry.applications.api.Dialog.prompt({
      content: foundry.applications.fields.createSelectInput({
        name: "pageUuid",
        autofocus: true,
        options: events.map(page => ({
          value: page.uuid,
          label: `[${game.i18n.localize(CONFIG.JournalEntryPage.typeLabels[page.type])}] ${page.name}`,
        })),
        sort: true,
      }).outerHTML,
      ok: { callback },
      window: {
        title: "QUESTBOARD.CALENDAR.contextShowEventsPromptTitle",
        icon: "fa-solid fa-calendar-days",
      },
    });
  }

  /* -------------------------------------------------- */

  /**
   * Handle removing events from a given date.
   * @param {import("../../data/calendar-event-storage.mjs").EventDate} date    The date.
   */
  #removeEventFromDate({ day, year }) {
    QUESTBOARD.data.CalendarEventStorage.getSetting().removeEventDialog({ day, year });
  }

  /* -------------------------------------------------- */
  /*   Event Handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Change the displayed month.
   * @this {CalendarView}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #changeMonth(event, target) {
    this.#month = this.#month + Number(target.dataset.delta);
    this.render({ parts: ["calendar"] });
  }

  /* -------------------------------------------------- */

  /**
   * Update the world time.
   * @this {CalendarView}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static async #pickDate(event, target) {
    if (!game.user.isGM) return;
    const day = Number(target.dataset.day);
    const year = Number(target.closest("[data-year]").dataset.year);
    const components = game.time.calendar.timeToComponents(game.time.calendar.componentsToTime({ day, year }));

    const confirm = await foundry.applications.api.Dialog.confirm({
      content: `<p>${game.i18n.format("QUESTBOARD.CALENDAR.confirmContent", {
        date: game.time.calendar.format(components, "natural"),
      })}</p>`,
      modal: true,
      window: {
        title: "QUESTBOARD.CALENDAR.confirmTitle",
        icon: "fa-solid fa-calendar-days",
      },
    });
    if (!confirm) return;

    this.#month = 0;
    game.time.set(components);
  }
}

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$3, Application: Application$3 } = foundry.applications.api;

class QuestObjectiveConfig extends HandlebarsApplicationMixin$3(Application$3) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "{id}",
    classes: ["quest-board"],
    document: null,
    objectivePath: null,
    tag: "form",
    window: {
      icon: "fa-solid fa-list-check",
      contentClasses: ["standard-form"],
    },
    position: {
      width: 500,
      height: "auto",
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
      handler: QuestObjectiveConfig.#onSubmit,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "modules/quest-board/templates/apps/quest-objective-config/form.hbs",
      classes: ["standard-form"],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("QUESTBOARD.OBJECTIVE.TITLE", {
      id: this.options.objectivePath.split(".").at(-1),
    });
  }

  /* -------------------------------------------------- */

  /**
   * The objective object.
   * @type {object}
   */
  get objective() {
    const path = this.options.objectivePath;
    return foundry.utils.getProperty(this.document, path);
  }

  /* -------------------------------------------------- */

  /**
   * The journal entry page.
   * @type {JournalEntryPage}
   */
  get document() {
    return this.options.document;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _canRender(options) {
    if (!this.objective) {
      if (this.rendered) this.close();
      return false;
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.document.apps[this.id] = this;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onClose(options) {
    super._onClose(options);
    delete this.document.apps[this.id];
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _initializeApplicationOptions(options) {
    const opts = super._initializeApplicationOptions(options);
    opts.uniqueId = `${options.document.uuid.replaceAll(".", "-")}-${options.objectivePath.replaceAll(".", "-")}`;
    return opts;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const source = foundry.utils.getProperty(this.document, this.options.objectivePath);
    const objective = this.objective;
    const path = (this.options.objectivePath.split(".").length <= 3)
      ? "system.objectives.element"
      : "system.objectives.element.objectives.element";

    const makeField = name => {
      return {
        name,
        field: this.document.system.schema.getField(path.slice(7) + "." + name),
        value: foundry.utils.getProperty(source, name),
      };
    };

    Object.assign(context, {
      disableChecked: !foundry.utils.isEmpty(objective.objectives),
      showOptional: !objective.objectives,
      fields: {
        text: makeField("text"),
        sort: makeField("sort"),
        checked: makeField("checked"),
        optional: makeField("optional"),
      },
    });

    return context;
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle form submission.
   * @this {QuestObjectiveConfig}
   * @param {SubmitEvent} event           The initiating submit event.
   * @param {HTMLFormElement} form        The form element.
   * @param {FormDataExtended} formData   The form data.
   */
  static #onSubmit(event, form, formData) {
    if (!this.objective) return;
    formData = foundry.utils.expandObject(formData.object);
    this.document.update({ [this.options.objectivePath]: formData });
  }
}

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$2, Application: Application$2 } = foundry.applications.api;
const { NumberField: NumberField$5 } = foundry.data.fields;

class ShopPurchasePrompt extends HandlebarsApplicationMixin$2(Application$2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    stock: null,
    tag: "form",
    position: {
      width: 400,
    },
    window: {
      icon: "fa-solid fa-shop",
      contentClasses: ["standard-form"],
    },
    form: {
      handler: ShopPurchasePrompt.#onSubmit,
      closeOnSubmit: true,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    inputs: {
      template: "modules/quest-board/templates/apps/shop-purchase-prompt/inputs.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  /* -------------------------------------------------- */

  /**
   * The stock entry.
   * @type {object}
   */
  get stock() {
    return this.options.stock;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    const name = this.stock.item.name;
    return game.i18n.format("QUESTBOARD.PURCHASE.CONFIRM.title", { name });
  }

  /* -------------------------------------------------- */

  /**
   * The returned value.
   * @type {number|null}
   */
  get result() {
    return this.#result;
  }
  #result = null;

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const data = this.stock;
    const context = {
      showRange: data.quantity > 1,
      buttons: [{ type: "submit", label: "Confirm", action: "ok", icon: "fa-solid fa-check" }],
    };

    if (context.showRange) {
      context.input = {
        field: new NumberField$5({
          integer: true,
          label: game.i18n.localize("QUESTBOARD.PURCHASE.QUANTITY.label"),
          max: data.quantity,
          min: 1,
          nullable: false,
        }),
        value: 1,
        name: "quantity",
      };
      context.hint = this.#constructHint(1);
    } else {
      context.content = game.i18n.format("QUESTBOARD.PURCHASE.CONFIRM.areYouSure", {
        name: data.item.name, value: data.pev, denomination: data.ped,
      });
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    const rangePicker = this.element.querySelector("range-picker");
    if (!rangePicker) return;
    const range = rangePicker.querySelector("[type=range]");
    const hint = this.element.querySelector("[data-hint]");

    const fn = event => {
      const value = Number(event.currentTarget.value);
      hint.textContent = this.#constructHint(value);
    };

    rangePicker.addEventListener("change", fn);
    range.addEventListener("input", fn);
  }

  /* -------------------------------------------------- */

  /**
   * Construct hint text for range picker.
   * @param {number} value    Current quantity.
   * @returns {string}        Localized hint.
   */
  #constructHint(value) {
    return game.i18n.format("QUESTBOARD.PURCHASE.QUANTITY.content", {
      name: this.stock.item.name,
      quantity: value,
      value: (this.stock.quantity === value) ? this.stock.psv : (this.stock.pev * value).toNearest(0.1),
      denomination: CONFIG.DND5E.currencies[(this.stock.quantity === value) ? this.stock.psd : this.stock.ped].label,
    });
  }

  /* -------------------------------------------------- */

  /**
   * Asynchronous factory method.
   * @param {object} [stock]            The stock entry.
   * @returns {Promise<number|null>}    A promise that resolves to the selected quantity.
   */
  static async create(stock) {
    const { promise, resolve } = Promise.withResolvers();
    const application = new this({ stock });
    application.addEventListener("close", () => resolve(application.result), { once: true });
    application.render({ force: true });
    return promise;
  }

  /* -------------------------------------------------- */

  /**
   * @this {ShopPurchasePrompt}
   * @param {SubmitEvent} event           The submit event.
   * @param {HTMLFormElement} form        The form element.
   * @param {FormDataExtended} formData   The form data.
   */
  static #onSubmit(event, form, formData) {
    this.#result = (this.stock.quantity > 1) ? formData.object.quantity : 1;
  }
}

const { HandlebarsApplicationMixin: HandlebarsApplicationMixin$1, Application: Application$1 } = foundry.applications.api;

class ShopStockConfig extends HandlebarsApplicationMixin$1(Application$1) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "{id}",
    classes: ["quest-board"],
    stockId: null,
    document: null,
    tag: "form",
    window: {
      icon: "fa-solid fa-bag-shopping",
      contentClasses: ["standard-form"],
    },
    position: {
      width: 500,
      height: "auto",
    },
    form: {
      closeOnSubmit: false,
      submitOnChange: true,
      handler: ShopStockConfig.#onSubmit,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    inputs: {
      template: "modules/quest-board/templates/apps/shop-stock-config/inputs.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.localize("QUESTBOARD.STOCK.DIALOG.TITLE");
  }

  /* -------------------------------------------------- */

  /**
   * The stock entry.
   * @type {object}
   */
  get stock() {
    return this.document.system.stock.get(this.options.stockId);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.document.apps[this.id] = this;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _canRender(options) {
    if (!this.stock) {
      if (this.rendered) this.close();
      return false;
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onClose(options) {
    super._onClose(options);
    delete this.document.apps[this.id];
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _initializeApplicationOptions(options) {
    const opts = super._initializeApplicationOptions(options);
    opts.uniqueId = `${options.document.uuid.replaceAll(".", "-")}-Stock-${options.stockId}`;
    return opts;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const stock = this.stock;
    const prepared = await stock.prepareEntryData();
    const item = prepared.item;

    const prepareField = path => {
      return {
        field: stock.schema.getField(path),
        name: path,
        value: foundry.utils.getProperty(stock, path),
      };
    };

    Object.assign(context, {
      alias: {
        ...prepareField("alias"),
        label: "QUESTBOARD.SHOP.FIELDS.stock.alias.label",
        placeholder: item.name,
      },
      pev: {
        ...prepareField("price.each.value"),
        placeholder: item.system.price.value,
      },
      ped: {
        ...prepareField("price.each.denomination"),
        blank: game.i18n.format("QUESTBOARD.STOCK.DIALOG.DEFAULT", {
          value: CONFIG.DND5E.currencies[item.system.price.denomination || "gp"].label,
        }),
      },
      psv: prepareField("price.stack.value"),
      psd: prepareField("price.stack.denomination"),
      quantity: {
        ...prepareField("quantity"),
        placeholder: item.system.quantity,
        label: "QUESTBOARD.SHOP.FIELDS.stock.quantity.label",
      },
    });
    context.quantity.value ||= null;
    context.psv.placeholder = Number(prepared.pev * prepared.quantity).toNearest(0.1);
    context.psd.blank = game.i18n.format("QUESTBOARD.STOCK.DIALOG.DEFAULT", {
      value: CONFIG.DND5E.currencies[context.ped.value || item.system.price.denomination || "gp"].label,
    });

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * The journal entry page.
   * @type {JournalEntryPage}
   */
  get document() {
    return this.options.document;
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle form submission.
   * @this {ShopStockConfig}
   * @param {SubmitEvent} event           The initiating submit event.
   * @param {HTMLFormElement} form        The form element.
   * @param {FormDataExtended} formData   The form data.
   */
  static #onSubmit(event, form, formData) {
    this.stock?.update(formData.object);
  }
}

const { HandlebarsApplicationMixin, Application } = foundry.applications.api;

class TrackCounterConfig extends HandlebarsApplicationMixin(Application) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "{id}",
    classes: ["quest-board"],
    document: null,
    counterId: null,
    tag: "form",
    window: {
      icon: "fa-solid fa-chart-gantt",
      contentClasses: ["standard-form"],
    },
    position: {
      width: 500,
      height: "auto",
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
      handler: TrackCounterConfig.#onSubmit,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "modules/quest-board/templates/apps/track-counter-config/form.hbs",
      classes: ["standard-form"],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("QUESTBOARD.COUNTER.TITLE", { id: this.options.counterId });
  }

  /* -------------------------------------------------- */

  /**
   * The counter object.
   * @type {object}
   */
  get counter() {
    return this.document.system.counters[this.options.counterId];
  }

  /* -------------------------------------------------- */

  /**
   * The journal entry page.
   * @type {JournalEntryPage}
   */
  get document() {
    return this.options.document;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _canRender(options) {
    if (!this.counter) {
      if (this.rendered) this.close();
      return false;
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.document.apps[this.id] = this;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onClose(options) {
    super._onClose(options);
    delete this.document.apps[this.id];
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _initializeApplicationOptions(options) {
    const opts = super._initializeApplicationOptions(options);
    opts.uniqueId = `${options.document.uuid.replaceAll(".", "-")}-Counter-${options.counterId}`;
    return opts;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const counter = this.document.system._source.counters[this.options.counterId];
    Object.assign(context, {
      name: {
        field: this.document.system.schema.getField("counters.element.name"),
        value: counter.name,
      },
      description: {
        field: this.document.system.schema.getField("counters.element.description"),
        value: counter.description,
        enriched: await foundry.applications.ux.TextEditor.enrichHTML(counter.description, {
          rollData: this.document.getRollData(), relativeTo: this.document,
        }),
      },
      value: {
        field: this.document.system.schema.getField("counters.element.config.value"),
        value: Math.clamp(counter.config.value, 0, counter.config.max ?? 20) || null,
      },
      max: {
        field: this.document.system.schema.getField("counters.element.config.max"),
        value: counter.config.max,
      },
    });
    return context;
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle form submission.
   * @this {TrackCounterConfig}
   * @param {SubmitEvent} event           The initiating submit event.
   * @param {HTMLFormElement} form        The form element.
   * @param {FormDataExtended} formData   The form data.
   */
  static #onSubmit(event, form, formData) {
    if (!this.counter) return;
    formData = foundry.utils.expandObject(formData.object);
    this.document.update({ [`system.counters.${this.options.counterId}`]: formData });
  }
}

var _module$4 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  CalendarEventDeletionDialog: CalendarEventDeletionDialog,
  CalendarView: CalendarView,
  QuestObjectiveConfig: QuestObjectiveConfig,
  ShopPurchasePrompt: ShopPurchasePrompt,
  ShopStockConfig: ShopStockConfig,
  TrackCounterConfig: TrackCounterConfig
});

class QuestPageSheet extends AbstractPageSheet {
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
        { id: "notes", icon: "fa-solid fa-eye-slash" },
        { id: "rewards", icon: "fa-solid fa-gem" },
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
    notes: {
      template: "modules/quest-board/templates/quest/edit/notes.hbs",
      classes: ["tab", "prose"],
    },
    rewards: {
      template: "modules/quest-board/templates/quest/edit/rewards.hbs",
      classes: ["scrollable", "tab"],
      scrollable: [""],
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
    private: {
      template: "modules/quest-board/templates/quest/view/private.hbs",
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

    Object.assign(context.fields, {
      type: this._prepareField("system.type"),
      public: this._prepareField("text.content"),
      private: this._prepareField("system.description.private"),
      complete: this._prepareField("system.complete"),
    });

    const _options = { relativeTo: this.document };
    context.fields.public.enriched = await foundry.applications.ux.TextEditor.enrichHTML(
      context.fields.public.value, _options,
    );
    context.fields.public.hint = game.i18n.localize("QUESTBOARD.QUEST.EDIT.HINTS.content");
    context.fields.private.enriched = await foundry.applications.ux.TextEditor.enrichHTML(
      context.fields.private.value, _options,
    );

    context.objectives = {
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
    };

    const currency = this.document.system.currencyRewards;
    const itemRewards = [];
    for (const r of this.document.system.rewards.items) {
      const item = await r.item;
      if (!item) continue;
      itemRewards.push({ item, quantity: r.quantity ?? item.system.quantity });
    }

    // Currencies
    context.currencies = [];
    for (const [k, v] of Object.entries(CONFIG.DND5E.currencies)) {
      context.currencies.push({
        field: this.document.system.schema.getField("rewards.currency.element"),
        name: `system.rewards.currency.${k}`,
        value: currency[k] ?? null,
        placeholder: v.label,
      });
    }

    context.items = [];
    for (const reward of this.document.system.rewards.items) {
      const ctx = await reward.prepareEntryData();
      if (!ctx) continue;
      const ph = ctx.item.system.quantity;
      context.items.push({
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
    this.#removeGMOnlyTabs(parts);
    return parts;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _prepareTabs(group) {
    const tabs = super._prepareTabs(group);
    this.#removeGMOnlyTabs(tabs);
    return tabs;
  }

  /* -------------------------------------------------- */

  /**
   * Remove any properties that should be present only for game masters.
   * @param {object} object     The main object. **will be mutated**
   */
  #removeGMOnlyTabs(object) {
    if (!game.user.isGM) {
      delete object.notes;
      delete object.rewards;
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContentContext(context, options) {
    const enrichOptions = {
      relativeTo: this.document,
    };

    context.fields = {
      public: {
        enriched: await foundry.applications.ux.TextEditor.enrichHTML(this.document.text.content, enrichOptions),
      },
      private: {
        enriched: this.document.isOwner
          ? await foundry.applications.ux.TextEditor.enrichHTML(this.document.system.description.private, enrichOptions)
          : null,
      },
    };

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

class ShopPageSheet extends AbstractPageSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    viewClasses: ["shop-page"],
    window: {
      icon: "fa-solid fa-fw fa-shop",
    },
    actions: {
      editStock: ShopPageSheet.#editStock,
      removeStock: ShopPageSheet.#removeStock,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "configuration", icon: "fa-solid fa-gears" },
        { id: "proprietor", icon: "fa-solid fa-user" },
        { id: "stock", icon: "fa-solid fa-shop" },
      ],
      initial: "configuration",
      labelPrefix: "QUESTBOARD.SHOP.EDIT.TABS",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static EDIT_PARTS = {
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    configuration: {
      template: "modules/quest-board/templates/shop/edit/configuration.hbs",
      templates: ["modules/quest-board/templates/shared/edit/basics.hbs"],
      classes: ["tab"],
    },
    proprietor: {
      template: "modules/quest-board/templates/shop/edit/proprietor.hbs",
      classes: ["tab"],
    },
    stock: {
      template: "modules/quest-board/templates/shop/edit/stock.hbs",
      classes: ["scrollable", "tab"],
      scrollable: [""],
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
      template: "modules/quest-board/templates/shop/view/header.hbs",
      classes: ["quest-board"],
    },
    store: {
      template: "modules/quest-board/templates/shop/view/store.hbs",
      classes: ["quest-board", "journal-page-content"],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("QUESTBOARD.SHOP.EDIT.TITLE", { name: this.document.name });
  }

  /* -------------------------------------------------- */

  /**
   * The current customer making purchases in View Mode.
   * @type {Actor|null}
   */
  #customer = null;

  /* -------------------------------------------------- */

  /**
   * A set of stock ids to help persist the disabled state of buttons across re-renders.
   * @type {Set<string>}
   */
  #disabledStock = new Set();

  /* -------------------------------------------------- */

  /**
   * Since it is not possible to use `this.element` for view mode, we have to record
   * each of the individual purchase buttons.
   * @type {Map<string, HTMLButtonElement>}
   */
  #purchaseButtons = new Map();

  /* -------------------------------------------------- */

  /**
   * Toggle and store the disabled state of a button.
   * @param {HTMLButtonElement} button    The button element.
   * @param {boolean} state               The disabled state.
   */
  #toggleStockButton(button, state) {
    const id = button.closest("[data-stock-id]").dataset.stockId;
    if (state) {
      this.#disabledStock.add(id);
    } else {
      this.#disabledStock.delete(id);
    }
    this.#purchaseButtons.get(id).disabled = state;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    Object.assign(context.fields, {
      owner: this._prepareField("system.owner"),
      each: {
        value: this._prepareField("system.stock.element.price.each.value"),
        denom: this._prepareField("system.stock.element.price.each.denomination"),
      },
      stack: {
        value: this._prepareField("system.stock.element.price.stack.value"),
        denom: this._prepareField("system.stock.element.price.stack.denomination"),
      },
      quantity: this._prepareField("system.stock.element.quantity"),
    });

    context.stock = [];
    for (const stock of this.document.system.stock) {
      const data = await stock.prepareEntryData();
      if (!data) continue;
      context.stock.push({ stock, ctx: data });
    }

    await this.#prepareContextProprietor(context);

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Modify rendering context for the `proprietor` part.
   * @param {object} context    Rendering context. **will be mutated**
   * @returns {Promise}         A promise that resolves once the context has been prepared.
   */
  async #prepareContextProprietor(context) {}

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContentContext(context, options) {
    if (!this.#customer) this.#customer = game.user.character ?? null;
    context.customer = this.#customer;
    context.stock = [];
    for (const stock of this.document.system.stock) {
      const data = await stock.prepareEntryData();
      if (!data) continue;
      context.stock.push({
        stock,
        ctx: data,
        disabled: !this.#customer || this.#disabledStock.has(stock.id),
      });
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.getDragEventData(event);
    if (data.type !== "Item") {
      ui.notifications.error("QUESTBOARD.SHOP.EDIT.WARNING.onlyItems", { localize: true });
      return;
    }
    if (!data.uuid.startsWith("Compendium.")) {
      ui.notifications.error("QUESTBOARD.SHOP.EDIT.WARNING.onlyPack", { localize: true });
      return;
    }
    this.document.system.addStock(data.uuid);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _attachPartListeners(partId, element, options) {
    super._attachPartListeners(partId, element, options);

    if (this.isView) {
      switch (partId) {
        case "store":
          for (const button of element.querySelectorAll("[data-action=purchase]")) {
            const id = button.closest("[data-stock-id]").dataset.stockId;
            button.addEventListener("click", ShopPageSheet.#purchase.bind(this));
            this.#purchaseButtons.set(id, button);
          }
          break;
        case "header":
          element.querySelector("[data-action=changeCustomer]")
            .addEventListener("click", ShopPageSheet.#changeCustomer.bind(this));
          break;
      }
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    if (!this.document.system.owner) delete parts.proprietor;
    return parts;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _prepareTabs(group) {
    const tabs = super._prepareTabs(group);
    if (!this.document.system.owner) delete tabs.proprietor;
    return tabs;
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Configure an entry in the stock.
   * @this {ShopPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #editStock(event, target) {
    const stockId = target.closest("[data-stock-id]").dataset.stockId;
    this.document.system.editStockDialog(stockId);
  }

  /* -------------------------------------------------- */

  /**
   * Remove an entry from the stock.
   * @this {ShopPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #removeStock(event, target) {
    const stockId = target.closest("[data-stock-id]").dataset.stockId;
    this.document.system.stock.get(stockId).delete();
  }

  /* -------------------------------------------------- */

  /**
   * Purchase an item in the store.
   * @this {ShopPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   */
  static async #purchase(event) {
    if (!game.user.can("QUERY_USER")) {
      ui.notifications.error("QUESTBOARD.PURCHASE.WARNING.queryPermission", { localize: true });
      return;
    }

    const gm = game.users.activeGM;
    if (!gm) {
      ui.notifications.error("QUESTBOARD.PURCHASE.WARNING.noGM", { localize: true });
      return;
    }

    const target = event.currentTarget;
    this.#toggleStockButton(target, true);
    const stockId = target.closest("[data-stock-id]").dataset.stockId;
    const stock = await this.document.system.stock.get(stockId).prepareEntryData();
    const quantity = await QUESTBOARD.applications.apps.ShopPurchasePrompt.create(stock);
    if (!quantity) {
      this.#toggleStockButton(target, false);
      return;
    }

    /** @type {import("../../../types.mjs").ShopPurchaseQueryConfiguration} */
    const configuration = {
      quantity, stockId,
      pageUuid: this.document.uuid,
      customerUuid: this.#customer.uuid,
    };

    const result = await gm.query("questboard", { type: "purchase", config: configuration });
    if (!result || (result.success === false)) {
      const message = [
        game.i18n.localize("QUESTBOARD.PURCHASE.WARNING.failure"),
        result?.reason ?? null,
      ].filterJoin(" ");
      ui.notifications.warn(message);
    }

    this.#toggleStockButton(target, false);
  }

  /* -------------------------------------------------- */

  /**
   * Change the current active customer.
   * @this {ShopPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   */
  static async #changeCustomer(event) {
    const html = foundry.applications.fields.createFormGroup({
      label: game.i18n.localize("QUESTBOARD.SHOP.VIEW.CUSTOMER.label"),
      hint: game.i18n.localize("QUESTBOARD.SHOP.VIEW.CUSTOMER.hint"),
      input: foundry.applications.fields.createSelectInput({
        required: true,
        value: this.#customer?.id,
        options: game.actors.filter(actor => actor.isOwner).map(actor => ({ value: actor.id, label: actor.name })),
        name: "customer",
        autofocus: true,
      }),
    }).outerHTML;

    const result = await foundry.applications.api.Dialog.input({
      content: html,
      window: {
        title: "QUESTBOARD.SHOP.VIEW.CUSTOMER.title",
      },
    });
    if (!result) return;
    this.#customer = game.actors.get(result.customer) ?? null;
    this.document.parent.sheet.render();
  }
}

class TrackPageSheet extends AbstractPageSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    viewClasses: ["track-page"],
    window: {
      icon: "fa-solid fa-fw fa-chart-gantt",
    },
    actions: {
      configureCounter: TrackPageSheet.#configureCounter,
      createCounter: TrackPageSheet.#createCounter,
      deleteCounter: TrackPageSheet.#deleteCounter,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "configuration", icon: "fa-solid fa-gears" },
        { id: "counters", icon: "fa-solid fa-chart-gantt" },
      ],
      initial: "configuration",
      labelPrefix: "QUESTBOARD.TRACK.EDIT.TABS",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static EDIT_PARTS = {
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    configuration: {
      template: "modules/quest-board/templates/track/edit/configuration.hbs",
      templates: ["modules/quest-board/templates/shared/edit/basics.hbs"],
      classes: ["tab"],
    },
    counters: {
      template: "modules/quest-board/templates/track/edit/counters.hbs",
      classes: ["scrollable", "tab"],
      scrollable: [""],
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
      template: "modules/quest-board/templates/track/view/header.hbs",
      classes: ["quest-board"],
    },
    counters: {
      template: "modules/quest-board/templates/track/view/counters.hbs",
      templates: ["modules/quest-board/templates/track/view/battery.hbs"],
      classes: ["quest-board", "journal-page-content"],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("QUESTBOARD.TRACK.EDIT.TITLE", { name: this.document.name });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const prepCounter = id => {
      const counter = foundry.utils.deepClone(this.document.system._source.counters[id]);
      const ctx = { id };
      for (const name of ["name", "description", "config.max", "config.value"]) {
        const field = this.document.system.schema.getField(`counters.element.${name}`);
        const value = foundry.utils.getProperty(counter, name);
        foundry.utils.setProperty(ctx, name, {
          field, value, name: `system.counters.${id}.${name}`,
        });
      }
      ctx.config.value.value = Math.clamp(ctx.config.value.value, 0, ctx.config.max.value ?? 20) || null;
      return ctx;
    };

    Object.assign(context.fields, {
      counters: Object.keys(this.document.system.counters).map(prepCounter),
    });

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContentContext(context, options) {
    const counters = [];
    for (const [id, v] of Object.entries(this.document.system.counters)) {
      const data = {
        id, ...v,
        text: await foundry.applications.ux.TextEditor.enrichHTML(v.description, {
          rollData: this.document.getRollData(),
          relativeTo: this.document,
        }),
      };
      data.value = Math.clamp(data.config.value, 0, data.config.max) || null;
      data.bars = [];
      for (let i = 0; i < v.config.max; i++) {
        data.bars.push({ filled: i < v.config.value });
      }
      counters.push(data);
    }
    Object.assign(context, { counters });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _attachPartListeners(partId, element, options) {
    super._attachPartListeners(partId, element, options);

    switch (partId) {
      case "counters":
        if (this.isView) this.#attachViewListeners(element, options);
        break;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Attach listeners to the `counters` part in view mode.
   * @param {HTMLElement} element   The injected element.
   * @param {object} options        Rendering options.
   */
  #attachViewListeners(element, options) {
    const isOwner = this.document.isOwner;

    for (const input of element.querySelectorAll(".battery input")) {
      if (isOwner) input.addEventListener("change", TrackPageSheet.#onChangeBarInput.bind(this));
      else input.disabled = true;
    }

    if (!isOwner) return;
    for (const bar of element.querySelectorAll(".battery .bars .bar")) {
      bar.addEventListener("click", TrackPageSheet.#onClickBar.bind(this));
    }
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Configure a specific counter in a separate application.
   * @this {TrackPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #configureCounter(event, target) {
    new QUESTBOARD.applications.apps.TrackCounterConfig({
      document: this.document,
      counterId: target.closest("[data-counter-id]").dataset.counterId,
    }).render({ force: true });
  }

  /* -------------------------------------------------- */

  /**
   * Create a new counter on the page.
   * @this {TrackPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #createCounter(event, target) {
    this.document.system.createCounter();
  }

  /* -------------------------------------------------- */

  /**
   * Delete a counter from the page.
   * @this {TrackPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #deleteCounter(event, target) {
    const id = target.closest("[data-counter-id]").dataset.counterId;
    this.document.system.deleteCounters([id]);
  }

  /* -------------------------------------------------- */

  /**
   * In view mode, update the counter when clicking a bar.
   * @this {TrackPageSheet}
   * @param {PointerEvent} event    Initiating click event.
   */
  static #onClickBar(event) {
    const target = event.currentTarget;
    const idx = Number(target.dataset.idx);
    const id = target.closest("[data-counter-id]").dataset.counterId;
    this.document.update({ [ `system.counters.${id}.config.value`]: idx + !target.classList.contains("filled") });
  }

  /* -------------------------------------------------- */

  /**
   * In view mode, update the counter when changing the input.
   * @this {TrackPageSheet}
   * @param {ChangeEvent} event   Initiating change event.
   */
  static #onChangeBarInput(event) {
    const id = event.currentTarget.closest("[data-counter-id]").dataset.counterId;
    this.document.update({ [ `system.counters.${id}.config.value`]: event.currentTarget.value });
  }
}

var _module$3 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  QuestPageSheet: QuestPageSheet,
  ShopPageSheet: ShopPageSheet,
  TrackPageSheet: TrackPageSheet
});

var _module$2 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  journal: _module$3
});

var applications = /*#__PURE__*/Object.freeze({
  __proto__: null,
  api: _module$5,
  apps: _module$4,
  sheets: _module$2
});

/**
 * The quest types.
 * @enum {import("./types.mjs").QuestTypeConfig}
 */
const QUEST_TYPES = {
  major: {
    label: "QUESTBOARD.QUESTTYPES.Major.label",
    labelPl: "QUESTBOARD.QUESTTYPES.Major.labelPl",
    priority: 3,
  },
  side: {
    label: "QUESTBOARD.QUESTTYPES.Side.label",
    labelPl: "QUESTBOARD.QUESTTYPES.Side.labelPl",
    priority: 2,
  },
  minor: {
    label: "QUESTBOARD.QUESTTYPES.Minor.label",
    labelPl: "QUESTBOARD.QUESTTYPES.Minor.labelPl",
    priority: 1,
  },
};
dnd5e.utils.preLocalize("QUEST_TYPES", { keys: ["label", "labelPl"] });

var config = /*#__PURE__*/Object.freeze({
  __proto__: null,
  QUEST_TYPES: QUEST_TYPES
});

const {
  DocumentUUIDField, NumberField: NumberField$4, SchemaField: SchemaField$4, SetField, StringField: StringField$4, TypedObjectField: TypedObjectField$3,
} = foundry.data.fields;

/**
 * Data for the calendar event storage.
 * @property {Record<string, CalendarEventData>} events
 */

/**
 * @typedef {object} CalendarEventData
 * @property {EventDate} date     The date of the event. If the duration is longer than a day, this is the starting
 *                                date of the event. If the event repeats, this is the first time the event occurs.
 * @property {number} duration    The duration of the event, measured in days.
 * @property {string[]} pages     A set of journal entry page uuids.
 * @property {string} repeat      How the event repeats.
 */

/**
 * @typedef {object} EventDate
 * @property {number} day     The day of the event.
 * @property {number} year    The year of the event.
 */

class CalendarEventStorage extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      events: new TypedObjectField$3(new SchemaField$4({
        date: new SchemaField$4({
          day: new NumberField$4({ integer: true, nullable: false, min: 0 }),
          year: new NumberField$4({ integer: true, nullable: false, min: 0 }),
        }),
        duration: new NumberField$4({ integer: true, min: 1, nullable: false, initial: 1 }),
        pages: new SetField(new DocumentUUIDField({ type: "JournalEntryPage", embedded: true })),
        repeat: new StringField$4({
          blank: true,
          initial: "",
          choices: {
            // Disabled until evalMonthly below is implemented.
            // month: "QUESTBOARD.CALENDAR.FIELDS.events.element.repeat.choices.month",
            year: "QUESTBOARD.CALENDAR.FIELDS.events.element.repeat.choices.year",
          },
        }),
      }), { validateKey: key => foundry.data.validators.isValidId(key) }),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["QUESTBOARD.CALENDAR"];

  /* -------------------------------------------------- */

  /**
   * The setting name.
   * @type {string}
   */
  static SETTING = "calendarEvents";

  /* -------------------------------------------------- */

  /**
   * The stored game setting.
   * @returns {CalendarEventStorage}
   */
  static getSetting() {
    return game.settings.get(QUESTBOARD.id, CalendarEventStorage.SETTING);
  }

  /* -------------------------------------------------- */

  /**
   * The retrieved uuids are cached.
   * @type {Record<string, Set<string>>}
   */
  #cached;

  /* -------------------------------------------------- */

  /**
   * Retrieve all events that happen on a given date.
   * @param {EventDate} [date]                The date the events to retrieve. If omitted, the current date.
   * @returns {Promise<JournalEntryPage[]>}   A promise that resolves to retrieved journal entry pages.
   */
  async getEventsByDate(date) {
    const uuids = this.getUuidsByDate(date);

    const pages = new Set();
    for (const uuid of uuids) {
      const page = await fromUuid(uuid);
      if (page) pages.add(page);
    }
    return Array.from(pages);
  }

  /* -------------------------------------------------- */

  /**
   * Retrieve all uuids for events that happen on a given date.
   * @param {EventDate} [date]    The date of the events to retrieve. If omitted, the current date.
   * @returns {Set<string>}       Event pages' uuids.
   */
  getUuidsByDate(date) {
    if (!date) date = game.time.components;

    const key = `${date.year}:${date.day}`;
    if (this.#cached?.[key]) return this.#cached[key];

    const uuids = new Set();
    const cal = game.time.calendar;

    const evalYearly = event => {
      if (date.year < event.date.year) return false;

      const timeDelta = { day: event.duration - 1 };
      const year = (date.day < event.date.day) ? (date.year - 1) : date.year;
      const endTime = cal.add({ ...event.date, year }, timeDelta);
      return QUESTBOARD.applications.apps.CalendarView.isTimeBetween(cal, date, { ...event.date, year }, endTime);
    };

    const evalMonthly = event => {
      console.warn("Repeating events that occur monthly are not yet supported.");
      return false;
    };

    const evalNonRepeat = event => {
      const timeDelta = { day: event.duration - 1 };
      const endTime = cal.add(event.date, timeDelta);
      return QUESTBOARD.applications.apps.CalendarView.isTimeBetween(cal, date, event.date, endTime);
    };

    for (const event of Object.values(this.events)) {
      let matched = false;
      switch (event.repeat) {
        case "year":
          matched = evalYearly(event);
          break;
        case "month":
          matched = evalMonthly();
          break;
        default:
          matched = evalNonRepeat(event);
      }
      if (matched) for (const uuid of event.pages) uuids.add(uuid);
    }

    this.#cached ??= {};
    return this.#cached[key] = uuids;
  }

  /* -------------------------------------------------- */

  /**
   * Does the given date have events?
   * @param {EventDate} [date]    The date to test. If omitted, the current date.
   * @returns {boolean}           Whether there are any stored uuids on the given date.
   */
  hasEvents(date) {
    return this.getUuidsByDate(date).size > 0;
  }

  /* -------------------------------------------------- */

  /**
   * Retrieve all events that happen on the current date.
   * @returns {Promise<JournalEntryPage[]>}   A promise that resolves to retrieved journal entry pages.
   */
  async getCurrentEvents() {
    return this.getEventsByDate(game.time.components);
  }

  /* -------------------------------------------------- */

  /**
   * Store events.
   * @param {string[]|JournalEntryPage[]} uuids   An array of pages or page uuids.
   * @param {CalendarEventData} [eventData]       The data of the events. If omitted, create a non-repeating event
   *                                              on just the current date with a duration of 1 day.
   * @returns {Promise<CalendarEventStorage>}     A promise that resolves to the updated setting.
   */
  async storeEvents(uuids, eventData) {
    if (!game.user.isGM) return;
    uuids = uuids.map(e => (e instanceof foundry.documents.JournalEntryPage) ? e.uuid : e);
    if (!eventData) eventData = { date: game.time.components };

    const data = CalendarEventStorage.getSetting().toObject();
    foundry.utils.setProperty(data, `events.${foundry.utils.randomID()}`, { ...eventData, pages: uuids });
    return game.settings.set(QUESTBOARD.id, CalendarEventStorage.SETTING, data);
  }

  /* -------------------------------------------------- */

  /**
   * Store an event.
   * @param {string|JournalEntryPage} uuid      The uuid of a page, or the page itself.
   * @param {CalendarEventData} [eventData]     The data of the events. If omitted, create a non-repeating event
   *                                            on just the current date with a duration of 1 day.
   * @returns {Promise<CalendarEventStorage>}   A promise that resolves to the updated setting.
   */
  async storeEvent(uuid, eventData) {
    if (!game.user.isGM) return;
    return this.storeEvents([uuid], eventData);
  }

  /* -------------------------------------------------- */

  /**
   * Remove an event entirely.
   * @param {string|JournalEntryPage} uuid      The uuid of a page, or the page itself.
   * @returns {Promise<CalendarEventStorage>}   A promise that resolves to the updated setting.
   */
  async removeEvent(uuid) {
    if (!game.user.isGM) return;
    uuid = (uuid instanceof foundry.documents.JournalEntryPage) ? uuid.uuid : uuid;

    const data = CalendarEventStorage.getSetting().toObject();
    for (const [k, event] of Object.entries(data.events)) {
      event.pages.findSplice(e => e === uuid);
      if (!event.pages.length) delete data.events[k];
    }

    return game.settings.set(QUESTBOARD.id, CalendarEventStorage.SETTING, data);
  }

  /* -------------------------------------------------- */

  /**
   * Create a prompt to remove events listed on a given date.
   * @param {EventDate} date    The date to configure. If omitted, the current date is used.
   * @returns {Promise<void>}
   */
  async removeEventDialog(date) {
    if (!date) date = game.time.components;

    const store = CalendarEventStorage.getSetting();
    const uuids = store.getUuidsByDate(date);
    if (!uuids.size) return;

    new QUESTBOARD.applications.apps.CalendarEventDeletionDialog({ date }).render({ force: true });
  }

  /* -------------------------------------------------- */

  /**
   * Clear the entire calendar of all events.
   * @returns {Promise<CalendarEventStorage>}   A promise that resolves to the updated setting.
   */
  static async clearCalendar() {
    if (!game.user.isGM) return;
    const data = CalendarEventStorage.getSetting().toObject();
    delete data.events;
    return game.settings.set(QUESTBOARD.id, CalendarEventStorage.SETTING, data);
  }
}

class TypedObjectModel extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      _id: new foundry.data.fields.DocumentIdField(),
      uuid: new foundry.data.fields.DocumentUUIDField({ type: "Item", embedded: false }),
      quantity: new foundry.data.fields.NumberField({ nullable: true, min: 1, integer: true, initial: null }),
    };
  }

  /* -------------------------------------------------- */

  /**
   * The item types that are allowed to be referenced by this model.
   * @type {Set<string>}
   */
  static ALLOWED_ITEM_TYPES = new Set([
    "consumable",
    "container",
    "equipment",
    "loot",
    "tool",
    "weapon",
  ]);

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _initialize(options = {}) {
    const result = super._initialize(options);
    this.prepareData();
    return result;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare any other temporary data on this model.
   */
  prepareData() {}

  /* -------------------------------------------------- */

  /**
   * The document on which this is stored.
   * @type {JournalEntryPage}
   */
  get document() {
    return this.parent.parent;
  }

  /* -------------------------------------------------- */

  /**
   * The id of this model.
   * @type {string}
   */
  get id() {
    return this._id;
  }

  /* -------------------------------------------------- */

  /**
   * The path to the collection that holds this model.
   * @type {string}
   */
  get path() {
    return "";
  }

  /* -------------------------------------------------- */

  /**
   * Get the referenced item.
   * @returns {Promise<Item5e|null>}    A promise that resolves to the referenced item.
   */
  async getItem() {
    return fromUuid(this.uuid);
  }

  /* -------------------------------------------------- */

  /**
   * Prepare entry data.
   * @returns {Promise<object|null>}    A promise that resolves to an object with the item and other data.
   */
  async prepareEntryData() {
    const item = await this.getItem();
    if (!item) return null;
    const quantity = this.quantity ? this.quantity : item.system.quantity;
    return { item, quantity };
  }

  /* -------------------------------------------------- */

  /**
   * Create an instance of this model on a parent.
   * @param {object} [data]                       Initial data of the model.
   * @param {object} operation                    Operation options.
   * @param {JournalEntryPage} operation.parent   The page to create this model on.
   * @returns {Promise<JournalEntryPage>}         A promise that resolves to the updated journal entry page.
   */
  static async create(data = {}, { parent, ...operation } = {}) {
    const id = foundry.utils.randomID();
    const instance = new this({ ...data, _id: id });
    const path = [instance.path, instance.id].join(".");
    return parent.update({ [path]: instance.toObject() }, operation);
  }

  /* -------------------------------------------------- */

  /**
   * Perform an update to this model.
   * @param {object} [changes]              The changes to make.
   * @returns {Promise<JournalEntryPage>}   A promise that resolves to the updated journal entry page.
   */
  async update(changes = {}) {
    const path = [this.path, this.id].join(".");
    return this.document.update({ [path]: changes });
  }

  /* -------------------------------------------------- */

  /**
   * Delete this model.
   * @returns {Promise<JournalEntryPage>}   A promise that resolves to the updated journal entry page.
   */
  async delete() {
    const path = [this.path, `-=${this.id}`].join(".");
    return this.document.update({ [path]: null });
  }
}

class RewardItem extends TypedObjectModel {
  /** @inheritdoc */
  get path() {
    return "system.rewards.items";
  }

  /* -------------------------------------------------- */

  /**
   * Is the uuid valid?
   * @type {boolean}
   */
  get isValidReward() {
    try {
      const entry = fromUuidSync(this.uuid);
      return !!entry;
    } catch (err) {
      return false;
    }
  }
}

const {
  NumberField: NumberField$3, SchemaField: SchemaField$3, StringField: StringField$3,
} = foundry.data.fields;

class PriceField extends SchemaField$3 {
  constructor(fields = {}, options = {}) {
    super({
      value: new NumberField$3({ min: 0, step: 0.1 }),
      denomination: new StringField$3({
        required: true,
        blank: true,
        choices: CONFIG.DND5E.currencies,
      }),
      ...fields,
    }, options);
  }
}

/* -------------------------------------------------- */

class StockItem extends TypedObjectModel {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      price: new SchemaField$3({
        each: new PriceField(),
        stack: new PriceField(),
      }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get path() {
    return "system.stock";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async prepareEntryData() {
    const data = await super.prepareEntryData();
    if (!data) return data;

    data.pev = this.price.each.value ?? data.item.system.price.value;
    data.ped = this.price.each.denomination || data.item.system.price.denomination;
    data.psv = this.price.stack.value ?? (data.pev * data.quantity).toNearest(0.1);
    data.psd = this.price.stack.denomination || data.ped;

    return data;
  }
}

class CollectionField extends foundry.data.fields.TypedObjectField {
  /** @inheritdoc */
  constructor(model) {
    super(new foundry.data.fields.EmbeddedDataField(model));
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  initialize(value, model, options = {}) {
    value = super.initialize(value, model, options);
    const collection = new foundry.utils.Collection();
    for (const [id, v] of Object.entries(value)) {
      const element = this.element.initialize({ ...v, _id: id }, model, options);
      collection.set(element.id, element);
    }
    return collection;
  }
}

const {
  BooleanField: BooleanField$1, NumberField: NumberField$2, SchemaField: SchemaField$2, StringField: StringField$2, TypedObjectField: TypedObjectField$2,
} = foundry.data.fields;

class ObjectiveField extends TypedObjectField$2 {
  constructor(fields = {}) {
    super(new SchemaField$2({
      text: new StringField$2({ required: true }),
      checked: new BooleanField$1(),
      sort: new NumberField$2({ required: true, nullable: false, integer: true, initial: 0 }),
      ...fields,
    }), {
      validateKey: key => foundry.data.validators.isValidId(key),
    });
  }
}

var _module$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  CollectionField: CollectionField,
  ObjectiveField: ObjectiveField
});

const {
  BooleanField, HTMLField: HTMLField$1, NumberField: NumberField$1, SchemaField: SchemaField$1, StringField: StringField$1, TypedObjectField: TypedObjectField$1,
} = foundry.data.fields;

/* -------------------------------------------------- */

/**
 * The quest page data model.
 * @extends {TypeDataModel}
 */
class QuestData extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      complete: new BooleanField(),
      type: new StringField$1({
        required: true,
        initial: "major",
        choices: () => QUESTBOARD.config.QUEST_TYPES,
      }),
      description: new SchemaField$1({
        private: new HTMLField$1(),
      }),
      rewards: new SchemaField$1({
        items: new QUESTBOARD.data.fields.CollectionField(QUESTBOARD.data.RewardItem),
        currency: new TypedObjectField$1(new NumberField$1({ min: 0, nullable: true, integer: true })),
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
  static LOCALIZATION_PREFIXES = ["QUESTBOARD.QUEST"];

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

const {
  ForeignDocumentField,
} = foundry.data.fields;

class ShopData extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      owner: new ForeignDocumentField(foundry.documents.Actor),
      stock: new QUESTBOARD.data.fields.CollectionField(QUESTBOARD.data.StockItem),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["QUESTBOARD.SHOP"];

  /* -------------------------------------------------- */

  /**
   * Query method to purchase an item from the shop.
   * @param {import("../../types.mjs").ShopPurchaseQueryConfiguration} configuration
   * @returns {Promise<import("../../types.mjs").QueryResult>}
   */
  static _query = async (configuration) => {
    return QUESTBOARD.semaphore.add(ShopData.#query, configuration);
  };

  /* -------------------------------------------------- */

  /**
   * Query method to purchase an item from the shop.
   * @param {import("../../types.mjs").ShopPurchaseQueryConfiguration} configuration
   * @returns {Promise<import("../../types.mjs").QueryResult>}
   */
  static #query = async (configuration) => {
    const page = await fromUuid(configuration.pageUuid);

    const stock = page.system.stock.get(configuration.stockId);
    if (!stock) {
      return {
        success: false,
        reason: game.i18n.localize("QUESTBOARD.PURCHASE.WARNING.stockNotFound"),
      };
    }
    const prepared = await stock.prepareEntryData();

    if (configuration.quantity > prepared.quantity) {
      return {
        success: false,
        reason: game.i18n.localize("QUESTBOARD.PURCHASE.WARNING.tooHighQuantity"),
      };
    }

    const isStack = configuration.quantity === prepared.quantity;
    const value = isStack ? prepared.psv : (configuration.quantity * prepared.pev);
    const denomination = isStack ? prepared.psd : prepared.ped;

    const customer = await fromUuid(configuration.customerUuid);
    const available = customer.system.currency[denomination];
    if (available < value) {
      return {
        success: false,
        reason: game.i18n.format("QUESTBOARD.PURCHASE.WARNING.insufficientFunds", {
          name: customer.name, value, denomination: CONFIG.DND5E.currencies[denomination].label,
        }),
      };
    }

    const { itemData, itemUpdates } = await QUESTBOARD.utils.batchCreateItems(customer, [{
      item: prepared.item, quantity: configuration.quantity,
    }]);

    if (isStack) {
      await stock.delete();
    } else {
      await stock.update({ quantity: prepared.quantity - configuration.quantity });
    }

    await Promise.all([
      customer.update({ [`system.currency.${denomination}`]: available - value }),
      customer.createEmbeddedDocuments("Item", itemData, { keepId: true }),
      customer.updateEmbeddedDocuments("Item", itemUpdates),
    ]);

    // Create receipt message.
    const Cls = foundry.utils.getDocumentClass("ChatMessage");
    await Cls.create({
      content: `<p class="dnd5e2">${game.i18n.format("QUESTBOARD.PURCHASE.CONFIRM.receipt", {
        value, denomination,
        link: prepared.item.link,
        quantity: configuration.quantity,
      })}</p>`,
      speaker: Cls.getSpeaker({ actor: customer }),
    });

    return { success: true };
  };

  /* -------------------------------------------------- */

  /**
   * Add a new entry to the stock.
   * @param {string} uuid                   The uuid of the item to add.
   * @returns {Promise<JournalEntryPage>}   A promise that resolves to the updated page.
   */
  async addStock(uuid) {
    const item = await fromUuid(uuid);
    if (!QUESTBOARD.data.StockItem.ALLOWED_ITEM_TYPES.has(item.type)) {
      ui.notifications.error("QUESTBOARD.SHOP.EDIT.HINTS.invalidItemType", { format: { type: item.type } });
      return;
    }

    const stock = this.stock.find(stock => stock.uuid === uuid);
    if (stock) {
      const data = await stock.prepareEntryData();
      return stock.update({ quantity: data.quantity + item.system._source.quantity });
    } else {
      return QUESTBOARD.data.StockItem.create({ uuid }, { parent: this.parent });
    }
  }

  /* -------------------------------------------------- */

  /**
   * Create a dialog for editing an entry in the stock.
   * @param {string} stockId                The stock id of the entry.
   * @returns {Promise<ShopStockConfig>}    A promise that resolves to a rendered stock config.
   */
  async editStockDialog(stockId) {
    return new QUESTBOARD.applications.apps.ShopStockConfig({
      stockId,
      document: this.parent,
    }).render({ force: true });
  }
}

const {
  HTMLField, NumberField, SchemaField, StringField, TypedObjectField,
} = foundry.data.fields;

class TrackData extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      counters: new TypedObjectField(new SchemaField({
        name: new StringField({ required: true }),
        description: new HTMLField(),
        config: new SchemaField({
          max: new NumberField({ min: 1, step: 1, nullable: true, initial: null }),
          value: new NumberField({ min: 0, step: 1, nullable: true, initial: null }),
        }),
      }), { validateKey: key => foundry.data.validators.isValidId(key) }),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["QUESTBOARD.TRACK"];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    for (const [k, v] of Object.entries(this.counters)) {
      v.config.max ??= 20;
      v.config.value = Math.clamp(v.config.value, 0, v.config.max);
      v.config.spent = Math.clamp(v.config.max - v.config.value, 0, v.config.max);
    }
  }

  /* -------------------------------------------------- */

  /**
   * Create a new counter on the page.
   * @param {object} [data]                 Counter data.
   * @returns {Promise<JournalEntryPage>}   A promise that resolves to the updated page.
   */
  async createCounter(data = {}) {
    data = foundry.utils.mergeObject({ name: "" }, data);
    const id = foundry.utils.randomID();
    return this.parent.update({ [`system.counters.${id}`]: data });
  }

  /* -------------------------------------------------- */

  /**
   * Delete a counter from the page.
   * @param {string|string[]} ids           An id or array of ids of counters to delete.
   * @returns {Promise<JournalEntryPage>}   A promise that resolves to the updated page.
   */
  async deleteCounters(ids) {
    ids = (foundry.utils.getType(ids) === "string") ? [ids] : ids;
    const update = ids.reduce((acc, id) => {
      acc[`system.counters.-=${id}`] = null;
      return acc;
    }, {});
    return this.parent.update(update);
  }
}

var _module = /*#__PURE__*/Object.freeze({
  __proto__: null,
  QuestData: QuestData,
  ShopData: ShopData,
  TrackData: TrackData
});

var data = /*#__PURE__*/Object.freeze({
  __proto__: null,
  CalendarEventStorage: CalendarEventStorage,
  RewardItem: RewardItem,
  StockItem: StockItem,
  TypedObjectModel: TypedObjectModel,
  fields: _module$1,
  journalEntryPages: _module
});

/**
 * Utility method that takes a bunch of items from a compendium, and creates create/update data for an actor.
 * The data returned should be created with `keepId: true`.
 * @param {Actor5e} actor                                         The actor to receive the items.
 * @param {import("../types.mjs").ItemGrantConfig[]} [configs]    The configuration of items to grant.
 * @returns {object}                                              A promise that resolves to an object with item
 *                                                                creation and item update data.
 */
async function batchCreateItems(actor, configs = []) {
  const itemData = [];
  const itemUpdates = [];

  const Cls = foundry.utils.getDocumentClass("Item");

  for (const { item, quantity } of configs) {
    // Containers get created multiple times with their embedded content.
    if (item.type === "container") {
      for (let i = 0; i < quantity; i++) {
        const data = await Cls.createWithContents([item]);
        itemData.push(...data);
      }

      continue;
    }

    const existing = ["consumable", "loot"].includes(item.type) ? actor.itemTypes[item.type].find(c => {
      return (c.name === item.name) && (c._stats.compendiumSource === item.uuid);
    }) : null;

    // Existing consumables get stacked.
    if (existing) {
      const update = itemUpdates.find(u => u._id === existing.id)
        ?? { _id: existing.id, "system.quantity": existing.system.quantity };
      if (!itemUpdates.includes(update)) itemUpdates.push(update);
      update["system.quantity"] += quantity;
      update.delta ??= 0;
      update.delta += quantity;

      continue;
    }

    // Creating new items.
    itemData.push(foundry.utils.mergeObject(game.items.fromCompendium(item), {
      "system.quantity": quantity,
    }));
  }

  return { itemData, itemUpdates };
}

/**
 * Utility method that calculates the currency update to an actor given a certain amount of any denomination,
 * automatically subtracting from higher (or lower) currencies.
 * @param {Actor5e} actor         The actor whose currency to use for calculation.
 * @param {number} value          The value to calculate.
 * @param {string} denomination   The denomination of the value.
 * @returns {object|boolean}      A currency object, or `false` if the actor did not have the required funds.
 */
function convertCurrency(actor, value, denomination) {
  // TODO: Simply use `dnd5e.applications.CurrencyManager.getActorCurrencyUpdates`:
  // https://github.com/foundryvtt/dnd5e/pull/5533

  const {
    system, remainder, items,
  } = dnd5e.applications.CurrencyManager.getActorCurrencyUpdates(actor, value, denomination, {
    recursive: false, // TODO: Pending system improvement, also deduct from containers.
    exact: true,
    priority: "low",
  });
  if (remainder) return false;

  return system.currency;
}

/**
 * Convert all currencies to the highest possible denomination.
 * @param {object} currency   An object with (some) keys from `CONFIG.DND5E.currencies`.
 * @returns {object}
 */
function optimizeCurrency(currency) {
  currency = foundry.utils.deepClone(currency);

  const currencies = Object.entries(CONFIG.DND5E.currencies);
  currencies.sort((a, b) => a[1].conversion - b[1].conversion);

  // Count total converted units of the base currency
  let basis = currencies.reduce((change, [denomination, config]) => {
    if (!config.conversion) return change;
    return change + ((currency[denomination] ?? 0) / config.conversion);
  }, 0);

  // Convert base units into the highest denomination possible
  for (const [denomination, config] of currencies) {
    if (!config.conversion) continue;
    const amount = Math.floor(basis * config.conversion);
    currency[denomination] = amount;
    basis -= (amount / config.conversion);
  }

  // This can be off by one: https://github.com/foundryvtt/dnd5e/issues/5463

  return currency;
}

var utils = /*#__PURE__*/Object.freeze({
  __proto__: null,
  batchCreateItems: batchCreateItems,
  convertCurrency: convertCurrency,
  optimizeCurrency: optimizeCurrency
});

globalThis.QUESTBOARD = {
  applications,
  config,
  data,
  utils,
  id: "quest-board",
  /**
   * A semaphore for handling socketed requests in order.
   * @type {foundry.utils.Semaphore}
   */
  semaphore: null,
};

/* -------------------------------------------------- */

Hooks.once("init", () => {
  Object.assign(CONFIG.JournalEntryPage.dataModels, {
    [`${QUESTBOARD.id}.quest`]: QuestData,
    [`${QUESTBOARD.id}.shop`]: ShopData,
    [`${QUESTBOARD.id}.track`]: TrackData,
  });
  Object.assign(CONFIG.JournalEntryPage.typeIcons, {
    [`${QUESTBOARD.id}.quest`]: QuestPageSheet.DEFAULT_OPTIONS.window.icon,
    [`${QUESTBOARD.id}.shop`]: ShopPageSheet.DEFAULT_OPTIONS.window.icon,
    [`${QUESTBOARD.id}.track`]: TrackPageSheet.DEFAULT_OPTIONS.window.icon,
  });

  CONFIG.ui.calendar = CalendarView;
  CONFIG.time.formatters.natural = CalendarView.formatDateNatural;

  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.JournalEntryPage, QUESTBOARD.id, QuestPageSheet,
    { types: [`${QUESTBOARD.id}.quest`], makeDefault: true, label: "QUESTBOARD.QUEST.SHEET.LABEL" },
  );
  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.JournalEntryPage, QUESTBOARD.id, ShopPageSheet,
    { types: [`${QUESTBOARD.id}.shop`], makeDefault: true, label: "QUESTBOARD.SHOP.SHEET.LABEL" },
  );
  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.JournalEntryPage, QUESTBOARD.id, TrackPageSheet,
    { types: [`${QUESTBOARD.id}.track`], makeDefault: true, label: "QUESTBOARD.TRACK.SHEET.LABEL" },
  );

  CONFIG.queries.questboard = ({ type, config }) => {
    switch (type) {
      case "purchase":
        return ShopData._query(config);
    }
  };

  QUESTBOARD.semaphore = new foundry.utils.Semaphore(1);

  // Calendar-related data.
  game.settings.register(QUESTBOARD.id, CalendarEventStorage.SETTING, {
    type: CalendarEventStorage,
    config: false,
    scope: "world",
    onChange: () => ui.calendar.render(),
  });
  game.settings.register(QUESTBOARD.id, "displayCalendar", {
    name: "QUESTBOARD.CALENDAR.settingDisplayCalendarName",
    hint: "QUESTBOARD.CALENDAR.settingDisplayCalendarHint",
    type: new foundry.data.fields.BooleanField(),
    default: true,
    config: true,
    requiresReload: true,
    scope: "world",
  });
});

/* -------------------------------------------------- */

Hooks.once("i18nInit", () => {
  dnd5e.utils.performPreLocalization(config);
  foundry.helpers.Localization.localizeDataModel(CalendarEventStorage);
});

/* -------------------------------------------------- */

Hooks.on("getJournalSheetEntryContext", QuestData.addContextMenuOptions);
Hooks.on("getJournalEntryPageContextOptions", QuestData.addContextMenuOptions);
Hooks.on("updateWorldTime", () => ui.calendar.render());
Hooks.once("renderPlayers", CalendarView.renderPlayers);
