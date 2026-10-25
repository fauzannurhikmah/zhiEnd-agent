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
  const body = await c.req.json<{
    prompt: string;
    model?: string;
    conversationId?: string;
    continueLast?: boolean;
  }>();

  if (!body.prompt || !body.prompt.trim()) {
    return c.json({ error: 'Prompt is required' }, 400);
  }

  if (agentRunner.isBusy()) {
    return c.json({ error: 'Agent is already running a task.' }, 409);
  }

  const workingDir = config.activeProject;

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
