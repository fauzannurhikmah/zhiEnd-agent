import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { 
  AppConfig, 
  ProcessStep, 
  WorkspaceItem, 
  WorkspaceContext, 
  PersonaItem, 
  ChatSessionItem, 
  ChatMessageRecord, 
  BotIntegrationRecord 
} from '../types';

export const DB_DIR = path.join(__dirname, '..', '..', 'data');
export const DB_PATH = path.join(DB_DIR, 'zhiend.db');
export const LEGACY_CONFIG_PATH = path.join(DB_DIR, 'config.json');

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
    initTables(dbInstance);
    migrateFromLegacyConfig(dbInstance);
  }
  return dbInstance;
}

function initTables(db: Database.Database): void {
  db.exec(`
    -- 1. Global Settings
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Workspaces
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT UNIQUE NOT NULL,
      is_active INTEGER DEFAULT 0,
      is_root INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_opened_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Workspace Context Cache (Hemat Token & Speed)
    CREATE TABLE IF NOT EXISTS workspace_contexts (
      workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
      tech_stack TEXT,
      package_manager TEXT,
      dev_command TEXT,
      dev_port INTEGER,
      architecture_summary TEXT,
      key_files_json TEXT,
      custom_rules TEXT,
      last_indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. Personas AI
    CREATE TABLE IF NOT EXISTS personas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT,
      traits TEXT,
      system_prompt TEXT NOT NULL,
      preferred_model TEXT,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. Chat Sessions (Threads per Workspace atau Global)
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
      persona_id TEXT REFERENCES personas(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      is_pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 6. Messages (Lengkap dengan reasoning, line changes, steps)
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      sender TEXT NOT NULL CHECK(sender IN ('user', 'agent', 'system')),
      text TEXT NOT NULL,
      thought TEXT,
      steps_json TEXT,
      model_used TEXT,
      tokens_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 7. Bot Integrations
    CREATE TABLE IF NOT EXISTS bot_integrations (
      platform TEXT PRIMARY KEY,
      is_enabled INTEGER DEFAULT 0,
      token_or_session TEXT,
      allowed_identifiers TEXT,
      default_workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
      default_persona_id TEXT REFERENCES personas(id) ON DELETE SET NULL,
      settings_json TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_workspace ON chat_sessions(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_workspaces_active ON workspaces(is_active);
  `);

  try {
    db.prepare('ALTER TABLE personas ADD COLUMN traits TEXT').run();
  } catch {}

  // Update default persona traits if missing
  try {
    db.prepare("UPDATE personas SET traits = 'Solutif, Teliti, & Adaptif' WHERE id = 'persona-default' AND (traits IS NULL OR traits = '')").run();
    db.prepare("UPDATE personas SET traits = 'Kritis, Analitis, & Perfeksionis' WHERE id = 'persona-reviewer' AND (traits IS NULL OR traits = '')").run();
    db.prepare("UPDATE personas SET traits = 'Pragmatis, Efisien, & Cepat' WHERE id = 'persona-devops' AND (traits IS NULL OR traits = '')").run();
  } catch {}
}

