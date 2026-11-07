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

<div class="h-full overflow-y-auto p-3.5 sm:p-4 md:p-6 pb-24 md:pb-6 custom-scrollbar select-none">
  <!-- Header Title -->
  <div class="max-w-6xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
    <div>
      <h1 class="text-lg font-bold text-white flex items-center gap-2">
        <Bot class="w-5 h-5 text-[#FF5500]" /> Remote Controller & Hub Integrasi
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
    <div class="bg-[#ECEAE5] border border-[#D0CEC7] rounded-2xl p-5 flex flex-col gap-4 shadow-sm transition-all relative text-[#191B1D]">
      <!-- Card Header -->
      <div class="flex items-center justify-between border-b border-[#D0CEC7] pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-bold shadow-2xs">
            <MessageSquare class="w-4 h-4" />
          </div>
          <div>
            <span class="text-xs font-bold text-[#191B1D] block">WhatsApp Remote</span>
            <span class="text-[10px] text-[#5C6066] font-mono">Baileys Multi-Device</span>
          </div>
        </div>

        <span class="flex items-center gap-1.5 text-[11px] font-mono font-bold {whatsappStatus?.status === 'connected' ? 'text-emerald-700' : (whatsappStatus?.status === 'qr_ready' ? 'text-amber-700' : (whatsappStatus?.status === 'connecting' ? 'text-[#FF5500]' : 'text-[#8C9097]'))}">
          {#if whatsappStatus?.status === 'connecting'}
            <Loader2 class="w-3 h-3 animate-spin text-[#FF5500]" /> Menghubungkan...
          {:else}
            <span class="w-2 h-2 rounded-full {whatsappStatus?.status === 'connected' ? 'bg-emerald-500' : (whatsappStatus?.status === 'qr_ready' ? 'bg-amber-500 animate-pulse' : 'bg-[#8C9097]')}"></span>
            {whatsappStatus?.status === 'connected' ? 'Online' : (whatsappStatus?.status === 'qr_ready' ? 'Scan QR' : 'Offline')}
          {/if}
        </span>
      </div>

      <!-- Persona Selector (Custom Component) -->
      <div class="flex flex-col gap-1.5 relative">
        <div class="flex items-center justify-between text-[11px]">
          <span class="font-bold text-[#191B1D] flex items-center gap-1.5">
            <Sparkles class="w-3.5 h-3.5 text-[#FF5500]" /> Persona AI WhatsApp:
          </span>
          <span class="text-[10px] text-[#5C6066] font-mono">Klik kartu untuk ganti</span>
        </div>

        <!-- Selected Persona Trigger Card -->
        <button
          type="button"
          onclick={() => { isWaPersonaOpen = !isWaPersonaOpen; isTgPersonaOpen = false; }}
          class="w-full text-left bg-[#FCFCFA] hover:bg-white border border-[#D0CEC7] hover:border-[#FF5500] rounded-xl p-2.5 flex items-center justify-between gap-2.5 transition cursor-pointer group shadow-2xs"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-[#D0CEC7] bg-[#E5E3DD] flex items-center justify-center">
              <AvatarView avatar={waPersona?.avatar} name={waPersona?.name} size="sm" />
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold text-[#191B1D] truncate">{waPersona?.name || 'Standard Agent'}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded bg-[#E5E3DD] border border-[#D0CEC7] text-[#5C6066] font-mono shrink-0 font-semibold">
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
          <div class="absolute top-full left-0 right-0 mt-1.5 z-30 bg-[#FCFCFA] border border-[#D0CEC7] rounded-xl shadow-xl p-1.5 flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
            <div class="px-2 py-1 text-[10px] font-mono text-[#5C6066] border-b border-[#D0CEC7] mb-0.5 font-bold">
              Pilih Persona AI untuk WhatsApp:
            </div>
            {#each personas as p}
              <button
                type="button"
                onclick={() => selectPersona('whatsapp', p.id)}
                class="w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 transition cursor-pointer {p.id === waActivePersonaId ? 'bg-[#FF5500]/10 text-[#FF5500] border border-[#FF5500]/30 font-bold' : 'hover:bg-[#ECEAE5] text-[#191B1D]'}"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-6 h-6 rounded-md overflow-hidden shrink-0 border border-[#D0CEC7] bg-[#E5E3DD] flex items-center justify-center">
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
              class="btn-hardware px-3 py-1.5 rounded-lg text-[#191B1D] hover:text-rose-600 hover:border-rose-400 text-xs font-bold cursor-pointer transition shadow-xs"
            >
              Putuskan
            </button>
          </div>
        {:else if whatsappStatus?.status === 'qr_ready'}
          <!-- QR Ready State -->
          <div class="flex flex-col items-center bg-[#FCFCFA] p-4 rounded-xl border border-amber-500/50 text-center gap-3 shadow-xs">
            <div class="flex items-center justify-between w-full px-1">
              <span class="text-xs text-amber-800 font-bold flex items-center gap-1.5 font-mono">
                <QrCode class="w-3.5 h-3.5 text-[#FF5500]" /> Pindai Kode QR WhatsApp:
              </span>
              <button
                onclick={handleRefreshWa}
                disabled={isStartingWa}
                class="btn-hardware flex items-center gap-1 text-[10px] text-[#5C6066] hover:text-[#191B1D] px-2 py-0.5 rounded cursor-pointer transition font-bold font-mono"
                title="Muat ulang QR code"
              >
                <RefreshCw class="w-3 h-3 {isStartingWa ? 'animate-spin' : ''}" /> Refresh
              </button>
            </div>

            {#if currentQr}
              <div class="p-3 bg-white rounded-2xl shadow-md border-2 border-amber-500">
                <img src={currentQr} alt="WhatsApp QR Code" class="w-44 h-44 object-contain" />
              </div>
            {:else}
              <div class="w-44 h-44 bg-[#ECEAE5] rounded-2xl flex flex-col items-center justify-center gap-2 text-[#5C6066] border border-[#D0CEC7]">
                <Loader2 class="w-6 h-6 animate-spin text-[#FF5500]" />
                <span class="text-[11px] font-mono">Memuat kode QR...</span>
                <button
                  type="button"
                  onclick={handleRefreshWa}
                  class="mt-1 text-[10px] text-[#FF5500] hover:underline cursor-pointer font-bold font-mono"
                >
                  Muat Ulang
                </button>
              </div>
            {/if}

            <div class="text-[10px] text-[#5C6066] text-left bg-[#ECEAE5] p-2.5 rounded-lg border border-[#D0CEC7] w-full flex flex-col gap-0.5 font-mono">
              <span class="text-[#191B1D] font-bold mb-0.5">Langkah Menghubungkan:</span>
              <div>1. Buka aplikasi WhatsApp di HP Anda</div>
              <div>2. Menu Titik Tiga / Pengaturan > <span class="text-[#191B1D] font-bold">Perangkat Tertaut</span></div>
              <div>3. Klik <span class="text-emerald-700 font-bold">Tautkan Perangkat</span> dan arahkan kamera ke sini</div>
            </div>
          </div>
        {:else if whatsappStatus?.status === 'connecting'}
          <!-- Connecting State -->
          <div class="p-5 rounded-xl bg-[#FCFCFA] border border-[#D0CEC7] flex flex-col items-center justify-center gap-2 text-center text-xs text-[#191B1D] shadow-xs">
            <Loader2 class="w-6 h-6 animate-spin text-[#FF5500]" />
            <span class="font-bold">Memulai Baileys & menyiapkan koneksi...</span>
            <span class="text-[10px] text-[#5C6066] font-mono">Mohon tunggu sebentar</span>
          </div>
        {:else}
          <!-- Stopped / Offline State -->
          <button
            onclick={handleStartWa}
            disabled={isStartingWa}
            class="btn-safety w-full py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-50 shadow-xs"
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
                class="flex-1 bg-[#FCFCFA] border border-[#D0CEC7] rounded-lg px-2.5 py-1.5 text-xs text-[#191B1D] font-mono outline-none focus:border-[#FF5500] shadow-xs"
              />
              <button
                onclick={handleSaveWaNumbers}
                class="btn-hardware px-3 py-1.5 rounded-lg text-xs font-bold text-[#191B1D] cursor-pointer active:scale-95 shadow-xs"
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
        <span class="px-1.5 py-0.5 rounded bg-[#ECEAE5] border border-[#D0CEC7] text-[#191B1D] font-bold">!code</span>
        <span class="px-1.5 py-0.5 rounded bg-[#ECEAE5] border border-[#D0CEC7] text-[#191B1D] font-bold">!persona</span>
        <span class="px-1.5 py-0.5 rounded bg-[#ECEAE5] border border-[#D0CEC7] text-[#191B1D] font-bold">!git</span>
        <span class="px-1.5 py-0.5 rounded bg-[#ECEAE5] border border-[#D0CEC7] text-[#191B1D] font-bold">!commit</span>
        <span class="px-1.5 py-0.5 rounded bg-[#ECEAE5] border border-[#D0CEC7] text-[#191B1D] font-bold">!push</span>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- CARD 2: Telegram Remote -->
    <!-- ========================================== -->
    <div class="bg-[#ECEAE5] border border-[#D0CEC7] rounded-2xl p-5 flex flex-col gap-4 shadow-sm transition-all relative text-[#191B1D]">
      <!-- Card Header -->
      <div class="flex items-center justify-between border-b border-[#D0CEC7] pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-sky-100 border border-sky-300 text-sky-800 flex items-center justify-center font-bold shadow-2xs">
            <Send class="w-4 h-4" />
          </div>
          <div>
            <span class="text-xs font-bold text-[#191B1D] block">Telegram Bot</span>
            <span class="text-[10px] text-[#5C6066] font-mono">Telegraf Polling</span>
          </div>
        </div>
        <span class="flex items-center gap-1.5 text-[11px] font-mono font-bold {telegramStatus?.status === 'running' ? 'text-sky-800' : 'text-[#8C9097]'}">
          <span class="w-2 h-2 rounded-full {telegramStatus?.status === 'running' ? 'bg-sky-500' : 'bg-[#8C9097]'}"></span>
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
          class="w-full text-left bg-[#FCFCFA] hover:bg-white border border-[#D0CEC7] hover:border-[#FF5500] rounded-xl p-2.5 flex items-center justify-between gap-2.5 transition cursor-pointer group shadow-2xs"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-[#D0CEC7] bg-[#E5E3DD] flex items-center justify-center">
              <AvatarView avatar={tgPersona?.avatar} name={tgPersona?.name} size="sm" />
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold text-[#191B1D] truncate">{tgPersona?.name || 'Standard Agent'}</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded bg-[#E5E3DD] border border-[#D0CEC7] text-[#5C6066] font-mono shrink-0 font-semibold">
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
          <div class="absolute top-full left-0 right-0 mt-1.5 z-30 bg-[#FCFCFA] border border-[#D0CEC7] rounded-xl shadow-xl p-1.5 flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
            <div class="px-2 py-1 text-[10px] font-mono text-[#5C6066] border-b border-[#D0CEC7] mb-0.5 font-bold">
              Pilih Persona AI untuk Telegram:
            </div>
            {#each personas as p}
              <button
                type="button"
                onclick={() => selectPersona('telegram', p.id)}
                class="w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between gap-2 transition cursor-pointer {p.id === tgActivePersonaId ? 'bg-[#FF5500]/10 text-[#FF5500] border border-[#FF5500]/30 font-bold' : 'hover:bg-[#ECEAE5] text-[#191B1D]'}"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-6 h-6 rounded-md overflow-hidden shrink-0 border border-[#D0CEC7] bg-[#E5E3DD] flex items-center justify-center">
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
          <div class="p-3 rounded-xl bg-sky-50 border border-sky-300 flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></span>
                <span class="text-xs font-bold text-sky-950">Bot Aktif Berjalan</span>
              </div>
              <button
                onclick={onStopTelegram}
                class="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 text-xs font-bold cursor-pointer transition active:scale-95"
              >
                Hentikan
              </button>
            </div>

            {#if telegramStatus.botInfo?.username}
              <a
                href="https://t.me/{telegramStatus.botInfo.username}"
                target="_blank"
                class="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition"
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
                class="flex-1 bg-[#FCFCFA] border border-[#D0CEC7] rounded-xl px-3 py-2 text-xs text-[#191B1D] font-mono outline-none focus:border-[#FF5500]"
              />
              <button
                onclick={handleSaveTgConfig}
                class="btn-hardware px-3 py-2 rounded-xl text-xs font-bold cursor-pointer active:scale-95"
              >
                Simpan
              </button>
            </div>
          </div>

          <button
            onclick={() => onStartTelegram(tgTokenInput && !tgTokenInput.includes('•') ? tgTokenInput.trim() : '')}
            class="btn-safety w-full py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
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
                class="flex-1 bg-[#FCFCFA] border border-[#D0CEC7] rounded-lg px-2.5 py-1.5 text-xs text-[#191B1D] font-mono outline-none focus:border-[#FF5500]"
              />
              <button
                onclick={handleSaveTgConfig}
                class="btn-hardware px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer active:scale-95"
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
        <span class="px-1.5 py-0.5 rounded bg-[#FCFCFA] border border-[#D0CEC7] text-[#191B1D] font-semibold">/code</span>
        <span class="px-1.5 py-0.5 rounded bg-[#FCFCFA] border border-[#D0CEC7] text-[#191B1D] font-semibold">/persona</span>
        <span class="px-1.5 py-0.5 rounded bg-[#FCFCFA] border border-[#D0CEC7] text-[#191B1D] font-semibold">/git</span>
        <span class="px-1.5 py-0.5 rounded bg-[#FCFCFA] border border-[#D0CEC7] text-[#191B1D] font-semibold">/commit</span>
        <span class="px-1.5 py-0.5 rounded bg-[#FCFCFA] border border-[#D0CEC7] text-[#191B1D] font-semibold">/push</span>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- CARD 3: Public Tunnel & LAN -->
    <!-- ========================================== -->
    <div class="bg-[#ECEAE5] border border-[#D0CEC7] rounded-2xl p-5 flex flex-col gap-4 shadow-sm transition-all text-[#191B1D]">
      <!-- Card Header -->
      <div class="flex items-center justify-between border-b border-[#D0CEC7] pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-orange-100 border border-orange-300 text-[#FF5500] flex items-center justify-center font-bold shadow-2xs">
            <Globe class="w-4 h-4" />
          </div>
          <div>
            <span class="text-xs font-bold text-[#191B1D] block">Akses Jaringan</span>
            <span class="text-[10px] text-[#5C6066] font-mono">Local LAN & Cloud Tunnel</span>
          </div>
        </div>
        <span class="flex items-center gap-1.5 text-[11px] font-mono font-bold {tunnelStatus?.status === 'connected' ? 'text-[#FF5500]' : 'text-[#8C9097]'}">
          <span class="w-2 h-2 rounded-full {tunnelStatus?.status === 'connected' ? 'bg-[#FF5500]' : 'bg-[#8C9097]'}"></span>
          {tunnelStatus?.status === 'connected' ? 'Live' : 'Local'}
        </span>
      </div>

      <!-- 1. Local Wi-Fi -->
      <div class="flex flex-col gap-1.5">
        <span class="text-[11px] text-[#191B1D] font-bold flex items-center gap-1.5">
          <span>1. Akses Wi-Fi Lokal (HP & Laptop):</span>
        </span>
        <div class="flex items-center justify-between bg-[#FCFCFA] p-2.5 rounded-xl border border-[#D0CEC7] text-xs font-mono text-[#191B1D]">
          <span class="truncate">{tunnelStatus?.localUrl || 'http://localhost:3888'}</span>
          <button
            onclick={() => copyText(tunnelStatus?.localUrl || '', 'local')}
            class="p-1 text-[#5C6066] hover:text-[#191B1D] cursor-pointer transition"
            title="Salin URL"
          >
            {#if isCopiedLocal}<Check class="w-3.5 h-3.5 text-emerald-600" />{:else}<Copy class="w-3.5 h-3.5" />{/if}
          </button>
        </div>
        <span class="text-[10px] text-[#5C6066]">Bisa dibuka dari HP yang terhubung ke satu Wi-Fi yang sama.</span>
      </div>

      <!-- 2. Public Internet Tunnel -->
      <div class="flex flex-col gap-1.5 pt-1">
        <span class="text-[11px] text-[#191B1D] font-bold">2. Akses Luar Internet (Public Tunnel):</span>
        {#if tunnelStatus?.status === 'connected' && tunnelStatus.publicUrl}
          <div class="flex items-center justify-between bg-[#FCFCFA] p-2.5 rounded-xl border border-[#FF5500]/40 text-xs font-mono text-[#FF5500] font-bold">
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
            class="w-full py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 text-xs font-bold cursor-pointer active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStoppingTunnel ? 'Menutup Akses...' : 'Tutup Akses Publik (Stop Tunnel)'}
          </button>
        {:else}
          <div class="flex gap-2">
            <input
              type="text"
              bind:value={customSubdomain}
              placeholder="zhiend-agent"
              class="flex-1 bg-[#FCFCFA] border border-[#D0CEC7] rounded-xl px-3 py-2 text-xs text-[#191B1D] font-mono outline-none focus:border-[#FF5500]"
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
              class="btn-safety px-4 py-2 rounded-xl text-white font-bold text-xs cursor-pointer active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStartingTunnel ? 'Membuka...' : 'Buka'}
            </button>
          </div>
        {/if}
      </div>

      <!-- 3. Security PIN Input -->
      <div class="flex flex-col gap-1.5 pt-2 border-t border-[#D0CEC7]">
        <div class="flex items-center justify-between">
          <span class="text-[11px] text-[#191B1D] font-bold flex items-center gap-1.5">
            <Shield class="w-3.5 h-3.5 text-[#FF5500]" /> Security PIN Akses Web:
          </span>
          {#if config?.securityPin}
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 font-mono font-bold">PIN Aktif</span>
          {:else}
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-[#E5E3DD] border border-[#D0CEC7] text-[#5C6066] font-mono">Belum Ada PIN</span>
          {/if}
        </div>
        <div class="flex gap-2">
          <input
            type="password"
            bind:value={securityPinInput}
            placeholder="Ketik PIN (misal: 1234)"
            class="flex-1 bg-[#FCFCFA] border border-[#D0CEC7] rounded-xl px-3 py-2 text-xs text-[#191B1D] font-mono outline-none focus:border-[#FF5500]"
          />
          <button
            onclick={handleSavePin}
            disabled={isSavingPin}
            class="btn-safety px-3 py-2 rounded-xl text-white text-xs font-bold cursor-pointer active:scale-95 transition"
          >
            {isSavingPin ? 'Menyimpan...' : 'Simpan PIN'}
          </button>
        </div>
        <span class="text-[10px] text-[#5C6066] font-mono">Siapapun yang membuka link publik wajib memasukkan PIN ini.</span>
      </div>
    </div>

  </div>
</div>
