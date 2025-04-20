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
      day.name,
      `${month.name} ${(components.dayOfMonth + 1).ordinalString()}`,
      components.year,
    ].join(", ");
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
      template: "modules/quest-board/templates/calendar/view/format.hbs",
    },
    calendar: {
      template: "modules/quest-board/templates/calendar/view/calendar.hbs",
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
        const d = day - diff;
        const time = c.componentsToTime({ ...components, day: d });
        const dow = c.timeToComponents(time).dayOfWeek;
        return {
          label: String(n + 1),
          day: d,
          dow,
          tooltip: c.days.values[dow].name,
          cssClass: [
            "date",
            (n === dayOfMonth) ? "active" : null,
          ].filterJoin(" "),
        };
      }),
    };

    const dayOfWeekFirstOfMonth = buttons.days[0].dow;
    buttons.days.unshift(...Array(dayOfWeekFirstOfMonth).fill({ blank: true }));

    Object.assign(context, { buttons, year });
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
   * Update the world time.
   * @this {CalendarView}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #pickDate(event, target) {
    const day = Number(target.dataset.day);
    const year = Number(target.closest("[data-year]").dataset.year);
    const components = { ...game.time.components, day, year };
    game.time.set(components);
  }
}
