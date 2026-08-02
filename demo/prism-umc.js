/**
 * Prism language: `umc`, SlateHTML UserWidget markup / .umc files.
 *
 * Based on markup, plus:
 *   --- html --- / --- style --- / --- script --- / --- preview ---
 *   @parent textblock   @extends …
 *   @ ./file.html
 */
import Prism from "prismjs";
import "prismjs/components/prism-markup.js";

Prism.languages.umc = Prism.languages.extend("markup", {});

Prism.languages.insertBefore("umc", "comment", {
  section: {
    pattern: /^---\s*(?:html|template|style|css|script|js|preview|demo)\s*---/m,
    alias: "important",
  },
  directive: {
    pattern: /^@(?:parent|extends)\b[^\n]*/m,
    greedy: true,
    inside: {
      keyword: {
        pattern: /^@(?:parent|extends)/,
        alias: "keyword",
      },
      punctuation: /[<>]/,
      "class-name": /[\w-]+/,
    },
  },
  "file-ref": {
    pattern: /^@\s+\.\S+/m,
    greedy: true,
    inside: {
      keyword: /^@/,
      string: /\S+$/,
    },
  },
});

Prism.languages.slatehtml = Prism.languages.umc;

export { Prism };
export default Prism;
