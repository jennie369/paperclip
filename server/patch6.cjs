const fs = require('fs');
const path = 'C:/Users/Jennie Chu/Desktop/Projects/paperclip/server/src/channels/zalo-personal/protocol/send.ts';
let code = fs.readFileSync(path, 'utf-8');

code = code.replace(
  "return { success: false, error: err.message };",
  "console.log('[ZaloSend] sendDMFile error:', err.response?.data || err.message);\n      return { success: false, error: err.response?.data?.error_message || err.message };"
);

fs.writeFileSync(path, code, 'utf-8');
console.log('done');
