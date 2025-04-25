const { HandlebarsApplicationMixin, Application } = foundry.applications.api;

export default class CalendarView extends HandlebarsApplicationMixin(Application) {
  /**
   * Format a date as a human-readable string.
   * @param {CalendarData} calendar       The current calendar.
   * @param {TimeComponents} components   The time components to format.
   * @param {object} _options             Options for the formatter.
   * @returns {string}                    The formatted string.
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

  static add = add; // TODO: remove

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
        c = add.call(cal, c, { day: -(c.dayOfMonth + 1) });
      }
    } else if (this.#month > 0) {
      for (let i = 0; i < this.#month; i++) {
        // Go to first day of next month.
        c = add.call(cal, c, { day: CalendarView.getDaysInMonth(cal, c.month, c.year) - c.dayOfMonth });
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

    const dayOfWeekFirstOfMonth = add.call(game.time.calendar, c, { day: -c.dayOfMonth }).dayOfWeek;
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

/**
 * Modify some start time by adding a number of seconds or components to it. The delta components may be negative.
 * TODO: Remove with 13.341
 * @param {number|Components} startTime           The initial time
 * @param {number|Components} deltaTime           Differential components to add
 * @returns {Components}                          The resulting time
 */
function add(startTime, deltaTime) {
  if (typeof startTime === "object") startTime = this.componentsToTime(startTime);
  if (typeof deltaTime === "object") deltaTime = this.componentsToTime(deltaTime);
  const endTime = startTime + deltaTime;
  return this.timeToComponents(endTime);
}
