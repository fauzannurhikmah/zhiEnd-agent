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
import { voiceService } from './voiceService';
import { AppConfig, FileItem, AgentTask } from './types';
import {
  getWorkspaces,
  setActiveWorkspace,
  removeWorkspace,
  getCustomRootWorkspace,
  setCustomRootWorkspace,
  getWorkspaceContext,
  saveWorkspaceContext,
  autoIndexWorkspaceContext,
  getPersonas,
  createPersona,
  updatePersona,
  deletePersona,
  getPersonaById,
  getChatSessions,
  getChatSessionById,
  createChatSession,
  deleteChatSession,
  updateChatSessionPersona,
  getSessionMessages,
  saveMessageToDb,
  clearSessionMessages,
  getOrCreateDefaultSession,
  saveBase64Avatar,
  saveChatUploadedFile
} from './db/database';

const app = new Hono();

// Load Config from SQLite
let config: AppConfig = loadConfig();

// Initialize Services
const tunnelManager = new TunnelManager(config.port || 3888);
const agentRunner = new AgentRunner(config, () => tunnelManager.publicUrl);

// Auto-start persistent public tunnel on boot
tunnelManager.startTunnel(config.tunnel?.subdomain || 'zhiend-agent').then((res) => {
  if (res.success && res.url) {
    console.log(`[Tunnel] Auto-started persistent tunnel at: ${res.url}`);
    if (config.tunnel) {
      config.tunnel.enabled = true;
      config.tunnel.publicUrl = res.url;
      config.tunnel.subdomain = 'zhiend-agent';
      saveConfig(config);
    }
  }
}).catch((err) => {
  console.warn('[Tunnel] Auto-start failed:', err.message);
});

const onProjectChange = async (newPath: string) => {
  if (!fs.existsSync(newPath)) {
    return { success: false, error: 'Directory does not exist' };
  }
  const stat = fs.statSync(newPath);
  if (!stat.isDirectory()) {
    return { success: false, error: 'Path is not a directory' };
  }

  setActiveWorkspace(newPath);
  config = loadConfig();
  agentRunner.updateConfig(config);
  telegramBot.updateConfig(config);
  whatsappBot.updateConfig(config);
  io?.emit('project_changed', { activeProject: config.activeProject });
  broadcastDevServerStatus(true);
  autoIndexWorkspaceContext(config.activeProject);
  return { success: true, activeProject: config.activeProject };
};

const telegramBot = new TelegramBotManager({
  config,
  agentRunner,
  gitManager,
  onProjectChange,
  onStartDevServer: startActiveProjectDevServer,
  onStopDevServer: stopActiveProjectDevServer,
  getTunnelUrl: () => tunnelManager.publicUrl
});

