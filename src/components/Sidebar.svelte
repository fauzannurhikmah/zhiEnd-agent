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
    currentTab: "chat" | "git" | "remote" | "files";
    config: AppConfig | null;
    gitStatus: GitStatus | null;
    telegramStatus: TelegramStatus | null;
    whatsappStatus: WhatsAppStatus | null;
    tunnelStatus: TunnelStatus | null;
    isAgentBusy: boolean;
    chatSessions?: ChatSessionItem[];
    activeSessionId?: string | null;
    historyScope?: "workspace" | "global";
    isMobileOpen?: boolean;
    onCloseMobile?: () => void;
    onSelectTab: (tab: "chat" | "git" | "remote" | "files") => void;
    onOpenProjectModal: () => void;
    onOpenSettingsModal: () => void;
    onResetToRoot: () => void;
    onSelectSession?: (session: ChatSessionItem) => void;
    onCreateNewSession?: () => void;
    onDeleteSession?: (id: string) => void;
    onToggleScope?: (scope: "workspace" | "global") => void;
  } = $props();

  function handleTabClick(tab: "chat" | "git" | "remote" | "files") {
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
  class="fixed md:static inset-y-0 left-0 z-50 md:z-10 w-72 md:w-64 max-w-[85vw] bg-[#E9E7E0] border-r border-[#C8C5BC] flex flex-col justify-between shrink-0 select-none shadow-xl md:shadow-none transition-transform duration-300 ease-in-out text-[#191B1D] {isMobileOpen
    ? 'translate-x-0'
    : '-translate-x-full md:translate-x-0'}"
