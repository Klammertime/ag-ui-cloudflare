import { CopilotRuntime, copilotRuntimeNextJSAppRouterEndpoint } from '@copilotkit/runtime';
import { CloudflareProviders } from '@ag-ui/cloudflare-ai';
import { NextRequest } from 'next/server';

/**
 * Example Next.js API route for CopilotKit with Cloudflare AI
 * Place this in app/api/copilotkit/route.ts
 */

// Initialize the Cloudflare adapter
const serviceAdapter = CloudflareProviders.llama3_8b({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  apiToken: process.env.CLOUDFLARE_API_TOKEN!,
  systemPrompt: 'You are a helpful AI assistant powered by Cloudflare Workers AI.',
});

// Create CopilotKit runtime
const runtime = new CopilotRuntime();

// Define custom actions
runtime.addAction({
  name: 'analyzeCode',
  description: 'Analyze code for improvements',
  parameters: {
    code: {
      type: 'string',
      description: 'The code to analyze',
    },
    language: {
      type: 'string',
      description: 'Programming language',
    },
  },
  handler: async ({ code, language }) => {
    // Custom logic here
    return `Analyzing ${language} code...`;
  },
});

// Export the POST handler
export async function POST(req: NextRequest) {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: '/api/copilotkit',
  });

  return handleRequest(req);
}

/**
 * Client-side usage:
 *
 * import { CopilotKit } from "@copilotkit/react-core";
 * import { CopilotChat } from "@copilotkit/react-ui";
 *
 * function App() {
 *   return (
 *     <CopilotKit runtimeUrl="/api/copilotkit">
 *       <CopilotChat
 *         instructions="You are powered by Cloudflare AI at the edge!"
 *         labels={{
 *           title: "Edge AI Assistant",
 *           initial: "Hello! I'm running on Cloudflare's edge network."
 *         }}
 *       />
 *     </CopilotKit>
 *   );
 * }
 */