function migrateFromLegacyConfig(db: Database.Database): void {
  const countRow = db.prepare('SELECT count(*) as count FROM app_settings').get() as { count: number };
  if (countRow && countRow.count > 0) {
    // Database already seeded
    return;
  }

  console.log('📦 Inisialisasi & Migrasi Database SQLite zhiEnd Agent dari config.json...');

  let legacyConfig: any = null;
  if (fs.existsSync(LEGACY_CONFIG_PATH)) {
    try {
      const content = fs.readFileSync(LEGACY_CONFIG_PATH, 'utf-8');
      legacyConfig = JSON.parse(content);
    } catch (e) {
      console.warn('Gagal membaca config.json lama, menggunakan nilai default:', e);
    }
  }

  // 1. Seed Personas AI Bawaan
  const insertPersona = db.prepare(`
    INSERT OR IGNORE INTO personas (id, name, avatar, traits, system_prompt, preferred_model, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertPersona.run(
    'persona-default',
    'zhiEnd Fullstack Engineer',
    '⚡',
    'Solutif, Teliti, & Adaptif',
    'Anda adalah zhiEnd Assistant, AI software engineer tingkat lanjut yang mahir dalam merancang, menulis, dan merefaktor kode berkualitas produksi secara clean, modular, dan efisien.',
    'gemini-3.8-flash-high',
    1
  );

  insertPersona.run(
    'persona-reviewer',
    'Senior Code Reviewer & Architect',
    '🔍',
    'Kritis, Analitis, & Perfeksionis',
    'Anda adalah Senior Code Reviewer dan Software Architect. Analisis kode dengan sangat teliti, temukan potensi bug, memory leak, security risk, serta berikan rekomendasi perbaikan berbasis best practice.',
    'claude-sonnet-4-6',
    0
  );

  insertPersona.run(
    'persona-devops',
    'DevOps & System Specialist',
    '🚀',
    'Pragmatis, Efisien, & Cepat',
    'Anda adalah DevOps dan System Engineer. Ahli dalam CI/CD, script PowerShell/Bash, automasi task, port management, networking tunnel, dan optimasi performa backend.',
    'gemini-3.8-flash-medium',
    0
  );

  // 2. Seed Workspaces dari recentProjects
  const activeProject = legacyConfig?.activeProject || 'D:\\Works';
  const recentProjects: string[] = Array.isArray(legacyConfig?.recentProjects) && legacyConfig.recentProjects.length > 0
    ? legacyConfig.recentProjects
    : ['D:\\Works'];

  const insertWorkspace = db.prepare(`
    INSERT OR IGNORE INTO workspaces (id, name, path, is_active, is_root)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const p of recentProjects) {
    const normPath = path.resolve(p);
    const name = path.basename(normPath) || normPath;
    const isAct = normPath.toLowerCase() === path.resolve(activeProject).toLowerCase() ? 1 : 0;
    const isRoot = normPath.toLowerCase() === 'd:\\works' ? 1 : 0;
    const id = 'ws-' + Buffer.from(normPath).toString('base64url').slice(0, 16);
    insertWorkspace.run(id, name, normPath, isAct, isRoot);
  }

  // 3. Seed App Settings
  const insertSetting = db.prepare(`
    INSERT OR REPLACE INTO app_settings (key, value, description)
    VALUES (?, ?, ?)
  `);

  insertSetting.run('port', String(legacyConfig?.port || 3888), 'Port lokal Hono server');
  insertSetting.run('security_pin', String(legacyConfig?.securityPin || ''), 'PIN proteksi akses antarmuka');
  insertSetting.run('default_workspace_root', 'D:\\Works', 'Root folder utama untuk workspace');
  insertSetting.run('antigravity_cli_path', legacyConfig?.antigravity?.cliPath || 'C:\\Users\\zhien\\AppData\\Local\\agy\\bin\\agy.exe', 'Path binary Antigravity CLI');
  insertSetting.run('default_model', legacyConfig?.antigravity?.defaultModel || 'gemini-3.8-flash-high', 'Model AI default');
  
  const models = legacyConfig?.antigravity?.availableModels || [
    { id: 'gemini-3.8-flash-high', name: 'Gemini 3.8 Flash (High Reasoning)' },
    { id: 'gemini-3.8-flash-medium', name: 'Gemini 3.8 Flash (Medium Reasoning)' },
    { id: 'gemini-3.8-flash-low', name: 'Gemini 3.8 Flash (Fast / Low Reasoning)' },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6 (Thinking)' },
    { id: 'claude-opus-4-6-thinking', name: 'Claude Opus 4.6 (Thinking)' }
  ];
  insertSetting.run('available_models', JSON.stringify(models), 'Daftar model yang didukung');

  const tunnelConfig = legacyConfig?.tunnel || {
    enabled: false,
    provider: 'localtunnel',
    subdomain: '',
    publicUrl: ''
  };
  insertSetting.run('tunnel_config', JSON.stringify(tunnelConfig), 'Konfigurasi public tunnel');

  // 4. Seed Bot Integrations
  const insertBot = db.prepare(`
    INSERT OR REPLACE INTO bot_integrations (platform, is_enabled, token_or_session, allowed_identifiers, settings_json)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertBot.run(
    'telegram',
    legacyConfig?.telegram?.enabled ? 1 : 0,
    legacyConfig?.telegram?.botToken || '',
    JSON.stringify(legacyConfig?.telegram?.allowedUsers || []),
    JSON.stringify({})
  );

  insertBot.run(
    'whatsapp',
    legacyConfig?.whatsapp?.enabled ? 1 : 0,
    '',
    JSON.stringify(legacyConfig?.whatsapp?.allowedNumbers || []),
    JSON.stringify({})
  );

  // 5. Buat Sesi Global Chat Bawaan
  const insertSession = db.prepare(`
    INSERT OR IGNORE INTO chat_sessions (id, workspace_id, persona_id, title)
    VALUES (?, ?, ?, ?)
  `);
  insertSession.run('session-global-default', null, 'persona-default', 'Diskusi Global');

  console.log('✅ Migrasi database SQLite berhasil diselesaikan: data/zhiend.db');
}

// ==========================================
// COMPATIBILITY LAYER: AppConfig <-> SQLite
// ==========================================
export function loadConfigFromDb(): AppConfig {
  const db = getDb();
  
  const getSetting = (key: string, def: string = ''): string => {
    const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? row.value : def;
  };

  const activeWsRow = db.prepare('SELECT path FROM workspaces WHERE is_active = 1 LIMIT 1').get() as { path: string } | undefined;
  const recentWsRows = db.prepare('SELECT path FROM workspaces ORDER BY last_opened_at DESC LIMIT 15').all() as { path: string }[];

  const port = parseInt(getSetting('port', '3888'), 10) || 3888;
  const securityPin = getSetting('security_pin', '');
  const activeProject = activeWsRow ? activeWsRow.path : getSetting('default_workspace_root', 'D:\\Works');
  const recentProjects = recentWsRows.length > 0 ? recentWsRows.map(r => r.path) : [activeProject];

  let availableModels = [
    { id: 'gemini-3.8-flash-high', name: 'Gemini 3.8 Flash (High Reasoning)' },
    { id: 'gemini-3.8-flash-medium', name: 'Gemini 3.8 Flash (Medium Reasoning)' },
    { id: 'gemini-3.8-flash-low', name: 'Gemini 3.8 Flash (Fast / Low Reasoning)' },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6 (Thinking)' },
    { id: 'claude-opus-4-6-thinking', name: 'Claude Opus 4.6 (Thinking)' }
  ];
  try {
    const modelsRaw = getSetting('available_models');
    if (modelsRaw) availableModels = JSON.parse(modelsRaw);
  } catch {}

  let tunnel = {
    enabled: false,
    provider: 'localtunnel',
    subdomain: '',
    publicUrl: ''
  };
  try {
    const tunnelRaw = getSetting('tunnel_config');
    if (tunnelRaw) tunnel = JSON.parse(tunnelRaw);
  } catch {}

  const tgRow = db.prepare('SELECT * FROM bot_integrations WHERE platform = ?').get('telegram') as any;
  let tgAllowed: string[] = [];
  try {
    if (tgRow?.allowed_identifiers) tgAllowed = JSON.parse(tgRow.allowed_identifiers);
  } catch {}

  const waRow = db.prepare('SELECT * FROM bot_integrations WHERE platform = ?').get('whatsapp') as any;
  let waAllowed: string[] = [];
  try {
    if (waRow?.allowed_identifiers) waAllowed = JSON.parse(waRow.allowed_identifiers);
  } catch {}

  return {
    port,
    securityPin,
    activeProject,
    recentProjects,
    antigravity: {
      cliPath: getSetting('antigravity_cli_path', 'C:\\Users\\zhien\\AppData\\Local\\agy\\bin\\agy.exe'),
      defaultModel: getSetting('default_model', 'gemini-3.8-flash-high'),
      availableModels
    },
    telegram: {
      enabled: tgRow ? Boolean(tgRow.is_enabled) : false,
      botToken: tgRow ? tgRow.token_or_session || '' : '',
      allowedUsers: tgAllowed
    },
    whatsapp: {
      enabled: waRow ? Boolean(waRow.is_enabled) : false,
      allowedNumbers: waAllowed
    },
    tunnel
  };
}

export function saveConfigToDb(newConfig: Partial<AppConfig>): void {
  const db = getDb();
  const setSetting = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');

  if (newConfig.port !== undefined) setSetting.run('port', String(newConfig.port));
  if (newConfig.securityPin !== undefined) setSetting.run('security_pin', String(newConfig.securityPin));

  if (newConfig.activeProject) {
    db.prepare('UPDATE workspaces SET is_active = 0').run();
    const norm = path.resolve(newConfig.activeProject);
    const existing = db.prepare('SELECT id FROM workspaces WHERE lower(path) = lower(?)').get(norm) as { id: string } | undefined;
    if (existing) {
      db.prepare('UPDATE workspaces SET is_active = 1, last_opened_at = CURRENT_TIMESTAMP WHERE id = ?').run(existing.id);
    } else {
      const id = 'ws-' + Buffer.from(norm).toString('base64url').slice(0, 16);
      const name = path.basename(norm) || norm;
      const isRoot = norm.toLowerCase() === 'd:\\works' ? 1 : 0;
      db.prepare('INSERT INTO workspaces (id, name, path, is_active, is_root) VALUES (?, ?, ?, 1, ?)').run(id, name, norm, isRoot);
    }
  }

  if (newConfig.antigravity) {
    if (newConfig.antigravity.cliPath) setSetting.run('antigravity_cli_path', newConfig.antigravity.cliPath);
    if (newConfig.antigravity.defaultModel) setSetting.run('default_model', newConfig.antigravity.defaultModel);
    if (newConfig.antigravity.availableModels) setSetting.run('available_models', JSON.stringify(newConfig.antigravity.availableModels));
  }

  if (newConfig.telegram) {
    db.prepare(`
      UPDATE bot_integrations 
      SET is_enabled = ?, token_or_session = ?, allowed_identifiers = ?, updated_at = CURRENT_TIMESTAMP
      WHERE platform = 'telegram'
    `).run(
      newConfig.telegram.enabled ? 1 : 0,
      newConfig.telegram.botToken || '',
      JSON.stringify(newConfig.telegram.allowedUsers || [])
    );
  }

  if (newConfig.whatsapp) {
    db.prepare(`
      UPDATE bot_integrations 
      SET is_enabled = ?, allowed_identifiers = ?, updated_at = CURRENT_TIMESTAMP
      WHERE platform = 'whatsapp'
    `).run(
      newConfig.whatsapp.enabled ? 1 : 0,
      JSON.stringify(newConfig.whatsapp.allowedNumbers || [])
    );
  }

  if (newConfig.tunnel) {
    setSetting.run('tunnel_config', JSON.stringify(newConfig.tunnel));
  }
}

// ==========================================
// WORKSPACES & CONTEXT MANAGEMENT
// ==========================================
export function getWorkspaces(): WorkspaceItem[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, name, path, is_active, is_root, created_at, last_opened_at 
    FROM workspaces 
    ORDER BY is_active DESC, last_opened_at DESC
  `).all() as any[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    path: r.path,
    is_active: Boolean(r.is_active),
    is_root: Boolean(r.is_root),
    created_at: r.created_at,
    last_opened_at: r.last_opened_at
  }));
}

