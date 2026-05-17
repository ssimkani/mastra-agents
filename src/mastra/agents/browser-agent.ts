import { Agent } from '@mastra/core/agent'
import { StagehandBrowser } from '@mastra/stagehand'
import { ollama } from "ollama-ai-provider-v2";
import { Memory } from '@mastra/memory';

const model = ollama("llama3.1:8b")

const browser = new StagehandBrowser({
  headless: true,
  model: "ollama/llama3.1:8b",
})

export const browserAgent = new Agent({
  id: 'browser-agent',
  name: 'Browser Agent',
  model: model,
  browser,
  instructions: `You are a web automation assistant.

Use stagehand tools to interact with pages:
- stagehand_navigate to go to URLs
- stagehand_act to perform actions described in natural language
- stagehand_extract to get structured data from the page
- stagehand_observe to find available actions on the page`,
  memory: new Memory()
})
