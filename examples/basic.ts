import { CloudflareAGUIAdapter, CLOUDFLARE_MODELS, EventType } from 'ag-ui-cloudflare';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    console.error('❌ Missing environment variables!');
    console.log('CLOUDFLARE_ACCOUNT_ID:', accountId ? 'Set' : 'Not set');
    console.log('CLOUDFLARE_API_TOKEN:', apiToken ? 'Set (hidden)' : 'Not set');
    process.exit(1);
  }

  // Initialize adapter
  const adapter = new CloudflareAGUIAdapter({
    accountId,
    apiToken,
    model: CLOUDFLARE_MODELS.LLAMA_3_1_8B,
  });

  // Simple conversation
  const messages = [
    { role: 'user' as const, content: 'What is the capital of France?' }
  ];

  console.log('🚀 Starting conversation...\n');

  let contentReceived = false;
  for await (const event of adapter.execute(messages)) {
    switch (event.type) {
      case EventType.RUN_STARTED:
        console.log('▶️  Run started:', event.runId);
        break;

      case EventType.TEXT_MESSAGE_START:
        console.log('💬 Assistant is typing...');
        break;

      case EventType.TEXT_MESSAGE_CONTENT:
        contentReceived = true;
        process.stdout.write(event.data.delta);
        break;

      case EventType.TEXT_MESSAGE_END:
        console.log('\n✅ Message complete');
        break;

      case EventType.RUN_FINISHED:
        console.log('🏁 Run finished:', event.runId);
        if (!contentReceived) {
          console.log('⚠️  No content received!');
        }
        break;

      case EventType.METADATA:
        console.log('📊 Usage:', event.data);
        break;
    }
  }
}

main().catch(console.error);