import CalendarPageRegistry from "../../utils/calendar-page-registry.mjs";

const { NumberField, SchemaField, TypedObjectField } = foundry.data.fields;

export default class CalendarData extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      dates: new TypedObjectField(new SchemaField({
        day: new NumberField({ integer: true, nullable: true, min: 0 }),
        year: new NumberField({ integer: true, nullable: true, min: 0 }),
      }), { validateKeys: key => foundry.utils.randomID(key) }),
    };
  }

  /* -------------------------------------------------- */
  /*   Registry handling                                */
  /* -------------------------------------------------- */

  /**
   * Registry of calendar pages for later retrieval.
   * @type {CalendarPageRegistry<string, JournalEntryPage>}
   */
  static #REGISTRY = new CalendarPageRegistry();

  /* -------------------------------------------------- */

  /**
   * Current state of the registry.
   * @type {-1|0|1}
   */
  static #registryState = -1;

  /* -------------------------------------------------- */

  /**
   * Is the registry ready?
   * @type {boolean}
   */
  static get registryReady() {
    return CalendarData.#registryState === 1;
  }

  /* -------------------------------------------------- */

  /**
   * Initialize the registry.
   * @returns {Promise<void>}   A promise that resolves once the registry has been initialized.
   */
  static async setupRegistry() {
    if (CalendarData.#registryState > -1) return;
    CalendarData.#registryState = 0;

    // Store pages from compendiums.
    for (const pack of game.packs) {
      if (pack.metadata.type !== "JournalEntry") continue;
      const index = await pack.getIndex({ fields: ["pages.type"] });
      for (const journal of index) {
        for (const page of journal.pages) {
          if (page.type !== "quest-board.calendar") continue;
          const uuid = [journal.uuid, "JournalEntryPage", page._id].join(".");
          CalendarData.#REGISTRY.register(await foundry.utils.fromUuid(uuid));
        }
      }
    }

    // Store pages from the journal directory.
    for (const journal of game.journal) {
      for (const page of journal.pages) {
        if (page.type !== "quest-board.calendar") continue;
        CalendarData.#REGISTRY.register(page);
      }
    }

    CalendarData.#registryState = 1;
  }

  /* -------------------------------------------------- */

  /**
   * Find all events that match a given date.
   * @param {object} [search]                 Search parameter.
   * @param {number} [search.day]             What day of the year (zero-indexed) the event must be on.
   * @param {number} [search.year]            What year the event must be on.
   * @returns {Promise<JournalEntryPage[]>}   A promise that resolves to an array of journal entry event pages.
   */
  static async getByDate(search = {}) {
    const uuids = [];

    for (const [uuid, obj] of CalendarData.#REGISTRY.entries()) {
      for (const date of Object.values(obj.system.dates)) {
        let match = true;
        if (search.day !== null) match = [null, search.day].includes(date.day);
        if (search.year !== null) match = match && [null, search.year].includes(date.year);

        if (match) {
          uuids.push(uuid);
          break;
        }
      }
    }

    return Promise.all(uuids.map(uuid => foundry.utils.fromUuid(uuid))).then(pages => pages.filter(_ => _));
  }
}
