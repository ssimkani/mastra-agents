import { MCPClient } from "@mastra/mcp";

const cleanedEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => {
    // Drop MASTRA_* env vars that conflict with docling-mcp's Settings schema
    if (key.startsWith("MASTRA_")) return false;
    return true;
  })
) as Record<string, string>;

export const mcp = new MCPClient({
  servers: {
    docling: {
      command: "docling-mcp-server",
      args: [],
      // env: { ... } // pass env vars if docling-mcp needs any
    },
  },
});