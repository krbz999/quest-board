const {
  BooleanField, FilePathField, HTMLField, SchemaField, SetField, StringField,
} = foundry.data.fields;

export default class RelationData extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      avatar: new SchemaField({
        src: new FilePathField({ categories: ["IMAGE"] }),
        wide: new BooleanField({}),
      }),
      biography: new SchemaField({
        public: new HTMLField(),
        private: new HTMLField(),
      }),
      properties: new SetField(new StringField()),
      titles: new SetField(new StringField()),
      type: new StringField({
        choices: () => QUESTBOARD.config.RELATION_SUBTYPES,
        blank: false,
        initial: "person",
      }),

      location: new SchemaField({
        age: new SchemaField({
          founding: new QUESTBOARD.data.fields.DateField({ day: { nullable: true } }),
          defunct: new QUESTBOARD.data.fields.DateField({ day: { nullable: true } }),
        }),
        stats: new SchemaField({
          population: new NumberField({ min: 0, integer: true, nullable: false, initial: 0 }),
        }),
      }),
      object: new SchemaField(),
      person: new SchemaField({
        age: new SchemaField({
          birth: new QUESTBOARD.data.fields.DateField(),
          death: new QUESTBOARD.data.fields.DateField(),
        }),
        gender: new StringField({ choices: () => QUESTBOARD.config.RELATION_GENDERS, blank: true }),
        groups: new SchemaField({
          ideologies: new SetField(new StringField()),
          organizations: new SetField(new StringField()),
          teachings: new SetField(new StringField()),
        }),
        locations: new SchemaField({
          demises: new SetField(new StringField()),
          origins: new SetField(new StringField()),
          residences: new SetField(new StringField()),
        }),
        stats: new SchemaField({
          height: new StringField({ required: true }),
          weight: new StringField({ required: true }),
        }),
      }),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["QUESTBOARD.RELATION"];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    const cal = game.time.calendar;

    if (this.type === "person") {
      this.age.birth.label = cal.format(cal.componentsToTime(this.age.birth), "natural");
      this.age.death.label = cal.format(cal.componentsToTime(this.age.death), "natural");
      this.age.label = this.properties.has("dead")
        ? cal.difference(this.age.death, this.age.birth).year
        : cal.difference(game.time.components, this.age.birth).year;
    } else if (this.type === "location") {
      this.age.founding.label = (this.age.founding.day === null)
        ? game.i18n.format("QUESTBOARD.LOCATION.VIEW.year", { year: this.age.founding.year })
        : cal.format(cal.componentsToTime(this.age.founding), "natural");
      this.age.defunct.label = (this.age.defunct.day === null)
        ? game.i18n.format("QUESTBOARD.LOCATION.VIEW.year", { year: this.age.defunct.year })
        : cal.format(cal.componentsToTime(this.age.defunct), "natural");
    }
  }

  /* -------------------------------------------------- */

  /**
   * Show the image of this relation to just the current user.
   * @returns {Promise<ImagePopout>}    A promise that resolves to the rendered image popout.
   */
  async showImage() {
    const options = {
      src: this.avatar.src || "icons/svg/mystery-man.svg",
      uuid: this.parent.uuid,
      showTitle: true,
      caption: Array.from(this.titles).join(", "),
      window: {
        title: this.parent.name,
        icon: QUESTBOARD.applications.sheets.journal.RelationPageSheet.DEFAULT_OPTIONS.window.icon,
      },
    };

    return new foundry.applications.apps.ImagePopout(options).render({ force: true });
  }
}
