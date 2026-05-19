// src/mastra/mcp/composio.ts
import 'dotenv/config';
import { Composio } from '@composio/core';
import { MCPClient } from '@mastra/mcp';

const userId = process.env.COMPOSIO_USER_ID;
const apiKey = process.env.COMPOSIO_API_KEY;

const composio = new Composio({ apiKey: apiKey! });

const session = await composio.create(userId!, {
  toolkits: ['gmail'],
});

export const composioMcp = new MCPClient({
  id: 'composio-mcp',
  servers: {
    gmail: {
      url: new URL(session.mcp.url),
      requestInit: {
        headers: {
          'x-api-key': apiKey!,
        },
      },
      requireToolApproval: true,
    },
  },
});
