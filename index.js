/**
 * Default entry: inject layout CSS + start attribute → style wiring.
 *
 *   import "slatehtml";
 *
 * Prefer linking CSS yourself if you need styles before first paint:
 *
 *   import "slatehtml/css";
 *   import "slatehtml/slate.js";
 */

import { injectStyles } from "./inject-styles.js";
import { enhance, enhanceTree, boot, start } from "./widget.js";

export { enhance, enhanceTree, boot, start, injectStyles };