const whatsappBot = new WhatsAppBotManager({
  config,
  agentRunner,
  gitManager,
  onProjectChange,
  onStartDevServer: startActiveProjectDevServer,
  onStopDevServer: stopActiveProjectDevServer,
  getTunnelUrl: () => tunnelManager.publicUrl
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
    if (updates.telegram.personaId !== undefined) {
      config.telegram.personaId = updates.telegram.personaId;
    }
  }

  if (updates.whatsapp) {
    if (updates.whatsapp.allowedNumbers !== undefined) {
      config.whatsapp.allowedNumbers = updates.whatsapp.allowedNumbers;
    }
    if (updates.whatsapp.enabled !== undefined) {
      config.whatsapp.enabled = updates.whatsapp.enabled;
    }
    if (updates.whatsapp.personaId !== undefined) {
      config.whatsapp.personaId = updates.whatsapp.personaId;
    }
  }

  if (updates.tunnel) {
    if (updates.tunnel.subdomain !== undefined) config.tunnel.subdomain = updates.tunnel.subdomain;
    if (updates.tunnel.provider !== undefined) config.tunnel.provider = updates.tunnel.provider;
  }

  if (updates.voice) {
    if (!config.voice) {
      config.voice = {};
    }
    config.voice = { ...config.voice, ...updates.voice };
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
    if (depth > 3) return;
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
        if (!isGit && !hasPackageJson && depth < 3) {
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

app.post('/api/projects/reset', async (c) => {
  const root = getCustomRootWorkspace();
  const result = await onProjectChange(root);
  return c.json(result);
});

// ==========================================
// DATABASE: Workspaces, Contexts & Root
// ==========================================
app.get('/api/workspaces', (c) => {
  const list = getWorkspaces();
  const root = getCustomRootWorkspace();
  return c.json({
    activeProject: config.activeProject,
    rootWorkspace: root,
    workspaces: list
  });
});

app.post('/api/workspaces/set-active', async (c) => {
  const { path: targetPath } = await c.req.json<{ path: string }>().catch(() => ({} as any));
  if (!targetPath) return c.json({ error: 'Path is required' }, 400);
  const result = await onProjectChange(targetPath);
  return c.json(result);
});

app.post('/api/workspaces/remove', async (c) => {
  const { path: targetPath } = await c.req.json<{ path: string }>().catch(() => ({} as any));
  if (!targetPath) return c.json({ error: 'Path is required' }, 400);
  const result = removeWorkspace(targetPath);
  return c.json(result);
});

app.get('/api/workspaces/root', (c) => {
  return c.json({ root: getCustomRootWorkspace() });
});

app.post('/api/workspaces/root', async (c) => {
  const { root } = await c.req.json<{ root: string }>().catch(() => ({} as any));
  if (!root || !root.trim()) return c.json({ error: 'Root path cannot be empty' }, 400);
  const result = setCustomRootWorkspace(root);
  return c.json(result);
});

app.get('/api/workspaces/context', (c) => {
  const target = c.req.query('path') || config.activeProject;
  const context = getWorkspaceContext(target);
  return c.json({ context });
});

app.post('/api/workspaces/context', async (c) => {
  const { workspaceId, context } = await c.req.json<{ workspaceId: string; context: any }>().catch(() => ({} as any));
  if (!workspaceId) return c.json({ error: 'workspaceId is required' }, 400);
  saveWorkspaceContext(workspaceId, context);
  return c.json({ success: true });
});

// ==========================================
// DATABASE: Personas AI
// ==========================================
app.get('/api/personas', (c) => {
  return c.json({ personas: getPersonas() });
});

app.post('/api/personas', async (c) => {
  const body = await c.req.json<{ name: string; avatar?: string; traits?: string; system_prompt: string; preferred_model?: string }>().catch(() => ({} as any));
  if (!body.name || !body.system_prompt) return c.json({ error: 'Name and system_prompt required' }, 400);
  const persona = createPersona(body);
  return c.json({ persona });
});

app.put('/api/personas/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({} as any));
  const success = updatePersona(id, body);
  const persona = getPersonaById(id);
  return c.json({ success, persona });
});

app.delete('/api/personas/:id', (c) => {
  const id = c.req.param('id');
  const success = deletePersona(id);
  return c.json({ success });
});

app.post('/api/personas/generate-prompt', async (c) => {
  const body = await c.req.json<{ name?: string; traits?: string; preferred_model?: string }>().catch(() => ({} as any));
  const traits = body.traits?.trim() || 'Solutif, Teliti, & Adaptif';
  const name = body.name?.trim() || 'Software Engineer Assistant';

  const prompt = `Anda adalah seorang System Prompt Architect kelas dunia.
Tugas Anda adalah merumuskan instruksi sistem (system prompt) yang kuat, komprehensif, dan elegan untuk seorang Persona AI bernama: "${name}" yang memiliki Sifat & Karakteristik: "${traits}".

Instruksi harus mencakup:
1. Definisi peran & identitas persona.
2. Pendekatan berpikir (mindset) dan tata krama komunikasi yang mencerminkan sifat "${traits}".
3. Standar teknis, kualitas penulisan kode, dan cara menangani masalah/debugging.
4. Gaya respons (bahasa Indonesia yang natural, lugas, profesional).

ATURAN OUTPUT:
- Tuliskan HANYA isi teks instruksi sistem (system prompt) tersebut secara langsung, tanpa kata pengantar, tanpa markdown backtick penutup/pembuka (\`\`\`), tanpa "Berikut adalah system prompt...". Langsung teks instruksinya saja.`;

  try {
    const result = await agentRunner.run({
      prompt,
      cwd: config.activeProject || 'D:\\Works',
      model: body.preferred_model || 'gemini-3.8-flash-low'
    });
    const text = result.response?.trim() || '';
    const cleanText = text.replace(/^```[a-z]*\n?|```$/gi, '').trim();
    return c.json({ prompt: cleanText });
  } catch (err: any) {
    return c.json({ error: err.message || 'Gagal men-generate instruksi sistem' }, 500);
  }
});

// Avatar Upload Endpoint (Gambar / GIF / Video)
const UPLOADS_DIR = path.resolve(__dirname, '../data/uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.post('/api/upload/avatar', async (c) => {
  try {
    const avatarDir = path.join(UPLOADS_DIR, 'avatars');
    if (!fs.existsSync(avatarDir)) {
      fs.mkdirSync(avatarDir, { recursive: true });
    }

    const contentType = c.req.header('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const body = await c.req.parseBody();
      const file = body['file'];
      if (!file || typeof file === 'string') {
        return c.json({ error: 'No file uploaded' }, 400);
      }

      const fileObj = file as File;
      const originalName = (fileObj as any).name || 'avatar.jpg';
      const ext = path.extname(originalName) || '.jpg';
      const cleanExt = ext.startsWith('.') ? ext : `.${ext}`;
      const filename = `avatar-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${cleanExt}`;
      const filePath = path.join(avatarDir, filename);

      const arrayBuffer = await fileObj.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
      const url = `/uploads/avatars/${filename}`;
      return c.json({ success: true, url, filename });
    } else {
      const json = await c.req.json<{ dataUrl?: string; base64?: string }>().catch(() => ({} as any));
      const raw = json.dataUrl || json.base64;
      if (!raw) return c.json({ error: 'No image data provided' }, 400);

      const url = saveBase64Avatar(raw, `upload-${Date.now()}`);
      if (!url) return c.json({ error: 'Invalid image data' }, 400);
      return c.json({ success: true, url });
    }
  } catch (err: any) {
    console.error('Avatar upload error:', err);
    return c.json({ error: 'Upload failed: ' + err.message }, 500);
  }
});

// Chat Media Upload Endpoint (Attachments)
app.post('/api/chat/upload', async (c) => {
  try {
    const chatDir = path.join(UPLOADS_DIR, 'chat');
    if (!fs.existsSync(chatDir)) {
      fs.mkdirSync(chatDir, { recursive: true });
    }

    const contentType = c.req.header('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const body = await c.req.parseBody();
      const file = body['file'];
      if (!file || typeof file === 'string') {
        return c.json({ error: 'No file uploaded' }, 400);
      }

      const fileObj = file as File;
      const originalName = (fileObj as any).name || 'image.jpg';
      const ext = path.extname(originalName) || '.jpg';
      const filename = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
      const filePath = path.join(chatDir, filename);

      const arrayBuffer = await fileObj.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
      const url = `/uploads/chat/${filename}`;
      return c.json({ success: true, url, absolutePath: filePath.replace(/\\/g, '/'), filename });
    } else {
      const json = await c.req.json<{ dataUrl?: string; base64?: string; filename?: string }>().catch(() => ({} as any));
      const raw = json.dataUrl || json.base64;
      if (!raw) return c.json({ error: 'No image data provided' }, 400);

      const matches = raw.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const b64 = matches ? matches[2] : raw;
      const ext = matches ? (matches[1].split('/')[1] || 'jpg') : (json.filename ? path.extname(json.filename).replace('.', '') : 'jpg');
      const filename = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = path.join(chatDir, filename);

      fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
      const url = `/uploads/chat/${filename}`;
      return c.json({ success: true, url, absolutePath: filePath.replace(/\\/g, '/'), filename });
    }
  } catch (err: any) {
    console.error('Chat upload error:', err);
    return c.json({ error: 'Upload failed: ' + err.message }, 500);
  }
});


// ==========================================
// DATABASE: Chat Sessions & Messages (History)
// ==========================================
app.get('/api/chat/sessions', (c) => {
  const ws = c.req.query('workspace');
  const isGlobal = c.req.query('isGlobal') === '1';
  const sessions = getChatSessions(isGlobal ? null : ws);
  return c.json({ sessions });
});

app.post('/api/chat/sessions', async (c) => {
  const body = await c.req.json<{ title: string; workspace_id?: string | null; persona_id?: string | null }>().catch(() => ({} as any));
  if (!body.title) return c.json({ error: 'Title required' }, 400);
  const session = createChatSession(body);
  return c.json({ session });
});

app.delete('/api/chat/sessions/:id', (c) => {
  const id = c.req.param('id');
  const success = deleteChatSession(id);
  return c.json({ success });
});

app.put('/api/chat/sessions/:id/persona', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ persona_id?: string | null }>().catch(() => ({} as any));
  const success = updateChatSessionPersona(id, body.persona_id ?? null);
  return c.json({ success });
});

