import * as config from "./scripts/config.mjs";
import * as applications from "./scripts/applications/_module.mjs";
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

Hooks.on("getJournalSheetEntryContext", (sheet, options) => {
  const getPage = li => sheet.document.pages.get(li.dataset.pageId);
  options.push({
    name: "QUESTBOARD.QUEST.VIEW.CONTEXT.award",
    icon: "<i class='fa-solid fa-fw fa-award'></i>",
    condition: li => game.user.isGM && (getPage(li).type === `${QUESTBOARD.id}.quest`),
    callback: li => getPage(li).system.grantRewardsDialog(),
  }, {
    name: "QUESTBOARD.QUEST.VIEW.CONTEXT.complete",
    icon: "<i class='fa-solid fa-fw fa-circle-check'></i>",
    condition: li => {
      const page = getPage(li);
      return game.user.isGM && (page.type === `${QUESTBOARD.id}.quest`) && !page.system.complete;
    },
    callback: li => getPage(li).update({ "system.complete": true }),
  });
});
