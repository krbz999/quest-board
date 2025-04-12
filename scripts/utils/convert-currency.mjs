/**
 * Utility method that calculates the currency update to an actor given a certain amount of any denomination,
 * automatically subtracting from higher (or lower) currencies.
 * @param {Actor5e} actor                 The actor whose currency to use for calculation.
 * @param {object} [price]                Price data.
 * @param {number} [price.value]          The value to calculate.
 * @param {string} [price.denomination]   The denomination of the value.
 * @param {string[]} [order]              A preferred order of spending denominations (default smallest to highest).
 * @returns {object|boolean}              A currency object, or `false` if the actor did not have the required funds.
 */
export default function convertCurrency(actor, { value, denomination } = {}, order) {
  // The default currency is the coinage that has a conversion of 1.
  const STANDARD_CURRENCY = Object.entries(CONFIG.DND5E.currencies).find(([k, v]) => v.conversion === 1)[0];

  value ||= 1;
  denomination ||= STANDARD_CURRENCY;

  // Use this as an update object.
  const available = foundry.utils.deepClone(actor.system.currency);

  const inOrder = Object.entries(CONFIG.DND5E.currencies).sort((a, b) => b[1].conversion - a[1].conversion).map(([k]) => k);
  order ??= inOrder;
  const lowest = inOrder[0];

  /**
   * Utility method to grab from a different pool.
   * @param {number} needed   How much is still needed.
   * @param {string} denom    The currency pool to grab from.
   * @returns {object}        Object with the amount grabbed and the amount remaining.
   */
  const grab = (needed, denom) => {
    const grabbed = Math.min(available[denom], _convertFromHigher(needed, lowest, denom));
    return { grabbed, remaining: available[denom] - grabbed };
  };

  const target = _convertCurrency(denomination, lowest, value)[lowest];
  let total = 0;

  for (const d of order) {
    if (target - total <= 0) break;
    const grabbed = grab(target - total, d);

    const convert = _convertCurrency(d, lowest, grabbed.grabbed);
    total += convert[lowest];
    available[d] = grabbed.remaining;
  }

  if (target > total) {
    return false; // insufficient funds
  }

  // May have overpaid
  if (total > target) {
    const diff = total - target;
    let currency = {};
    for (const k of Object.keys(CONFIG.DND5E.currencies)) currency[k] = (k === lowest) ? diff : 0;
    currency = QUESTBOARD.utils.optimizeCurrency(currency);
    for (const [k, v] of Object.entries(currency)) {
      available[k] += v;
    }
  }

  return available;
}

/* -------------------------------------------------- */

/**
 * Convert an integer amount of one denomination to another.
 * @param {string} from     The denomination to convert from.
 * @param {string} to       The denomination to convert to.
 * @param {number} amount   The integer amount to convert.
 * @returns {object}        An object with the converted currencies, and `conversion` being the conversion rate used.
 */
function _convertCurrency(from, to, amount) {
  if (parseInt(amount) !== amount) {
    throw new Error("Non-integer amount not allowed for currency conversion.");
  }
  if (from === to) return { [from]: amount, conversion: 1 };
  const conversion = CONFIG.DND5E.currencies[to].conversion / CONFIG.DND5E.currencies[from].conversion;
  const units = Math.floor(amount * conversion);
  return {
    [from]: amount - Math.floor(units / conversion),
    [to]: units,
    conversion,
  };
}

/* -------------------------------------------------- */

/**
 * Return the minimum amount of a higher currency needed to convert to at least the [given amount] of a smaller currency.
 * EG how many pp needed to receive X gp?
 * @param {number} needed     How much is needed of a given currency.
 * @param {string} denom      The denomination to convert to.
 * @param {string} specific   The denomination to grab from.
 * @returns {number}
 */
function _convertFromHigher(needed, denom, specific) {
  if (!needed) return 0;
  const d = specific;
  if (denom === d) return needed;
  const toHigher = _convertCurrency(denom, d, needed);
  if (!toHigher[d]) return 1;
  return toHigher[d] + (toHigher[denom] ? 1 : 0);
}
