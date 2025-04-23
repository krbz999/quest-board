/**
 * Utility method that calculates the currency update to an actor given a certain amount of any denomination,
 * automatically subtracting from higher (or lower) currencies.
 * @param {Actor5e} actor         The actor whose currency to use for calculation.
 * @param {number} value          The value to calculate.
 * @param {string} denomination   The denomination of the value.
 * @returns {object|boolean}      A currency object, or `false` if the actor did not have the required funds.
 */
export default function convertCurrency(actor, value, denomination) {
  // TODO: Simply use `dnd5e.applications.CurrencyManager.getActorCurrencyUpdates`:
  // https://github.com/foundryvtt/dnd5e/pull/5533

  const {
    system, remainder, items,
  } = dnd5e.applications.CurrencyManager.getActorCurrencyUpdates(actor, value, denomination, {
    recursive: false, // TODO: Pending system improvement, also deduct from containers.
    exact: true,
    priority: "low",
  });
  if (remainder) return false;

  return system.currency;
}