app.get('/api/chat/messages/:sessionId', (c) => {
  const sessionId = c.req.param('sessionId');
  const messages = getSessionMessages(sessionId);
  return c.json({ messages });
});

app.post('/api/chat/messages/clear/:sessionId', (c) => {
  const sessionId = c.req.param('sessionId');
  const success = clearSessionMessages(sessionId);
  return c.json({ success });
});

// Chat Image Upload Endpoint
app.post('/api/chat/upload', async (c) => {
  try {
    const contentType = c.req.header('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const body = await c.req.parseBody();
      const file = body['file'];
      if (!file || !(file instanceof File)) {
        return c.json({ error: 'Berkas gambar tidak ditemukan dalam formulir upload' }, 400);
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = saveChatUploadedFile(buffer, file.name);
      return c.json({ success: true, ...result });
    }

    // Fallback: Base64 JSON
    const jsonBody = (await c.req.json().catch(() => ({}))) as { base64?: string; name?: string };
    if (jsonBody?.base64) {
      const matches = jsonBody.base64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      const data = matches ? matches[2] : jsonBody.base64;
      const buffer = Buffer.from(data, 'base64');
      const result = saveChatUploadedFile(buffer, jsonBody.name || 'image.jpg');
      return c.json({ success: true, ...result });
    }

    return c.json({ error: 'Format unggahan tidak didukung (harus multipart/form-data atau base64 JSON)' }, 400);
  } catch (err: any) {
    console.error('Chat upload error:', err);
    return c.json({ error: 'Gagal mengunggah gambar: ' + err.message }, 500);
  }
});

// Voice Transcription Endpoint (Web Audio Recording / Upload)
app.post('/api/voice/transcribe', async (c) => {
  try {
    const contentType = c.req.header('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const body = await c.req.parseBody();
      const file = body['file'];
      if (!file || !(file instanceof File)) {
        return c.json({ error: 'Berkas audio tidak ditemukan dalam formulir upload' }, 400);
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const lang = typeof body['lang'] === 'string' ? body['lang'] : undefined;
      const result = await voiceService.transcribeAudio(buffer, file.name, file.type, lang);
      return c.json(result);
    }

    const jsonBody = (await c.req.json().catch(() => ({}))) as { base64?: string; name?: string; mimeType?: string; lang?: string };
    if (jsonBody?.base64) {
      const matches = jsonBody.base64.match(/^data:([A-Za-z-+/0-9]+);base64,(.+)$/);
      const data = matches ? matches[2] : jsonBody.base64;
      const mime = matches ? matches[1] : (jsonBody.mimeType || 'audio/ogg');
      const buffer = Buffer.from(data, 'base64');
      const result = await voiceService.transcribeAudio(buffer, jsonBody.name || 'audio.ogg', mime, jsonBody.lang);
      return c.json(result);
    }

    return c.json({ error: 'Format unggahan audio tidak didukung' }, 400);
  } catch (err: any) {
    console.error('Voice transcription error:', err);
    return c.json({ success: false, error: 'Gagal transkripsi suara: ' + err.message }, 500);
  }
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
  const targetSession = body.sessionId 
    ? (getChatSessionById(body.sessionId) || getOrCreateDefaultSession(workingDir)) 
    : getOrCreateDefaultSession(workingDir);
  const targetSessionId = targetSession.id;

  let sessionPersonaModel: string | undefined;
  if (targetSession?.persona_id) {
    const p = getPersonaById(targetSession.persona_id);
    if (p?.preferred_model) sessionPersonaModel = p.preferred_model;
  }

  // Otomatis jalankan dev server jika pengguna meminta menjalankan projek
  const isRunRequest = /jalankan|running|run dev|start dev|hidupkan|nyalakan.*proje?k/i.test(body.prompt);
  if (isRunRequest) {
    startActiveProjectDevServer().catch(() => {});
  }

  // Run in background
  agentRunner.run({
    prompt: body.prompt,
    cwd: workingDir,
    model: body.model || sessionPersonaModel || config.antigravity?.defaultModel,
    conversationId: body.conversationId,
    continueLast: body.continueLast,
    sessionId: targetSessionId,
    images: Array.isArray(body.images) ? body.images : []
  }).catch(err => {
    console.error('Agent execution error:', err);
  });

  return c.json({
    success: true,
    message: 'Task started',
    project: workingDir,
    sessionId: targetSessionId
  });
});

app.post('/api/agent/cancel', (c) => {
  const cancelled = agentRunner.cancel();
  return c.json({ success: cancelled });
});

// Dev Server Manager
const SAFE_DEV_PORTS = [3000, 3001, 3002, 5174, 5175, 5176, 8000, 8080, 4173, 4200, 8888];
let activeDevServerPid: number | null = null;
let lastDevServerStatusJson = '';

async function getDevServerStatus(): Promise<{
  project: string;
  activePorts: { port: number; url: string }[];
  isRunning: boolean;
}> {
  const activePorts: { port: number; url: string }[] = [];
  try {
    const net = await import('net');
    await Promise.all(
      SAFE_DEV_PORTS.map((port) => {
        return new Promise<void>((resolve) => {
          const tester = net.createConnection({ port, host: '127.0.0.1' }, () => {
            activePorts.push({ port, url: `http://localhost:${port}` });
            tester.destroy();
            resolve();
          });
          tester.on('error', () => resolve());
          tester.setTimeout(250, () => {
            tester.destroy();
            resolve();
          });
        });
      })
    );
  } catch {}

  activePorts.sort((a, b) => a.port - b.port);

  return {
    project: config.activeProject,
    activePorts,
    isRunning: activePorts.length > 0
  };
}

async function broadcastDevServerStatus(force = false) {
  try {
    const status = await getDevServerStatus();
    const json = JSON.stringify(status);
    if (force || json !== lastDevServerStatusJson) {
      lastDevServerStatusJson = json;
      io?.emit('dev_server_status', status);
    }
    return status;
  } catch {
    return null;
  }
}

app.get('/api/project/dev-server/status', async (c) => {
  const status = await getDevServerStatus();
  return c.json(status);
});

// Kill all processes listening on SAFE_DEV_PORTS using direct Windows netstat + taskkill
async function killProcessesOnDevPorts(): Promise<void> {
  const { execSync } = await import('child_process');
  try {
    const netstatOutput = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
    const pidsToKill = new Set<number>();

    for (const line of netstatOutput.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('TCP') || !trimmed.includes('LISTENING')) continue;

      for (const port of SAFE_DEV_PORTS) {
        const regex = new RegExp(`:${port}\\s+`);
        if (regex.test(trimmed)) {
          const parts = trimmed.split(/\s+/);
          const pid = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(pid) && pid > 0 && pid !== process.pid) {
            pidsToKill.add(pid);
          }
        }
      }
    }

    for (const pid of pidsToKill) {
      try {
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
      } catch {}
    }
  } catch (e) {
    console.error('Error killing processes on dev ports:', e);
  }
}

