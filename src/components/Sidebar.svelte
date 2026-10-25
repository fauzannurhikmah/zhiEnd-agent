<script lang="ts">
  import type { AppConfig, GitStatus, TelegramStatus, WhatsAppStatus, TunnelStatus } from '../types';
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
    Plus
  } from 'lucide-svelte';

  let {
    currentTab,
    config,
    gitStatus,
    telegramStatus,
    whatsappStatus,
    tunnelStatus,
    isAgentBusy,
    onSelectTab,
    onOpenProjectModal,
    onOpenSettingsModal,
    onModelChange
  }: {
    currentTab: 'chat' | 'git' | 'remote' | 'files';
    config: AppConfig | null;
    gitStatus: GitStatus | null;
    telegramStatus: TelegramStatus | null;
    whatsappStatus: WhatsAppStatus | null;
    tunnelStatus: TunnelStatus | null;
    isAgentBusy: boolean;
    onSelectTab: (tab: 'chat' | 'git' | 'remote' | 'files') => void;
    onOpenProjectModal: () => void;
    onOpenSettingsModal: () => void;
    onModelChange: (model: string) => void;
  } = $props();

  let activeModel = $state('gemini-3.8-flash-high');

  $effect(() => {
    if (config?.antigravity?.defaultModel) {
      activeModel = config.antigravity.defaultModel;
    }
  });

  const projectName = $derived(() => {
    if (!config?.activeProject) return 'Workspace';
    const parts = config.activeProject.replace(/\\/g, '/').split('/').filter(Boolean);
    return parts[parts.length - 1] || config.activeProject;
  });
</script>

<aside class="w-64 bg-zinc-950/80 backdrop-blur-xl border-r border-white/[0.08] flex flex-col justify-between shrink-0 select-none">
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

    <!-- Active Workspace Dropdown Button -->
    <div class="flex items-center gap-1.5">
      <button
        onclick={onOpenProjectModal}
        class="flex-1 flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/[0.06] hover:border-white/[0.14] text-left transition cursor-pointer group"
        title={config?.activeProject || 'Ganti Workspace (D:\\Works)'}
      >
        <div class="flex items-center gap-2 min-w-0">
          <FolderGit class="w-4 h-4 text-indigo-400 group-hover:scale-105 transition-transform shrink-0" />
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-semibold text-zinc-100 truncate">{projectName()}</span>
            {#if gitStatus?.isRepo}
              <span class="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                <GitBranch class="w-2.5 h-2.5 text-sky-400" /> {gitStatus.branch || 'main'}
              </span>
            {/if}
          </div>
        </div>
        <ChevronDown class="w-3.5 h-3.5 text-zinc-500 shrink-0" />
      </button>

      <button
        onclick={onOpenProjectModal}
        class="p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/[0.06] hover:border-indigo-500/40 text-zinc-400 hover:text-indigo-300 transition cursor-pointer shrink-0"
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
  </div>

  <!-- Bottom: Model, Remote indicator, Settings -->
  <div class="p-3 border-t border-white/[0.08] flex flex-col gap-2.5 bg-zinc-950/70">
    <!-- Model Selector with gradient pill -->
    <div class="flex items-center justify-between px-2.5 py-2 rounded-xl bg-zinc-900/70 border border-white/[0.08] text-xs">
      <div class="flex items-center gap-2 min-w-0">
        <Sparkles class="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <select
          bind:value={activeModel}
          onchange={(e) => onModelChange((e.target as HTMLSelectElement).value)}
          class="bg-transparent text-xs text-zinc-200 font-mono outline-none cursor-pointer truncate w-36"
        >
          {#if config?.antigravity?.availableModels}
            {#each config.antigravity.availableModels as m}
              <option value={m.id} class="bg-zinc-900 text-zinc-200">{m.name.replace(/ \(.*\)/, '')}</option>
            {/each}
          {:else}
            <option value="gemini-3.8-flash-high" class="bg-zinc-900">Gemini 3.8 Flash</option>
            <option value="claude-sonnet-4-6" class="bg-zinc-900">Claude Sonnet 4.6</option>
          {/if}
        </select>
      </div>
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
