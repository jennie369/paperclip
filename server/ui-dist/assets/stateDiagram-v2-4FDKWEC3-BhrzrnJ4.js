import { s as styles_default, b as stateRenderer_v3_unified_default, a as stateDiagram_default, S as StateDB } from './chunk-DI55MBZ5-CM37ASl5.js';
import { _ as __name } from './mermaid.core-Db7Y0L7V.js';
import './index-C5Qt9Trz.js';
import './chunk-55IACEB6-CiPqEQKr.js';
import './chunk-QN33PNHL-BDPGYOQX.js';
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
