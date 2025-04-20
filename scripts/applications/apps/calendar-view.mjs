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

    const buttons = {
      days: Array.fromRange(days).map(n => {
        return {
          label: String(n + 1),
          day: day - (dayOfMonth - n),
          cssClass: [
            "date",
            (!this.#month && (n === dayOfMonth)) ? "active" : null,
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
  static #pickDate(event, target) {
    const day = Number(target.dataset.day);
    const year = Number(target.closest("[data-year]").dataset.year);
    const components = { ...game.time.components, day, year };
    this.#month = 0;
    game.time.set(components);
  }
}