export function setActiveWorkspace(targetPath: string): { success: boolean; activeProject: string } {
  const db = getDb();
  const norm = path.resolve(targetPath);
  db.prepare('UPDATE workspaces SET is_active = 0').run();
  
  const existing = db.prepare('SELECT id FROM workspaces WHERE lower(path) = lower(?)').get(norm) as { id: string } | undefined;
  if (existing) {
    db.prepare('UPDATE workspaces SET is_active = 1, last_opened_at = CURRENT_TIMESTAMP WHERE id = ?').run(existing.id);
  } else {
    const id = 'ws-' + Buffer.from(norm).toString('base64url').slice(0, 16);
    const name = path.basename(norm) || norm;
    const isRoot = norm.toLowerCase() === 'd:\\works' ? 1 : 0;
    db.prepare('INSERT INTO workspaces (id, name, path, is_active, is_root) VALUES (?, ?, ?, 1, ?)').run(id, name, norm, isRoot);
  }
  return { success: true, activeProject: norm };
}

export function removeWorkspace(targetPath: string): { success: boolean } {
  const db = getDb();
  const norm = path.resolve(targetPath);
  db.prepare('DELETE FROM workspaces WHERE lower(path) = lower(?)').run(norm);
  return { success: true };
}

export function getCustomRootWorkspace(): string {
  const db = getDb();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'default_workspace_root'").get() as { value: string } | undefined;
  return row ? row.value : 'D:\\Works';
}

