import * as applications from "./scripts/applications/_module.mjs";
import * as config from "./scripts/config.mjs";
import * as data from "./scripts/data/_module.mjs";

globalThis.QUESTBOARD = {
  applications,
  config,
  data,
  id: "quest-board",
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

  /**
   * Register a journal entry page sheet.
   * @param {typeof applications.sheets.journal.AbstractPageSheet} Cls    The journal entry page sheet.
   * @param {string} type                                                 The page subtype (without prefix).
   */
  const registerSheet = (Cls, type) => {
    foundry.applications.apps.DocumentSheetConfig.registerSheet(
      foundry.documents.JournalEntryPage, QUESTBOARD.id, Cls,
      { types: [`${QUESTBOARD.id}.${type}`], makeDefault: true, label: `QUESTBOARD.SHEET.LABEL.${type}` },
    );
  };
  registerSheet(applications.sheets.journal.QuestPageSheet, "quest");
  registerSheet(applications.sheets.journal.ShopPageSheet, "shop");
  registerSheet(applications.sheets.journal.TrackPageSheet, "track");

  data.journalEntryPages.ShopData.assignQueries();
});

/* -------------------------------------------------- */

Hooks.once("i18nInit", () => {
  dnd5e.utils.performPreLocalization(config);
});

/* -------------------------------------------------- */

Hooks.on("getJournalSheetEntryContext", data.journalEntryPages.QuestData.addContextMenuOptions);
Hooks.on("getJournalEntryPageContextOptions", data.journalEntryPages.QuestData.addContextMenuOptions);
