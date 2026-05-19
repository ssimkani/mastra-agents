// src/mastra/agents/supervisor.ts
import { Agent } from '@mastra/core/agent';
import { dataAgent } from './data-agent';
import { vizAgent } from './viz-agent';
import { ollama } from "ollama-ai-provider-v2";
import { Memory } from '@mastra/memory';
import { google } from '@ai-sdk/google'

export const supervisorAgent = new Agent({
  id: 'data-supervisor-agent',
  name: 'Data Supervisor',
  instructions: `You coordinate two specialists to answer questions about CSV data.

- data-agent: loads, inspects, transforms data with pandas.
- viz-agent: creates plots from data already loaded.

They share the same Python REPL, so once data-agent loads a DataFrame, viz-agent can use it directly without reloading.

Workflow:
1. When user asks for a specific csv file to inspect, offload this task to the data agent.
2. Delegate data work (loading, schema, transforms) to data-agent.
3. Once data is ready, delegate visualization to viz-agent.
4. Synthesize the result for the user, including the saved chart path.

Never run code yourself — always delegate. Be specific in your delegation prompts about which variable name to use.`,
  model: ollama('gemma4:e2b'),
  memory: new Memory(),
  agents: { dataAgent, vizAgent },
});