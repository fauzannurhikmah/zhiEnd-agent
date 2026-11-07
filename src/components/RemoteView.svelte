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
    QrCode
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
  let customSubdomain = $state('zhiend-agent');
  let isCopiedLocal = $state(false);
  let isCopiedPublic = $state(false);
  let isStartingWa = $state(false);
  let isStartingTunnel = $state(false);
  let isStoppingTunnel = $state(false);
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
    const tokenToSave = (tgTokenInput && !tgTokenInput.includes('•')) ? tgTokenInput.trim() : '';
    await onSaveTelegramToken(tokenToSave, list);
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

<div class="h-full overflow-y-auto p-3.5 sm:p-4 md:p-6 pb-24 md:pb-6 custom-scrollbar select-none font-tech blueprint-cad-ground">
  <!-- Header Title -->
  <div class="max-w-6xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-[#D0CEC7] bg-[#ECEAE5] p-3.5 shadow-2xs relative">
    <span class="reg-dot reg-dot-tl"></span>
    <span class="reg-dot reg-dot-tr"></span>
    <div>
      <div class="flex items-center gap-2 font-stencil text-[10px] text-[#FF5500] font-bold">
        <span>:: COMM LINK BUS</span>
        <span class="text-[#D0CEC7]">|</span>
        <span class="text-[#5C6066]">BUS: NOMINAL // TX-3888</span>
      </div>
      <h1 class="text-base sm:text-lg font-bold text-[#111315] flex items-center gap-2 uppercase tracking-wider mt-0.5">
        <Bot class="w-5 h-5 text-[#FF5500]" /> REMOTE CONTROLLER & HARDWARE INTEGRATION HUB
      </h1>
      <p class="text-xs text-[#5C6066] font-grotesk mt-0.5">
        Koneksikan bot WhatsApp (Baileys), Telegram (Telegraf), dan Public Ingress Tunnel dengan Persona AI untuk akses remote coding langsung dari smartphone.
      </p>
    </div>
    <div class="flex items-center gap-2 font-stencil text-[10px] shrink-0">
      <span class="px-2.5 py-1 bg-[#FCFCFA] border border-[#D0CEC7] text-[#111315] font-bold">
        PORT: 3888
      </span>
      <span class="px-2.5 py-1 bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold flex items-center gap-1">
        <span class="w-1.5 h-1.5 bg-emerald-500 animate-pulse"></span>
        BUS ONLINE
      </span>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl mx-auto items-start">
    
    <!-- ========================================== -->
    <!-- CARD 1: WhatsApp Remote -->
    <!-- ========================================== -->
    <div class="bg-[#ECEAE5] border border-[#D0CEC7] rounded-none p-5 flex flex-col gap-4 shadow-sm transition-all relative text-[#191B1D]">
      <span class="reg-dot reg-dot-tl"></span>
      <span class="reg-dot reg-dot-tr"></span>
      <span class="reg-dot reg-dot-bl"></span>
      <span class="reg-dot reg-dot-br"></span>

      <!-- Card Header -->
      <div class="flex items-center justify-between border-b border-[#D0CEC7] pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-none bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-bold shadow-2xs">
            <MessageSquare class="w-4 h-4" />
          </div>
          <div>
            <span class="text-xs font-bold text-[#191B1D] uppercase tracking-wide block">SUBSYSTEM // WHATSAPP</span>
            <span class="text-[10px] text-[#5C6066] font-mono">Baileys Multi-Device Core</span>
          </div>
        </div>

        <span class="flex items-center gap-1.5 text-[11px] font-mono font-bold {whatsappStatus?.status === 'connected' ? 'text-emerald-700' : (whatsappStatus?.status === 'qr_ready' ? 'text-amber-700' : (whatsappStatus?.status === 'connecting' ? 'text-[#FF5500]' : 'text-[#8C9097]'))}">
          {#if whatsappStatus?.status === 'connecting'}
            <Loader2 class="w-3 h-3 animate-spin text-[#FF5500]" /> Menghubungkan...
          {:else}
            <span class="w-2 h-2 rounded-none {whatsappStatus?.status === 'connected' ? 'bg-emerald-500' : (whatsappStatus?.status === 'qr_ready' ? 'bg-amber-500 animate-pulse' : 'bg-[#8C9097]')}"></span>
            {whatsappStatus?.status === 'connected' ? 'Online' : (whatsappStatus?.status === 'qr_ready' ? 'Scan QR' : 'Offline')}
          {/if}
        </span>
      </div>

      <!-- Persona Selector (Custom Component) -->
      <div class="flex flex-col gap-1.5 relative">
        <div class="flex items-center justify-between text-[11px]">
          <span class="font-bold text-[#191B1D] flex items-center gap-1.5 font-stencil">
            <Sparkles class="w-3.5 h-3.5 text-[#FF5500]" /> PERSONA AI // WHATSAPP:
          </span>
          <span class="text-[10px] text-[#5C6066] font-mono">Klik untuk ganti</span>
        </div>

        <!-- Selected Persona Trigger Card -->
        <button
          type="button"
          onclick={() => { isWaPersonaOpen = !isWaPersonaOpen; isTgPersonaOpen = false; }}
          class="w-full text-left bg-[#FCFCFA] hover:bg-white border border-[#D0CEC7] hover:border-[#A8A59C] rounded-none p-2.5 flex items-center justify-between gap-2.5 transition cursor-pointer group shadow-2xs"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-none overflow-hidden shrink-0 border border-[#D0CEC7] bg-[#E5E3DD] flex items-center justify-center">
              <AvatarView avatar={waPersona?.avatar} name={waPersona?.name} size="sm" />
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold text-[#191B1D] truncate">{waPersona?.name || 'Standard Agent'}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded-none bg-[#E5E3DD] border border-[#D0CEC7] text-[#5C6066] font-mono shrink-0 font-semibold">
                  {waPersona?.preferred_model?.replace('gemini-', '') || 'Flash'}
                </span>
              </div>
              <span class="text-[10px] text-[#5C6066] truncate max-w-[200px]" title={waPersona?.traits || ''}>
                {waPersona?.traits || 'Solutif, Teliti, & Cepat'}
              </span>
            </div>
          </div>
          <ChevronDown class="w-4 h-4 text-[#8C9097] group-hover:text-[#191B1D] transition-transform {isWaPersonaOpen ? 'rotate-180' : ''} shrink-0" />
        </button>

        <!-- Dropdown Popover Menu -->
        {#if isWaPersonaOpen}
          <div class="absolute top-full left-0 right-0 mt-1.5 z-30 bg-[#FCFCFA] border-2 border-[#D0CEC7] rounded-none shadow-xl p-1.5 flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar animate-retro-dropdown">
            <div class="px-2 py-1 text-[10px] font-mono text-[#5C6066] border-b border-[#D0CEC7] mb-0.5 font-bold">
              Pilih Persona AI untuk WhatsApp:
            </div>
            {#each personas as p}
              <button
                type="button"
                onclick={() => selectPersona('whatsapp', p.id)}
                class="w-full text-left px-2.5 py-2 rounded-none flex items-center justify-between gap-2 transition cursor-pointer {p.id === waActivePersonaId ? 'bg-[#FF5500]/10 text-[#FF5500] border border-[#FF5500]/30 font-bold' : 'hover:bg-[#ECEAE5] text-[#191B1D]'}"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-6 h-6 rounded-none overflow-hidden shrink-0 border border-[#D0CEC7] bg-[#E5E3DD] flex items-center justify-center">
                    <AvatarView avatar={p.avatar} name={p.name} size="xs" />
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs truncate">{p.name}</span>
                    <span class="text-[10px] text-[#5C6066] truncate">{p.preferred_model || 'Flash'}</span>
                  </div>
                </div>
                {#if p.id === waActivePersonaId}
                  <CheckCircle2 class="w-3.5 h-3.5 text-[#FF5500] shrink-0" />
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
          <div class="p-3 rounded-none bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2.5">
              <span class="w-2.5 h-2.5 rounded-none bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse shrink-0"></span>
              <div>
                <div class="font-bold text-emerald-800">{whatsappStatus.user?.name || 'WhatsApp Aktif'}</div>
                <div class="text-[10px] text-[#5C6066] font-mono">+{whatsappStatus.user?.id?.split(':')[0]}</div>
              </div>
            </div>
            <button
              onclick={onLogoutWhatsApp}
              class="btn-hardware px-3 py-1.5 rounded-none text-[#191B1D] hover:text-rose-600 hover:border-rose-400 text-xs font-bold cursor-pointer transition shadow-xs"
            >
              Putuskan
            </button>
          </div>
        {:else if whatsappStatus?.status === 'qr_ready'}
          <!-- QR Ready State in Retro CRT Screen Well -->
          <div class="flex flex-col items-center bg-[#101114] p-4 rounded-none border-2 border-[#D0CEC7] text-center gap-3 shadow-xs crt-screen relative overflow-hidden">
            <div class="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px]"></div>
            <div class="flex items-center justify-between w-full px-1 relative z-10">
              <span class="text-xs text-[#FFAA00] font-bold flex items-center gap-1.5 font-stencil">
                <QrCode class="w-3.5 h-3.5 text-[#FF5500]" /> ┌ OPTICAL SYNC // QR INTAKE ┐
              </span>
              <button
                onclick={handleRefreshWa}
                disabled={isStartingWa}
                class="btn-hardware flex items-center gap-1 text-[10px] text-[#111315] hover:text-black px-2 py-0.5 rounded-none cursor-pointer transition font-bold font-mono"
                title="Muat ulang QR code"
              >
                <RefreshCw class="w-3 h-3 {isStartingWa ? 'animate-spin' : ''}" /> Refresh
              </button>
            </div>

            {#if currentQr}
              <div class="p-3 bg-white rounded-none border-2 border-[#FFAA00] relative z-10 shadow-lg">
                <img src={currentQr} alt="WhatsApp QR Code" class="w-44 h-44 object-contain" />
              </div>
            {:else}
              <div class="w-44 h-44 bg-[#1c1e24] rounded-none flex flex-col items-center justify-center gap-2 text-zinc-400 border border-zinc-700 relative z-10">
                <Loader2 class="w-6 h-6 animate-spin text-[#FF5500]" />
                <span class="text-[11px] font-mono text-zinc-300">Memuat kode QR...</span>
                <button
                  type="button"
                  onclick={handleRefreshWa}
                  class="mt-1 text-[10px] text-[#FF5500] hover:underline cursor-pointer font-bold font-mono"
                >
                  Muat Ulang
                </button>
              </div>
            {/if}

            <div class="text-[10px] text-zinc-400 text-left bg-[#1c1e24]/90 p-2.5 rounded-none border border-white/10 w-full flex flex-col gap-0.5 font-mono relative z-10">
              <span class="text-zinc-200 font-bold mb-0.5">Langkah Menghubungkan:</span>
              <div>1. Buka aplikasi WhatsApp di HP Anda</div>
              <div>2. Menu Titik Tiga / Pengaturan > <span class="text-zinc-100 font-bold">Perangkat Tertaut</span></div>
              <div>3. Klik <span class="text-emerald-400 font-bold">Tautkan Perangkat</span> dan scan QR</div>
            </div>
          </div>
        {:else if whatsappStatus?.status === 'connecting'}
          <!-- Connecting State -->
          <div class="p-5 rounded-none bg-[#FCFCFA] border border-[#D0CEC7] flex flex-col items-center justify-center gap-2 text-center text-xs text-[#191B1D] shadow-xs">
            <Loader2 class="w-6 h-6 animate-spin text-[#FF5500]" />
            <span class="font-bold font-stencil">Memulai Baileys & menyiapkan koneksi...</span>
            <span class="text-[10px] text-[#5C6066] font-mono">Mohon tunggu sebentar</span>
          </div>
        {:else}
          <!-- Stopped / Offline State -->
          <button
            onclick={handleStartWa}
            disabled={isStartingWa}
            class="btn-safety w-full py-2.5 rounded-none text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-50 shadow-none uppercase tracking-wider font-tech"
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
      <div class="border-t border-[#D0CEC7] pt-2 flex flex-col">
        <button
          type="button"
          onclick={() => showWaSettings = !showWaSettings}
          class="flex items-center justify-between text-[11px] text-[#5C6066] hover:text-[#191B1D] py-1 cursor-pointer transition font-mono"
        >
          <span class="flex items-center gap-1.5 font-bold">
            <SlidersHorizontal class="w-3 h-3 text-[#5C6066]" /> Pengaturan Akses & Nomor HP
          </span>
          {#if showWaSettings}
            <ChevronUp class="w-3.5 h-3.5 text-[#5C6066]" />
          {:else}
            <ChevronDown class="w-3.5 h-3.5 text-[#5C6066]" />
          {/if}
        </button>

        {#if showWaSettings}
          <div class="flex flex-col gap-2 pt-2 pb-1">
            <label for="wa-whitelist-input-clean" class="text-[10px] text-[#191B1D] font-mono font-bold">
              Nomor WhatsApp Diizinkan: <span class="text-[#5C6066] font-normal">(pisahkan koma)</span>
            </label>
            <div class="flex gap-2">
              <input
                id="wa-whitelist-input-clean"
                type="text"
                bind:value={waAllowedInput}
                placeholder="628123456789, 628987654321"
                class="flex-1 bg-[#FCFCFA] border border-[#D0CEC7] rounded-none px-2.5 py-1.5 text-xs text-[#191B1D] font-mono outline-none focus:border-[#D0CEC7] shadow-xs"
              />
              <button
                onclick={handleSaveWaNumbers}
                class="btn-hardware px-3 py-1.5 rounded-none text-xs font-bold text-[#191B1D] cursor-pointer active:scale-95 shadow-xs"
              >
                Simpan
              </button>
            </div>
            <span class="text-[9px] text-[#5C6066] font-mono">Kosongkan untuk mengizinkan semua pesan.</span>
          </div>
        {/if}
      </div>

      <!-- Command Quick Reference -->
      <div class="border-t border-[#D0CEC7] pt-2 text-[10px] text-[#5C6066] font-mono flex flex-wrap gap-1">
        <span class="px-1.5 py-0.5 rounded-none bg-[#ECEAE5] border border-[#D0CEC7] text-[#191B1D] font-bold">!code</span>
        <span class="px-1.5 py-0.5 rounded-none bg-[#ECEAE5] border border-[#D0CEC7] text-[#191B1D] font-bold">!persona</span>
        <span class="px-1.5 py-0.5 rounded-none bg-[#ECEAE5] border border-[#D0CEC7] text-[#191B1D] font-bold">!git</span>
        <span class="px-1.5 py-0.5 rounded-none bg-[#ECEAE5] border border-[#D0CEC7] text-[#191B1D] font-bold">!commit</span>
        <span class="px-1.5 py-0.5 rounded-none bg-[#ECEAE5] border border-[#D0CEC7] text-[#191B1D] font-bold">!push</span>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- CARD 2: Telegram Remote -->
    <!-- ========================================== -->
    <div class="bg-[#ECEAE5] border border-[#D0CEC7] rounded-none p-5 flex flex-col gap-4 shadow-sm transition-all relative text-[#191B1D]">
      <span class="reg-dot reg-dot-tl"></span>
      <span class="reg-dot reg-dot-tr"></span>
      <span class="reg-dot reg-dot-bl"></span>
      <span class="reg-dot reg-dot-br"></span>

      <!-- Card Header -->
      <div class="flex items-center justify-between border-b border-[#D0CEC7] pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-none bg-sky-100 border border-sky-300 text-sky-800 flex items-center justify-center font-bold shadow-2xs">
            <Send class="w-4 h-4" />
          </div>
          <div>
            <span class="text-xs font-bold text-[#191B1D] uppercase tracking-wide block">SUBSYSTEM // TELEGRAM</span>
            <span class="text-[10px] text-[#5C6066] font-mono">Telegraf Bot Core Polling</span>
          </div>
        </div>
        <span class="flex items-center gap-1.5 text-[11px] font-mono font-bold {telegramStatus?.status === 'running' ? 'text-sky-800' : 'text-[#8C9097]'}">
          <span class="w-2 h-2 rounded-none {telegramStatus?.status === 'running' ? 'bg-sky-500 animate-pulse' : 'bg-[#8C9097]'}"></span>
          {telegramStatus?.status === 'running' ? 'Online' : 'Offline'}
        </span>
      </div>

      <!-- Persona Selector (Custom Component) -->
      <div class="flex flex-col gap-1.5 relative">
        <div class="flex items-center justify-between text-[11px]">
          <span class="font-bold text-[#191B1D] flex items-center gap-1.5">
            <Sparkles class="w-3.5 h-3.5 text-[#FF5500]" /> Persona AI Telegram:
          </span>
          <span class="text-[10px] text-[#5C6066] font-mono">Klik kartu untuk ganti</span>
        </div>

        <!-- Selected Persona Trigger Card -->
        <button
          type="button"
          onclick={() => { isTgPersonaOpen = !isTgPersonaOpen; isWaPersonaOpen = false; }}
          class="w-full text-left bg-[#FCFCFA] hover:bg-white border border-[#D0CEC7] hover:border-[#A8A59C] rounded-none p-2.5 flex items-center justify-between gap-2.5 transition cursor-pointer group shadow-2xs"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-none overflow-hidden shrink-0 border border-[#D0CEC7] bg-[#E5E3DD] flex items-center justify-center">
              <AvatarView avatar={tgPersona?.avatar} name={tgPersona?.name} size="sm" />
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold text-[#191B1D] truncate">{tgPersona?.name || 'Standard Agent'}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded-none bg-[#E5E3DD] border border-[#D0CEC7] text-[#5C6066] font-mono shrink-0 font-semibold">
                  {tgPersona?.preferred_model?.replace('gemini-', '') || 'Flash'}
                </span>
              </div>
              <span class="text-[10px] text-[#5C6066] truncate max-w-[200px]" title={tgPersona?.traits || ''}>
                {tgPersona?.traits || 'Solutif, Teliti, & Cepat'}
              </span>
            </div>
          </div>
          <ChevronDown class="w-4 h-4 text-[#8C9097] group-hover:text-[#191B1D] transition-transform {isTgPersonaOpen ? 'rotate-180' : ''} shrink-0" />
        </button>

        <!-- Dropdown Popover Menu -->
        {#if isTgPersonaOpen}
          <div class="absolute top-full left-0 right-0 mt-1.5 z-30 bg-[#FCFCFA] border-2 border-[#D0CEC7] rounded-none shadow-xl p-1.5 flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar animate-retro-dropdown">
            <div class="px-2 py-1 text-[10px] font-mono text-[#5C6066] border-b border-[#D0CEC7] mb-0.5 font-bold">
              Pilih Persona AI untuk Telegram:
            </div>
            {#each personas as p}
              <button
                type="button"
                onclick={() => selectPersona('telegram', p.id)}
                class="w-full text-left px-2.5 py-2 rounded-none flex items-center justify-between gap-2 transition cursor-pointer {p.id === tgActivePersonaId ? 'bg-[#FF5500]/10 text-[#FF5500] border border-[#FF5500]/30 font-bold' : 'hover:bg-[#ECEAE5] text-[#191B1D]'}"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-6 h-6 rounded-none overflow-hidden shrink-0 border border-[#D0CEC7] bg-[#E5E3DD] flex items-center justify-center">
                    <AvatarView avatar={p.avatar} name={p.name} size="xs" />
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs truncate">{p.name}</span>
                    <span class="text-[10px] text-[#5C6066] truncate">{p.preferred_model || 'Flash'}</span>
                  </div>
                </div>
                {#if p.id === tgActivePersonaId}
                  <CheckCircle2 class="w-3.5 h-3.5 text-[#FF5500] shrink-0" />
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
          <div class="p-3 rounded-none bg-sky-50 border border-sky-300 flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-none bg-sky-500 animate-pulse"></span>
                <span class="text-xs font-bold text-sky-950">Bot Aktif Berjalan</span>
              </div>
              <button
                onclick={onStopTelegram}
                class="px-2.5 py-1 rounded-none bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 text-xs font-bold cursor-pointer transition active:scale-95"
              >
                Hentikan
              </button>
            </div>

            {#if telegramStatus.botInfo?.username}
              <a
                href="https://t.me/{telegramStatus.botInfo.username}"
                target="_blank"
                class="w-full py-2 rounded-none bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition"
              >
                Buka Chat @{telegramStatus.botInfo.username} <ExternalLink class="w-3.5 h-3.5" />
              </a>
            {/if}
          </div>
        {:else}
          <!-- Stopped State -->
          <div class="flex flex-col gap-1.5">
            <label for="tg-token-input-clean" class="text-[11px] text-[#5C6066] font-bold">Bot Token:</label>
            <div class="flex gap-2">
              <input
                id="tg-token-input-clean"
                type="password"
                bind:value={tgTokenInput}
                placeholder="123456789:ABCdefGhIJK..."
                class="flex-1 bg-[#FCFCFA] border border-[#D0CEC7] rounded-none px-3 py-2 text-xs text-[#191B1D] font-mono outline-none focus:border-[#D0CEC7]"
              />
              <button
                onclick={handleSaveTgConfig}
                class="btn-hardware px-3 py-2 rounded-none text-xs font-bold cursor-pointer active:scale-95"
              >
                Simpan
              </button>
            </div>
          </div>

          <button
            onclick={() => onStartTelegram(tgTokenInput && !tgTokenInput.includes('•') ? tgTokenInput.trim() : '')}
            class="btn-safety w-full py-2.5 rounded-none text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 shadow-none font-tech uppercase tracking-wider"
          >
            Jalankan Bot Telegram
          </button>
        {/if}
      </div>

      <!-- Collapsible Access Whitelist Settings -->
      <div class="border-t border-[#D0CEC7] pt-2 flex flex-col">
        <button
          type="button"
          onclick={() => showTgSettings = !showTgSettings}
          class="flex items-center justify-between text-[11px] text-[#5C6066] hover:text-[#191B1D] py-1 cursor-pointer transition font-bold"
        >
          <span class="flex items-center gap-1.5">
            <SlidersHorizontal class="w-3 h-3 text-[#5C6066]" /> Pengaturan User ID Izin
          </span>
          {#if showTgSettings}
            <ChevronUp class="w-3.5 h-3.5 text-[#5C6066]" />
          {:else}
            <ChevronDown class="w-3.5 h-3.5 text-[#5C6066]" />
          {/if}
        </button>

        {#if showTgSettings}
          <div class="flex flex-col gap-2 pt-2 pb-1">
            <label for="tg-whitelist-input-clean" class="text-[10px] text-[#5C6066] font-semibold">
              Allowed Telegram User IDs: <span class="text-[#8C9097] font-mono">(pisahkan koma)</span>
            </label>
            <div class="flex gap-2">
              <input
                id="tg-whitelist-input-clean"
                type="text"
                bind:value={tgAllowedInput}
                placeholder="12345678, @username"
                class="flex-1 bg-[#FCFCFA] border border-[#D0CEC7] rounded-none px-2.5 py-1.5 text-xs text-[#191B1D] font-mono outline-none focus:border-[#D0CEC7]"
              />
              <button
                onclick={handleSaveTgConfig}
                class="btn-hardware px-3 py-1.5 rounded-none text-xs font-bold cursor-pointer active:scale-95"
              >
                Simpan
              </button>
            </div>
            <span class="text-[9px] text-[#8C9097] font-mono">Ketik /id di bot untuk mengetahui Telegram ID Anda.</span>
          </div>
        {/if}
      </div>

      <!-- Command Quick Reference -->
      <div class="border-t border-[#D0CEC7] pt-2 text-[10px] text-[#5C6066] font-mono flex flex-wrap gap-1">
        <span class="px-1.5 py-0.5 rounded-none bg-[#FCFCFA] border border-[#D0CEC7] text-[#191B1D] font-semibold">/code</span>
        <span class="px-1.5 py-0.5 rounded-none bg-[#FCFCFA] border border-[#D0CEC7] text-[#191B1D] font-semibold">/persona</span>
        <span class="px-1.5 py-0.5 rounded-none bg-[#FCFCFA] border border-[#D0CEC7] text-[#191B1D] font-semibold">/git</span>
        <span class="px-1.5 py-0.5 rounded-none bg-[#FCFCFA] border border-[#D0CEC7] text-[#191B1D] font-semibold">/commit</span>
        <span class="px-1.5 py-0.5 rounded-none bg-[#FCFCFA] border border-[#D0CEC7] text-[#191B1D] font-semibold">/push</span>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- CARD 3: Public Tunnel & LAN -->
    <!-- ========================================== -->
    <div class="bg-[#ECEAE5] border border-[#D0CEC7] rounded-none p-5 flex flex-col gap-4 shadow-sm transition-all relative text-[#191B1D]">
      <span class="reg-dot reg-dot-tl"></span>
      <span class="reg-dot reg-dot-tr"></span>
      <span class="reg-dot reg-dot-bl"></span>
      <span class="reg-dot reg-dot-br"></span>

      <!-- Card Header -->
      <div class="flex items-center justify-between border-b border-[#D0CEC7] pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-none bg-orange-100 border border-orange-300 text-[#FF5500] flex items-center justify-center font-bold shadow-2xs">
            <Globe class="w-4 h-4" />
          </div>
          <div>
            <span class="text-xs font-bold text-[#191B1D] uppercase tracking-wide block">SUBSYSTEM // INGRESS NETWORK</span>
            <span class="text-[10px] text-[#5C6066] font-mono">LAN & Public Reverse Tunnel</span>
          </div>
        </div>
        <span class="flex items-center gap-1.5 text-[11px] font-mono font-bold {tunnelStatus?.status === 'connected' ? 'text-[#FF5500]' : 'text-[#8C9097]'}">
          <span class="w-2 h-2 rounded-none {tunnelStatus?.status === 'connected' ? 'bg-[#FF5500] animate-pulse' : 'bg-[#8C9097]'}"></span>
          {tunnelStatus?.status === 'connected' ? 'Live Tunnel' : 'Local Only'}
        </span>
      </div>

      <!-- 1. Local Wi-Fi -->
      <div class="flex flex-col gap-1.5">
        <span class="text-[11px] text-[#191B1D] font-bold flex items-center gap-1.5 font-stencil">
          <span>:: 1. AKSES WI-FI LOKAL (HP & LAPTOP):</span>
        </span>
        <div class="flex items-center justify-between bg-[#FCFCFA] p-2.5 rounded-none border border-[#D0CEC7] text-xs font-mono text-[#191B1D]">
          <span class="truncate">{tunnelStatus?.localUrl || 'http://localhost:3888'}</span>
          <button
            onclick={() => copyText(tunnelStatus?.localUrl || '', 'local')}
            class="p-1 text-[#5C6066] hover:text-[#191B1D] cursor-pointer transition"
            title="Salin URL"
          >
            {#if isCopiedLocal}<Check class="w-3.5 h-3.5 text-emerald-600" />{:else}<Copy class="w-3.5 h-3.5" />{/if}
          </button>
        </div>
        <span class="text-[10px] text-[#5C6066] font-mono">Bisa dibuka dari HP yang terhubung ke satu Wi-Fi yang sama.</span>
      </div>

      <!-- 2. Public Internet Tunnel -->
      <div class="flex flex-col gap-1.5 pt-1">
        <span class="text-[11px] text-[#191B1D] font-bold font-stencil">:: 2. AKSES LUAR INTERNET (PUBLIC TUNNEL):</span>
        {#if tunnelStatus?.status === 'connected' && tunnelStatus.publicUrl}
          <div class="flex items-center justify-between bg-[#FCFCFA] p-2.5 rounded-none border border-[#FF5500]/40 text-xs font-mono text-[#FF5500] font-bold">
            <span class="truncate">{tunnelStatus.publicUrl}</span>
            <button
              onclick={() => copyText(tunnelStatus?.publicUrl || '', 'public')}
              class="p-1 text-[#5C6066] hover:text-[#191B1D] cursor-pointer transition"
              title="Salin URL"
            >
              {#if isCopiedPublic}<Check class="w-3.5 h-3.5 text-emerald-600" />{:else}<Copy class="w-3.5 h-3.5" />{/if}
            </button>
          </div>
          <button
            disabled={isStoppingTunnel}
            onclick={async () => {
              isStoppingTunnel = true;
              try {
                await onStopTunnel();
              } finally {
                isStoppingTunnel = false;
              }
            }}
            class="w-full py-2 rounded-none bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 text-xs font-bold cursor-pointer active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed font-tech uppercase"
          >
            {isStoppingTunnel ? 'Menutup Akses...' : 'Tutup Akses Publik (Stop Tunnel)'}
          </button>
        {:else}
          <div class="flex gap-2">
            <input
              type="text"
              bind:value={customSubdomain}
              placeholder="zhiend-agent"
              class="flex-1 bg-[#FCFCFA] border border-[#D0CEC7] rounded-none px-3 py-2 text-xs text-[#191B1D] font-mono outline-none focus:border-[#D0CEC7]"
            />
            <button
              disabled={isStartingTunnel}
              onclick={async () => {
                isStartingTunnel = true;
                try {
                  await onStartTunnel(customSubdomain || 'zhiend-agent');
                } finally {
                  isStartingTunnel = false;
                }
              }}
              class="btn-safety px-5 py-2 rounded-none text-white font-bold text-xs cursor-pointer active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-none font-tech uppercase"
            >
              {isStartingTunnel ? 'Membuka...' : 'Buka'}
            </button>
          </div>
        {/if}
      </div>

      <!-- 3. Security PIN Input -->
      <div class="flex flex-col gap-1.5 pt-2 border-t border-[#D0CEC7]">
        <div class="flex items-center justify-between">
          <span class="text-[11px] text-[#191B1D] font-bold flex items-center gap-1.5 font-stencil">
            <Shield class="w-3.5 h-3.5 text-[#FF5500]" /> SECURITY PIN AKSES WEB:
          </span>
          {#if config?.securityPin}
            <span class="text-[9px] px-1.5 py-0.5 rounded-none bg-emerald-100 border border-emerald-300 text-emerald-800 font-mono font-bold">PIN Aktif</span>
          {:else}
            <span class="text-[9px] px-1.5 py-0.5 rounded-none bg-[#E5E3DD] border border-[#D0CEC7] text-[#5C6066] font-mono">Belum Ada PIN</span>
          {/if}
        </div>
        <div class="flex gap-2">
          <input
            type="password"
            bind:value={securityPinInput}
            placeholder="Ketik PIN (misal: 1234)"
            class="flex-1 bg-[#FCFCFA] border border-[#D0CEC7] rounded-none px-3 py-2 text-xs text-[#191B1D] font-mono outline-none focus:border-[#D0CEC7]"
          />
          <button
            onclick={handleSavePin}
            disabled={isSavingPin}
            class="btn-safety px-5 py-2 rounded-none text-white text-xs font-bold cursor-pointer active:scale-95 transition shadow-none font-tech uppercase"
          >
            {isSavingPin ? 'Menyimpan...' : 'Simpan PIN'}
          </button>
        </div>
        <span class="text-[10px] text-[#5C6066] font-mono">Siapapun yang membuka link publik wajib memasukkan PIN ini.</span>
      </div>
    </div>

  </div>

  <!-- ========================================== -->
  <!-- BOTTOM DECK: Live Packet Stream Terminal Deck -->
  <!-- ========================================== -->
  <div class="max-w-6xl mx-auto mt-6 border border-[#D0CEC7] bg-[#ECEAE5] p-4 relative shadow-sm text-[#191B1D]">
    <span class="reg-dot reg-dot-tl"></span>
    <span class="reg-dot reg-dot-tr"></span>
    <span class="reg-dot reg-dot-bl"></span>
    <span class="reg-dot reg-dot-br"></span>

    <!-- Deck Header -->
    <div class="flex items-center justify-between border-b border-[#D0CEC7] pb-2 mb-3">
      <div class="flex items-center gap-2 font-stencil text-[11px]">
        <span class="w-2 h-2 bg-[#FF5500] animate-pulse"></span>
        <span class="font-bold text-[#111315] uppercase tracking-wider">LIVE TELEMETRY & PACKET STREAM</span>
        <span class="text-[#8C9097] hidden sm:inline">:: REMOTE COMM ACTIVITY LOGS</span>
      </div>
      <div class="flex items-center gap-2 text-[10px] font-mono">
        <span class="px-2 py-0.5 bg-[#FCFCFA] border border-[#D0CEC7] text-[#5C6066]">
          BUFFER: {botLogs.length}/40 PACKETS
        </span>
        {#if botLogs.length > 0}
          <button
            onclick={() => botLogs = []}
            class="px-2 py-0.5 bg-[#FCFCFA] hover:bg-rose-50 text-[#8C9097] hover:text-rose-600 border border-[#D0CEC7] hover:border-rose-300 cursor-pointer transition font-bold"
          >
            FLUSH
          </button>
        {/if}
      </div>
    </div>

    <!-- Recessed CRT Phosphor Screen for Terminal Logs -->
    <div class="bg-[#101114] border-2 border-[#2A2B30] p-3 rounded-none crt-screen font-mono text-[11px] leading-relaxed max-h-52 overflow-y-auto custom-scrollbar select-text">
      {#if botLogs.length === 0}
        <div class="text-[#666] italic flex items-center gap-2 py-2">
          <span class="inline-block w-2 h-3 bg-[#33FF33] animate-retro-cursor"></span>
          <span>Awaiting remote inbound/outbound packets... (Kirim pesan via WhatsApp / Telegram bot untuk melihat live stream telemetri).</span>
        </div>
      {:else}
        <div class="flex flex-col gap-1">
          {#each botLogs as log}
            <div class="flex items-start gap-2 hover:bg-white/5 px-1 py-0.5 rounded-none transition">
              <span class="text-[#666] shrink-0 font-bold">
                [{new Date(log.timestamp).toLocaleTimeString('id-ID', { hour12: false })}]
              </span>
              <span class="px-1 py-0.2 text-[9px] font-bold shrink-0 {log.platform === 'whatsapp' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-sky-950 text-sky-400 border border-sky-800'}">
                {log.platform.toUpperCase()}
              </span>
              <span class="text-amber-400 font-bold shrink-0">
                &lt;{log.type}&gt;
              </span>
              {#if log.sender}
                <span class="text-neutral-400 shrink-0">
                  [{log.sender}]:
                </span>
              {/if}
              <span class="text-[#33FF33] break-all font-sans text-xs">
                {log.text || ''}
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
