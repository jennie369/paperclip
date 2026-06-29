import { s as styles_default, c as classRenderer_v3_unified_default, a as classDiagram_default, C as ClassDB } from './chunk-B4BG7PRW-CQ0i8sFF.js';
import { _ as __name } from './mermaid.core-BQihjZZu.js';
import './index-vfZhbUFH.js';
import './chunk-FMBD7UC4-DC6PYh1G.js';
import './chunk-55IACEB6-oxfW3sb5.js';
import './chunk-QN33PNHL-D967WL8p.js';
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
