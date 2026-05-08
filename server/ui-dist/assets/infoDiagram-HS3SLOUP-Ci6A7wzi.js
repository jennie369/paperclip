import { _ as __name, l as log, I as selectSvgElement, d as configureSvgSize, K as package_default } from './mermaid.core-DLfojo-Y.js';
import { p as parse } from './treemap-GDKQZRPO-Co-Dh34l.js';
import './index-DNX_Fd1q.js';
import './step-Si4CteYF.js';
import './_baseUniq-CXTLBuHa.js';
import './_basePickBy-C7pstbS-.js';
import './clone-HYMpD18t.js';

var parser = {
  parse: /* @__PURE__ */ __name(async (input) => {
    const ast = await parse("info", input);
    log.debug(ast);
  }, "parse")
};

// src/diagrams/info/infoDb.ts
var DEFAULT_INFO_DB = {
  version: package_default.version + ("" )
};
var getVersion = /* @__PURE__ */ __name(() => DEFAULT_INFO_DB.version, "getVersion");
var db = {
  getVersion
};

// src/diagrams/info/infoRenderer.ts
var draw = /* @__PURE__ */ __name((text, id, version) => {
  log.debug("rendering info diagram\n" + text);
  const svg = selectSvgElement(id);
  configureSvgSize(svg, 100, 400, true);
  const group = svg.append("g");
  group.append("text").attr("x", 100).attr("y", 40).attr("class", "version").attr("font-size", 32).style("text-anchor", "middle").text(`v${version}`);
}, "draw");
var renderer = { draw };

// src/diagrams/info/infoDiagram.ts
var diagram = {
  parser,
  db,
  renderer
};

export { diagram };