>
  <!-- Top: Logo & Workspace -->
  <div class="flex flex-col gap-3 p-3">
    <!-- Brand with industrial hardware stenciling -->
    <div class="flex items-center justify-between px-2 pt-1">
      <div class="flex items-center gap-2.5">
        <img
          src="/img/logo.png"
          alt="zhiEnd Agent Logo"
          class="w-7 h-7 object-contain rounded-md"
        />
        <span
          class="text-xs font-bold tracking-tight text-[#191B1D] flex items-center gap-1.5"
        >
          zhiEnd <span
            class="bg-[#FF5500] text-white px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase"
            >agent</span
          >
        </span>
      </div>

      <div class="flex items-center gap-2">
        {#if isAgentBusy}
          <span
            class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-[10px] text-amber-900 font-mono font-semibold"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"
            ></span>
            busy
          </span>
        {/if}
        {#if onCloseMobile}
          <button
            type="button"
            onclick={onCloseMobile}
            class="md:hidden p-1.5 rounded-lg text-[#5C6066] hover:text-[#191B1D] hover:bg-[#DEDBD2] transition cursor-pointer"
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
        class="flex-1 min-w-0 flex items-center justify-between p-2 rounded-xl bg-[#FCFCFA] hover:bg-white border border-[#C8C5BC] hover:border-[#A8A59C] transition group shadow-xs"
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
            <span class="text-xs font-bold text-[#191B1D] truncate block"
              >{projectName()}</span
            >
            {#if isRootWorkspace()}
              <span class="text-[10px] text-[#FF5500] font-mono font-semibold"
                >default root</span
              >
            {:else if gitStatus?.isRepo}
              <span
                class="text-[10px] text-[#5C6066] font-mono flex items-center gap-1 truncate"
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
              class="p-1 rounded-md hover:bg-rose-100 text-[#8C9097] hover:text-rose-600 transition cursor-pointer"
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
        class="btn-hardware p-2.5 rounded-xl shrink-0"
        title="Buka / Buat Project Baru di D:\Works"
      >
        <Plus class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Navigation with Teenage Engineering physical active switches -->
    <nav class="flex flex-col gap-1 pt-2">
      <button
        onclick={() => handleTabClick("chat")}
        class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer {currentTab ===
        'chat'
          ? 'carbon-tab-active font-bold'
          : 'text-[#5C6066] hover:text-[#191B1D] hover:bg-[#DEDBD2]'}"
      >
        <div class="flex items-center gap-2.5">
          <Terminal
            class="w-4 h-4 {currentTab === 'chat'
              ? 'text-[#FF5500]'
              : 'text-[#5C6066]'}"
          />
          <span>AI Coding Agent</span>
        </div>
      </button>

      <button
        onclick={() => handleTabClick("git")}
        class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer {currentTab ===
        'git'
          ? 'carbon-tab-active font-bold'
          : 'text-[#5C6066] hover:text-[#191B1D] hover:bg-[#DEDBD2]'}"
      >
        <div class="flex items-center gap-2.5">
          <GitBranch
            class="w-4 h-4 {currentTab === 'git'
              ? 'text-[#FF5500]'
              : 'text-[#5C6066]'}"
          />
          <span>Source Control</span>
        </div>
        {#if gitStatus?.files?.length}
          <span
            class="px-2 py-0.5 rounded-full bg-[#FF5500]/15 border border-[#FF5500]/30 text-[#FF5500] font-mono text-[10px] font-bold"
          >
            {gitStatus.files.length}
          </span>
        {/if}
      </button>

      <button
        onclick={() => handleTabClick("remote")}
        class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer {currentTab ===
        'remote'
          ? 'carbon-tab-active font-bold'
          : 'text-[#5C6066] hover:text-[#191B1D] hover:bg-[#DEDBD2]'}"
      >
        <div class="flex items-center gap-2.5">
          <TowerControl
            class="w-4 h-4 {currentTab === 'remote'
              ? 'text-[#FF5500]'
              : 'text-[#5C6066]'}"
          />
          <span>Remote Hub</span>
        </div>
        <div class="flex items-center gap-1.5">
          {#if whatsappStatus?.status === "connected"}
            <span
              class="w-2 h-2 rounded-full bg-emerald-500"
              title="WhatsApp Connected"
            ></span>
          {/if}
          {#if telegramStatus?.status === "running"}
            <span
              class="w-2 h-2 rounded-full bg-sky-500"
              title="Telegram Online"
            ></span>
          {/if}
        </div>
      </button>

      <button
        onclick={() => handleTabClick("files")}
        class="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer {currentTab ===
        'files'
          ? 'carbon-tab-active font-bold'
          : 'text-[#5C6066] hover:text-[#191B1D] hover:bg-[#DEDBD2]'}"
      >
        <div class="flex items-center gap-2.5">
          <FolderTree
            class="w-4 h-4 {currentTab === 'files'
              ? 'text-[#FF5500]'
              : 'text-[#5C6066]'}"
          />
          <span>Files & Logs</span>
        </div>
      </button>
    </nav>

    <!-- Riwayat Chat Section -->
    <div class="flex flex-col gap-1.5 pt-2.5 border-t border-[#C8C5BC]">
      <div class="flex items-center justify-between px-1">
        <div class="flex items-center gap-1.5">
          <MessageSquare class="w-3 h-3 text-[#FF5500]" />
          <span class="text-[11px] font-bold text-[#191B1D]"
            >Riwayat Chat</span
          >
        </div>

        <div class="flex items-center gap-1">
          <!-- Scope switcher: Project vs Global -->
          <div
            class="flex items-center bg-[#DEDBD2] rounded-lg p-0.5 border border-[#C8C5BC] text-[9px] font-mono"
          >
            <button
              type="button"
              onclick={() => onToggleScope?.("workspace")}
              class="px-1.5 py-0.5 rounded transition cursor-pointer {historyScope ===
              'workspace'
                ? 'bg-[#FCFCFA] text-[#FF5500] border border-[#C8C5BC] font-bold shadow-xs'
                : 'text-[#5C6066] hover:text-[#191B1D]'}"
              title="Chat khusus project ini"
            >
              Project
            </button>
            <button
              type="button"
              onclick={() => onToggleScope?.("global")}
              class="px-1.5 py-0.5 rounded transition cursor-pointer {historyScope ===
              'global'
                ? 'bg-[#FCFCFA] text-[#FF5500] border border-[#C8C5BC] font-bold shadow-xs'
                : 'text-[#5C6066] hover:text-[#191B1D]'}"
              title="Chat global"
            >
              Global
            </button>
          </div>

          <!-- New Chat Button -->
          <button
            type="button"
            onclick={() => onCreateNewSession?.()}
            class="p-1 rounded-md bg-[#DEDBD2] hover:bg-[#FCFCFA] border border-[#C8C5BC] hover:border-[#FF5500] text-[#5C6066] hover:text-[#FF5500] transition cursor-pointer"
            title="Mulai Chat Baru"
          >
            <Plus class="w-3 h-3" />
          </button>
        </div>
      </div>

      <!-- Scrollable list of sessions -->
      <div class="flex flex-col gap-1 max-h-48 overflow-y-auto pr-0.5 mt-0.5">
        {#if chatSessions && chatSessions.length > 0}
          {#each chatSessions as sess (sess.id)}
            {@const isActive = activeSessionId === sess.id}
            <div
              class="group/item flex items-center justify-between px-2 py-1.5 rounded-xl transition cursor-pointer {isActive
                ? 'bg-[#FCFCFA] border border-[#C8C5BC] text-[#191B1D] font-bold shadow-xs'
                : 'hover:bg-[#DEDBD2] border border-transparent text-[#5C6066] hover:text-[#191B1D]'}"
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
                <MessageSquare
                  class="w-3 h-3 {isActive
                    ? 'text-[#FF5500]'
                    : 'text-[#8C9097] group-hover/item:text-[#191B1D]'} shrink-0"
                />
                <span class="text-xs truncate flex-1">{sess.title}</span>
                {#if sess.message_count && sess.message_count > 0}
                  <span
                    class="text-[9px] px-1.5 py-0.2 rounded-full font-mono {isActive
                      ? 'bg-[#FF5500]/15 text-[#FF5500]'
                      : 'bg-[#DEDBD2] text-[#5C6066]'} shrink-0"
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
                class="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-rose-100 text-[#8C9097] hover:text-rose-600 transition cursor-pointer shrink-0 ml-1"
                title="Hapus sesi chat"
              >
                <Trash2 class="w-2.5 h-2.5" />
              </button>
            </div>
          {/each}
        {:else}
          <div
            class="p-3 text-center rounded-xl bg-[#FCFCFA] border border-dashed border-[#C8C5BC] flex flex-col items-center gap-1.5"
          >
            <span class="text-[11px] text-[#5C6066]">Belum ada riwayat chat</span
            >
            <button
              type="button"
              onclick={() => onCreateNewSession?.()}
              class="text-[10px] text-[#FF5500] hover:text-[#E64D00] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus class="w-2.5 h-2.5" /> Mulai Chat Baru
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Bottom: Tunnel status & Settings -->
  <div
    class="p-3 border-t border-[#C8C5BC] flex items-center justify-between bg-[#DEDBD2] text-xs"
  >
    <div class="flex items-center gap-1.5 text-[11px] font-mono text-[#5C6066]">
      <span
        class="w-2 h-2 rounded-full {tunnelStatus?.status === 'connected'
          ? 'bg-[#FF5500]'
          : 'bg-[#8C9097]'}"
      ></span>
      <span class="truncate max-w-[120px] font-semibold text-[#191B1D]">
        {tunnelStatus?.status === "connected" ? "Public Live" : "Local :3888"}
      </span>
    </div>

    <button
      onclick={onOpenSettingsModal}
      class="p-2 rounded-lg hover:bg-[#C8C5BC] text-[#5C6066] hover:text-[#191B1D] transition cursor-pointer"
      title="Pengaturan Sistem"
    >
      <SettingsIcon class="w-3.5 h-3.5" />
    </button>
  </div>
</aside>
