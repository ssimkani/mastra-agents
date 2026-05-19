/// <reference types="node" />
import { Harness } from '@mastra/core/harness'
import { Agent } from '@mastra/core/agent'
import { createTool } from '@mastra/core/tools'
import { LibSQLStore } from '@mastra/libsql'
import { ollama } from 'ollama-ai-provider-v2'
import { z } from 'zod'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const MODEL = 'gemma4:e2b'
const SANDBOX = 'sandbox'
await fs.mkdir(SANDBOX, { recursive: true })

// ---------- Sandboxed file tools ----------

const inSandbox = (rel: string) => {
  const full = path.resolve(SANDBOX, rel)
  if (!full.startsWith(SANDBOX)) throw new Error('Path escapes sandbox')
  return full
}

const listDir = createTool({
  id: 'list_dir',
  description: 'List files and directories at a path inside the sandbox.',
  inputSchema: z.object({
    relativePath: z.string().describe('Path relative to sandbox root, e.g. "." or "src"'),
  }),
  execute: async ({ relativePath }) => {
    const target = inSandbox(relativePath)
    const entries = await fs.readdir(target, { withFileTypes: true })
    return {
      files: entries.map(e => ({
        name: e.name,
        type: e.isDirectory() ? 'dir' : 'file',
      })),
    }
  },
})

const readFile = createTool({
  id: 'read_file',
  description: 'Read the contents of a file in the sandbox.',
  inputSchema: z.object({ relativePath: z.string() }),
  execute: async ({ relativePath }) => {
    return { content: await fs.readFile(inSandbox(relativePath), 'utf-8') }
  },
})

const writeFile = createTool({
  id: 'write_file',
  description: 'Create or overwrite a file in the sandbox.',
  inputSchema: z.object({
    relativePath: z.string(),
    content: z.string(),
  }),
  execute: async ({ relativePath, content }) => {
    const target = inSandbox(relativePath)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, content, 'utf-8')
    return { ok: true, bytes: content.length, path: relativePath }
  },
})

// ---------- Two agents with different powers ----------

const defaultAgent = new Agent({
  id: 'default',
  name: 'Default',
  instructions: `You are a helpful assistant that can read files and list directories in a sandboxed environment. You can use the tools "list_dir" and "read_file" to explore the contents of the sandbox, but you cannot modify anything. Always think step by step and use the tools when needed to answer questions about the files in the sandbox.`,
  model: ollama(MODEL),
  tools: { list_dir: listDir, read_file: readFile },
})

// ---------- Harness ----------

const harness = new Harness({
  id: 'test-harness',
  storage: new LibSQLStore({ id: 'main', url: 'file:./data.db' }),
  stateSchema: z.object({
    currentModelId: z.string().optional(),
  }),
  modes: [
    {
      id: 'default',
      name: 'Default',
      default: true,
      defaultModelId: `ollama/${MODEL}`,
      agent: defaultAgent,
    }
  ],
})

// ---------- UI Utilities ----------

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
}

function section(title: string) {
  console.log(`\n${colors.bright}${colors.cyan}━━ ${title} ━━${colors.reset}`)
}

function success(msg: string) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`)
}

function info(msg: string) {
  console.log(`${colors.blue}ℹ${colors.reset} ${msg}`)
}

function warning(msg: string) {
  console.log(`${colors.yellow}⚠${colors.reset} ${msg}`)
}

function error(msg: string) {
  console.error(`${colors.red}✗${colors.reset} ${msg}`)
}

function muted(msg: string) {
  console.log(`${colors.gray}${msg}${colors.reset}`)
}

// ---------- Thinking Spinner ----------

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
let spinnerIndex = 0
let spinnerInterval: NodeJS.Timeout | null = null
let isThinking = false

function startSpinner() {
  if (isThinking) return
  isThinking = true
  spinnerIndex = 0

  const originalWrite = process.stderr.write.bind(process.stderr)
  spinnerInterval = setInterval(() => {
    spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length
    originalWrite(`\r${colors.cyan}${spinnerFrames[spinnerIndex]} Agent thinking...${colors.reset}  `)
  }, 80)
}

function stopSpinner() {
  if (!isThinking) return
  isThinking = false
  if (spinnerInterval) {
    clearInterval(spinnerInterval)
    spinnerInterval = null
  }
  process.stderr.write(`\r${' '.repeat(50)}\r`)
}

// ---------- Subscribe to harness events ----------

harness.subscribe((event: any) => {
  switch (event.type) {
    case 'message_start':
      startSpinner()
      break

    case 'tool_start':
      stopSpinner()
      muted(`  ⟳ ${event.toolName}(${JSON.stringify(event.toolInput ?? event.input ?? {}).slice(0, 80)}...)`)
      break

    case 'tool_end':
      muted(`  ✓ ${event.toolName}`)
      break

    case 'tool_approval_required':
      stopSpinner()
      warning(`auto-approving ${event.toolName}`)
      harness.respondToToolApproval({ decision: 'approve' })
      startSpinner()
      break

    case 'message_end': {
      stopSpinner()
      const m = event.message
      if (m?.role === 'assistant' && m?.content) {
        const text = typeof m.content === 'string'
          ? m.content
          : Array.isArray(m.content)
            ? m.content.map((p: any) => p?.text ?? '').join('')
            : JSON.stringify(m.content)
        console.log(`\n${colors.magenta}Agent:${colors.reset} ${text}`)
      }
      break
    }

    case 'error':
      stopSpinner()
      error(event.error?.message || String(event.error) || JSON.stringify(event))
      break
  }
})

// ---------- Init ----------

await harness.init()
await harness.selectOrCreateThread()
await harness.setState({ currentModelId: `ollama/${MODEL}` })

function banner() {
  const mode = harness.getCurrentMode()
  const modeColor = mode?.id === 'edit' ? colors.red : colors.cyan
  const modeEmoji = mode?.id === 'edit' ? '✏️' : '👁️'

  console.clear()
  console.log(`
