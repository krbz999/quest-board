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
  });
  Object.assign(CONFIG.JournalEntryPage.typeIcons, {
    [`${QUESTBOARD.id}.quest`]: "fa-solid fa-award",
    [`${QUESTBOARD.id}.shop`]: "fa-solid fa-shop",
  });

  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.JournalEntryPage,
    QUESTBOARD.id,
    applications.sheets.journal.QuestPageSheet,
    {
      types: [`${QUESTBOARD.id}.quest`],
      makeDefault: true,
      label: "QUESTBOARD.SHEET.LABEL.quest",
    },
  );
  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    foundry.documents.JournalEntryPage,
    QUESTBOARD.id,
    applications.sheets.journal.ShopPageSheet,
    {
      types: [`${QUESTBOARD.id}.shop`],
      makeDefault: true,
      label: "QUESTBOARD.SHEET.LABEL.shop",
    },
  );

  data.journalEntryPages.ShopData.assignQueries();
});

/* -------------------------------------------------- */

Hooks.once("i18nInit", () => {
  dnd5e.utils.performPreLocalization(config);
});

/* -------------------------------------------------- */

Hooks.on("getJournalSheetEntryContext", data.journalEntryPages.QuestData.addContextMenuOptions);
Hooks.on("getJournalEntryPageContextOptions", data.journalEntryPages.QuestData.addContextMenuOptions);
