<script lang="ts">
  import type { WhatsAppStatus, TelegramStatus, TunnelStatus, AppConfig } from '../types';
  import { 
    MessageSquare, 
    Send, 
    Globe, 
    Copy, 
    ExternalLink, 
    Check, 
    Link as LinkIcon 
  } from 'lucide-svelte';

  let {
    whatsappStatus,
    telegramStatus,
    tunnelStatus,
    config,
    onStartWhatsApp,
    onLogoutWhatsApp,
    onStartTelegram,
    onStopTelegram,
    onSaveTelegramToken,
    onStartTunnel,
    onStopTunnel,
    onSaveSecurityPin
  }: {
    whatsappStatus: WhatsAppStatus | null;
    telegramStatus: TelegramStatus | null;
    tunnelStatus: TunnelStatus | null;
    config: AppConfig | null;
    onStartWhatsApp: () => Promise<void>;
    onLogoutWhatsApp: () => Promise<void>;
    onStartTelegram: (token?: string) => Promise<void>;
    onStopTelegram: () => Promise<void>;
    onSaveTelegramToken: (token: string, allowedUsers: string[]) => Promise<void>;
    onStartTunnel: (subdomain?: string) => Promise<void>;
    onStopTunnel: () => Promise<void>;
    onSaveSecurityPin: (pin: string) => Promise<void>;
  } = $props();

  let tgTokenInput = $state('');
  let customSubdomain = $state('');
  let isCopiedLocal = $state(false);
  let isCopiedPublic = $state(false);

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
</script>

