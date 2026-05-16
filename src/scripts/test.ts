import { readdir, readFile } from "fs/promises";
import { join, extname } from "path";
import { embed, generateText } from "ai";
import { ChromaVector } from "@mastra/chroma";
import { MDocument } from "@mastra/rag";
import { ollama } from "ollama-ai-provider-v2";
import matter from "gray-matter";

const embedder = ollama.embedding("nomic-embed-text");
const model = ollama("llama3.2");

const PROCESSED_DIR = "./data";
const INDEX_NAME = "chunks";

// 4. Set up Chroma and create the index
const chroma = new ChromaVector({
  id: "main",
  ssl: false,
  host: "localhost",
  port: 8000,
});

// example query
const query = "What is LLAB";
const { embedding } = await embed({ model: embedder, value: query });

// retrieve relevant chunks
const results = await chroma.query({
  indexName: INDEX_NAME,
  queryVector: embedding,
  topK: 5,
});

const contextText = results
  .map((result) => result?.metadata?.text)
  .join("\n\n");

  const completion = await generateText({
    model: model,
    prompt: `Given the following context:\n\n${contextText}\n\n
    Please answer the following question: ${query}\n\n
    If the content lacks sufficiently, please state that explicitly. Do not make up answers.\n\n
    EXplicitly state the context again after giving the answer`,
  })

  console.log(completion.text);
