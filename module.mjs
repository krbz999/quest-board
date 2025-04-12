import * as applications from "./scripts/applications/_module.mjs";
import * as config from "./scripts/config.mjs";
import * as data from "./scripts/data/_module.mjs";
import * as utils from "./scripts/utils/_module.mjs";

globalThis.QUESTBOARD = {
  applications,
  config,
  data,
  utils,
  id: "quest-board",
  /**
   * A semaphore for handling socketed requests in order.
   * @type {InstanceType<foundry["utils"]["Semaphore"]>}
   */
  semaphore: null,
};

/* -------------------------------------------------- */

Hooks.once("init", () => {
  Object.assign(CONFIG.JournalEntryPage.dataModels, {
    [`${QUESTBOARD.id}.quest`]: data.journalEntryPages.QuestData,
    [`${QUESTBOARD.id}.shop`]: data.journalEntryPages.ShopData,
    [`${QUESTBOARD.id}.track`]: data.journalEntryPages.TrackData,
  });
  Object.assign(CONFIG.JournalEntryPage.typeIcons, {
    [`${QUESTBOARD.id}.quest`]: applications.sheets.journal.QuestPageSheet.DEFAULT_OPTIONS.window.icon,
    [`${QUESTBOARD.id}.shop`]: applications.sheets.journal.ShopPageSheet.DEFAULT_OPTIONS.window.icon,
    [`${QUESTBOARD.id}.track`]: applications.sheets.journal.TrackPageSheet.DEFAULT_OPTIONS.window.icon,
  });

  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.JournalEntryPage, QUESTBOARD.id, applications.sheets.journal.QuestPageSheet,
    { types: [`${QUESTBOARD.id}.quest`], makeDefault: true, label: "QUESTBOARD.QUEST.SHEET.LABEL" },
  );
  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.JournalEntryPage, QUESTBOARD.id, applications.sheets.journal.ShopPageSheet,
    { types: [`${QUESTBOARD.id}.shop`], makeDefault: true, label: "QUESTBOARD.SHOP.SHEET.LABEL" },
  );
  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.JournalEntryPage, QUESTBOARD.id, applications.sheets.journal.TrackPageSheet,
    { types: [`${QUESTBOARD.id}.track`], makeDefault: true, label: "QUESTBOARD.TRACK.SHEET.LABEL" },
  );

  CONFIG.queries.questboard = ({ type, config }) => {
    switch (type) {
      case "purchase":
        return data.journalEntryPages.ShopData._query(config);
    }
  };

  QUESTBOARD.semaphore = new foundry.utils.Semaphore(1);
});

/* -------------------------------------------------- */

Hooks.once("i18nInit", () => {
  dnd5e.utils.performPreLocalization(config);
});

/* -------------------------------------------------- */

Hooks.on("getJournalSheetEntryContext", data.journalEntryPages.QuestData.addContextMenuOptions);
Hooks.on("getJournalEntryPageContextOptions", data.journalEntryPages.QuestData.addContextMenuOptions);
