# Testing Checklist for @ag-ui/cloudflare-ai

## ✅ Automated Tests

Run all automated tests with:
```bash
npm run verify
```

This runs 5 test suites:
1. **Mock Adapter** - Tests without API calls
2. **Provider Configurations** - Validates all model providers
3. **Real API** (optional) - Tests with actual Cloudflare API
4. **CopilotKit Compatibility** - Verifies interface compliance
5. **Build Artifacts** - Checks distribution files

## ✅ Manual Testing Steps

### 1. Basic Functionality
```bash
# Test basic conversation
npm run example:basic

# Expected: Should see streaming response with event logs
```

### 2. Tool Calling (Function Calling)
```bash
# Test with tools/functions
npm run example:tools

# Expected: Tool calls should be detected and executed
```

### 3. Progressive Generation
```bash
# Test multi-stage generation
npm run example:progressive

# Expected: Progress bar and staged content generation
```

### 4. Real Cloudflare API
```bash
# Set credentials
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"

# Run verification with real API
npm run verify

# Expected: Section 3 should execute and return real response
```

### 5. TypeScript Compilation
```bash
# Check types
npm run typecheck

# Expected: No errors
```

### 6. Build Process
```bash
# Clean build
rm -rf dist/
npm run build

# Expected: Creates dist/ with .js, .mjs, and .d.ts files
```

### 7. Package Installation
```bash
# Test local installation
npm pack
cd /tmp
npm init -y
npm install /path/to/ag-ui-cloudflare-ai-0.1.0.tgz

# Create test file
cat > test.js << 'EOF'
const { CloudflareAGUIAdapter } = require('@ag-ui/cloudflare-ai');
console.log('Import successful:', !!CloudflareAGUIAdapter);
EOF

node test.js
# Expected: "Import successful: true"
```

## ✅ Integration Testing

### With CopilotKit

1. **Link Package**
```bash
# In this package directory
npm link

# In your CopilotKit project
npm link @ag-ui/cloudflare-ai
```

2. **Update API Route**
See `test-copilotkit.md` for full integration guide

3. **Test Features**
- [ ] Chat messages stream correctly
- [ ] Context is maintained between messages
- [ ] Tokens are counted in metadata
- [ ] Errors are handled gracefully

### With Different Models

Test each model for compatibility:

```javascript
const models = [
  '@cf/meta/llama-3.1-8b-instruct',      // ✅ Fast, general
  '@cf/meta/llama-3.1-70b-instruct',     // ✅ Powerful
  '@cf/meta/llama-3.3-70b-instruct',     // ✅ Tools support
  '@cf/mistral/mistral-7b-instruct-v0.2', // ✅ Alternative
];
```

## ✅ Performance Testing

### Response Time
```bash
# Run performance test
time npm run example:basic

# Expected: First token < 200ms
```

### Memory Usage
```bash
# Monitor memory
node --expose-gc --trace-gc examples/basic.ts

# Expected: No memory leaks during streaming
```

## ✅ Error Handling

Test these error scenarios:

1. **Invalid Credentials**
```bash
export CLOUDFLARE_API_TOKEN="invalid"
npm run verify
# Expected: Clear error message about authentication
```

2. **Network Timeout**
```javascript
// Disconnect network and run
adapter.execute([{ role: 'user', content: 'test' }])
// Expected: Timeout error with retry suggestion
```

3. **Invalid Model**
```javascript
adapter.setModel('invalid-model')
// Expected: Model validation error
```

## ✅ Security Testing

1. **No Credentials in Logs**
```bash
npm run verify 2>&1 | grep -i token
# Expected: No output (tokens not logged)
```

2. **Environment Variable Validation**
```javascript
new CloudflareAGUIAdapter({
  accountId: '',
  apiToken: ''
})
// Expected: Validation error
```

## 📊 Test Coverage Report

Run tests with coverage:
```bash
npm test -- --coverage

# Expected coverage:
# - Statements: > 80%
# - Branches: > 75%
# - Functions: > 80%
# - Lines: > 80%
```

## 🚀 Pre-Release Checklist

Before publishing to npm:

- [ ] All automated tests pass (`npm run verify`)
- [ ] TypeScript builds without errors (`npm run typecheck`)
- [ ] Examples run successfully
- [ ] Documentation is complete
- [ ] Package.json version is updated
- [ ] CHANGELOG is updated
- [ ] Real API test passes with valid credentials
- [ ] CopilotKit integration tested
- [ ] Performance meets targets (< 200ms first token)

## 📝 Known Issues

- Tests may timeout in watch mode (use `npm test` instead of `npm test:watch`)
- Vitest CJS warning is expected and doesn't affect functionality

## 🆘 Troubleshooting

If tests fail:

1. **Check Node version**: Requires Node 18+
2. **Clear cache**: `rm -rf node_modules dist && npm install`
3. **Rebuild**: `npm run build`
4. **Check dependencies**: `npm ls @ag-ui/core`

For help, check the examples/ directory or open an issue.