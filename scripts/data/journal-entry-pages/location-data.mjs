const {
  FilePathField, HTMLField, NumberField, SchemaField, SetField, StringField,
} = foundry.data.fields;

export default class LocationData extends foundry.abstract.TypeDataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {

      avatar: new SchemaField({
        src: new FilePathField({ categories: ["IMAGE"] }),
      }),
      biography: new SchemaField({
        public: new HTMLField(),
        private: new HTMLField(),
      }),
      properties: new SetField(new StringField()),

      titles: new SetField(new StringField()),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["QUESTBOARD.LOCATION"];

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
        icon: QUESTBOARD.applications.sheets.journal.LocationPageSheet.DEFAULT_OPTIONS.window.icon,
      },
    };

    return new foundry.applications.apps.ImagePopout(options).render({ force: true });
  }
}
