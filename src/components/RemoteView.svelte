<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { io, Socket } from 'socket.io-client';
  import type { WhatsAppStatus, TelegramStatus, TunnelStatus, AppConfig, PersonaItem } from '../types';
  import { api } from '../services/api';
  import { dialog } from '../services/dialog.svelte';
  import AvatarView from './AvatarView.svelte';
  import { 
    MessageSquare, 
    Send, 
    Globe, 
    Copy, 
    ExternalLink, 
    Check, 
    Link as LinkIcon,
    RefreshCw,
    Sparkles,
    Shield,
    Bot,
    ChevronDown,
    ChevronUp,
    Loader2,
    Settings,
    CheckCircle2,
    SlidersHorizontal,
    QrCode,
    Terminal,
    Trash2,
    HelpCircle,
    Clock
  } from 'lucide-svelte';

  let {
    whatsappStatus,
    telegramStatus,
    tunnelStatus,
    config,
    personas = [],
    onStartWhatsApp,
    onLogoutWhatsApp,
    onStartTelegram,
    onStopTelegram,
    onSaveTelegramToken,
    onSaveWhatsAppNumbers,
    onUpdateBotPersona,
    onStartTunnel,
    onStopTunnel,
    onSaveSecurityPin
  }: {
    whatsappStatus: WhatsAppStatus | null;
    telegramStatus: TelegramStatus | null;
    tunnelStatus: TunnelStatus | null;
    config: AppConfig | null;
    personas?: PersonaItem[];
    onStartWhatsApp: () => Promise<void>;
    onLogoutWhatsApp: () => Promise<void>;
    onStartTelegram: (token?: string) => Promise<void>;
    onStopTelegram: () => Promise<void>;
    onSaveTelegramToken: (token: string, allowedUsers: string[]) => Promise<void>;
    onSaveWhatsAppNumbers?: (numbers: string[]) => Promise<void>;
    onUpdateBotPersona?: (platform: 'telegram' | 'whatsapp', personaId: string) => Promise<void>;
    onStartTunnel: (subdomain?: string) => Promise<void>;
    onStopTunnel: () => Promise<void>;
    onSaveSecurityPin: (pin: string) => Promise<void>;
  } = $props();

  let tgTokenInput = $state('');
  let tgAllowedInput = $state('');
  let waAllowedInput = $state('');
  let customSubdomain = $state('');
  let isCopiedLocal = $state(false);
  let isCopiedPublic = $state(false);
  let isStartingWa = $state(false);
  let securityPinInput = $state('');
  let isSavingPin = $state(false);

  // Accordion toggles for advanced settings
  let showWaSettings = $state(false);
  let showTgSettings = $state(false);

  // Custom persona selector popover states
  let isWaPersonaOpen = $state(false);
  let isTgPersonaOpen = $state(false);

  // Sync initial inputs from config
  $effect(() => {
    if (config?.telegram?.botToken && !tgTokenInput) {
      tgTokenInput = config.telegram.botToken;
    }
    if (config?.telegram?.allowedUsers && !tgAllowedInput) {
      tgAllowedInput = config.telegram.allowedUsers.join(', ');
    }
    if (config?.whatsapp?.allowedNumbers && !waAllowedInput) {
      waAllowedInput = config.whatsapp.allowedNumbers.join(', ');
    }
    if (config?.securityPin && !securityPinInput) {
      securityPinInput = config.securityPin;
    }
  });

  // Derived current personas
  let waActivePersonaId = $derived(config?.whatsapp?.personaId || 'persona-default');
  let waPersona = $derived(personas.find(p => p.id === waActivePersonaId) || personas.find(p => p.is_default) || personas[0]);

  let tgActivePersonaId = $derived(config?.telegram?.personaId || 'persona-default');
  let tgPersona = $derived(personas.find(p => p.id === tgActivePersonaId) || personas.find(p => p.is_default) || personas[0]);

  let currentQr = $derived(whatsappStatus?.qrCodeDataUrl || (whatsappStatus as any)?.qrDataUrl || null);

  // Live Bot Activity Logs
  let botLogs = $state<Array<{ platform: string; type: string; sender?: string; text?: string; timestamp: number }>>([]);
  let remoteSocket: Socket | null = null;

  onMount(async () => {
    try {
      const st = await api.getWhatsAppStatus();
      if (st) {
        whatsappStatus = { ...st, qrCodeDataUrl: st.qrCodeDataUrl || (st as any).qrDataUrl };
      }
    } catch {}

    try {
      remoteSocket = io();
      remoteSocket.on('bot_log', (data) => {
        botLogs = [data, ...botLogs.slice(0, 39)];
      });
    } catch {}
  });

  onDestroy(() => {
    if (remoteSocket) {
      remoteSocket.disconnect();
      remoteSocket = null;
    }
  });

  $effect(() => {
    if (whatsappStatus?.status === 'qr_ready' && !currentQr) {
      api.getWhatsAppStatus().then(st => {
        if (st && (st.qrCodeDataUrl || (st as any).qrDataUrl)) {
          whatsappStatus = { ...st, qrCodeDataUrl: st.qrCodeDataUrl || (st as any).qrDataUrl };
        }
      }).catch(() => {});
    }
  });

  function copyText(val: string, type: 'local' | 'public') {
    navigator.clipboard.writeText(val);
    if (type === 'local') {
      isCopiedLocal = true;
      setTimeout(() => isCopiedLocal = false, 2000);
    } else {
      isCopiedPublic = true;
      setTimeout(() => isCopiedPublic = false, 2000);
    }
  }

  async function handleStartWa() {
    isStartingWa = true;
    try {
      await onStartWhatsApp();
      const st = await api.getWhatsAppStatus();
      if (st) {
        whatsappStatus = { ...st, qrCodeDataUrl: st.qrCodeDataUrl || (st as any).qrDataUrl };
      }
    } finally {
      setTimeout(() => { isStartingWa = false; }, 1200);
    }
  }

  async function handleRefreshWa() {
    isStartingWa = true;
    try {
      await onStartWhatsApp();
      const st = await api.getWhatsAppStatus();
      if (st) {
        whatsappStatus = { ...st, qrCodeDataUrl: st.qrCodeDataUrl || (st as any).qrDataUrl };
      }
    } finally {
      setTimeout(() => { isStartingWa = false; }, 1200);
    }
  }

  async function handleSaveWaNumbers() {
    if (!onSaveWhatsAppNumbers) return;
    const list = waAllowedInput.split(',').map(s => s.trim().replace(/[^0-9]/g, '')).filter(Boolean);
    await onSaveWhatsAppNumbers(list);
  }

  async function handleSaveTgConfig() {
    const list = tgAllowedInput.split(',').map(s => s.trim()).filter(Boolean);
    await onSaveTelegramToken(tgTokenInput, list);
  }

  async function handleSavePin() {
    if (!onSaveSecurityPin) return;
    isSavingPin = true;
    try {
      await onSaveSecurityPin(securityPinInput.trim());
    } finally {
      isSavingPin = false;
    }
  }

  function selectPersona(platform: 'telegram' | 'whatsapp', personaId: string) {
    if (onUpdateBotPersona) {
      onUpdateBotPersona(platform, personaId);
    }
    isWaPersonaOpen = false;
    isTgPersonaOpen = false;
  }
