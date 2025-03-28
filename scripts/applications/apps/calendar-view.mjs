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
    return `${day.name}, ${month.name} ${(components.dayOfMonth + 1).ordinalString()}, ${components.year}`;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    actions: {
      pickDate: CalendarView.#pickDate,
    },
    classes: ["quest-board", "calendar"],
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    format: {
      template: "modules/quest-board/templates/apps/calendar-view/format.hbs",
    },
    calendar: {
      template: "modules/quest-board/templates/apps/calendar-view/calendar.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch (partId) {
      case "calendar":
        await this.#preparePartContextCalendar(context);
        break;
      case "format":
        await this.#preparePartContextFormat(context);
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
  async #preparePartContextCalendar(context) {
    const { calendar: c, worldTime: t } = game.time;
    const components = c.timeToComponents(t);

    let { day, year, month, dayOfMonth } = components;
    month = c.months.values[month];

    const days = c.isLeapYear(year) ? (month.leapDays ?? month.days) : month.days;

    const buttons = {
      days: Array.fromRange(days).map(n => {
        const diff = dayOfMonth - n;
        return {
          label: String(n + 1),
          day: day - diff,
          cssClass: [
            "date",
            (n === dayOfMonth) ? "active" : null,
          ].filterJoin(" "),
        };
      }),
    };

    let dow = this.__GET_DAY_OF_WEEK();
    let i = dayOfMonth;
    while (i > 0) {
      i--;
      dow--;
      if (dow < 0) dow = c.days.values.length - 1;
    }
    buttons.days.unshift(...Array(c.days.values[dow].ordinal - 1).fill({ blank: true }));

    Object.assign(context, { buttons, year });
  }

  /* -------------------------------------------------- */

  __GET_DAY_OF_WEEK() {
    // TODO: Remove this when the calendar API works correctly in 13.340
    const { calendar: c, worldTime: t } = game.time;
    const { secondsPerMinute, minutesPerHour, hoursPerDay, daysPerYear } = c.days;
    const daySeconds = secondsPerMinute * minutesPerHour * hoursPerDay;
    const totalWeekdays = Math.floor(t / daySeconds) + c.years.firstWeekday - 1;
    return totalWeekdays % c.days.values.length;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare the rendering context for this specific part.
   * @param {object} context    The rendering context. **will be mutated**
   * @returns {Promise<void>}   A promise that resolves once the context has been modified.
   */
  async #preparePartContextFormat(context) {
    context.format = Calendar.formatDateNatural(game.time.calendar, {
      ...game.time.components, dayOfWeek: this.__GET_DAY_OF_WEEK(),
    });
  }

  /* -------------------------------------------------- */

  /**
   * Update the world time.
   * @this {CalendarView}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static async #pickDate(event, target) {
    const day = Number(target.dataset.day);
    const year = Number(target.closest("[data-year]").dataset.year);
    const components = { ...game.time.components, day, year };
    await game.time.set(components);
    this.render();
  }
}
