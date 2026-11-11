<script lang="ts">
  import type {
    AppConfig,
    GitStatus,
    TelegramStatus,
    WhatsAppStatus,
    TunnelStatus,
    ChatSessionItem,
  } from "../types";
  import {
    MessageSquare,
    GitBranch,
    Terminal,
    FolderTree,
    TowerControl,
    Settings as SettingsIcon,
    FolderGit,
    ChevronDown,
    Plus,
    X,
    Trash2,
    Blocks,
    Sun,
    Moon,
    Bell,
    BellOff,
  } from "lucide-svelte";

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
    historyScope = "workspace",
    isDark = false,
    onToggleTheme,
    isSoundEnabled = true,
    onToggleSound,
    onSelectTab,
    onOpenProjectModal,
    onOpenSettingsModal,
    onResetToRoot,
    onSelectSession,
    onCreateNewSession,
    onDeleteSession,
    onToggleScope,
    isMobileOpen = false,
    onCloseMobile,
  }: {
    currentTab: "chat" | "git" | "remote" | "files" | "connectors";
    config: AppConfig | null;
    gitStatus: GitStatus | null;
    telegramStatus: TelegramStatus | null;
    whatsappStatus: WhatsAppStatus | null;
    tunnelStatus: TunnelStatus | null;
    isAgentBusy: boolean;
    chatSessions?: ChatSessionItem[];
    activeSessionId?: string | null;
    historyScope?: "workspace" | "global";
    isDark?: boolean;
    onToggleTheme?: (e: MouseEvent) => void;
    isSoundEnabled?: boolean;
    onToggleSound?: () => void;
    isMobileOpen?: boolean;
    onCloseMobile?: () => void;
    onSelectTab: (tab: "chat" | "git" | "remote" | "files" | "connectors") => void;
    onOpenProjectModal: () => void;
    onOpenSettingsModal: () => void;
    onResetToRoot: () => void;
    onSelectSession?: (session: ChatSessionItem) => void;
    onCreateNewSession?: () => void;
    onDeleteSession?: (id: string) => void;
    onToggleScope?: (scope: "workspace" | "global") => void;
  } = $props();

  function handleTabClick(tab: "chat" | "git" | "remote" | "files" | "connectors") {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  }

  function handleSessionClick(session: ChatSessionItem) {
    if (onSelectSession) onSelectSession(session);
    if (onCloseMobile) onCloseMobile();
  }

  function handleProjectModalClick() {
    onOpenProjectModal();
    if (onCloseMobile) onCloseMobile();
  }

  function handleSettingsModalClick() {
    onOpenSettingsModal();
    if (onCloseMobile) onCloseMobile();
  }

  const isRootWorkspace = $derived(() => {
    if (!config?.activeProject) return true;
    const norm = config.activeProject
      .replace(/\\/g, "/")
      .toLowerCase()
      .replace(/\/+$/, "");
    return norm === "d:/works" || norm === "d:";
  });

  const projectName = $derived(() => {
    if (!config?.activeProject) return "Root D:\\Works";
    const norm = config.activeProject
      .replace(/\\/g, "/")
      .toLowerCase()
      .replace(/\/+$/, "");
    if (norm === "d:/works" || norm === "d:") {
      return "Root D:\\Works";
    }
    const parts = config.activeProject
      .replace(/\\/g, "/")
      .split("/")
      .filter(Boolean);
    return parts[parts.length - 1] || config.activeProject;
  });
</script>

{#if isMobileOpen}
  <!-- Backdrop for Mobile Off-Canvas Drawer -->
  <div
    class="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
    onclick={onCloseMobile}
    role="button"
    tabindex="0"
    onkeydown={(e) => {
      if (e.key === "Escape" && onCloseMobile) onCloseMobile();
    }}
  ></div>
{/if}

<aside
  class="fixed md:static inset-y-0 left-0 z-50 md:z-10 w-72 md:w-64 max-w-[85vw] bg-[#ECEAE5] border-r border-[#D0CEC7] flex flex-col justify-between shrink-0 select-none shadow-xl md:shadow-none transition-transform duration-300 ease-in-out text-[#111315] {isMobileOpen
    ? 'translate-x-0'
    : '-translate-x-full md:translate-x-0'}"
