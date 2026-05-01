const fs = require('fs');
const path = 'C:/Users/Jennie Chu/Desktop/Projects/paperclip/server/src/channels/zalo-personal/protocol/send.ts';
let code = fs.readFileSync(path, 'utf-8');

code = code.replace(
  "const url = new URL(`${session.loginInfo.zpw_service_map_v3.chat[0]}/api/message/asyncfile/msg`);",
  "const url = new URL(`${session.loginInfo.zpw_service_map_v3.chat[0]}/api/message/asyncfile/msg`);\n  console.log(`[ZaloSend] sendDMFile url: ${url.toString()}`);"
);

fs.writeFileSync(path, code, 'utf-8');
console.log('done');
