// src/mastra/tools/python-tool.ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { pythonRepl } from './python-repl-tool';

export const runPythonTool = createTool({
  id: 'run-python',
  description:
    'Execute Python code in a persistent REPL. Variables (DataFrames, imports) persist across calls within the session. pandas, numpy, matplotlib, seaborn available.',
  inputSchema: z.object({
    code: z.string().describe('Python code. Last expression is auto-printed.'),
  }),
  outputSchema: z.object({
    stdout: z.string(),
    stderr: z.string(),
    error: z.string().nullable(),
  }),

  execute: async ({ code }) => pythonRepl.run(code),
});