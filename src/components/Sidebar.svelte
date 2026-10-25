<script lang="ts">
  import type { AppConfig, GitStatus, TelegramStatus, WhatsAppStatus, TunnelStatus, ChatSessionItem } from '../types';
  import { 
    MessageSquare, 
    GitBranch, 
    Terminal, 
    FolderTree, 
    TowerControl, 
    Settings as SettingsIcon, 
    FolderGit, 
    ChevronDown,
    Sparkles,
    Plus,
    Check,
    X,
    Trash2
  } from 'lucide-svelte';

  let {
    currentTab,
    config,
    gitStatus,
    telegramStatus,
    whatsappStatus,
    tunnelStatus,
    isAgentBusy,
    chatSessions = [],
    activeSessionId = null,
    historyScope = 'workspace',
    onSelectTab,
    onOpenProjectModal,
    onOpenSettingsModal,
    onModelChange,
    onResetToRoot,
    onSelectSession,
    onCreateNewSession,
    onDeleteSession,
    onToggleScope
  }: {
    currentTab: 'chat' | 'git' | 'remote' | 'files';
    config: AppConfig | null;
    gitStatus: GitStatus | null;
    telegramStatus: TelegramStatus | null;
    whatsappStatus: WhatsAppStatus | null;
    tunnelStatus: TunnelStatus | null;
    isAgentBusy: boolean;
    chatSessions?: ChatSessionItem[];
    activeSessionId?: string | null;
    historyScope?: 'workspace' | 'global';
    onSelectTab: (tab: 'chat' | 'git' | 'remote' | 'files') => void;
    onOpenProjectModal: () => void;
    onOpenSettingsModal: () => void;
    onModelChange: (model: string) => void;
    onResetToRoot: () => void;
    onSelectSession?: (session: ChatSessionItem) => void;
    onCreateNewSession?: () => void;
    onDeleteSession?: (id: string) => void;
    onToggleScope?: (scope: 'workspace' | 'global') => void;
  } = $props();

  let activeModel = $state('gemini-3.8-flash-high');
  let isModelDropdownOpen = $state(false);
  let dropdownRef = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (!isModelDropdownOpen) return;

    function onPointerDown(e: PointerEvent) {
      if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
        isModelDropdownOpen = false;
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        isModelDropdownOpen = false;
      }
    }

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  });

  const defaultModels = [
    { id: 'gemini-3.8-flash-high', name: 'Gemini 3.8 Flash (High Reasoning)' },
    { id: 'gemini-3.8-flash-medium', name: 'Gemini 3.8 Flash (Medium Reasoning)' },
    { id: 'gemini-3.8-flash-low', name: 'Gemini 3.8 Flash (Fast / Low Reasoning)' },
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6 (Thinking)' },
    { id: 'claude-opus-4-6-thinking', name: 'Claude Opus 4.6 (Thinking)' }
  ];

  $effect(() => {
    if (config?.antigravity?.defaultModel) {
      activeModel = config.antigravity.defaultModel;
    }
  });

  const isRootWorkspace = $derived(() => {
    if (!config?.activeProject) return true;
    const norm = config.activeProject.replace(/\\/g, '/').toLowerCase().replace(/\/+$/, '');
    return norm === 'd:/works' || norm === 'd:';
  });

  const projectName = $derived(() => {
    if (!config?.activeProject) return 'Root D:\\Works';
    const norm = config.activeProject.replace(/\\/g, '/').toLowerCase().replace(/\/+$/, '');
    if (norm === 'd:/works' || norm === 'd:') {
      return 'Root D:\\Works';
    }
    const parts = config.activeProject.replace(/\\/g, '/').split('/').filter(Boolean);
    return parts[parts.length - 1] || config.activeProject;
  });

  function modelBaseName(name: string): string {
    return name.replace(/\(.*\)/, '').trim();
  }

  function modelSubtitle(name: string, id: string): string {
    const match = name.match(/\((.*)\)/);
    return match ? match[1] : id;
  }

  function modelBadge(name: string): string {
    const sub = modelSubtitle(name, '').toLowerCase();
    if (sub.includes('high')) return 'High';
    if (sub.includes('medium')) return 'Medium';
    if (sub.includes('fast') || sub.includes('low')) return 'Fast';
    if (sub.includes('thinking')) return 'Thinking';
    return '';
  }

  const currentModelName = $derived(() => {
    const models = config?.antigravity?.availableModels || defaultModels;
    const found = models.find(m => m.id === activeModel);
    return found ? found.name : activeModel;
  });
