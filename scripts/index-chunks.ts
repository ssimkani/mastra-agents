import { readdir, readFile } from "fs/promises";
import { join, extname } from "path";
import { embed, generateText } from "ai";
import { ChromaVector } from "@mastra/chroma";
import { MDocument } from "@mastra/rag";
import { ollama } from "ollama-ai-provider-v2";
import matter from "gray-matter";

const embedder = ollama.embedding("nomic-embed-text");
const model = ollama("llama3.2");

const PROCESSED_DIR = "./data/processed";
const INDEX_NAME = "chunks";
const EMBEDDING_DIMENSION = 768;

// 1. Collect chunks from all markdown files
const files = (await readdir(PROCESSED_DIR)).filter(f => extname(f) === ".md");
console.log(`Found ${files.length} markdown files`);

const allChunks: { id: string; text: string; metadata: Record<string, any> }[] = [];

for (const filename of files) {
  const raw = await readFile(join(PROCESSED_DIR, filename), "utf-8");
  const { data: frontmatter, content: body } = matter(raw);

  if (!body.trim()) {
    console.warn(`  skipped empty: ${filename}`);
    continue;
  }

  const doc = MDocument.fromMarkdown(body, { metadata: frontmatter });
  const chunks = await doc.chunk({
    strategy: "markdown",
    maxSize: 512,
    overlap: 50,
  });

  const baseId = (frontmatter.chunk_id as string) ?? filename.replace(/\.md$/, "");
  chunks.forEach((chunk, i) => {
    allChunks.push({
      id: `${baseId}__part_${String(i).padStart(3, "0")}`,
      text: chunk.text,
      metadata: { ...frontmatter, ...(chunk.metadata ?? {}), chunk_index: i },
    });
  });

  console.log(`  ${filename}: ${chunks.length} chunks`);
}

console.log(`\nTotal chunks: ${allChunks.length}. Embedding one at a time...`);

// 2. Embed one at a time with progress
const embeddings: number[][] = [];
let failed = 0;

for (let i = 0; i < allChunks.length; i++) {
  try {
    const { embedding } = await embed({ model: embedder, value: allChunks[i].text });
    embeddings.push(embedding);
  } catch (e) {
    console.warn(`  chunk ${i} (${allChunks[i].id}) failed: ${(e as Error).message}`);
    embeddings.push([]);
    failed++;
  }

  if ((i + 1) % 10 === 0 || i === allChunks.length - 1) {
    console.log(`  embedded ${i + 1}/${allChunks.length}`);
  }
}

console.log(`\nEmbedding done. Failed: ${failed}`);

// 3. Filter failures
const goodIndices = embeddings.map((e, i) => e.length > 0 ? i : -1).filter(i => i >= 0);
const goodVectors = goodIndices.map(i => embeddings[i]);
const goodIds = goodIndices.map(i => allChunks[i].id);
const goodMetadata = goodIndices.map(i => flattenMetadata({
  ...allChunks[i].metadata,
  text: allChunks[i].text,
}));

// 4. Set up Chroma and create the index
const chroma = new ChromaVector({
  id: "main",
  ssl: false,
  host: "localhost",
  port: 8000,
});

try {
  await chroma.deleteIndex({ indexName: INDEX_NAME });
  console.log(`Deleted existing index '${INDEX_NAME}'`);
} catch {}

await chroma.createIndex({
  indexName: INDEX_NAME,
  dimension: EMBEDDING_DIMENSION,
});
console.log(`Created index '${INDEX_NAME}'`);


// for flattening metadata for chroma
function flattenMetadata(md: Record<string, any>): Record<string, string | number | boolean | null> {
  const flat: Record<string, any> = {};
  for (const [k, v] of Object.entries(md)) {
    if (v == null) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      flat[k] = v;
    } else if (Array.isArray(v)) {
      // Chroma allows arrays of scalars; convert to be safe
      flat[k] = v.map(String).join(", ");
    } else if (v instanceof Date) {
      flat[k] = v.toISOString();
    } else if (typeof v === "object") {
      // Nested object — stringify it
      flat[k] = JSON.stringify(v);
    } else {
      flat[k] = String(v);
    }
  }
  return flat;
}

const UPSERT_BATCH_SIZE = 100;

console.log(`Upserting ${goodVectors.length} vectors in batches of ${UPSERT_BATCH_SIZE}...`);

let upserted = 0;
for (let i = 0; i < goodVectors.length; i += UPSERT_BATCH_SIZE) {
  const end = Math.min(i + UPSERT_BATCH_SIZE, goodVectors.length);
  try {
    await chroma.upsert({
      indexName: INDEX_NAME,
      vectors: goodVectors.slice(i, end),
      ids: goodIds.slice(i, end),
      metadata: goodMetadata.slice(i, end),
    });
    upserted += (end - i);
    console.log(`  upserted ${upserted}/${goodVectors.length}`);
  } catch (e) {
    console.error(`  batch ${i}-${end} failed: ${(e as Error).message}`);
  }
}

console.log(`Done. Upserted ${upserted} of ${goodVectors.length} vectors.`);