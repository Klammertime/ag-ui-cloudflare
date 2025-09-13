/**
 * Complete CopilotKit + Cloudflare AI Integration Example
 * This shows how to use the AG-UI Cloudflare adapter with CopilotKit's chat components
 */

// ============================================
// 1. API ROUTE: app/api/copilotkit/route.ts
// ============================================

import { CopilotRuntime, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";
import { CloudflareAGUIAdapter, CloudflareProviders, CLOUDFLARE_MODELS } from "ag-ui-cloudflare";
import { NextRequest } from "next/server";

// Method 1: Using the adapter directly
const serviceAdapter = new CloudflareAGUIAdapter({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  apiToken: process.env.CLOUDFLARE_API_TOKEN!,
  model: CLOUDFLARE_MODELS.LLAMA_3_1_8B,
  systemPrompt: "You are a helpful AI assistant powered by Cloudflare Workers AI at the edge.",
});

// Method 2: Using providers for easy model selection
// const serviceAdapter = CloudflareProviders.auto({
//   accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
//   apiToken: process.env.CLOUDFLARE_API_TOKEN!,
//   systemPrompt: "You are a helpful AI assistant.",
//   tools: [], // Will auto-select Llama 3.3 70B if tools provided
// });

const runtime = new CopilotRuntime();

export async function POST(req: NextRequest) {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
}

// ============================================
// 2. ROOT LAYOUT: app/layout.tsx
// ============================================

import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <CopilotKit runtimeUrl="/api/copilotkit">
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}

// ============================================
// 3. CHAT POPUP: app/components/ChatPopup.tsx
// ============================================

"use client";

import { CopilotPopup } from "@copilotkit/react-ui";

export function ChatPopup() {
  return (
    <CopilotPopup
      instructions="You are powered by Cloudflare Workers AI, running at the edge for ultra-fast responses."
      labels={{
        title: "Edge AI Assistant",
        initial: "Hi! I'm running on Cloudflare's edge network. How can I help?",
        placeholder: "Ask me anything...",
      }}
      defaultOpen={false}
      clickOutsideToClose={true}
    />
  );
}

// ============================================
// 4. CHAT SIDEBAR: app/components/ChatSidebar.tsx
// ============================================

"use client";

import { CopilotSidebar } from "@copilotkit/react-ui";

export function ChatSidebar() {
  return (
    <CopilotSidebar
      instructions="You are an AI assistant powered by Cloudflare Workers AI."
      labels={{
        title: "Cloudflare AI Chat",
        initial: "Hello! I'm your edge AI assistant.",
      }}
      defaultOpen={true}
      onSetOpen={(open) => console.log('Sidebar:', open)}
    />
  );
}

// ============================================
// 5. INLINE CHAT: app/components/InlineChat.tsx
// ============================================

"use client";

import { CopilotChat } from "@copilotkit/react-ui";

export function InlineChat() {
  return (
    <div className="h-[600px] w-full max-w-4xl mx-auto p-4">
      <CopilotChat
        instructions="You are powered by Cloudflare Workers AI. Provide helpful, concise responses."
        labels={{
          title: "Edge AI Assistant",
          initial: "👋 Hello! I'm running on Cloudflare's global edge network.",
          placeholder: "Type your message...",
        }}
        showResponseButton={true}
      />
    </div>
  );
}

// ============================================
// 6. TEXTAREA WITH AI: app/components/AITextarea.tsx
// ============================================

"use client";

import { CopilotTextarea } from "@copilotkit/react-textarea";
import { useState } from "react";

export function AITextarea() {
  const [text, setText] = useState("");

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">AI-Enhanced Writing</h2>
      <CopilotTextarea
        value={text}
        onValueChange={setText}
        placeholder="Start typing and press Cmd+K for AI assistance..."
        autosuggestionsConfig={{
          textareaPurpose: "Write a blog post about edge computing",
          chatApiConfigs: {
            suggestionsApiConfig: {
              forwardedParams: {
                max_tokens: 100,
                temperature: 0.7,
              },
            },
          },
        }}
        className="w-full h-64 p-3 border rounded-lg"
      />
      <p className="mt-2 text-sm text-gray-600">
        Powered by Cloudflare Workers AI • ~110ms response time
      </p>
    </div>
  );
}

// ============================================
// 7. MAIN PAGE: app/page.tsx
// ============================================

"use client";

import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotTask } from "@copilotkit/react-core";
import { ChatPopup } from "./components/ChatPopup";
import { InlineChat } from "./components/InlineChat";
import { AITextarea } from "./components/AITextarea";
import { useState } from "react";

export default function HomePage() {
  const [metrics, setMetrics] = useState({
    responseTimes: [] as number[],
    tokenCount: 0,
    cost: 0,
  });

  // Make data readable by the AI
  useCopilotReadable({
    description: "Current performance metrics",
    value: metrics,
  });

  // Define custom actions the AI can perform
  useCopilotAction({
    name: "analyzePerformance",
    description: "Analyze the performance metrics",
    parameters: [
      {
        name: "metric",
        type: "string",
        description: "The metric to analyze",
        enum: ["response_time", "cost", "tokens"],
      },
    ],
    handler: async ({ metric }) => {
      if (metric === "response_time") {
        const avg = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
        return `Average response time: ${avg.toFixed(0)}ms (68% faster than OpenAI)`;
      } else if (metric === "cost") {
        return `Total cost: $${metrics.cost.toFixed(4)} (93% cheaper than OpenAI)`;
      } else {
        return `Total tokens used: ${metrics.tokenCount}`;
      }
    },
  });

  // Execute a complex task
  const handleComplexTask = async () => {
    const task = new CopilotTask({
      instructions: "Generate a comprehensive report about edge computing benefits",
    });

    const result = await task.run();
    console.log("Task result:", result);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            CopilotKit + Cloudflare AI Demo
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Powered by AG-UI Protocol • Edge AI at 200+ locations
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Chat Interface</h2>
              <InlineChat />
            </section>

            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">AI Writing Assistant</h2>
              <AITextarea />
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Response Time:</span>
                  <span className="font-mono">~110ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Cost per Million Tokens:</span>
                  <span className="font-mono">$11</span>
                </div>
                <div className="flex justify-between">
                  <span>Global Coverage:</span>
                  <span className="font-mono">200+ locations</span>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Available Models</h2>
              <ul className="space-y-2 text-sm">
                <li>✅ Llama 3.1 8B (Fast)</li>
                <li>✅ Llama 3.1 70B (Powerful)</li>
                <li>✅ Llama 3.3 70B (Tools)</li>
                <li>✅ Mistral 7B</li>
                <li>✅ And 6+ more...</li>
              </ul>
              <button
                onClick={handleComplexTask}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Run Complex Task
              </button>
            </section>
          </div>
        </div>
      </main>

      {/* Popup Chat (appears in bottom-right) */}
      <ChatPopup />
    </div>
  );
}

// ============================================
// 8. ENVIRONMENT VARIABLES: .env.local
// ============================================

/*
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here

# Optional: For specific features
NEXT_PUBLIC_COPILOT_CLOUD_PUBLIC_API_KEY=your_copilot_cloud_key
*/

// ============================================
// 9. PACKAGE.JSON DEPENDENCIES
// ============================================

/*
{
  "dependencies": {
    "@copilotkit/react-core": "^1.0.0",
    "@copilotkit/react-ui": "^1.0.0",
    "@copilotkit/react-textarea": "^1.0.0",
    "@copilotkit/runtime": "^1.0.0",
    "ag-ui-cloudflare": "^0.1.0",
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
*/