// Stop Dev Server Completely: Kills process tree, powershell windows, ports, and orphaned node.exe
async function stopActiveProjectDevServer(): Promise<{ success: boolean; message: string }> {
  const { execSync } = await import('child_process');

  // 1. Matikan process tree berdasarkan PID yang tercatat
  if (activeDevServerPid) {
    try {
      execSync(`taskkill /F /T /PID ${activeDevServerPid}`, { stdio: 'ignore' });
    } catch {}
    activeDevServerPid = null;
  }

  // 2. Tutup semua jendela PowerShell / CMD berlabel zhiEnd-DevServer secara sinkron
  try {
    execSync(
      'powershell.exe -NoProfile -NonInteractive -Command "Get-Process powershell,cmd -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like \'zhiEnd-DevServer*\' } | Stop-Process -Force -ErrorAction SilentlyContinue"',
      { stdio: 'ignore', timeout: 3000 }
    );
  } catch {}

  // 3. Matikan semua process yang menempati SAFE_DEV_PORTS (port 3000, 5174, dll.)
  await killProcessesOnDevPorts();

  [200, 600, 1200, 2000].forEach((delay) => {
    setTimeout(() => broadcastDevServerStatus(), delay);
  });

  return { success: true, message: 'Dev server berhasil dihentikan sepenuhnya.' };
}

