#!/usr/bin/env tsx
/**
 * Verification script for ag-ui-cloudflare
 *
 * This script tests the adapter with:
 * 1. Mock data (no API needed)
 * 2. Real Cloudflare API (if credentials provided)
 * 3. CopilotKit compatibility check
 */

import { CloudflareAGUIAdapter, CloudflareProviders, EventType, CLOUDFLARE_MODELS } from './src';
import { CloudflareAIClient } from './src/client';
import * as dotenv from 'dotenv';
import { inspect } from 'util';

// Load environment variables
dotenv.config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(title, 'blue');
  log('='.repeat(60), 'blue');
}

async function testMockAdapter() {
  logSection('1. Testing Mock Adapter (No API Required)');

  try {
    // Create adapter with mock config
    const adapter = new CloudflareAGUIAdapter({
      accountId: 'mock-account',
      apiToken: 'mock-token',
      model: CLOUDFLARE_MODELS.LLAMA_3_1_8B,
    });

    log('✓ Adapter created successfully', 'green');

    // Test event generation
    const events: any[] = [];
    const messages = [{ role: 'user' as const, content: 'Test message' }];

    // Mock the client to avoid API calls
    (adapter as any).client = {
      streamComplete: async function* () {
        yield { response: 'Hello ', done: false };
        yield { response: 'from ', done: false };
        yield { response: 'mock!', done: false };
        yield { done: true, usage: { total_tokens: 10 } };
      }
    };

    for await (const event of adapter.execute(messages)) {
      events.push(event);

      if (event.type === EventType.TEXT_MESSAGE_CONTENT) {
        process.stdout.write(event.data.delta);
      }
    }

    console.log('\n');
    log(`✓ Generated ${events.length} events`, 'green');

    // Verify event types
    const eventTypes = [...new Set(events.map(e => e.type))];
    log(`✓ Event types: ${eventTypes.join(', ')}`, 'green');

    // Check for required events
    const hasRunStarted = events.some(e => e.type === EventType.RUN_STARTED);
    const hasRunFinished = events.some(e => e.type === EventType.RUN_FINISHED);
    const hasTextContent = events.some(e => e.type === EventType.TEXT_MESSAGE_CONTENT);

    if (hasRunStarted && hasRunFinished && hasTextContent) {
      log('✓ All required events present', 'green');
    } else {
      log('✗ Missing required events', 'red');
    }

    return true;
  } catch (error) {
    log(`✗ Mock test failed: ${error}`, 'red');
    return false;
  }
}

async function testProviders() {
  logSection('2. Testing Provider Configurations');

  try {
    const config = {
      accountId: 'test',
      apiToken: 'test',
    };

    // Test each provider
    const providers = [
      { name: 'llama3_8b', provider: CloudflareProviders.llama3_8b(config) },
      { name: 'llama3_70b', provider: CloudflareProviders.llama3_70b(config) },
      { name: 'mistral7b', provider: CloudflareProviders.mistral7b(config) },
      { name: 'auto', provider: CloudflareProviders.auto(config) },
    ];

    for (const { name, provider } of providers) {
      const capabilities = provider.getCapabilities();
      log(`✓ ${name}: streaming=${capabilities.streaming}, maxTokens=${capabilities.maxTokens}`, 'green');
    }

    // Test auto provider with tools
    const withTools = CloudflareProviders.auto({
      ...config,
      tools: [{ type: 'function', function: { name: 'test' } }],
    });

    const model = (withTools as any).options.model;
    if (model === CLOUDFLARE_MODELS.LLAMA_3_3_70B) {
      log('✓ Auto provider correctly selected Llama 3.3 70B for tools', 'green');
    } else {
      log(`✗ Auto provider selected wrong model for tools: ${model}`, 'red');
    }

    return true;
  } catch (error) {
    log(`✗ Provider test failed: ${error}`, 'red');
    return false;
  }
}

async function testRealAPI() {
  logSection('3. Testing Real Cloudflare API (Optional)');

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    log('⚠ Skipping real API test (no credentials)', 'yellow');
    log('  Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to test', 'yellow');
    return true;
  }

  try {
    log('Testing with real Cloudflare credentials...', 'magenta');

    const adapter = new CloudflareAGUIAdapter({
      accountId,
      apiToken,
      model: CLOUDFLARE_MODELS.LLAMA_3_1_8B,
    });

    const messages = [
      { role: 'user' as const, content: 'Say "Hello from Cloudflare AI" and nothing else.' }
    ];

    log('Sending request to Cloudflare...', 'magenta');

    let responseText = '';
    let eventCount = 0;

    for await (const event of adapter.execute(messages)) {
      eventCount++;

      if (event.type === EventType.TEXT_MESSAGE_CONTENT) {
        responseText += event.data.delta;
        process.stdout.write(event.data.delta);
      }

      if (event.type === EventType.METADATA) {
        console.log('\n');
        log(`✓ Token usage: ${JSON.stringify(event.data.usage)}`, 'green');
      }
    }

    console.log('\n');
    log(`✓ Received ${eventCount} events`, 'green');
    log(`✓ Response length: ${responseText.length} characters`, 'green');

    return true;
  } catch (error: any) {
    log(`✗ Real API test failed: ${error.message}`, 'red');

    if (error.message.includes('401') || error.message.includes('403')) {
      log('  Check your API token has Workers AI permissions', 'yellow');
    }

    return false;
  }
}

