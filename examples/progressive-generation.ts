import { CloudflareAGUIAdapter, EventType, CLOUDFLARE_MODELS } from 'ag-ui-cloudflare';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    console.error('❌ Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables');
    console.log('   Copy .env.example to .env.local and add your credentials');
    process.exit(1);
  }

  const adapter = new CloudflareAGUIAdapter({
    accountId,
    apiToken,
    model: CLOUDFLARE_MODELS.LLAMA_3_1_8B, // Using 8B for faster iteration
  });

  // Topic for research - you can change this!
  const RESEARCH_TOPIC = 'How Cloudflare Workers AI is democratizing edge computing';

  // Define comprehensive research stages
  const stages = [
    {
      name: 'Research Phase',
      instruction: `Research the following aspects of "${RESEARCH_TOPIC}":
        1. Current state of edge computing and AI
        2. What makes Cloudflare Workers AI unique
        3. Cost comparison with traditional cloud AI
        4. Real-world use cases and success stories
        5. Technical advantages (latency, global distribution)
        Provide specific facts, numbers, and examples.`
    },
    {
      name: 'Outline Creation',
      instruction: `Based on the research, create a detailed outline with:
        - A compelling hook/angle
        - 3-4 main sections with subsections
        - Key points to cover in each section
        - Supporting data and examples to include
        Structure it as a technical blog post for developers.`
    },
    {
      name: 'Introduction & Hook',
      instruction: `Write a compelling introduction that:
        - Starts with a surprising statistic or fact
        - Explains why this matters to developers
        - Sets up the problem that edge AI solves
        - Previews what the article will cover
        Make it engaging and technically accurate.`
    },
    {
      name: 'Technical Deep Dive',
      instruction: `Write the main technical content covering:
        - How Cloudflare Workers AI actually works
        - Architecture and global network advantages
        - Performance benchmarks and latency numbers
        - Code examples or implementation patterns
        - Comparison with alternatives (OpenAI, AWS, Google)
        Include specific technical details developers care about.`
    },
    {
      name: 'Practical Applications',
      instruction: `Provide real-world applications and use cases:
        - Specific examples of companies using edge AI
        - Cost savings calculations
        - Performance improvements achieved
        - Step-by-step implementation guide
        - Best practices and optimization tips
        Make it actionable for developers.`
    },
    {
      name: 'Future Outlook & Conclusion',
      instruction: `Conclude with:
        - Future developments in edge AI
        - Predictions for the next 2-3 years
        - Call to action for developers
        - Resources for getting started
        - Summary of key takeaways
        End with impact and inspiration.`
    },
  ];

  const prompt = `You are a technical writer and edge computing expert. Write a comprehensive,
    technically accurate article about: "${RESEARCH_TOPIC}".
    Focus on real facts, actual performance numbers, and practical developer insights.
    Each section should build on the previous one to create a cohesive narrative.`;

  console.log('📝 Progressive Research & Article Generation\n');
  console.log(`📚 Topic: ${RESEARCH_TOPIC}\n`);
  console.log('=' .repeat(70) + '\n');

  let currentStage = '';
  let fullContent = '';
  const stageContents: Record<string, string> = {};
  let currentStageContent = '';

  // Track time
  const startTime = Date.now();

  for await (const event of adapter.progressiveGeneration(prompt, stages)) {
    switch (event.type) {
      case EventType.PROGRESS:
        // Save previous stage content
        if (currentStage && currentStageContent) {
          stageContents[currentStage] = currentStageContent;
          currentStageContent = '';
        }

        const progressBar = '█'.repeat(Math.floor(event.data.progress / 5));
        const emptyBar = '░'.repeat(20 - Math.floor(event.data.progress / 5));
        const stageNum = Math.ceil((event.data.progress / 100) * stages.length);

        console.log(`\n${'='.repeat(70)}`);
        console.log(`[${progressBar}${emptyBar}] ${event.data.progress.toFixed(0)}% Complete`);
        console.log(`Stage ${stageNum}/${stages.length}: ${event.data.message}`);
        console.log('='.repeat(70) + '\n');

        currentStage = event.data.message || '';
        break;

      case EventType.TEXT_MESSAGE_START:
        console.log(`\n🔍 Generating: ${currentStage}\n`);
        console.log('─'.repeat(50));
        break;

      case EventType.TEXT_MESSAGE_CONTENT:
        const delta = event.data.delta;
        process.stdout.write(delta);
        fullContent += delta;
        currentStageContent += delta;
        break;

      case EventType.TEXT_MESSAGE_END:
        console.log('\n' + '─'.repeat(50));

        // Save final stage content
        if (currentStage && currentStageContent) {
          stageContents[currentStage] = currentStageContent;
        }
        break;

      case EventType.RUN_FINISHED:
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log('\n' + '='.repeat(70));
        console.log('✅ Research & Article Generation Complete!');
        console.log('='.repeat(70));

        console.log('\n📊 Statistics:');
        console.log(`  • Total time: ${elapsed} seconds`);
        console.log(`  • Total length: ${fullContent.length} characters`);
        console.log(`  • Words (approx): ${fullContent.split(/\s+/).length}`);
        console.log(`  • Stages completed: ${Object.keys(stageContents).length}`);

        // Save to file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `research-output-${timestamp}.md`;

        try {
          const fs = await import('fs/promises');
          const output = `# ${RESEARCH_TOPIC}\n\n_Generated on ${new Date().toLocaleString()}_\n\n${fullContent}`;
          await fs.writeFile(filename, output);
          console.log(`\n💾 Full research saved to: ${filename}`);
        } catch (error) {
          console.log('\n⚠️  Could not save to file:', error);
        }

        // Show summary of each stage
        console.log('\n📑 Stage Summary:');
        Object.entries(stageContents).forEach(([stage, content], index) => {
          const wordCount = content.split(/\s+/).length;
          console.log(`  ${index + 1}. ${stage}: ${wordCount} words`);
        });

        // Cost estimate
        const estimatedTokens = fullContent.length / 4; // Rough estimate
        const cost = (estimatedTokens / 1_000_000) * 11; // $11 per million tokens
        console.log(`\n💰 Estimated cost: $${cost.toFixed(4)}`);
        break;

      case EventType.RUN_ERROR:
        console.error('\n❌ Error:', event.data.message);
        break;

      case EventType.METADATA:
        if (event.data?.usage) {
          console.log(`\n📈 Tokens used: ${JSON.stringify(event.data.usage)}`);
        }
        break;
    }
  }
}

main().catch(error => {
  console.error('Failed to run progressive generation:', error);
  process.exit(1);
});