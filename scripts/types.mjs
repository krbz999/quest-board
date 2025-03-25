/**
 * @typedef {object} QuestTypeConfig
 * @property {string} label       The human-readable label.
 * @property {string} labelPl     The human-readable pluralized label.
 * @property {number} priority    The priority of the quest type, with lowest being highest priority.
 */

/**
 * @typedef {Object} ShopStockEntry
 * @property {string} alias                     Alternative label for the entry.
 * @property {object} price                     Pricing data.
 * @property {object} price.each                Pricing data for individual unit.
 * @property {number} price.each.value          The monetary value.
 * @property {string} price.each.denomination   Currency denomination.
 * @property {object} price.stack               Pricing data for a full stack.
 * @property {number} price.stack.value         The monetary value.
 * @property {string} price.stack.denomination  Currency denomination.
 * @property {number} quantity                  The stack size.
 * @property {string} uuid                      The uuid of the item.
 * @property {string} label                     The derived label, either alias or the item name.
 */

/**
 * @typedef {Object} ShopPurchaseQueryConfiguration
 * @property {string} pageUuid        The uuid of the shop page.
 * @property {string} stockUuid       The uuid of the entry in the shop's stock.
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
 * @property {InstanceType<foundry["data"]["fields"]["DataField"]>} field    The data field.
 * @property {*} value    The current value, after data preparation.
 * @property {*} source   The base value, before any data preparation.
 */