export function setCustomRootWorkspace(rootPath: string): { success: boolean; root: string } {
  const db = getDb();
  const norm = path.resolve(rootPath);
  db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('default_workspace_root', ?)").run(norm);
  return { success: true, root: norm };
}

// Workspace Context (AI Caching)
export function getWorkspaceContext(workspaceIdOrPath: string): WorkspaceContext | null {
  const db = getDb();
  let row = db.prepare(`
    SELECT * FROM workspace_contexts WHERE workspace_id = ?
  `).get(workspaceIdOrPath) as any;

  if (!row) {
    const ws = db.prepare('SELECT id FROM workspaces WHERE lower(path) = lower(?)').get(workspaceIdOrPath) as { id: string } | undefined;
    if (ws) {
      row = db.prepare('SELECT * FROM workspace_contexts WHERE workspace_id = ?').get(ws.id) as any;
    }
  }

  if (!row) return null;
  let keyFiles: string[] = [];
  try {
    if (row.key_files_json) keyFiles = JSON.parse(row.key_files_json);
  } catch {}

  return {
    workspace_id: row.workspace_id,
    tech_stack: row.tech_stack,
    package_manager: row.package_manager,
    dev_command: row.dev_command,
    dev_port: row.dev_port,
    architecture_summary: row.architecture_summary,
    key_files: keyFiles,
    custom_rules: row.custom_rules,
    last_indexed_at: row.last_indexed_at
  };
}

