import { s as styles_default, c as classRenderer_v3_unified_default, a as classDiagram_default, C as ClassDB } from './chunk-B4BG7PRW-B6uCSmuD.js';
import { _ as __name } from './mermaid.core-C_2SeKLZ.js';
import './index-B6bTFNAD.js';
import './chunk-FMBD7UC4-BriU4KtT.js';
import './chunk-55IACEB6-CkGKXA0y.js';
import './chunk-QN33PNHL-CJYM6_dv.js';
import './step-Si4CteYF.js';

// src/diagrams/class/classDiagram-v2.ts
var diagram = {
  parser: classDiagram_default,
  get db() {
    return new ClassDB();
  },
  renderer: classRenderer_v3_unified_default,
  styles: styles_default,
  init: /* @__PURE__ */ __name((cnf) => {
    if (!cnf.class) {
      cnf.class = {};
    }
    cnf.class.arrowMarkerAbsolute = cnf.arrowMarkerAbsolute;
  }, "init")
};

export { diagram };
