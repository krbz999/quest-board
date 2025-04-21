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

    // FIXME: The names are not properly localized cus the strings are wrong.
    return [
      day.name.split(".").at(-1),
      `${month.name.split(".").at(-1)} ${(components.dayOfMonth + 1).ordinalString()}`,
      components.year,
    ].join(", ");
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
      title: "QUESTBOARD.CALENDAR.title",
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

  /**
   * A delta for showing a different month, equal to the number of months backwards or forwards.
   * I.e., if the current month is also the month shown, this value is 0; if viewing previous months,
   * this value is negative; and if looking forward, this value is positive.
   * @type {number}
   */
  #month = 0;

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
        const time = cal.componentsToTime({ ...c, day: c.day - c.dayOfMonth - 1 });
        c = cal.timeToComponents(time);
      }
    } else if (this.#month > 0) {
      for (let i = 0; i < this.#month; i++) {
        const month = cal.months.values[c.month];
        const days = cal.isLeapYear(c.year) ? (month.leapDays ?? month.days) : month.days;
        const delta = days - c.dayOfMonth;
        const time = cal.componentsToTime({ ...c, day: c.day + delta });
        c = cal.timeToComponents(time);
      }
    }

    let { day, year, month, dayOfMonth } = c;
    month = cal.months.values[month];

    const days = cal.isLeapYear(year) ? (month.leapDays ?? month.days) : month.days;
    const eventData = QUESTBOARD.data.CalendarEventStorage.getSetting();

    const buttons = {
      days: Array.fromRange(days).map(n => {
        const active = !this.#month && (n === dayOfMonth);
        const _day = day - (dayOfMonth - n);
        return {
          active, day: _day,
          label: String(n + 1),
          cssClass: [
            "date",
            active ? "active" : null,
            eventData.hasEvents({ year, day: _day }) ? "events" : null,
          ].filterJoin(" "),
        };
      }),
    };

    const dayOfWeekFirstOfMonth = cal.timeToComponents(cal.componentsToTime({ ...c, day: day - dayOfMonth })).dayOfWeek;
    buttons.days.unshift(...Array(dayOfWeekFirstOfMonth).fill({ blank: true }));

    Object.assign(context, {
      buttons,
      // FIXME: The names are not properly localized cus the strings are wrong.
      daysOfWeek: cal.days.values.map(k => k.name.split(".").at(-1)),
      year: c.year,
      month: cal.months.values[c.month].name.split(".").at(-1),
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
