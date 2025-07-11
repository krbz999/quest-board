import postcss from "rollup-plugin-postcss";
import resolve from "@rollup/plugin-node-resolve";
import postcssImport from "postcss-import";
import path from "path";

export default {
  input: "./_quest-board.mjs",
  output: {
    file: "./public/quest-board.mjs",
    format: "esm",
  },
  plugins: [
    resolve(),
    postcss({
      plugins: [postcssImport()],
      extract: true,
    }),
  ],
};
