import TypedObjectModel from "./typed-object-model.mjs";

export default class RewardItem extends TypedObjectModel {
  /** @inheritdoc */
  get path() {
    return "system.rewards.items";
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
}
