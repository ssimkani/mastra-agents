// src/mastra/tools/python-repl.ts
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const HARNESS = `
import sys, json, io, contextlib, traceback, ast

ns = {}

def run(code):
    out, err = io.StringIO(), io.StringIO()
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            tree = ast.parse(code)
            # Auto-print the last expression, Jupyter-style
            if tree.body and isinstance(tree.body[-1], ast.Expr):
                last = ast.Expression(tree.body.pop().value)
                if tree.body:
                    exec(compile(tree, '<in>', 'exec'), ns)
                result = eval(compile(last, '<in>', 'eval'), ns)
                if result is not None:
                    print(repr(result))
            else:
                exec(compile(tree, '<in>', 'exec'), ns)
        return {"stdout": out.getvalue(), "stderr": err.getvalue(), "error": None}
    except Exception:
        return {"stdout": out.getvalue(), "stderr": err.getvalue(), "error": traceback.format_exc()}

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    msg = json.loads(line)
    sys.stdout.write(json.dumps(run(msg["code"])) + "\\n")
    sys.stdout.flush()
`;

class PythonRepl {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private buffer = '';
  private pending: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

  private start() {
    if (this.proc) return;

    // 1. Resolve absolute path to workspaces folder
    const workspacesDir = path.resolve(process.cwd(), './workspaces');

    // 2. Ensure directory exists before spawning
    if (!fs.existsSync(workspacesDir)) {
      fs.mkdirSync(workspacesDir, { recursive: true });
    }

    // 3. Force Python process to remain rooted inside workspaces
    this.proc = spawn('python3', ['-u', '-c', HARNESS], { 
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: workspacesDir // <-- Permanently fixes FileNotFoundError
    });

    this.proc.stdout.on('data', (data: Buffer) => {
      this.buffer += data.toString();
      let idx;
      while ((idx = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, idx);
        this.buffer = this.buffer.slice(idx + 1);
        const next = this.pending.shift();
        if (!next) continue;
        try { next.resolve(JSON.parse(line)); } catch (e) { next.reject(e); }
      }
    });

    this.proc.stderr.on('data', (d) => console.error('[py stderr]', d.toString()));
    this.proc.on('exit', (code) => {
      this.proc = null;
      this.pending.forEach((p) => p.reject(new Error(`python exited (${code})`)));
      this.pending = [];
    });
  }

  run(code: string): Promise<{ stdout: string; stderr: string; error: string | null }> {
    this.start();
    return new Promise((resolve, reject) => {
      this.pending.push({ resolve, reject });
      this.proc!.stdin.write(JSON.stringify({ code }) + '\n');
    });
  }
}

// Export the running instance to be shared across your tool wrappers
export const pythonRepl = new PythonRepl();
