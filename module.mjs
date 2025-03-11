import * as configuration from "./scripts/config.mjs";
import ItemRewardsField from "./scripts/item-rewards-field.mjs";
import QuestModel from "./scripts/quest-model.mjs";
import QuestPageEditor from "./scripts/quest-page-editor.mjs";

globalThis.QUESTBOARD = {
  config: configuration,
  data: {
    QuestModel,
    fields: {
      ItemRewardsField,
    },
  },
  applications: {
    sheets: {
      QuestPageEditor,
    },
  },
};

/* -------------------------------------------------- */

Hooks.once("init", function() {
  Object.assign(CONFIG.JournalEntryPage.dataModels, {
    "quest-board.quest": QuestModel,
  });
  Object.assign(CONFIG.JournalEntryPage.typeIcons, {
    "quest-board.quest": "fa-solid fa-award",
  });

  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, "quest-board", QuestPageEditor, {
    types: ["quest-board.quest"],
    makeDefault: true,
    label: "QUESTBOARD.SHEET.LABEL",
  });
});

/* -------------------------------------------------- */

Hooks.once("i18nInit", () => {
  dnd5e.utils.performPreLocalization(QUESTBOARD.config);
});

/* -------------------------------------------------- */

Hooks.on("getJournalSheetEntryContext", (sheet, options) => {
  const getPage = li => sheet.document.pages.get(li.dataset.pageId);
  options.push({
    name: "QUESTBOARD.VIEW.CONTEXT.award",
    icon: "<i class='fa-solid fa-fw fa-award'></i>",
    condition: li => game.user.isGM && (getPage(li)?.type === "quest-board.quest"),
    callback: li => getPage(li).system.grantRewardsDialog(),
  }, {
    name: "QUESTBOARD.VIEW.CONTEXT.complete",
    icon: "<i class='fa-solid fa-fw fa-circle-check'></i>",
    condition: li => {
      const page = getPage(li);
      return game.user.isGM && (page?.type === "quest-board.quest") && !page.system.complete;
    },
    callback: li => getPage(li).update({ "system.complete": true }),
  });
});
