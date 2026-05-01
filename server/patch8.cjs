const fs = require('fs');
const path = 'C:/Users/Jennie Chu/Desktop/Projects/openclaw/node_modules/zca-js/dist/apis/sendMessage.js';
let code = fs.readFileSync(path, 'utf-8');

code = code.replace(
  'const encryptedParams = utils.encodeAES(JSON.stringify(data.params));',
  'console.log("[zca-js] Stringified params for AES:", JSON.stringify(data.params));\n            const encryptedParams = utils.encodeAES(JSON.stringify(data.params));'
);

fs.writeFileSync(path, code, 'utf-8');
console.log('done');
