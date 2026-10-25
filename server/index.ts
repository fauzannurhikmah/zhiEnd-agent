import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import fs from 'fs';

import { loadConfig, saveConfig } from './config';
import { AgentRunner } from './agentRunner';
import { gitManager } from './gitManager';
import { TunnelManager } from './tunnelManager';
import { TelegramBotManager } from './bots/telegramBot';
import { WhatsAppBotManager } from './bots/whatsappBot';
import { AppConfig, FileItem } from './types';

const app = new Hono();

// Load Config
let config: AppConfig = loadConfig();

// Initialize Services
const agentRunner = new AgentRunner(config);
const tunnelManager = new TunnelManager(config.port || 3888);

const onProjectChange = async (newPath: string) => {
  if (!fs.existsSync(newPath)) {
    return { success: false, error: 'Directory does not exist' };
  }
  const stat = fs.statSync(newPath);
  if (!stat.isDirectory()) {
    return { success: false, error: 'Path is not a directory' };
  }

  config.activeProject = path.resolve(newPath);
  if (!config.recentProjects.includes(config.activeProject)) {
    config.recentProjects.unshift(config.activeProject);
    config.recentProjects = config.recentProjects.slice(0, 10);
  }
  saveConfig(config);
  agentRunner.updateConfig(config);
  telegramBot.updateConfig(config);
  whatsappBot.updateConfig(config);
  io?.emit('project_changed', { activeProject: config.activeProject });
  return { success: true, activeProject: config.activeProject };
};

const telegramBot = new TelegramBotManager({
  config,
  agentRunner,
  gitManager,
  onProjectChange
});

const whatsappBot = new WhatsAppBotManager({
  config,
  agentRunner,
  gitManager,
  onProjectChange
});

// Global Middleware
app.use('*', cors({ origin: '*' }));

// Security PIN Middleware for /api/*
app.use('/api/*', async (c, next) => {
  const path = c.req.path;
  if (path === '/api/auth/status' || path === '/api/auth/verify') {
    return next();
  }

  if (config.securityPin && config.securityPin.trim()) {
    const clientPin = c.req.header('x-security-pin') || c.req.query('pin');
    if (clientPin !== config.securityPin.trim()) {
      return c.json({ error: 'PIN Keamanan diperlukan atau salah.', needAuth: true }, 401);
    }
  }
  return next();
});

// ---------------- REST APIs ----------------

// Auth
app.get('/api/auth/status', (c) => {
  return c.json({
    hasPin: !!(config.securityPin && config.securityPin.trim())
  });
});

app.post('/api/auth/verify', async (c) => {
  const body = await c.req.json<{ pin: string }>();
  if (!config.securityPin || !config.securityPin.trim()) {
    return c.json({ success: true, authorized: true });
  }
  if (body?.pin === config.securityPin.trim()) {
    return c.json({ success: true, authorized: true });
  }
  return c.json({ success: false, error: 'PIN salah' }, 401);
});

// Config: Get and Save all configurations via UI
app.get('/api/config', (c) => {
  const safeConfig = {
    ...config,
    telegram: {
      ...config.telegram,
      botTokenSet: !!config.telegram?.botToken,
      botToken: config.telegram?.botToken ? '••••••••' : ''
    }
  };
  return c.json(safeConfig);
});

