<script lang="ts">
  import { onMount } from "svelte";
  import type { ConnectorItem, ConnectorActionResult } from "../types";
  import { api } from "../services/api";
  import { dialog } from "../services/dialog.svelte";
  import {
    Blocks,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Play,
    Plus,
    Trash2,
    Settings,
    ExternalLink,
    Terminal,
    Copy,
    Check,
    Kanban,
    FileText,
    Mail,
    Calendar,
    Cpu,
    Sparkles,
    Shield,
    Clock,
    Activity,
    Sliders,
    X,
    LogIn,
    KeyRound,
    User
  } from "lucide-svelte";

  let connectors = $state<ConnectorItem[]>([]);
  let isLoading = $state(true);
  let testingId = $state<string | null>(null);
  let activeTabFilter = $state<"all" | "kanban" | "notion" | "gmail" | "calendar" | "mcp">("all");

  // Output Console Modal / Drawer
  let consoleOutput = $state<{
    isOpen: boolean;
    title: string;
    action: string;
    latencyMs?: number;
    rawJson: string;
    isError: boolean;
  }>({
    isOpen: false,
    title: "",
    action: "",
    rawJson: "",
    isError: false,
  });

  // Edit / Add Modal
  let editingConnector = $state<{
    isOpen: boolean;
    isNew: boolean;
    data: Partial<ConnectorItem>;
    email: string;
    loginPath: string;
  }>({
    isOpen: false,
    isNew: false,
    data: {},
    email: "",
    loginPath: "",
  });

  function parseSettings(jsonStr?: string): Record<string, any> {
    try {
      return jsonStr ? JSON.parse(jsonStr) : {};
    } catch {
      return {};
    }
  }

  function openLoginModal(conn: ConnectorItem) {
    const parsed = parseSettings(conn.settings_json);
    loginModal = {
      isOpen: true,
      connectorId: conn.id,
      email: parsed.email || parsed.username || "",
      password: "",
      loginPath: parsed.loginPath || "/api/auth/login",
    };
  }

  // Quick Action Modal (e.g. Create Kanban Task)
  let quickTaskModal = $state<{
    isOpen: boolean;
    connectorId: string;
    title: string;
    status: string;
    priority: string;
    description: string;
    assignee: string;
  }>({
    isOpen: false,
    connectorId: "",
    title: "",
    status: "Todo",
    priority: "medium",
    description: "",
    assignee: "Zhien",
  });

  // Account Login Modal (e.g. Sehati Desk Email & Password)
  let loginModal = $state<{
    isOpen: boolean;
    connectorId: string;
    email: string;
    password: string;
    loginPath: string;
  }>({
    isOpen: false,
    connectorId: "",
    email: "",
    password: "",
    loginPath: "/api/auth/login",
  });

  let copied = $state(false);

  onMount(async () => {
    await loadConnectors();
  });

  async function loadConnectors() {
    isLoading = true;
    try {
      const res = await api.getConnectors();
      if (res && res.connectors) {
        connectors = res.connectors;
      }
    } catch (err: any) {
      console.warn("Gagal memuat daftar connector:", err);
    } finally {
      isLoading = false;
    }
  }

  async function handleTest(connector: ConnectorItem) {
    testingId = connector.id;
    try {
      const res = await api.testConnector(connector.id);
      if (res.success) {
        dialog.showSuccess(res.result?.message || `Koneksi ke ${connector.name} berhasil!`);
        await loadConnectors();
      } else {
        dialog.showError(res.result?.message || res.error || `Koneksi ke ${connector.name} gagal.`);
        await loadConnectors();
      }
    } catch (err: any) {
      dialog.showError(`Error saat testing: ${err.message}`);
    } finally {
      testingId = null;
    }
  }

  async function handleToggleEnabled(connector: ConnectorItem) {
    try {
      const updated = !connector.is_enabled;
      await api.saveConnector({
        id: connector.id,
        name: connector.name,
        type: connector.type,
        is_enabled: updated,
      });
      connector.is_enabled = updated;
    } catch (err: any) {
      dialog.showError("Gagal memperbarui status connector: " + err.message);
    }
  }

  async function handleExecuteAction(connector: ConnectorItem, action: string, params: Record<string, any> = {}) {
    testingId = connector.id;
    try {
      const res: ConnectorActionResult = await api.executeConnectorAction(connector.id, action, params);
      consoleOutput = {
        isOpen: true,
        title: `${connector.name} :: ${action.toUpperCase()}`,
        action,
        latencyMs: res.latencyMs,
        rawJson: JSON.stringify(res.data || res.error, null, 2),
        isError: !res.success,
      };
      if (res.success) {
        await loadConnectors();
      }
    } catch (err: any) {
      consoleOutput = {
        isOpen: true,
        title: `${connector.name} :: ${action.toUpperCase()} ERROR`,
        action,
        rawJson: JSON.stringify({ error: err.message }, null, 2),
        isError: true,
      };
    } finally {
      testingId = null;
    }
  }

  function openEditModal(connector: ConnectorItem) {
    const parsed = parseSettings(connector.settings_json);
    editingConnector = {
      isOpen: true,
      isNew: false,
      data: { ...connector },
      email: parsed.email || parsed.username || "",
      loginPath: parsed.loginPath || (connector.type === "kanban" ? "/api/auth/login" : ""),
    };
  }

  function openNewModal() {
    editingConnector = {
      isOpen: true,
      isNew: true,
      data: {
        type: "kanban",
        name: "New Kanban Board",
        base_url: "https://sehatidesk.sehatierp.com",
        auth_type: "bearer",
        auth_token: "",
        settings_json: JSON.stringify({ apiPath: "/api/tasks", boardName: "Custom Board" }, null, 2),
        is_enabled: true,
      },
      email: "",
      loginPath: "/api/auth/login",
    };
  }

  async function handleSaveConnector() {
    const d = editingConnector.data;
    if (!d.name || !d.type) {
      dialog.showError("Nama dan Tipe Connector wajib diisi.");
      return;
    }

    try {
      const parsed = parseSettings(d.settings_json);
      if (editingConnector.email !== undefined) parsed.email = editingConnector.email;
      if (editingConnector.loginPath !== undefined) parsed.loginPath = editingConnector.loginPath;
      d.settings_json = JSON.stringify(parsed, null, 2);

      const res = await api.saveConnector(d);
      if (res.success) {
        editingConnector.isOpen = false;
        dialog.showSuccess("Konektor berhasil disimpan.");
        await loadConnectors();
      } else {
        dialog.showError(res.error || "Gagal menyimpan konektor.");
      }
    } catch (err: any) {
      dialog.showError(err.message);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Hapus konektor "${name}"?`)) return;
    try {
      const res = await api.deleteConnector(id);
      if (res.success) {
        dialog.showSuccess(`Konektor "${name}" telah dihapus.`);
        await loadConnectors();
      }
    } catch (err: any) {
      dialog.showError(err.message);
    }
  }

  async function handleCreateKanbanTask() {
    const { connectorId, title, status, priority, description, assignee } = quickTaskModal;
    if (!title) {
      dialog.showError("Judul task tidak boleh kosong.");
      return;
    }
    quickTaskModal.isOpen = false;
    const conn = connectors.find((c) => c.id === connectorId);
    if (!conn) return;

    await handleExecuteAction(conn, "create_task", {
      title,
      status,
      priority,
      description,
      assignee,
    });
  }

  async function handleLoginSubmit() {
    const { connectorId, email, password, loginPath } = loginModal;
    if (!email || !password) {
      dialog.showError("Email/Username dan Password wajib diisi.");
      return;
    }
    loginModal.isOpen = false;
    const conn = connectors.find((c) => c.id === connectorId);
    if (!conn) return;

    await handleExecuteAction(conn, "login", {
      email,
      password,
      loginPath,
    });
    await loadConnectors();
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  const filteredConnectors = $derived.by(() => {
    if (activeTabFilter === "all") return connectors;
    return connectors.filter((c) => c.type === activeTabFilter);
  });

  const onlineCount = $derived.by(() => {
    return connectors.filter((c) => c.is_enabled && c.last_status === "online").length;
  });
</script>

<div class="h-full flex flex-col bg-[#ECEAE5] text-[#191B1D] overflow-hidden select-none font-sans relative">
  <!-- Top Blueprint Header Banner -->
  <header class="bg-[#FCFCFA] border-b border-[#D0CEC7] px-4 py-3 shrink-0 flex items-center justify-between shadow-2xs">
    <div class="flex items-center gap-3">
      <!-- Registration Square & Viewfinder -->
      <div class="relative w-8 h-8 flex items-center justify-center bg-[#ECEAE5] border border-[#D0CEC7]">
        <span class="absolute -top-1 -left-1 w-2 h-2 bg-[#FF5500]"></span>
        <span class="absolute -bottom-1 -right-1 w-2 h-2 bg-[#191B1D]"></span>
        <Blocks class="w-4 h-4 text-[#FF5500]" />
      </div>

      <div class="flex flex-col">
        <div class="flex items-center gap-2">
          <h1 class="text-xs font-black tracking-wider uppercase font-tech text-[#111315]">
            MCV & MCP CONNECTORS HUB
          </h1>
          <span class="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-[#FF5500] text-white">
            BUS // MULTI-TOOL
          </span>
        </div>
        <span class="text-[10px] font-mono text-[#60646C]">
          :: KANBAN TASK • NOTION • GMAIL • CALENDAR • UNIVERSAL MCP
        </span>
      </div>
    </div>

    <!-- Right Controls: Status & Add Button -->
    <div class="flex items-center gap-2">
      <div class="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-[#ECEAE5] border border-[#D0CEC7] text-[10px] font-mono">
        <span class="text-[#60646C]">NODES:</span>
        <span class="font-bold text-[#111315]">{connectors.length} TOTAL</span>
        <span class="text-[#D0CEC7]">|</span>
        <span class="flex items-center gap-1 font-bold text-emerald-700">
          <span class="w-1.5 h-1.5 rounded-none bg-emerald-500 animate-pulse"></span>
          {onlineCount} ONLINE
        </span>
      </div>

      <button
        onclick={loadConnectors}
        disabled={isLoading}
        class="btn-hardware p-1.5 rounded-none text-[#5C6066] hover:text-[#111315] cursor-pointer"
        title="Refresh Status"
      >
        <RefreshCw class="w-3.5 h-3.5 {isLoading ? 'animate-spin text-[#FF5500]' : ''}" />
      </button>

      <button
        onclick={openNewModal}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-[#FF5500] hover:bg-[#E04B00] text-white text-xs font-tech font-bold uppercase tracking-wider transition shadow-2xs cursor-pointer active:scale-95"
      >
        <Plus class="w-3.5 h-3.5" />
        <span>TAMBAH KONEKTOR</span>
      </button>
    </div>
  </header>

  <!-- Filter Category Bar -->
  <div class="bg-[#E5E3DD] border-b border-[#D0CEC7] px-4 py-1.5 flex items-center justify-between shrink-0 overflow-x-auto text-[11px] font-tech font-bold">
    <div class="flex items-center gap-1">
      <span class="text-[9px] font-mono text-[#8C9097] mr-1">FILTER:</span>
      {#each [
        { id: "all", label: "SEMUA (ALL)", icon: Blocks },
        { id: "kanban", label: "SEHATI KANBAN", icon: Kanban },
        { id: "notion", label: "NOTION", icon: FileText },
        { id: "gmail", label: "GMAIL", icon: Mail },
        { id: "calendar", label: "CALENDAR", icon: Calendar },
        { id: "mcp", label: "MCP SERVER", icon: Cpu }
      ] as tab}
        <button
          onclick={() => (activeTabFilter = tab.id as any)}
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-none uppercase transition cursor-pointer {activeTabFilter === tab.id
            ? 'bg-[#FCFCFA] text-[#111315] border border-[#D0CEC7] shadow-2xs'
            : 'text-[#60646C] hover:text-[#111315] hover:bg-[#FCFCFA]/60 border border-transparent'}"
        >
          <tab.icon class="w-3 h-3 {activeTabFilter === tab.id ? 'text-[#FF5500]' : 'text-[#8C9097]'}" />
          <span>{tab.label}</span>
        </button>
      {/each}
    </div>

    <!-- Agent Automation Hint -->
    <div class="hidden lg:flex items-center gap-1.5 text-[10px] font-mono text-[#60646C]">
      <Sparkles class="w-3 h-3 text-[#FF5500]" />
      <span>AI Agent dapat memanggil aksi di bawah ini secara otonom via CLI</span>
    </div>
  </div>

  <!-- Main Grid Content (Drafting Seams) -->
  <div class="flex-1 overflow-y-auto p-4 md:p-6 bg-[#ECEAE5]">
    {#if isLoading && connectors.length === 0}
      <div class="h-64 flex flex-col items-center justify-center gap-3 text-[#60646C]">
        <RefreshCw class="w-6 h-6 animate-spin text-[#FF5500]" />
        <span class="text-xs font-mono">Memuat konfigurasi konektor...</span>
      </div>
    {:else if filteredConnectors.length === 0}
      <div class="h-64 flex flex-col items-center justify-center gap-2 border border-dashed border-[#D0CEC7] bg-[#FCFCFA]/40 p-6 text-center">
        <Blocks class="w-8 h-8 text-[#8C9097]" />
        <span class="text-xs font-tech font-bold text-[#111315] uppercase">TIDAK ADA KONEKTOR DITEMUKAN</span>
        <span class="text-[11px] font-mono text-[#60646C]">Klik "Tambah Konektor" untuk mendaftarkan endpoint atau integrasi baru.</span>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {#each filteredConnectors as conn (conn.id)}
          {@const settings = parseSettings(conn.settings_json)}
          <!-- Connector Card (Cyber-Industrial Chassis) -->
          <div
            class="bg-[#FCFCFA] border border-[#D0CEC7] hover:border-[#A8A59C] transition shadow-2xs flex flex-col relative group"
          >
            <!-- Viewfinder corner markings -->
            <span class="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#FF5500] pointer-events-none"></span>
            <span class="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#191B1D] pointer-events-none"></span>

            <!-- Card Header -->
            <div class="p-3.5 border-b border-[#D0CEC7] bg-[#F7F6F2] flex items-center justify-between">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-7 h-7 shrink-0 flex items-center justify-center bg-white border border-[#D0CEC7]">
                  {#if conn.type === "kanban"}
                    <Kanban class="w-4 h-4 text-emerald-600" />
                  {:else if conn.type === "notion"}
                    <FileText class="w-4 h-4 text-purple-600" />
                  {:else if conn.type === "gmail"}
                    <Mail class="w-4 h-4 text-rose-600" />
                  {:else if conn.type === "calendar"}
                    <Calendar class="w-4 h-4 text-blue-600" />
                  {:else}
                    <Cpu class="w-4 h-4 text-amber-600" />
                  {/if}
                </div>

                <div class="flex flex-col min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-black tracking-wide text-[#111315] uppercase font-tech truncate">
                      {conn.name}
                    </span>
                    <span class="px-1.5 py-0.2 text-[8px] font-mono uppercase bg-[#ECEAE5] border border-[#D0CEC7] text-[#60646C]">
                      {conn.type}
                    </span>
                  </div>
                  <span class="text-[9px] font-mono text-[#8C9097] truncate">ID: {conn.id}</span>
                </div>
              </div>

              <!-- Status Badge & Switch -->
              <div class="flex items-center gap-2 shrink-0">
                <button
                  onclick={() => handleToggleEnabled(conn)}
                  class="cursor-pointer text-[10px] font-mono font-bold px-1.5 py-0.5 border transition {conn.is_enabled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-zinc-100 text-zinc-500 border-zinc-300'}"
                  title="Toggle Enable/Disable"
                >
                  {conn.is_enabled ? "ENABLED" : "DISABLED"}
                </button>
              </div>
            </div>

            <!-- Card Body: Details & URL -->
            <div class="p-3.5 flex-1 flex flex-col gap-2.5 text-xs font-mono">
              <!-- Endpoint / Base URL -->
              <div class="flex flex-col gap-0.5">
                <span class="text-[9px] uppercase tracking-wider text-[#8C9097] font-tech font-bold">ENDPOINT // URL</span>
                <div class="flex items-center justify-between bg-[#ECEAE5] border border-[#D0CEC7] px-2 py-1 text-[11px] text-[#111315] truncate">
                  <span class="truncate">{conn.base_url || "N/A"}</span>
                  {#if conn.base_url?.startsWith("http")}
                    <a
                      href={conn.base_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-[#8C9097] hover:text-[#FF5500] shrink-0 ml-1"
                      title="Buka URL di tab baru"
                    >
                      <ExternalLink class="w-3 h-3" />
                    </a>
                  {/if}
                </div>
              </div>

              <!-- Account & Login Details (For Kanban & Authenticated Services) -->
              {#if conn.type === "kanban" || settings.email}
                <div class="p-2 bg-[#F7F6F2] border border-[#D0CEC7] flex flex-col gap-1 text-[10px]">
                  <div class="flex items-center justify-between">
                    <span class="text-[9px] text-[#8C9097] font-tech font-bold uppercase">AKUN TERHUBUNG</span>
                    {#if settings.email || settings.username}
                      <span class="flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2">
                        <User class="w-2.5 h-2.5 text-emerald-600" />
                        {settings.email || settings.username}
                      </span>
                    {:else}
                      <span class="text-amber-700 bg-amber-100 px-1.5 py-0.2">BELUM LOGIN</span>
                    {/if}
                  </div>
                  <div class="flex items-center justify-between text-[9px] text-[#60646C]">
                    <span>ENDPOINT LOGIN:</span>
                    <span class="font-mono text-[#111315]">{settings.loginPath || '/api/auth/login'}</span>
                  </div>
                </div>
              {/if}

              <!-- Auth Status & Security -->
              <div class="grid grid-cols-2 gap-2 text-[10px]">
                <div class="flex flex-col">
                  <span class="text-[9px] text-[#8C9097] font-tech font-bold uppercase">AUTH SCHEME</span>
                  <span class="font-bold uppercase text-[#111315]">{conn.auth_type}</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-[9px] text-[#8C9097] font-tech font-bold uppercase">KEY / TOKEN</span>
                  <span class="font-bold text-[#111315] flex items-center gap-1">
                    {#if conn.hasAuthToken || (conn.auth_token && conn.auth_token.length > 0)}
                      <Shield class="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>CONFIGURED</span>
                    {:else}
                      <span class="text-amber-600">NOT SET</span>
                    {/if}
                  </span>
                </div>
              </div>

              <!-- Live Ping Status & Latency -->
              <div class="p-2 bg-[#F7F6F2] border border-[#D0CEC7] flex items-center justify-between text-[10px]">
                <div class="flex items-center gap-1.5">
                  {#if conn.last_status === "online"}
                    <span class="w-2 h-2 rounded-none bg-emerald-500"></span>
                    <span class="font-bold text-emerald-700">● ONLINE</span>
                  {:else if conn.last_status === "error"}
                    <span class="w-2 h-2 rounded-none bg-rose-500"></span>
                    <span class="font-bold text-rose-700">▲ OFFLINE / ERR</span>
                  {:else}
                    <span class="w-2 h-2 rounded-none bg-zinc-400"></span>
                    <span class="font-bold text-[#60646C]">○ UNTESTED</span>
                  {/if}
                </div>
                {#if conn.last_tested_at}
                  <span class="text-[9px] text-[#8C9097]">
                    {new Date(conn.last_tested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                {/if}
              </div>

              <!-- Specific Quick Actions based on connector type -->
              <div class="pt-1 flex flex-col gap-1.5">
                <span class="text-[9px] uppercase tracking-wider text-[#8C9097] font-tech font-bold">OPERATIONAL ACTIONS</span>

                {#if conn.type === "kanban"}
                  <div class="grid grid-cols-3 gap-1">
                    <button
                      onclick={() => handleExecuteAction(conn, "get_tasks")}
                      disabled={testingId === conn.id}
                      class="btn-hardware py-1 px-1.5 text-[9px] font-mono text-center flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Play class="w-2.5 h-2.5 text-emerald-600" />
                      <span>Fetch</span>
                    </button>
                    <button
                      onclick={() => {
                        quickTaskModal = {
                          isOpen: true,
                          connectorId: conn.id,
                          title: "",
                          status: "Todo",
                          priority: "medium",
                          description: "",
                          assignee: "Zhien",
                        };
                      }}
                      class="btn-hardware py-1 px-1.5 text-[9px] font-mono text-center flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus class="w-2.5 h-2.5 text-[#FF5500]" />
                      <span>New Task</span>
                    </button>
                    <button
                      onclick={() => openLoginModal(conn)}
                      class="btn-hardware py-1 px-1.5 text-[9px] font-mono text-center flex items-center justify-center gap-1 cursor-pointer text-[#111315]"
                      title="Login dengan Akun Sehati Desk (Email/Password)"
                    >
                      <LogIn class="w-2.5 h-2.5 text-blue-600" />
                      <span>Login</span>
                    </button>
                  </div>
                {:else if conn.type === "notion"}
                  <div class="grid grid-cols-2 gap-1.5">
                    <button
                      onclick={() => handleExecuteAction(conn, "search", { query: "" })}
                      disabled={testingId === conn.id}
                      class="btn-hardware py-1 px-2 text-[10px] font-mono text-center flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Play class="w-2.5 h-2.5 text-purple-600" />
                      <span>Search Workspace</span>
                    </button>
                    <button
                      onclick={() => handleExecuteAction(conn, "create_page", { title: "Test Page zhiEnd", content: "Dibuat otomatis dari Connectors Hub" })}
                      disabled={testingId === conn.id}
                      class="btn-hardware py-1 px-2 text-[10px] font-mono text-center flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus class="w-2.5 h-2.5 text-[#FF5500]" />
                      <span>Create Page</span>
                    </button>
                  </div>
                {:else if conn.type === "gmail"}
                  <div class="grid grid-cols-2 gap-1.5">
                    <button
                      onclick={() => handleExecuteAction(conn, "search_emails", { query: "is:unread", maxResults: 5 })}
                      disabled={testingId === conn.id}
                      class="btn-hardware py-1 px-2 text-[10px] font-mono text-center flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Play class="w-2.5 h-2.5 text-rose-600" />
                      <span>Search Unread</span>
                    </button>
                    <button
                      onclick={() => handleExecuteAction(conn, "create_draft", { to: "test@example.com", subject: "Draft dari zhiEnd", body: "Halo dari zhiEnd Agent" })}
                      disabled={testingId === conn.id}
                      class="btn-hardware py-1 px-2 text-[10px] font-mono text-center flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus class="w-2.5 h-2.5 text-[#FF5500]" />
                      <span>New Draft</span>
                    </button>
                  </div>
                {:else if conn.type === "calendar"}
                  <div class="grid grid-cols-2 gap-1.5">
                    <button
                      onclick={() => handleExecuteAction(conn, "list_events", { maxResults: 5 })}
                      disabled={testingId === conn.id}
                      class="btn-hardware py-1 px-2 text-[10px] font-mono text-center flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Play class="w-2.5 h-2.5 text-blue-600" />
                      <span>List Events</span>
                    </button>
                    <button
                      onclick={() => handleExecuteAction(conn, "create_event", { summary: "Sprint Sync zhiEnd", start: new Date().toISOString(), end: new Date(Date.now() + 3600000).toISOString() })}
                      disabled={testingId === conn.id}
                      class="btn-hardware py-1 px-2 text-[10px] font-mono text-center flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus class="w-2.5 h-2.5 text-[#FF5500]" />
                      <span>Schedule Meeting</span>
                    </button>
                  </div>
                {:else}
                  <!-- Universal MCP -->
                  <div class="grid grid-cols-2 gap-1.5">
                    <button
                      onclick={() => handleExecuteAction(conn, "list_tools")}
                      disabled={testingId === conn.id}
                      class="btn-hardware py-1 px-2 text-[10px] font-mono text-center flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Play class="w-2.5 h-2.5 text-amber-600" />
                      <span>List Tools</span>
                    </button>
                    <button
                      onclick={() => handleExecuteAction(conn, "call_tool", { toolName: "read_file", arguments: { path: "package.json" } })}
                      disabled={testingId === conn.id}
                      class="btn-hardware py-1 px-2 text-[10px] font-mono text-center flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Terminal class="w-2.5 h-2.5 text-[#FF5500]" />
                      <span>Call Tool</span>
                    </button>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Card Footer: Test & Edit & Delete -->
            <div class="p-2.5 border-t border-[#D0CEC7] bg-[#F7F6F2] flex items-center justify-between text-xs font-mono">
              <button
                onclick={() => handleTest(conn)}
                disabled={testingId === conn.id}
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-none bg-white hover:bg-[#ECEAE5] border border-[#D0CEC7] font-bold text-[#111315] transition cursor-pointer active:scale-95"
              >
                <Activity class="w-3 h-3 {testingId === conn.id ? 'animate-spin text-[#FF5500]' : 'text-[#60646C]'}" />
                <span>{testingId === conn.id ? "TESTING..." : "TEST PING"}</span>
              </button>

              <div class="flex items-center gap-1">
                <button
                  onclick={() => openEditModal(conn)}
                  class="p-1 rounded-none hover:bg-white text-[#60646C] hover:text-[#111315] border border-transparent hover:border-[#D0CEC7] transition cursor-pointer"
                  title="Edit Konfigurasi"
                >
                  <Settings class="w-3.5 h-3.5" />
                </button>
                <button
                  onclick={() => handleDelete(conn.id, conn.name)}
                  class="p-1 rounded-none hover:bg-rose-50 text-[#8C9097] hover:text-rose-600 border border-transparent hover:border-rose-200 transition cursor-pointer"
                  title="Hapus Konektor"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Interactive JSON Output Console (CRT Style Modal) -->
  {#if consoleOutput.isOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div class="bg-[#101114] border-2 border-[#D0CEC7] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative">
        <!-- Top bar -->
        <div class="bg-[#191B1D] px-4 py-2.5 border-b border-[#2C2E33] flex items-center justify-between text-xs font-mono">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-none {consoleOutput.isError ? 'bg-rose-500' : 'bg-emerald-500'}"></span>
            <span class="font-bold text-white font-tech uppercase">{consoleOutput.title}</span>
            {#if consoleOutput.latencyMs !== undefined}
              <span class="text-[10px] text-zinc-400">({consoleOutput.latencyMs}ms)</span>
            {/if}
          </div>
          <div class="flex items-center gap-2">
            <button
              onclick={() => copyToClipboard(consoleOutput.rawJson)}
              class="px-2 py-0.5 rounded-none bg-[#2C2E33] hover:bg-[#383A40] text-zinc-300 text-[10px] flex items-center gap-1 transition cursor-pointer"
            >
              {#if copied}
                <Check class="w-3 h-3 text-emerald-400" />
                <span>COPIED</span>
              {:else}
                <Copy class="w-3 h-3" />
                <span>COPY JSON</span>
              {/if}
            </button>
            <button
              onclick={() => (consoleOutput.isOpen = false)}
              class="p-1 rounded-none text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Raw JSON Terminal Body -->
        <div class="p-4 overflow-y-auto flex-1 font-mono text-xs text-emerald-400 bg-[#0B0C0E] select-text">
          <pre class="whitespace-pre-wrap break-all leading-relaxed">{consoleOutput.rawJson}</pre>
        </div>

        <!-- Terminal Footer -->
        <div class="bg-[#191B1D] px-4 py-2 border-t border-[#2C2E33] flex items-center justify-between text-[10px] font-mono text-zinc-400">
          <span>STATUS: {consoleOutput.isError ? "ACTION FAILED" : "ACTION NOMINAL"}</span>
          <button
            onclick={() => (consoleOutput.isOpen = false)}
            class="px-3 py-1 bg-[#FF5500] hover:bg-[#E04B00] text-white font-tech uppercase font-bold cursor-pointer"
          >
            TUTUP CONSOLE
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Edit / Add Connector Modal -->
  {#if editingConnector.isOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-[#FCFCFA] border-2 border-[#D0CEC7] w-full max-w-lg shadow-2xl flex flex-col font-mono text-xs relative">
        <div class="p-3.5 bg-[#F7F6F2] border-b border-[#D0CEC7] flex items-center justify-between font-tech font-bold uppercase">
          <span class="text-sm text-[#111315]">
            {editingConnector.isNew ? "TAMBAH KONEKTOR BARU" : `EDIT // ${editingConnector.data.name}`}
          </span>
          <button
            onclick={() => (editingConnector.isOpen = false)}
            class="p-1 text-[#8C9097] hover:text-[#111315] cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="p-4 flex flex-col gap-3 overflow-y-auto max-h-[75vh]">
          <!-- Type & Name -->
          <div class="grid grid-cols-2 gap-3">
            <label class="flex flex-col gap-1">
              <span class="text-[10px] font-tech uppercase font-bold text-[#60646C]">Tipe Integrasi</span>
              <select
                bind:value={editingConnector.data.type}
                class="bg-white border border-[#D0CEC7] px-2 py-1.5 text-xs text-[#111315] rounded-none outline-none focus:border-[#FF5500]"
              >
                <option value="kanban">Sehati / Custom Kanban</option>
                <option value="notion">Notion Workspace</option>
                <option value="gmail">Gmail & Google Workspace</option>
                <option value="calendar">Google Calendar</option>
                <option value="mcp">Universal MCP Server (Stdio/SSE)</option>
                <option value="custom">Custom REST API</option>
              </select>
            </label>

            <label class="flex flex-col gap-1">
              <span class="text-[10px] font-tech uppercase font-bold text-[#60646C]">Nama Konektor</span>
              <input
                type="text"
                bind:value={editingConnector.data.name}
                placeholder="misal: Sehati Desk Kanban"
                class="bg-white border border-[#D0CEC7] px-2 py-1.5 text-xs text-[#111315] rounded-none outline-none focus:border-[#FF5500]"
              />
            </label>
          </div>

          <!-- Base URL -->
          <label class="flex flex-col gap-1">
            <span class="text-[10px] font-tech uppercase font-bold text-[#60646C]">Base URL / Endpoint</span>
            <input
              type="text"
              bind:value={editingConnector.data.base_url}
              placeholder="https://sehatidesk.sehatierp.com"
              class="bg-white border border-[#D0CEC7] px-2 py-1.5 text-xs text-[#111315] rounded-none outline-none focus:border-[#FF5500]"
            />
          </label>

          <!-- Account Email & Login Endpoint -->
          <div class="grid grid-cols-2 gap-3">
            <label class="flex flex-col gap-1">
              <span class="text-[10px] font-tech uppercase font-bold text-[#60646C]">Akun / Email Terhubung</span>
              <input
                type="text"
                bind:value={editingConnector.email}
                placeholder="user@sehatierp.com"
                class="bg-white border border-[#D0CEC7] px-2 py-1.5 text-xs text-[#111315] rounded-none outline-none focus:border-[#FF5500]"
              />
            </label>

            <label class="flex flex-col gap-1">
              <span class="text-[10px] font-tech uppercase font-bold text-[#60646C]">Endpoint Login</span>
              <input
                type="text"
                bind:value={editingConnector.loginPath}
                placeholder="/api/auth/login"
                class="bg-white border border-[#D0CEC7] px-2 py-1.5 text-xs text-[#111315] rounded-none outline-none focus:border-[#FF5500]"
              />
            </label>
          </div>

          <!-- Auth Type & Token -->
          <div class="grid grid-cols-2 gap-3">
            <label class="flex flex-col gap-1">
              <span class="text-[10px] font-tech uppercase font-bold text-[#60646C]">Auth Scheme</span>
              <select
                bind:value={editingConnector.data.auth_type}
                class="bg-white border border-[#D0CEC7] px-2 py-1.5 text-xs text-[#111315] rounded-none outline-none focus:border-[#FF5500]"
              >
                <option value="bearer">Bearer Token (JWT / PAT)</option>
                <option value="cookie">Cookie Session (Browser)</option>
                <option value="session">Auto-Login (Email & Password)</option>
                <option value="api_key">X-API-Key</option>
                <option value="basic">Basic Auth</option>
                <option value="oauth2">OAuth2 Token</option>
                <option value="none">None / Public</option>
              </select>
            </label>

            <label class="flex flex-col gap-1">
              <span class="text-[10px] font-tech uppercase font-bold text-[#60646C]">Auth Secret / Bearer Token</span>
              <input
                type="password"
                bind:value={editingConnector.data.auth_token}
                placeholder={editingConnector.data.hasAuthToken ? "•••••••• (Tersimpan)" : "Masukkan Bearer token (JWT)"}
                class="bg-white border border-[#D0CEC7] px-2 py-1.5 text-xs text-[#111315] rounded-none outline-none focus:border-[#FF5500]"
              />
            </label>
          </div>

          <!-- Settings JSON -->
          <label class="flex flex-col gap-1">
            <span class="text-[10px] font-tech uppercase font-bold text-[#60646C]">Custom Settings (JSON)</span>
            <textarea
              bind:value={editingConnector.data.settings_json}
              rows="4"
              class="bg-white border border-[#D0CEC7] p-2 text-xs font-mono text-[#111315] rounded-none outline-none focus:border-[#FF5500]"
            ></textarea>
          </label>
        </div>

        <div class="p-3.5 bg-[#F7F6F2] border-t border-[#D0CEC7] flex items-center justify-end gap-2 font-tech font-bold uppercase">
          <button
            onclick={() => (editingConnector.isOpen = false)}
            class="px-3 py-1.5 bg-white border border-[#D0CEC7] hover:bg-[#ECEAE5] text-[#111315] cursor-pointer"
          >
            BATAL
          </button>
          <button
            onclick={handleSaveConnector}
            class="px-4 py-1.5 bg-[#FF5500] hover:bg-[#E04B00] text-white cursor-pointer shadow-2xs"
          >
            SIMPAN KONEKTOR
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Quick Kanban Task Creation Modal -->
  {#if quickTaskModal.isOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-[#FCFCFA] border-2 border-[#D0CEC7] w-full max-w-md shadow-2xl flex flex-col font-mono text-xs">
        <div class="p-3.5 bg-[#F7F6F2] border-b border-[#D0CEC7] flex items-center justify-between font-tech font-bold uppercase">
          <span class="text-sm text-[#111315]">BUAT KANBAN TASK BARU</span>
          <button
            onclick={() => (quickTaskModal.isOpen = false)}
            class="p-1 text-[#8C9097] hover:text-[#111315] cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="p-4 flex flex-col gap-3">
          <label class="flex flex-col gap-1">
            <span class="text-[10px] font-tech uppercase font-bold text-[#60646C]">Judul Task</span>
            <input
              type="text"
              bind:value={quickTaskModal.title}
              placeholder="misal: Integrasi CRM Webhook Sehati"
              class="bg-white border border-[#D0CEC7] px-2 py-1.5 text-xs text-[#111315] rounded-none outline-none focus:border-[#FF5500]"
            />
          </label>

          <div class="grid grid-cols-2 gap-3">
            <label class="flex flex-col gap-1">
              <span class="text-[10px] font-tech uppercase font-bold text-[#60646C]">Status Kolom</span>
              <select
                bind:value={quickTaskModal.status}
                class="bg-white border border-[#D0CEC7] px-2 py-1.5 text-xs text-[#111315] rounded-none outline-none focus:border-[#FF5500]"
              >
                <option value="Todo">Todo</option>
                <option value="In Progress">In Progress</option>
                <option value="Testing">Testing</option>
                <option value="Done">Done</option>
              </select>
            </label>

            <label class="flex flex-col gap-1">
              <span class="text-[10px] font-tech uppercase font-bold text-[#60646C]">Prioritas</span>
              <select
                bind:value={quickTaskModal.priority}
                class="bg-white border border-[#D0CEC7] px-2 py-1.5 text-xs text-[#111315] rounded-none outline-none focus:border-[#FF5500]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
          </div>

          <label class="flex flex-col gap-1">
            <span class="text-[10px] font-tech uppercase font-bold text-[#60646C]">Assignee</span>
            <input
              type="text"
              bind:value={quickTaskModal.assignee}
              placeholder="Zhien"
              class="bg-white border border-[#D0CEC7] px-2 py-1.5 text-xs text-[#111315] rounded-none outline-none focus:border-[#FF5500]"
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-[10px] font-tech uppercase font-bold text-[#60646C]">Deskripsi Task</span>
            <textarea
              bind:value={quickTaskModal.description}
              rows="3"
              placeholder="Detail instruksi atau catatan pengerjaan..."
              class="bg-white border border-[#D0CEC7] p-2 text-xs font-mono text-[#111315] rounded-none outline-none focus:border-[#FF5500]"
            ></textarea>
          </label>
        </div>

        <div class="p-3.5 bg-[#F7F6F2] border-t border-[#D0CEC7] flex items-center justify-end gap-2 font-tech font-bold uppercase">
          <button
            onclick={() => (quickTaskModal.isOpen = false)}
            class="px-3 py-1.5 bg-white border border-[#D0CEC7] hover:bg-[#ECEAE5] text-[#111315] cursor-pointer"
          >
            BATAL
          </button>
          <button
            onclick={handleCreateKanbanTask}
            class="px-4 py-1.5 bg-[#FF5500] hover:bg-[#E04B00] text-white cursor-pointer shadow-2xs"
          >
            DISPATCH TASK
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Account Login Modal (Sehati Desk / ERP Credentials) -->
  {#if loginModal.isOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-[#FCFCFA] border-2 border-[#D0CEC7] w-full max-w-md shadow-2xl flex flex-col font-mono text-xs">
        <div class="p-3.5 bg-[#F7F6F2] border-b border-[#D0CEC7] flex items-center justify-between font-tech font-bold uppercase">
          <div class="flex items-center gap-2">
            <KeyRound class="w-4 h-4 text-blue-600" />
            <span class="text-sm text-[#111315]">LOGIN AKUN SEHATI DESK</span>
          </div>
          <button
            onclick={() => (loginModal.isOpen = false)}
            class="p-1 text-[#8C9097] hover:text-[#111315] cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="p-4 flex flex-col gap-3">
          <div class="p-2.5 bg-blue-50 border border-blue-200 text-[10px] text-blue-800 leading-relaxed font-sans">
            Masukkan Email & Password akun Sehati Desk Anda. Sistem akan melakukan otentikasi ke server Sehati dan menyimpan session token secara aman di SQLite lokal.
          </div>

          <label class="flex flex-col gap-1">
            <span class="text-[10px] font-tech uppercase font-bold text-[#60646C]">Email / Username</span>
            <input
              type="text"
              bind:value={loginModal.email}
              placeholder="user@sehatierp.com"
              class="bg-white border border-[#D0CEC7] px-2 py-1.5 text-xs text-[#111315] rounded-none outline-none focus:border-[#FF5500]"
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-[10px] font-tech uppercase font-bold text-[#60646C]">Password</span>
            <input
              type="password"
              bind:value={loginModal.password}
              placeholder="••••••••"
              class="bg-white border border-[#D0CEC7] px-2 py-1.5 text-xs text-[#111315] rounded-none outline-none focus:border-[#FF5500]"
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-[10px] font-tech uppercase font-bold text-[#60646C]">Endpoint Login (Opsional)</span>
            <input
              type="text"
              bind:value={loginModal.loginPath}
              placeholder="/api/auth/login"
              class="bg-white border border-[#D0CEC7] px-2 py-1.5 text-xs text-[#111315] rounded-none outline-none focus:border-[#FF5500]"
            />
          </label>
        </div>

        <div class="p-3.5 bg-[#F7F6F2] border-t border-[#D0CEC7] flex items-center justify-end gap-2 font-tech font-bold uppercase">
          <button
            onclick={() => (loginModal.isOpen = false)}
            class="px-3 py-1.5 bg-white border border-[#D0CEC7] hover:bg-[#ECEAE5] text-[#111315] cursor-pointer"
          >
            BATAL
          </button>
          <button
            onclick={handleLoginSubmit}
            class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs font-bold flex items-center gap-1.5"
          >
            <LogIn class="w-3.5 h-3.5" />
            <span>MASUKKAN KREDENSIAL // LOGIN</span>
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