async function startActiveProjectDevServer(): Promise<{ success: boolean; message: string; command?: string }> {
  const targetDir = config.activeProject;
  if (!targetDir || targetDir === 'D:\\Works' || targetDir === 'D:/Works' || !fs.existsSync(targetDir)) {
    return { success: false, message: 'Pilih project yang valid terlebih dahulu' };
  }

  // Bersihkan dulu proses sebelumnya & port yang mungkin masih nyangkut
  await stopActiveProjectDevServer();
  await new Promise((r) => setTimeout(r, 600));

  // Detect project type
  let cmd = 'npm run dev';
  const hasPackageJson = fs.existsSync(path.join(targetDir, 'package.json'));
  const hasIndexHtml = fs.existsSync(path.join(targetDir, 'index.html'));

  if (hasPackageJson) {
    if (fs.existsSync(path.join(targetDir, 'pnpm-lock.yaml'))) {
      cmd = 'pnpm dev';
    } else if (fs.existsSync(path.join(targetDir, 'yarn.lock'))) {
      cmd = 'yarn dev';
    } else {
      cmd = 'npm run dev';
    }
  } else if (hasIndexHtml) {
    cmd = 'npx -y serve -l 3000';
  }

  try {
    const { spawn } = await import('child_process');
    const cleanProjName = path.basename(targetDir);
    const windowTitle = `zhiEnd-DevServer-[${cleanProjName}]`;

    // Pastikan direktori log tersedia
    const logDir = path.join(__dirname, '..', 'data', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, 'dev-server.log');
    const logFd = fs.openSync(logFile, 'a');

    // Di Windows, jalankan via cmd.exe /c dengan log file terhubung agar process tidak crash akibat invalid stdout
    const child = spawn('cmd.exe', ['/c', `title ${windowTitle} && ${cmd}`], {
      cwd: targetDir,
      detached: true,
      stdio: ['ignore', logFd, logFd],
      windowsHide: false
    });

    if (child.pid) {
      activeDevServerPid = child.pid;
      child.unref();
    }

    // Broadcast status secara berkala hingga framework selesai booting (hingga 14s)
    [1000, 2000, 3500, 5000, 7500, 10000, 13000].forEach((delay) => {
      setTimeout(() => broadcastDevServerStatus(), delay);
    });

    return { success: true, message: `Menjalankan ${cmd} di background...`, command: cmd };
  } catch (err: any) {
    return { success: false, message: 'Gagal menjalankan dev server: ' + err.message };
  }
}

