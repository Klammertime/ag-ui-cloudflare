import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CloudflareAGUIAdapter } from '../src/adapter';
import { CloudflareAIClient } from '../src/client';
import { EventType } from '../src/events';

vi.mock('../src/client');

describe('CloudflareAGUIAdapter', () => {
  let adapter: CloudflareAGUIAdapter;
  const mockConfig = {
    accountId: 'test-account',
    apiToken: 'test-token',
    model: '@cf/meta/llama-3.1-8b-instruct' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new CloudflareAGUIAdapter(mockConfig);
  });

  describe('execute', () => {
    it('should emit run started and finished events', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const events: any[] = [];

      const mockStreamComplete = vi.fn().mockImplementation(async function* () {
        yield { response: 'Hi there!', done: false };
        yield { done: true };
      });

      (CloudflareAIClient as any).mockImplementation(() => ({
        streamComplete: mockStreamComplete,
        getModelCapabilities: vi.fn().mockReturnValue({ streaming: true }),
        listModels: vi.fn().mockResolvedValue([]),
      }));

      adapter = new CloudflareAGUIAdapter(mockConfig);

      for await (const event of adapter.execute(messages)) {
        events.push(event);
      }

      expect(events[0].type).toBe(EventType.RUN_STARTED);
      expect(events[events.length - 1].type).toBe(EventType.RUN_FINISHED);
    });

    it('should handle streaming text responses', async () => {
      const messages = [{ role: 'user' as const, content: 'Tell me a joke' }];
      const events: any[] = [];

      const mockStreamComplete = vi.fn().mockImplementation(async function* () {
        yield { response: 'Why did the ', done: false };
        yield { response: 'chicken cross ', done: false };
        yield { response: 'the road?', done: false };
        yield { done: true };
      });

      (CloudflareAIClient as any).mockImplementation(() => ({
        streamComplete: mockStreamComplete,
        getModelCapabilities: vi.fn().mockReturnValue({ streaming: true }),
        listModels: vi.fn().mockResolvedValue([]),
      }));

      adapter = new CloudflareAGUIAdapter(mockConfig);

      for await (const event of adapter.execute(messages)) {
        events.push(event);
      }

      const textContents = events.filter(e => e.type === EventType.TEXT_MESSAGE_CONTENT);
      expect(textContents).toHaveLength(3);
      expect(textContents[0].data.delta).toBe('Why did the ');
      expect(textContents[1].data.delta).toBe('chicken cross ');
      expect(textContents[2].data.delta).toBe('the road?');
    });

    it('should handle tool calls', async () => {
      const messages = [{ role: 'user' as const, content: 'Get weather' }];
      const tools = [{
        type: 'function' as const,
        function: {
          name: 'get_weather',
          description: 'Get weather for a location',
          parameters: { type: 'object', properties: {} },
        },
      }];

      const events: any[] = [];

      const mockStreamComplete = vi.fn().mockImplementation(async function* () {
        yield {
          tool_calls: [{
            id: 'call-1',
            type: 'function',
            function: {
              name: 'get_weather',
              arguments: '{"location": "NYC"}',
            },
          }],
          done: false,
        };
        yield { done: true };
      });

      (CloudflareAIClient as any).mockImplementation(() => ({
        streamComplete: mockStreamComplete,
        getModelCapabilities: vi.fn().mockReturnValue({ streaming: true }),
        listModels: vi.fn().mockResolvedValue([]),
      }));

      adapter = new CloudflareAGUIAdapter({ ...mockConfig, tools });

      for await (const event of adapter.execute(messages)) {
        events.push(event);
      }

      const toolCallStart = events.find(e => e.type === EventType.TOOL_CALL_START);
      expect(toolCallStart).toBeDefined();
      expect(toolCallStart.data.toolName).toBe('get_weather');
    });

    it('should handle errors gracefully', async () => {
      const messages = [{ role: 'user' as const, content: 'Test error' }];
      const events: any[] = [];

      const mockStreamComplete = vi.fn().mockRejectedValue(new Error('API Error'));

      (CloudflareAIClient as any).mockImplementation(() => ({
        streamComplete: mockStreamComplete,
        getModelCapabilities: vi.fn().mockReturnValue({ streaming: true }),
        listModels: vi.fn().mockResolvedValue([]),
      }));

      adapter = new CloudflareAGUIAdapter(mockConfig);

      try {
        for await (const event of adapter.execute(messages)) {
          events.push(event);
        }
      } catch (error) {
        // Expected error
      }

      const errorEvent = events.find(e => e.type === EventType.RUN_ERROR);
      expect(errorEvent).toBeDefined();
      expect(errorEvent.data.message).toBe('API Error');
    });

    it('should include system prompt when configured', async () => {
      const systemPrompt = 'You are a helpful assistant';
      const messages = [{ role: 'user' as const, content: 'Hello' }];

      const mockStreamComplete = vi.fn().mockImplementation(async function* () {
        yield { response: 'Hi!', done: false };
        yield { done: true };
      });

      (CloudflareAIClient as any).mockImplementation(() => ({
        streamComplete: mockStreamComplete,
        getModelCapabilities: vi.fn().mockReturnValue({ streaming: true }),
        listModels: vi.fn().mockResolvedValue([]),
      }));

      adapter = new CloudflareAGUIAdapter({ ...mockConfig, systemPrompt });

      for await (const event of adapter.execute(messages)) {
        // Process events
      }

      expect(mockStreamComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Hello' },
          ],
        })
      );
    });
  });

  describe('progressiveGeneration', () => {
    it('should handle multi-stage generation', async () => {
      const stages = [
        { name: 'Outline', instruction: 'Create an outline' },
        { name: 'Draft', instruction: 'Write the draft' },
      ];

      const events: any[] = [];

      const mockExecute = vi.fn().mockImplementation(async function* () {
        yield { type: EventType.TEXT_MESSAGE_CONTENT, data: { delta: 'Content' } };
      });

      adapter.execute = mockExecute as any;

      for await (const event of adapter.progressiveGeneration('Write a story', stages)) {
        events.push(event);
      }

      const progressEvents = events.filter(e => e.type === EventType.PROGRESS);
      expect(progressEvents).toHaveLength(2);
      expect(progressEvents[0].data.progress).toBe(50);
      expect(progressEvents[1].data.progress).toBe(100);
    });
  });

  describe('model management', () => {
    it('should set and get model', () => {
      const mockGetCapabilities = vi.fn().mockReturnValue({ streaming: true });
      (CloudflareAIClient as any).mockImplementation(() => ({
        getModelCapabilities: mockGetCapabilities,
        streamComplete: vi.fn(),
      }));

      adapter = new CloudflareAGUIAdapter(mockConfig);
      adapter.setModel('@cf/mistral/mistral-7b-instruct-v0.2');
      const capabilities = adapter.getCapabilities();
      expect(capabilities.streaming).toBe(true);
    });

    it('should list available models', async () => {
      const mockListModels = vi.fn().mockResolvedValue([
        '@cf/meta/llama-3.1-8b-instruct',
        '@cf/mistral/mistral-7b-instruct-v0.2',
      ]);

      (CloudflareAIClient as any).mockImplementation(() => ({
        listModels: mockListModels,
      }));

      adapter = new CloudflareAGUIAdapter(mockConfig);
      const models = await adapter.listAvailableModels();

      expect(models).toContain('@cf/meta/llama-3.1-8b-instruct');
      expect(models).toContain('@cf/mistral/mistral-7b-instruct-v0.2');
    });
  });
});