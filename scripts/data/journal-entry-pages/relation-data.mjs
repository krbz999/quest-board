const {
  FilePathField, HTMLField, NumberField, SchemaField, SetField, StringField,
} = foundry.data.fields;

export default class RelationData extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      age: new SchemaField({
        birth: new SchemaField({
          day: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
          year: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
        }),
      }),
      avatar: new FilePathField({ categories: ["IMAGE"] }),
      biography: new SchemaField({
        public: new HTMLField(),
        private: new HTMLField(),
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
    this.age.label = game.time.calendar.format(game.time.calendar.componentsToTime(this.age.birth), "natural");
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
