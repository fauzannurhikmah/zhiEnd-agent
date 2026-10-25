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
    ExternalLink,
    ChevronDown,
    Sparkles,
    Globe
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

<aside class="w-64 bg-zinc-950 border-r border-zinc-800/60 flex flex-col justify-between shrink-0 select-none">
  <!-- Top: Logo & Workspace -->
  <div class="flex flex-col gap-3 p-3">
    <!-- Brand -->
    <div class="flex items-center justify-between px-2 pt-1">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-md bg-white text-zinc-950 font-black text-xs flex items-center justify-center">
          z
        </div>
        <span class="text-xs font-semibold tracking-tight text-zinc-100">
          zhiEnd <span class="text-zinc-500 font-mono text-[10px]">agent</span>
        </span>
      </div>

      {#if isAgentBusy}
        <span class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 font-mono">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          busy
        </span>
      {/if}
    </div>

    <!-- Active Workspace Dropdown Button -->
    <button
      onclick={onOpenProjectModal}
      class="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/60 text-left transition cursor-pointer group"
      title={config?.activeProject || 'Ganti Workspace'}
    >
      <div class="flex items-center gap-2 min-w-0">
        <FolderGit class="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 shrink-0" />
        <div class="flex flex-col min-w-0">
          <span class="text-xs font-medium text-zinc-200 truncate">{projectName()}</span>
          {#if gitStatus?.isRepo}
            <span class="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
              <GitBranch class="w-2.5 h-2.5 text-zinc-400" /> {gitStatus.branch || 'main'}
            </span>
          {/if}
        </div>
      </div>
      <ChevronDown class="w-3.5 h-3.5 text-zinc-500 shrink-0" />
    </button>

    <!-- Navigation -->
    <nav class="flex flex-col gap-0.5 pt-2">
      <button
        onclick={() => onSelectTab('chat')}
        class="flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer {currentTab === 'chat' ? 'bg-zinc-800/80 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'}"
      >
        <div class="flex items-center gap-2.5">
          <Terminal class="w-4 h-4 {currentTab === 'chat' ? 'text-white' : 'text-zinc-400'}" />
          <span>AI Agent</span>
        </div>
      </button>

      <button
        onclick={() => onSelectTab('git')}
        class="flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer {currentTab === 'git' ? 'bg-zinc-800/80 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'}"
      >
        <div class="flex items-center gap-2.5">
          <GitBranch class="w-4 h-4 {currentTab === 'git' ? 'text-white' : 'text-zinc-400'}" />
          <span>Source Control</span>
        </div>
        {#if gitStatus?.files?.length}
          <span class="px-1.5 py-0.2 rounded-full bg-zinc-800 border border-zinc-700/60 text-zinc-300 font-mono text-[10px]">
            {gitStatus.files.length}
          </span>
        {/if}
      </button>

      <button
        onclick={() => onSelectTab('remote')}
        class="flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer {currentTab === 'remote' ? 'bg-zinc-800/80 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'}"
      >
        <div class="flex items-center gap-2.5">
          <TowerControl class="w-4 h-4 {currentTab === 'remote' ? 'text-white' : 'text-zinc-400'}" />
          <span>Remote Hub</span>
        </div>
        <div class="flex items-center gap-1">
          {#if whatsappStatus?.status === 'connected'}
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" title="WhatsApp Connected"></span>
          {/if}
          {#if telegramStatus?.status === 'running'}
            <span class="w-1.5 h-1.5 rounded-full bg-sky-400" title="Telegram Online"></span>
          {/if}
        </div>
      </button>

      <button
        onclick={() => onSelectTab('files')}
        class="flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition cursor-pointer {currentTab === 'files' ? 'bg-zinc-800/80 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'}"
      >
        <div class="flex items-center gap-2.5">
          <FolderTree class="w-4 h-4 {currentTab === 'files' ? 'text-white' : 'text-zinc-400'}" />
          <span>Files & Logs</span>
        </div>
      </button>
    </nav>
  </div>

  <!-- Bottom: Model, Remote indicator, Settings -->
  <div class="p-3 border-t border-zinc-800/60 flex flex-col gap-2 bg-zinc-950/60">
    <!-- Model Selector -->
    <div class="flex items-center justify-between px-2 py-1.5 rounded-md bg-zinc-900/50 border border-zinc-800/60 text-xs">
      <div class="flex items-center gap-1.5 min-w-0">
        <Sparkles class="w-3 h-3 text-zinc-400 shrink-0" />
        <select
          bind:value={activeModel}
          onchange={(e) => onModelChange((e.target as HTMLSelectElement).value)}
          class="bg-transparent text-[11px] text-zinc-300 font-mono outline-none cursor-pointer truncate w-36"
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
      <!-- Connection status -->
      <div class="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
        <span class="w-1.5 h-1.5 rounded-full {tunnelStatus?.status === 'connected' ? 'bg-emerald-400' : 'bg-zinc-600'}"></span>
        <span class="truncate max-w-[120px]">
          {tunnelStatus?.status === 'connected' ? 'Public' : 'Local :3888'}
        </span>
      </div>

      <!-- Settings button -->
      <button
        onclick={onOpenSettingsModal}
        class="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
        title="Pengaturan Sistem"
      >
        <SettingsIcon class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</aside>
