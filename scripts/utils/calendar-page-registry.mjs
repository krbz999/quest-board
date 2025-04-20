export default class CalendarPageRegistry extends foundry.utils.Collection {
  /**
   * Register a page.
   * @param {JournalEntryPage} page   The page to register.
   */
  register(page) {
    this.set(page.uuid, page);
    // TODO: register dates, years, etc for easier later retrieval.
  }
}