</script>

<aside class="relative z-10 w-64 bg-zinc-950/80 backdrop-blur-xl border-r border-white/[0.08] flex flex-col justify-between shrink-0 select-none">
  <!-- Top: Logo & Workspace -->
  <div class="flex flex-col gap-3 p-3">
    <!-- Brand with subtle gradient glow -->
    <div class="flex items-center justify-between px-2 pt-1">
      <div class="flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white font-black text-xs flex items-center justify-center shadow-lg shadow-indigo-500/25">
          z
        </div>
        <span class="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
          zhiEnd <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400 font-mono text-[10px]">agent</span>
        </span>
      </div>

      {#if isAgentBusy}
        <span class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-[10px] text-amber-300 font-mono">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          busy
        </span>
      {/if}
    </div>

    <!-- Active Workspace Card & Create Button (Proportional & Clean) -->
    <div class="flex items-center gap-1.5 w-full">
      <div class="flex-1 min-w-0 flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/[0.06] hover:border-white/[0.14] transition group">
        <button
          onclick={onOpenProjectModal}
          class="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
          title={config?.activeProject || 'Ganti Workspace (D:\\Works)'}
        >
          <FolderGit class="w-4 h-4 {isRootWorkspace() ? 'text-indigo-400' : 'text-emerald-400'} group-hover:scale-105 transition-transform shrink-0" />
          <div class="flex flex-col min-w-0 flex-1">
            <span class="text-xs font-semibold text-zinc-100 truncate block">{projectName()}</span>
            {#if isRootWorkspace()}
              <span class="text-[10px] text-indigo-400/80 font-mono">default root</span>
            {:else if gitStatus?.isRepo}
              <span class="text-[10px] text-zinc-400 font-mono flex items-center gap-1 truncate">
                <GitBranch class="w-2.5 h-2.5 text-sky-400 shrink-0" /> {gitStatus.branch || 'main'}
              </span>
            {/if}
          </div>
        </button>

        <div class="flex items-center gap-0.5 shrink-0 ml-1">
          {#if !isRootWorkspace()}
            <button
              onclick={onResetToRoot}
              class="p-1 rounded-md hover:bg-rose-500/20 text-zinc-500 hover:text-rose-300 transition cursor-pointer"
              title="Clear Workspace (Kembali ke Root D:\Works)"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          {/if}
          <button
            onclick={onOpenProjectModal}
            class="p-1 text-zinc-500 group-hover:text-zinc-300 transition cursor-pointer"
            title="Buka daftar project"
          >
            <ChevronDown class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <button
        onclick={onOpenProjectModal}
        class="p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/[0.06] hover:border-indigo-500/40 text-zinc-400 hover:text-indigo-300 transition cursor-pointer shrink-0 shadow-sm"
        title="Buka / Buat Project Baru di D:\Works"
      >
        <Plus class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Navigation with cinematic active gradient pill -->
    <nav class="flex flex-col gap-1 pt-2">
      <button
        onclick={() => onSelectTab('chat')}
        class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer {currentTab === 'chat' ? 'bg-gradient-to-r from-indigo-500/20 via-indigo-600/15 to-violet-500/10 border border-indigo-500/30 text-white font-semibold shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'}"
      >
        <div class="flex items-center gap-2.5">
          <Terminal class="w-4 h-4 {currentTab === 'chat' ? 'text-indigo-400' : 'text-zinc-400'}" />
          <span>AI Coding Agent</span>
        </div>
      </button>

      <button
        onclick={() => onSelectTab('git')}
        class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer {currentTab === 'git' ? 'bg-gradient-to-r from-indigo-500/20 via-indigo-600/15 to-violet-500/10 border border-indigo-500/30 text-white font-semibold shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'}"
      >
        <div class="flex items-center gap-2.5">
          <GitBranch class="w-4 h-4 {currentTab === 'git' ? 'text-sky-400' : 'text-zinc-400'}" />
          <span>Source Control</span>
        </div>
        {#if gitStatus?.files?.length}
          <span class="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono text-[10px] font-bold">
            {gitStatus.files.length}
          </span>
        {/if}
      </button>

      <button
        onclick={() => onSelectTab('remote')}
        class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer {currentTab === 'remote' ? 'bg-gradient-to-r from-indigo-500/20 via-indigo-600/15 to-violet-500/10 border border-indigo-500/30 text-white font-semibold shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'}"
      >
        <div class="flex items-center gap-2.5">
          <TowerControl class="w-4 h-4 {currentTab === 'remote' ? 'text-violet-400' : 'text-zinc-400'}" />
          <span>Remote Hub</span>
        </div>
        <div class="flex items-center gap-1.5">
          {#if whatsappStatus?.status === 'connected'}
            <span class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" title="WhatsApp Connected"></span>
          {/if}
          {#if telegramStatus?.status === 'running'}
            <span class="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" title="Telegram Online"></span>
          {/if}
        </div>
      </button>

      <button
        onclick={() => onSelectTab('files')}
        class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer {currentTab === 'files' ? 'bg-gradient-to-r from-indigo-500/20 via-indigo-600/15 to-violet-500/10 border border-indigo-500/30 text-white font-semibold shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'}"
      >
        <div class="flex items-center gap-2.5">
          <FolderTree class="w-4 h-4 {currentTab === 'files' ? 'text-amber-400' : 'text-zinc-400'}" />
          <span>Files & Logs</span>
        </div>
      </button>
    </nav>

    <!-- Riwayat Chat Section -->
    <div class="flex flex-col gap-1.5 pt-2.5 border-t border-white/[0.06]">
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-1.5">
          <MessageSquare class="w-3 h-3 text-indigo-400" />
          <span class="text-[11px] font-semibold text-zinc-300">Riwayat Chat</span>
        </div>

        <div class="flex items-center gap-1">
          <!-- Scope switcher: Project vs Global -->
          <div class="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-white/5 text-[9px] font-mono">
            <button
              type="button"
              onclick={() => onToggleScope?.('workspace')}
              class="px-1.5 py-0.5 rounded transition cursor-pointer {historyScope === 'workspace' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}"
              title="Chat khusus project ini"
            >
              Project
            </button>
            <button
              type="button"
              onclick={() => onToggleScope?.('global')}
              class="px-1.5 py-0.5 rounded transition cursor-pointer {historyScope === 'global' ? 'bg-indigo-600 text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}"
              title="Chat global"
            >
              Global
            </button>
          </div>

          <!-- New Chat Button -->
          <button
            type="button"
            onclick={() => onCreateNewSession?.()}
            class="p-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-indigo-500/30 text-zinc-400 hover:text-indigo-300 transition cursor-pointer"
            title="Mulai Chat Baru"
          >
            <Plus class="w-3 h-3" />
          </button>
        </div>
      </div>

      <!-- Scrollable list of sessions -->
      <div class="flex flex-col gap-1 max-h-48 overflow-y-auto pr-0.5 mt-0.5">
        {#if chatSessions && chatSessions.length > 0}
          {#each chatSessions as sess (sess.id)}
            {@const isActive = activeSessionId === sess.id}
            <div class="group/item flex items-center justify-between px-2 py-1.5 rounded-xl transition cursor-pointer {isActive ? 'bg-indigo-600/20 border border-indigo-500/40 text-white font-medium shadow-sm' : 'hover:bg-zinc-900/60 border border-transparent text-zinc-400 hover:text-zinc-200'}">
              <button
                type="button"
                onclick={() => {
                  onSelectTab('chat');
                  onSelectSession?.(sess);
                }}
                class="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                title={sess.title}
              >
                <MessageSquare class="w-3 h-3 {isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover/item:text-zinc-400'} shrink-0" />
                <span class="text-xs truncate flex-1">{sess.title}</span>
                {#if sess.message_count && sess.message_count > 0}
                  <span class="text-[9px] px-1.5 py-0.2 rounded-full font-mono {isActive ? 'bg-indigo-500/30 text-indigo-200' : 'bg-zinc-800 text-zinc-500'} shrink-0">
                    {sess.message_count}
                  </span>
                {/if}
              </button>

              <button
                type="button"
                onclick={(e) => {
                  e.stopPropagation();
                  onDeleteSession?.(sess.id);
                }}
                class="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 transition cursor-pointer shrink-0 ml-1"
                title="Hapus sesi chat"
              >
                <Trash2 class="w-2.5 h-2.5" />
              </button>
            </div>
          {/each}
        {:else}
          <div class="p-3 text-center rounded-xl bg-zinc-900/30 border border-dashed border-white/5 flex flex-col items-center gap-1.5">
            <span class="text-[11px] text-zinc-500">Belum ada riwayat chat</span>
            <button
              type="button"
              onclick={() => onCreateNewSession?.()}
              class="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Plus class="w-2.5 h-2.5" /> Mulai Chat Baru
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Bottom: Model, Remote indicator, Settings -->
  <div class="p-3 border-t border-white/[0.08] flex flex-col gap-2.5 bg-zinc-950/70">
    <!-- Custom Floating Model Selector -->
    <div class="relative" bind:this={dropdownRef}>
      <button
        type="button"
        onclick={() => isModelDropdownOpen = !isModelDropdownOpen}
        class="w-full flex items-center justify-between px-2.5 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/80 border border-white/[0.08] hover:border-indigo-500/40 text-xs transition cursor-pointer group shadow-sm"
        title="Pilih Model AI"
      >
        <div class="flex items-center gap-2 min-w-0">
          <Sparkles class="w-3.5 h-3.5 text-indigo-400 shrink-0 group-hover:scale-110 transition-transform" />
          <div class="flex items-center gap-1.5 truncate">
            <span class="font-semibold text-zinc-200 text-xs truncate">
              {modelBaseName(currentModelName())}
            </span>
            {#if modelBadge(currentModelName())}
              <span class="text-[9px] px-1.5 py-0.2 rounded-md font-mono {activeModel.startsWith('claude') ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25' : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25'}">
                {modelBadge(currentModelName())}
              </span>
            {/if}
          </div>
        </div>
        <ChevronDown class="w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-200 {isModelDropdownOpen ? 'rotate-180 text-indigo-400' : ''}" />
      </button>

      <!-- Floating Dropdown Popover -->
      {#if isModelDropdownOpen}
        <div class="absolute bottom-full mb-2 left-0 w-72 bg-zinc-950/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl p-2 shadow-2xl shadow-indigo-950/60 z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
          <div class="px-2.5 py-1.5 border-b border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span class="font-bold uppercase tracking-wider text-zinc-300">Pilih Model AI</span>
            <span class="text-indigo-400">Antigravity Core</span>
          </div>

          <div class="flex flex-col gap-1 max-h-60 overflow-y-auto pt-1 font-sans">
            {#each (config?.antigravity?.availableModels || defaultModels) as m}
              {@const isSelected = activeModel === m.id}
              {@const isClaude = m.id.startsWith('claude')}
              <button
                type="button"
                onclick={() => {
                  activeModel = m.id;
                  onModelChange(m.id);
                  isModelDropdownOpen = false;
                }}
                class="w-full flex items-center justify-between p-2 rounded-xl text-left transition cursor-pointer {isSelected ? 'bg-indigo-600/20 border border-indigo-500/40 text-white' : 'hover:bg-zinc-900/80 border border-transparent text-zinc-300'}"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-6 h-6 rounded-lg {isClaude ? 'bg-amber-500/15 text-amber-400' : 'bg-indigo-500/15 text-indigo-400'} flex items-center justify-center shrink-0">
                    <Sparkles class="w-3 h-3" />
                  </div>
                  <div class="flex flex-col min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-semibold truncate {isSelected ? 'text-white' : 'text-zinc-200'}">
                        {modelBaseName(m.name)}
                      </span>
                      {#if modelBadge(m.name)}
                        <span class="text-[9px] px-1.5 py-0.2 rounded font-mono {isClaude ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'}">
                          {modelBadge(m.name)}
                        </span>
                      {/if}
                    </div>
                    <span class="text-[10px] text-zinc-500 font-mono truncate">
                      {modelSubtitle(m.name, m.id)}
                    </span>
                  </div>
                </div>

                {#if isSelected}
                  <div class="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500">
                    <Check class="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Tunnel / Settings footer -->
    <div class="flex items-center justify-between pt-1 px-1 text-xs">
      <div class="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
        <span class="w-2 h-2 rounded-full {tunnelStatus?.status === 'connected' ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-zinc-600'}"></span>
        <span class="truncate max-w-[120px]">
          {tunnelStatus?.status === 'connected' ? 'Public Live' : 'Local :3888'}
        </span>
      </div>

      <button
        onclick={onOpenSettingsModal}
        class="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
        title="Pengaturan Sistem"
      >
        <SettingsIcon class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</aside>