app.post('/api/project/dev-server/start', async (c) => {
  const result = await startActiveProjectDevServer();
  if (!result.success) {
    return c.json({ error: result.message }, 400);
  }
  return c.json(result);
});

app.post('/api/project/dev-server/stop', async (c) => {
  const result = await stopActiveProjectDevServer();
  return c.json(result);
});

// Network & Tunnel
app.get('/api/network/info', async (c) => {
  const info = await tunnelManager.getNetworkInfo();
  return c.json(info);
});

app.post('/api/tunnel/start', async (c) => {
  const { subdomain } = await c.req.json<{ subdomain?: string }>().catch(() => ({} as any));
  const targetSub = subdomain?.trim() || config.tunnel?.subdomain || 'zhiend-agent';
  const result = await tunnelManager.startTunnel(targetSub);
  if (result.success && result.url) {
    if (config.tunnel) {
      config.tunnel.enabled = true;
      config.tunnel.publicUrl = result.url;
      config.tunnel.subdomain = targetSub;
      saveConfig(config);
    }
  }
  return c.json(result);
});

app.post('/api/tunnel/stop', async (c) => {
  const result = await tunnelManager.stopTunnel();
  if (config.tunnel) {
    config.tunnel.enabled = false;
    config.tunnel.publicUrl = '';
    saveConfig(config);
  }
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
  }
  const result = await telegramBot.start(token);
  if (result.success) {
    config.telegram.enabled = true;
    saveConfig(config);
  }
  return c.json(result);
});

app.post('/api/bots/telegram/stop', async (c) => {
  const result = await telegramBot.stop();
  if (result.success) {
    config.telegram.enabled = false;
    saveConfig(config);
  }
  return c.json(result);
});

// WhatsApp Bot
app.get('/api/bots/whatsapp/status', (c) => {
  return c.json(whatsappBot.getStatus());
});

app.post('/api/bots/whatsapp/start', async (c) => {
  const result = await whatsappBot.start();
  if (result.success) {
    config.whatsapp.enabled = true;
    saveConfig(config);
  }
  return c.json(result);
});

app.post('/api/bots/whatsapp/logout', async (c) => {
  const result = await whatsappBot.logout();
  if (result.success) {
    config.whatsapp.enabled = false;
    saveConfig(config);
  }
  return c.json(result);
});

