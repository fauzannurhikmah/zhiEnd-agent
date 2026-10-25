<script lang="ts">
  import { onMount } from 'svelte';
  import { io, Socket } from 'socket.io-client';
  import type { AppConfig, GitStatus, CommitInfo, TunnelStatus, TelegramStatus, WhatsAppStatus, ChatMessage, FileItem } from './types';
  import { api, PIN_STORAGE_KEY } from './services/api';

  import Sidebar from './components/Sidebar.svelte';
  import ChatView from './components/ChatView.svelte';
  import GitView from './components/GitView.svelte';
  import RemoteView from './components/RemoteView.svelte';
  import FileLogsView from './components/FileLogsView.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import ProjectModal from './components/ProjectModal.svelte';
  import PushModal from './components/PushModal.svelte';
  import PinModal from './components/PinModal.svelte';

  import { UploadCloud, GitBranch } from 'lucide-svelte';

  // Navigation tab
  let currentTab = $state<'chat' | 'git' | 'remote' | 'files'>('chat');

  // Application Data States
  let config = $state<AppConfig | null>(null);
  let gitStatus = $state<GitStatus | null>(null);
  let commits = $state<CommitInfo[]>([]);
  let tunnelStatus = $state<TunnelStatus | null>(null);
  let telegramStatus = $state<TelegramStatus | null>(null);
  let whatsappStatus = $state<WhatsAppStatus | null>(null);
  let projectFiles = $state<FileItem[]>([]);
  let systemLogs = $state<string[]>(['[System] zhiEnd Agent ready.']);

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
      addLog('Socket connected to backend.');
    });

    socket.on('disconnect', () => {
      addLog('Socket disconnected.');
    });

    socket.on('agent_task_start', (data) => {
      isAgentBusy = true;
      addLog(`[Task Started] ${data.prompt.slice(0, 60)}...`);
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
      const toolLabel = data.toolDesc || data.toolName;
      if (toolLabel && messages.length) {
        const last = messages[messages.length - 1];
        if (last.sender === 'agent') {
          if (!last.tools?.includes(toolLabel)) {
            last.tools = [...(last.tools || []), toolLabel];
            messages = [...messages];
          }
        }
        addLog(`[Tool] ${toolLabel} (${data.state || 'RUN'})`);
      }
    });

    socket.on('agent_raw', (data) => {
      if (messages.length && data.text) {
        const last = messages[messages.length - 1];
        if (last.sender === 'agent' && !last.text) {
          last.text = data.text;
          messages = [...messages];
        }
      }
    });

    socket.on('agent_task_end', (data) => {
      isAgentBusy = false;
      if (messages.length) {
        const last = messages[messages.length - 1];
        if (last.sender === 'agent') {
          last.text = data.response || last.text || 'Tugas selesai dijalankan.';
          if (data.toolsExecuted && data.toolsExecuted.length > 0) {
            last.tools = data.toolsExecuted;
          }
          last.isStreaming = false;
          messages = [...messages];
        }
      }
      addLog(`[Task Completed] Status: ${data.status} in ${data.duration}`);
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

  async function handleSendMessage(text: string) {
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
        text: `⚠️ Gagal: ${e.message}`,
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

<div class="relative flex h-screen w-screen overflow-hidden bg-[#07090e] text-zinc-100 antialiased font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
  <!-- Modern Cinematic Background: Smooth Floating Blobs + Interactive Dot Grid Matrix -->
  <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
    <!-- Aurora Blob 1 (Indigo/Violet) -->
    <div class="absolute w-[680px] h-[680px] -top-32 left-[15%] rounded-full blob-aurora-1 opacity-25 blur-[120px]"></div>
    <!-- Aurora Blob 2 (Cyan/Sky) -->
    <div class="absolute w-[560px] h-[560px] top-[28%] right-[8%] rounded-full blob-aurora-2 opacity-20 blur-[130px]"></div>
    <!-- Aurora Blob 3 (Fuchsia/Violet) -->
    <div class="absolute w-[620px] h-[620px] -bottom-28 left-[35%] rounded-full blob-aurora-3 opacity-15 blur-[140px]"></div>
    <!-- Cinematic Matrix Dot Grid -->
    <div class="absolute inset-0 cinematic-dot-grid opacity-70"></div>
  </div>

  <!-- Minimalist Clean Sidebar -->
  <Sidebar
    {currentTab}
    {config}
    {gitStatus}
    {telegramStatus}
    {whatsappStatus}
    {tunnelStatus}
    {isAgentBusy}
    onSelectTab={(tab) => currentTab = tab}
    onOpenProjectModal={() => isProjectModalOpen = true}
    onOpenSettingsModal={() => isSettingsOpen = true}
    onModelChange={async (newModel) => {
      if (config) config.antigravity.defaultModel = newModel;
      await api.updateConfig({ defaultModel: newModel } as any);
      addLog(`Model aktif: ${newModel}`);
    }}
  />

  <!-- Main Content Workspace Area -->
  <div class="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent">
    <!-- Top Subtle Breadcrumb Header -->
    <header class="h-11 px-4 border-b border-white/[0.08] bg-zinc-950/40 backdrop-blur-md flex items-center justify-between shrink-0 select-none">
      <div class="flex items-center gap-2 text-xs font-mono text-zinc-400">
        <span class="text-zinc-500">zhiEnd</span>
        <span class="text-zinc-600">/</span>
        <span class="text-zinc-200 truncate max-w-sm">{config?.activeProject?.split(/\\|\//).pop() || 'workspace'}</span>
        {#if gitStatus?.isRepo}
          <span class="text-zinc-600">/</span>
          <span class="flex items-center gap-1 text-zinc-400">
            <GitBranch class="w-3 h-3 text-zinc-500" /> {gitStatus.branch}
          </span>
        {/if}
      </div>

      <div class="flex items-center gap-2">
        <button
          onclick={handleExecutePush}
          class="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer active:scale-95"
          title="Git Push to GitHub"
        >
          <UploadCloud class="w-3.5 h-3.5" /> Push
        </button>
      </div>
    </header>

    <!-- Main Viewport Area -->
    <main class="flex-1 overflow-hidden p-3 min-h-0">
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
  </div>

  <!-- Modals -->
  <SettingsModal
    {config}
    isOpen={isSettingsOpen}
    onClose={() => isSettingsOpen = false}
    onSave={async (updates) => {
      const res = await api.updateConfig(updates);
      if (res.success) {
        config = res.config;
        addLog('Pengaturan berhasil diperbarui.');
        return true;
      }
      return false;
    }}
  />

  <ProjectModal
    isOpen={isProjectModalOpen}
    recentProjects={config?.recentProjects || []}
    activeProjectPath={config?.activeProject}
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
