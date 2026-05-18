import { Agent } from '@mastra/core/agent';
import { ollama } from "ollama-ai-provider-v2";
import { Memory } from '@mastra/memory';
import { google } from '@ai-sdk/google'
import { workspace } from '../workspaces/workspace'

export const generalAgent = new Agent({
  id: 'general-agent',
  name: 'General Agent',
  instructions: `You are a helpful file management assistant.
  `,
  memory: new Memory(),
  model: ollama('gemma4:e2b'),
  workspace: workspace
});