export function saveWorkspaceContext(workspaceId: string, ctx: Partial<WorkspaceContext>): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO workspace_contexts (
      workspace_id, tech_stack, package_manager, dev_command, dev_port, architecture_summary, key_files_json, custom_rules, last_indexed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    workspaceId,
    ctx.tech_stack || null,
    ctx.package_manager || null,
    ctx.dev_command || null,
    ctx.dev_port || null,
    ctx.architecture_summary || null,
    ctx.key_files ? JSON.stringify(ctx.key_files) : null,
    ctx.custom_rules || null
  );
}

export function autoIndexWorkspaceContext(workingDir: string): void {
  try {
    if (!fs.existsSync(workingDir)) return;
    const db = getDb();
    const ws = db.prepare('SELECT id FROM workspaces WHERE lower(path) = lower(?)').get(workingDir) as { id: string } | undefined;
    const wsId = ws ? ws.id : workingDir;

    const pkgPath = path.join(workingDir, 'package.json');
    let tech = 'Pure Web / HTML';
    let pkgMgr = 'npm';
    let devCmd = 'npx -y serve -l 3000';
    let devPort = 3000;
    const keyFiles: string[] = [];

    const candidates = ['index.html', 'package.json', 'src/App.svelte', 'src/App.tsx', 'src/main.ts', 'src/index.ts', 'server/index.ts', 'app/page.tsx'];
    for (const c of candidates) {
      if (fs.existsSync(path.join(workingDir, c))) {
        keyFiles.push(c);
      }
    }

    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const techList: string[] = [];
      if (deps['next']) techList.push('Next.js');
      if (deps['svelte']) techList.push('Svelte');
      if (deps['react']) techList.push('React');
      if (deps['vue']) techList.push('Vue');
      if (deps['vite']) techList.push('Vite');
      if (deps['tailwindcss']) techList.push('Tailwind CSS');
      if (deps['hono']) techList.push('Hono');
      if (deps['prisma'] || deps['@prisma/client']) techList.push('Prisma');
      tech = techList.length > 0 ? techList.join(', ') : 'Node.js App';

      if (fs.existsSync(path.join(workingDir, 'pnpm-lock.yaml'))) pkgMgr = 'pnpm';
      else if (fs.existsSync(path.join(workingDir, 'yarn.lock'))) pkgMgr = 'yarn';
      else if (fs.existsSync(path.join(workingDir, 'bun.lockb'))) pkgMgr = 'bun';

      devCmd = `${pkgMgr} dev`;
      devPort = deps['vite'] ? 5174 : 3000;
    }

    saveWorkspaceContext(wsId, {
      tech_stack: tech,
      package_manager: pkgMgr,
      dev_command: devCmd,
      dev_port: devPort,
      key_files: keyFiles
    });
  } catch (err) {
    console.warn('Auto indexing context error:', err);
  }
}

