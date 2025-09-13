import { CloudflareProviders, EventType } from '../src';

// Mock tool implementation
async function getWeather(location: string): Promise<string> {
  return `The weather in ${location} is sunny and 72°F`;
}

async function main() {
  // Define tools
  const tools = [{
    type: 'function' as const,
    function: {
      name: 'get_weather',
      description: 'Get the current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and state, e.g., San Francisco, CA'
          }
        },
        required: ['location']
      }
    }
  }];

  // Use auto provider to select best model for tools
  const adapter = CloudflareProviders.auto({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    apiToken: process.env.CLOUDFLARE_API_TOKEN!,
    tools, // Will automatically select Llama 3.3 70B
  });

  const messages = [
    { role: 'user' as const, content: "What's the weather in New York?" }
  ];

  console.log('🤖 Assistant with tools enabled\n');

  let toolCallId: string | null = null;
  let toolName: string | null = null;
  let toolArgs = '';

  for await (const event of adapter.execute(messages)) {
    switch (event.type) {
      case EventType.TOOL_CALL_START:
        toolCallId = event.data.toolCallId;
        toolName = event.data.toolName;
        console.log(`🔧 Calling tool: ${toolName}`);
        break;

      case EventType.TOOL_CALL_ARGS:
        toolArgs += event.data.argsDelta;
        break;

      case EventType.TOOL_CALL_END:
        console.log(`📥 Tool arguments: ${toolArgs}`);

        // Execute the actual tool
        if (toolName === 'get_weather') {
          const args = JSON.parse(toolArgs);
          const result = await getWeather(args.location);
          console.log(`📤 Tool result: ${result}`);

          // Continue conversation with tool result
          messages.push({
            role: 'tool' as const,
            content: result,
            tool_call_id: toolCallId!,
          });
        }
        break;

      case EventType.TEXT_MESSAGE_CONTENT:
        process.stdout.write(event.data.delta);
        break;

      case EventType.TEXT_MESSAGE_END:
        console.log('\n');
        break;
    }
  }
}

main().catch(console.error);