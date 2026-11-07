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
        color: 'text-[#FF5500] bg-orange-100 border-[#FF5500]/40',
        dotColor: 'bg-[#FF5500]',
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
        color: 'text-emerald-800 bg-emerald-100 border-emerald-300',
        dotColor: 'bg-emerald-600',
        hasKey: found?.hasKey ?? false
      };
    }
    if (lower.startsWith('grok:') || lower.startsWith('xai:')) {
      return {
        name: found?.name || modelId.replace(/^(grok|xai):/, ''),
        provider: 'grok',
        label: 'xAI Grok',
        color: 'text-[#FF5500] bg-orange-50 border-orange-200',
        dotColor: 'bg-[#FF5500]',
        hasKey: found?.hasKey ?? false
      };
    }
    if (lower.startsWith('qwen:')) {
      return {
        name: found?.name || modelId.replace('qwen:', ''),
        provider: 'qwen',
        label: 'Qwen',
        color: 'text-amber-800 bg-amber-100 border-amber-300',
        dotColor: 'bg-amber-600',
        hasKey: found?.hasKey ?? false
      };
    }
    if (lower.startsWith('deepseek:')) {
      return {
        name: found?.name || modelId.replace('deepseek:', ''),
        provider: 'deepseek',
        label: 'DeepSeek',
        color: 'text-sky-800 bg-sky-100 border-sky-300',
        dotColor: 'bg-sky-600',
        hasKey: found?.hasKey ?? false
      };
    }
    if (lower.startsWith('gemini:')) {
      return {
        name: found?.name || modelId.replace('gemini:', ''),
        provider: 'gemini',
        label: 'Gemini Direct',
        color: 'text-[#FF5500] bg-orange-100 border-[#FF5500]/40',
        dotColor: 'bg-[#FF5500]',
        hasKey: found?.hasKey ?? false
      };
    }
    if (lower.startsWith('custom:')) {
      return {
        name: found?.name || modelId,
        provider: 'custom',
        label: 'Custom',
        color: 'text-[#191B1D] bg-[#E9E7E0] border-[#C8C5BC]',
        dotColor: 'bg-[#5C6066]',
        hasKey: found?.hasKey ?? false
      };
    }

    return {
      name: found?.name || modelId,
      provider: 'antigravity',
      label: 'Antigravity Core',
      color: 'text-[#FF5500] bg-orange-100 border-[#FF5500]/40',
      dotColor: 'bg-[#FF5500]',
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
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
  >
    <div
      class="w-full max-w-2xl bg-[#FCFCFA] border border-[#C8C5BC] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] font-sans animate-in zoom-in-95 duration-200"
    >
      <!-- Header -->
      <div
        class="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#C8C5BC] flex items-center justify-between shrink-0 bg-[#E9E7E0]"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="w-8 h-8 rounded-lg bg-[#FF5500] text-white flex items-center justify-center font-bold shadow-xs"
          >
            <Bot class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm sm:text-base font-bold text-[#191B1D] tracking-tight uppercase font-mono">
              Karakter & Persona AI
            </h3>
            <p class="text-[11px] text-[#5C6066]">
              Pilih karakter atau tautkan model AI (OpenAI, Grok, Qwen, DeepSeek, Gemini)
            </p>
          </div>
        </div>

        <button
          type="button"
          onclick={onClose}
          class="p-1.5 rounded-lg text-[#5C6066] hover:text-[#191B1D] hover:bg-[#DEDBD2] transition cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div
        class="flex items-center px-4 sm:px-6 pt-2.5 border-b border-[#C8C5BC] text-xs gap-3 sm:gap-4 shrink-0 bg-[#E9E7E0]"
      >
        <button
          type="button"
          onclick={() => {
            activeTab = "list";
          }}
          class="pb-2.5 sm:pb-3 px-2.5 sm:px-3 border-b-2 font-medium transition cursor-pointer flex items-center gap-1.5 {activeTab ===
          'list'
            ? 'border-[#FF5500] text-[#FF5500] font-bold'
            : 'border-transparent text-[#5C6066] hover:text-[#191B1D]'}"
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
          class="pb-2.5 sm:pb-3 px-2.5 sm:px-3 border-b-2 font-medium transition cursor-pointer flex items-center gap-1.5 {activeTab ===
          'create'
            ? 'border-[#FF5500] text-[#FF5500] font-bold'
            : 'border-transparent text-[#5C6066] hover:text-[#191B1D]'}"
        >
          {#if editingPersonaId}
            <Pencil class="w-3.5 h-3.5 text-[#FF5500]" />
            <span>Edit Persona</span>
          {:else}
            <Plus class="w-3.5 h-3.5" />
            <span>Buat Persona Baru</span>
          {/if}
        </button>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3 sm:space-y-4 bg-[#F4F3EE]">
        {#if activeTab === "list"}
          <!-- Personas Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {#each personas as p (p.id)}
              {@const isSelected = activePersonaId === p.id}
              {@const modelInfo = getModelDetails(p.preferred_model)}
              <div
                class="p-3 sm:p-3.5 rounded-xl border transition flex flex-col justify-between gap-3 group relative {isSelected
                  ? 'bg-orange-50/70 border-[#FF5500] shadow-xs'
                  : 'bg-[#FCFCFA] hover:bg-[#E9E7E0]/60 border-[#C8C5BC] hover:border-[#8C9097]'}"
              >
                <div class="flex flex-col gap-2.5">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                      <!-- Render Avatar with AvatarView -->
                      <AvatarView
                        avatar={p.avatar}
                        name={p.name}
                        size="md"
                        className="rounded-xl shrink-0 ring-1 ring-[#C8C5BC]"
                      />

                      <div class="flex flex-col min-w-0 flex-1">
                        <h4
                          class="text-xs font-bold text-[#191B1D] flex items-center gap-1.5 min-w-0"
                        >
                          <span class="truncate font-bold">{p.name}</span>
                          {#if p.is_default}
                            <span
                              class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#E9E7E0] text-[#5C6066] border border-[#C8C5BC] shrink-0 font-bold"
                              >Bawaan</span
                            >
                          {/if}
                        </h4>

                        <!-- Model AI Badge with Provider color -->
                        <div class="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono border {modelInfo.color} w-fit max-w-full font-bold">
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
                        class="p-1 rounded-lg text-[#5C6066] hover:text-[#FF5500] hover:bg-orange-100 transition cursor-pointer"
                        title="Edit persona ini"
                      >
                        <Pencil class="w-3.5 h-3.5" />
                      </button>

                      {#if !p.is_default}
                        <button
                          type="button"
                          onclick={() => onDeletePersona(p.id)}
                          class="p-1 rounded-lg text-[#5C6066] hover:text-rose-600 hover:bg-rose-100 transition cursor-pointer"
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
                      class="text-[10px] text-[#5C6066] font-mono px-2 py-1 rounded-lg bg-[#E9E7E0] border border-[#C8C5BC] truncate font-bold"
                    >
                      ✨ {p.traits}
                    </div>
                  {/if}

                  <!-- Preview System Prompt -->
                  <p
                    class="text-[11px] text-[#5C6066] line-clamp-2 leading-relaxed bg-[#FCFCFA] p-2 rounded-xl border border-[#C8C5BC]"
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
                  class="w-full py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer {isSelected
                    ? 'bg-orange-100 text-[#FF5500] border border-[#FF5500]'
                    : 'btn-hardware'}"
                >
                  {#if isSelected}
                    <Check class="w-3 h-3 text-[#FF5500]" />
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
                  class="text-xs font-bold text-[#191B1D] font-mono uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Sparkles class="w-3.5 h-3.5 text-[#FF5500]" />
                  Gunakan Template Praktis:
                </span>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {#each templates as tpl}
                    <button
                      type="button"
                      onclick={() => applyTemplate(tpl)}
                      class="p-2.5 rounded-xl bg-[#FCFCFA] hover:bg-[#E9E7E0] border border-[#C8C5BC] hover:border-[#FF5500] text-left transition cursor-pointer group flex flex-col shadow-xs"
                    >
                      <span class="text-lg">{tpl.avatar}</span>
                      <div
                        class="text-[11px] font-bold text-[#191B1D] mt-1 truncate group-hover:text-[#FF5500]"
                      >
                        {tpl.title}
                      </div>
                      <div class="text-[9px] text-[#5C6066] font-mono truncate">
                        {tpl.traits}
                      </div>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Custom Avatar Picker & Upload Section -->
            <div
              class="p-3.5 rounded-xl bg-[#FCFCFA] border border-[#C8C5BC] flex flex-col gap-3 shadow-xs"
            >
              <div class="flex items-center justify-between">
                <span
                  class="text-xs font-bold text-[#191B1D] font-mono uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Smile class="w-3.5 h-3.5 text-[#FF5500]" />
                  Icon & Avatar Persona:
                </span>
                <span class="text-[10px] text-[#5C6066] font-mono"
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
                    className="shadow-xs ring-2 ring-[#FF5500]/40 rounded-xl"
                  />
                  {#if avatarType === "custom"}
                    <button
                      type="button"
                      onclick={() => resetAvatarToEmoji("🤖")}
                      class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs hover:bg-rose-500 shadow-xs cursor-pointer"
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
                      class="btn-hardware px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {#if isUploadingAvatar}
                        <Loader2 class="w-3.5 h-3.5 animate-spin text-[#FF5500]" />
                        <span>Mengunggah Avatar...</span>
                      {:else}
                        <Upload class="w-3.5 h-3.5 text-[#FF5500]" />
                        <span>Upload Avatar (Gambar/GIF/Video)</span>
                      {/if}
                    </button>

                    {#if avatarType === "custom"}
                      <button
                        type="button"
                        onclick={() => resetAvatarToEmoji("🤖")}
                        class="btn-hardware px-2.5 py-1.5 rounded-xl text-[#5C6066] hover:text-[#191B1D] text-xs transition cursor-pointer flex items-center gap-1 shadow-xs font-bold"
                      >
                        <RefreshCw class="w-3 h-3 text-[#FF5500]" />
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
                          ? 'bg-[#FF5500] text-white scale-105 shadow-xs'
                          : 'bg-[#FCFCFA] border border-[#C8C5BC] hover:bg-[#E9E7E0]'}"
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
                class="text-xs font-bold text-[#191B1D] font-mono uppercase tracking-wider"
                for="persona-name"
              >
                Nama Persona:
              </label>
              <input
                id="persona-name"
                type="text"
                bind:value={newName}
                placeholder="Contoh: Senior Code Reviewer, UI Maestro, Security Audit..."
                class="w-full bg-[#FCFCFA] border border-[#C8C5BC] focus:border-[#FF5500] rounded-xl px-3 py-2 text-xs text-[#191B1D] outline-none placeholder-[#8C9097] shadow-xs font-mono"
              />
            </div>

            <!-- Traits Input -->
            <div class="space-y-1.5">
              <label
                class="text-xs font-bold text-[#191B1D] font-mono uppercase tracking-wider"
                for="persona-traits"
              >
                Sifat & Karakteristik AI:
              </label>
              <input
                id="persona-traits"
                type="text"
                bind:value={newTraits}
                placeholder="Contoh: Kritis, Teliti, Perfeksionis, Santai & Ramah..."
                class="w-full bg-[#FCFCFA] border border-[#C8C5BC] focus:border-[#FF5500] rounded-xl px-3 py-2 text-xs text-[#191B1D] outline-none placeholder-[#8C9097] shadow-xs font-mono"
              />

              <!-- Quick Trait Suggestion Chips -->
              <div class="flex items-center gap-1.5 flex-wrap pt-1">
                <span class="text-[10px] text-[#5C6066] font-mono"
                  >Saran cepat:</span
                >
                {#each traitSuggestions as sug}
                  <button
                    type="button"
                    onclick={() => addTraitSuggestion(sug)}
                    class="text-[10px] px-2 py-0.5 rounded-full bg-[#FCFCFA] hover:bg-orange-100 border border-[#C8C5BC] hover:border-[#FF5500] text-[#5C6066] hover:text-[#FF5500] transition cursor-pointer font-mono font-bold"
                  >
                    + {sug}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Preferred AI Model Selector (EXTENSIBLE) -->
            <div class="space-y-1.5 relative">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold text-[#191B1D] font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu class="w-3.5 h-3.5 text-[#FF5500]" />
                  <span>Model AI Tertaut:</span>
                </label>
                {#if onOpenSettings}
                  <button
                    type="button"
                    onclick={() => onOpenSettings?.('ai_providers')}
                    class="text-[10px] text-[#FF5500] hover:underline flex items-center gap-1 font-mono font-bold cursor-pointer"
                  >
                    <Key class="w-3 h-3 text-[#FF5500]" /> Atur API Keys di Pengaturan
                  </button>
                {/if}
              </div>

              <!-- Trigger Selector Button -->
              <button
                type="button"
                onclick={() => isModelDropdownOpen = !isModelDropdownOpen}
                class="w-full bg-[#FCFCFA] border border-[#C8C5BC] hover:border-[#FF5500] rounded-xl px-3.5 py-2.5 text-xs text-[#191B1D] flex items-center justify-between transition cursor-pointer shadow-xs group"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="w-2 h-2 rounded-full {currentModelInfo.dotColor} shrink-0"></span>
                  <div class="flex flex-col text-left min-w-0">
                    <span class="font-bold text-[#191B1D] truncate group-hover:text-[#FF5500]">
                      {currentModelInfo.name}
                    </span>
                    <span class="text-[10px] text-[#5C6066] font-mono">
                      Provider: {currentModelInfo.label}
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  {#if currentModelInfo.hasKey}
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-bold flex items-center gap-1">
                      <CheckCircle2 class="w-2.5 h-2.5" /> Siap
                    </span>
                  {:else}
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-mono font-bold flex items-center gap-1">
                      <AlertTriangle class="w-2.5 h-2.5" /> Butuh API Key
                    </span>
                  {/if}
                  <ChevronDown class="w-4 h-4 text-[#5C6066] group-hover:text-[#191B1D] transition-transform {isModelDropdownOpen ? 'rotate-180' : ''}" />
                </div>
              </button>

              <!-- Floating Dropdown Popover -->
              {#if isModelDropdownOpen}
                <div
                  class="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#FCFCFA] border border-[#C8C5BC] rounded-xl shadow-2xl p-2 max-h-72 overflow-y-auto space-y-1 animate-in fade-in zoom-in-95 duration-150"
                >
                  {#if availableModels.length === 0}
                    <div class="p-3 text-center text-xs text-[#5C6066] font-mono">Memuat daftar model...</div>
                  {:else}
                    {#each ['antigravity', 'openai', 'grok', 'qwen', 'deepseek', 'gemini'] as prov}
                      {@const provModels = availableModels.filter(m => m.provider === prov)}
                      {#if provModels.length > 0}
                        <div class="pt-2 pb-1 px-2.5 text-[10px] font-bold text-[#5C6066] font-mono uppercase tracking-wider flex items-center justify-between border-t border-[#C8C5BC] first:border-t-0">
                          <span>{prov === 'antigravity' ? '⚡ Antigravity CLI Core' : prov.toUpperCase()}</span>
                          {#if prov !== 'antigravity'}
                            <span class="text-[9px] font-normal lowercase {provModels.some(m => m.hasKey) ? 'text-emerald-700 font-bold' : 'text-[#8C9097]'}">
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
                            class="w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 text-left transition cursor-pointer {isCur ? 'bg-orange-100 border border-[#FF5500] text-[#FF5500] font-bold' : 'hover:bg-[#E9E7E0] text-[#191B1D]'}"
                          >
                            <div class="flex flex-col min-w-0 flex-1">
                              <div class="text-xs font-semibold flex items-center gap-1.5">
                                <span class="truncate">{m.name}</span>
                                {#if isCur}
                                  <Check class="w-3.5 h-3.5 text-[#FF5500] shrink-0" />
                                {/if}
                              </div>
                              {#if m.description}
                                <span class="text-[10px] text-[#5C6066] truncate">{m.description}</span>
                              {/if}
                            </div>

                            <div class="shrink-0 flex items-center gap-1 text-[9px] font-mono">
                              {#if m.hasKey}
                                <span class="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">Siap</span>
                              {:else}
                                <span class="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold">No Key</span>
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
                <div class="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] flex items-center justify-between gap-2">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <AlertTriangle class="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span class="truncate font-medium">API Key untuk {currentModelInfo.label} belum diatur di Pengaturan.</span>
                  </div>
                  {#if onOpenSettings}
                    <button
                      type="button"
                      onclick={() => onOpenSettings?.('ai_providers')}
                      class="btn-hardware px-2 py-1 rounded-lg text-amber-900 text-[10px] font-bold transition shrink-0 cursor-pointer shadow-xs"
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
                  class="text-xs font-bold text-[#191B1D] font-mono uppercase tracking-wider"
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
                  class="btn-safety flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold text-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group shadow-xs active:scale-95"
                  title="Generate teks instruksi otomatis berbasis nama & sifat AI yang diisi di atas"
                >
                  {#if isGeneratingPrompt}
                    <Loader2 class="w-3.5 h-3.5 text-white animate-spin" />
                    <span>Men-generate Instruksi...</span>
                  {:else}
                    <Sparkles
                      class="w-3.5 h-3.5 text-white group-hover:scale-110 transition-transform"
                    />
                    <span>Generate Instruksi</span>
                  {/if}
                </button>
              </div>

              <textarea
                id="persona-prompt"
                bind:value={newSystemPrompt}
                rows="5"
                placeholder="Tuliskan aturan koding & instruksi spesifik, atau klik tombol 'Generate Instruksi' di atas untuk dibuatkan secara otomatis oleh AI..."
                class="w-full bg-[#FCFCFA] border border-[#C8C5BC] focus:border-[#FF5500] rounded-xl p-3 text-xs text-[#191B1D] outline-none placeholder-[#8C9097] leading-relaxed resize-none shadow-xs font-mono"
              ></textarea>
            </div>

            {#if formError}
              <span class="text-xs text-rose-600 font-bold"
                >{formError}</span
              >
            {/if}

            <div
              class="flex items-center justify-end gap-2 pt-2 border-t border-[#C8C5BC]"
            >
              <button
                type="button"
                onclick={cancelForm}
                class="btn-hardware px-4 py-2 rounded-xl text-[#191B1D] text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Batal
              </button>

              <button
                type="button"
                onclick={handleSubmit}
                disabled={isSubmitting ||
                  !newName.trim() ||
                  !newSystemPrompt.trim()}
                class="btn-safety px-4 py-2 rounded-xl disabled:opacity-40 text-white text-xs font-bold shadow-xs transition cursor-pointer active:scale-95 flex items-center gap-1.5"
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
