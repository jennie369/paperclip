import { s as styles_default, b as stateRenderer_v3_unified_default, a as stateDiagram_default, S as StateDB } from './chunk-DI55MBZ5-CH9Lk1Yk.js';
import { _ as __name } from './mermaid.core-BQihjZZu.js';
import './index-vfZhbUFH.js';
import './chunk-55IACEB6-oxfW3sb5.js';
import './chunk-QN33PNHL-D967WL8p.js';
import './step-Si4CteYF.js';

// src/diagrams/state/stateDiagram-v2.ts
var diagram = {
  parser: stateDiagram_default,
  get db() {
    return new StateDB(2);
  },
  renderer: stateRenderer_v3_unified_default,
  styles: styles_default,
  init: /* @__PURE__ */ __name((cnf) => {
    if (!cnf.state) {
      cnf.state = {};
    }
    cnf.state.arrowMarkerAbsolute = cnf.arrowMarkerAbsolute;
  }, "init")
};

export { diagram };