app.post('/api/config', async (c) => {
  const updates = await c.req.json<Partial<AppConfig>>();
  
  if (updates.port !== undefined) config.port = Number(updates.port);
  if (updates.securityPin !== undefined) config.securityPin = updates.securityPin;
  if (updates.activeProject !== undefined) config.activeProject = updates.activeProject;
  if (updates.recentProjects !== undefined) config.recentProjects = updates.recentProjects;

  if (updates.antigravity) {
    if (updates.antigravity.cliPath !== undefined) config.antigravity.cliPath = updates.antigravity.cliPath;
    if (updates.antigravity.defaultModel !== undefined) config.antigravity.defaultModel = updates.antigravity.defaultModel;
    if (updates.antigravity.availableModels !== undefined) config.antigravity.availableModels = updates.antigravity.availableModels;
  }

  if (updates.telegram) {
    if (updates.telegram.botToken && updates.telegram.botToken !== '••••••••') {
      config.telegram.botToken = updates.telegram.botToken;
    }
    if (updates.telegram.allowedUsers !== undefined) {
      config.telegram.allowedUsers = updates.telegram.allowedUsers;
    }
    if (updates.telegram.enabled !== undefined) {
      config.telegram.enabled = updates.telegram.enabled;
    }
  }

  if (updates.whatsapp) {
    if (updates.whatsapp.allowedNumbers !== undefined) {
      config.whatsapp.allowedNumbers = updates.whatsapp.allowedNumbers;
    }
    if (updates.whatsapp.enabled !== undefined) {
      config.whatsapp.enabled = updates.whatsapp.enabled;
    }
  }

  if (updates.tunnel) {
    if (updates.tunnel.subdomain !== undefined) config.tunnel.subdomain = updates.tunnel.subdomain;
    if (updates.tunnel.provider !== undefined) config.tunnel.provider = updates.tunnel.provider;
  }

  saveConfig(config);
  agentRunner.updateConfig(config);
  telegramBot.updateConfig(config);
  whatsappBot.updateConfig(config);

  return c.json({ success: true, config });
});

// Projects
app.get('/api/projects', (c) => {
  return c.json({
    activeProject: config.activeProject,
    recentProjects: config.recentProjects
  });
});

app.get('/api/projects/scan', (c) => {
  const queryDir = c.req.query('dir') || 'D:\\Works';
  const targetDir = path.resolve(queryDir);

  if (!fs.existsSync(targetDir)) {
    return c.json({ baseDir: targetDir, projects: [] });
  }

  const projects: Array<{
    name: string;
    path: string;
    relativePath: string;
    isGit: boolean;
    hasPackageJson: boolean;
    lastModified: number;
  }> = [];

  const ignored = new Set(['node_modules', '.git', '.gemini', 'dist', 'build', '.agents', '$RECYCLE.BIN', 'System Volume Information']);

  function scanDir(currentDir: string, depth: number = 0) {
    if (depth > 2) return;
    try {
      const items = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const item of items) {
        if (!item.isDirectory() || ignored.has(item.name) || item.name.startsWith('.')) continue;

        const fullPath = path.join(currentDir, item.name);
        let isGit = false;
        let hasPackageJson = false;
        let mtime = 0;

        try {
          const stat = fs.statSync(fullPath);
          mtime = stat.mtimeMs;
          isGit = fs.existsSync(path.join(fullPath, '.git'));
          hasPackageJson = fs.existsSync(path.join(fullPath, 'package.json'));
        } catch {}

        const rel = path.relative(targetDir, fullPath).replace(/\\/g, '/');

        // Add folder as project
        projects.push({
          name: item.name,
          path: fullPath.replace(/\\/g, '/'),
          relativePath: rel,
          isGit,
          hasPackageJson,
          lastModified: mtime
        });

        // If not a git repo or package.json at root, also scan 1 level deeper
        if (!isGit && !hasPackageJson && depth < 2) {
          scanDir(fullPath, depth + 1);
        }
      }
    } catch {}
  }

  scanDir(targetDir, 0);

  // Sort by most recently modified
  projects.sort((a, b) => b.lastModified - a.lastModified);

  return c.json({ baseDir: targetDir.replace(/\\/g, '/'), projects });
});

