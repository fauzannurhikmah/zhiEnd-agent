import { spawn, ChildProcess } from 'child_process';

export interface DirectCommandCheck {
  isDirect: boolean;
  command?: string;
  originalPrompt: string;
}

const CLI_BINARIES = [
  'npx', 'npm', 'pnpm', 'yarn', 'bun',
  'git', 'docker', 'docker-compose', 'prisma',
  'node', 'python', 'py', 'pip', 'composer', 'cargo',
  'go', 'dotnet', 'deno', 'tsc', 'vite', 'next',
  'cat', 'ls', 'dir', 'mkdir', 'rm', 'echo', 'curl', 'wget', 'ping'
];

/**
 * Normalizes chained command syntax like ' dan ', ' kemudian ', ' lalu ' into shell ';' separators.
 */
function normalizeChainedCommands(cmd: string): string {
  return cmd
    .replace(/\s+(?:dan|kemudian|lalu)\s+/gi, '; ')
    .trim();
}

/**
 * Check if a prompt is an explicit or direct terminal command.
 * Examples:
 * - '!npx prisma db push' -> true
 * - 'npx prisma db push dan npx prisma generate' -> true
 * - 'npm run build' -> true
 * - 'git pull' -> true
 * - 'kenapa npx prisma db push error?' -> false (question for AI)
 * - 'buatkan fitur auth' -> false (coding task for AI)
 */
export function parseDirectCommand(prompt: string): DirectCommandCheck {
  const trimmed = prompt.trim();
  if (!trimmed) return { isDirect: false, originalPrompt: prompt };

  // 1. Explicit Prefix (!, $, >) -> 100% direct command
  if (/^[!$>]\s*/.test(trimmed)) {
    const rawCmd = trimmed.replace(/^[!$>]\s*/, '').trim();
    if (rawCmd) {
      return {
        isDirect: true,
        command: normalizeChainedCommands(rawCmd),
        originalPrompt: prompt
      };
    }
  }

  // 2. Reject if it is clearly a question or request for explanation/analysis
  const isQuestion = /\?|^(kenapa|mengapa|apa|apakah|bagaimana|gimana|jelaskan|tolong jelaskan|bisa jelaskan|cara|apa itu|maksud|fungsi)\b/i.test(trimmed);
  if (isQuestion) {
    return { isDirect: false, originalPrompt: prompt };
  }

  // Strip conversational wrappers like 'tolong jalankan ...', 'run ...', 'eksekusi ...'
  let cleanPrompt = trimmed.replace(/^(tolong\s+)?(jalankan|run|eksekusi|exec)\s+(perintah\s+|command\s+)?/i, '').trim();

  // Split by chaining operators
  const parts = cleanPrompt.split(/\s+(?:dan|kemudian|lalu|&&)\s+|;\s*/i);
  if (parts.length > 0 && parts.every(part => {
    const firstWord = part.trim().split(/\s+/)[0]?.toLowerCase();
    return firstWord && CLI_BINARIES.includes(firstWord);
  })) {
    return {
      isDirect: true,
      command: normalizeChainedCommands(cleanPrompt),
      originalPrompt: prompt
    };
  }

  return { isDirect: false, originalPrompt: prompt };
}

/**
 * Execute a command directly in the workspace using PowerShell without triggering heavy AI loops.
 */
export function spawnDirectCommand(command: string, cwd: string): ChildProcess {
  return spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
    cwd,
    env: { ...process.env },
    shell: false,
    windowsHide: true
  });
}