app.post('/api/bots/:platform/persona', async (c) => {
  const platform = c.req.param('platform');
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {
    try {
      const raw = await c.req.text();
      body = JSON.parse(raw);
    } catch {}
  }
  const personaId = body?.personaId;
  if (!personaId) {
    return c.json({ success: false, error: 'Persona ID is required' }, 400);
  }

  if (platform === 'whatsapp') {
    if (!config.whatsapp) config.whatsapp = { enabled: false, allowedNumbers: [], personaId };
    config.whatsapp.personaId = personaId;
  } else if (platform === 'telegram') {
    if (!config.telegram) config.telegram = { enabled: false, botToken: '', allowedUsers: [], personaId };
    config.telegram.personaId = personaId;
  } else {
    return c.json({ success: false, error: 'Platform tidak valid' }, 400);
  }

  saveConfig(config);
  telegramBot.updateConfig(config);
  whatsappBot.updateConfig(config);

  return c.json({ success: true, platform, personaId });
});

function getFileMime(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': case '.htm': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': case '.mjs': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    case '.webp': return 'image/webp';
    case '.ico': return 'image/x-icon';
    case '.woff': return 'font/woff';
    case '.woff2': return 'font/woff2';
    case '.ttf': return 'font/ttf';
    case '.mp4': return 'video/mp4';
    case '.webm': return 'video/webm';
    case '.mp3': return 'audio/mpeg';
    case '.pdf': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}

