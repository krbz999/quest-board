/**
 * Convert all currencies to the highest possible denomination.
 * @param {object} currency   An object with (some) keys from `CONFIG.DND5E.currencies`.
 * @returns {object}
 */
export default function optimizeCurrency(currency) {
  currency = foundry.utils.deepClone(currency);

  const currencies = Object.entries(CONFIG.DND5E.currencies);
  currencies.sort((a, b) => a[1].conversion - b[1].conversion);

  // Count total converted units of the base currency
  let basis = currencies.reduce((change, [denomination, config]) => {
    if (!config.conversion) return change;
    return change + ((currency[denomination] ?? 0) / config.conversion);
  }, 0);

  // Convert base units into the highest denomination possible
  for (const [denomination, config] of currencies) {
    if (!config.conversion) continue;
    const amount = Math.floor(basis * config.conversion);
    currency[denomination] = amount;
    basis -= (amount / config.conversion);
  }

  // This can be off by one: https://github.com/foundryvtt/dnd5e/issues/5463

  return currency;
}
