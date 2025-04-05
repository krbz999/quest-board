const { DocumentUUIDField, NumberField } = foundry.data.fields;

export default class RewardItem extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      uuid: new DocumentUUIDField({ type: "Item", embedded: false }),
      quantity: new NumberField({ integer: true, initial: null, positive: true }),
    };
  }

  /* -------------------------------------------------- */

  /**
   * A transformed uuid to act as the key for this entry in its collection.
   * @type {string}
   */
  get id() {
    return this.uuid.replaceAll(".", "-");
  }

  /* -------------------------------------------------- */

  /**
   * Is the uuid valid?
   * @type {boolean}
   */
  get isValidReward() {
    try {
      const entry = fromUuidSync(this.uuid);
      return !!entry;
    } catch (err) {
      return false;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Retrieve the item.
   * @type {Promise<Item5e|null>}
   */
  get item() {
    return fromUuid(this.uuid);
  }
}
