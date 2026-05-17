# AGENTS.md

## Critical: Load mastra skill FIRST
Always load the mastra skill before any Mastra work - APIs change frequently.

## Essential Commands
- `npm run dev` - Start Mastra Studio (auto-reloads on src/mastra changes)
- `npm run build` - Verify changes compile (ALWAYS run this)
- `npm run start` - Run built server
- No test script (package.json test exits with error)

## Critical Practices
- Register ALL agents/tools/workflows/scorers in `src/mastra/index.ts`
- Use schemas for tool inputs/outputs (Mastra requirement)
- Never commit `.env` or hardcode API keys (use env vars)
- Never modify `node_modules` or Mastraj's database files

## Key Project Facts
- Entrypoint: `src/mastra/index.ts`
- Agents: `src/mastra/agents/`
- Tools: `src/mastra/tools/`
- Workflows: `src/mastra/workflows/`
- DuckDB: `@mastra/duckdb` v1.3.2 (used for observability storage - see index.ts)
- TypeScript: ES2022 module, bundler resolution, strict mode, noEmit

## Model Format
- Use `ollama("model-name")` for Ollama models
- Examples: `ollama("llama3.2")`, `ollama("nemotron-3-super:cloud")`
- Verify Ollama models separately (not in provider registry)

## Non-Obvious Details
- Observability uses DuckDB storage (configured in index.ts storage.domains.observability)
- Development server auto-reloads when `src/mastra` files change
- Uses PinoLogger with info level by default