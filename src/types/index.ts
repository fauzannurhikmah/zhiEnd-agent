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

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: number;
  tools?: string[];
  steps?: ProcessStep[];
  thought?: string;
  isStreaming?: boolean;
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