>
  <!-- Top: Logo & Workspace -->
  <div class="flex flex-col gap-3 p-3">
    <!-- Brand with industrial hardware stenciling -->
    <div class="flex items-center justify-between px-2 pt-1">
      <div class="flex items-center gap-2.5">
        <div class="relative">
          <img
            src="/img/logo.png"
            alt="zhiEnd Agent Logo"
            class="w-7 h-7 object-contain rounded-none border border-[#D0CEC7]"
          />
          <span class="absolute -top-1 -right-1 w-2 h-2 bg-[#FF5500] rounded-none" title="Registration dot"></span>
        </div>
        <div class="flex flex-col">
          <span
            class="text-xs font-black tracking-tight text-[#111315] flex items-center gap-1 font-tech uppercase"
          >
            zhiEnd <span
              class="bg-[#FF5500] text-white px-1.5 py-0.2 rounded-none text-[8px] font-mono font-bold tracking-wider uppercase"
              >LABS</span
            >
          </span>
          <span class="text-[8px] font-pixel text-[#8C9097] leading-none">:: CIB-GRID v2.4</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        {#if isAgentBusy}
          <span
            class="flex items-center gap-1.5 px-2 py-0.5 rounded-none bg-amber-100 border border-amber-300 text-[10px] text-amber-900 font-mono font-semibold"
          >
            <span class="w-1.5 h-1.5 rounded-none bg-amber-500 animate-pulse"
            ></span>
            busy
          </span>
        {/if}
        {#if onCloseMobile}
          <button
            type="button"
            onclick={onCloseMobile}
            class="md:hidden p-1.5 rounded-none text-[#5C6066] hover:text-[#191B1D] hover:bg-[#DEDBD2] transition cursor-pointer"
            title="Tutup Menu"
          >
            <X class="w-4 h-4" />
          </button>
        {/if}
      </div>
    </div>

    <!-- Active Workspace Card & Create Button (Recessed Mechanical Well) -->
    <div class="flex items-center gap-1.5 w-full">
      <div
        class="flex-1 min-w-0 flex items-center justify-between p-2 rounded-none bg-[#FCFCFA] hover:bg-white border border-[#D0CEC7] hover:border-[#A8A59C] transition group shadow-2xs font-tech"
      >
        <button
          onclick={onOpenProjectModal}
          class="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
          title={config?.activeProject || "Ganti Workspace (D:\\Works)"}
        >
          <FolderGit
            class="w-4 h-4 {isRootWorkspace()
              ? 'text-[#FF5500]'
              : 'text-emerald-600'} group-hover:scale-105 transition-transform shrink-0"
          />
          <div class="flex flex-col min-w-0 flex-1">
            <span class="text-xs font-bold text-[#111315] truncate block"
              >{projectName()}</span
            >
            {#if isRootWorkspace()}
              <span class="text-[10px] text-[#FF5500] font-stencil font-semibold"
                >default root</span
              >
            {:else if gitStatus?.isRepo}
              <span
                class="text-[10px] text-[#5C6066] font-stencil flex items-center gap-1 truncate"
              >
                <GitBranch class="w-2.5 h-2.5 text-[#5C6066] shrink-0" />
                {gitStatus.branch || "main"}
              </span>
            {/if}
          </div>
        </button>

        <div class="flex items-center gap-0.5 shrink-0 ml-1">
          {#if !isRootWorkspace()}
            <button
              onclick={onResetToRoot}
              class="p-1 rounded-none hover:bg-rose-100 text-[#8C9097] hover:text-rose-600 transition cursor-pointer"
              title="Clear Workspace (Kembali ke Root D:\Works)"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          {/if}
          <button
            onclick={onOpenProjectModal}
            class="p-1 text-[#8C9097] group-hover:text-[#191B1D] transition cursor-pointer"
            title="Buka daftar project"
          >
            <ChevronDown class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <button
        onclick={onOpenProjectModal}
        class="btn-hardware p-2.5 rounded-none shrink-0"
        title="Buka / Buat Project Baru di D:\Works"
      >
        <Plus class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Navigation with Cyber-Industrial Tactical Switches -->
    <nav class="flex flex-col gap-1.5 pt-2 font-tech">
      <button
        onclick={() => handleTabClick("chat")}
        class="flex items-center justify-between px-3 py-2 rounded-none text-xs transition-all cursor-pointer active:scale-[0.98] active:translate-y-0.5 group {currentTab ===
        'chat'
          ? 'bg-[#FCFCFA] text-[#111315] font-bold border border-[#D0CEC7] shadow-2xs'
          : 'text-[#60646C] hover:text-[#111315] hover:bg-[#FCFCFA]/80 hover:border-[#D0CEC7] border border-transparent'}"
      >
        <div class="flex items-center gap-2.5">
          <Terminal
            class="w-4 h-4 transition-transform group-hover:scale-110 {currentTab === 'chat'
              ? 'text-[#FF5500]'
              : 'text-[#60646C]'}"
          />
          <span class="tracking-wide">[01] // CODING AGENT</span>
        </div>
        {#if currentTab === 'chat'}
          <span class="flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-none bg-emerald-500 animate-pulse"></span>
            <span class="w-1.5 h-1.5 bg-[#FF5500]"></span>
          </span>
        {/if}
      </button>

      <button
        onclick={() => handleTabClick("git")}
        class="flex items-center justify-between px-3 py-2 rounded-none text-xs transition-all cursor-pointer active:scale-[0.98] active:translate-y-0.5 group {currentTab ===
        'git'
          ? 'bg-[#FCFCFA] text-[#111315] font-bold border border-[#D0CEC7] shadow-2xs'
          : 'text-[#60646C] hover:text-[#111315] hover:bg-[#FCFCFA]/80 hover:border-[#D0CEC7] border border-transparent'}"
      >
        <div class="flex items-center gap-2.5">
          <GitBranch
            class="w-4 h-4 transition-transform group-hover:scale-110 {currentTab === 'git'
              ? 'text-[#FF5500]'
              : 'text-[#60646C]'}"
          />
          <span class="tracking-wide">[02] // SOURCE CONTROL</span>
        </div>
        {#if gitStatus?.files?.length}
          <span
            class="px-2 py-0.5 rounded-none bg-[#FF5500]/15 border border-[#FF5500]/30 text-[#FF5500] font-stencil text-[10px] font-bold animate-pulse"
          >
            {gitStatus.files.length}
          </span>
        {:else if currentTab === 'git'}
          <span class="flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-none bg-emerald-500 animate-pulse"></span>
            <span class="w-1.5 h-1.5 bg-[#FF5500]"></span>
          </span>
        {/if}
      </button>

      <button
        onclick={() => handleTabClick("remote")}
        class="flex items-center justify-between px-3 py-2 rounded-none text-xs transition-all cursor-pointer active:scale-[0.98] active:translate-y-0.5 group {currentTab ===
        'remote'
          ? 'bg-[#FCFCFA] text-[#111315] font-bold border border-[#D0CEC7] shadow-2xs'
          : 'text-[#60646C] hover:text-[#111315] hover:bg-[#FCFCFA]/80 hover:border-[#D0CEC7] border border-transparent'}"
      >
        <div class="flex items-center gap-2.5">
          <TowerControl
            class="w-4 h-4 transition-transform group-hover:scale-110 {currentTab === 'remote'
              ? 'text-[#FF5500]'
              : 'text-[#60646C]'}"
          />
          <span class="tracking-wide">[03] // REMOTE HUB</span>
        </div>
        <div class="flex items-center gap-1.5">
          {#if whatsappStatus?.status === "connected"}
            <span
              class="text-[9px] px-1 py-0.2 rounded-none bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono font-bold"
              title="WhatsApp Connected & Online"
            >
              WA
            </span>
          {:else if whatsappStatus?.status === "qr_ready"}
            <span
              class="text-[9px] px-1 py-0.2 rounded-none bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono font-bold animate-pulse"
              title="WhatsApp Scan QR"
            >
              WA:QR
            </span>
          {/if}
          {#if telegramStatus?.status === "running"}
            <span
              class="text-[9px] px-1 py-0.2 rounded-none bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-mono font-bold"
              title="Telegram Online"
            >
              TG
            </span>
          {/if}
          {#if currentTab === 'remote'}
            <span class="w-1.5 h-1.5 bg-[#FF5500]"></span>
          {/if}
        </div>
      </button>

      <button
        onclick={() => handleTabClick("files")}
        class="flex items-center justify-between px-3 py-2 rounded-none text-xs transition-all cursor-pointer active:scale-[0.98] active:translate-y-0.5 group {currentTab ===
        'files'
          ? 'bg-[#FCFCFA] text-[#111315] font-bold border border-[#D0CEC7] shadow-2xs'
          : 'text-[#60646C] hover:text-[#111315] hover:bg-[#FCFCFA]/80 hover:border-[#D0CEC7] border border-transparent'}"
      >
        <div class="flex items-center gap-2.5">
          <FolderTree
            class="w-4 h-4 transition-transform group-hover:scale-110 {currentTab === 'files'
              ? 'text-[#FF5500]'
              : 'text-[#60646C]'}"
          />
          <span class="tracking-wide">[04] // FILES & LOGS</span>
        </div>
        {#if currentTab === 'files'}
          <span class="flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-none bg-emerald-500 animate-pulse"></span>
            <span class="w-1.5 h-1.5 bg-[#FF5500]"></span>
          </span>
        {/if}
      </button>

      <button
        onclick={() => handleTabClick("connectors")}
        class="flex items-center justify-between px-3 py-2 rounded-none text-xs transition-all cursor-pointer active:scale-[0.98] active:translate-y-0.5 group {currentTab ===
        'connectors'
          ? 'bg-[#FCFCFA] text-[#111315] font-bold border border-[#D0CEC7] shadow-2xs'
          : 'text-[#60646C] hover:text-[#111315] hover:bg-[#FCFCFA]/80 hover:border-[#D0CEC7] border border-transparent'}"
      >
        <div class="flex items-center gap-2.5">
          <Blocks
            class="w-4 h-4 transition-transform group-hover:scale-110 {currentTab === 'connectors'
              ? 'text-[#FF5500]'
              : 'text-[#60646C]'}"
          />
          <span class="tracking-wide">[05] // CONNECTORS HUB</span>
        </div>
        {#if currentTab === 'connectors'}
          <span class="flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-none bg-emerald-500 animate-pulse"></span>
            <span class="w-1.5 h-1.5 bg-[#FF5500]"></span>
          </span>
        {/if}
      </button>
    </nav>

    <!-- Riwayat Chat Section (Cartridge Reels) -->
    <div class="flex flex-col gap-1.5 pt-2.5 border-t border-[#D0CEC7]">
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-1.5">
          <span class="text-[#FF5500] font-pixel text-[10px]">::</span>
          <span class="text-[11px] font-tech font-bold text-[#111315] uppercase tracking-wider"
            >CARTRIDGE REELS</span
          >
        </div>

        <div class="flex items-center gap-1">
          <!-- Scope switcher: Project vs Global -->
          <div
            class="flex items-center bg-[#E5E3DD] rounded-none p-0.5 border border-[#D0CEC7] text-[9px] font-stencil"
          >
            <button
              type="button"
              onclick={() => onToggleScope?.("workspace")}
              class="px-1.5 py-0.5 rounded-none transition cursor-pointer {historyScope ===
              'workspace'
                ? 'bg-[#FCFCFA] text-[#FF5500] border border-[#D0CEC7] font-bold shadow-xs'
                : 'text-[#5C6066] hover:text-[#111315]'}"
              title="Chat khusus project ini"
            >
              Project
            </button>
            <button
              type="button"
              onclick={() => onToggleScope?.("global")}
              class="px-1.5 py-0.5 rounded-none transition cursor-pointer {historyScope ===
              'global'
                ? 'bg-[#FCFCFA] text-[#FF5500] border border-[#D0CEC7] font-bold shadow-xs'
                : 'text-[#5C6066] hover:text-[#111315]'}"
              title="Chat global"
            >
              Global
            </button>
          </div>

          <!-- New Chat Button -->
          <button
            type="button"
            onclick={() => onCreateNewSession?.()}
            class="p-1 rounded-none bg-[#E5E3DD] hover:bg-[#FCFCFA] border border-[#D0CEC7] hover:border-[#A8A59C] text-[#5C6066] hover:text-[#FF5500] transition cursor-pointer"
            title="Mulai Chat Baru"
          >
            <Plus class="w-3 h-3" />
          </button>
        </div>
      </div>

      <!-- Scrollable list of sessions -->
      <div class="flex flex-col gap-1 max-h-48 overflow-y-auto pr-0.5 mt-0.5 font-stencil">
        {#if chatSessions && chatSessions.length > 0}
          {#each chatSessions as sess (sess.id)}
            {@const isActive = activeSessionId === sess.id}
            {@const isRemote = sess.id.startsWith('sess-remote-') || sess.title.includes('[Remote]')}
            <div
              class="group/item flex items-center justify-between px-2 py-1.5 rounded-none transition cursor-pointer {isActive
                ? 'bg-[#FCFCFA] border border-[#D0CEC7] text-[#111315] font-bold shadow-xs'
                : 'hover:bg-[#E5E3DD] border border-transparent text-[#60646C] hover:text-[#111315]'}"
            >
              <button
                type="button"
                onclick={() => {
                  handleTabClick("chat");
                  handleSessionClick(sess);
                }}
                class="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                title={sess.title}
              >
                <span class="text-[9px] font-pixel {isActive ? 'text-[#FF5500]' : (isRemote ? 'text-sky-500' : 'text-[#8C9097]')}">■</span>
                <span class="text-xs truncate flex-1 {isRemote ? 'text-sky-700 dark:text-sky-400 font-semibold' : ''}">{sess.title}</span>
                {#if isRemote}
                  <span class="text-[8px] px-1 py-0.2 rounded-none bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-mono font-bold uppercase shrink-0">
                    REMOTE
                  </span>
                {/if}
                {#if sess.message_count && sess.message_count > 0}
                  <span
                    class="text-[9px] px-1.5 py-0.2 rounded-none font-mono {isActive
                      ? 'bg-[#FF5500]/15 text-[#FF5500]'
                      : 'bg-[#E5E3DD] text-[#5C6066]'} shrink-0"
                  >
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
                class="opacity-0 group-hover/item:opacity-100 p-1 rounded-none hover:bg-rose-100 text-[#8C9097] hover:text-rose-600 transition cursor-pointer shrink-0 ml-1"
                title="Hapus sesi chat"
              >
                <Trash2 class="w-2.5 h-2.5" />
              </button>
            </div>
          {/each}
        {:else}
          <div
            class="p-3 text-center rounded-none bg-[#FCFCFA] border border-dashed border-[#D0CEC7] flex flex-col items-center gap-1.5"
          >
            <span class="text-[11px] text-[#5C6066]">Belum ada riwayat chat</span
            >
            <button
              type="button"
              onclick={() => onCreateNewSession?.()}
              class="text-[10px] text-[#FF5500] hover:text-[#E64D00] font-bold flex items-center gap-1 cursor-pointer font-tech"
            >
              <Plus class="w-2.5 h-2.5" /> Mulai Chat Baru
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Bottom: Tunnel status & Quick System Preferences Panel -->
  <div
    class="p-2.5 border-t border-[#D0CEC7] flex items-center justify-between bg-[#E5E3DD] text-xs font-stencil"
  >
    <div class="flex items-center gap-1.5 text-[11px] text-[#5C6066]">
      <span
        class="w-2 h-2 rounded-none {tunnelStatus?.status === 'connected'
          ? 'bg-[#FF5500]'
          : 'bg-[#8C9097]'}"
      ></span>
      <span class="truncate max-w-[95px] font-bold text-[#111315]">
        {tunnelStatus?.status === "connected" ? "Public Live" : "Local :3888"}
      </span>
    </div>

    <!-- Quick Utility Switches: Theme, Chime, Settings -->
    <div class="flex items-center gap-1">
      {#if onToggleTheme}
        <button
          onclick={onToggleTheme}
          class="w-7 h-7 flex items-center justify-center rounded-none border border-transparent hover:border-[#D0CEC7] dark:hover:border-[#3F4554] hover:bg-[#FCFCFA] dark:hover:bg-[#1E2026] text-[#60646C] hover:text-[#111315] dark:text-[#9BA1AD] dark:hover:text-[#F7F6F2] transition-all cursor-pointer active:scale-90"
          title={isDark ? "Ganti ke Mode Terang (Light Mode)" : "Ganti ke Mode Gelap (Dark Mode)"}
          aria-label="Toggle Theme"
        >
          {#if isDark}
            <Sun class="w-3.5 h-3.5 text-amber-400 fill-amber-400 transition-transform hover:rotate-45" />
          {:else}
            <Moon class="w-3.5 h-3.5 text-[#60646C] hover:text-indigo-600 transition-colors" />
          {/if}
        </button>
      {/if}

      {#if onToggleSound}
        <button
          onclick={onToggleSound}
          class="w-7 h-7 flex items-center justify-center rounded-none border border-transparent hover:border-[#D0CEC7] dark:hover:border-[#3F4554] hover:bg-[#FCFCFA] dark:hover:bg-[#1E2026] text-[#60646C] hover:text-[#111315] dark:text-[#9BA1AD] dark:hover:text-[#F7F6F2] transition-all cursor-pointer active:scale-90"
          title={isSoundEnabled ? "Notifikasi Suara: AKTIF (Klik untuk mute)" : "Notifikasi Suara: MUTE (Klik untuk aktifkan)"}
          aria-label="Toggle Sound"
        >
          {#if isSoundEnabled}
            <Bell class="w-3.5 h-3.5 text-[#FF5500] fill-[#FF5500]/20" />
          {:else}
            <BellOff class="w-3.5 h-3.5 text-[#8C9097] hover:text-[#111315] dark:hover:text-[#F7F6F2]" />
          {/if}
        </button>
      {/if}

      <button
        onclick={onOpenSettingsModal}
        class="w-7 h-7 flex items-center justify-center rounded-none border border-transparent hover:border-[#D0CEC7] dark:hover:border-[#3F4554] hover:bg-[#FCFCFA] dark:hover:bg-[#1E2026] text-[#60646C] hover:text-[#111315] dark:text-[#9BA1AD] dark:hover:text-[#F7F6F2] transition-all cursor-pointer active:scale-90 group/settings"
        title="Pengaturan Sistem"
      >
        <SettingsIcon class="w-3.5 h-3.5 transition-transform duration-300 group-hover/settings:rotate-90" />
      </button>
    </div>
  </div>
</aside>
