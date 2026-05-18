import { Agent } from '@mastra/core/agent'
import { StagehandBrowser } from '@mastra/stagehand'
import { google } from '@ai-sdk/google'
import { Memory } from '@mastra/memory';
import { ollama } from "ollama-ai-provider-v2";

const browser = new StagehandBrowser({
  headless: false,
  model: 'google/gemma-4-31b-it',
})

export const browserAgent = new Agent({
  id: 'stagehand-agent',
  name: 'Stagehand Agent',
  model: google('gemma-4-31b-it'),
  browser,
  memory: new Memory(),
  instructions: `You are a web automation assistant.

Use stagehand tools to interact with pages:
- stagehand_navigate to go to URLs
- stagehand_act to perform actions described in natural language
- stagehand_extract to get structured data from the page
- stagehand_observe to find available actions on the page
- stagehand_screenshot to visually inspect the page`,
})