// Live Preview Gateway for Active Project or Sub-projects (Local, LAN, External)
app.all('/preview', (c) => c.redirect('/preview/'));
app.all('/preview/*', async (c) => {
  let relPath = c.req.path.replace(/^\/preview\/?/, '');

  // 1. Cek apakah ada Dev Server yang aktif berjalan (misal port 3000, 5174, dll.)
  try {
    const status = await getDevServerStatus();
    const primaryPortItem = status.activePorts.find(p => p.port !== (config.port || 3888) && p.port !== 5173);
    if (primaryPortItem) {
      const devPort = primaryPortItem.port;
      const urlQuery = c.req.raw.url.includes('?') ? '?' + c.req.raw.url.split('?')[1] : '';
      const targetUrl = `http://127.0.0.1:${devPort}/${relPath}${urlQuery}`;
      const method = c.req.method;

      const reqHeaders = new Headers(c.req.raw.headers);
      reqHeaders.set('host', `127.0.0.1:${devPort}`);
      reqHeaders.delete('content-length');

      const bodyData = ['GET', 'HEAD'].includes(method) ? undefined : await c.req.raw.arrayBuffer();
      const proxyResp = await fetch(targetUrl, {
        method,
        headers: reqHeaders,
        body: bodyData,
        redirect: 'manual'
      });

      const respHeaders = new Headers(proxyResp.headers);
      respHeaders.set('Access-Control-Allow-Origin', '*');

      return new Response(proxyResp.body, {
        status: proxyResp.status,
        headers: respHeaders
      });
    }
  } catch (err: any) {
    console.warn('[Preview Gateway] Proxy attempt notice:', err.message);
  }

  // 2. Fallback: Sajikan file statis dari workspace jika dev server tidak running di port
  let targetDir = config.activeProject || 'D:\\Works';

  let targetFile = path.join(targetDir, relPath || 'index.html');
  if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
    if (fs.existsSync(targetFile) && fs.statSync(targetFile).isDirectory()) {
      targetFile = path.join(targetFile, 'index.html');
    }
  }

  // If not found in activeProject, look in D:\Works/<relPath>
  if (!fs.existsSync(targetFile)) {
    const candidate = path.join('D:\\Works', relPath);
    if (fs.existsSync(candidate)) {
      targetFile = fs.statSync(candidate).isDirectory() ? path.join(candidate, 'index.html') : candidate;
    }
  }

  // If still not found and in root D:\Works, search for recently created index.html in subdirectories
  if (!fs.existsSync(targetFile) && targetDir.toLowerCase().replace(/\\/g, '/').replace(/\/+$/, '') === 'd:/works') {
    try {
      const items = fs.readdirSync('D:\\Works', { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory() && !item.name.startsWith('.') && !['node_modules', '$RECYCLE.BIN'].includes(item.name)) {
          const subIndex = path.join('D:\\Works', item.name, 'index.html');
          if (fs.existsSync(subIndex)) {
            targetFile = subIndex;
            break;
          }
        }
      }
    } catch {}
  }

  if (fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()) {
    const mime = getFileMime(targetFile);
    const content = fs.readFileSync(targetFile);
    return c.body(content, 200, {
      'Content-Type': mime,
      'Access-Control-Allow-Origin': '*'
    });
  }

  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>zhiEnd Live Preview</title>
        <meta charset="utf-8" />
        <style>
          body { background: #07090e; color: #cbd5e1; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #0f172a; border: 1px solid rgba(99,102,241,0.3); border-radius: 16px; padding: 28px; max-width: 480px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
          h2 { color: #818cf8; margin-top: 0; }
          code { background: #1e293b; padding: 2px 6px; border-radius: 6px; color: #38bdf8; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>⚡ zhiEnd Live Preview Gateway</h2>
          <p>Belum ada file <code>index.html</code> yang ditemukan di workspace aktif:<br/><code>${targetDir}</code></p>
          <p style="font-size: 12px; color: #64748b;">Buat file <code>index.html</code> atau pilih project spesifik melalui menu Workspace.</p>
        </div>
      </body>
    </html>
  `, 404);
});

// Static uploads serving (/uploads/avatars/...)
app.get('/uploads/*', (c) => {
  const relPath = c.req.path.replace(/^\/uploads\/?/, '');
  const safePath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(UPLOADS_DIR, safePath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return c.text('File not found', 404);
  }
  const mime = getFileMime(filePath);
  const data = fs.readFileSync(filePath);
  return c.body(data, 200, {
    'Content-Type': mime,
    'Cache-Control': 'public, max-age=31536000, immutable'
  });
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

  io.on('connection', async (socket) => {
    socket.emit('whatsapp_status', whatsappBot.getStatus());
    if (whatsappBot.qrCodeDataUrl) {
      socket.emit('whatsapp_qr', { qrDataUrl: whatsappBot.qrCodeDataUrl, qrCodeDataUrl: whatsappBot.qrCodeDataUrl });
    }
    socket.emit('telegram_status', telegramBot.getStatus());
    socket.emit('tunnel_status', tunnelManager.getStatus());
    try {
      const devStatus = await getDevServerStatus();
      socket.emit('dev_server_status', devStatus);
    } catch {}
  });

  agentRunner.on('task_start', (data) => io?.emit('agent_task_start', data));
  agentRunner.on('agent_init', (data) => io?.emit('agent_init', data));
  agentRunner.on('agent_delta', (data) => io?.emit('agent_delta', data));
  agentRunner.on('agent_step', (data) => io?.emit('agent_step', data));
  agentRunner.on('agent_result', (data) => io?.emit('agent_result', data));
  agentRunner.on('agent_raw', (data) => io?.emit('agent_raw', data));
  agentRunner.on('agent_stderr', (data) => io?.emit('agent_stderr', data));
  agentRunner.on('task_end', (data: AgentTask) => {
    io?.emit('agent_task_end', data);
    broadcastDevServerStatus();
    setTimeout(() => broadcastDevServerStatus(), 2000);
    try {
      const targetSessionId = data.sessionId || (getOrCreateDefaultSession(data.project)).id;
      const taskId = data.id || (data as any).taskId || String(Date.now());
      if (data.prompt) {
        saveMessageToDb({
          id: 'usr-' + taskId,
          session_id: targetSessionId,
          sender: 'user',
          text: data.prompt,
          images: (data as any).images || []
        });
      }
      saveMessageToDb({
        id: 'agent-' + taskId,
        session_id: targetSessionId,
        sender: 'agent',
        text: data.response,
        thought: data.thought,
        steps: data.steps,
        model_used: data.model
      });
    } catch (e) {
      console.error('Failed to auto-save chat message to SQLite:', e);
    }
  });
  agentRunner.on('task_cancelled', (data) => io?.emit('agent_task_cancelled', data));
  agentRunner.on('task_error', (data) => io?.emit('agent_task_error', data));

  whatsappBot.on('qr', (data) => io?.emit('whatsapp_qr', data));
  whatsappBot.on('status_change', (data) => io?.emit('whatsapp_status', data));
  whatsappBot.on('log', (data) => io?.emit('bot_log', data));
  telegramBot.on('status_change', (data) => io?.emit('telegram_status', data));
  telegramBot.on('log', (data) => io?.emit('bot_log', data));
  tunnelManager.on('status_change', (data) => io?.emit('tunnel_status', data));

  // Realtime Dev Server Checker (Every 2.5s)
  setInterval(() => {
    broadcastDevServerStatus();
  }, 2500);

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
