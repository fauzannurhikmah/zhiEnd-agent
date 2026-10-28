<script lang="ts">
  import type { PersonaItem } from "../types";
  import AvatarView from "./AvatarView.svelte";
  import { api } from "../services/api";
  import {
    X,
    Sparkles,
    Plus,
    Check,
    Trash2,
    Bot,
    Upload,
    Film,
    Image as ImageIcon,
    Smile,
    RefreshCw,
    Loader2,
    Pencil,
    Save,
    ChevronDown,
    Key,
    AlertTriangle,
    CheckCircle2,
    Cpu
  } from "lucide-svelte";

  let {
    isOpen,
    personas = [],
    activePersonaId = null,
    onSelectPersona,
    onCreatePersona,
    onUpdatePersona,
    onDeletePersona,
    onClose,
    onOpenSettings
  }: {
    isOpen: boolean;
    personas: PersonaItem[];
    activePersonaId?: string | null;
    onSelectPersona: (p: PersonaItem) => void;
    onCreatePersona: (data: {
      name: string;
      avatar: string;
      traits?: string;
      system_prompt: string;
      preferred_model?: string;
    }) => Promise<void>;
    onUpdatePersona?: (
      id: string,
      data: {
        name: string;
        avatar: string;
        traits?: string;
        system_prompt: string;
        preferred_model?: string;
      }
    ) => Promise<void>;
    onDeletePersona: (id: string) => Promise<void>;
    onClose: () => void;
    onOpenSettings?: (tab?: string) => void;
  } = $props();

  let activeTab = $state<"list" | "create">("list");
  let editingPersonaId = $state<string | null>(null);

  // Form states
  let newName = $state("");
  let newAvatar = $state("🤖");
  let newTraits = $state("");
  let newSystemPrompt = $state("");
  let newPreferredModel = $state("gemini-3.8-flash-high");
  let isSubmitting = $state(false);
  let isGeneratingPrompt = $state(false);
  let formError = $state("");
  let avatarType = $state<"emoji" | "custom">("emoji");
  let fileInputRef = $state<HTMLInputElement | null>(null);
  let isUploadingAvatar = $state(false);

  // AI Models state & dropdown
  let availableModels = $state<Array<{ id: string; name: string; provider: string; description?: string; hasKey?: boolean }>>([]);
  let isModelDropdownOpen = $state(false);
  let currentModelInfo = $derived(getModelDetails(newPreferredModel));

  const emojiList = [
    "🤖",
    "⚡",
    "🔍",
    "🛠️",
    "🚀",
    "🧠",
    "🛡️",
    "🎨",
    "🧪",
    "💡",
    "💻",
    "🎯",
    "👨‍💻",
    "📐",
    "🧙‍♂️",
    "👾",
  ];

  const traitSuggestions = [
    "Kritis & Perfeksionis",
    "Santai & Ramah",
    "Lugas & To the point",
    "Didaktis & Suka Menjelaskan",
    "Solutif & Cepat",
    "Pragmatis & Efisien",
  ];

  const templates = [
    {
      title: "Senior Code Reviewer",
      avatar: "🔍",
      traits: "Kritis, Analitis, & Perfeksionis",
      model: "claude-sonnet-4-6",
      prompt:
        "Anda adalah Senior Software Architect & Code Reviewer. Fokus Anda adalah menemukan potensi bug, memory leak, security vulnerability, dan anti-pattern. Berikan saran refaktor kode yang bersih, type-safe, efisien, dan mengikuti best practices industri.",
    },
    {
      title: "Fullstack Web Maestro",
      avatar: "🎨",
      traits: "Kreatif, Teliti, & Cepat",
      model: "gemini-3.8-flash-high",
      prompt:
        "Anda adalah Fullstack Web Engineer ahli dalam TypeScript, Vite, Tailwind CSS, dan modern UI component framework. Prioritaskan styling Cinematic Minimalist yang memukau, animasi halus, responsive design, dan kode yang modular.",
    },
    {
      title: "Qwen Coding Specialist",
      avatar: "⚡",
      traits: "Presisi, Efisien, & Cepat",
      model: "qwen:qwen-2.5-coder-32b-instruct",
      prompt:
        "Anda adalah Qwen Coding Specialist yang menguasai arsitektur koding canggih, algoritma efisien, refactoring cepat, dan penyelesaian bug secara presisi.",
    },
    {
      title: "Grok Logic Hacker",
      avatar: "🧠",
      traits: "Kreatif, Tajam, & Cerdas",
      model: "grok:grok-2",
      prompt:
        "Anda adalah Grok Logic Hacker dengan penalaran tajam dan gaya komunikasi santai namun lugas, cepat, dan solutif.",
    },
    {
      title: "DeepSeek Reasoning Architect",
      avatar: "🎯",
      traits: "Mendalam, Metodis, & Solutif",
      model: "deepseek:deepseek-reasoner",
      prompt:
        "Anda adalah DeepSeek Reasoning Architect dengan pemikiran analitis berlapis (Chain of Thought) untuk membedah arsitektur sistem kompleks dan masalah koding yang rumit.",
    },
  ];

  $effect(() => {
    if (isOpen) {
      api.getAIModels().then(res => {
        if (res && res.models) {
          availableModels = res.models;
        }
      }).catch(err => console.warn('Failed to load AI models in PersonaModal:', err));
    }
  });

  function getModelDetails(modelId?: string | null) {
    if (!modelId) {
      return {
        name: 'Gemini 3.8 Flash (High Reasoning)',
        provider: 'antigravity',
        label: 'Antigravity Core',
        color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25',
        dotColor: 'bg-indigo-400',
        hasKey: true
      };
    }

    const found = availableModels.find(m => m.id === modelId);
    const lower = modelId.toLowerCase();

    if (lower.startsWith('openai:')) {
      return {
        name: found?.name || modelId.replace('openai:', ''),
        provider: 'openai',
        label: 'OpenAI',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
        dotColor: 'bg-emerald-400',
        hasKey: found?.hasKey ?? false
      };
    }
    if (lower.startsWith('grok:') || lower.startsWith('xai:')) {
      return {
        name: found?.name || modelId.replace(/^(grok|xai):/, ''),
        provider: 'grok',
        label: 'xAI Grok',
        color: 'text-violet-400 bg-violet-500/10 border-violet-500/25',
        dotColor: 'bg-violet-400',
        hasKey: found?.hasKey ?? false
      };
    }
    if (lower.startsWith('qwen:')) {
      return {
        name: found?.name || modelId.replace('qwen:', ''),
        provider: 'qwen',
        label: 'Qwen',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
        dotColor: 'bg-amber-400',
        hasKey: found?.hasKey ?? false
      };
    }
    if (lower.startsWith('deepseek:')) {
      return {
        name: found?.name || modelId.replace('deepseek:', ''),
        provider: 'deepseek',
        label: 'DeepSeek',
        color: 'text-sky-400 bg-sky-500/10 border-sky-500/25',
        dotColor: 'bg-sky-400',
        hasKey: found?.hasKey ?? false
      };
    }
    if (lower.startsWith('gemini:')) {
      return {
        name: found?.name || modelId.replace('gemini:', ''),
        provider: 'gemini',
        label: 'Gemini Direct',
        color: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
        dotColor: 'bg-blue-400',
        hasKey: found?.hasKey ?? false
      };
    }
    if (lower.startsWith('custom:')) {
      return {
        name: found?.name || modelId,
        provider: 'custom',
        label: 'Custom',
        color: 'text-purple-400 bg-purple-500/10 border-purple-500/25',
        dotColor: 'bg-purple-400',
        hasKey: found?.hasKey ?? false
      };
    }

    return {
      name: found?.name || modelId,
      provider: 'antigravity',
      label: 'Antigravity Core',
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25',
      dotColor: 'bg-indigo-400',
      hasKey: true
    };
  }

  function startEditPersona(p: PersonaItem) {
    editingPersonaId = p.id;
    newName = p.name;
    newAvatar = p.avatar || "🤖";
    newTraits = p.traits || "";
    newSystemPrompt = p.system_prompt;
    newPreferredModel = p.preferred_model || "gemini-3.8-flash-high";

    const str = newAvatar.trim().toLowerCase();
    if (
      str.startsWith("data:") ||
      str.startsWith("/uploads/") ||
      str.startsWith("http://") ||
      str.startsWith("https://")
    ) {
      avatarType = "custom";
    } else {
      avatarType = "emoji";
    }
    formError = "";
    isModelDropdownOpen = false;
    activeTab = "create";
  }

  function resetForm() {
    editingPersonaId = null;
    newName = "";
    newAvatar = "🤖";
    newTraits = "";
    newSystemPrompt = "";
    newPreferredModel = "gemini-3.8-flash-high";
    avatarType = "emoji";
    isModelDropdownOpen = false;
    formError = "";
    if (fileInputRef) fileInputRef.value = "";
  }

  function cancelForm() {
    resetForm();
    activeTab = "list";
  }

  function applyTemplate(tpl: (typeof templates)[0]) {
    newName = tpl.title;
    newAvatar = tpl.avatar;
    newTraits = tpl.traits;
    newSystemPrompt = tpl.prompt;
    newPreferredModel = tpl.model;
    avatarType = "emoji";
    isModelDropdownOpen = false;
  }

  async function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      formError = "Ukuran file avatar maksimal 15MB (gunakan video/gif durasi singkat).";
      return;
    }

    formError = "";
    isUploadingAvatar = true;
    try {
      const res = await api.uploadAvatar(file);
      if (res && res.success && res.url) {
        newAvatar = res.url;
        avatarType = "custom";
      } else {
        formError = res?.error || "Gagal mengunggah file avatar ke server.";
      }
    } catch (err: any) {
      formError = "Gagal mengunggah avatar: " + (err.message || "Network error");
    } finally {
      isUploadingAvatar = false;
      if (fileInputRef) fileInputRef.value = "";
    }
  }

  function resetAvatarToEmoji(emoji = "🤖") {
    newAvatar = emoji;
    avatarType = "emoji";
    if (fileInputRef) fileInputRef.value = "";
  }

  function addTraitSuggestion(trait: string) {
    if (!newTraits.trim()) {
      newTraits = trait;
    } else if (!newTraits.includes(trait)) {
      newTraits = `${newTraits}, ${trait}`;
    }
  }

  async function handleGeneratePrompt() {
    if (!newTraits.trim() && !newName.trim()) {
      formError = "Tuliskan nama persona atau pilih sifat & karakteristik di atas terlebih dahulu.";
      return;
    }

    formError = "";
    isGeneratingPrompt = true;
    try {
      const res = await api.generatePersonaPrompt({
        name: newName.trim() || undefined,
        traits: newTraits.trim() || undefined,
        preferred_model: newPreferredModel,
      });

      if (res?.prompt) {
        newSystemPrompt = res.prompt;
      } else if (res?.error) {
        formError = res.error;
      }
    } catch (err: any) {
      formError = err.message || "Gagal men-generate instruksi sistem.";
    } finally {
      isGeneratingPrompt = false;
    }
  }

  async function handleSubmit() {
    if (!newName.trim()) {
      formError = "Nama persona wajib diisi.";
      return;
    }
    if (!newSystemPrompt.trim()) {
      formError = "Instruksi sistem / system prompt wajib diisi.";
      return;
    }

    formError = "";
    isSubmitting = true;
    try {
      if (editingPersonaId) {
        if (onUpdatePersona) {
          await onUpdatePersona(editingPersonaId, {
            name: newName.trim(),
            avatar: newAvatar || "🤖",
            traits: newTraits.trim() || undefined,
            system_prompt: newSystemPrompt.trim(),
            preferred_model: newPreferredModel,
          });
        }
      } else {
        await onCreatePersona({
          name: newName.trim(),
          avatar: newAvatar || "🤖",
          traits: newTraits.trim() || undefined,
          system_prompt: newSystemPrompt.trim(),
          preferred_model: newPreferredModel,
        });
      }

      resetForm();
      activeTab = "list";
    } catch (err: any) {
      formError = err.message || "Gagal menyimpan persona.";
    } finally {
      isSubmitting = false;
    }
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
  >
    <div
      class="w-full max-w-2xl bg-zinc-950/95 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in zoom-in-95 duration-200"
    >
      <!-- Header -->
      <div
        class="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-zinc-900/60"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-sm"
          >
            <Bot class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm sm:text-base font-bold text-white tracking-tight">
              Karakter & Persona AI
            </h3>
            <p class="text-[11px] text-zinc-400">
              Pilih karakter atau tautkan model AI (OpenAI, Grok, Qwen, DeepSeek, Gemini)
            </p>
          </div>
        </div>

        <button
          type="button"
          onclick={onClose}
          class="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div
        class="flex items-center px-4 sm:px-6 pt-2.5 border-b border-white/[0.08] text-xs gap-3 sm:gap-4 shrink-0 bg-zinc-900/30"
      >
        <button
          type="button"
          onclick={() => {
            activeTab = "list";
          }}
          class="pb-2 sm:pb-2.5 px-2.5 sm:px-3 border-b-2 font-medium transition cursor-pointer flex items-center gap-1.5 {activeTab ===
          'list'
            ? 'border-indigo-500 text-indigo-300 font-bold'
            : 'border-transparent text-zinc-400 hover:text-zinc-200'}"
        >
          <Bot class="w-3.5 h-3.5" />
          <span>Daftar Persona ({personas.length})</span>
        </button>

        <button
          type="button"
          onclick={() => {
            if (activeTab !== "create") {
              resetForm();
            }
            activeTab = "create";
          }}
          class="pb-2 sm:pb-2.5 px-2.5 sm:px-3 border-b-2 font-medium transition cursor-pointer flex items-center gap-1.5 {activeTab ===
          'create'
            ? 'border-indigo-500 text-indigo-300 font-bold'
            : 'border-transparent text-zinc-400 hover:text-zinc-200'}"
        >
          {#if editingPersonaId}
            <Pencil class="w-3.5 h-3.5 text-indigo-400" />
            <span>Edit Persona</span>
          {:else}
            <Plus class="w-3.5 h-3.5" />
            <span>Buat Persona Baru</span>
          {/if}
        </button>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3 sm:space-y-4">
        {#if activeTab === "list"}
          <!-- Personas Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {#each personas as p (p.id)}
              {@const isSelected = activePersonaId === p.id}
              {@const modelInfo = getModelDetails(p.preferred_model)}
              <div
                class="p-3 sm:p-3.5 rounded-2xl border transition flex flex-col justify-between gap-3 group relative {isSelected
                  ? 'bg-indigo-950/30 border-indigo-500 shadow-md shadow-indigo-950/30'
                  : 'bg-zinc-900/40 hover:bg-zinc-900/70 border-white/[0.06] hover:border-white/[0.14]'}"
              >
                <div class="flex flex-col gap-2.5">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                      <!-- Render Avatar with AvatarView -->
                      <AvatarView
                        avatar={p.avatar}
                        name={p.name}
                        size="md"
                        className="rounded-2xl shrink-0 ring-1 ring-white/10"
                      />

                      <div class="flex flex-col min-w-0 flex-1">
                        <h4
                          class="text-xs font-bold text-zinc-100 flex items-center gap-1.5 min-w-0"
                        >
                          <span class="truncate font-semibold">{p.name}</span>
                          {#if p.is_default}
                            <span
                              class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 shrink-0"
                              >Bawaan</span
                            >
                          {/if}
                        </h4>

                        <!-- Model AI Badge with Provider color -->
                        <div class="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono border {modelInfo.color} w-fit max-w-full">
                          <span class="w-1.5 h-1.5 rounded-full {modelInfo.dotColor} shrink-0"></span>
                          <span class="truncate">{modelInfo.label}: {modelInfo.name}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Action buttons: Edit & Delete -->
                    <div class="flex items-center gap-1 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onclick={() => startEditPersona(p)}
                        class="p-1 rounded-lg text-zinc-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition cursor-pointer"
                        title="Edit persona ini"
                      >
                        <Pencil class="w-3.5 h-3.5" />
                      </button>

                      {#if !p.is_default}
                        <button
                          type="button"
                          onclick={() => onDeletePersona(p.id)}
                          class="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Hapus persona custom ini"
                        >
                          <Trash2 class="w-3.5 h-3.5" />
                        </button>
                      {/if}
                    </div>
                  </div>

                  <!-- Traits Badge if present -->
                  {#if p.traits}
                    <div
                      class="text-[10px] text-zinc-400 font-mono px-2 py-1 rounded-lg bg-zinc-900/80 border border-white/5 truncate"
                    >
                      ✨ {p.traits}
                    </div>
                  {/if}

                  <!-- Preview System Prompt -->
                  <p
                    class="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed bg-black/20 p-2 rounded-xl"
                  >
                    {p.system_prompt}
                  </p>
                </div>

                <!-- Footer: Select button -->
                <button
                  type="button"
                  onclick={() => {
                    onSelectPersona(p);
                    onClose();
                  }}
                  class="w-full py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer {isSelected
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                    : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-white/5'}"
                >
                  {#if isSelected}
                    <Check class="w-3 h-3 text-indigo-400" />
                    <span>Aktif Digunakan</span>
                  {:else}
                    <span>Gunakan Persona Ini</span>
                  {/if}
                </button>
              </div>
            {/each}
          </div>
        {:else}
          <!-- Create / Edit Form -->
          <div class="space-y-4">
            <!-- Preset Templates Selector -->
            {#if !editingPersonaId}
              <div class="space-y-1.5">
                <span
                  class="text-xs font-semibold text-zinc-300 flex items-center gap-1.5"
                >
                  <Sparkles class="w-3.5 h-3.5 text-indigo-400" />
                  Gunakan Template Praktis:
                </span>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {#each templates as tpl}
                    <button
                      type="button"
                      onclick={() => applyTemplate(tpl)}
                      class="p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 hover:border-indigo-500/40 text-left transition cursor-pointer group flex flex-col"
                    >
                      <span class="text-lg">{tpl.avatar}</span>
                      <div
                        class="text-[11px] font-semibold text-zinc-200 mt-1 truncate group-hover:text-indigo-300"
                      >
                        {tpl.title}
                      </div>
                      <div class="text-[9px] text-zinc-500 font-mono truncate">
                        {tpl.traits}
                      </div>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Custom Avatar Picker & Upload Section -->
            <div
              class="p-3.5 rounded-2xl bg-zinc-900/50 border border-white/[0.08] flex flex-col gap-3"
            >
              <div class="flex items-center justify-between">
                <span
                  class="text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
                >
                  <Smile class="w-3.5 h-3.5 text-indigo-400" />
                  Icon & Avatar Persona:
                </span>
                <span class="text-[10px] text-zinc-400 font-mono"
                  >Dukungan: Emoji, Foto, GIF, atau Video Singkat</span
                >
              </div>

              <div class="flex items-center gap-4">
                <!-- Live Preview of Avatar -->
                <div class="relative group">
                  <AvatarView
                    avatar={newAvatar}
                    name={newName || "Avatar"}
                    size="xl"
                    className="shadow-lg shadow-indigo-950/40 ring-2 ring-indigo-500/40"
                  />
                  {#if avatarType === "custom"}
                    <button
                      type="button"
                      onclick={() => resetAvatarToEmoji("🤖")}
                      class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs hover:bg-rose-500 shadow-md cursor-pointer"
                      title="Reset ke emoji"
                    >
                      <X class="w-3 h-3" />
                    </button>
                  {/if}
                </div>

                <div class="flex-1 flex flex-col gap-2 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <!-- Hidden File Input -->
                    <input
                      type="file"
                      bind:this={fileInputRef}
                      accept="image/*,video/mp4,video/webm"
                      class="hidden"
                      onchange={handleFileSelect}
                    />

                    <!-- Upload Button -->
                    <button
                      type="button"
                      disabled={isUploadingAvatar}
                      onclick={() => fileInputRef?.click()}
                      class="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      {#if isUploadingAvatar}
                        <Loader2 class="w-3.5 h-3.5 animate-spin" />
                        <span>Mengunggah Avatar...</span>
                      {:else}
                        <Upload class="w-3.5 h-3.5" />
                        <span>Upload Avatar (Gambar/GIF/Video)</span>
                      {/if}
                    </button>

                    {#if avatarType === "custom"}
                      <button
                        type="button"
                        onclick={() => resetAvatarToEmoji("🤖")}
                        class="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs transition cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw class="w-3 h-3" />
                        <span>Gunakan Emoji</span>
                      </button>
                    {/if}
                  </div>

                  <!-- Quick Emoji Picker -->
                  <div class="flex items-center gap-1.5 flex-wrap">
                    {#each emojiList as em}
                      <button
                        type="button"
                        onclick={() => resetAvatarToEmoji(em)}
                        class="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition cursor-pointer {avatarType ===
                          'emoji' && newAvatar === em
                          ? 'bg-indigo-600 border border-indigo-400 scale-105'
                          : 'bg-zinc-900 border border-white/5 hover:bg-zinc-800'}"
                      >
                        {em}
                      </button>
                    {/each}
                  </div>
                </div>
              </div>
            </div>

            <!-- Name Input -->
            <div class="space-y-1.5">
              <label
                class="text-xs font-semibold text-zinc-300"
                for="persona-name"
              >
                Nama Persona:
              </label>
              <input
                id="persona-name"
                type="text"
                bind:value={newName}
                placeholder="Contoh: Senior Code Reviewer, UI Maestro, Security Audit..."
                class="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none placeholder-zinc-500"
              />
            </div>

            <!-- Traits Input -->
            <div class="space-y-1.5">
              <label
                class="text-xs font-semibold text-zinc-300"
                for="persona-traits"
              >
                Sifat & Karakteristik AI:
              </label>
              <input
                id="persona-traits"
                type="text"
                bind:value={newTraits}
                placeholder="Contoh: Kritis, Teliti, Perfeksionis, Santai & Ramah..."
                class="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none placeholder-zinc-500"
              />

              <!-- Quick Trait Suggestion Chips -->
              <div class="flex items-center gap-1.5 flex-wrap pt-1">
                <span class="text-[10px] text-zinc-500 font-mono"
                  >Saran cepat:</span
                >
                {#each traitSuggestions as sug}
                  <button
                    type="button"
                    onclick={() => addTraitSuggestion(sug)}
                    class="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-indigo-500/30 text-zinc-400 hover:text-indigo-300 transition cursor-pointer"
                  >
                    + {sug}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Preferred AI Model Selector (NEW & EXTENSIBLE) -->
            <div class="space-y-1.5 relative">
              <div class="flex items-center justify-between">
                <label class="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Cpu class="w-3.5 h-3.5 text-indigo-400" />
                  <span>Model AI Tertaut:</span>
                </label>
                {#if onOpenSettings}
                  <button
                    type="button"
                    onclick={() => onOpenSettings?.('ai_providers')}
                    class="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-mono cursor-pointer"
                  >
                    <Key class="w-3 h-3 text-amber-400" /> Atur API Keys di Pengaturan
                  </button>
                {/if}
              </div>

              <!-- Trigger Selector Button -->
              <button
                type="button"
                onclick={() => isModelDropdownOpen = !isModelDropdownOpen}
                class="w-full bg-zinc-900 border border-zinc-800 hover:border-indigo-500/60 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 flex items-center justify-between transition cursor-pointer shadow-sm group"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="w-2 h-2 rounded-full {currentModelInfo.dotColor} shrink-0"></span>
                  <div class="flex flex-col text-left min-w-0">
                    <span class="font-bold text-zinc-100 truncate group-hover:text-indigo-300">
                      {currentModelInfo.name}
                    </span>
                    <span class="text-[10px] text-zinc-500 font-mono">
                      Provider: {currentModelInfo.label}
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  {#if currentModelInfo.hasKey}
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1">
                      <CheckCircle2 class="w-2.5 h-2.5" /> Siap
                    </span>
                  {:else}
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono flex items-center gap-1">
                      <AlertTriangle class="w-2.5 h-2.5" /> Butuh API Key
                    </span>
                  {/if}
                  <ChevronDown class="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-transform {isModelDropdownOpen ? 'rotate-180' : ''}" />
                </div>
              </button>

              <!-- Floating Dropdown Popover -->
              {#if isModelDropdownOpen}
                <div
                  class="absolute left-0 right-0 top-full mt-1.5 z-50 bg-zinc-900/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-2xl p-2 max-h-72 overflow-y-auto space-y-1 animate-in fade-in zoom-in-95 duration-150"
                >
                  {#if availableModels.length === 0}
                    <div class="p-3 text-center text-xs text-zinc-500">Memuat daftar model...</div>
                  {:else}
                    {#each ['antigravity', 'openai', 'grok', 'qwen', 'deepseek', 'gemini'] as prov}
                      {@const provModels = availableModels.filter(m => m.provider === prov)}
                      {#if provModels.length > 0}
                        <div class="pt-2 pb-1 px-2.5 text-[10px] font-bold text-zinc-400 font-mono uppercase tracking-wider flex items-center justify-between border-t border-white/5 first:border-t-0">
                          <span>{prov === 'antigravity' ? '⚡ Antigravity CLI Core' : prov.toUpperCase()}</span>
                          {#if prov !== 'antigravity'}
                            <span class="text-[9px] font-normal lowercase {provModels.some(m => m.hasKey) ? 'text-emerald-400' : 'text-zinc-500'}">
                              {provModels.some(m => m.hasKey) ? '● key aktif' : '○ belum ada key'}
                            </span>
                          {/if}
                        </div>

                        {#each provModels as m}
                          {@const isCur = newPreferredModel === m.id}
                          <button
                            type="button"
                            onclick={() => {
                              newPreferredModel = m.id;
                              isModelDropdownOpen = false;
                            }}
                            class="w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 text-left transition cursor-pointer {isCur ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-200' : 'hover:bg-zinc-800 text-zinc-300'}"
                          >
                            <div class="flex flex-col min-w-0 flex-1">
                              <div class="text-xs font-semibold flex items-center gap-1.5">
                                <span class="truncate">{m.name}</span>
                                {#if isCur}
                                  <Check class="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                {/if}
                              </div>
                              {#if m.description}
                                <span class="text-[10px] text-zinc-500 truncate">{m.description}</span>
                              {/if}
                            </div>

                            <div class="shrink-0 flex items-center gap-1 text-[9px] font-mono">
                              {#if m.hasKey}
                                <span class="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Siap</span>
                              {:else}
                                <span class="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">No Key</span>
                              {/if}
                            </div>
                          </button>
                        {/each}
                      {/if}
                    {/each}
                  {/if}
                </div>
              {/if}

              <!-- Warning if model doesn't have an API Key configured -->
              {#if !currentModelInfo.hasKey}
                <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center justify-between gap-2">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <AlertTriangle class="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span class="truncate">API Key untuk {currentModelInfo.label} belum diatur di Pengaturan.</span>
                  </div>
                  {#if onOpenSettings}
                    <button
                      type="button"
                      onclick={() => onOpenSettings?.('ai_providers')}
                      class="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-bold transition shrink-0 cursor-pointer"
                    >
                      Isi Sekarang
                    </button>
                  {/if}
                </div>
              {/if}
            </div>

            <!-- System prompt instruction with AI Auto-Generate Button -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label
                  class="text-xs font-semibold text-zinc-300"
                  for="persona-prompt"
                >
                  Instruksi Peran & Sistem (System Prompt):
                </label>

                <!-- Button Generate dari Sifat -->
                <button
                  type="button"
                  onclick={handleGeneratePrompt}
                  disabled={isGeneratingPrompt ||
                    (!newTraits.trim() && !newName.trim())}
                  class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-violet-500/30 border border-indigo-500/30 hover:border-indigo-500/60 text-[11px] font-semibold text-indigo-300 hover:text-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group shadow-sm active:scale-95"
                  title="Generate teks instruksi otomatis berbasis nama & sifat AI yang diisi di atas"
                >
                  {#if isGeneratingPrompt}
                    <Loader2 class="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                    <span>Men-generate Instruksi...</span>
                  {:else}
                    <Sparkles
                      class="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 group-hover:text-amber-300 transition-transform"
                    />
                    <span
                      class="bg-gradient-to-r from-indigo-200 to-violet-200 bg-clip-text text-transparent group-hover:text-white font-semibold"
                      >Generate</span
                    >
                  {/if}
                </button>
              </div>

              <textarea
                id="persona-prompt"
                bind:value={newSystemPrompt}
                rows="5"
                placeholder="Tuliskan aturan koding & instruksi spesifik, atau klik tombol 'Generate dari Sifat' di atas untuk dibuatkan secara otomatis oleh AI..."
                class="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-zinc-100 outline-none placeholder-zinc-500 leading-relaxed resize-none"
              ></textarea>
            </div>

            {#if formError}
              <span class="text-xs text-rose-400 font-semibold"
                >{formError}</span
              >
            {/if}

            <div
              class="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]"
            >
              <button
                type="button"
                onclick={cancelForm}
                class="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onclick={handleSubmit}
                disabled={isSubmitting ||
                  !newName.trim() ||
                  !newSystemPrompt.trim()}
                class="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                {#if editingPersonaId}
                  <Save class="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                {:else}
                  <Plus class="w-3.5 h-3.5" />
                  <span>Simpan Persona</span>
                {/if}
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
