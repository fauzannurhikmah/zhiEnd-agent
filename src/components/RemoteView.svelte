<script lang="ts">
  import type { WhatsAppStatus, TelegramStatus, TunnelStatus, AppConfig } from '../types';
  import { 
    MessageSquare, 
    Send, 
    Globe, 
    Wifi, 
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
    
    <!-- CARD 1: WhatsApp -->
    <div class="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 flex flex-col justify-between gap-4">
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <MessageSquare class="w-4 h-4 text-zinc-300" />
            <span class="text-xs font-semibold text-zinc-200">WhatsApp Remote</span>
          </div>
          <span class="flex items-center gap-1.5 text-[11px] font-mono {whatsappStatus?.status === 'connected' ? 'text-emerald-400' : 'text-zinc-500'}">
            <span class="w-1.5 h-1.5 rounded-full {whatsappStatus?.status === 'connected' ? 'bg-emerald-400' : 'bg-zinc-600'}"></span>
            {whatsappStatus?.status === 'connected' ? 'Connected' : (whatsappStatus?.status === 'qr_ready' ? 'Scan QR' : 'Disconnected')}
          </span>
        </div>

        {#if whatsappStatus?.status === 'qr_ready' && whatsappStatus.qrCodeDataUrl}
          <div class="flex flex-col items-center bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-center gap-2">
            <span class="text-[11px] text-zinc-400">Pindai dengan kamera WhatsApp di HP:</span>
            <div class="p-2 bg-white rounded-md">
              <img src={whatsappStatus.qrCodeDataUrl} alt="WhatsApp QR" class="w-40 h-40" />
            </div>
            <span class="text-[10px] text-zinc-500 font-mono">Perangkat Tertaut > Tautkan</span>
          </div>
        {:else if whatsappStatus?.status === 'connected'}
          <div class="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
            <div>
              <div class="font-semibold text-zinc-200">{whatsappStatus.user?.name || 'WhatsApp Aktif'}</div>
              <div class="text-[10px] text-zinc-500 font-mono">+{whatsappStatus.user?.id?.split(':')[0]}</div>
            </div>
            <button
              onclick={onLogoutWhatsApp}
              class="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-medium cursor-pointer"
            >
              Logout
            </button>
          </div>
        {:else}
          <button
            onclick={onStartWhatsApp}
            class="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <LinkIcon class="w-3.5 h-3.5" /> Hubungkan WhatsApp
          </button>
        {/if}
      </div>

      <div class="border-t border-zinc-800/60 pt-3 text-[11px] text-zinc-500 font-mono flex flex-col gap-1">
        <span class="font-sans font-semibold text-zinc-400">Perintah WhatsApp:</span>
        <div><code class="text-zinc-300">!code &lt;task&gt;</code> - Jalankan coding</div>
        <div><code class="text-zinc-300">!git</code> - Status repository</div>
        <div><code class="text-zinc-300">!commit &lt;msg&gt;</code> - Commit perubahan</div>
        <div><code class="text-zinc-300">!push</code> - Push ke GitHub</div>
      </div>
    </div>

    <!-- CARD 2: Telegram -->
    <div class="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 flex flex-col justify-between gap-4">
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Send class="w-4 h-4 text-zinc-300" />
            <span class="text-xs font-semibold text-zinc-200">Telegram Bot</span>
          </div>
          <span class="flex items-center gap-1.5 text-[11px] font-mono {telegramStatus?.status === 'running' ? 'text-sky-400' : 'text-zinc-500'}">
            <span class="w-1.5 h-1.5 rounded-full {telegramStatus?.status === 'running' ? 'bg-sky-400' : 'bg-zinc-600'}"></span>
            {telegramStatus?.status === 'running' ? 'Online' : 'Offline'}
          </span>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="tg-token-input" class="text-[11px] text-zinc-400 font-medium">Bot Token:</label>
          <div class="flex gap-2">
            <input
              id="tg-token-input"
              type="password"
              bind:value={tgTokenInput}
              placeholder="123456789:ABCdef..."
              class="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono outline-none focus:border-zinc-700"
            />
            <button
              onclick={() => onSaveTelegramToken(tgTokenInput, [])}
              class="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 cursor-pointer"
            >
              Simpan
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2 pt-1">
          {#if telegramStatus?.status === 'running'}
            <button
              onclick={onStopTelegram}
              class="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium text-xs cursor-pointer"
            >
              Hentikan Bot
            </button>
            {#if telegramStatus.botInfo?.username}
              <a
                href="https://t.me/{telegramStatus.botInfo.username}"
                target="_blank"
                class="px-3 py-1.5 rounded-lg bg-white text-zinc-950 font-semibold text-xs flex items-center gap-1"
              >
                Chat <ExternalLink class="w-3 h-3" />
              </a>
            {/if}
          {:else}
            <button
              onclick={() => onStartTelegram(tgTokenInput)}
              class="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              Jalankan Bot
            </button>
          {/if}
        </div>
      </div>

      <div class="border-t border-zinc-800/60 pt-3 text-[11px] text-zinc-500 font-mono flex flex-col gap-1">
        <span class="font-sans font-semibold text-zinc-400">Perintah Telegram:</span>
        <div><code class="text-zinc-300">/code &lt;task&gt;</code> - Coding prompt</div>
        <div><code class="text-zinc-300">/git</code> - Status repository</div>
        <div><code class="text-zinc-300">/commit &lt;msg&gt;</code> - Commit perubahan</div>
        <div><code class="text-zinc-300">/push</code> - Push ke GitHub</div>
      </div>
    </div>

    <!-- CARD 3: Public Tunnel & LAN -->
    <div class="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 flex flex-col justify-between gap-4">
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Globe class="w-4 h-4 text-zinc-300" />
            <span class="text-xs font-semibold text-zinc-200">Akses Jaringan</span>
          </div>
          <span class="flex items-center gap-1.5 text-[11px] font-mono {tunnelStatus?.status === 'connected' ? 'text-violet-400' : 'text-zinc-500'}">
            <span class="w-1.5 h-1.5 rounded-full {tunnelStatus?.status === 'connected' ? 'bg-violet-400' : 'bg-zinc-600'}"></span>
            {tunnelStatus?.status === 'connected' ? 'Public' : 'Local'}
          </span>
        </div>

        <!-- 1. Local LAN -->
        <div class="flex flex-col gap-1.5">
          <span class="text-[11px] text-zinc-400 font-medium">1. Wi-Fi Lokal (HP & Laptop):</span>
          <div class="flex items-center justify-between bg-zinc-950 p-2 rounded border border-zinc-800 text-xs font-mono text-zinc-300">
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
          <span class="text-[11px] text-zinc-400 font-medium">2. Akses Internet (Public Tunnel):</span>
          {#if tunnelStatus?.status === 'connected' && tunnelStatus.publicUrl}
            <div class="flex items-center justify-between bg-zinc-950 p-2 rounded border border-zinc-800 text-xs font-mono text-violet-300">
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
              class="w-full py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium cursor-pointer"
            >
              Tutup Tunnel
            </button>
          {:else}
            <div class="flex gap-2">
              <input
                type="text"
                bind:value={customSubdomain}
                placeholder="subdomain (opsional)"
                class="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 font-mono outline-none"
              />
              <button
                onclick={() => onStartTunnel(customSubdomain)}
                class="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs cursor-pointer"
              >
                Buka
              </button>
            </div>
          {/if}
        </div>
      </div>

      <div class="border-t border-zinc-800/60 pt-3 text-[11px] text-zinc-500 font-mono">
        Buka dari HP kapan saja via link publik. Gunakan fitur Security PIN di Settings untuk melindungi akses dashboard Anda.
      </div>
    </div>

  </div>
</div>
