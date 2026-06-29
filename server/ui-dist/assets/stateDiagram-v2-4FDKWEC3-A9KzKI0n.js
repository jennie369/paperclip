import { s as styles_default, b as stateRenderer_v3_unified_default, a as stateDiagram_default, S as StateDB } from './chunk-DI55MBZ5-KQP_uNnw.js';
import { _ as __name } from './mermaid.core-Cu6OeCvT.js';
import './index-C7HOhyqm.js';
import './chunk-55IACEB6-ChdpRoda.js';
import './chunk-QN33PNHL-I4mRnrC8.js';
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
