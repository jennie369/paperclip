import { s as styles_default, c as classRenderer_v3_unified_default, a as classDiagram_default, C as ClassDB } from './chunk-B4BG7PRW-DV-p-Eyw.js';
import { _ as __name } from './mermaid.core-6nQ267EM.js';
import './index-gVNMNdMv.js';
import './chunk-FMBD7UC4-Cd_LJOff.js';
import './chunk-55IACEB6-BmsTY6_P.js';
import './chunk-QN33PNHL-BVZvKdZR.js';
import './step-Si4CteYF.js';

// src/diagrams/class/classDiagram.ts
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
