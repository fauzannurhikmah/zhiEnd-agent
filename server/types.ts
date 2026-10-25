export interface AntigravityModel {
  id: string;
  name: string;
}

export interface AppConfig {
  port: number;
  securityPin: string;
  activeProject: string;
  recentProjects: string[];
  antigravity: {
    cliPath: string;
    defaultModel: string;
    availableModels: AntigravityModel[];
  };
  telegram: {
    enabled: boolean;
    botToken: string;
    allowedUsers: string[];
    botTokenSet?: boolean;
  };
  whatsapp: {
    enabled: boolean;
    allowedNumbers: string[];
  };
  tunnel: {
    enabled: boolean;
    provider: string;
    subdomain: string;
    publicUrl: string;
  };
}

export interface GitFile {
  path: string;
  status: 'modified' | 'untracked' | 'added' | 'deleted' | 'renamed';
  staged: boolean;
}

export interface GitStatus {
  isRepo: boolean;
  branch: string | null;
  remoteUrl: string | null;
  ahead: number;
  behind: number;
  files: GitFile[];
  clean: boolean;
}

export interface CommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface ProcessStep {
  id: string;
  type: 'thought' | 'edit' | 'write' | 'read' | 'run' | 'search' | 'list' | 'tool';
  title: string;
  detail?: string;
  file?: string;
  lines?: string;
  command?: string;
  instruction?: string;
  thought?: string;
  timestamp: number;
}

export interface AgentTask {
  id: string;
  prompt: string;
  project: string;
  model: string;
  startTime: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'error';
  response: string;
  duration?: string;
  exitCode?: number | null;
  error?: string;
  conversationId?: string | null;
  toolsExecuted?: string[];
  steps?: ProcessStep[];
  thought?: string;
  sessionId?: string;
}

export interface TunnelStatus {
  localIp: string;
  localUrl: string;
  localQr: string | null;
  publicUrl: string | null;
  publicQr: string | null;
  status: 'stopped' | 'connecting' | 'connected' | 'error';
  error: string | null;
}

export interface TelegramStatus {
  status: 'stopped' | 'running' | 'error';
  botInfo?: { username?: string; id?: number } | null;
  error?: string | null;
}

export interface WhatsAppStatus {
  status: 'stopped' | 'connecting' | 'qr_ready' | 'connected' | 'error';
  user?: { id?: string; name?: string; notify?: string } | null;
  qrCodeDataUrl?: string | null;
  error?: string | null;
}

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileItem[] | null;
}

export interface ScannedProject {
  name: string;
  path: string;
  relativePath: string;
  isGit: boolean;
  hasPackageJson: boolean;
  lastModified?: number;
}

export interface WorkspaceItem {
  id: string;
  name: string;
  path: string;
  is_active: boolean;
  is_root: boolean;
  created_at?: string;
  last_opened_at?: string;
}

export interface WorkspaceContext {
  workspace_id: string;
  tech_stack?: string | null;
  package_manager?: string | null;
  dev_command?: string | null;
  dev_port?: number | null;
  architecture_summary?: string | null;
  key_files?: string[];
  custom_rules?: string | null;
  last_indexed_at?: string;
}

export interface PersonaItem {
  id: string;
  name: string;
  avatar: string;
  system_prompt: string;
  preferred_model?: string | null;
  is_default: boolean;
  created_at?: string;
}

export interface ChatSessionItem {
  id: string;
  workspace_id: string | null;
  persona_id: string | null;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface ChatMessageRecord {
  id: string;
  session_id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  thought?: string;
  steps?: ProcessStep[];
  model_used?: string;
  tokens_used?: number;
  created_at: string;
}

export interface BotIntegrationRecord {
  platform: 'telegram' | 'whatsapp';
  is_enabled: boolean;
  token_or_session?: string;
  allowed_identifiers?: string[];
  default_workspace_id?: string | null;
  default_persona_id?: string | null;
  settings_json?: string;
  updated_at?: string;
}


