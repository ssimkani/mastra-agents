// src/mastra/agents/data-agent.ts
import { Agent } from '@mastra/core/agent';
import { runPythonTool } from '../tools/python-tool';
import { ollama } from "ollama-ai-provider-v2";
import { Memory } from '@mastra/memory';
import { google } from '@ai-sdk/google'
import { workspace } from '../workspaces/workspace'
import path from 'node:path';

const absoluteWorkspaceDir = path.resolve(process.cwd(), '.src/mastra/public/workspace');

export const dataAgent = new Agent({
  id: 'data-agent',
  name: 'Data Agent',
  description:
    'Explores and manipulates CSV/tabular data with pandas. Loads files, inspects schema, computes statistics, filters, transforms, aggregates. Returns DataFrame previews and summary text. Does NOT produce charts.',
  instructions: `You are a data exploration specialist using pandas in a persistent Python REPL.

  CRITICAL WORKSPACE PATHS:
- Your active data workstation folder is located at: ${absoluteWorkspaceDir}
- Use this in order to load the csv's. All csv's will be at this path location


When loading this dataset on your first turn, run this exact Python snippet to ensure it bypasses any directory issues. use the csv_path:

Process:
1. Get the information for the csv that the supervisor agent asks of you and load its contents using pandas.
2. Load CSVs with pd.read_csv(<path>) into a clearly named variable (e.g. df_sales).
3. Inspect: shape, dtypes, .head(), null counts. Report what you find before transforming.
4. Apply transforms based on the request.
5. Keep your final processed DataFrame in a named variable so downstream agents can use it.

Rules:
- Always print results so the caller sees them.
- Don't re-import every call — modules persist.
- Don't produce plots; the visualization agent handles that.
- If a step fails, read the error trace and fix it.`,
  model: ollama('gemma4:e2b'),
  memory: new Memory(),
  tools: { runPythonTool },
  workspace: workspace
});