// ==========================================
// PERSONAS AI MANAGEMENT
// ==========================================
export function getPersonas(): PersonaItem[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM personas ORDER BY is_default DESC, created_at ASC').all() as any[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    avatar: r.avatar || '⚡',
    traits: r.traits || null,
    system_prompt: r.system_prompt,
    preferred_model: r.preferred_model,
    is_default: Boolean(r.is_default),
    created_at: r.created_at
  }));
}

export function createPersona(data: { name: string; avatar?: string; traits?: string; system_prompt: string; preferred_model?: string }): PersonaItem {
  const db = getDb();
  const id = 'persona-' + Date.now();
  db.prepare(`
    INSERT INTO personas (id, name, avatar, traits, system_prompt, preferred_model, is_default)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `).run(id, data.name, data.avatar || '🤖', data.traits || null, data.system_prompt, data.preferred_model || 'gemini-3.8-flash-high');
  return {
    id,
    name: data.name,
    avatar: data.avatar || '🤖',
    traits: data.traits || null,
    system_prompt: data.system_prompt,
    preferred_model: data.preferred_model,
    is_default: false
  };
}

export function updatePersona(id: string, data: Partial<PersonaItem>): boolean {
  const db = getDb();
  const current = db.prepare('SELECT * FROM personas WHERE id = ?').get(id) as any;
  if (!current) return false;

  db.prepare(`
    UPDATE personas 
    SET name = ?, avatar = ?, traits = ?, system_prompt = ?, preferred_model = ?
    WHERE id = ?
  `).run(
    data.name ?? current.name,
    data.avatar ?? current.avatar,
    data.traits ?? current.traits,
    data.system_prompt ?? current.system_prompt,
    data.preferred_model ?? current.preferred_model,
    id
  );
  return true;
}

export function deletePersona(id: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT is_default FROM personas WHERE id = ?').get(id) as any;
  if (row && row.is_default) return false; // Jangan hapus persona default
  db.prepare('DELETE FROM personas WHERE id = ?').run(id);
  return true;
}

export function getPersonaById(id: string): PersonaItem | null {
  const db = getDb();
  const r = db.prepare('SELECT * FROM personas WHERE id = ?').get(id) as any;
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    avatar: r.avatar || '⚡',
    traits: r.traits || null,
    system_prompt: r.system_prompt,
    preferred_model: r.preferred_model,
    is_default: Boolean(r.is_default),
    created_at: r.created_at
  };
}

