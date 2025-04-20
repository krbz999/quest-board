export default class HavilonCalendar extends foundry.data.CalendarData {
  /** @inheritdoc */
  isLeapYear(year) {
    return false;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  timeToComponents(time = 0) {
    const components = super.timeToComponents(time);
    if (components.month < 12) {
      components.dayOfWeek = components.dayOfMonth % this.days.values.length;
    }
    return components;
  }
}