</script>

<div class="h-full overflow-y-auto p-4 md:p-6 custom-scrollbar select-none">
  <!-- Header Title -->
  <div class="max-w-6xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
    <div>
      <h1 class="text-lg font-bold text-white flex items-center gap-2">
        <Bot class="w-5 h-5 text-indigo-400" /> Remote Controller & Hub Integrasi
      </h1>
      <p class="text-xs text-zinc-400 mt-0.5">
        Koneksikan bot WhatsApp, Telegram, dan Public Tunnel dengan Persona AI pilihan Anda untuk coding remote dari HP kapan pun.
      </p>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto items-start">
    
    <!-- ========================================== -->
    <!-- CARD 1: WhatsApp Remote -->
    <!-- ========================================== -->
    <div class="bg-zinc-950/80 border border-white/[0.08] hover:border-emerald-500/30 rounded-2xl p-5 flex flex-col gap-4 shadow-xl transition-all relative">
      <!-- Card Header -->
      <div class="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold shadow-sm shadow-emerald-500/20">
            <MessageSquare class="w-4 h-4" />
          </div>
          <div>
            <span class="text-xs font-bold text-white block">WhatsApp Remote</span>
            <span class="text-[10px] text-zinc-500 font-mono">Baileys Multi-Device</span>
          </div>
        </div>

        <span class="flex items-center gap-1.5 text-[11px] font-mono font-bold {whatsappStatus?.status === 'connected' ? 'text-emerald-400' : (whatsappStatus?.status === 'qr_ready' ? 'text-amber-400' : (whatsappStatus?.status === 'connecting' ? 'text-sky-400' : 'text-zinc-500'))}">
          {#if whatsappStatus?.status === 'connecting'}
            <Loader2 class="w-3 h-3 animate-spin text-sky-400" /> Menghubungkan...
          {:else}
            <span class="w-2 h-2 rounded-full {whatsappStatus?.status === 'connected' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : (whatsappStatus?.status === 'qr_ready' ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse' : 'bg-zinc-600')}"></span>
            {whatsappStatus?.status === 'connected' ? 'Online' : (whatsappStatus?.status === 'qr_ready' ? 'Scan QR' : 'Offline')}
          {/if}
        </span>
      </div>

      <!-- Persona Selector (Custom Component) -->
      <div class="flex flex-col gap-1.5 relative">
        <div class="flex items-center justify-between text-[11px]">
          <span class="font-semibold text-zinc-300 flex items-center gap-1.5">
            <Sparkles class="w-3.5 h-3.5 text-emerald-400" /> Persona AI WhatsApp:
          </span>
          <span class="text-[10px] text-zinc-500 font-mono">Klik kartu untuk ganti</span>
        </div>

        <!-- Selected Persona Trigger Card -->
        <button
          type="button"
          onclick={() => { isWaPersonaOpen = !isWaPersonaOpen; isTgPersonaOpen = false; }}
          class="w-full text-left bg-zinc-900/90 hover:bg-zinc-900 border border-white/[0.08] hover:border-emerald-500/40 rounded-xl p-2.5 flex items-center justify-between gap-2.5 transition cursor-pointer group shadow-sm"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/[0.1] bg-zinc-950 flex items-center justify-center">
              <AvatarView avatar={waPersona?.avatar} name={waPersona?.name} size="sm" />
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold text-white truncate">{waPersona?.name || 'Standard Agent'}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono shrink-0">
                  {waPersona?.preferred_model?.replace('gemini-', '') || 'Flash'}
                </span>
              </div>
              <span class="text-[10px] text-zinc-400 truncate max-w-[200px]" title={waPersona?.traits || ''}>
                {waPersona?.traits || 'Solutif, Teliti, & Cepat'}
              </span>
            </div>
          </div>
          <ChevronDown class="w-4 h-4 text-zinc-400 group-hover:text-white transition-transform {isWaPersonaOpen ? 'rotate-180' : ''} shrink-0" />
        </button>

        <!-- Dropdown Popover Menu -->
        {#if isWaPersonaOpen}
          <div class="absolute top-full left-0 right-0 mt-1.5 z-30 bg-zinc-900 border border-white/[0.12] rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar backdrop-blur-xl">
            <div class="px-2 py-1 text-[10px] font-mono text-zinc-400 border-b border-white/[0.06] mb-0.5">
              Pilih Persona AI untuk WhatsApp:
            </div>
            {#each personas as p}
              <button
                type="button"
                onclick={() => selectPersona('whatsapp', p.id)}
                class="w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 transition cursor-pointer {p.id === waActivePersonaId ? 'bg-emerald-500/20 text-white border border-emerald-500/30 font-semibold' : 'hover:bg-zinc-800 text-zinc-300'}"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-6 h-6 rounded-md overflow-hidden shrink-0 border border-white/[0.1] bg-zinc-950 flex items-center justify-center">
                    <AvatarView avatar={p.avatar} name={p.name} size="xs" />
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs truncate">{p.name}</span>
                    <span class="text-[10px] text-zinc-500 truncate">{p.preferred_model || 'Flash'}</span>
                  </div>
                </div>
                {#if p.id === waActivePersonaId}
                  <CheckCircle2 class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Connection Status & Action Area -->
      <div class="flex flex-col gap-2.5 pt-1">
        {#if whatsappStatus?.status === 'connected'}
          <!-- Online State -->
          <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2.5">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse shrink-0"></span>
              <div>
                <div class="font-bold text-emerald-300">{whatsappStatus.user?.name || 'WhatsApp Aktif'}</div>
                <div class="text-[10px] text-zinc-400 font-mono">+{whatsappStatus.user?.id?.split(':')[0]}</div>
              </div>
            </div>
            <button
              onclick={onLogoutWhatsApp}
              class="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-300 border border-zinc-700 hover:border-rose-500/30 text-xs font-semibold cursor-pointer transition active:scale-95"
            >
              Putuskan
            </button>
          </div>
        {:else if whatsappStatus?.status === 'qr_ready'}
          <!-- QR Ready State -->
          <div class="flex flex-col items-center bg-zinc-900/90 p-4 rounded-xl border border-amber-500/30 text-center gap-3 shadow-lg">
            <div class="flex items-center justify-between w-full px-1">
              <span class="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                <QrCode class="w-3.5 h-3.5" /> Pindai Kode QR WhatsApp:
              </span>
              <button
                onclick={handleRefreshWa}
                disabled={isStartingWa}
                class="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded cursor-pointer transition"
                title="Muat ulang QR code"
              >
                <RefreshCw class="w-3 h-3 {isStartingWa ? 'animate-spin' : ''}" /> Refresh
              </button>
            </div>

            {#if currentQr}
              <div class="p-3 bg-white rounded-2xl shadow-xl border-2 border-amber-400/50">
                <img src={currentQr} alt="WhatsApp QR Code" class="w-44 h-44 object-contain" />
              </div>
            {:else}
              <div class="w-44 h-44 bg-zinc-950 rounded-2xl flex flex-col items-center justify-center gap-2 text-zinc-400 border border-white/[0.08]">
                <Loader2 class="w-6 h-6 animate-spin text-amber-400" />
                <span class="text-[11px]">Memuat kode QR...</span>
                <button
                  type="button"
                  onclick={handleRefreshWa}
                  class="mt-1 text-[10px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                >
                  Muat Ulang
                </button>
              </div>
            {/if}

            <div class="text-[10px] text-zinc-400 text-left bg-zinc-950/60 p-2.5 rounded-lg border border-white/[0.04] w-full flex flex-col gap-0.5">
              <span class="text-zinc-300 font-semibold mb-0.5">Langkah Menghubungkan:</span>
              <div>1. Buka aplikasi WhatsApp di HP Anda</div>
              <div>2. Menu Titik Tiga / Pengaturan > <span class="text-zinc-200 font-medium">Perangkat Tertaut</span></div>
              <div>3. Klik <span class="text-emerald-400 font-medium">Tautkan Perangkat</span> dan arahkan kamera ke sini</div>
            </div>
          </div>
        {:else if whatsappStatus?.status === 'connecting'}
          <!-- Connecting State -->
          <div class="p-5 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex flex-col items-center justify-center gap-2 text-center text-xs text-zinc-300">
            <Loader2 class="w-6 h-6 animate-spin text-emerald-400" />
            <span class="font-medium">Memulai Baileys & menyiapkan koneksi...</span>
            <span class="text-[10px] text-zinc-500 font-mono">Mohon tunggu sebentar</span>
          </div>
        {:else}
          <!-- Stopped / Offline State -->
          <button
            onclick={handleStartWa}
            disabled={isStartingWa}
            class="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {#if isStartingWa}
              <Loader2 class="w-3.5 h-3.5 animate-spin" /> Menghubungkan...
            {:else}
              <LinkIcon class="w-3.5 h-3.5" /> Hubungkan WhatsApp
            {/if}
          </button>
        {/if}
      </div>

      <!-- Collapsible Access Whitelist Settings -->
      <div class="border-t border-white/[0.06] pt-2 flex flex-col">
        <button
          type="button"
          onclick={() => showWaSettings = !showWaSettings}
          class="flex items-center justify-between text-[11px] text-zinc-400 hover:text-zinc-200 py-1 cursor-pointer transition"
        >
          <span class="flex items-center gap-1.5 font-medium">
            <SlidersHorizontal class="w-3 h-3 text-zinc-400" /> Pengaturan Akses & Nomor HP
          </span>
          {#if showWaSettings}
            <ChevronUp class="w-3.5 h-3.5 text-zinc-500" />
          {:else}
            <ChevronDown class="w-3.5 h-3.5 text-zinc-500" />
          {/if}
        </button>

        {#if showWaSettings}
          <div class="flex flex-col gap-2 pt-2 pb-1">
            <label for="wa-whitelist-input-clean" class="text-[10px] text-zinc-400">
              Nomor WhatsApp Diizinkan: <span class="text-zinc-500 font-mono">(pisahkan koma)</span>
            </label>
            <div class="flex gap-2">
              <input
                id="wa-whitelist-input-clean"
                type="text"
                bind:value={waAllowedInput}
                placeholder="628123456789, 628987654321"
                class="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 font-mono outline-none focus:border-emerald-500"
              />
              <button
                onclick={handleSaveWaNumbers}
                class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer active:scale-95"
              >
                Simpan
              </button>
            </div>
            <span class="text-[9px] text-zinc-500 font-mono">Kosongkan untuk mengizinkan semua pesan.</span>
          </div>
        {/if}
      </div>

      <!-- Command Quick Reference -->
      <div class="border-t border-white/[0.06] pt-2 text-[10px] text-zinc-400 font-mono flex flex-wrap gap-1">
        <span class="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/[0.06] text-zinc-300">!code</span>
        <span class="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/[0.06] text-zinc-300">!persona</span>
        <span class="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/[0.06] text-zinc-300">!git</span>
        <span class="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/[0.06] text-zinc-300">!commit</span>
        <span class="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/[0.06] text-zinc-300">!push</span>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- CARD 2: Telegram Remote -->
    <!-- ========================================== -->
    <div class="bg-zinc-950/80 border border-white/[0.08] hover:border-sky-500/30 rounded-2xl p-5 flex flex-col gap-4 shadow-xl transition-all relative">
      <!-- Card Header -->
      <div class="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center font-bold shadow-sm shadow-sky-500/20">
            <Send class="w-4 h-4" />
          </div>
          <div>
            <span class="text-xs font-bold text-white block">Telegram Bot</span>
            <span class="text-[10px] text-zinc-500 font-mono">Telegraf Polling</span>
          </div>
        </div>
        <span class="flex items-center gap-1.5 text-[11px] font-mono font-bold {telegramStatus?.status === 'running' ? 'text-sky-400' : 'text-zinc-500'}">
          <span class="w-2 h-2 rounded-full {telegramStatus?.status === 'running' ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]' : 'bg-zinc-600'}"></span>
          {telegramStatus?.status === 'running' ? 'Online' : 'Offline'}
        </span>
      </div>

      <!-- Persona Selector (Custom Component) -->
      <div class="flex flex-col gap-1.5 relative">
        <div class="flex items-center justify-between text-[11px]">
          <span class="font-semibold text-zinc-300 flex items-center gap-1.5">
            <Sparkles class="w-3.5 h-3.5 text-sky-400" /> Persona AI Telegram:
          </span>
          <span class="text-[10px] text-zinc-500 font-mono">Klik kartu untuk ganti</span>
        </div>

        <!-- Selected Persona Trigger Card -->
        <button
          type="button"
          onclick={() => { isTgPersonaOpen = !isTgPersonaOpen; isWaPersonaOpen = false; }}
          class="w-full text-left bg-zinc-900/90 hover:bg-zinc-900 border border-white/[0.08] hover:border-sky-500/40 rounded-xl p-2.5 flex items-center justify-between gap-2.5 transition cursor-pointer group shadow-sm"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/[0.1] bg-zinc-950 flex items-center justify-center">
              <AvatarView avatar={tgPersona?.avatar} name={tgPersona?.name} size="sm" />
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold text-white truncate">{tgPersona?.name || 'Standard Agent'}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 font-mono shrink-0">
                  {tgPersona?.preferred_model?.replace('gemini-', '') || 'Flash'}
                </span>
              </div>
              <span class="text-[10px] text-zinc-400 truncate max-w-[200px]" title={tgPersona?.traits || ''}>
                {tgPersona?.traits || 'Solutif, Teliti, & Cepat'}
              </span>
            </div>
          </div>
          <ChevronDown class="w-4 h-4 text-zinc-400 group-hover:text-white transition-transform {isTgPersonaOpen ? 'rotate-180' : ''} shrink-0" />
        </button>

        <!-- Dropdown Popover Menu -->
        {#if isTgPersonaOpen}
          <div class="absolute top-full left-0 right-0 mt-1.5 z-30 bg-zinc-900 border border-white/[0.12] rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar backdrop-blur-xl">
            <div class="px-2 py-1 text-[10px] font-mono text-zinc-400 border-b border-white/[0.06] mb-0.5">
              Pilih Persona AI untuk Telegram:
            </div>
            {#each personas as p}
              <button
                type="button"
                onclick={() => selectPersona('telegram', p.id)}
                class="w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 transition cursor-pointer {p.id === tgActivePersonaId ? 'bg-sky-500/20 text-white border border-sky-500/30 font-semibold' : 'hover:bg-zinc-800 text-zinc-300'}"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-6 h-6 rounded-md overflow-hidden shrink-0 border border-white/[0.1] bg-zinc-950 flex items-center justify-center">
                    <AvatarView avatar={p.avatar} name={p.name} size="xs" />
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs truncate">{p.name}</span>
                    <span class="text-[10px] text-zinc-500 truncate">{p.preferred_model || 'Flash'}</span>
                  </div>
                </div>
                {#if p.id === tgActivePersonaId}
                  <CheckCircle2 class="w-3.5 h-3.5 text-sky-400 shrink-0" />
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Bot Token & Action Area -->
      <div class="flex flex-col gap-2.5 pt-1">
        {#if telegramStatus?.status === 'running'}
          <!-- Running State -->
          <div class="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] animate-pulse"></span>
                <span class="text-xs font-bold text-sky-300">Bot Aktif Berjalan</span>
              </div>
              <button
                onclick={onStopTelegram}
                class="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-300 border border-zinc-700 hover:border-rose-500/30 text-xs font-semibold cursor-pointer transition active:scale-95"
              >
                Hentikan
              </button>
            </div>

            {#if telegramStatus.botInfo?.username}
              <a
                href="https://t.me/{telegramStatus.botInfo.username}"
                target="_blank"
                class="w-full py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 cursor-pointer active:scale-95 transition"
              >
                Buka Chat @{telegramStatus.botInfo.username} <ExternalLink class="w-3.5 h-3.5" />
              </a>
            {/if}
          </div>
        {:else}
          <!-- Stopped State -->
          <div class="flex flex-col gap-1.5">
            <label for="tg-token-input-clean" class="text-[11px] text-zinc-400 font-medium">Bot Token:</label>
            <div class="flex gap-2">
              <input
                id="tg-token-input-clean"
                type="password"
                bind:value={tgTokenInput}
                placeholder="123456789:ABCdefGhIJK..."
                class="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono outline-none focus:border-sky-500"
              />
              <button
                onclick={handleSaveTgConfig}
                class="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer active:scale-95"
              >
                Simpan
              </button>
            </div>
          </div>

          <button
            onclick={() => onStartTelegram(tgTokenInput)}
            class="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 transition cursor-pointer active:scale-95"
          >
            Jalankan Bot Telegram
          </button>
        {/if}
      </div>

      <!-- Collapsible Access Whitelist Settings -->
      <div class="border-t border-white/[0.06] pt-2 flex flex-col">
        <button
          type="button"
          onclick={() => showTgSettings = !showTgSettings}
          class="flex items-center justify-between text-[11px] text-zinc-400 hover:text-zinc-200 py-1 cursor-pointer transition"
        >
          <span class="flex items-center gap-1.5 font-medium">
            <SlidersHorizontal class="w-3 h-3 text-zinc-400" /> Pengaturan User ID Izin
          </span>
          {#if showTgSettings}
            <ChevronUp class="w-3.5 h-3.5 text-zinc-500" />
          {:else}
            <ChevronDown class="w-3.5 h-3.5 text-zinc-500" />
          {/if}
        </button>

        {#if showTgSettings}
          <div class="flex flex-col gap-2 pt-2 pb-1">
            <label for="tg-whitelist-input-clean" class="text-[10px] text-zinc-400">
              Allowed Telegram User IDs: <span class="text-zinc-500 font-mono">(pisahkan koma)</span>
            </label>
            <div class="flex gap-2">
              <input
                id="tg-whitelist-input-clean"
                type="text"
                bind:value={tgAllowedInput}
                placeholder="12345678, @username"
                class="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 font-mono outline-none focus:border-sky-500"
              />
              <button
                onclick={handleSaveTgConfig}
                class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer active:scale-95"
              >
                Simpan
              </button>
            </div>
            <span class="text-[9px] text-zinc-500 font-mono">Ketik /id di bot untuk mengetahui Telegram ID Anda.</span>
          </div>
        {/if}
      </div>

      <!-- Command Quick Reference -->
      <div class="border-t border-white/[0.06] pt-2 text-[10px] text-zinc-400 font-mono flex flex-wrap gap-1">
        <span class="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/[0.06] text-zinc-300">/code</span>
        <span class="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/[0.06] text-zinc-300">/persona</span>
        <span class="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/[0.06] text-zinc-300">/git</span>
        <span class="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/[0.06] text-zinc-300">/commit</span>
        <span class="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/[0.06] text-zinc-300">/push</span>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- CARD 3: Public Tunnel & LAN -->
    <!-- ========================================== -->
    <div class="bg-zinc-950/80 border border-white/[0.08] hover:border-violet-500/30 rounded-2xl p-5 flex flex-col gap-4 shadow-xl transition-all">
      <!-- Card Header -->
      <div class="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-400 flex items-center justify-center font-bold shadow-sm shadow-violet-500/20">
            <Globe class="w-4 h-4" />
          </div>
          <div>
            <span class="text-xs font-bold text-white block">Akses Jaringan</span>
            <span class="text-[10px] text-zinc-500 font-mono">Local LAN & Cloud Tunnel</span>
          </div>
        </div>
        <span class="flex items-center gap-1.5 text-[11px] font-mono font-bold {tunnelStatus?.status === 'connected' ? 'text-violet-400' : 'text-zinc-500'}">
          <span class="w-2 h-2 rounded-full {tunnelStatus?.status === 'connected' ? 'bg-violet-400 shadow-[0_0_8px_#a78bfa]' : 'bg-zinc-600'}"></span>
          {tunnelStatus?.status === 'connected' ? 'Live' : 'Local'}
        </span>
      </div>

      <!-- 1. Local Wi-Fi -->
      <div class="flex flex-col gap-1.5">
        <span class="text-[11px] text-zinc-300 font-semibold flex items-center gap-1.5">
          <span>1. Akses Wi-Fi Lokal (HP & Laptop):</span>
        </span>
        <div class="flex items-center justify-between bg-zinc-900/90 p-2.5 rounded-xl border border-white/[0.06] text-xs font-mono text-zinc-200">
          <span class="truncate">{tunnelStatus?.localUrl || 'http://localhost:3888'}</span>
          <button
            onclick={() => copyText(tunnelStatus?.localUrl || '', 'local')}
            class="p-1 text-zinc-400 hover:text-white cursor-pointer transition"
            title="Salin URL"
          >
            {#if isCopiedLocal}<Check class="w-3.5 h-3.5 text-emerald-400" />{:else}<Copy class="w-3.5 h-3.5" />{/if}
          </button>
        </div>
        <span class="text-[10px] text-zinc-500">Bisa dibuka dari HP yang terhubung ke satu Wi-Fi yang sama.</span>
      </div>

      <!-- 2. Public Internet Tunnel -->
      <div class="flex flex-col gap-1.5 pt-1">
        <span class="text-[11px] text-zinc-300 font-semibold">2. Akses Luar Internet (Public Tunnel):</span>
        {#if tunnelStatus?.status === 'connected' && tunnelStatus.publicUrl}
          <div class="flex items-center justify-between bg-zinc-900/90 p-2.5 rounded-xl border border-violet-500/30 text-xs font-mono text-violet-300">
            <span class="truncate">{tunnelStatus.publicUrl}</span>
            <button
              onclick={() => copyText(tunnelStatus?.publicUrl || '', 'public')}
              class="p-1 text-zinc-400 hover:text-white cursor-pointer transition"
              title="Salin URL"
            >
              {#if isCopiedPublic}<Check class="w-3.5 h-3.5 text-emerald-400" />{:else}<Copy class="w-3.5 h-3.5" />{/if}
            </button>
          </div>
          <button
            onclick={onStopTunnel}
            class="w-full py-2 rounded-xl bg-zinc-900 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-300 border border-zinc-800 text-xs font-semibold cursor-pointer active:scale-95 transition"
          >
            Tutup Akses Publik (Stop Tunnel)
          </button>
        {:else}
          <div class="flex gap-2">
            <input
              type="text"
              bind:value={customSubdomain}
              placeholder="subdomain (opsional)"
              class="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono outline-none focus:border-violet-500"
            />
            <button
              onclick={() => onStartTunnel(customSubdomain)}
              class="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 cursor-pointer active:scale-95 transition"
            >
              Buka
            </button>
          </div>
        {/if}
      </div>

      <!-- 3. Security PIN Input -->
      <div class="flex flex-col gap-1.5 pt-2 border-t border-white/[0.06]">
        <div class="flex items-center justify-between">
          <span class="text-[11px] text-zinc-300 font-semibold flex items-center gap-1.5">
            <Shield class="w-3.5 h-3.5 text-amber-400" /> Security PIN Akses Web:
          </span>
          {#if config?.securityPin}
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono">PIN Aktif</span>
          {:else}
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 border border-white/[0.08] text-zinc-400 font-mono">Belum Ada PIN</span>
          {/if}
        </div>
        <div class="flex gap-2">
          <input
            type="password"
            bind:value={securityPinInput}
            placeholder="Ketik PIN (misal: 1234)"
            class="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono outline-none focus:border-amber-500"
          />
          <button
            onclick={handleSavePin}
            disabled={isSavingPin}
            class="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold cursor-pointer active:scale-95 transition"
          >
            {isSavingPin ? 'Menyimpan...' : 'Simpan PIN'}
          </button>
        </div>
        <span class="text-[10px] text-zinc-500 font-mono">Siapapun yang membuka link publik wajib memasukkan PIN ini.</span>
      </div>
    </div>

  </div>

  <!-- ========================================== -->
  <!-- SECTION: Live Activity Log & Shortcut Commands -->
  <!-- ========================================== -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-6xl mx-auto mt-6 items-start">
    
    <!-- PANEL 1: Live Chat Activity Log (Inbound & Outbound) -->
    <div class="bg-zinc-950/80 border border-white/[0.08] rounded-2xl p-4 shadow-xl flex flex-col gap-3">
      <div class="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
        <div class="flex items-center gap-2">
          <Terminal class="w-4 h-4 text-emerald-400" />
          <h2 class="text-xs font-bold text-white uppercase tracking-wider">Live Activity Log (Pesan Masuk & Keluar)</h2>
        </div>
        {#if botLogs.length > 0}
          <button
            onclick={() => botLogs = []}
            class="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 cursor-pointer transition"
            title="Bersihkan log"
          >
            <Trash2 class="w-3 h-3" /> Bersihkan
          </button>
        {/if}
      </div>

      <div class="bg-zinc-900/90 rounded-xl p-3 border border-white/[0.04] max-h-64 overflow-y-auto font-mono text-[11px] flex flex-col gap-2 custom-scrollbar">
        {#if botLogs.length === 0}
          <div class="text-center py-6 text-zinc-500 text-xs flex flex-col items-center gap-2">
            <Clock class="w-5 h-5 text-zinc-600 animate-pulse" />
            <span>Belum ada log pesan. Coba kirim <span class="text-emerald-400 font-bold">!help</span> atau <span class="text-sky-400 font-bold">!status</span> dari WhatsApp Anda.</span>
          </div>
        {:else}
          {#each botLogs as log}
            <div class="flex flex-col gap-0.5 p-2 rounded-lg {log.type === 'inbound' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-zinc-950/80 border border-white/[0.06] text-zinc-300'}">
              <div class="flex items-center justify-between text-[10px] opacity-80">
                <span class="font-bold uppercase flex items-center gap-1">
                  {#if log.type === 'inbound'}
                    📩 [{log.platform}] Masuk dari: {log.sender?.split('@')[0] || 'Unknown'}
                  {:else}
                    📤 [{log.platform}] Balasan ke: {log.sender?.split('@')[0] || 'Unknown'}
                  {/if}
                </span>
                <span class="text-zinc-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <div class="break-words whitespace-pre-wrap text-xs text-white font-sans mt-0.5">
                {log.text}
              </div>
            </div>
          {/each}
        {/if}
      </div>
      <span class="text-[10px] text-zinc-500 font-mono">Real-time log menangkap semua pesan dari WhatsApp Baileys dan Telegram.</span>
    </div>

    <!-- PANEL 2: Shortcut Command Reference & Cheatsheet -->
    <div class="bg-zinc-950/80 border border-white/[0.08] rounded-2xl p-4 shadow-xl flex flex-col gap-3">
      <div class="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
        <div class="flex items-center gap-2">
          <HelpCircle class="w-4 h-4 text-indigo-400" />
          <h2 class="text-xs font-bold text-white uppercase tracking-wider">Panduan Shortcut Perintah Bot</h2>
        </div>
        <span class="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono">WhatsApp & Telegram</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div class="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex flex-col gap-1">
          <div class="flex items-center gap-1.5 font-bold text-emerald-400 font-mono">
            <span>!help</span> <span class="text-zinc-600 font-normal">/</span> <span>/help</span>
          </div>
          <p class="text-[11px] text-zinc-400 leading-tight">Menampilkan menu shortcut dan daftar perintah lengkap di chat.</p>
        </div>

        <div class="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex flex-col gap-1">
          <div class="flex items-center gap-1.5 font-bold text-indigo-400 font-mono">
            <span>!code &lt;instruksi&gt;</span>
          </div>
          <p class="text-[11px] text-zinc-400 leading-tight">Menjalankan coding agent (atau bisa langsung ketik instruksi biasa).</p>
        </div>

        <div class="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex flex-col gap-1">
          <div class="flex items-center gap-1.5 font-bold text-amber-400 font-mono">
            <span>!persona [nomor]</span>
          </div>
          <p class="text-[11px] text-zinc-400 leading-tight">Melihat daftar persona AI dan mengganti persona aktif dari HP.</p>
        </div>

        <div class="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex flex-col gap-1">
          <div class="flex items-center gap-1.5 font-bold text-violet-400 font-mono">
            <span>!project &lt;path&gt;</span>
          </div>
          <p class="text-[11px] text-zinc-400 leading-tight">Berpindah ke workspace/folder project lain di laptop Anda.</p>
        </div>

        <div class="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex flex-col gap-1">
          <div class="flex items-center gap-1.5 font-bold text-sky-400 font-mono">
            <span>!git</span> <span class="text-zinc-600 font-normal">&</span> <span>!diff</span>
          </div>
          <p class="text-[11px] text-zinc-400 leading-tight">Cek status git branch, file yang berubah, serta baris diff kode.</p>
        </div>

        <div class="p-2.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex flex-col gap-1">
          <div class="flex items-center gap-1.5 font-bold text-teal-400 font-mono">
            <span>!commit</span> <span class="text-zinc-600 font-normal">&</span> <span>!push</span>
          </div>
          <p class="text-[11px] text-zinc-400 leading-tight">Stage & commit perubahan lokal lalu push ke GitHub remote.</p>
        </div>
      </div>
      <span class="text-[10px] text-zinc-500 font-mono">💡 Ketik <b>!help</b> atau <b>!menu</b> di WhatsApp untuk menampilkan balasan panduan interaktif.</span>
    </div>

  </div>
</div>
