const { HandlebarsApplicationMixin, Application } = foundry.applications.api;

export default class CalendarEventDeletionDialog extends HandlebarsApplicationMixin(Application) {
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
      const link = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        page ? page.link : `@UUID[${uuid}]{${name}}`,
      );
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
