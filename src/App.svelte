<script lang="ts">
  import { onMount, tick } from "svelte";
  import { io, Socket } from "socket.io-client";
  import type {
    AppConfig,
    GitStatus,
    CommitInfo,
    TunnelStatus,
    TelegramStatus,
    WhatsAppStatus,
    ChatMessage,
    FileItem,
    ChatSessionItem,
    PersonaItem,
  } from "./types";
  import { api, PIN_STORAGE_KEY } from "./services/api";

  import Sidebar from "./components/Sidebar.svelte";
  import ChatView from "./components/ChatView.svelte";
  import GitView from "./components/GitView.svelte";
  import RemoteView from "./components/RemoteView.svelte";
  import FileLogsView from "./components/FileLogsView.svelte";
  import ConnectorsView from "./components/ConnectorsView.svelte";
  import SettingsModal from "./components/SettingsModal.svelte";
  import ProjectModal from "./components/ProjectModal.svelte";
  import PushModal from "./components/PushModal.svelte";
  import PinModal from "./components/PinModal.svelte";
  import ConfirmModal from "./components/ConfirmModal.svelte";
  import NoticeModal from "./components/NoticeModal.svelte";
  import PersonaModal from "./components/PersonaModal.svelte";
  import { dialog } from "./services/dialog.svelte";
  import { notificationService } from "./services/notificationService";

  import {
    UploadCloud,
    GitBranch,
    Play,
    Square,
    ExternalLink,
    MessageSquare,
    Send,
    Menu,
    Terminal,
    TowerControl,
    FolderTree,
    Blocks,
    Sun,
    Moon,
    Bell,
    BellOff,
    PanelLeftClose,
    PanelLeftOpen,
  } from "lucide-svelte";

  // Navigation tab
  let currentTab = $state<"chat" | "git" | "remote" | "files" | "connectors">("chat");
  let isMobileSidebarOpen = $state(false);

  // Compact Sidebar toggle state with localStorage persistence
  let isSidebarCompact = $state(
    localStorage.getItem("zhiend_sidebar_compact") === "true",
  );

  function handleToggleSidebarCompact() {
    isSidebarCompact = !isSidebarCompact;
    localStorage.setItem(
      "zhiend_sidebar_compact",
      isSidebarCompact ? "true" : "false",
    );
  }

  // Theme management (Dark Mode with Circular Radial Transition)
  let isDark = $state(false);

  function applyThemeMode(dark: boolean) {
    isDark = dark;
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("zhiend_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("zhiend_theme", "light");
    }
  }

  async function handleToggleTheme(e: MouseEvent) {
    const targetIsDark = !isDark;
    const x = e.clientX || window.innerWidth / 2;
    const y = e.clientY || 40;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Fallback if View Transitions API is not supported
    if (!(document as any).startViewTransition) {
      applyThemeMode(targetIsDark);
      return;
    }

    const transitionClass = targetIsDark
      ? "theme-transition-to-dark"
      : "theme-transition-to-light";
    document.documentElement.classList.add(transitionClass);

    const transition = (document as any).startViewTransition(async () => {
      applyThemeMode(targetIsDark);
      await tick();
    });

    try {
      await transition.ready;
      if (targetIsDark) {
        // Expanding circular mask outward until full screen
        const anim = document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 520,
            easing: "cubic-bezier(0.25, 1, 0.5, 1)",
            pseudoElement: "::view-transition-new(root)",
          }
        );
        await anim.finished;
      } else {
        // Shrinking circular mask inward down to toggle button
        const anim = document.documentElement.animate(
          {
            clipPath: [
              `circle(${endRadius}px at ${x}px ${y}px)`,
              `circle(0px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 520,
            easing: "cubic-bezier(0.25, 1, 0.5, 1)",
            pseudoElement: "::view-transition-old(root)",
          }
        );
        await anim.finished;
      }
    } catch (err) {
      console.warn("Theme transition error:", err);
    } finally {
      document.documentElement.classList.remove(transitionClass);
    }
  }

  // Background Sound & Desktop Notification Alert State
  let isSoundEnabled = $state(notificationService.soundEnabled);

  async function handleToggleSound() {
    isSoundEnabled = !isSoundEnabled;
    notificationService.setSoundEnabled(isSoundEnabled);
    if (isSoundEnabled) {
      await notificationService.requestDesktopPermission();
      notificationService.playChime("success");
      dialog.showSuccess("Notifikasi suara & alert background aktif.");
    } else {
      dialog.showWarning("Notifikasi suara dinonaktifkan.");
    }
  }

  // Application Data States
  let config = $state<AppConfig | null>(null);
  let gitStatus = $state<GitStatus | null>(null);
  let commits = $state<CommitInfo[]>([]);
  let tunnelStatus = $state<TunnelStatus | null>(null);
  let telegramStatus = $state<TelegramStatus | null>(null);
  let whatsappStatus = $state<WhatsAppStatus | null>(null);
  let projectFiles = $state<FileItem[]>([]);
  let systemLogs = $state<string[]>(["[System] zhiEnd Agent ready."]);

  // Dev Server Quick State
  let devServer = $state<{
    isRunning: boolean;
    activePorts: { port: number; url: string }[];
  }>({ isRunning: false, activePorts: [] });
  let isStartingDev = $state(false);

  // Chat States & Database Sessions
  let messages = $state<ChatMessage[]>([]);
  let isAgentBusy = $state(false);
  let chatSessions = $state<ChatSessionItem[]>([]);
  let activeSessionId = $state<string | null>(null);
  let historyScope = $state<"workspace" | "global">("workspace");

  // Personas
  let personas = $state<PersonaItem[]>([]);
  let isPersonaModalOpen = $state(false);

  let activeSession = $derived.by(() => {
    return chatSessions.find((s) => s.id === activeSessionId) || null;
  });

  let activePersona = $derived.by(() => {
    const curr = chatSessions.find((s) => s.id === activeSessionId);
    if (curr?.persona_id) {
      return personas.find((p) => p.id === curr.persona_id) || null;
    }
    return personas.find((p) => p.is_default) || personas[0] || null;
  });

  // Modals
  let isSettingsOpen = $state(false);
  let settingsInitialTab = $state<
    | "general"
    | "antigravity"
    | "ai_providers"
    | "telegram"
    | "whatsapp"
    | "tunnel"
    | "voice"
  >("general");
  let isProjectModalOpen = $state(false);
  let isPinModalOpen = $state(false);
  let isPushModalOpen = $state(false);
  let isPulling = $state(false);
  let pushStatus = $state<"idle" | "running" | "success" | "error">("idle");
  let pushLogs = $state("");

  // Reusable Confirmation Modal State
  let confirmDialog = $state<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "primary";
    action: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Lanjutkan",
    cancelText: "Batal",
    variant: "danger",
    action: () => {},
  });

  function showConfirm(options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "primary";
    action: () => void | Promise<void>;
  }) {
    confirmDialog = {
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || "Lanjutkan",
      cancelText: options.cancelText || "Batal",
      variant: options.variant || "danger",
      action: options.action,
    };
  }

  async function handleConfirmDialog() {
    confirmDialog.isOpen = false;
    await confirmDialog.action();
  }

  let socket: Socket | null = null;

  onMount(async () => {
    // 0. Initialize Theme
    const savedTheme = localStorage.getItem("zhiend_theme");
    if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      applyThemeMode(true);
    } else {
      applyThemeMode(false);
    }

    // 1. PIN Auth check
    let needsAuth = false;
    try {
      const authStatus = await api.getAuthStatus();
      if (authStatus?.hasPin) {
        const savedPin = localStorage.getItem(PIN_STORAGE_KEY);
        if (!savedPin) {
          needsAuth = true;
          isPinModalOpen = true;
        } else {
          const verifyRes = await api.verifyPin(savedPin);
          if (!verifyRes?.authorized) {
            needsAuth = true;
            isPinModalOpen = true;
          }
        }
      }
    } catch (e) {
      console.warn("Auth check error:", e);
    }

    // 2. Fetch Initial State only if authorized
    if (!needsAuth) {
      await refreshAll();
    }

    // 3. Connect Socket.io
    initSocket();

    // 4. Background dev server poll fallback
    const devInterval = setInterval(() => {
      checkDevServer();
    }, 4000);

    return () => {
      clearInterval(devInterval);
      if (socket) socket.disconnect();
    };
  });

  async function refreshAll() {
    // 1. Fetch Core State First (Personas, Config, Chat Sessions)
    try {
      const pRes = await api.getPersonas();
      if (pRes?.personas && Array.isArray(pRes.personas) && pRes.personas.length > 0) {
        personas = pRes.personas;
      }
    } catch (e) {
      console.warn("Failed to load personas:", e);
    }

    try {
      config = await api.getConfig();
    } catch (e) {
      console.warn("Failed to load config:", e);
    }

    try {
      await loadSessions(false);
    } catch (e) {
      console.warn("Failed to load sessions:", e);
    }

    // 2. Fetch Auxiliary States in parallel (independent so none can block personas/sessions)
    try {
      const [gitRes, commitRes, tunnelRes, tgRes, waRes, filesRes] = await Promise.allSettled([
        api.getGitStatus(),
        api.getRecentCommits(),
        api.getNetworkInfo(),
        api.getTelegramStatus(),
        api.getWhatsAppStatus(),
        api.getProjectFiles(),
      ]);

      if (gitRes.status === "fulfilled" && gitRes.value) gitStatus = gitRes.value;
      if (commitRes.status === "fulfilled" && commitRes.value?.commits) commits = commitRes.value.commits;
      if (tunnelRes.status === "fulfilled" && tunnelRes.value) tunnelStatus = tunnelRes.value;
      if (tgRes.status === "fulfilled" && tgRes.value) telegramStatus = tgRes.value;
      if (waRes.status === "fulfilled" && waRes.value) whatsappStatus = waRes.value;
      if (filesRes.status === "fulfilled" && filesRes.value?.files) projectFiles = filesRes.value.files;
    } catch (e) {
      console.warn("Auxiliary state error:", e);
    }

    checkDevServer();
  }

  async function handleSelectPersona(persona: PersonaItem) {
    if (!activeSessionId) return;
    try {
      await api.updateChatSessionPersona(activeSessionId, persona.id);
      chatSessions = chatSessions.map((s) =>
        s.id === activeSessionId ? { ...s, persona_id: persona.id } : s,
      );
      addLog(`[Persona Aktif] ${persona.avatar} ${persona.name} diterapkan.`);
    } catch (e) {
      console.error("Failed to update session persona:", e);
    }
  }

  async function handleCreatePersona(data: {
    name: string;
    avatar: string;
    traits?: string;
    system_prompt: string;
    preferred_model?: string;
  }) {
    const res = await api.createPersona(data);
    if (res.persona) {
      personas = [...personas, res.persona];
      if (activeSessionId) {
        await handleSelectPersona(res.persona);
      }
      addLog(`[Persona Dibuat] ${res.persona.name}`);
    }
  }

  async function handleUpdatePersona(id: string, data: Partial<PersonaItem>) {
    try {
      const res = await api.updatePersona(id, data);
      if (res?.success) {
        if (res.persona) {
          personas = personas.map((p) => (p.id === id ? res.persona : p));
        } else {
          const pRes = await api.getPersonas();
          if (pRes?.personas) {
            personas = pRes.personas;
          } else {
            personas = personas.map((p) =>
              p.id === id ? { ...p, ...data } : p,
            );
          }
        }
        addLog(`[Persona Diperbarui] ${data.name || "Persona"}`);
      }
    } catch (e) {
      console.error("Failed to update persona:", e);
    }
  }

  async function handleUpdateBotPersona(
    platform: "telegram" | "whatsapp",
    personaId: string,
  ) {
    try {
      await api.setBotPersona(platform, personaId);
      if (config) {
        if (platform === "whatsapp") {
          if (!config.whatsapp)
            config.whatsapp = { enabled: false, allowedNumbers: [], personaId };
          config.whatsapp.personaId = personaId;
        } else {
          if (!config.telegram)
            config.telegram = {
              enabled: false,
              botToken: "",
              allowedUsers: [],
              personaId,
            };
          config.telegram.personaId = personaId;
        }
      }
      const p = personas.find((item) => item.id === personaId);
      addLog(
        `[Remote ${platform.toUpperCase()}] Persona diubah ke ${p?.avatar || "⚡"} ${p?.name || personaId}`,
      );
    } catch (e: any) {
      dialog.showError("Gagal mengubah persona bot: " + (e.message || "Error"));
    }
  }

  async function handleDeletePersona(id: string) {
    showConfirm({
      title: "Hapus Persona Ini?",
      message: "Persona custom ini akan dihapus permanen dari sistem.",
      confirmText: "Hapus",
      variant: "danger",
      action: async () => {
        try {
          await api.deletePersona(id);
          personas = personas.filter((p) => p.id !== id);
          if (activeSession?.persona_id === id) {
            const def = personas.find((p) => p.is_default) || personas[0];
            if (def && activeSessionId) await handleSelectPersona(def);
          }
          addLog("[Persona Dihapus]");
        } catch (e) {
          console.error("Failed to delete persona:", e);
        }
      },
    });
  }

  async function loadSessions(selectFirst = false) {
    try {
      const isGlobal = historyScope === "global";
      const wsParam = isGlobal ? undefined : config?.activeProject;
      const res = await api.getChatSessions(wsParam, isGlobal);
      chatSessions = res.sessions || [];

      if (!activeSessionId) {
        if (chatSessions.length > 0) {
          await handleSelectSession(chatSessions[0]);
        } else {
          await handleCreateNewSession(false);
        }
      } else if (selectFirst) {
        if (chatSessions.length > 0) {
          await handleSelectSession(chatSessions[0]);
        } else {
          await handleCreateNewSession(false);
        }
      } else {
        await loadSessionMessages(activeSessionId);
      }
    } catch (e) {
      console.error("Failed to load chat sessions:", e);
    }
  }

  async function handleSelectSession(session: ChatSessionItem) {
    activeSessionId = session.id;
    await loadSessionMessages(session.id, true);
  }

  async function loadSessionMessages(sessionId: string, forceReset = false) {
    try {
      const res = await api.getChatMessages(sessionId);
      if (res.messages && res.messages.length > 0) {
        const session = chatSessions.find((s) => s.id === sessionId);
        messages = res.messages.map((m: any) => {
          const effectivePersonaId = m.persona_id || session?.persona_id || 'persona-default';
          const matchedPersona = (effectivePersonaId && personas.find((p) => p.id === effectivePersonaId)) || personas.find((p) => p.is_default) || personas[0];
          return {
            id: m.id,
            sender: m.sender,
            text: m.text,
            timestamp: new Date(m.created_at).getTime(),
            tools: [],
            steps: m.steps || [],
            thought: m.thought || "",
            images: m.images || [],
            isStreaming: false,
            persona_id: effectivePersonaId,
            persona_name: matchedPersona?.name || 'ZHIEND CORE',
            persona_avatar: matchedPersona?.avatar || '🤖',
            persona_traits: matchedPersona?.traits || null,
            model_used: m.model_used || null,
          };
        });
      } else if (forceReset) {
        messages = [];
      }
    } catch (e) {
      console.error("Failed to load session messages:", e);
    }
  }

  async function handleCreateNewSession(switchTab = true) {
    try {
      const isGlobal = historyScope === "global";
      const projName = config?.activeProject
        ? config.activeProject.split(/[\\/]/).pop() || "Project"
        : "Diskusi Baru";
      const title = isGlobal ? "Diskusi Global" : `Sesi ${projName}`;
      const res = await api.createChatSession({
        title,
        workspace_id: isGlobal ? null : config?.activeProject,
      });
      if (res.session) {
        chatSessions = [res.session, ...chatSessions];
        activeSessionId = res.session.id;
        messages = [];
        if (switchTab) currentTab = "chat";
      }
    } catch (e) {
      console.error("Failed to create new session:", e);
    }
  }

  function handleDeleteSession(id: string) {
    showConfirm({
      title: "Hapus Sesi Diskusi?",
      message:
        "Sesi ini dan semua pesannya akan dihapus secara permanen dari database.",
      confirmText: "Hapus Sesi",
      variant: "danger",
      action: async () => {
        try {
          await api.deleteChatSession(id);
          chatSessions = chatSessions.filter((s) => s.id !== id);
          if (activeSessionId === id) {
            if (chatSessions.length > 0) {
              await handleSelectSession(chatSessions[0]);
            } else {
              await handleCreateNewSession(false);
            }
          }
        } catch (e) {
          console.error("Failed to delete chat session:", e);
        }
      },
    });
  }

  function handleClearCurrentSessionMessages() {
    if (!activeSessionId) return;
    showConfirm({
      title: "Bersihkan Percakapan?",
      message:
        "Semua pesan dan riwayat aktivitas dalam sesi ini akan dibersihkan. Tindakan ini tidak dapat dibatalkan.",
      confirmText: "Ya, Bersihkan",
      variant: "danger",
      action: async () => {
        try {
          await api.clearChatMessages(activeSessionId);
          messages = [];
          await loadSessions(false);
          addLog("[Chat Cleared] Pesan dalam sesi dibersihkan.");
        } catch (e) {
          console.error("Failed to clear session messages:", e);
        }
      },
    });
  }

  async function handleToggleScope(scope: "workspace" | "global") {
    historyScope = scope;
    await loadSessions(true);
  }

  async function checkDevServer() {
    try {
      devServer = await api.getDevServerStatus();
    } catch {}
  }

  async function handleToggleDevServer() {
    if (devServer.isRunning) {
      await api.stopDevServer();
      addLog("[Dev Server] Dihentikan.");
      setTimeout(checkDevServer, 1000);
    } else {
      isStartingDev = true;
      const res = await api.startDevServer();
      addLog(`[Dev Server] ${res.message || "Memulai dev server..."}`);
      let attempts = 0;
      const pollTimer = setInterval(async () => {
        attempts++;
        await checkDevServer();
        if (devServer.isRunning || attempts >= 10) {
          clearInterval(pollTimer);
          isStartingDev = false;
        }
      }, 1500);
    }
  }

  function addLog(msg: string) {
    const time = new Date().toLocaleTimeString();
    systemLogs = [...systemLogs, `[${time}] ${msg}`];
  }

  function initSocket() {
    socket = io({
      extraHeaders: {
        "Bypass-Tunnel-Reminder": "true"
      },
      transports: ["polling", "websocket"]
    });

    socket.on("connect", () => {
      addLog("Socket connected to backend.");
    });

    socket.on("disconnect", () => {
      addLog("Socket disconnected.");
    });

    socket.on("agent_task_start", (data) => {
      if (data?.isUtility) return;
      isAgentBusy = true;
      notificationService.notifyTaskStart();
      const srcLabel = data.source && data.source !== "web" ? ` [${data.source.toUpperCase()}]` : "";
      addLog(`[Task Started${srcLabel}] ${data.prompt.slice(0, 60)}...`);

      // Option 1: Isolate remote session from interfering with currently active browser chat session
      if (data.sessionId && activeSessionId && data.sessionId !== activeSessionId) {
        loadSessions(false);
        return;
      }

      const currentPersona = data.personaId 
        ? personas.find((p) => p.id === data.personaId) 
        : activePersona;
      messages = [
        ...messages,
        {
          id: data.taskId,
          sender: "agent",
          text: "",
          timestamp: Date.now(),
          tools: [],
          steps: [],
          thought: "",
          isStreaming: true,
          persona_id: currentPersona?.id || null,
          persona_name: currentPersona?.name || null,
          persona_avatar: currentPersona?.avatar || null,
          persona_traits: currentPersona?.traits || null,
          model_used: data.model || currentPersona?.preferred_model || null,
        },
      ];
    });

    socket.on("agent_delta", (data) => {
      if (data?.isUtility) return;
      if (data.sessionId && activeSessionId && data.sessionId !== activeSessionId) {
        return;
      }
      if (!messages.length) return;
      const last = messages[messages.length - 1];
      if (last.sender === "agent") {
        last.text = data.accumulated || last.text + data.delta;
        messages = [...messages];
      }
    });

    socket.on("agent_step", (data) => {
      if (data?.isUtility) return;
      if (data.sessionId && activeSessionId && data.sessionId !== activeSessionId) {
        return;
      }
      const toolLabel = data.toolDesc || data.toolName;
      if (messages.length) {
        const last = messages[messages.length - 1];
        if (last.sender === "agent") {
          if (toolLabel && !last.tools?.includes(toolLabel)) {
            last.tools = [...(last.tools || []), toolLabel];
          }
          if (data.processStep) {
            last.steps = last.steps || [];
            const existingIdx = last.steps.findIndex(
              (s) => s.id === data.processStep.id,
            );
            if (existingIdx !== -1) {
              last.steps[existingIdx] = {
                ...last.steps[existingIdx],
                ...data.processStep,
              };
            } else {
              // Consecutive duplicate check (e.g. repeated polling manage_task or identical commands)
              const prevStep = last.steps[last.steps.length - 1];
              const isConsecutiveDuplicate =
                prevStep &&
                prevStep.title === data.processStep.title &&
                (prevStep.command === data.processStep.command ||
                  prevStep.detail === data.processStep.detail);

              if (isConsecutiveDuplicate) {
                prevStep.repeatCount = (prevStep.repeatCount || 1) + 1;
                prevStep.timestamp = data.processStep.timestamp;
                prevStep.detail = data.processStep.detail;
              } else {
                last.steps = [...last.steps, data.processStep];
              }
            }
          }
          if (data.thought) {
            last.thought = data.thought;
          }
          messages = [...messages];
        }
        if (toolLabel) {
          addLog(`[Tool] ${toolLabel} (${data.state || "RUN"})`);
        }
      }
    });

    socket.on("agent_raw", (data) => {
      if (data.sessionId && activeSessionId && data.sessionId !== activeSessionId) {
        return;
      }
      if (messages.length && data.text) {
        const last = messages[messages.length - 1];
        if (last.sender === "agent" && !last.text) {
          last.text = data.text;
          messages = [...messages];
        }
      }
    });

    socket.on("agent_task_end", (data) => {
      if (data?.isUtility) return;
      isAgentBusy = false;
      addLog(`[Task Completed] Status: ${data.status} in ${data.duration}`);
      notificationService.notifyTaskComplete({
        prompt: data.prompt,
        summary: data.response
      });
      api.getGitStatus().then((st) => (gitStatus = st));
      setTimeout(() => loadSessions(false), 500);

      // If finished task belongs to isolated remote session, do not modify currently active messages
      if (data.sessionId && activeSessionId && data.sessionId !== activeSessionId) {
        return;
      }

      if (messages.length) {
        const last = messages[messages.length - 1];
        if (last.sender === "agent") {
          last.text = data.response || last.text || "Tugas selesai dijalankan.";
          if (data.toolsExecuted && data.toolsExecuted.length > 0) {
            last.tools = data.toolsExecuted;
          }
          if (data.steps && data.steps.length > 0) {
            last.steps = data.steps;
          }
          if (data.thought) {
            last.thought = data.thought;
          }
          if (data.personaId) {
            last.persona_id = data.personaId;
            const matched = personas.find((p) => p.id === data.personaId);
            if (matched) {
              last.persona_name = matched.name;
              last.persona_avatar = matched.avatar;
              last.persona_traits = matched.traits;
            }
          }
          if (data.model) {
            last.model_used = data.model;
          }
          last.isStreaming = false;
          messages = [...messages];
        }
      }
    });

    socket.on("agent_task_cancelled", () => {
      isAgentBusy = false;
      notificationService.resetTitle();
      addLog("[Task Cancelled]");
      if (messages.length) {
        const last = messages[messages.length - 1];
        if (last.sender === "agent") {
          last.text += "\n🛑 Tugas dibatalkan oleh pengguna.";
          last.isStreaming = false;
          messages = [...messages];
        }
      }
    });

    socket.on("whatsapp_qr", (data) => {
      const url = data.qrCodeDataUrl || data.qrDataUrl;
      whatsappStatus = {
        ...(whatsappStatus || { status: "qr_ready", user: null, error: null }),
        status: "qr_ready",
        qrCodeDataUrl: url,
      };
    });

    socket.on("whatsapp_status", (data) => {
      whatsappStatus = {
        ...data,
        qrCodeDataUrl:
          data.qrCodeDataUrl ||
          data.qrDataUrl ||
          (data.status === "qr_ready" ? whatsappStatus?.qrCodeDataUrl : null) ||
          null,
      };
    });

    socket.on("telegram_status", (data) => {
      telegramStatus = data;
    });

    socket.on(
      "bot_log",
      (data: {
        platform: string;
        type: string;
        sender?: string;
        text?: string;
      }) => {
        const icon = data.type === "inbound" ? "📩" : "📤";
        const dir = data.type === "inbound" ? "Dari" : "Kirim ke";
        const senderPreview = data.sender
          ? String(data.sender).replace(/@.*$/, "")
          : "";
        addLog(
          `[${data.platform?.toUpperCase() || "BOT"} ${icon}] ${dir} ${senderPreview}: "${data.text?.slice(0, 120) || ""}"`,
        );
      },
    );

    socket.on("tunnel_status", (data) => {
      if (tunnelStatus) {
        tunnelStatus.status = data.status;
        if (data.url) tunnelStatus.publicUrl = data.url;
      }
    });

    socket.on("dev_server_status", (data) => {
      if (data && typeof data.isRunning === "boolean") {
        devServer = data;
      }
    });

    socket.on("project_changed", async (data) => {
      if (config) config.activeProject = data.activeProject;
      addLog(`[Project Switched] ${data.activeProject}`);
      gitStatus = await api.getGitStatus();
      projectFiles = (await api.getProjectFiles()).files || [];
      await loadSessions(true);
    });
  }

  async function handleSendMessage(text: string, images?: string[]) {
    const hasText = text && text.trim();
    const hasImages = images && images.length > 0;
    if ((!hasText && !hasImages) || isAgentBusy) return;

    if (!activeSessionId) {
      await handleCreateNewSession(false);
    }

    const displayText = hasText
      ? text
      : hasImages
        ? "Tolong analisis gambar terlampir ini."
        : "";

    messages = [
      ...messages,
      {
        id: "usr_" + Date.now(),
        sender: "user",
        text: displayText,
        images: images && images.length > 0 ? images : undefined,
        timestamp: Date.now(),
      },
    ];

    isAgentBusy = true;
    try {
      await api.sendChat(
        displayText,
        config?.antigravity?.defaultModel,
        undefined,
        activeSessionId || undefined,
        images,
        activePersona?.id,
      );
    } catch (e: any) {
      isAgentBusy = false;
      messages = [
        ...messages,
        {
          id: "err_" + Date.now(),
          sender: "agent",
          text: `⚠️ Gagal: ${e.message}`,
          timestamp: Date.now(),
        },
      ];
    }
  }

  async function handleEditLastMessage(newText: string) {
    if (isAgentBusy || !newText.trim() || !activeSessionId) return;

    // Cari index pesan user terakhir
    const lastUserIdx = messages.map(m => m.sender).lastIndexOf('user');
    if (lastUserIdx === -1) return;

    const originalImages = messages[lastUserIdx].images;
    const messagesToDelete = messages.slice(lastUserIdx).map(m => m.id).filter(Boolean);

    // Hapus pesan user terakhir dan pesan agen setelahnya dari UI seketika
    messages = messages.slice(0, lastUserIdx);

    // Hapus juga dari database SQLite agar tidak muncul kembali saat task selesai & di-reload
    try {
      await api.rollbackLastUserMessage(activeSessionId, messagesToDelete);
    } catch (err) {
      console.error('Failed to rollback message in database:', err);
    }

    // Kirim ulang dengan prompt yang baru
    await handleSendMessage(newText, originalImages);
  }

  async function handleExecutePush() {
    isPushModalOpen = true;
    pushStatus = "running";
    pushLogs = "Menjalankan: git push origin...\n";

    try {
      const res = await api.push();
      pushLogs +=
        (res.stdout || "") +
        "\n" +
        (res.stderr || "") +
        "\n" +
        (res.error || "");
      if (res.success) {
        pushStatus = "success";
        gitStatus = await api.getGitStatus();
        commits = (await api.getRecentCommits()).commits || [];
      } else {
        pushStatus = "error";
      }
    } catch (e: any) {
      pushStatus = "error";
      pushLogs += "\nError: " + e.message;
    }
  }

  async function handleResetToRoot() {
    await api.resetToRoot();
    await refreshAll();
    addLog("[Workspace Reset] Kembali ke Root D:\\Works.");
  }

  async function handlePinSubmit(pin: string): Promise<boolean> {
    const res = await api.verifyPin(pin);
    if (res.authorized) {
      localStorage.setItem(PIN_STORAGE_KEY, pin);
      isPinModalOpen = false;
      await refreshAll();
      return true;
    }
    return false;
  }
</script>

<div
  class="relative flex h-screen w-screen overflow-hidden bg-[#ECEAE5] text-[#111315] antialiased selection:bg-[#FF5500] selection:text-white"
>
  <!-- Industrial Blueprint CAD Ground Background -->
  <div
    class="fixed inset-0 pointer-events-none overflow-hidden z-0 blueprint-cad-ground opacity-90"
  ></div>

  <!-- Minimalist Clean Sidebar -->
  <Sidebar
    {currentTab}
    {config}
    {gitStatus}
    {telegramStatus}
    {whatsappStatus}
    {tunnelStatus}
    {isAgentBusy}
    {chatSessions}
    {activeSessionId}
    {historyScope}
    {isDark}
    onToggleTheme={handleToggleTheme}
    {isSoundEnabled}
    onToggleSound={handleToggleSound}
    isCompact={isSidebarCompact}
    onToggleCompact={handleToggleSidebarCompact}
    isMobileOpen={isMobileSidebarOpen}
    onCloseMobile={() => (isMobileSidebarOpen = false)}
    onSelectTab={(tab) => {
      currentTab = tab;
      isMobileSidebarOpen = false;
      if (tab === "files") {
        api.getProjectFiles().then((res) => {
          if (res?.files) projectFiles = res.files;
        });
      }
    }}
    onOpenProjectModal={() => {
      isProjectModalOpen = true;
      isMobileSidebarOpen = false;
    }}
    onOpenSettingsModal={() => {
      settingsInitialTab = "general";
      isSettingsOpen = true;
      isMobileSidebarOpen = false;
    }}
    onResetToRoot={handleResetToRoot}
    onSelectSession={handleSelectSession}
    onCreateNewSession={() => handleCreateNewSession(true)}
    onDeleteSession={handleDeleteSession}
    onToggleScope={handleToggleScope}
  />

  <!-- Main Content Workspace Area -->
  <div
    class="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent"
  >
    <!-- Top Blueprint Drafting Header -->
    <header
      class="min-h-[48px] sm:h-12 px-3 sm:px-4 bg-[#ECEAE5] border-b border-[#D0CEC7] flex items-center justify-between shrink-0 select-none gap-2 z-10 font-tech"
    >
      <div
        class="flex items-center gap-1.5 sm:gap-2.5 text-xs text-[#5C6066] min-w-0"
      >
        <!-- Drafting Crosshair Mark with Interactive Rotation -->
        <div
          class="hidden sm:inline-flex crosshair-box w-6 h-6 shrink-0 transition-transform duration-300 hover:rotate-45 cursor-crosshair"
          title="Drafting Reticle"
        ></div>

        <!-- Desktop Sidebar Compact Toggle -->
        <button
          type="button"
          onclick={handleToggleSidebarCompact}
          class="hidden md:flex p-1.5 rounded-none text-[#5C6066] hover:text-[#111315] hover:bg-[#D0CEC7]/40 border border-transparent hover:border-[#D0CEC7] transition cursor-pointer"
          title={isSidebarCompact ? "Perluas Sidebar (Expand)" : "Persempit Sidebar (Compact Mode)"}
          aria-label="Toggle Sidebar Compact Mode"
        >
          {#if isSidebarCompact}
            <PanelLeftOpen class="w-4 h-4 text-[#FF5500]" />
          {:else}
            <PanelLeftClose class="w-4 h-4" />
          {/if}
        </button>

        <!-- Mobile Sidebar Hamburger Toggle -->
        <button
          type="button"
          onclick={() => (isMobileSidebarOpen = true)}
          class="md:hidden p-1.5 rounded-none text-[#5C6066] hover:text-[#111315] hover:bg-black/[0.05] transition cursor-pointer shrink-0"
          title="Buka Menu Sidebar"
          aria-label="Buka Menu Sidebar"
        >
          <Menu class="w-4 h-4 text-[#FF5500]" />
        </button>

        <span
          class="text-[#111315] font-bold tracking-wider hidden sm:inline uppercase"
          >zhiEnd</span
        >
        <span class="text-[#D0CEC7] hidden sm:inline">/</span>
        {#if !config?.activeProject || config.activeProject
            .replace(/\\/g, "/")
            .toLowerCase() === "d:/works"}
          <span
            class="text-[#FF5500] font-bold flex items-center gap-1.5 truncate text-[11px] sm:text-xs"
          >
            <span class="w-2 h-2 bg-[#FF5500] shrink-0"></span>
            <span class="truncate">D:\Works (Root)</span>
          </span>
        {:else}
          <span
            class="text-[#111315] truncate max-w-[100px] xs:max-w-[140px] sm:max-w-xs text-[11px] sm:text-xs font-bold"
            >{config?.activeProject?.split(/\\|\//).pop()}</span
          >
          <button
            onclick={handleResetToRoot}
            class="px-1.5 sm:px-2 py-0.5 rounded-none bg-[#E5E3DD] hover:bg-rose-100 text-[9px] sm:text-[10px] text-[#5C6066] hover:text-rose-600 border border-[#D0CEC7] transition cursor-pointer shrink-0 font-stencil"
            title="Clear Workspace (Reset ke Root D:\Works)"
          >
            Clear
          </button>
        {/if}
        {#if gitStatus?.isRepo}
          <span class="text-[#D0CEC7] hidden md:inline">/</span>
          <span
            class="hidden md:flex items-center gap-1 text-[#60646C] truncate font-stencil text-[11px]"
          >
            <GitBranch class="w-3 h-3 text-[#FF5500]" />
            {gitStatus.branch}
          </span>
        {/if}
      </div>

      <!-- Center Blueprint Telemetry Marker & Reactive Equalizer Activity Meter -->
      <div
        class="hidden lg:flex items-center gap-2.5 text-[10px] font-stencil text-[#8C9097] px-2.5 py-1 rounded-none bg-[#FCFCFA] border border-[#D0CEC7] shadow-2xs group hover:border-[#A8A59C] transition-colors"
        title="Bus Activity Telemetry & Audio/Runtime Meter"
      >
        <span class="text-[#FF5500] font-bold">::</span>
        <span>BUS: NOMINAL</span>
        <span class="text-[#D0CEC7]">|</span>
        
        <!-- Interactive 4-Bar Hardware Activity Equalizer -->
        <div class="flex items-end gap-0.5 h-3.5 w-6 pb-0.5" aria-label="Runtime Telemetry Equalizer">
          <span class="w-1 bg-emerald-500 rounded-none transition-all duration-300 {isAgentBusy ? 'h-3 animate-bounce' : 'h-1.5 group-hover:h-2.5'}"></span>
          <span class="w-1 bg-emerald-500 rounded-none transition-all duration-300 {isAgentBusy ? 'h-2 animate-pulse' : 'h-2.5 group-hover:h-3'}"></span>
          <span class="w-1 bg-[#FFAA00] rounded-none transition-all duration-300 {isAgentBusy ? 'h-3 animate-ping' : 'h-1 group-hover:h-2'}"></span>
          <span class="w-1 bg-[#FF5500] rounded-none transition-all duration-300 {isAgentBusy ? 'h-3.5 animate-bounce' : 'h-2 group-hover:h-1'}"></span>
        </div>
        
        <span class="text-[#5C6066]">0x3888</span>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <!-- Quick Dev Server Widget -->
        {#if devServer.isRunning}
          <div
            class="h-8 flex items-center gap-1.5 px-2.5 rounded-none bg-emerald-50 border border-emerald-300 font-stencil"
          >
            <span class="w-2 h-2 rounded-none bg-emerald-500 animate-pulse"></span>
            <a
              href={devServer.activePorts[0]?.url || "http://localhost:3000"}
              target="_blank"
              class="text-xs text-emerald-800 hover:text-emerald-950 flex items-center gap-1 font-semibold"
              title="Buka Aplikasi di Browser"
            >
              <span>{devServer.activePorts[0]?.port || 3000}</span>
              <ExternalLink class="w-3 h-3 text-emerald-600" />
            </a>
            <button
              onclick={handleToggleDevServer}
              class="p-0.5 ml-0.5 rounded-none hover:bg-rose-100 text-rose-600 transition cursor-pointer"
              title="Hentikan Dev Server"
            >
              <Square class="w-3 h-3 fill-rose-600" />
            </button>
          </div>
        {:else}
          <button
            onclick={handleToggleDevServer}
            disabled={isStartingDev}
            class="h-8 flex items-center gap-1.5 px-3 rounded-none bg-[#FCFCFA] hover:bg-[#E5E3DD] border border-[#D0CEC7] text-[#111315] text-xs font-tech font-bold uppercase transition cursor-pointer active:scale-95 disabled:opacity-50"
            title="Jalankan Dev Server Project Aktif"
          >
            <Play class="w-3 h-3 text-emerald-600 fill-emerald-600" />
            <span class="hidden sm:inline"
              >{isStartingDev ? "MEMULAI..." : "DEV SERVER"}</span
            >
            <span class="sm:hidden">{isStartingDev ? "..." : "DEV"}</span>
          </button>
        {/if}

        <!-- Flat Safety Push Action Button (100% Sharp 90° Frame) -->
        <button
          onclick={handleExecutePush}
          class="btn-safety h-8 px-4 rounded-none text-white font-tech font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer active:scale-[0.97] shadow-none"
          title="Git Push to GitHub"
        >
          <UploadCloud class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">PUSH // GIT</span>
          <span class="sm:hidden">PUSH</span>
        </button>
      </div>
    </header>

    <!-- Main Viewport Area -->
    <main
      class="flex-1 overflow-hidden p-0 min-h-0 flex flex-col relative blueprint-cad-ground bg-[#ECEAE5]"
    >
      {#if currentTab === "chat"}
        <ChatView
          {messages}
          isBusy={isAgentBusy}
          {config}
          {activeSession}
          {activePersona}
          {personas}
          onSendMessage={handleSendMessage}
          onEditLastMessage={handleEditLastMessage}
          onCancelTask={async () => {
            await api.cancelTask();
          }}
          onClearMessages={handleClearCurrentSessionMessages}
          onCreateNewSession={() => handleCreateNewSession(true)}
          onOpenPersonaModal={() => (isPersonaModalOpen = true)}
        />
      {:else if currentTab === "git"}
        <GitView
          {gitStatus}
          {commits}
          onRefresh={async () => (gitStatus = await api.getGitStatus())}
          onStageFiles={async (files) => {
            await api.stageFiles(files);
            gitStatus = await api.getGitStatus();
          }}
          onUnstageFiles={async (files) => {
            await api.unstageFiles(files);
            gitStatus = await api.getGitStatus();
          }}
          onCommit={async (msg) => {
            const res = await api.commit(msg);
            if (res.success) {
              gitStatus = await api.getGitStatus();
              commits = (await api.getRecentCommits()).commits || [];
              dialog.showSuccess("Perubahan berhasil di-commit.");
              return true;
            } else {
              dialog.showError(
                "Commit gagal: " + (res.error || "Unknown error"),
              );
              return false;
            }
          }}
          onPush={handleExecutePush}
          {isPulling}
          onPull={async () => {
            if (isPulling) return;
            isPulling = true;
            try {
              const res = await api.pull();
              if (res.success) {
                dialog.showSuccess(
                  "Git Pull Sukses:\n" + (res.stdout || "Up to date"),
                );
              } else {
                dialog.showError("Git Pull Gagal:\n" + (res.error || res.stderr));
              }
              gitStatus = await api.getGitStatus();
              commits = (await api.getRecentCommits()).commits || [];
            } catch (err: any) {
              dialog.showError("Git Pull Gagal:\n" + err.message);
            } finally {
              isPulling = false;
            }
          }}
          onGenerateAiCommit={async () => {
            const res = await api.generateAiCommit();
            return res.message;
          }}
          onLoadDiff={async (file, staged) => {
            const res = await api.getGitDiff(file, staged);
            return res.diff;
          }}
        />
      {:else if currentTab === "remote"}
        <RemoteView
          {whatsappStatus}
          {telegramStatus}
          {tunnelStatus}
          {config}
          {personas}
          onUpdateBotPersona={handleUpdateBotPersona}
          onStartWhatsApp={async () => {
            await api.startWhatsApp();
            whatsappStatus = await api.getWhatsAppStatus();
          }}
          onLogoutWhatsApp={() => {
            showConfirm({
              title: "Putuskan WhatsApp?",
              message:
                "Sesi bot WhatsApp akan diputuskan. Anda perlu scan ulang kode QR untuk menghubungkan kembali.",
              confirmText: "Putuskan",
              variant: "danger",
              action: async () => {
                await api.logoutWhatsApp();
                whatsappStatus = await api.getWhatsAppStatus();
              },
            });
          }}
          onSaveWhatsAppNumbers={async (numbers) => {
            await api.updateConfig({
              whatsapp: { allowedNumbers: numbers },
            } as any);
            dialog.showSuccess(
              "Nomor WhatsApp yang diizinkan berhasil disimpan.",
            );
          }}
          onStartTelegram={async (token) => {
            const res = await api.startTelegram(token);
            if (!res.success)
              dialog.showError(
                "Gagal menghubungkan Telegram: " +
                  (res.error || "Token tidak valid"),
              );
            telegramStatus = await api.getTelegramStatus();
          }}
          onStopTelegram={async () => {
            await api.stopTelegram();
            telegramStatus = await api.getTelegramStatus();
          }}
          onSaveTelegramToken={async (token, allowedUsers) => {
            await api.updateConfig({
              telegram: { botToken: token, allowedUsers },
            } as any);
            dialog.showSuccess("Pengaturan Telegram berhasil disimpan.");
          }}
          onStartTunnel={async (subdomain) => {
            const res = await api.startTunnel(subdomain);
            if (!res.success)
              dialog.showError("Gagal memulai tunnel: " + res.error);
            tunnelStatus = await api.getNetworkInfo();
          }}
          onStopTunnel={async () => {
            await api.stopTunnel();
            tunnelStatus = await api.getNetworkInfo();
          }}
          onSaveSecurityPin={async (pin) => {
            await api.updateConfig({ securityPin: pin });
            localStorage.setItem(PIN_STORAGE_KEY, pin);
            dialog.showSuccess("Security PIN berhasil disimpan.");
          }}
        />
      {:else if currentTab === "files"}
        <FileLogsView
          files={projectFiles}
          logs={systemLogs}
          onRefreshFiles={async () =>
            (projectFiles = (await api.getProjectFiles()).files || [])}
          onClearLogs={() => (systemLogs = [])}
        />
      {:else if currentTab === "connectors"}
        <ConnectorsView />
      {/if}
    </main>

    <!-- Bottom Navigation Bar for Mobile (< md) -->
    <nav
      class="md:hidden h-14 bg-[#E9E7E0] border-t border-[#C8C5BC] flex items-center justify-around px-2 z-20 shrink-0 select-none"
    >
      <button
        onclick={() => (currentTab = "chat")}
        class="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 transition cursor-pointer {currentTab ===
        'chat'
          ? 'text-[#FF5500] font-bold'
          : 'text-[#5C6066] hover:text-[#191B1D]'}"
      >
        <Terminal
          class="w-4 h-4 {currentTab === 'chat'
            ? 'text-[#FF5500]'
            : 'text-[#5C6066]'}"
        />
        <span class="text-[10px]">Coding</span>
      </button>

      <button
        onclick={() => (currentTab = "git")}
        class="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 transition cursor-pointer relative {currentTab ===
        'git'
          ? 'text-[#FF5500] font-bold'
          : 'text-[#5C6066] hover:text-[#191B1D]'}"
      >
        <GitBranch
          class="w-4 h-4 {currentTab === 'git'
            ? 'text-[#FF5500]'
            : 'text-[#5C6066]'}"
        />
        <span class="text-[10px]">Source</span>
        {#if gitStatus?.files?.length}
          <span
            class="absolute top-1.5 right-[30%] w-2 h-2 rounded-none bg-[#FF5500]"
          ></span>
        {/if}
      </button>

      <button
        onclick={() => (currentTab = "remote")}
        class="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 transition cursor-pointer relative {currentTab ===
        'remote'
          ? 'text-[#FF5500] font-bold'
          : 'text-[#5C6066] hover:text-[#191B1D]'}"
      >
        <TowerControl
          class="w-4 h-4 {currentTab === 'remote'
            ? 'text-[#FF5500]'
            : 'text-[#5C6066]'}"
        />
        <span class="text-[10px]">Remote</span>
        {#if whatsappStatus?.status === "connected" || telegramStatus?.status === "running"}
          <span
            class="absolute top-1.5 right-[30%] w-1.5 h-1.5 rounded-none bg-emerald-500 animate-pulse"
          ></span>
        {/if}
      </button>

      <button
        onclick={() => (currentTab = "files")}
        class="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 transition cursor-pointer {currentTab ===
        'files'
          ? 'text-[#FF5500] font-bold'
          : 'text-[#5C6066] hover:text-[#191B1D]'}"
      >
        <FolderTree
          class="w-4 h-4 {currentTab === 'files'
            ? 'text-[#FF5500]'
            : 'text-[#5C6066]'}"
        />
        <span class="text-[10px]">Files</span>
      </button>

      <button
        onclick={() => (currentTab = "connectors")}
        class="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 transition cursor-pointer {currentTab ===
        'connectors'
          ? 'text-[#FF5500] font-bold'
          : 'text-[#5C6066] hover:text-[#191B1D]'}"
      >
        <Blocks
          class="w-4 h-4 {currentTab === 'connectors'
            ? 'text-[#FF5500]'
            : 'text-[#5C6066]'}"
        />
        <span class="text-[10px]">Connectors</span>
      </button>
    </nav>
  </div>

  <!-- Modals -->
  <SettingsModal
    {config}
    {personas}
    isOpen={isSettingsOpen}
    initialTab={settingsInitialTab}
    onClose={() => (isSettingsOpen = false)}
    onSave={async (updates) => {
      const res = await api.updateConfig(updates);
      if (res.success) {
        config = res.config;
        addLog("Pengaturan berhasil diperbarui.");
        return true;
      }
      return false;
    }}
  />

  <ProjectModal
    isOpen={isProjectModalOpen}
    recentProjects={config?.recentProjects || []}
    activeProjectPath={config?.activeProject}
    onClose={() => (isProjectModalOpen = false)}
    onSelectProject={async (path) => {
      const res = await api.selectProject(path);
      if (res.success) {
        await refreshAll();
        return true;
      } else {
        dialog.showError(
          "Gagal membuka project: " + (res.error || "Path tidak valid"),
        );
        return false;
      }
    }}
  />

  <PushModal
    isOpen={isPushModalOpen}
    isPushing={pushStatus === "running"}
    status={pushStatus}
    outputLogs={pushLogs}
    onClose={() => (isPushModalOpen = false)}
  />

  <PinModal isOpen={isPinModalOpen} onSubmit={handlePinSubmit} />

  <PersonaModal
    isOpen={isPersonaModalOpen}
    {personas}
    activePersonaId={activeSession?.persona_id}
    onSelectPersona={handleSelectPersona}
    onCreatePersona={handleCreatePersona}
    onUpdatePersona={handleUpdatePersona}
    onDeletePersona={handleDeletePersona}
    onClose={() => (isPersonaModalOpen = false)}
    onOpenSettings={(tab) => {
      isPersonaModalOpen = false;
      settingsInitialTab = (tab as any) || "ai_providers";
      isSettingsOpen = true;
    }}
  />

  <ConfirmModal
    isOpen={confirmDialog.isOpen}
    title={confirmDialog.title}
    message={confirmDialog.message}
    confirmText={confirmDialog.confirmText}
    cancelText={confirmDialog.cancelText}
    variant={confirmDialog.variant}
    onConfirm={handleConfirmDialog}
    onCancel={() => (confirmDialog.isOpen = false)}
  />

  <NoticeModal />
</div>