app.post('/api/projects/create', async (c) => {
  const { name, parentDir, initGit = true } = await c.req.json<{
    name: string;
    parentDir?: string;
    initGit?: boolean;
  }>();

  if (!name || !name.trim()) {
    return c.json({ error: 'Nama project harus diisi' }, 400);
  }

  const cleanName = name.trim().replace(/[<>:"/\\|?*]/g, '-');
  const baseParent = parentDir && parentDir.trim() ? path.resolve(parentDir.trim()) : 'D:\\Works';
  const newProjPath = path.join(baseParent, cleanName);

  try {
    if (!fs.existsSync(newProjPath)) {
      fs.mkdirSync(newProjPath, { recursive: true });
    }

    if (initGit) {
      await gitManager.initRepo(newProjPath);
    }

    const switchResult = await onProjectChange(newProjPath);
    return c.json({
      success: true,
      activeProject: switchResult.activeProject || newProjPath
    });
  } catch (err: any) {
    return c.json({ error: 'Gagal membuat project: ' + err.message }, 500);
  }
});

app.post('/api/projects/select', async (c) => {
  const { path: targetPath } = await c.req.json<{ path: string }>();
  const result = await onProjectChange(targetPath);
  if (!result.success) {
    return c.json(result, 400);
  }
  return c.json(result);
});

app.get('/api/projects/files', (c) => {
  const activeProj = config.activeProject;
  if (!fs.existsSync(activeProj)) {
    return c.json({ error: 'Project path not found' }, 404);
  }

  function readDirRecursive(dir: string, maxDepth: number = 2, currentDepth: number = 0): FileItem[] {
    if (currentDepth > maxDepth) return [];
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      return items
        .filter(item => !['node_modules', '.git', '.gemini', 'dist', 'build', '.agents'].includes(item.name))
        .map(item => {
          const fullPath = path.join(dir, item.name);
          const relPath = path.relative(activeProj, fullPath);
          return {
            name: item.name,
            path: relPath,
            isDirectory: item.isDirectory(),
            children: item.isDirectory() ? readDirRecursive(fullPath, maxDepth, currentDepth + 1) : null
          };
        });
    } catch {
      return [];
    }
  }

  const tree = readDirRecursive(activeProj);
  return c.json({ projectPath: activeProj, files: tree });
});

// Git APIs
app.get('/api/git/status', async (c) => {
  const status = await gitManager.getStatus(config.activeProject);
  return c.json(status);
});

app.get('/api/git/diff', async (c) => {
  const file = c.req.query('file') || null;
  const staged = c.req.query('staged') === 'true';
  const diff = await gitManager.getDiff(config.activeProject, file, staged);
  return c.json({ diff });
});

app.post('/api/git/stage', async (c) => {
  const { files } = await c.req.json<{ files?: string[] }>();
  const result = await gitManager.stage(config.activeProject, files || ['.']);
  return c.json(result);
});

app.post('/api/git/unstage', async (c) => {
  const { files } = await c.req.json<{ files?: string[] }>();
  const result = await gitManager.unstage(config.activeProject, files || ['.']);
  return c.json(result);
});

app.post('/api/git/commit', async (c) => {
  const { message } = await c.req.json<{ message: string }>();
  if (!message || !message.trim()) {
    return c.json({ error: 'Commit message is required' }, 400);
  }
  const result = await gitManager.commit(config.activeProject, message);
  return c.json(result);
});

app.post('/api/git/push', async (c) => {
  const body = await c.req.json<{ remote?: string; branch?: string }>().catch(() => ({} as any));
  const result = await gitManager.push(config.activeProject, body?.remote || 'origin', body?.branch);
  return c.json(result);
});

app.post('/api/git/pull', async (c) => {
  const body = await c.req.json<{ remote?: string; branch?: string }>().catch(() => ({} as any));
  const result = await gitManager.pull(config.activeProject, body?.remote || 'origin', body?.branch);
  return c.json(result);
});

app.get('/api/git/commits', async (c) => {
  const commits = await gitManager.getRecentCommits(config.activeProject, 15);
  return c.json({ commits });
});

app.post('/api/git/ai-commit-msg', async (c) => {
  const diff = await gitManager.getDiff(config.activeProject);
  if (!diff || !diff.trim()) {
    return c.json({ message: 'chore: update project files' });
  }

  const prompt = `Based on the following git diff, generate a single concise, conventional git commit message (e.g. "feat: add user authentication", "fix: resolve navbar bug"). Output ONLY the commit message line, with no extra explanation:\n\n${diff.slice(0, 3000)}`;

  try {
    const result = await agentRunner.run({
      prompt,
      cwd: config.activeProject,
      model: 'gemini-3.8-flash-low'
    });
    const cleanMsg = result.response?.trim().split('\n')[0] || 'chore: update codebase';
    return c.json({ message: cleanMsg.replace(/^["'`]|["'`]$/g, '') });
  } catch {
    return c.json({ message: 'feat: update project files' });
  }
});

// Agent APIs
app.get('/api/agent/status', (c) => {
  return c.json({
    busy: agentRunner.isBusy(),
    activeTask: agentRunner.activeTask,
    history: agentRunner.history
  });
});

app.post('/api/agent/chat', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Payload JSON tidak valid' }, 400);
  }

  if (!body?.prompt || !body.prompt.trim()) {
    return c.json({ error: 'Prompt is required' }, 400);
  }

  if (agentRunner.isBusy()) {
    return c.json({ error: 'Agent is already running a task.' }, 409);
  }

  const workingDir = config.activeProject || 'D:\\Works';

  // Run in background
  agentRunner.run({
    prompt: body.prompt,
    cwd: workingDir,
    model: body.model || config.antigravity?.defaultModel,
    conversationId: body.conversationId,
    continueLast: body.continueLast
  }).catch(err => {
    console.error('Agent execution error:', err);
  });

  return c.json({
    success: true,
    message: 'Task started',
    project: workingDir
  });
});

app.post('/api/agent/cancel', (c) => {
  const cancelled = agentRunner.cancel();
  return c.json({ success: cancelled });
});

// Dev Server Manager
app.get('/api/project/dev-server/status', async (c) => {
  // Check common dev ports: 3000, 3001, 5173, 8080, 8000
  const ports = [3000, 3001, 5173, 8080, 8000];
  const activePorts: { port: number; url: string }[] = [];

  for (const port of ports) {
    try {
      const net = await import('net');
      await new Promise<void>((resolve, reject) => {
        const tester = net.createConnection({ port, host: '127.0.0.1' }, () => {
          activePorts.push({ port, url: `http://localhost:${port}` });
          tester.destroy();
          resolve();
        });
        tester.on('error', () => resolve());
        tester.setTimeout(300, () => {
          tester.destroy();
          resolve();
        });
      });
    } catch {}
  }

  return c.json({
    project: config.activeProject,
    activePorts,
    isRunning: activePorts.length > 0
  });
});

app.post('/api/project/dev-server/start', async (c) => {
  const targetDir = config.activeProject;
  if (!fs.existsSync(targetDir)) {
    return c.json({ error: 'Direktori project tidak ditemukan' }, 404);
  }

  // Detect package manager
  let cmd = 'npm run dev';
  if (fs.existsSync(path.join(targetDir, 'pnpm-lock.yaml'))) {
    cmd = 'pnpm dev';
  } else if (fs.existsSync(path.join(targetDir, 'yarn.lock'))) {
    cmd = 'yarn dev';
  }

  try {
    const { exec } = await import('child_process');
    const psCmd = `powershell -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd ''${targetDir}''; ${cmd}' -WindowStyle Minimized"`;
    exec(psCmd);
    return c.json({ success: true, message: `Menjalankan ${cmd} di background...`, command: cmd });
  } catch (err: any) {
    return c.json({ error: 'Gagal menjalankan dev server: ' + err.message }, 500);
  }
});

app.post('/api/project/dev-server/stop', async (c) => {
  const { exec } = await import('child_process');
  // Kill processes on ports 3000, 3001, 5173
  const psCmd = `powershell -Command "Get-NetTCPConnection -LocalPort 3000, 3001, 5173 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`;
  exec(psCmd);
  return c.json({ success: true, message: 'Dev server dihentikan.' });
});

// Network & Tunnel
app.get('/api/network/info', async (c) => {
  const info = await tunnelManager.getNetworkInfo();
  return c.json(info);
});

app.post('/api/tunnel/start', async (c) => {
  const { subdomain } = await c.req.json<{ subdomain?: string }>().catch(() => ({} as any));
  const result = await tunnelManager.startTunnel(subdomain);
  return c.json(result);
});

app.post('/api/tunnel/stop', async (c) => {
  const result = await tunnelManager.stopTunnel();
  return c.json(result);
});

// Telegram Bot
app.get('/api/bots/telegram/status', (c) => {
  return c.json(telegramBot.getStatus());
});

app.post('/api/bots/telegram/start', async (c) => {
  const { token } = await c.req.json<{ token?: string }>().catch(() => ({} as any));
  if (token) {
    config.telegram.botToken = token;
    saveConfig(config);
  }
  const result = await telegramBot.start(token);
  return c.json(result);
});

app.post('/api/bots/telegram/stop', async (c) => {
  const result = await telegramBot.stop();
  return c.json(result);
});

// WhatsApp Bot
app.get('/api/bots/whatsapp/status', (c) => {
  return c.json(whatsappBot.getStatus());
});

app.post('/api/bots/whatsapp/start', async (c) => {
  const result = await whatsappBot.start();
  return c.json(result);
});

app.post('/api/bots/whatsapp/logout', async (c) => {
  const result = await whatsappBot.logout();
  return c.json(result);
});

// Static assets serving (dist from Svelte Vite build)
const distDir = path.join(__dirname, '..', 'dist');

app.use('/assets/*', serveStatic({ root: './dist' }));
app.get('*', (c) => {
  const indexHtmlPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    return c.html(fs.readFileSync(indexHtmlPath, 'utf-8'));
  }
  return c.text('Build not found. Please run npm run build.', 404);
});

// Start Server & WebSocket
const PORT = config.port || 3888;
const server = serve({
  fetch: app.fetch,
  port: PORT
});

let io: SocketIOServer | null = null;
try {
  io = new SocketIOServer(server as any, {
    cors: { origin: '*' }
  });

  agentRunner.on('task_start', (data) => io?.emit('agent_task_start', data));
  agentRunner.on('agent_init', (data) => io?.emit('agent_init', data));
  agentRunner.on('agent_delta', (data) => io?.emit('agent_delta', data));
  agentRunner.on('agent_step', (data) => io?.emit('agent_step', data));
  agentRunner.on('agent_result', (data) => io?.emit('agent_result', data));
  agentRunner.on('agent_raw', (data) => io?.emit('agent_raw', data));
  agentRunner.on('agent_stderr', (data) => io?.emit('agent_stderr', data));
  agentRunner.on('task_end', (data) => io?.emit('agent_task_end', data));
  agentRunner.on('task_cancelled', (data) => io?.emit('agent_task_cancelled', data));
  agentRunner.on('task_error', (data) => io?.emit('agent_task_error', data));

  whatsappBot.on('qr', (data) => io?.emit('whatsapp_qr', data));
  whatsappBot.on('status_change', (data) => io?.emit('whatsapp_status', data));
  tunnelManager.on('status_change', (data) => io?.emit('tunnel_status', data));

} catch (err) {
  console.error('Socket.io initialization error:', err);
}

// Auto-start Bots if enabled
if (config.telegram?.enabled && config.telegram?.botToken) {
  telegramBot.start().catch(e => console.error('Auto-start Telegram failed:', e));
}
if (config.whatsapp?.enabled) {
  whatsappBot.start().catch(e => console.error('Auto-start WhatsApp failed:', e));
}

console.log(`===============================================`);
console.log(`⚡ zhiEnd Agent Hono Server running on:`);
console.log(`   👉 Local:   http://localhost:${PORT}`);
console.log(`   👉 LAN:     http://${tunnelManager.getLocalIP()}:${PORT}`);
console.log(`   📁 Project: ${config.activeProject}`);
console.log(`===============================================`);
