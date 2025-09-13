# Testing ag-ui-cloudflare with CopilotKit

## Quick Test in Your CopilotKit Project

### 1. Install the Package

```bash
# In your CopilotKit project directory
npm link /Users/audreyklammer/Apps/Agentforge/packages/ag-ui-cloudflare-ai
```

### 2. Update Your API Route

Replace your existing `/app/api/copilotkit/route.ts`:

```typescript
import { CopilotRuntime, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";
import { CloudflareAGUIAdapter, CloudflareProviders } from "ag-ui-cloudflare";
import { NextRequest } from "next/server";

// Initialize with your Cloudflare credentials
const serviceAdapter = CloudflareProviders.llama3_8b({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  apiToken: process.env.CLOUDFLARE_API_TOKEN!,
});

const runtime = new CopilotRuntime();

export async function POST(req: NextRequest) {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
}
```

### 3. Add Environment Variables

In your `.env.local`:

```bash
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here
```

### 4. Test the Integration

Run your CopilotKit app and verify:

1. **Chat Messages Work**: Send a message and get a response
2. **Streaming Works**: Response appears character by character
3. **Context Works**: Previous messages are remembered
4. **Tools Work** (if using Llama 3.3 70B): Function calls execute

## Debugging Tips

### Check Events in Browser DevTools

```javascript
// In browser console
window.__COPILOTKIT_DEBUG__ = true;
```

### Verify Adapter Events

The adapter should emit these events in order:
1. `RUN_STARTED`
2. `TEXT_MESSAGE_START`
3. `TEXT_MESSAGE_CONTENT` (multiple)
4. `TEXT_MESSAGE_END`
5. `RUN_FINISHED`

### Common Issues

**Issue: No response from Cloudflare**
- Check API token has "Workers AI" permissions
- Verify account ID is correct
- Try with a simple curl command first

**Issue: Streaming not working**
- Ensure `streamingEnabled` is not set to `false`
- Check that your model supports streaming

**Issue: Function calling not working**
- Only Llama 3.3 70B supports function calling
- Use `CloudflareProviders.llama3_3_70b()` or `auto()` with tools

## Performance Comparison

Run this in your app to compare performance:

```typescript
// Time OpenAI
console.time('OpenAI');
const openaiResponse = await fetch('/api/copilotkit-openai', {
  method: 'POST',
  body: JSON.stringify({ message: 'Hello' })
});
console.timeEnd('OpenAI'); // ~350ms

// Time Cloudflare
console.time('Cloudflare');
const cfResponse = await fetch('/api/copilotkit', {
  method: 'POST',
  body: JSON.stringify({ message: 'Hello' })
});
console.timeEnd('Cloudflare'); // ~110ms
```

## Cost Tracking

Add this to your route to track costs:

```typescript
let totalTokens = 0;

for await (const event of adapter.execute(messages)) {
  if (event.type === 'METADATA' && event.data.usage) {
    totalTokens += event.data.usage.total_tokens;
    const cost = (totalTokens / 1_000_000) * 11; // $11 per million
    console.log(`Cost so far: $${cost.toFixed(4)}`);
  }
}
```

## Full Example App

See `/copilotkit-cloudflare-demo` for a complete working example with:
- Next.js 15 App Router
- CopilotKit UI components
- Cloudflare AI integration
- Tool calling examples
- Cost tracking dashboard