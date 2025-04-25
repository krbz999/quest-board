const {
  FilePathField, HTMLField, NumberField, SchemaField, SetField, StringField,
} = foundry.data.fields;

export default class LocationData extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      age: new SchemaField({
        founding: new QUESTBOARD.data.fields.DateField({ day: { nullable: true } }),
        defunct: new QUESTBOARD.data.fields.DateField({ day: { nullable: true } }),
      }),
      avatar: new FilePathField({ categories: ["IMAGE"] }),
      biography: new SchemaField({
        public: new HTMLField(),
        private: new HTMLField(),
      }),
      properties: new SetField(new StringField()),
      stats: new SchemaField({
        population: new NumberField({ min: 0, integer: true, nullable: false, initial: 0 }),
      }),
      titles: new SetField(new StringField()),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["QUESTBOARD.LOCATION"];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    const cal = game.time.calendar;
    this.age.founding.label = (this.age.founding.day === null)
      ? game.i18n.format("QUESTBOARD.LOCATION.VIEW.year", { year: this.age.founding.year })
      : cal.format(cal.componentsToTime(this.age.founding), "natural");
    this.age.defunct.label = (this.age.defunct.day === null)
      ? game.i18n.format("QUESTBOARD.LOCATION.VIEW.year", { year: this.age.defunct.year })
      : cal.format(cal.componentsToTime(this.age.defunct), "natural");
  }

  /* -------------------------------------------------- */

  /**
   * Show the image of this relation to just the current user.
   * @returns {Promise<ImagePopout>}    A promise that resolves to the rendered image popout.
   */
  async showImage() {
    const options = {
      src: this.avatar || "icons/svg/mystery-man.svg",
      uuid: this.parent.uuid,
      showTitle: true,
      caption: Array.from(this.titles).join(", "),
      window: {
        title: this.parent.name,
        icon: QUESTBOARD.applications.sheets.journal.LocationPageSheet.DEFAULT_OPTIONS.window.icon,
      },
    };

    return new foundry.applications.apps.ImagePopout(options).render({ force: true });
  }
}
