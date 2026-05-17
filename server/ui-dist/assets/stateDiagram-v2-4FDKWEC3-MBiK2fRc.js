import { s as styles_default, b as stateRenderer_v3_unified_default, a as stateDiagram_default, S as StateDB } from './chunk-DI55MBZ5-B3DqjR7v.js';
import { _ as __name } from './mermaid.core-BZIB5ci8.js';
import './index-Cxd0f6Om.js';
import './chunk-55IACEB6-BDB3F-gR.js';
import './chunk-QN33PNHL-Ck6NbDZK.js';
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
