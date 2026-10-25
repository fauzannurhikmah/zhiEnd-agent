import type { AppConfig, GitStatus, CommitInfo, TunnelStatus, TelegramStatus, WhatsAppStatus, FileItem } from '../types';

export const PIN_STORAGE_KEY = 'zhiend_security_pin';

function getHeaders(): Record<string, string> {
  const pin = localStorage.getItem(PIN_STORAGE_KEY) || '';
  return {
    'Content-Type': 'application/json',
    'x-security-pin': pin
  };
}

export const api = {
  // Auth
  async getAuthStatus(): Promise<{ hasPin: boolean }> {
    const res = await fetch('/api/auth/status');
    return res.json();
  },

  async verifyPin(pin: string): Promise<{ success: boolean; authorized?: boolean; error?: string }> {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    return res.json();
  },

  // Config
  async getConfig(): Promise<AppConfig> {
    const res = await fetch('/api/config', { headers: getHeaders() });
    return res.json();
  },

  async updateConfig(updates: Partial<AppConfig>): Promise<{ success: boolean; config: AppConfig }> {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  // Projects
  async getProjects(): Promise<{ activeProject: string; recentProjects: string[] }> {
    const res = await fetch('/api/projects', { headers: getHeaders() });
    return res.json();
  },

  async scanProjects(dir: string = 'D:\\Works'): Promise<{ baseDir: string; projects: import('../types').ScannedProject[] }> {
    const q = new URLSearchParams({ dir });
    const res = await fetch(`/api/projects/scan?${q.toString()}`, { headers: getHeaders() });
    return res.json();
  },

  async createProject(name: string, parentDir: string = 'D:\\Works', initGit: boolean = true): Promise<{ success: boolean; activeProject?: string; error?: string }> {
    const res = await fetch('/api/projects/create', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, parentDir, initGit })
    });
    return res.json();
  },

  async selectProject(path: string): Promise<{ success: boolean; activeProject?: string; error?: string }> {
    const res = await fetch('/api/projects/select', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ path })
    });
    return res.json();
  },

  async getProjectFiles(): Promise<{ projectPath: string; files: FileItem[] }> {
    const res = await fetch('/api/projects/files', { headers: getHeaders() });
    return res.json();
  },

  // Dev Server Controls
  async getDevServerStatus(): Promise<{ project: string; activePorts: { port: number; url: string }[]; isRunning: boolean }> {
    const res = await fetch('/api/project/dev-server/status', { headers: getHeaders() });
    return res.json();
  },

  async startDevServer(): Promise<{ success: boolean; message?: string; command?: string; error?: string }> {
    const res = await fetch('/api/project/dev-server/start', {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  async stopDevServer(): Promise<{ success: boolean; message?: string }> {
    const res = await fetch('/api/project/dev-server/stop', {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  // Git
  async getGitStatus(): Promise<GitStatus> {
    const res = await fetch('/api/git/status', { headers: getHeaders() });
    return res.json();
  },

  async getGitDiff(file?: string | null, staged: boolean = false): Promise<{ diff: string }> {
    const q = new URLSearchParams();
    if (file) q.append('file', file);
    if (staged) q.append('staged', 'true');
    const res = await fetch(`/api/git/diff?${q.toString()}`, { headers: getHeaders() });
    return res.json();
  },

  async stageFiles(files: string[] = ['.']): Promise<any> {
    const res = await fetch('/api/git/stage', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ files })
    });
    return res.json();
  },

  async unstageFiles(files: string[] = ['.']): Promise<any> {
    const res = await fetch('/api/git/unstage', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ files })
    });
    return res.json();
  },

  async commit(message: string): Promise<{ success: boolean; error?: string; stdout?: string }> {
    const res = await fetch('/api/git/commit', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ message })
    });
    return res.json();
  },

  async push(remote: string = 'origin', branch?: string): Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }> {
    const res = await fetch('/api/git/push', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ remote, branch })
    });
    return res.json();
  },

  async pull(remote: string = 'origin', branch?: string): Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }> {
    const res = await fetch('/api/git/pull', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ remote, branch })
    });
    return res.json();
  },

  async getRecentCommits(): Promise<{ commits: CommitInfo[] }> {
    const res = await fetch('/api/git/commits', { headers: getHeaders() });
    return res.json();
  },

  async generateAiCommit(): Promise<{ message: string }> {
    const res = await fetch('/api/git/ai-commit-msg', {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  // Agent
  async sendChat(prompt: string, model?: string, conversationId?: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ prompt, model, conversationId })
    });
    return res.json();
  },

  async cancelTask(): Promise<{ success: boolean }> {
    const res = await fetch('/api/agent/cancel', {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  // Network & Tunnel
  async getNetworkInfo(): Promise<TunnelStatus> {
    const res = await fetch('/api/network/info', { headers: getHeaders() });
    return res.json();
  },

  async startTunnel(subdomain?: string): Promise<{ success: boolean; url?: string; error?: string }> {
    const res = await fetch('/api/tunnel/start', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ subdomain })
    });
    return res.json();
  },

  async stopTunnel(): Promise<{ success: boolean }> {
    const res = await fetch('/api/tunnel/stop', {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  // Telegram
  async getTelegramStatus(): Promise<TelegramStatus> {
    const res = await fetch('/api/bots/telegram/status', { headers: getHeaders() });
    return res.json();
  },

  async startTelegram(token?: string): Promise<{ success: boolean; botInfo?: any; error?: string }> {
    const res = await fetch('/api/bots/telegram/start', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ token })
    });
    return res.json();
  },

  async stopTelegram(): Promise<{ success: boolean }> {
    const res = await fetch('/api/bots/telegram/stop', {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  // WhatsApp
  async getWhatsAppStatus(): Promise<WhatsAppStatus> {
    const res = await fetch('/api/bots/whatsapp/status', { headers: getHeaders() });
    return res.json();
  },

  async startWhatsApp(): Promise<{ success: boolean; error?: string }> {
    const res = await fetch('/api/bots/whatsapp/start', {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  async logoutWhatsApp(): Promise<{ success: boolean }> {
    const res = await fetch('/api/bots/whatsapp/logout', {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  }
};