<div class="h-full overflow-y-auto p-2">
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
    
    <!-- CARD 1: WhatsApp Remote -->
    <div class="bg-zinc-950/70 border border-white/[0.08] hover:border-white/[0.14] rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xl transition-all">
      <div class="flex flex-col gap-3.5">
        <div class="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
              <MessageSquare class="w-4 h-4" />
            </div>
            <div>
              <span class="text-xs font-bold text-white block">WhatsApp Remote</span>
              <span class="text-[10px] text-zinc-500 font-mono">Baileys Multi-Device</span>
            </div>
          </div>
          <span class="flex items-center gap-1.5 text-[11px] font-mono font-bold {whatsappStatus?.status === 'connected' ? 'text-emerald-400' : 'text-zinc-500'}">
            <span class="w-2 h-2 rounded-full {whatsappStatus?.status === 'connected' ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-zinc-600'}"></span>
            {whatsappStatus?.status === 'connected' ? 'Online' : (whatsappStatus?.status === 'qr_ready' ? 'Scan QR' : 'Offline')}
          </span>
        </div>

        {#if whatsappStatus?.status === 'qr_ready' && whatsappStatus.qrCodeDataUrl}
          <div class="flex flex-col items-center bg-zinc-900/60 p-4 rounded-xl border border-white/[0.06] text-center gap-2">
            <span class="text-[11px] text-zinc-300 font-medium">Pindai dengan kamera WhatsApp di HP:</span>
            <div class="p-2.5 bg-white rounded-xl shadow-lg">
              <img src={whatsappStatus.qrCodeDataUrl} alt="WhatsApp QR" class="w-40 h-40" />
            </div>
            <span class="text-[10px] text-zinc-500 font-mono">Perangkat Tertaut > Tautkan Perangkat</span>
          </div>
        {:else if whatsappStatus?.status === 'connected'}
          <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
            <div>
              <div class="font-bold text-emerald-300">{whatsappStatus.user?.name || 'WhatsApp Aktif'}</div>
              <div class="text-[10px] text-zinc-400 font-mono">+{whatsappStatus.user?.id?.split(':')[0]}</div>
            </div>
            <button
              onclick={onLogoutWhatsApp}
              class="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-medium cursor-pointer"
            >
              Logout
            </button>
          </div>
        {:else}
          <button
            onclick={onStartWhatsApp}
            class="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95"
          >
            <LinkIcon class="w-3.5 h-3.5" /> Hubungkan WhatsApp
          </button>
        {/if}
      </div>

      <div class="border-t border-white/[0.06] pt-3 text-[11px] text-zinc-500 font-mono flex flex-col gap-1">
        <span class="font-sans font-semibold text-zinc-400">Perintah Remote:</span>
        <div><code class="text-zinc-300">!code &lt;task&gt;</code> - Coding prompt</div>
        <div><code class="text-zinc-300">!git</code> - Cek status repo</div>
        <div><code class="text-zinc-300">!commit &lt;msg&gt;</code> - Commit</div>
        <div><code class="text-zinc-300">!push</code> - Push ke GitHub</div>
      </div>
    </div>

    <!-- CARD 2: Telegram Remote -->
    <div class="bg-zinc-950/70 border border-white/[0.08] hover:border-white/[0.14] rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xl transition-all">
      <div class="flex flex-col gap-3.5">
        <div class="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center font-bold">
              <Send class="w-4 h-4" />
            </div>
            <div>
              <span class="text-xs font-bold text-white block">Telegram Bot</span>
              <span class="text-[10px] text-zinc-500 font-mono">Telegraf Polling</span>
            </div>
          </div>
          <span class="flex items-center gap-1.5 text-[11px] font-mono font-bold {telegramStatus?.status === 'running' ? 'text-sky-400' : 'text-zinc-500'}">
            <span class="w-2 h-2 rounded-full {telegramStatus?.status === 'running' ? 'bg-sky-400 shadow-[0_0_6px_#38bdf8]' : 'bg-zinc-600'}"></span>
            {telegramStatus?.status === 'running' ? 'Online' : 'Offline'}
          </span>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="tg-token-input-remote" class="text-[11px] text-zinc-400 font-medium">Bot Token:</label>
          <div class="flex gap-2">
            <input
              id="tg-token-input-remote"
              type="password"
              bind:value={tgTokenInput}
              placeholder="123456789:ABCdef..."
              class="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono outline-none focus:border-sky-500"
            />
            <button
              onclick={() => onSaveTelegramToken(tgTokenInput, [])}
              class="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 cursor-pointer"
            >
              Simpan
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2 pt-1">
          {#if telegramStatus?.status === 'running'}
            <button
              onclick={onStopTelegram}
              class="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold text-xs cursor-pointer"
            >
              Hentikan Bot
            </button>
            {#if telegramStatus.botInfo?.username}
              <a
                href="https://t.me/{telegramStatus.botInfo.username}"
                target="_blank"
                class="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-sky-500/20"
              >
                Chat <ExternalLink class="w-3.5 h-3.5" />
              </a>
            {/if}
          {:else}
            <button
              onclick={() => onStartTelegram(tgTokenInput)}
              class="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 transition cursor-pointer active:scale-95"
            >
              Jalankan Bot
            </button>
          {/if}
        </div>
      </div>

      <div class="border-t border-white/[0.06] pt-3 text-[11px] text-zinc-500 font-mono flex flex-col gap-1">
        <span class="font-sans font-semibold text-zinc-400">Perintah Remote:</span>
        <div><code class="text-zinc-300">/code &lt;task&gt;</code> - Coding prompt</div>
        <div><code class="text-zinc-300">/git</code> - Cek status repo</div>
        <div><code class="text-zinc-300">/commit &lt;msg&gt;</code> - Commit</div>
        <div><code class="text-zinc-300">/push</code> - Push ke GitHub</div>
      </div>
    </div>

    <!-- CARD 3: Public Tunnel & LAN -->
    <div class="bg-zinc-950/70 border border-white/[0.08] hover:border-white/[0.14] rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xl transition-all">
      <div class="flex flex-col gap-3.5">
        <div class="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-400 flex items-center justify-center font-bold">
              <Globe class="w-4 h-4" />
            </div>
            <div>
              <span class="text-xs font-bold text-white block">Akses Jaringan</span>
              <span class="text-[10px] text-zinc-500 font-mono">Local LAN & Tunnel</span>
            </div>
          </div>
          <span class="flex items-center gap-1.5 text-[11px] font-mono font-bold {tunnelStatus?.status === 'connected' ? 'text-violet-400' : 'text-zinc-500'}">
            <span class="w-2 h-2 rounded-full {tunnelStatus?.status === 'connected' ? 'bg-violet-400 shadow-[0_0_6px_#a78bfa]' : 'bg-zinc-600'}"></span>
            {tunnelStatus?.status === 'connected' ? 'Live' : 'Local'}
          </span>
        </div>

        <!-- 1. Local Wi-Fi -->
        <div class="flex flex-col gap-1.5">
          <span class="text-[11px] text-zinc-400 font-semibold">1. Akses Wi-Fi Lokal (HP & Laptop):</span>
          <div class="flex items-center justify-between bg-zinc-900/90 p-2.5 rounded-xl border border-white/[0.06] text-xs font-mono text-zinc-200">
            <span class="truncate">{tunnelStatus?.localUrl || 'http://localhost:3888'}</span>
            <button
              onclick={() => copyText(tunnelStatus?.localUrl || '', 'local')}
              class="p-1 text-zinc-400 hover:text-white cursor-pointer"
            >
              {#if isCopiedLocal}<Check class="w-3.5 h-3.5 text-emerald-400" />{:else}<Copy class="w-3.5 h-3.5" />{/if}
            </button>
          </div>
        </div>

        <!-- 2. Public Internet -->
        <div class="flex flex-col gap-1.5 pt-1">
          <span class="text-[11px] text-zinc-400 font-semibold">2. Akses Luar Internet (Public Tunnel):</span>
          {#if tunnelStatus?.status === 'connected' && tunnelStatus.publicUrl}
            <div class="flex items-center justify-between bg-zinc-900/90 p-2.5 rounded-xl border border-violet-500/30 text-xs font-mono text-violet-300">
              <span class="truncate">{tunnelStatus.publicUrl}</span>
              <button
                onclick={() => copyText(tunnelStatus?.publicUrl || '', 'public')}
                class="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                {#if isCopiedPublic}<Check class="w-3.5 h-3.5 text-emerald-400" />{:else}<Copy class="w-3.5 h-3.5" />{/if}
              </button>
            </div>
            <button
              onclick={onStopTunnel}
              class="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
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
                class="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 cursor-pointer active:scale-95"
              >
                Buka
              </button>
            </div>
          {/if}
        </div>
      </div>

      <div class="border-t border-white/[0.06] pt-3 text-[11px] text-zinc-500 font-mono">
        Bisa diakses dari HP via internet. Gunakan fitur Security PIN di Settings untuk mengamankan akses web Anda.
      </div>
    </div>

  </div>
</div>
