/**
 * @typedef {object} QuestTypeConfig
 * @property {string} label       The human-readable label.
 * @property {string} labelPl     The human-readable pluralized label.
 * @property {number} priority    The priority of the quest type, with lowest being highest priority.
 */

/**
 * @typedef {object} RelationPropertyConfig
 * @property {string} label   Human-readable label of this property.
 */

/**
 * @typedef {Object} ShopPurchaseQueryConfiguration
 * @property {string} pageUuid        The uuid of the shop page.
 * @property {string} stockId         The id of the entry in the shop's stock.
 * @property {string} customerUuid    The uuid of the actor making the purchase.
 * @property {number} quantity        The quantity to purchase.
 */

/**
 * @typedef {Object} QueryResult
 * @property {boolean} success    Whether the transaction was successful.
 * @property {string} [reason]    If unsuccessful, the reason given.
 */

/**
 * @typedef {Object} FieldContext
 * @property {DataField} field    The data field.
 * @property {*} value            The current value, after data preparation.
 * @property {*} source           The base value, before any data preparation.
 */

/**
 * @typedef {Object} ItemGrantConfig
 * @property {Item5e} item        The item to grant a quantity of.
 * @property {number} quantity    The amount to grant.
 */