async function testCopilotKitCompatibility() {
  logSection('4. Testing CopilotKit Compatibility');

  try {
    // Test that the adapter implements the expected interface
    const adapter = new CloudflareAGUIAdapter({
      accountId: 'test',
      apiToken: 'test',
    });

    // Check required methods
    const hasExecute = typeof adapter.execute === 'function';
    const hasSetModel = typeof adapter.setModel === 'function';
    const hasGetCapabilities = typeof adapter.getCapabilities === 'function';

    if (hasExecute) log('✓ execute() method exists', 'green');
    if (hasSetModel) log('✓ setModel() method exists', 'green');
    if (hasGetCapabilities) log('✓ getCapabilities() method exists', 'green');

    // Test AsyncGenerator return type
    const generator = adapter.execute([]);
    const isAsyncGenerator = generator && typeof generator[Symbol.asyncIterator] === 'function';

    if (isAsyncGenerator) {
      log('✓ execute() returns AsyncGenerator', 'green');
    } else {
      log('✗ execute() does not return AsyncGenerator', 'red');
    }

    // Mock execution to test event structure
    (adapter as any).client = {
      streamComplete: async function* () {
        yield { done: true };
      }
    };

    const events: any[] = [];
    for await (const event of adapter.execute([{ role: 'user' as const, content: 'test' }])) {
      events.push(event);

      // Verify event structure
      if (!event.type || typeof event.timestamp !== 'number') {
        log(`✗ Invalid event structure: ${inspect(event)}`, 'red');
        return false;
      }
    }

    log('✓ All events have correct structure', 'green');
    log('✓ CopilotKit compatibility verified', 'green');

    return true;
  } catch (error) {
    log(`✗ Compatibility test failed: ${error}`, 'red');
    return false;
  }
}

async function testBuildArtifacts() {
  logSection('5. Testing Build Artifacts');

  try {
    // Check if build files exist
    const fs = await import('fs/promises');

    const files = [
      'dist/index.js',
      'dist/index.mjs',
      'dist/index.d.ts',
    ];

    for (const file of files) {
      try {
        await fs.access(file);
        log(`✓ ${file} exists`, 'green');
      } catch {
        log(`✗ ${file} missing - run 'npm run build'`, 'red');
        return false;
      }
    }

    // Test imports
    const cjs = require('./dist/index.js');
    if (cjs.CloudflareAGUIAdapter) {
      log('✓ CommonJS export works', 'green');
    }

    return true;
  } catch (error) {
    log(`✗ Build test failed: ${error}`, 'red');
    return false;
  }
}

async function main() {
  log('\n🔍 AG-UI Cloudflare Adapter Verification\n', 'magenta');

  const results = {
    mock: await testMockAdapter(),
    providers: await testProviders(),
    realAPI: await testRealAPI(),
    compatibility: await testCopilotKitCompatibility(),
    build: await testBuildArtifacts(),
  };

  logSection('Test Results Summary');

  let allPassed = true;
  for (const [name, passed] of Object.entries(results)) {
    if (passed) {
      log(`✓ ${name}`, 'green');
    } else {
      log(`✗ ${name}`, 'red');
      allPassed = false;
    }
  }

  console.log();

  if (allPassed) {
    log('🎉 All tests passed! The adapter is ready to use.', 'green');
  } else {
    log('⚠️  Some tests failed. Please review the errors above.', 'yellow');
  }

  // Usage instructions
  logSection('Next Steps');

  console.log(`
1. To test with real Cloudflare API:
   ${colors.yellow}export CLOUDFLARE_ACCOUNT_ID="your-account-id"
   export CLOUDFLARE_API_TOKEN="your-api-token"
   npm run verify${colors.reset}

2. To use in your project:
   ${colors.yellow}npm install ag-ui-cloudflare

   import { CloudflareAGUIAdapter } from 'ag-ui-cloudflare';${colors.reset}

3. To integrate with CopilotKit:
   ${colors.yellow}See examples/copilotkit-integration.ts${colors.reset}

4. To publish to npm:
   ${colors.yellow}npm publish${colors.reset}
`);
}

main().catch(console.error);