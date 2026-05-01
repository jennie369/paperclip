import { config } from 'dotenv';
config();
import { ZaloPersonalChannel } from './src/channels/zalo-personal/channel.js';
import { ConfigService } from './src/config.js';

async function main() {
  await ConfigService.init();
  const channel = new ZaloPersonalChannel('zalo-personal-1777562011968');
  const ok = await channel.startFromDB();
  if (!ok) {
    console.error("Failed to start channel from DB");
    process.exit(1);
  }
  console.log("Channel started");

  const testFile = 'C:/Users/Jennie Chu/Desktop/Projects/crypto-pattern-scanner/raw/mock-marketing-assets/Bao-Gia-Dich-Vu-2026.pdf';
  const recipientId = '4293354064935992694';
  
  console.log("Sending file...");
  const result = await channel.sendFile(recipientId, testFile, 'dm', 'Dạ đây là báo giá 2026 cho dịch vụ bên em ạ.');
  console.log("Send result:", result);
  
  setTimeout(() => process.exit(0), 5000);
}
main().catch(console.error);
