const {
  DocumentUUIDField, NumberField, SchemaField, SetField, TypedObjectField,
} = foundry.data.fields;

/**
 * @typedef CalendarEventStorage
 * @property {Record<string, CalendarEventData>} events
 */

/**
 * @typedef {object} CalendarEventData
 * @property {number} day         The day of the event.
 * @property {number|null} year   The year of the event. If `null`, the event repeats each year.
 * @property {string[]} pages     A set of journal entry page uuids.
 */

/**
 * @typedef {object} EventDate
 * @property {number} day         The day of the event.
 * @property {number|null} year   The year of the event.
 */

export default class CalendarEventStorage extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      events: new TypedObjectField(new SchemaField({
        day: new NumberField({ integer: true, nullable: false, min: 0 }),
        year: new NumberField({ integer: true, nullable: true, min: 0 }),
        pages: new SetField(new DocumentUUIDField({ type: "JournalEntryPage", embedded: true })),
      }), { validateKey: key => foundry.data.validators.isValidId(key) }),
    };
  }

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
   * @param {EventDate} [date]    The date the events to retrieve. If omitted, the current date.
   * @returns {Set<string>}       Event pages' uuids.
   */
  getUuidsByDate(date) {
    if (!date) date = game.time.components;

    const { year = null, day } = date;
    const uuids = new Set(Object.values(this.events).reduce((acc, v) => {
      if (v.day !== day) return acc;
      if ((v.year === null) || (v.year === year)) acc.push(...v.pages);
      return acc;
    }, []));

    return uuids;
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
   * @param {EventDate} [date]                    The date of the events. If omitted, the current date.
   * @returns {Promise<CalendarEventStorage>}     A promise that resolves to the updated setting.
   */
  async storeEvents(uuids, date) {
    uuids = uuids.map(e => (e instanceof foundry.documents.JournalEntryPage) ? e.uuid : e);
    if (!date) date = game.time.components;
    const { year, day } = date;

    const data = game.settings.get(QUESTBOARD.id, "calendar-events").toObject();

    let stored = false;
    for (const [id, v] of Object.entries(data.events)) {
      if ((v.year === year) && (v.day === day)) {
        for (const uuid of uuids) v.pages.push(uuid);
        stored = true;
        break;
      }
    }

    if (!stored) {
      foundry.utils.setProperty(data, `events.${foundry.utils.randomID()}`, { year, day, pages: uuids });
    }

    return game.settings.set(QUESTBOARD.id, "calendar-events", data);
  }

  /* -------------------------------------------------- */

  /**
   * Store an event.
   * @param {string|JournalEntryPage} uuid      The uuid of a page, or the page itself.
   * @param {EventDate} [date]                  The date of the event. If omitted, the current date.
   * @returns {Promise<CalendarEventStorage>}   A promise that resolves to the updated setting.
   */
  async storeEvent(uuid, date) {
    if (uuid instanceof foundry.documents.JournalEntryPage) uuid = uuid.uuid;
    if (!date) date = game.time.components;
    return this.storeEvents([uuid], date);
  }

  /* -------------------------------------------------- */

  /**
   * Remove an event entirely.
   * @param {string|JournalEntryPage} uuid      The uuid of a page, or the page itself.
   * @returns {Promise<CalendarEventStorage>}   A promise that resolves to the updated setting.
   */
  async removeEvent(uuid) {
    uuid = (uuid instanceof foundry.documents.JournalEntryPage) ? uuid.uuid : uuid;

    const data = game.settings.get(QUESTBOARD.id, "calendar-events").toObject();
    for (const { pages } of Object.values(data.events)) {
      pages.findSplice(e => e === uuid);
    }

    return game.settings.set(QUESTBOARD.id, "calendar-events", data);
  }
}
