const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { loadConfig, saveConfig } = require('./config');
const AgentRunner = require('./agentRunner');
const gitManager = require('./gitManager');
const TunnelManager = require('./tunnelManager');
const TelegramBotManager = require('./bots/telegramBot');
const WhatsAppBotManager = require('./bots/whatsappBot');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Load Config
let config = loadConfig();

// Initialize Modules
const agentRunner = new AgentRunner(config);
const tunnelManager = new TunnelManager(config.port || 3888);

const onProjectChange = async (newPath) => {
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
  io.emit('project_changed', { activeProject: config.activeProject });
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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Security PIN Middleware for APIs (if PIN configured)
app.use('/api', (req, res, next) => {
  // Allow checking config and auth status without PIN
  if (req.path === '/auth/verify' || req.path === '/auth/status') {
    return next();
  }

  if (config.securityPin && config.securityPin.trim()) {
    const clientPin = req.headers['x-security-pin'] || req.query.pin;
    if (clientPin !== config.securityPin.trim()) {
      return res.status(401).json({ error: 'PIN Keamanan diperlukan atau salah.', needAuth: true });
    }
  }
  next();
});

// Real-time Event Wiring
agentRunner.on('task_start', (data) => io.emit('agent_task_start', data));
agentRunner.on('agent_init', (data) => io.emit('agent_init', data));
agentRunner.on('agent_delta', (data) => io.emit('agent_delta', data));
agentRunner.on('agent_step', (data) => io.emit('agent_step', data));
agentRunner.on('agent_result', (data) => io.emit('agent_result', data));
agentRunner.on('task_end', (data) => io.emit('agent_task_end', data));
agentRunner.on('task_cancelled', (data) => io.emit('agent_task_cancelled', data));
agentRunner.on('task_error', (data) => io.emit('agent_task_error', data));

whatsappBot.on('qr', (data) => io.emit('whatsapp_qr', data));
whatsappBot.on('status_change', (data) => io.emit('whatsapp_status', data));

tunnelManager.on('status_change', (data) => io.emit('tunnel_status', data));

// ---------------- REST APIs ----------------

// Auth
app.get('/api/auth/status', (req, res) => {
  res.json({
    hasPin: !!(config.securityPin && config.securityPin.trim())
  });
});

app.post('/api/auth/verify', (req, res) => {
  const { pin } = req.body;
  if (!config.securityPin || !config.securityPin.trim()) {
    return res.json({ success: true, authorized: true });
  }
  if (pin === config.securityPin.trim()) {
    return res.json({ success: true, authorized: true });
  }
  return res.status(401).json({ success: false, error: 'PIN salah' });
});

// Config
app.get('/api/config', (req, res) => {
  // Hide actual bot token in response for safety
  const safeConfig = {
    ...config,
    telegram: {
      ...config.telegram,
      botTokenSet: !!config.telegram?.botToken,
      botToken: config.telegram?.botToken ? '••••••••' : ''
    }
  };
  res.json(safeConfig);
});

app.post('/api/config', (req, res) => {
  const updates = req.body;
  if (updates.securityPin !== undefined) config.securityPin = updates.securityPin;
  if (updates.defaultModel) config.antigravity.defaultModel = updates.defaultModel;

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

  saveConfig(config);
  agentRunner.updateConfig(config);
  res.json({ success: true, config });
});

// Projects
app.get('/api/projects', (req, res) => {
  res.json({
    activeProject: config.activeProject,
    recentProjects: config.recentProjects
  });
});

app.post('/api/projects/select', async (req, res) => {
  const { path: targetPath } = req.body;
  const result = await onProjectChange(targetPath);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post('/api/projects/add', async (req, res) => {
  const { path: targetPath } = req.body;
  const result = await onProjectChange(targetPath);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.get('/api/projects/files', (req, res) => {
  const activeProj = config.activeProject;
  if (!fs.existsSync(activeProj)) {
    return res.status(404).json({ error: 'Project path not found' });
  }

  function readDirRecursive(dir, maxDepth = 2, currentDepth = 0) {
    if (currentDepth > maxDepth) return [];
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      return items
        .filter(item => !['node_modules', '.git', '.gemini', 'dist', 'build'].includes(item.name))
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
    } catch (e) {
      return [];
    }
  }

  const tree = readDirRecursive(activeProj);
  res.json({ projectPath: activeProj, files: tree });
});

// Git APIs
app.get('/api/git/status', async (req, res) => {
  const status = await gitManager.getStatus(config.activeProject);
  res.json(status);
});

app.get('/api/git/diff', async (req, res) => {
  const { file, staged } = req.query;
  const diff = await gitManager.getDiff(config.activeProject, file, staged === 'true');
  res.json({ diff });
});

app.post('/api/git/stage', async (req, res) => {
  const { files } = req.body;
  const result = await gitManager.stage(config.activeProject, files || ['.']);
  res.json(result);
});

app.post('/api/git/unstage', async (req, res) => {
  const { files } = req.body;
  const result = await gitManager.unstage(config.activeProject, files || ['.']);
  res.json(result);
});

app.post('/api/git/commit', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Commit message is required' });
  }
  const result = await gitManager.commit(config.activeProject, message);
  res.json(result);
});

app.post('/api/git/push', async (req, res) => {
  const { remote, branch } = req.body;
  const result = await gitManager.push(config.activeProject, remote || 'origin', branch);
  res.json(result);
});

app.post('/api/git/pull', async (req, res) => {
  const { remote, branch } = req.body;
  const result = await gitManager.pull(config.activeProject, remote || 'origin', branch);
  res.json(result);
});

app.get('/api/git/commits', async (req, res) => {
  const commits = await gitManager.getRecentCommits(config.activeProject, 15);
  res.json({ commits });
});

app.post('/api/git/ai-commit-msg', async (req, res) => {
  const diff = await gitManager.getDiff(config.activeProject);
  if (!diff || !diff.trim()) {
    return res.json({ message: 'chore: update project files' });
  }

  const prompt = `Based on the following git diff, generate a single concise, conventional git commit message (e.g. "feat: add user authentication", "fix: resolve navbar bug"). Output ONLY the commit message line, with no extra explanation:\n\n${diff.slice(0, 3000)}`;

  try {
    const result = await agentRunner.run({
      prompt,
      cwd: config.activeProject,
      model: 'gemini-3.8-flash-low'
    });
    const cleanMsg = result.response?.trim().split('\n')[0] || 'chore: update codebase';
    res.json({ message: cleanMsg.replace(/^["'`]|["'`]$/g, '') });
  } catch (err) {
    res.json({ message: 'feat: update project files' });
  }
});

// Agent APIs
app.get('/api/agent/status', (req, res) => {
  res.json({
    busy: agentRunner.isBusy(),
    activeTask: agentRunner.activeTask,
    history: agentRunner.history
  });
});

app.post('/api/agent/chat', async (req, res) => {
  const { prompt, model, conversationId, continueLast } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (agentRunner.isBusy()) {
    return res.status(409).json({ error: 'Agent is already running a task.' });
  }

  // Run in background and return immediate acceptance
  const workingDir = config.activeProject;
  res.json({
    success: true,
    message: 'Task started',
    project: workingDir
  });

  try {
    await agentRunner.run({
      prompt,
      cwd: workingDir,
      model: model || config.antigravity?.defaultModel,
      conversationId,
      continueLast
    });
  } catch (err) {
    console.error('Agent execution error:', err);
  }
});

app.post('/api/agent/cancel', (req, res) => {
  const cancelled = agentRunner.cancel();
  res.json({ success: cancelled });
});

// Network & Tunnel
app.get('/api/network/info', async (req, res) => {
  const info = await tunnelManager.getNetworkInfo();
  res.json(info);
});

app.post('/api/tunnel/start', async (req, res) => {
  const { subdomain } = req.body;
  const result = await tunnelManager.startTunnel(subdomain);
  res.json(result);
});

app.post('/api/tunnel/stop', async (req, res) => {
  const result = await tunnelManager.stopTunnel();
  res.json(result);
});

// Telegram Bot APIs
app.get('/api/bots/telegram/status', (req, res) => {
  res.json(telegramBot.getStatus());
});

app.post('/api/bots/telegram/start', async (req, res) => {
  const { token } = req.body;
  if (token) {
    config.telegram.botToken = token;
    saveConfig(config);
  }
  const result = await telegramBot.start(token);
  res.json(result);
});

app.post('/api/bots/telegram/stop', async (req, res) => {
  const result = await telegramBot.stop();
  res.json(result);
});

// WhatsApp Bot APIs
app.get('/api/bots/whatsapp/status', (req, res) => {
  res.json(whatsappBot.getStatus());
});

app.post('/api/bots/whatsapp/start', async (req, res) => {
  const result = await whatsappBot.start();
  res.json(result);
});

app.post('/api/bots/whatsapp/logout', async (req, res) => {
  const result = await whatsappBot.logout();
  res.json(result);
});

// Start Telegram Bot automatically if enabled and token present
if (config.telegram?.enabled && config.telegram?.botToken) {
  telegramBot.start().catch(e => console.error('Auto-start Telegram failed:', e));
}

// Start WhatsApp Bot automatically if enabled
if (config.whatsapp?.enabled) {
  whatsappBot.start().catch(e => console.error('Auto-start WhatsApp failed:', e));
}

const PORT = config.port || 3888;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`🚀 zhiEnd Agent Server running on:`);
  console.log(`   👉 Local:   http://localhost:${PORT}`);
  console.log(`   👉 LAN:     http://${tunnelManager.getLocalIP()}:${PORT}`);
  console.log(`   📁 Project: ${config.activeProject}`);
  console.log(`===============================================`);
});
