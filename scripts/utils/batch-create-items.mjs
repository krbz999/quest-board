/**
 * Utility method that takes a bunch of items from a compendium, and creates create/update data for an actor.
 * The data returned should be created with `keepId: true`.
 * @param {Actor5e} actor                                         The actor to receive the items.
 * @param {ItemGrantConfig[]} [configs]    The configuration of items to grant.
 * @returns {object}                                              A promise that resolves to an object with item
 *                                                                creation and item update data.
 */
export default async function batchCreateItems(actor, configs = []) {
  const itemData = [];
  const itemUpdates = [];

  const Cls = foundry.utils.getDocumentClass("Item");

  for (const { item, quantity } of configs) {
    // Containers get created multiple times with their embedded content.
    if (item.type === "container") {
      for (let i = 0; i < quantity; i++) {
        const data = await Cls.createWithContents([item]);
        itemData.push(...data);
      }

      continue;
    }

    const existing = ["consumable", "loot"].includes(item.type) ? actor.itemTypes[item.type].find(c => {
      return (c.name === item.name) && (c._stats.compendiumSource === item.uuid);
    }) : null;

    // Existing consumables get stacked.
    if (existing) {
      const update = itemUpdates.find(u => u._id === existing.id)
        ?? { _id: existing.id, "system.quantity": existing.system.quantity };
      if (!itemUpdates.includes(update)) itemUpdates.push(update);
      update["system.quantity"] += quantity;
      update.delta ??= 0;
      update.delta += quantity;

      continue;
    }

    // Creating new items.
    itemData.push(foundry.utils.mergeObject(game.items.fromCompendium(item), {
      "system.quantity": quantity,
    }));
  }

  return { itemData, itemUpdates };
}
