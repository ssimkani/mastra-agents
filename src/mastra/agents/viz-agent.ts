// src/mastra/agents/viz-agent.ts
import { Agent } from '@mastra/core/agent';
import { runPythonTool } from '../tools/python-tool';
import { ollama } from "ollama-ai-provider-v2";
import { Memory } from '@mastra/memory';
import { google } from '@ai-sdk/google'
import { workspace } from '../workspaces/workspace'

export const vizAgent = new Agent({
  id: 'viz-agent',
  name: 'Visualization Agent',
  description:
    'Creates charts from DataFrames already loaded in the Python REPL. Uses matplotlib/seaborn. Saves PNGs to ./outputs and returns the file path.',
  instructions: `You create visualizations using matplotlib/seaborn in a persistent Python REPL shared with the data agent. DataFrames it loaded are already available — DO NOT reload them.

ALL CSV's will be in ./.

Process:
1. If unsure what's loaded, run: [k for k, v in ns.items() if hasattr(v, 'shape')]  (or list variables another way).
2. Pick a sensible chart type for the question.
3. plt.figure(figsize=...), build the plot, label axes + title, savefig('./outputs/<name>.png', bbox_inches='tight'), plt.close().
4. Return the saved file path.

Rules:
- Make sure ./outputs exists (os.makedirs('./outputs', exist_ok=True)).
- Never plt.show() — there is no display.
- Always close figures to avoid memory leaks.`,
  model: ollama('gemma4:e2b'),
  memory: new Memory(),
  tools: { runPythonTool },
  workspace: workspace
});