${colors.bright}${colors.cyan}╭───────────────────────────────────────────────────╮${colors.reset}
${colors.bright}${colors.cyan}│${colors.reset}  ${colors.bright}Mastra Test Harness${colors.reset}                            ${colors.cyan}│${colors.reset}
${colors.bright}${colors.cyan}├───────────────────────────────────────────────────┤${colors.reset}
${colors.bright}${colors.cyan}│${colors.reset}  ${colors.dim}Model${colors.reset}     ${colors.blue}${MODEL.padEnd(32)}${colors.reset}      ${colors.cyan}│${colors.reset}
${colors.bright}${colors.cyan}│${colors.reset}  ${colors.dim}Mode${colors.reset}      ${modeColor}${modeEmoji} ${(mode?.name ?? '?').padEnd(30)}${colors.reset}  ${colors.cyan}│${colors.reset}
${colors.bright}${colors.cyan}│${colors.reset}  ${colors.dim}Sandbox${colors.reset}   ${colors.green}${SANDBOX.slice(-31).padEnd(31)}${colors.reset}  ${colors.cyan}│${colors.reset}
${colors.bright}${colors.cyan}├───────────────────────────────────────────────────┤${colors.reset}
${colors.bright}${colors.cyan}│${colors.reset}  ${colors.gray}Commands:${colors.reset}                                          ${colors.cyan}│${colors.reset}
${colors.bright}${colors.cyan}│${colors.reset}    ${colors.yellow}/mode research${colors.reset}  Switch to read-only         ${colors.cyan}│${colors.reset}
${colors.bright}${colors.cyan}│${colors.reset}    ${colors.red}/mode edit${colors.reset}      Switch to writer            ${colors.cyan}│${colors.reset}
${colors.bright}${colors.cyan}│${colors.reset}    ${colors.blue}/threads${colors.reset}        List threads                ${colors.cyan}│${colors.reset}
${colors.bright}${colors.cyan}│${colors.reset}    ${colors.green}/new${colors.reset}           New thread                  ${colors.cyan}│${colors.reset}
${colors.bright}${colors.cyan}│${colors.reset}    ${colors.dim}/exit${colors.reset}          Quit                        ${colors.cyan}│${colors.reset}
${colors.bright}${colors.cyan}╰───────────────────────────────────────────────────╯${colors.reset}
  `)
}
banner()

// ---------- REPL ----------

const rl = readline.createInterface({ input, output })

while (true) {
  const prompt = `${colors.bright}${colors.cyan}→${colors.reset} `
  const line = (await rl.question(prompt)).trim()
  if (!line) continue

  if (line === '/exit') {
    info('goodbye!')
    break
  } else if (line.startsWith('/mode ')) {
    const arg = line.slice(6).trim()
    const modeId = arg === 'edit' ? 'edit' : 'research'
    await harness.switchMode({ modeId })
    success(`switched to ${harness.getCurrentMode()?.name}`)
  } else if (line === '/threads') {
    section('threads')
    const threads = await harness.listThreads()
    if (threads.length === 0) {
      muted('  (no threads)')
    } else {
      threads.forEach((t, i) => {
        console.log(`  ${colors.dim}${String(i + 1).padStart(2)}.${colors.reset} ${colors.blue}${t.id.slice(0, 8)}...${colors.reset} — ${t.title ?? colors.gray}(untitled)${colors.reset}`)
      })
    }
  } else if (line === '/new') {
    const t = await harness.createThread({ title: `Session ${new Date().toISOString()}` })
    success(`new thread: ${colors.blue}${t.id.slice(0, 8)}...${colors.reset}`)
  } else {
    await harness.sendMessage({ content: line })
  }
}

await harness.destroy()
rl.close()
muted('bye 👋')
