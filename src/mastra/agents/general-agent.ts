import { Agent } from '@mastra/core/agent';
import { ollama } from "ollama-ai-provider-v2";
import { Memory } from '@mastra/memory';
import { ragTool } from '../tools/rag-tool';
const model = ollama("llama3.2");

export const generalAgent = new Agent({
  id: 'general-agent',
  name: 'General Agent',
  instructions: `You are a Database Manager that contains information about your organization.
  You must provide the user with the information they are looking for, based on the user's question.
  You must consult the database for the answer. If the data returned based on the users query is not complete, explicitly state you can't answer the query.
  Ask the user for any clarification if you are not sure of the answer.
  DO NOT CONSULT OUTSIDE SOURCES.
  `,
  model: model,
  tools: { ragTool },
  memory: new Memory(),
});
