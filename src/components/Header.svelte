<script lang="ts">
  import type { AppConfig, GitStatus, TelegramStatus, WhatsAppStatus, TunnelStatus } from '../types';
  import { FolderOpen, GitBranch, Cpu, Send, MessageSquare, Globe, Settings as SettingsIcon, UploadCloud, ChevronDown } from 'lucide-svelte';

  let {
    config,
    gitStatus,
    telegramStatus,
    whatsappStatus,
    tunnelStatus,
    onOpenProjectModal,
    onOpenSettingsModal,
    onQuickPush,
    onModelChange,
    onSelectTab
  }: {
    config: AppConfig | null;
    gitStatus: GitStatus | null;
    telegramStatus: TelegramStatus | null;
    whatsappStatus: WhatsAppStatus | null;
    tunnelStatus: TunnelStatus | null;
    onOpenProjectModal: () => void;
    onOpenSettingsModal: () => void;
    onQuickPush: () => void;
    onModelChange: (model: string) => void;
    onSelectTab?: (tab: 'chat' | 'git' | 'remote' | 'files') => void;
  } = $props();

  let activeModel = $state('gemini-3.8-flash-high');

  $effect(() => {
    if (config?.antigravity?.defaultModel) {
      activeModel = config.antigravity.defaultModel;
    }
  });

  function handleSelectModel(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    activeModel = val;
    onModelChange(val);
  }
</script>

<header class="glass-panel mx-3 mt-3 px-4 py-2.5 rounded-xl flex items-center justify-between gap-4 z-40 border border-slate-800/80 shadow-lg shadow-black/40">
  <!-- Left: Brand & Project Pill -->
  <div class="flex items-center gap-3">
    <!-- Brand -->
    <div class="flex items-center gap-2.5">
      <img 
        src="/img/logo.png" 
        alt="zhiEnd Logo" 
        class="w-9 h-9 rounded-lg object-contain shadow-md shadow-indigo-500/30 border border-white/10 p-0.5 bg-slate-900"
      />
      <div>
        <div class="text-sm font-bold tracking-tight">
          zhiEnd<span class="text-indigo-400">Agent</span>
        </div>
        <div class="text-[10px] text-slate-500 font-mono flex items-center gap-1">
          <Cpu class="w-3 h-3 text-violet-400" /> Antigravity Core
        </div>
      </div>
    </div>

    <!-- Active Workspace Pill -->
    <button
      onclick={onOpenProjectModal}
      class="flex items-center gap-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 px-3 py-1.5 rounded-full text-xs transition cursor-pointer group"
      title="Klik untuk memilih atau membuka project lain"
    >
      <FolderOpen class="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
      <div class="flex flex-col text-left">
        <span class="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Workspace</span>
        <span class="text-xs font-mono font-medium max-w-[200px] truncate text-slate-200">
          {config?.activeProject || 'Loading...'}
        </span>
      </div>
      {#if gitStatus?.isRepo}
        <span class="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-mono flex items-center gap-1">
          <GitBranch class="w-2.5 h-2.5" /> {gitStatus.branch || 'main'}
        </span>
      {/if}
      <ChevronDown class="w-3 h-3 text-slate-400" />
    </button>
  </div>

  <!-- Center: Model Selector -->
  <div class="flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-3 py-1 rounded-lg">
    <span class="text-[11px] text-violet-400 font-semibold flex items-center gap-1">
      ✨ Model:
    </span>
    <select
      bind:value={activeModel}
      onchange={handleSelectModel}
      class="bg-transparent text-xs text-slate-200 font-medium outline-none cursor-pointer pr-1"
    >
      {#if config?.antigravity?.availableModels}
        {#each config.antigravity.availableModels as model}
          <option value={model.id} class="bg-slate-900 text-slate-200">{model.name}</option>
        {/each}
      {:else}
        <option value="gemini-3.8-flash-high" class="bg-slate-900">Gemini 3.8 Flash (High)</option>
        <option value="gemini-3.8-flash-medium" class="bg-slate-900">Gemini 3.8 Flash (Medium)</option>
        <option value="gemini-3.8-flash-low" class="bg-slate-900">Gemini 3.8 Flash (Fast)</option>
        <option value="claude-sonnet-4-6" class="bg-slate-900">Claude Sonnet 4.6</option>
      {/if}
    </select>
  </div>

  <!-- Right: Status Indicators & Settings -->
  <div class="flex items-center gap-2.5">
    <!-- Telegram Status -->
    <button
      onclick={() => onSelectTab && onSelectTab('remote')}
      class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border cursor-pointer hover:opacity-80 transition {telegramStatus?.status === 'running' ? 'bg-sky-500/10 border-sky-500/30 text-sky-300' : 'bg-slate-800/40 border-slate-700/50 text-slate-400'}"
      title="Telegram Remote Bot: {telegramStatus?.status || 'stopped'} (Klik untuk buka Remote Hub)"
    >
      <Send class="w-3 h-3 text-sky-400" />
      <span>TG</span>
      <span class="w-1.5 h-1.5 rounded-full {telegramStatus?.status === 'running' ? 'bg-sky-400 shadow-[0_0_6px_#38bdf8]' : 'bg-slate-600'}"></span>
    </button>

    <!-- WhatsApp Status -->
    <button
      onclick={() => onSelectTab && onSelectTab('remote')}
      class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border cursor-pointer hover:opacity-80 transition {whatsappStatus?.status === 'connected' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : (whatsappStatus?.status === 'qr_ready' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-slate-800/40 border-slate-700/50 text-slate-400')}"
      title="WhatsApp Remote Bot: {whatsappStatus?.status || 'stopped'} (Klik untuk buka Remote Hub)"
    >
      <MessageSquare class="w-3 h-3 text-emerald-400" />
      <span>WA</span>
      <span class="w-1.5 h-1.5 rounded-full {whatsappStatus?.status === 'connected' ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : (whatsappStatus?.status === 'qr_ready' ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24] animate-pulse' : 'bg-slate-600')}"></span>
    </button>

    <!-- Public Tunnel Status -->
    <button
      onclick={() => onSelectTab && onSelectTab('remote')}
      class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border cursor-pointer hover:opacity-80 transition {tunnelStatus?.status === 'connected' ? 'bg-violet-500/10 border-violet-500/30 text-violet-300' : 'bg-slate-800/40 border-slate-700/50 text-slate-400'}"
      title="Public Tunnel: {tunnelStatus?.publicUrl || 'Local only'} (Klik untuk buka Remote Hub)"
    >
      <Globe class="w-3 h-3 text-violet-400" />
      <span>Remote</span>
      <span class="w-1.5 h-1.5 rounded-full {tunnelStatus?.status === 'connected' ? 'bg-violet-400 shadow-[0_0_6px_#a78bfa]' : 'bg-slate-600'}"></span>
    </button>

    <!-- Quick Push Button -->
    <button
      onclick={onQuickPush}
      class="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95"
      title="Push perubahan ke GitHub"
    >
      <UploadCloud class="w-3.5 h-3.5" /> Push
    </button>

    <!-- Settings Button -->
    <button
      onclick={onOpenSettingsModal}
      class="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/70 border border-slate-700/60 text-slate-300 hover:text-white transition cursor-pointer"
      title="Buka Pengaturan Lengkap (Semua Settingan Bisa Diatur di Sini)"
    >
      <SettingsIcon class="w-4 h-4" />
    </button>
  </div>
</header>
