const {
  DocumentUUIDField, NumberField, SchemaField, SetField, StringField, TypedObjectField,
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

export default class CalendarEventStorage extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      events: new TypedObjectField(new SchemaField({
        date: new SchemaField({
          day: new NumberField({ integer: true, nullable: false, min: 0 }),
          year: new NumberField({ integer: true, nullable: false, min: 0 }),
        }),
        duration: new NumberField({ integer: true, min: 1, nullable: false, initial: 1 }),
        pages: new SetField(new DocumentUUIDField({ type: "JournalEntryPage", embedded: true })),
        repeat: new StringField({
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
      const endTime = QUESTBOARD.applications.apps.CalendarView.add.call(cal, { ...event.date, year }, timeDelta);
      return QUESTBOARD.applications.apps.CalendarView.isTimeBetween(cal, date, { ...event.date, year }, endTime);
    };

    const evalMonthly = event => {
      console.warn("Repeating events that occur monthly are not yet supported.");
      return false;
    };

    const evalNonRepeat = event => {
      const timeDelta = { day: event.duration - 1 };
      const endTime = QUESTBOARD.applications.apps.CalendarView.add.call(cal, event.date, timeDelta);
      return QUESTBOARD.applications.apps.CalendarView.isTimeBetween(cal, date, event.date, endTime);
    };

    for (const event of Object.values(this.events)) {
      let matched = false;
      switch (event.repeat) {
        case "year":
          matched = evalYearly(event);
          break;
        case "month":
          matched = evalMonthly(event);
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
