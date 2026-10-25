<script lang="ts">
  import { onMount } from 'svelte';
  import { io, Socket } from 'socket.io-client';
  import type { AppConfig, GitStatus, CommitInfo, TunnelStatus, TelegramStatus, WhatsAppStatus, ChatMessage, FileItem } from './types';
  import { api, PIN_STORAGE_KEY } from './services/api';

  import Header from './components/Header.svelte';
  import ChatView from './components/ChatView.svelte';
  import GitView from './components/GitView.svelte';
  import RemoteView from './components/RemoteView.svelte';
  import FileLogsView from './components/FileLogsView.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import ProjectModal from './components/ProjectModal.svelte';
  import PushModal from './components/PushModal.svelte';
  import PinModal from './components/PinModal.svelte';

  import { Terminal, GitBranch, TowerControl, FolderTree } from 'lucide-svelte';

  // Navigation state
  let currentTab = $state<'chat' | 'git' | 'remote' | 'files'>('chat');

  // Application Data States
  let config = $state<AppConfig | null>(null);
  let gitStatus = $state<GitStatus | null>(null);
  let commits = $state<CommitInfo[]>([]);
  let tunnelStatus = $state<TunnelStatus | null>(null);
  let telegramStatus = $state<TelegramStatus | null>(null);
  let whatsappStatus = $state<WhatsAppStatus | null>(null);
  let projectFiles = $state<FileItem[]>([]);
  let systemLogs = $state<string[]>(['[System] zhiEnd Agent Svelte 5 + Hono ready.']);

  // Chat States
  let messages = $state<ChatMessage[]>([]);
  let isAgentBusy = $state(false);

  // Modals
  let isSettingsOpen = $state(false);
  let isProjectModalOpen = $state(false);
  let isPinModalOpen = $state(false);
  let isPushModalOpen = $state(false);
  let pushStatus = $state<'idle' | 'running' | 'success' | 'error'>('idle');
  let pushLogs = $state('');

  let socket: Socket | null = null;

  onMount(async () => {
    // 1. PIN Auth check
    const authStatus = await api.getAuthStatus();
    if (authStatus.hasPin) {
      const savedPin = localStorage.getItem(PIN_STORAGE_KEY);
      if (!savedPin) {
        isPinModalOpen = true;
      } else {
        const verifyRes = await api.verifyPin(savedPin);
        if (!verifyRes.authorized) {
          isPinModalOpen = true;
        }
      }
    }

    // 2. Fetch Initial State
    await refreshAll();

    // 3. Connect Socket.io
    initSocket();
  });

  async function refreshAll() {
    try {
      config = await api.getConfig();
      gitStatus = await api.getGitStatus();
      commits = (await api.getRecentCommits()).commits || [];
      tunnelStatus = await api.getNetworkInfo();
      telegramStatus = await api.getTelegramStatus();
      whatsappStatus = await api.getWhatsAppStatus();
      projectFiles = (await api.getProjectFiles()).files || [];
    } catch (e) {
      console.error('Error refreshing state:', e);
    }
  }

  function addLog(msg: string) {
    const time = new Date().toLocaleTimeString();
    systemLogs = [...systemLogs, `[${time}] ${msg}`];
  }

  function initSocket() {
    socket = io();

    socket.on('connect', () => {
      addLog('Socket.io connected to Hono backend.');
    });

    socket.on('disconnect', () => {
      addLog('Socket.io disconnected.');
    });

    socket.on('agent_task_start', (data) => {
      isAgentBusy = true;
      addLog(`[Task Started] ${data.prompt.slice(0, 60)}...`);
      // Add active streaming message
      messages = [...messages, {
        id: data.taskId,
        sender: 'agent',
        text: '',
        timestamp: Date.now(),
        tools: [],
        isStreaming: true
      }];
    });

    socket.on('agent_delta', (data) => {
      if (!messages.length) return;
      const last = messages[messages.length - 1];
      if (last.sender === 'agent') {
        last.text = data.accumulated || (last.text + data.delta);
        messages = [...messages];
      }
    });

    socket.on('agent_step', (data) => {
      if (data.stepType === 'tool_execution' && messages.length) {
        const last = messages[messages.length - 1];
        if (last.sender === 'agent' && !last.tools?.includes(data.stepType)) {
          last.tools = [...(last.tools || []), `${data.stepType}: ${data.state}`];
          messages = [...messages];
        }
        addLog(`[Tool] ${data.stepType} -> ${data.state}`);
      }
    });

    socket.on('agent_task_end', (data) => {
      isAgentBusy = false;
      if (messages.length) {
        const last = messages[messages.length - 1];
        if (last.sender === 'agent') {
          last.text = data.response || last.text || '(Selesai tanpa output teks)';
          last.isStreaming = false;
          messages = [...messages];
        }
      }
      addLog(`[Task Completed] Status: ${data.status} in ${data.duration}`);
      // Auto refresh git status to show changed files
      api.getGitStatus().then(st => gitStatus = st);
    });

    socket.on('agent_task_cancelled', () => {
      isAgentBusy = false;
      addLog('[Task Cancelled]');
      if (messages.length) {
        const last = messages[messages.length - 1];
        if (last.sender === 'agent') {
          last.text += '\n🛑 Tugas dibatalkan oleh pengguna.';
          last.isStreaming = false;
          messages = [...messages];
        }
      }
    });

    socket.on('whatsapp_qr', (data) => {
      if (whatsappStatus) {
        whatsappStatus.status = 'qr_ready';
        whatsappStatus.qrCodeDataUrl = data.qrDataUrl;
      }
    });

    socket.on('whatsapp_status', (data) => {
      whatsappStatus = data;
    });

    socket.on('tunnel_status', (data) => {
      if (tunnelStatus) {
        tunnelStatus.status = data.status;
        if (data.url) tunnelStatus.publicUrl = data.url;
      }
    });

    socket.on('project_changed', async (data) => {
      if (config) config.activeProject = data.activeProject;
      addLog(`[Project Switched] ${data.activeProject}`);
      gitStatus = await api.getGitStatus();
      projectFiles = (await api.getProjectFiles()).files || [];
    });
  }

  // --- ACTIONS ---
  async function handleSendMessage(text: string) {
    // Add user message
    messages = [...messages, {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text,
      timestamp: Date.now()
    }];

    isAgentBusy = true;
    try {
      await api.sendChat(text, config?.antigravity?.defaultModel);
    } catch (e: any) {
      isAgentBusy = false;
      messages = [...messages, {
        id: 'err_' + Date.now(),
        sender: 'agent',
        text: `⚠️ Gagal mengirim prompt: ${e.message}`,
        timestamp: Date.now()
      }];
    }
  }

  async function handleExecutePush() {
    isPushModalOpen = true;
    pushStatus = 'running';
    pushLogs = 'Menjalankan: git push origin...\n';

    try {
      const res = await api.push();
      pushLogs += (res.stdout || '') + '\n' + (res.stderr || '') + '\n' + (res.error || '');
      if (res.success) {
        pushStatus = 'success';
        gitStatus = await api.getGitStatus();
        commits = (await api.getRecentCommits()).commits || [];
      } else {
        pushStatus = 'error';
      }
    } catch (e: any) {
      pushStatus = 'error';
      pushLogs += '\nError: ' + e.message;
    }
  }

  async function handlePinSubmit(pin: string): Promise<boolean> {
    const res = await api.verifyPin(pin);
    if (res.authorized) {
      localStorage.setItem(PIN_STORAGE_KEY, pin);
      isPinModalOpen = false;
      await refreshAll();
      return true;
    }
    return false;
  }
