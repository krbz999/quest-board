/** @import {HotReloadData} from "@client/types.mjs" */

/**
 * Fix to allow importing in css.
 * @param {HotReloadData} data   Hot reload data.
 */
export default function hotReload(data) {
  if (data.packageType !== "module") return;
  if (!data.path.startsWith("modules/quest-board/styles/")) return;

  // Taken from core's `Game##hotReloadCSS`
  const pathRegex = new RegExp("@import \"modules/quest-board/module.css(?:\\?[^\"]+)?\"");
  for (const style of document.querySelectorAll("style")) {
    const [match] = style.textContent.match(pathRegex) ?? [];
    if (match) {
      style.textContent = style.textContent.replace(match, `@import "modules/quest-board/module.css?${Date.now()}"`);
      return;
    }
  }
}
