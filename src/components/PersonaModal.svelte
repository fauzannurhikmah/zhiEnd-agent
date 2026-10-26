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
      title: "DevOps Specialist",
      avatar: "🛠️",
      traits: "Pragmatis, Efisien, & Cepat",
      model: "gemini-3.8-flash-medium",
      prompt:
        "Anda adalah DevOps Specialist yang menguasai Docker, CI/CD, Git branching, build optimization, dan server configuration. Berikan solusi deployment yang cepat, aman, dan tanpa downtime.",
    },
    {
      title: "Bug Hunter & Fixer",
      avatar: "🎯",
      traits: "Lugas, Tajam, & To the point",
      model: "gemini-3.8-flash-high",
      prompt:
        "Anda adalah debugging specialist yang tajam. Saat memeriksa error, telusuri root cause hingga ke akarnya, perbaiki file yang bermasalah secara teliti tanpa merusak fitur lain, dan jelaskan penyebab serta solusinya dengan lugas.",
    },
  ];

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
  }

  async function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    // Batas ukuran file 15MB
    if (file.size > 15 * 1024 * 1024) {
      formError =
        "Ukuran file avatar maksimal 15MB (gunakan video/gif durasi singkat).";
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
      formError =
        "Tuliskan nama persona atau pilih sifat & karakteristik di atas terlebih dahulu.";
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
    } catch (e: any) {
      formError = e.message || "Gagal menyimpan persona.";
    } finally {
      isSubmitting = false;
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === "Escape") onClose();
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
  <div
    class="fixed inset-0 bg-black/85 backdrop-blur-xl z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
  >
    <!-- Click outside to close -->
    <button
      type="button"
      class="absolute inset-0 cursor-default bg-transparent border-0"
      onclick={onClose}
      tabindex="-1"
      aria-label="Tutup modal"
    ></button>

    <!-- Modal Box -->
    <div
      class="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] rounded-3xl bg-zinc-950/95 border border-indigo-500/25 shadow-2xl shadow-indigo-950/40 flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200"
    >
      <!-- Modal Header -->
      <div
        class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/[0.08] bg-zinc-900/40 shrink-0 gap-2"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div
            class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0"
          >
            <Bot class="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div class="min-w-0">
            <h2 class="text-xs sm:text-sm font-bold text-zinc-100 flex items-center gap-2 truncate">
              Persona & Karakter AI
              <span
                class="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300"
              >
                {personas.length} Tersedia
              </span>
            </h2>
            <p class="text-[10px] sm:text-[11px] text-zinc-400 truncate">
              Pilih model terikat, sifat, dan custom avatar
            </p>
          </div>
        </div>

        <button
          onclick={onClose}
          class="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition cursor-pointer shrink-0"
          title="Tutup (Esc)"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div
        class="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 pt-2.5 sm:pt-3 border-b border-white/[0.06] text-xs shrink-0 bg-zinc-950/40"
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
          <Sparkles class="w-3.5 h-3.5" />
          <span>Daftar Persona</span>
        </button>

        <button
          type="button"
          onclick={() => {
            if (activeTab === "create" && editingPersonaId) {
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

                        {#if p.preferred_model}
                          <span
                            class="text-[10px] font-mono text-indigo-400 truncate"
                          >
                            {p.preferred_model}
                          </span>
                        {/if}
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
                    <div class="flex items-center gap-1 min-w-0">
                      <span
                        class="text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 truncate max-w-full block"
                        title={p.traits}
                      >
                        {p.traits}
                      </span>
                    </div>
                  {/if}

                  <p
                    class="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed italic"
                  >
                    "{p.system_prompt}"
                  </p>
                </div>

                <div
                  class="flex items-center justify-between pt-2 border-t border-white/[0.06]"
                >
                  {#if isSelected}
                    <span
                      class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400"
                    >
                      <Check class="w-3.5 h-3.5" /> Aktif di Sesi Ini
                    </span>
                  {:else}
                    <button
                      type="button"
                      onclick={() => {
                        onSelectPersona(p);
                        onClose();
                      }}
                      class="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-indigo-600 hover:text-white text-zinc-300 text-xs font-semibold transition cursor-pointer active:scale-95 w-full text-center"
                    >
                      Terapkan di Chat
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <!-- Create / Edit Persona Form -->
          <div class="flex flex-col gap-4 animate-in fade-in duration-200">
            <!-- Edit Mode Header Alert -->
            {#if editingPersonaId}
              <div class="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-between text-xs animate-in fade-in duration-150">
                <div class="flex items-center gap-2 min-w-0">
                  <Pencil class="w-4 h-4 text-indigo-400 shrink-0" />
                  <div class="truncate">
                    <span class="font-bold text-zinc-100">Sedang Mengedit:</span>
                    <span class="text-indigo-300 ml-1 font-semibold truncate">{newName || 'Persona'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onclick={resetForm}
                  class="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition cursor-pointer shrink-0"
                >
                  Batal Edit & Buat Baru
                </button>
              </div>
            {:else}
              <!-- Quick Template Inspiration (Only in Create Mode) -->
              <div class="space-y-1.5">
                <span
                  class="text-xs font-semibold text-zinc-300 flex items-center gap-1.5"
                >
                  <Sparkles class="w-3.5 h-3.5 text-indigo-400" /> Pilih dari Template
                  Cepat (Opsional):
                </span>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {#each templates as tpl}
                    <button
                      type="button"
                      onclick={() => applyTemplate(tpl)}
                      class="p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/[0.06] hover:border-indigo-500/30 text-left transition cursor-pointer group"
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

            <!-- Form Inputs: Nama & Model -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="sm:col-span-2 space-y-1.5">
                <label
                  class="text-xs font-semibold text-zinc-300"
                  for="persona-name">Nama Persona:</label
                >
                <input
                  id="persona-name"
                  type="text"
                  bind:value={newName}
                  placeholder="Contoh: Senior Fullstack Engineer"
                  class="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none placeholder-zinc-500"
                />
              </div>

              <div class="space-y-1.5">
                <label
                  class="text-xs font-semibold text-zinc-300"
                  for="persona-model">Model AI Terikat:</label
                >
                <select
                  id="persona-model"
                  bind:value={newPreferredModel}
                  class="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none cursor-pointer"
                >
                  <option value="gemini-3.8-flash-high"
                    >Gemini 3.8 Flash High</option
                  >
                  <option value="gemini-3.8-flash-medium"
                    >Gemini 3.8 Flash Medium</option
                  >
                  <option value="gemini-3.8-flash-low"
                    >Gemini 3.8 Flash Low</option
                  >
                  <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                  <option value="claude-opus-4-6-thinking"
                    >Claude Opus 4.6</option
                  >
                </select>
              </div>
            </div>

            <!-- Sifat / Karakteristik Persona (Baru!) -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label
                  class="text-xs font-semibold text-zinc-300"
                  for="persona-traits"
                >
                  Sifat & Karakteristik AI:
                </label>
                <span class="text-[10px] text-zinc-500 font-mono"
                  >Menentukan kepribadian & cara merespon</span
                >
              </div>
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
