/**
 * Prism language: `umc` — mirrors editors/vscode-umc/syntaxes/umc.tmLanguage.json
 *
 *   @parent / @extends
 *   --- html|template|preview|demo ---  → markup
 *   --- style|css ---                   → css
 *   --- script|js ---                   → javascript
 *   bare --- section --- headers
 *   @ ./file.html links
 *
 * Keep this in sync with the TextMate grammar when section names change.
 */
import Prism from "prismjs";
import "prismjs/components/prism-markup.js";
import "prismjs/components/prism-css.js";
import "prismjs/components/prism-clike.js";
import "prismjs/components/prism-javascript.js";

/** Section names from umc.tmLanguage.json (begin/end + section-header). */
const SECTION = "html|template|style|css|script|js|preview|demo";

/**
 * Body after a section header through the next header or true EOS.
 * Do not use `$` for EOS here: with /m it matches end-of-line and only the
 * first line of each section would highlight (unlike TextMate's begin/end).
 */
function sectionBlock(names, language) {
  return {
    // Header line is lookbehind (highlighted by #section-header); body is language.
    pattern: new RegExp(
      `(^---\\s*(?:${names})\\s*---(?:\\r?\\n|\\n))[\\s\\S]*?(?=^---\\s*(?:${SECTION})\\s*---|(?![\\s\\S]))`,
      "m"
    ),
    lookbehind: true,
    greedy: true,
    inside: language,
  };
}

Prism.languages.umc = Prism.languages.extend("markup", {});

Prism.languages.insertBefore("umc", "comment", {
  // Order matches umc.tmLanguage.json `patterns` + repository.
  directive: {
    // parent-directive
    pattern: /^(@)\s*(parent|extends)\s+<?([a-z][\w-]*)>?\s*$/m,
    greedy: true,
    inside: {
      keyword: /^@|(?:parent|extends)/,
      "class-name": /[a-z][\w-]*/,
      punctuation: /[<>]/,
    },
  },
  // html-section + preview-section → text.html.basic
  "umc-html": sectionBlock("html|template|preview|demo", Prism.languages.markup),
  // style-section → source.css
  "umc-style": sectionBlock("style|css", Prism.languages.css),
  // script-section → source.js
  "umc-script": sectionBlock("script|js", Prism.languages.javascript),
  // section-header (headers for empty/trailing sections; also paints lookbehind lines
  // that Prism still tokenizes separately when not consumed)
  section: {
    pattern: new RegExp(`^---\\s*(?:${SECTION})\\s*---\\s*$`, "m"),
    alias: "important",
    inside: {
      "class-name": {
        pattern: new RegExp(`(?<=---\\s*)(?:${SECTION})(?=\\s*---)`),
        alias: "section-name",
      },
    },
  },
  // file-link (`@ ./path` at line start — TM uses \\A inside a section)
  "file-ref": {
    pattern: /^(@)\s+(\.\S+)\s*$/m,
    greedy: true,
    inside: {
      keyword: /^@/,
      string: /\.\S+/,
    },
  },
});

// Bare <script>/<style> in non-section snippets (gallery HTML-only demos).
if (Prism.languages.umc.tag?.addInlined) {
  Prism.languages.umc.tag.addInlined("script", "javascript");
  Prism.languages.umc.tag.addInlined("style", "css");
}

Prism.languages.slatehtml = Prism.languages.umc;

export { Prism };
export default Prism;
