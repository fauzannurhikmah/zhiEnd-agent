<script lang="ts">
  import type { WhatsAppStatus, TelegramStatus, TunnelStatus, AppConfig } from '../types';
  import { MessageSquare, Send, Globe, Wifi, Shield, Copy, ExternalLink, Play, Square, Link, Check, RefreshCw } from 'lucide-svelte';

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
  let tgUsersInput = $state('');
  let customSubdomain = $state('');
  let newPinInput = $state('');
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

<div class="h-full overflow-y-auto pr-1">
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
    
    <!-- CARD 1: WhatsApp Remote Bot -->
    <div class="glass-panel p-5 rounded-2xl flex flex-col gap-4 border border-slate-800/80 shadow-md">
      <div class="flex items-start justify-between border-b border-slate-800/80 pb-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <MessageSquare class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">WhatsApp Remote</h3>
            <p class="text-[11px] text-slate-400">Coding lewat pesan WhatsApp</p>
          </div>
        </div>
        <span class="text-[10px] font-mono px-2 py-0.5 rounded font-bold {whatsappStatus?.status === 'connected' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : (whatsappStatus?.status === 'qr_ready' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400')}">
          {whatsappStatus?.status || 'Disconnected'}
        </span>
      </div>

      <div class="flex-1 flex flex-col gap-3">
        <!-- QR Ready state -->
        {#if whatsappStatus?.status === 'qr_ready' && whatsappStatus.qrCodeDataUrl}
          <div class="flex flex-col items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-center gap-2">
            <span class="text-xs text-slate-300">Pindai kode QR dari WhatsApp di HP:</span>
            <div class="p-2 bg-white rounded-lg shadow-md">
              <img src={whatsappStatus.qrCodeDataUrl} alt="WhatsApp QR" class="w-48 h-48" />
            </div>
            <span class="text-[10px] text-slate-500">Buka Menu > Perangkat Tertaut > Tautkan Perangkat</span>
          </div>
        {:else if whatsappStatus?.status === 'connected'}
          <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-xs font-bold text-emerald-300">{whatsappStatus.user?.name || whatsappStatus.user?.notify || 'WhatsApp Terhubung'}</span>
              <span class="text-[11px] text-slate-400 font-mono">ID: {whatsappStatus.user?.id?.split(':')[0] || 'Active'}</span>
            </div>
            <button
              onclick={onLogoutWhatsApp}
              class="px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold cursor-pointer"
            >
              Logout
            </button>
          </div>
        {:else}
          <button
            onclick={onStartWhatsApp}
            class="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <Link class="w-4 h-4" /> Hubungkan WhatsApp
          </button>
        {/if}

        <!-- Cheatsheet -->
        <div class="bg-slate-950/60 p-3 rounded-xl border border-slate-900 text-xs flex flex-col gap-1.5 font-mono">
          <span class="text-[11px] font-sans font-bold text-slate-400">Perintah WhatsApp:</span>
          <div class="text-[11px] text-slate-300 flex flex-col gap-1">
            <div><span class="text-emerald-400 font-bold">!code &lt;task&gt;</span> <span class="text-slate-500">- Instruksi coding</span></div>
            <div><span class="text-emerald-400 font-bold">!git</span> <span class="text-slate-500">- Status git repo</span></div>
            <div><span class="text-emerald-400 font-bold">!diff</span> <span class="text-slate-500">- Cek diff perubahan</span></div>
            <div><span class="text-emerald-400 font-bold">!commit &lt;pesan&gt;</span> <span class="text-slate-500">- Stage & commit</span></div>
            <div><span class="text-emerald-400 font-bold">!push</span> <span class="text-slate-500">- Push ke GitHub</span></div>
            <div><span class="text-emerald-400 font-bold">!project &lt;path&gt;</span> <span class="text-slate-500">- Ganti project aktif</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- CARD 2: Telegram Remote Bot -->
    <div class="glass-panel p-5 rounded-2xl flex flex-col gap-4 border border-slate-800/80 shadow-md">
      <div class="flex items-start justify-between border-b border-slate-800/80 pb-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Send class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Telegram Remote Bot</h3>
            <p class="text-[11px] text-slate-400">Instan polling tanpa buka port</p>
          </div>
        </div>
        <span class="text-[10px] font-mono px-2 py-0.5 rounded font-bold {telegramStatus?.status === 'running' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-slate-800 text-slate-400'}">
          {telegramStatus?.status || 'Stopped'}
        </span>
      </div>

      <div class="flex-1 flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label for="tg-token" class="text-[11px] text-slate-400 font-semibold">Bot Token (dari @BotFather):</label>
          <div class="flex gap-2">
            <input
              id="tg-token"
              type="password"
              bind:value={tgTokenInput}
              placeholder="123456789:ABCdefGhI..."
              class="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-500 font-mono"
            />
            <button
              onclick={() => onSaveTelegramToken(tgTokenInput, tgUsersInput ? tgUsersInput.split(',').map(s=>s.trim()) : [])}
              class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              Simpan
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2 pt-1">
          {#if telegramStatus?.status === 'running'}
            <button
              onclick={onStopTelegram}
              class="flex-1 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Square class="w-3.5 h-3.5" /> Hentikan Bot
            </button>
            {#if telegramStatus.botInfo?.username}
              <a
                href="https://t.me/{telegramStatus.botInfo.username}"
                target="_blank"
                class="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-1 shadow-md shadow-sky-600/20"
              >
                Buka <ExternalLink class="w-3 h-3" />
              </a>
            {/if}
          {:else}
            <button
              onclick={() => onStartTelegram(tgTokenInput)}
              class="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 transition cursor-pointer"
            >
              <Play class="w-3.5 h-3.5" /> Jalankan Bot
            </button>
          {/if}
        </div>

        <!-- Cheatsheet -->
        <div class="bg-slate-950/60 p-3 rounded-xl border border-slate-900 text-xs flex flex-col gap-1.5 font-mono">
          <span class="text-[11px] font-sans font-bold text-slate-400">Perintah Telegram:</span>
          <div class="text-[11px] text-slate-300 flex flex-col gap-1">
            <div><span class="text-sky-400 font-bold">/code &lt;perintah&gt;</span> <span class="text-slate-500">- Coding agent</span></div>
            <div><span class="text-sky-400 font-bold">/git</span> <span class="text-slate-500">- Status git repo</span></div>
            <div><span class="text-sky-400 font-bold">/diff</span> <span class="text-slate-500">- Cek diff perubahan</span></div>
            <div><span class="text-sky-400 font-bold">/commit &lt;pesan&gt;</span> <span class="text-slate-500">- Stage & commit</span></div>
            <div><span class="text-sky-400 font-bold">/push</span> <span class="text-slate-500">- Push ke GitHub</span></div>
            <div><span class="text-sky-400 font-bold">/cancel</span> <span class="text-slate-500">- Batalkan task</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- CARD 3: Public Tunnel & LAN Access -->
    <div class="glass-panel p-5 rounded-2xl flex flex-col gap-4 border border-slate-800/80 shadow-md">
      <div class="flex items-start justify-between border-b border-slate-800/80 pb-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Globe class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Akses Luar & LAN</h3>
            <p class="text-[11px] text-slate-400">Buka dashboard dari HP atau luar rumah</p>
          </div>
        </div>
        <span class="text-[10px] font-mono px-2 py-0.5 rounded font-bold {tunnelStatus?.status === 'connected' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-slate-800 text-slate-400'}">
          {tunnelStatus?.status === 'connected' ? 'Public Live' : 'Local Only'}
        </span>
      </div>

      <div class="flex-1 flex flex-col gap-3.5">
        <!-- 1. Local Wi-Fi Access -->
        <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
          <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Wifi class="w-3.5 h-3.5 text-emerald-400" />
            1. Akses Lokal (Satu Wi-Fi):
          </div>
          <div class="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-900 text-xs font-mono text-emerald-400">
            <span class="truncate">{tunnelStatus?.localUrl || 'http://localhost:3888'}</span>
            <button
              onclick={() => copyText(tunnelStatus?.localUrl || '', 'local')}
              class="p-1 text-slate-400 hover:text-white cursor-pointer"
              title="Salin Link"
            >
              {#if isCopiedLocal}<Check class="w-3.5 h-3.5 text-emerald-400" />{:else}<Copy class="w-3.5 h-3.5" />{/if}
            </button>
          </div>
          {#if tunnelStatus?.localQr}
            <div class="flex items-center gap-3 pt-1">
              <img src={tunnelStatus.localQr} alt="Local QR" class="w-14 h-14 bg-white p-1 rounded" />
              <span class="text-[10px] text-slate-400 leading-tight">Pindai kamera HP di Wi-Fi yang sama untuk membuka UI ini</span>
            </div>
          {/if}
        </div>

        <!-- 2. Public Internet Tunnel -->
        <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
          <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Globe class="w-3.5 h-3.5 text-violet-400" />
            2. Akses Luar / Internet (Public Tunnel):
          </div>

          {#if tunnelStatus?.status === 'connected' && tunnelStatus.publicUrl}
            <div class="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-900 text-xs font-mono text-violet-300">
              <span class="truncate">{tunnelStatus.publicUrl}</span>
              <button
                onclick={() => copyText(tunnelStatus?.publicUrl || '', 'public')}
                class="p-1 text-slate-400 hover:text-white cursor-pointer"
                title="Salin Link"
              >
                {#if isCopiedPublic}<Check class="w-3.5 h-3.5 text-emerald-400" />{:else}<Copy class="w-3.5 h-3.5" />{/if}
              </button>
            </div>

            {#if tunnelStatus.publicQr}
              <div class="flex items-center gap-3 pt-1">
                <img src={tunnelStatus.publicQr} alt="Public QR" class="w-14 h-14 bg-white p-1 rounded" />
                <span class="text-[10px] text-slate-400 leading-tight">Pindai dari HP mana saja via internet untuk remote control</span>
              </div>
            {/if}

            <button
              onclick={onStopTunnel}
              class="w-full mt-1 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-semibold text-xs cursor-pointer"
            >
              Tutup Akses Publik (Stop Tunnel)
            </button>
          {:else}
            <div class="flex gap-2">
              <input
                type="text"
                bind:value={customSubdomain}
                placeholder="subdomain (opsional)"
                class="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-violet-500 font-mono"
              />
              <button
                onclick={() => onStartTunnel(customSubdomain)}
                class="px-3 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs cursor-pointer"
              >
                Buka Tunnel
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>

  </div>
</div>