export function updateChatSessionPersona(sessionId: string, personaId: string | null): boolean {
  const db = getDb();
  db.prepare('UPDATE chat_sessions SET persona_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(personaId, sessionId);
  return true;
}

// ==========================================
// CHAT SESSIONS & MESSAGES (HISTORY)
// ==========================================
export function getChatSessionById(id: string): ChatSessionItem | null {
  const db = getDb();
  const r = db.prepare(`
    SELECT s.*, count(m.id) as message_count, max(m.created_at) as last_msg_time
    FROM chat_sessions s
    LEFT JOIN messages m ON s.id = m.session_id
    WHERE s.id = ?
    GROUP BY s.id
  `).get(id) as any;

  if (!r) return null;
  return {
    id: r.id,
    workspace_id: r.workspace_id,
    persona_id: r.persona_id,
    title: r.title,
    is_pinned: Boolean(r.is_pinned),
    created_at: r.created_at,
    updated_at: r.updated_at,
    message_count: r.message_count || 0
  };
}

export function getChatSessions(workspacePathOrId?: string | null): ChatSessionItem[] {
  const db = getDb();
  let query = `
    SELECT s.*, count(m.id) as message_count, max(m.created_at) as last_msg_time
    FROM chat_sessions s
    LEFT JOIN messages m ON s.id = m.session_id
  `;
  const params: any[] = [];

  if (workspacePathOrId === null) {
    query += ` WHERE s.workspace_id IS NULL `;
  } else if (workspacePathOrId !== undefined) {
    const norm = path.resolve(workspacePathOrId);
    const ws = db.prepare('SELECT id FROM workspaces WHERE lower(path) = lower(?) OR lower(path) = lower(?) OR id = ?').get(workspacePathOrId, norm, workspacePathOrId) as { id: string } | undefined;
    if (ws) {
      query += ` WHERE (s.workspace_id = ? OR s.workspace_id = ? OR s.workspace_id = ?) `;
      params.push(ws.id, workspacePathOrId, norm);
    } else {
      query += ` WHERE (s.workspace_id = ? OR s.workspace_id = ?) `;
      params.push(workspacePathOrId, norm);
    }
  }

  query += ` GROUP BY s.id ORDER BY s.is_pinned DESC, s.updated_at DESC`;
  const rows = db.prepare(query).all(...params) as any[];

  return rows.map(r => ({
    id: r.id,
    workspace_id: r.workspace_id,
    persona_id: r.persona_id,
    title: r.title,
    is_pinned: Boolean(r.is_pinned),
    created_at: r.created_at,
    updated_at: r.updated_at,
    message_count: r.message_count || 0
  }));
}

export function getOrCreateDefaultSession(workspacePath?: string | null): ChatSessionItem {
  const db = getDb();
  let wsId: string | null = null;
  if (workspacePath && workspacePath.toLowerCase() !== 'd:\\works') {
    const norm = path.resolve(workspacePath);
    const ws = db.prepare('SELECT id FROM workspaces WHERE lower(path) = lower(?) OR lower(path) = lower(?) OR id = ?').get(workspacePath, norm, workspacePath) as { id: string } | undefined;
    if (ws) {
      wsId = ws.id;
    } else {
      const id = 'ws-' + Buffer.from(norm).toString('base64url').slice(0, 16);
      const name = path.basename(norm) || norm;
      const isRoot = norm.toLowerCase() === 'd:\\works' ? 1 : 0;
      db.prepare('INSERT OR IGNORE INTO workspaces (id, name, path, is_active, is_root) VALUES (?, ?, ?, 1, ?)').run(id, name, norm, isRoot);
      wsId = id;
    }
  }

  let session = db.prepare(`
    SELECT * FROM chat_sessions 
    WHERE ${wsId ? '(workspace_id = ? OR workspace_id = ?)' : 'workspace_id IS NULL'} 
    ORDER BY updated_at DESC LIMIT 1
  `).get(...(wsId ? [wsId, workspacePath] : [])) as any;

  if (!session) {
    const id = 'sess-' + Date.now();
    const title = wsId ? 'Sesi Project' : 'Diskusi Global';
    db.prepare(`
      INSERT INTO chat_sessions (id, workspace_id, persona_id, title)
      VALUES (?, ?, 'persona-default', ?)
    `).run(id, wsId, title);

    session = { id, workspace_id: wsId, persona_id: 'persona-default', title, is_pinned: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  }

  return {
    id: session.id,
    workspace_id: session.workspace_id,
    persona_id: session.persona_id,
    title: session.title,
    is_pinned: Boolean(session.is_pinned),
    created_at: session.created_at,
    updated_at: session.updated_at
  };
}

export function createChatSession(data: { title: string; workspace_id?: string | null; persona_id?: string | null }): ChatSessionItem {
  const db = getDb();
  let wsId: string | null = null;
  if (data.workspace_id) {
    const norm = path.resolve(data.workspace_id);
    const existingById = db.prepare('SELECT id FROM workspaces WHERE id = ?').get(data.workspace_id) as { id: string } | undefined;
    if (existingById) {
      wsId = existingById.id;
    } else {
      const existingByPath = db.prepare('SELECT id FROM workspaces WHERE lower(path) = lower(?) OR lower(path) = lower(?)').get(data.workspace_id, norm) as { id: string } | undefined;
      if (existingByPath) {
        wsId = existingByPath.id;
      } else {
        const id = 'ws-' + Buffer.from(norm).toString('base64url').slice(0, 16);
        const name = path.basename(norm) || norm;
        const isRoot = norm.toLowerCase() === 'd:\\works' ? 1 : 0;
        db.prepare('INSERT OR IGNORE INTO workspaces (id, name, path, is_active, is_root) VALUES (?, ?, ?, 1, ?)').run(id, name, norm, isRoot);
        wsId = id;
      }
    }
  }

  let personaId: string | null = null;
  const p = data.persona_id || 'persona-default';
  const existingPersona = db.prepare('SELECT id FROM personas WHERE id = ?').get(p);
  if (existingPersona) personaId = p;

  const id = 'sess-' + Date.now();
  db.prepare(`
    INSERT INTO chat_sessions (id, workspace_id, persona_id, title)
    VALUES (?, ?, ?, ?)
  `).run(id, wsId, personaId, data.title || 'Diskusi Baru');

  return {
    id,
    workspace_id: wsId,
    persona_id: personaId,
    title: data.title || 'Diskusi Baru',
    is_pinned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    message_count: 0
  };
}


export function deleteChatSession(id: string): boolean {
  const db = getDb();
  db.prepare('DELETE FROM chat_sessions WHERE id = ?').run(id);
  return true;
}

export function getSessionMessages(sessionId: string): ChatMessageRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC
  `).all(sessionId) as any[];

  return rows.map(r => {
    let steps: ProcessStep[] = [];
    try {
      if (r.steps_json) steps = JSON.parse(r.steps_json);
    } catch {}

    return {
      id: r.id,
      session_id: r.session_id,
      sender: r.sender,
      text: r.text || '',
      thought: r.thought,
      steps,
      model_used: r.model_used,
      tokens_used: r.tokens_used,
      created_at: r.created_at
    };
  });
}

export function saveMessageToDb(msg: {
  id?: string;
  session_id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  thought?: string;
  steps?: ProcessStep[];
  model_used?: string;
  tokens_used?: number;
}): ChatMessageRecord {
  const db = getDb();
  const id = msg.id || 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const stepsJson = msg.steps && msg.steps.length > 0 ? JSON.stringify(msg.steps) : null;

  // Ensure session exists
  let sessId = msg.session_id;
  const existingSess = db.prepare('SELECT id, title FROM chat_sessions WHERE id = ?').get(sessId) as { id: string; title: string } | undefined;
  if (!existingSess) {
    const fallback = getOrCreateDefaultSession(null);
    sessId = fallback.id;
  }

  const textContent = msg.text !== undefined && msg.text !== null ? msg.text : '';

  db.prepare(`
    INSERT OR REPLACE INTO messages (id, session_id, sender, text, thought, steps_json, model_used, tokens_used)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    sessId,
    msg.sender,
    textContent,
    msg.thought || null,
    stepsJson,
    msg.model_used || null,
    msg.tokens_used || 0
  );

  // Auto-update generic title to the user prompt snippet
  if (msg.sender === 'user' && textContent.trim()) {
    const sess = existingSess || (db.prepare('SELECT id, title FROM chat_sessions WHERE id = ?').get(sessId) as { id: string; title: string } | undefined);
    if (sess && (sess.title === 'Diskusi Baru' || sess.title === 'Diskusi Global' || sess.title.startsWith('Sesi '))) {
      const cleanTitle = textContent.trim().replace(/[\r\n]+/g, ' ').slice(0, 32);
      if (cleanTitle) {
        db.prepare('UPDATE chat_sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(cleanTitle, sessId);
      }
    }
  }

  // Update session updated_at
  db.prepare('UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(sessId);

  return {
    id,
    session_id: sessId,
    sender: msg.sender,
    text: msg.text,
    thought: msg.thought,
    steps: msg.steps || [],
    model_used: msg.model_used,
    tokens_used: msg.tokens_used || 0,
    created_at: new Date().toISOString()
  };
}

export function clearSessionMessages(sessionId: string): boolean {
  const db = getDb();
  db.prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId);
  return true;
}
