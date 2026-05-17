import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { ChromaVector } from '@mastra/chroma';
import { ollama } from 'ollama-ai-provider-v2';
import { embed } from 'ai';

const embedder = ollama.embedding("nomic-embed-text");

const chroma = new ChromaVector({
  id: "main",
  ssl: false,
  host: "localhost",
  port: 8000,
});

const INDEX_NAME = 'chunks';

export const ragTool = createTool({
  id: 'rag-tool',
  description: 'Retrieves information from the database',
  inputSchema: z.object({
    // The agent passes the user query or an optimized search string here
    searchQuery: z.string().describe('The search query or keywords to look up in the vector database.'),
  }),
  outputSchema: z.array(z.object({
    content: z.record(z.string(), z.any()),
  })),
  execute: async ({ searchQuery }) => {
    return await getResults(searchQuery);
  },
});

// function that returns the retrieved results from the search
async function getResults(searchQuery: string) {

  const { embedding } = await embed({ model: embedder, value: searchQuery });
  const results = await chroma.query({
    indexName: INDEX_NAME,
    queryVector: embedding,
    topK: 5,
  });

    // return contextTest in the outputSchema
    return results.map((result) => ({
      content: result.metadata ?? {},
    }));
}