</script>

<div class="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
  <!-- Top Navigation Header -->
  <Header
    {config}
    {gitStatus}
    {telegramStatus}
    {whatsappStatus}
    {tunnelStatus}
    onOpenProjectModal={() => isProjectModalOpen = true}
    onOpenSettingsModal={() => isSettingsOpen = true}
    onQuickPush={handleExecutePush}
    onModelChange={async (newModel) => {
      if (config) config.antigravity.defaultModel = newModel;
      await api.updateConfig({ defaultModel: newModel } as any);
      addLog(`Model aktif diubah ke: ${newModel}`);
    }}
  />

  <!-- Main View Tabs Nav -->
  <div class="px-4 pt-2 border-b border-slate-800/80 flex items-center justify-between">
    <div class="flex items-center gap-1">
      <button
        onclick={() => currentTab = 'chat'}
        class="flex items-center gap-2 px-3.5 py-2 rounded-t-lg font-semibold text-xs transition cursor-pointer border-t border-x {currentTab === 'chat' ? 'bg-slate-900 border-slate-700/80 text-white shadow-sm' : 'border-transparent text-slate-400 hover:text-slate-200'}"
      >
        <Terminal class="w-3.5 h-3.5 text-indigo-400" />
        <span>AI Coding Agent</span>
        {#if isAgentBusy}
          <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
        {/if}
      </button>

      <button
        onclick={() => currentTab = 'git'}
        class="flex items-center gap-2 px-3.5 py-2 rounded-t-lg font-semibold text-xs transition cursor-pointer border-t border-x {currentTab === 'git' ? 'bg-slate-900 border-slate-700/80 text-white shadow-sm' : 'border-transparent text-slate-400 hover:text-slate-200'}"
      >
        <GitBranch class="w-3.5 h-3.5 text-emerald-400" />
        <span>Git & GitHub Hub</span>
        {#if gitStatus?.files?.length}
          <span class="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
            {gitStatus.files.length}
          </span>
        {/if}
      </button>

      <button
        onclick={() => currentTab = 'remote'}
        class="flex items-center gap-2 px-3.5 py-2 rounded-t-lg font-semibold text-xs transition cursor-pointer border-t border-x {currentTab === 'remote' ? 'bg-slate-900 border-slate-700/80 text-white shadow-sm' : 'border-transparent text-slate-400 hover:text-slate-200'}"
      >
        <TowerControl class="w-3.5 h-3.5 text-violet-400" />
        <span>Remote & Mobile Hub</span>
      </button>

      <button
        onclick={() => currentTab = 'files'}
        class="flex items-center gap-2 px-3.5 py-2 rounded-t-lg font-semibold text-xs transition cursor-pointer border-t border-x {currentTab === 'files' ? 'bg-slate-900 border-slate-700/80 text-white shadow-sm' : 'border-transparent text-slate-400 hover:text-slate-200'}"
      >
        <FolderTree class="w-3.5 h-3.5 text-amber-400" />
        <span>Files & Logs</span>
      </button>
    </div>
  </div>

  <!-- Main Viewports -->
  <main class="flex-1 p-3 overflow-hidden">
    {#if currentTab === 'chat'}
      <ChatView
        {messages}
        isBusy={isAgentBusy}
        {config}
        onSendMessage={handleSendMessage}
        onCancelTask={async () => {
          await api.cancelTask();
        }}
        onClearMessages={() => messages = []}
      />
    {:else if currentTab === 'git'}
      <GitView
        {gitStatus}
        {commits}
        onRefresh={async () => gitStatus = await api.getGitStatus()}
        onStageFiles={async (files) => {
          await api.stageFiles(files);
          gitStatus = await api.getGitStatus();
        }}
        onUnstageFiles={async (files) => {
          await api.unstageFiles(files);
          gitStatus = await api.getGitStatus();
        }}
        onCommit={async (msg) => {
          const res = await api.commit(msg);
          if (res.success) {
            gitStatus = await api.getGitStatus();
            commits = (await api.getRecentCommits()).commits || [];
            return true;
          } else {
            alert('Commit gagal: ' + (res.error || 'Unknown error'));
            return false;
          }
        }}
        onPush={handleExecutePush}
        onPull={async () => {
          const res = await api.pull();
          alert(res.success ? 'Git Pull Sukses:\n' + (res.stdout || 'Up to date') : 'Git Pull Gagal:\n' + (res.error || res.stderr));
          gitStatus = await api.getGitStatus();
        }}
        onGenerateAiCommit={async () => {
          const res = await api.generateAiCommit();
          return res.message;
        }}
        onLoadDiff={async (file, staged) => {
          const res = await api.getGitDiff(file, staged);
          return res.diff;
        }}
      />
    {:else if currentTab === 'remote'}
      <RemoteView
        {whatsappStatus}
        {telegramStatus}
        {tunnelStatus}
        {config}
        onStartWhatsApp={async () => {
          await api.startWhatsApp();
          whatsappStatus = await api.getWhatsAppStatus();
        }}
        onLogoutWhatsApp={async () => {
          if (!confirm('Putuskan koneksi WhatsApp?')) return;
          await api.logoutWhatsApp();
          whatsappStatus = await api.getWhatsAppStatus();
        }}
        onStartTelegram={async (token) => {
          const res = await api.startTelegram(token);
          if (!res.success) alert('Gagal: ' + (res.error || 'Token tidak valid'));
          telegramStatus = await api.getTelegramStatus();
        }}
        onStopTelegram={async () => {
          await api.stopTelegram();
          telegramStatus = await api.getTelegramStatus();
        }}
        onSaveTelegramToken={async (token, allowedUsers) => {
          await api.updateConfig({ telegram: { token, allowedUsers } } as any);
          alert('Pengaturan Telegram tersimpan.');
        }}
        onStartTunnel={async (subdomain) => {
          const res = await api.startTunnel(subdomain);
          if (!res.success) alert('Gagal memulai tunnel: ' + res.error);
          tunnelStatus = await api.getNetworkInfo();
        }}
        onStopTunnel={async () => {
          await api.stopTunnel();
          tunnelStatus = await api.getNetworkInfo();
        }}
        onSaveSecurityPin={async (pin) => {
          await api.updateConfig({ securityPin: pin });
          localStorage.setItem(PIN_STORAGE_KEY, pin);
          alert('Security PIN disimpan.');
        }}
      />
    {:else if currentTab === 'files'}
      <FileLogsView
        files={projectFiles}
        logs={systemLogs}
        onRefreshFiles={async () => projectFiles = (await api.getProjectFiles()).files || []}
        onClearLogs={() => systemLogs = []}
      />
    {/if}
  </main>

  <!-- Modals -->
  <SettingsModal
    {config}
    isOpen={isSettingsOpen}
    onClose={() => isSettingsOpen = false}
    onSave={async (updates) => {
      const res = await api.updateConfig(updates);
      if (res.success) {
        config = res.config;
        addLog('Semua pengaturan sistem berhasil diperbarui.');
        return true;
      }
      return false;
    }}
  />

  <ProjectModal
    isOpen={isProjectModalOpen}
    recentProjects={config?.recentProjects || []}
    onClose={() => isProjectModalOpen = false}
    onSelectProject={async (path) => {
      const res = await api.selectProject(path);
      if (res.success) {
        await refreshAll();
        return true;
      } else {
        alert('Gagal membuka project: ' + (res.error || 'Path tidak valid'));
        return false;
      }
    }}
  />

  <PushModal
    isOpen={isPushModalOpen}
    isPushing={pushStatus === 'running'}
    status={pushStatus}
    outputLogs={pushLogs}
    onClose={() => isPushModalOpen = false}
  />

  <PinModal
    isOpen={isPinModalOpen}
    onSubmit={handlePinSubmit}
  />
</div>
