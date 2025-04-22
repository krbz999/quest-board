const {
  FilePathField, HTMLField, NumberField, SchemaField, SetField, StringField,
} = foundry.data.fields;

export default class RelationData extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      age: new SchemaField({
        birth: new QUESTBOARD.data.fields.DateField(),
        death: new QUESTBOARD.data.fields.DateField(),
      }),
      avatar: new FilePathField({ categories: ["IMAGE"] }),
      biography: new SchemaField({
        public: new HTMLField(),
        private: new HTMLField(),
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
      properties: new SetField(new StringField()),
      stats: new SchemaField({
        height: new StringField({ required: true }),
        weight: new StringField({ required: true }),
      }),
      titles: new SetField(new StringField()),
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
    this.age.birth.label = cal.format(cal.componentsToTime(this.age.birth), "natural");
    this.age.death.label = cal.format(cal.componentsToTime(this.age.death), "natural");
    this.age.label = this.properties.has("dead")
      ? cal.difference(this.age.death, this.age.birth).year
      : cal.difference(game.time.components, this.age.birth).year;
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
        icon: QUESTBOARD.applications.sheets.journal.RelationPageSheet.DEFAULT_OPTIONS.window.icon,
      },
    };

    return new foundry.applications.apps.ImagePopout(options).render({ force: true });
  }
}
