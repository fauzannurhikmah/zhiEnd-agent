<script lang="ts">
  import { onMount } from 'svelte';
  import { io, Socket } from 'socket.io-client';
  import type { AppConfig, GitStatus, CommitInfo, TunnelStatus, TelegramStatus, WhatsAppStatus, ChatMessage, FileItem, ChatSessionItem, PersonaItem } from './types';
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
  import ConfirmModal from './components/ConfirmModal.svelte';
  import PersonaModal from './components/PersonaModal.svelte';

  import { UploadCloud, GitBranch, Play, Square, ExternalLink, MessageSquare, Send } from 'lucide-svelte';

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

  // Dev Server Quick State
  let devServer = $state<{ isRunning: boolean; activePorts: { port: number; url: string }[] }>({ isRunning: false, activePorts: [] });
  let isStartingDev = $state(false);

  // Chat States & Database Sessions
  let messages = $state<ChatMessage[]>([]);
  let isAgentBusy = $state(false);
  let chatSessions = $state<ChatSessionItem[]>([]);
  let activeSessionId = $state<string | null>(null);
  let historyScope = $state<'workspace' | 'global'>('workspace');

  // Personas
  let personas = $state<PersonaItem[]>([]);
  let isPersonaModalOpen = $state(false);

  let activeSession = $derived.by(() => {
    return chatSessions.find(s => s.id === activeSessionId) || null;
  });

  let activePersona = $derived.by(() => {
    const curr = chatSessions.find(s => s.id === activeSessionId);
    if (curr?.persona_id) {
      return personas.find(p => p.id === curr.persona_id) || null;
    }
    return personas.find(p => p.is_default) || personas[0] || null;
  });

  // Modals
  let isSettingsOpen = $state(false);
  let isProjectModalOpen = $state(false);
  let isPinModalOpen = $state(false);
  let isPushModalOpen = $state(false);
  let pushStatus = $state<'idle' | 'running' | 'success' | 'error'>('idle');
  let pushLogs = $state('');

  // Reusable Confirmation Modal State
  let confirmDialog = $state<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    action: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Lanjutkan',
    cancelText: 'Batal',
    variant: 'danger',
    action: () => {}
  });

  function showConfirm(options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    action: () => void | Promise<void>;
  }) {
    confirmDialog = {
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || 'Lanjutkan',
      cancelText: options.cancelText || 'Batal',
      variant: options.variant || 'danger',
      action: options.action
    };
  }

  async function handleConfirmDialog() {
    confirmDialog.isOpen = false;
    await confirmDialog.action();
  }

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
      await checkDevServer();
      const pRes = await api.getPersonas();
      personas = pRes.personas || [];
      await loadSessions(false);
    } catch (e) {
      console.error('Error refreshing state:', e);
    }
  }

  async function handleSelectPersona(persona: PersonaItem) {
    if (!activeSessionId) return;
    try {
      await api.updateChatSessionPersona(activeSessionId, persona.id);
      chatSessions = chatSessions.map(s => s.id === activeSessionId ? { ...s, persona_id: persona.id } : s);
      addLog(`[Persona Aktif] ${persona.avatar} ${persona.name} diterapkan.`);
    } catch (e) {
      console.error('Failed to update session persona:', e);
    }
  }

  async function handleCreatePersona(data: { name: string; avatar: string; traits?: string; system_prompt: string; preferred_model?: string }) {
    const res = await api.createPersona(data);
    if (res.persona) {
      personas = [...personas, res.persona];
      if (activeSessionId) {
        await handleSelectPersona(res.persona);
      }
      addLog(`[Persona Dibuat] ${res.persona.name}`);
    }
  }

  async function handleUpdatePersona(id: string, data: Partial<PersonaItem>) {
    try {
      const res = await api.updatePersona(id, data);
      if (res?.success) {
        if (res.persona) {
          personas = personas.map(p => p.id === id ? res.persona : p);
        } else {
          const pRes = await api.getPersonas();
          if (pRes?.personas) {
            personas = pRes.personas;
          } else {
            personas = personas.map(p => p.id === id ? { ...p, ...data } : p);
          }
        }
        addLog(`[Persona Diperbarui] ${data.name || 'Persona'}`);
      }
    } catch (e) {
      console.error('Failed to update persona:', e);
    }
  }

  async function handleUpdateBotPersona(platform: 'telegram' | 'whatsapp', personaId: string) {
    try {
      await api.setBotPersona(platform, personaId);
      if (config) {
        if (platform === 'whatsapp') {
          if (!config.whatsapp) config.whatsapp = { enabled: false, allowedNumbers: [], personaId };
          config.whatsapp.personaId = personaId;
        } else {
          if (!config.telegram) config.telegram = { enabled: false, botToken: '', allowedUsers: [], personaId };
          config.telegram.personaId = personaId;
        }
      }
      const p = personas.find(item => item.id === personaId);
      addLog(`[Remote ${platform.toUpperCase()}] Persona diubah ke ${p?.avatar || '⚡'} ${p?.name || personaId}`);
    } catch (e: any) {
      alert('Gagal mengubah persona bot: ' + (e.message || 'Error'));
    }
  }

  async function handleDeletePersona(id: string) {
    showConfirm({
      title: 'Hapus Persona Ini?',
      message: 'Persona custom ini akan dihapus permanen dari sistem.',
      confirmText: 'Hapus',
      variant: 'danger',
      action: async () => {
        try {
          await api.deletePersona(id);
          personas = personas.filter(p => p.id !== id);
          if (activeSession?.persona_id === id) {
            const def = personas.find(p => p.is_default) || personas[0];
            if (def && activeSessionId) await handleSelectPersona(def);
          }
          addLog('[Persona Dihapus]');
        } catch (e) {
          console.error('Failed to delete persona:', e);
        }
      }
    });
  }

  async function loadSessions(selectFirst = false) {
    try {
      const isGlobal = historyScope === 'global';
      const wsParam = isGlobal ? undefined : config?.activeProject;
      const res = await api.getChatSessions(wsParam, isGlobal);
      chatSessions = res.sessions || [];

      if (!activeSessionId) {
        if (chatSessions.length > 0) {
          await handleSelectSession(chatSessions[0]);
        } else {
          await handleCreateNewSession(false);
        }
      } else if (selectFirst) {
        if (chatSessions.length > 0) {
          await handleSelectSession(chatSessions[0]);
        } else {
          await handleCreateNewSession(false);
        }
      } else {
        await loadSessionMessages(activeSessionId);
      }
    } catch (e) {
      console.error('Failed to load chat sessions:', e);
    }
  }

  async function handleSelectSession(session: ChatSessionItem) {
    activeSessionId = session.id;
    await loadSessionMessages(session.id, true);
  }

  async function loadSessionMessages(sessionId: string, forceReset = false) {
    try {
      const res = await api.getChatMessages(sessionId);
      if (res.messages && res.messages.length > 0) {
        messages = res.messages.map((m: any) => ({
          id: m.id,
          sender: m.sender,
          text: m.text,
          timestamp: new Date(m.created_at).getTime(),
          tools: [],
          steps: m.steps || [],
          thought: m.thought || '',
          isStreaming: false
        }));
      } else if (forceReset) {
        messages = [];
      }
    } catch (e) {
      console.error('Failed to load session messages:', e);
    }
  }

  async function handleCreateNewSession(switchTab = true) {
    try {
      const isGlobal = historyScope === 'global';
      const projName = config?.activeProject ? (config.activeProject.split(/[\\/]/).pop() || 'Project') : 'Diskusi Baru';
      const title = isGlobal ? 'Diskusi Global' : `Sesi ${projName}`;
      const res = await api.createChatSession({
        title,
        workspace_id: isGlobal ? null : config?.activeProject
      });
      if (res.session) {
        chatSessions = [res.session, ...chatSessions];
        activeSessionId = res.session.id;
        messages = [];
        if (switchTab) currentTab = 'chat';
      }
    } catch (e) {
      console.error('Failed to create new session:', e);
    }
  }

  function handleDeleteSession(id: string) {
    showConfirm({
      title: 'Hapus Sesi Diskusi?',
      message: 'Sesi ini dan semua pesannya akan dihapus secara permanen dari database.',
      confirmText: 'Hapus Sesi',
      variant: 'danger',
      action: async () => {
        try {
          await api.deleteChatSession(id);
          chatSessions = chatSessions.filter(s => s.id !== id);
          if (activeSessionId === id) {
            if (chatSessions.length > 0) {
              await handleSelectSession(chatSessions[0]);
            } else {
              await handleCreateNewSession(false);
            }
          }
        } catch (e) {
          console.error('Failed to delete chat session:', e);
        }
      }
    });
  }

  function handleClearCurrentSessionMessages() {
    if (!activeSessionId) return;
    showConfirm({
      title: 'Bersihkan Percakapan?',
      message: 'Semua pesan dan riwayat aktivitas dalam sesi ini akan dibersihkan. Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Ya, Bersihkan',
      variant: 'danger',
      action: async () => {
        try {
          await api.clearChatMessages(activeSessionId);
          messages = [];
          await loadSessions(false);
          addLog('[Chat Cleared] Pesan dalam sesi dibersihkan.');
        } catch (e) {
          console.error('Failed to clear session messages:', e);
        }
      }
    });
  }

  async function handleToggleScope(scope: 'workspace' | 'global') {
    historyScope = scope;
    await loadSessions(true);
  }

  async function checkDevServer() {
    try {
      devServer = await api.getDevServerStatus();
    } catch {}
  }

  async function handleToggleDevServer() {
    if (devServer.isRunning) {
      await api.stopDevServer();
      addLog('[Dev Server] Dihentikan.');
      setTimeout(checkDevServer, 1000);
    } else {
      isStartingDev = true;
      const res = await api.startDevServer();
      addLog(`[Dev Server] ${res.message || 'Memulai dev server...'}`);
      setTimeout(() => {
        checkDevServer();
        isStartingDev = false;
      }, 3500);
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
        steps: [],
        thought: '',
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
      if (messages.length) {
        const last = messages[messages.length - 1];
        if (last.sender === 'agent') {
          if (toolLabel && !last.tools?.includes(toolLabel)) {
            last.tools = [...(last.tools || []), toolLabel];
          }
          if (data.processStep) {
            last.steps = [...(last.steps || []), data.processStep];
          }
          if (data.thought) {
            last.thought = data.thought;
          }
          messages = [...messages];
        }
        if (toolLabel) {
          addLog(`[Tool] ${toolLabel} (${data.state || 'RUN'})`);
        }
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
          if (data.steps && data.steps.length > 0) {
            last.steps = data.steps;
          }
          if (data.thought) {
            last.thought = data.thought;
          }
          last.isStreaming = false;
          messages = [...messages];
        }
      }
      addLog(`[Task Completed] Status: ${data.status} in ${data.duration}`);
      api.getGitStatus().then(st => gitStatus = st);
      setTimeout(() => loadSessions(false), 500);
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
      whatsappStatus = {
        ...(whatsappStatus || { status: 'qr_ready', user: null, error: null }),
        status: 'qr_ready',
        qrCodeDataUrl: data.qrDataUrl
      };
    });

    socket.on('whatsapp_status', (data) => {
      whatsappStatus = { ...data };
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
      await loadSessions(true);
    });
  }

  async function handleSendMessage(text: string) {
    if (!text.trim() || isAgentBusy) return;

    if (!activeSessionId) {
      await handleCreateNewSession(false);
    }

    messages = [...messages, {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text,
      timestamp: Date.now()
    }];

    isAgentBusy = true;
    try {
      await api.sendChat(text, config?.antigravity?.defaultModel, undefined, activeSessionId || undefined);
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

  async function handleResetToRoot() {
    await api.resetToRoot();
    await refreshAll();
    addLog('[Workspace Reset] Kembali ke Root D:\\Works.');
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
    chatSessions={chatSessions}
    activeSessionId={activeSessionId}
    historyScope={historyScope}
    onSelectTab={(tab) => currentTab = tab}
    onOpenProjectModal={() => isProjectModalOpen = true}
    onOpenSettingsModal={() => isSettingsOpen = true}
    onResetToRoot={handleResetToRoot}
    onSelectSession={handleSelectSession}
    onCreateNewSession={() => handleCreateNewSession(true)}
    onDeleteSession={handleDeleteSession}
    onToggleScope={handleToggleScope}
  />

  <!-- Main Content Workspace Area -->
  <div class="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent">
    <!-- Top Subtle Breadcrumb Header -->
    <header class="h-11 px-4 border-b border-white/[0.08] bg-zinc-950/40 backdrop-blur-md flex items-center justify-between shrink-0 select-none">
      <div class="flex items-center gap-2 text-xs font-mono text-zinc-400">
        <span class="text-zinc-500">zhiEnd</span>
        <span class="text-zinc-600">/</span>
        {#if !config?.activeProject || config.activeProject.replace(/\\/g, '/').toLowerCase() === 'd:/works'}
          <span class="text-indigo-400 font-semibold flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            D:\Works (Root)
          </span>
        {:else}
          <span class="text-zinc-200 truncate max-w-sm">{config?.activeProject?.split(/\\|\//).pop()}</span>
          <button
            onclick={handleResetToRoot}
            class="px-2 py-0.5 rounded-md bg-zinc-800/80 hover:bg-rose-500/20 text-[10px] text-zinc-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 transition cursor-pointer flex items-center gap-1"
            title="Clear Workspace (Reset ke Root D:\Works)"
          >
            Clear
          </button>
        {/if}
        {#if gitStatus?.isRepo}
          <span class="text-zinc-600">/</span>
          <span class="flex items-center gap-1 text-zinc-400">
            <GitBranch class="w-3 h-3 text-zinc-500" /> {gitStatus.branch}
          </span>
        {/if}
      </div>

      <div class="flex items-center gap-2">
        <!-- Quick Remote Indicators -->
        <button
          onclick={() => currentTab = 'remote'}
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition cursor-pointer hover:scale-105 active:scale-95 {whatsappStatus?.status === 'connected' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : (whatsappStatus?.status === 'qr_ready' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 animate-pulse' : 'bg-zinc-900/60 border-white/[0.06] text-zinc-400')}"
          title="WhatsApp Remote: {whatsappStatus?.status || 'stopped'} (Klik untuk buka Remote Hub)"
        >
          <MessageSquare class="w-3 h-3 text-emerald-400" />
          <span>WA</span>
          <span class="w-1.5 h-1.5 rounded-full {whatsappStatus?.status === 'connected' ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : (whatsappStatus?.status === 'qr_ready' ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24]' : 'bg-zinc-600')}"></span>
        </button>

        <button
          onclick={() => currentTab = 'remote'}
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition cursor-pointer hover:scale-105 active:scale-95 {telegramStatus?.status === 'running' ? 'bg-sky-500/10 border-sky-500/30 text-sky-300' : 'bg-zinc-900/60 border-white/[0.06] text-zinc-400'}"
          title="Telegram Remote: {telegramStatus?.status || 'stopped'} (Klik untuk buka Remote Hub)"
        >
          <Send class="w-3 h-3 text-sky-400" />
          <span>TG</span>
          <span class="w-1.5 h-1.5 rounded-full {telegramStatus?.status === 'running' ? 'bg-sky-400 shadow-[0_0_6px_#38bdf8]' : 'bg-zinc-600'}"></span>
        </button>

        <!-- Quick Dev Server Widget -->
        {#if devServer.isRunning}
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <a
              href={devServer.activePorts[0]?.url || 'http://localhost:3000'}
              target="_blank"
              class="text-xs font-mono text-emerald-300 hover:text-emerald-200 flex items-center gap-1 font-semibold"
              title="Buka Aplikasi di Browser"
            >
              <span>Port {devServer.activePorts[0]?.port || 3000}</span>
              <ExternalLink class="w-3 h-3 text-emerald-400" />
            </a>
            <button
              onclick={handleToggleDevServer}
              class="p-1 ml-1 rounded hover:bg-rose-500/20 text-rose-400/80 hover:text-rose-300 transition cursor-pointer"
              title="Hentikan Dev Server"
            >
              <Square class="w-3 h-3 fill-rose-400" />
            </button>
          </div>
        {:else}
          <button
            onclick={handleToggleDevServer}
            disabled={isStartingDev}
            class="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-emerald-500/40 text-zinc-300 hover:text-emerald-300 text-xs font-medium transition cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            title="Jalankan Dev Server Project Aktif"
          >
            <Play class="w-3 h-3 text-emerald-400 fill-emerald-400" />
            <span>{isStartingDev ? 'Memulai...' : 'Jalankan Dev'}</span>
          </button>
        {/if}

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
          activeSession={activeSession}
          activePersona={activePersona}
          onSendMessage={handleSendMessage}
          onCancelTask={async () => {
            await api.cancelTask();
          }}
          onClearMessages={handleClearCurrentSessionMessages}
          onCreateNewSession={() => handleCreateNewSession(true)}
          onOpenPersonaModal={() => isPersonaModalOpen = true}
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
          {personas}
          onUpdateBotPersona={handleUpdateBotPersona}
          onStartWhatsApp={async () => {
            await api.startWhatsApp();
            whatsappStatus = await api.getWhatsAppStatus();
          }}
          onLogoutWhatsApp={() => {
            showConfirm({
              title: 'Putuskan WhatsApp?',
              message: 'Sesi bot WhatsApp akan diputuskan. Anda perlu scan ulang kode QR untuk menghubungkan kembali.',
              confirmText: 'Putuskan',
              variant: 'danger',
              action: async () => {
                await api.logoutWhatsApp();
                whatsappStatus = await api.getWhatsAppStatus();
              }
            });
          }}
          onSaveWhatsAppNumbers={async (numbers) => {
            await api.updateConfig({ whatsapp: { allowedNumbers: numbers } } as any);
            alert('Nomor WhatsApp yang diizinkan berhasil disimpan.');
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
    {personas}
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

  <PersonaModal
    isOpen={isPersonaModalOpen}
    {personas}
    activePersonaId={activeSession?.persona_id}
    onSelectPersona={handleSelectPersona}
    onCreatePersona={handleCreatePersona}
    onUpdatePersona={handleUpdatePersona}
    onDeletePersona={handleDeletePersona}
    onClose={() => isPersonaModalOpen = false}
  />

  <ConfirmModal
    isOpen={confirmDialog.isOpen}
    title={confirmDialog.title}
    message={confirmDialog.message}
    confirmText={confirmDialog.confirmText}
    cancelText={confirmDialog.cancelText}
    variant={confirmDialog.variant}
    onConfirm={handleConfirmDialog}
    onCancel={() => confirmDialog.isOpen = false}
  />
</div>
