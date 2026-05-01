const fs = require('fs');

['ui/src/components/Sidebar.tsx', 'ui/src/components/SidebarAgents.tsx', 'ui/src/components/SidebarProjects.tsx'].forEach(f => {
  let code = fs.readFileSync(f, 'utf8');
  // First, style={{ ... }}
  let newCode = code.replace(/style=\{\{([\s\S]*?)\}\}/g, (match, p1) => `{...{ style: {${p1}} }}`);
  // Second, style={object} (Not matching the above)
  newCode = newCode.replace(/style=\{([^{}]+)\}/g, (match, p1) => `{...{ style: ${p1} }}`);
  fs.writeFileSync(f, newCode);
});
console.log('Styles bypassed');
