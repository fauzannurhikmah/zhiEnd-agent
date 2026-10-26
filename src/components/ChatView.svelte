<script lang="ts">
  import type { ChatMessage, AppConfig, ChatSessionItem, PersonaItem } from '../types';
  import AvatarView from './AvatarView.svelte';
  import { renderMarkdown } from '../services/markdown';
  import { api } from '../services/api';
  import { 
    Send, 
    StopCircle, 
    Trash2, 
    Sparkles, 
    Wrench, 
    ArrowUp, 
    Search, 
    Compass, 
    Bug, 
    GitCommit, 
    Check, 
    Copy, 
    ChevronDown, 
    CheckCircle2, 
    FileCode, 
    Terminal, 
    FileEdit, 
    FileText, 
    MessageSquare, 
    Plus,
    Bot,
    Paperclip,
    Image as ImageIcon,
    X,
    Maximize2,
    Loader2,
    Download
  } from 'lucide-svelte';

  let {
    messages,
    isBusy,
    config,
    activeSession = null,
    activePersona = null,
    onSendMessage,
    onCancelTask,
    onClearMessages,
    onCreateNewSession,
    onOpenPersonaModal
  }: {
    messages: ChatMessage[];
    isBusy: boolean;
    config: AppConfig | null;
    activeSession?: ChatSessionItem | null;
    activePersona?: PersonaItem | null;
    onSendMessage: (text: string, images?: string[]) => void;
    onCancelTask: () => void;
    onClearMessages: () => void;
    onCreateNewSession?: () => void;
    onOpenPersonaModal?: () => void;
  } = $props();

  interface AttachedImage {
    url: string;
    name: string;
    size?: number;
  }

  let promptInput = $state('');
  let messagesContainer: HTMLDivElement;
  let copiedMessageId = $state<string | null>(null);
  let expandedProcesses = $state<Record<string, boolean>>({});
  let prevStreamingStatus = $state<Record<string, boolean>>({});

  // Image Upload & Lightbox state
  let selectedImages = $state<AttachedImage[]>([]);
  let isUploadingImage = $state(false);
  let zoomImageUrl = $state<string | null>(null);
  let fileInputRef = $state<HTMLInputElement | null>(null);
  let isDragging = $state(false);

  function toggleProcess(id: string) {
    const current = isProcessExpanded(id);
    expandedProcesses[id] = !current;
    expandedProcesses = { ...expandedProcesses };
  }

  function isProcessExpanded(id: string, isStreaming?: boolean): boolean {
    if (expandedProcesses[id] !== undefined) {
      return expandedProcesses[id];
    }
    // Default expanded while streaming, collapsible once finished
    return Boolean(isStreaming);
  }

  // Auto-collapse (susutkan) process accordion when AI finishes responding
  $effect(() => {
    for (const msg of messages) {
      if (msg.sender !== 'user') {
        const wasStreaming = prevStreamingStatus[msg.id];
        const isNowStreaming = Boolean(msg.isStreaming);

        if (wasStreaming && !isNowStreaming) {
          // Execution completed: collapse the process panel so user sees answer
          expandedProcesses[msg.id] = false;
          expandedProcesses = { ...expandedProcesses };
        }

        prevStreamingStatus[msg.id] = isNowStreaming;
      }
    }
  });

  async function handleCopy(id: string, text: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copiedMessageId = id;
      setTimeout(() => {
        if (copiedMessageId === id) copiedMessageId = null;
      }, 2000);
    } catch (e) {
      console.error('Failed to copy message:', e);
    }
  }

  async function uploadFiles(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    isUploadingImage = true;
    try {
      for (const file of imageFiles) {
        const res = await api.uploadChatImage(file);
        if (res && res.url) {
          selectedImages = [...selectedImages, {
            url: res.url,
            name: file.name,
            size: file.size
          }];
        }
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      alert(err.message || 'Gagal mengunggah gambar');
    } finally {
      isUploadingImage = false;
      if (fileInputRef) fileInputRef.value = '';
    }
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      uploadFiles(input.files);
    }
  }

  function handlePaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      uploadFiles(imageFiles);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  function removeImage(index: number) {
    selectedImages = selectedImages.filter((_, i) => i !== index);
  }

  function handleSend() {
    const hasText = Boolean(promptInput.trim());
    const hasImages = selectedImages.length > 0;
    if ((!hasText && !hasImages) || isBusy || isUploadingImage) return;

    const text = promptInput.trim();
    const images = selectedImages.map(img => img.url);
    promptInput = '';
    selectedImages = [];
    onSendMessage(text, images);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }

  function setPrompt(val: string) {
    promptInput = val;
    handleSend();
  }

  $effect(() => {
    if (messages.length && messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  const suggestions = [
    {
      title: 'Review Codebase',
      desc: 'Analisis arsitektur, potensi bug, dan performa kode',
      icon: Search,
      iconColor: 'text-indigo-400',
      prompt: 'Lakukan code review mendalam pada project ini, temukan potensi bug, issue keamanan, atau performa.'
    },
    {
      title: 'Jelaskan Alur Project',
      desc: 'Pelajari struktur modul dan alur logika aplikasi',
      icon: Compass,
      iconColor: 'text-sky-400',
      prompt: 'Jelaskan struktur project ini, fungsi utama dari tiap file, dan arsitekturnya.'
    },
    {
      title: 'Cari & Perbaiki Bug',
      desc: 'Identifikasi error dan perbaiki kode secara autonomous',
      icon: Bug,
      iconColor: 'text-amber-400',
      prompt: 'Cari file yang ada error atau warning, lalu perbaiki bug tersebut dan buat kode lebih clean.'
    },
    {
      title: 'Commit & Push GitHub',
      desc: 'Stage file, buat commit pesan rapi, dan push ke remote',
      icon: GitCommit,
      iconColor: 'text-emerald-400',
      prompt: 'Periksa git status, buat commit pesan yang rapi dan deskriptif, lalu push ke origin GitHub.'
    }
  ];
</script>

<div class="h-full flex flex-col justify-between overflow-hidden relative">
  <!-- Top Session Bar -->
  <div class="flex items-center justify-between px-2.5 sm:px-4 py-1.5 sm:py-2 border-b border-white/[0.06] bg-zinc-950/40 backdrop-blur-md z-10 shrink-0 select-none gap-1.5">
    <div class="flex items-center gap-1.5 sm:gap-2 min-w-0">
      <MessageSquare class="w-3.5 h-3.5 text-indigo-400 shrink-0" />
      <span class="text-xs font-semibold text-zinc-200 truncate max-w-[120px] sm:max-w-xs">
        {activeSession?.title || 'Diskusi Aktif'}
      </span>
      <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 border border-white/5 text-zinc-400 hidden sm:inline">
        {activeSession?.workspace_id ? 'Workspace' : 'Global'}
      </span>
    </div>

    <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
      <!-- Active Persona Button -->
      <button
        type="button"
        onclick={onOpenPersonaModal}
        class="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-indigo-500/40 text-[11px] text-zinc-200 hover:text-indigo-300 transition cursor-pointer group shadow-sm max-w-[160px] sm:max-w-[280px]"
        title={`Persona: ${activePersona?.name || 'Default'}${activePersona?.traits ? ` • Sifat: ${activePersona.traits}` : ''}`}
      >
        <AvatarView avatar={activePersona?.avatar} name={activePersona?.name} size="xs" className="rounded-md shrink-0" />
        <span class="font-medium truncate max-w-[90px] sm:max-w-[110px]">{activePersona?.name || 'Default Persona'}</span>
        {#if activePersona?.traits}
          <span 
            class="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 font-mono hidden md:inline truncate max-w-[120px]" 
            title={activePersona.traits}
          >
            {activePersona.traits}
          </span>
        {/if}
        <ChevronDown class="w-3 h-3 text-zinc-500 group-hover:text-indigo-400 transition-transform shrink-0" />
      </button>

      <button
        type="button"
        onclick={onCreateNewSession}
        class="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-indigo-500/40 text-[11px] text-zinc-300 hover:text-indigo-300 transition cursor-pointer"
        title="Mulai sesi baru"
      >
        <Plus class="w-3 h-3 text-indigo-400" />
        <span class="hidden sm:inline">Chat Baru</span>
      </button>

      {#if messages.length > 0}
        <button
          type="button"
          onclick={onClearMessages}
          class="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 text-[11px] transition cursor-pointer"
          title="Bersihkan pesan di sesi ini"
        >
          <Trash2 class="w-3 h-3" />
          <span class="hidden sm:inline">Bersihkan</span>
        </button>
      {/if}
    </div>
  </div>

  <!-- Content Viewport -->
  <div bind:this={messagesContainer} class="flex-1 overflow-y-auto px-2 sm:px-4 py-4 sm:py-6">
    {#if messages.length === 0}
      <!-- Empty State: Centered Cinematic Hero -->
      <div class="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center gap-5 sm:gap-6 animate-in fade-in zoom-in-95 duration-300">
        <div class="flex flex-col gap-2 sm:gap-2.5 px-2">
          <div class="inline-flex items-center justify-center gap-1.5 self-center px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-violet-500/15 border border-indigo-500/30 text-[11px] font-mono text-indigo-300 shadow-sm shadow-indigo-500/10">
            <Sparkles class="w-3.5 h-3.5 text-indigo-400" /> Google Antigravity Core
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            Ada yang ingin dikerjakan hari ini?
          </h1>
          <p class="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            zhiEnd Agent siap membaca, mengedit file, memperbaiki bug, dan melakukan sinkronisasi GitHub di workspace lokal Anda.
          </p>
        </div>

        <!-- Central Cinematic Prompt Box with Ambient Glow -->
        <div 
          role="region"
          aria-label="Kotak Input Prompt"
          class="w-full bg-zinc-950/80 backdrop-blur-2xl border transition-all rounded-2xl p-3.5 shadow-2xl shadow-indigo-950/30 flex flex-col gap-2.5 {isDragging ? 'border-indigo-400 bg-indigo-950/25 ring-2 ring-indigo-500/30' : 'border-indigo-500/30 hover:border-indigo-500/50 focus-within:shadow-[0_0_35px_rgba(99,102,241,0.2)] focus-within:border-indigo-500'}"
          onpaste={handlePaste}
          ondragover={handleDragOver}
          ondragleave={handleDragLeave}
          ondrop={handleDrop}
        >
          <!-- Uploaded Image Chips Preview -->
          {#if selectedImages.length > 0}
            <div class="flex flex-wrap gap-2 px-1 pt-0.5 pb-1">
              {#each selectedImages as img, idx}
                <div class="relative group/chip flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 border border-white/10 text-xs text-zinc-300 shadow-sm animate-in fade-in zoom-in-95 duration-150">
                  <img src={img.url} alt={img.name} class="w-7 h-7 object-cover rounded-lg border border-white/10" />
                  <span class="max-w-[140px] truncate text-[11px] text-zinc-300 font-medium">{img.name}</span>
                  <button
                    type="button"
                    onclick={() => removeImage(idx)}
                    class="p-0.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition cursor-pointer"
                    title="Hapus gambar"
                  >
                    <X class="w-3.5 h-3.5" />
                  </button>
                </div>
              {/each}
              {#if isUploadingImage}
                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/80 border border-indigo-500/30 text-[11px] text-indigo-300">
                  <Loader2 class="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Mengunggah...</span>
                </div>
              {/if}
            </div>
          {/if}

          <textarea
            bind:value={promptInput}
            onkeydown={handleKeyDown}
            placeholder="Tulis instruksi coding Anda (atau paste screenshot gambar langsung dengan Ctrl+V)..."
            rows="3"
            class="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none resize-none leading-relaxed"
          ></textarea>

          <div class="flex items-center justify-between pt-2 border-t border-white/[0.08] text-xs">
            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick={() => fileInputRef?.click()}
                disabled={isBusy || isUploadingImage}
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 hover:border-indigo-500/40 text-[11px] text-zinc-300 hover:text-indigo-300 transition cursor-pointer disabled:opacity-40"
                title="Unggah Gambar atau Screenshot (atau paste langsung)"
              >
                {#if isUploadingImage}
                  <Loader2 class="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Mengunggah...</span>
                {:else}
                  <Paperclip class="w-3.5 h-3.5 text-zinc-400" />
                  <span>Lampirkan Gambar</span>
                {/if}
              </button>
              <span class="text-[11px] text-zinc-500 font-mono hidden sm:inline">
                Tekan <kbd class="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">Ctrl + Enter</kbd>
              </span>
            </div>

            <button
              onclick={handleSend}
              disabled={isBusy || isUploadingImage || (!promptInput.trim() && selectedImages.length === 0)}
              class="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 transition cursor-pointer active:scale-95"
            >
              <span>Kirim</span>
              <ArrowUp class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Suggestion Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left pt-1">
          {#each suggestions as s}
            <button
              onclick={() => setPrompt(s.prompt)}
              class="p-3.5 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/90 border border-white/[0.06] hover:border-indigo-500/30 flex flex-col gap-1 transition text-left cursor-pointer group hover:shadow-lg hover:shadow-indigo-950/20"
            >
              <div class="flex items-center gap-2 text-xs font-semibold text-zinc-200 group-hover:text-white">
                <s.icon class="w-4 h-4 {s.iconColor} group-hover:scale-110 transition-transform" />
                <span>{s.title}</span>
              </div>
              <p class="text-[11px] text-zinc-500 leading-snug">{s.desc}</p>
            </button>
          {/each}
        </div>
      </div>
    {:else}
      <!-- Active Messages Stream -->
      <div class="max-w-3xl mx-auto flex flex-col gap-5 sm:gap-6 pb-36 sm:pb-28">
        {#each messages as msg (msg.id)}
          {#if msg.sender === 'user'}
            <div class="flex flex-col gap-1.5 items-end group">
              <!-- Header Username -->
              <div class="flex items-center text-[10px] font-mono text-zinc-500 px-1">
                <span>Anda</span>
              </div>

              <!-- User Bubble Content -->
              <div class="max-w-[92%] sm:max-w-[85%] bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl rounded-tr-none shadow-md shadow-indigo-600/20 text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap font-sans">
                {msg.text}
              </div>

              <!-- User Attached Images Gallery -->
              {#if msg.images && msg.images.length > 0}
                <div class="flex flex-wrap gap-2 max-w-[85%] justify-end mt-1">
                  {#each msg.images as imgUrl}
                    <button
                      type="button"
                      onclick={() => zoomImageUrl = imgUrl}
                      class="group/thumb relative rounded-xl overflow-hidden border border-white/10 hover:border-indigo-400/60 shadow-md bg-zinc-900 cursor-zoom-in max-w-[220px] max-h-[160px] transition"
                    >
                      <img src={imgUrl} alt="Lampiran" class="w-full h-full object-cover group-hover/thumb:scale-105 transition duration-200" />
                      <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition">
                        <Maximize2 class="w-4 h-4 text-white drop-shadow" />
                      </div>
                    </button>
                  {/each}
                </div>
              {/if}

              <!-- Action Toolbar for User Bubble -->
              {#if msg.text && !msg.isStreaming}
                <div class="flex items-center gap-1 px-1 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 justify-end">
                  <button
                    type="button"
                    onclick={() => handleCopy(msg.id, msg.text)}
                    class="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 px-1.5 py-0.5 rounded hover:bg-zinc-800/60 transition cursor-pointer"
                    title="Salin teks"
                  >
                    {#if copiedMessageId === msg.id}
                      <Check class="w-3 h-3 text-emerald-400" />
                      <span class="text-emerald-400 text-[10px] font-medium">Tersalin!</span>
                    {:else}
                      <Copy class="w-3 h-3 text-zinc-400 hover:text-zinc-200" />
                      <span class="text-[10px]">Salin</span>
                    {/if}
                  </button>
                </div>
              {/if}
            </div>
          {:else}
            <!-- Agent Message with Custom Avatar (Video/GIF/Image/Emoji) & Traits -->
            <div class="flex items-start gap-2.5 sm:gap-3 group w-full">
              <!-- Avatar Persona -->
              <div class="shrink-0 mt-0.5">
                <AvatarView
                  avatar={activePersona?.avatar}
                  name={activePersona?.name}
                  size="md"
                  className="rounded-2xl ring-2 ring-indigo-500/20 shadow-md shadow-indigo-950/40"
                />
              </div>

              <div class="flex-1 flex flex-col gap-1.5 min-w-0 max-w-[96%] sm:max-w-[92%]">
                <!-- Header Username, Traits & Model -->
                <div class="flex items-center gap-2 text-[10px] font-mono text-zinc-400 px-1 min-w-0">
                  <span class="font-bold text-zinc-200 truncate shrink-0 max-w-[120px] sm:max-w-[200px]" title={activePersona?.name || 'zhiEnd Assistant'}>
                    {activePersona?.name || 'zhiEnd Assistant'}
                  </span>
                  {#if activePersona?.traits}
                    <span 
                      class="text-[9px] px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 font-sans truncate max-w-[140px] sm:max-w-[280px] md:max-w-[360px]"
                      title={`Sifat & Karakteristik: ${activePersona.traits}`}
                    >
                      {activePersona.traits}
                    </span>
                  {/if}
                  {#if activePersona?.preferred_model}
                    <span class="text-[9px] text-zinc-500 font-mono hidden md:inline shrink-0">
                      {activePersona.preferred_model}
                    </span>
                  {/if}
                </div>

                <!-- Agent Bubble Content -->
                <div class="w-full bg-zinc-900/50 border border-white/[0.07] px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-zinc-200 text-xs leading-relaxed shadow-sm">
                  <!-- Professional Execution & Reasoning Accordion (For Agent Responses) -->
                  {#if (msg.steps && msg.steps.length > 0) || (msg.tools && msg.tools.length > 0) || msg.thought || msg.isStreaming}
                    {@const isExp = isProcessExpanded(msg.id, msg.isStreaming)}
                    <div class="mb-3 rounded-xl border transition-all duration-200 overflow-hidden {isExp ? 'border-indigo-500/25 bg-zinc-950/70 shadow-lg shadow-indigo-950/20' : 'border-white/[0.06] bg-zinc-900/40 hover:border-white/[0.12]'}">
                      <!-- Accordion Header Button -->
                      <button
                        type="button"
                        onclick={() => toggleProcess(msg.id)}
                        class="w-full flex items-center justify-between px-3 {isExp ? 'py-2 bg-zinc-900/70' : 'py-1.5 bg-zinc-900/35'} hover:bg-zinc-900/90 transition-all cursor-pointer text-left select-none"
                      >
                        <div class="flex items-center gap-2 min-w-0">
                          {#if msg.isStreaming}
                            <div class="relative flex items-center justify-center w-2.5 h-2.5 shrink-0">
                              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60"></span>
                              <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-400"></span>
                            </div>
                            <span class="text-xs font-medium text-indigo-300">
                              Sedang Memproses...
                            </span>
                          {:else}
                            <CheckCircle2 class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span class="text-xs font-medium text-zinc-300">
                              Proses & Eksekusi Selesai
                            </span>
                          {/if}
                          <span class="text-[10px] font-mono text-zinc-400 px-1.5 py-0.2 rounded bg-zinc-800/80 border border-white/5">
                            {(msg.steps?.length || msg.tools?.length || 1)} aktivitas
                          </span>
                        </div>

                        <div class="flex items-center gap-1.5 text-zinc-400">
                          <span class="text-[10px] font-sans text-zinc-500">
                            {isExp ? 'Sembunyikan' : 'Detail'}
                          </span>
                          <ChevronDown class="w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 {isExp ? 'rotate-180' : ''}" />
                        </div>
                      </button>

                      <!-- Accordion Body -->
                      {#if isExp}
                        <div class="p-3 border-t border-white/[0.06] flex flex-col gap-2.5 text-xs bg-zinc-950/40 animate-in fade-in duration-150">
                          <!-- Reasoning / Thinking Box -->
                          {#if msg.thought}
                            <div class="p-2.5 rounded-lg bg-indigo-950/25 border border-indigo-500/25 text-zinc-300 italic text-[11px] leading-relaxed flex gap-2">
                              <Sparkles class="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                              <div class="flex flex-col gap-0.5">
                                <span class="text-[10px] font-semibold text-indigo-300 not-italic font-mono uppercase tracking-wider">
                                  Reasoning & Analisis
                                </span>
                                <span>{msg.thought}</span>
                              </div>
                            </div>
                          {/if}

                          <!-- Detailed Step Timeline -->
                          {#if msg.steps && msg.steps.length > 0}
                            <div class="space-y-1.5 pl-1 border-l-2 border-indigo-500/20 ml-2">
                              {#each msg.steps as st}
                                <div class="flex items-start gap-2.5 text-zinc-300 text-xs py-0.5 pl-2">
                                  <span class="w-1.5 h-1.5 rounded-full {st.type === 'edit' || st.type === 'write' ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : st.type === 'run' ? 'bg-indigo-400' : 'bg-sky-400'} mt-1.5 shrink-0"></span>

                                  <div class="flex-1 flex flex-col min-w-0">
                                    <div class="flex items-center gap-1.5 flex-wrap">
                                      <span class="font-semibold text-zinc-200">{st.title}</span>

                                      {#if st.file}
                                        <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-zinc-900 border border-white/10 text-[10px] font-mono text-zinc-300">
                                          <FileCode class="w-2.5 h-2.5 text-indigo-400" /> {st.file}
                                        </span>
                                      {/if}

                                      {#if st.lines}
                                        <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/25 text-[10px] font-mono text-amber-300 font-semibold">
                                          {st.lines}
                                        </span>
                                      {/if}

                                      {#if st.command}
                                        <code class="px-1.5 py-0.2 rounded bg-zinc-900 border border-white/10 text-[10px] font-mono text-indigo-300 max-w-sm truncate">
                                          {st.command}
                                        </code>
                                      {/if}

                                      {#if st.repeatCount && st.repeatCount > 1}
                                        <span class="inline-flex items-center px-1.5 py-0.2 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[9px] font-mono font-bold text-indigo-300" title={`Perintah dijalankan ${st.repeatCount} kali`}>
                                          ×{st.repeatCount}
                                        </span>
                                      {/if}
                                    </div>

                                    {#if st.instruction}
                                      <p class="text-[11px] text-zinc-400 italic mt-0.5">{st.instruction}</p>
                                    {:else if st.detail && st.detail !== st.command}
                                      <p class="text-[11px] text-zinc-500 mt-0.5">{st.detail}</p>
                                    {/if}
                                  </div>
                                </div>
                              {/each}

                              <!-- Active in-progress indicator while streaming -->
                              {#if msg.isStreaming}
                                <div class="flex items-center gap-2 text-zinc-500 text-[11px] py-0.5 pl-2">
                                  <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0"></span>
                                  <span class="font-sans">Melanjutkan langkah berikutnya...</span>
                                </div>
                              {/if}
                            </div>
                          {:else if msg.tools && msg.tools.length > 0}
                            <div class="flex flex-wrap gap-1.5">
                              {#each msg.tools as tool}
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-indigo-500/20 text-[10px] font-mono text-indigo-300">
                                  <Wrench class="w-2.5 h-2.5 text-indigo-400" /> {tool}
                                </span>
                              {/each}
                            </div>
                          {:else if msg.isStreaming}
                            <!-- Minimalist Loading Indicator -->
                            <div class="flex items-center gap-2.5 py-1 text-zinc-400">
                              <div class="flex gap-1 items-center">
                                <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]"></span>
                                <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]"></span>
                                <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
                              </div>
                              <span class="text-[11px] text-zinc-400 font-sans">Menganalisis & merencanakan tugas...</span>
                            </div>
                          {/if}
                        </div>
                      {/if}
                    </div>
                  {/if}

                  <!-- Main Message Content -->
                  <div class="prose-chat font-sans text-[13px] leading-relaxed">
                    {@html renderMarkdown(msg.text)}
                    {#if msg.isStreaming && msg.text}
                      <span class="inline-block w-1.5 h-3.5 bg-indigo-400 animate-pulse align-middle ml-0.5 rounded-xs"></span>
                    {/if}
                  </div>

                  <!-- Agent Attached Images Gallery (if any) -->
                  {#if msg.images && msg.images.length > 0}
                    <div class="flex flex-wrap gap-2 mt-2 pt-2 border-t border-white/[0.06]">
                      {#each msg.images as imgUrl}
                        <button
                          type="button"
                          onclick={() => zoomImageUrl = imgUrl}
                          class="group/thumb relative rounded-xl overflow-hidden border border-white/10 hover:border-indigo-400/60 shadow-md bg-zinc-900 cursor-zoom-in max-w-[220px] max-h-[160px] transition"
                        >
                          <img src={imgUrl} alt="Lampiran" class="w-full h-full object-cover group-hover/thumb:scale-105 transition duration-200" />
                          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition">
                            <Maximize2 class="w-4 h-4 text-white drop-shadow" />
                          </div>
                        </button>
                      {/each}
                    </div>
                  {/if}

                </div>

                <!-- Action Toolbar OUTSIDE & UNDER the bubble - Only Appears on Hover -->
                {#if msg.text && !msg.isStreaming}
                  <div class="flex items-center gap-1 px-1 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 justify-start">
                    <button
                      type="button"
                      onclick={() => handleCopy(msg.id, msg.text)}
                      class="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 px-1.5 py-0.5 rounded hover:bg-zinc-800/60 transition cursor-pointer"
                      title="Salin teks"
                    >
                      {#if copiedMessageId === msg.id}
                        <Check class="w-3 h-3 text-emerald-400" />
                        <span class="text-emerald-400 text-[10px] font-medium">Tersalin!</span>
                      {:else}
                        <Copy class="w-3 h-3 text-zinc-400 hover:text-zinc-200" />
                        <span class="text-[10px]">Salin</span>
                      {/if}
                    </button>
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>

  <!-- Floating Sticky Bottom Input (Shown when messages exist) -->
  {#if messages.length > 0}
    <div class="absolute bottom-16 sm:bottom-4 inset-x-0 px-2 sm:px-4 pointer-events-none z-20">
      <div 
        role="region"
        aria-label="Kotak Input Mengambang"
        class="max-w-3xl mx-auto bg-zinc-950/95 backdrop-blur-2xl border transition-all rounded-2xl p-2 sm:p-2.5 shadow-2xl shadow-indigo-950/30 pointer-events-auto flex flex-col gap-2 {isDragging ? 'border-indigo-400 bg-indigo-950/25 ring-2 ring-indigo-500/30' : 'border-indigo-500/30 focus-within:border-indigo-500'}"
        onpaste={handlePaste}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
      >
        <!-- Uploaded Image Chips Preview -->
        {#if selectedImages.length > 0}
          <div class="flex flex-wrap gap-2 px-1 pt-0.5 pb-0.5">
            {#each selectedImages as img, idx}
              <div class="relative group/chip flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 border border-white/10 text-xs text-zinc-300 shadow-sm animate-in fade-in zoom-in-95 duration-150">
                <img src={img.url} alt={img.name} class="w-6 h-6 object-cover rounded-lg border border-white/10" />
                <span class="max-w-[120px] truncate text-[11px] text-zinc-300 font-medium">{img.name}</span>
                <button
                  type="button"
                  onclick={() => removeImage(idx)}
                  class="p-0.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition cursor-pointer"
                  title="Hapus gambar"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
            {/each}
            {#if isUploadingImage}
              <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900/80 border border-indigo-500/30 text-[11px] text-indigo-300">
                <Loader2 class="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Mengunggah...</span>
              </div>
            {/if}
          </div>
        {/if}

        <div class="flex items-end gap-2 w-full">
          <!-- Attachment Button -->
          <button
            type="button"
            onclick={() => fileInputRef?.click()}
            disabled={isBusy || isUploadingImage}
            class="p-2 rounded-xl text-zinc-400 hover:text-indigo-300 hover:bg-zinc-900 transition cursor-pointer shrink-0 disabled:opacity-40"
            title="Lampirkan Gambar (atau paste / drag & drop)"
          >
            {#if isUploadingImage}
              <Loader2 class="w-4 h-4 animate-spin text-indigo-400" />
            {:else}
              <Paperclip class="w-4 h-4" />
            {/if}
          </button>

          <textarea
            bind:value={promptInput}
            onkeydown={handleKeyDown}
            placeholder="Tulis instruksi selanjutnya... (atau paste screenshot gambar langsung)"
            rows="1"
            class="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 outline-none resize-none px-2 py-1.5"
          ></textarea>

          <div class="flex items-center gap-1.5 shrink-0">
            {#if isBusy}
              <button
                onclick={onCancelTask}
                class="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                title="Hentikan Task"
              >
                <StopCircle class="w-4 h-4" />
              </button>
            {/if}

            <button
              onclick={onClearMessages}
              class="p-2 rounded-xl hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
              title="Bersihkan Percakapan"
            >
              <Trash2 class="w-4 h-4" />
            </button>

            <button
              onclick={handleSend}
              disabled={isBusy || isUploadingImage || (!promptInput.trim() && selectedImages.length === 0)}
              class="p-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-40 text-white font-bold transition cursor-pointer shadow-md shadow-indigo-500/20 active:scale-95"
            >
              <ArrowUp class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Hidden File Input for Image Uploads -->
  <input
    type="file"
    accept="image/*"
    multiple
    bind:this={fileInputRef}
    onchange={handleFileSelect}
    class="hidden"
  />

  <!-- Lightbox Modal for Zooming Images -->
  {#if zoomImageUrl}
    <div 
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onclick={() => zoomImageUrl = null}
      onkeydown={(e) => { if (e.key === 'Escape') zoomImageUrl = null; }}
    >
      <div 
        role="document"
        class="relative max-w-4xl max-h-[90vh] bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-zinc-900/80">
          <span class="text-xs font-mono text-zinc-300 truncate max-w-md">{zoomImageUrl.split('/').pop()}</span>
          <div class="flex items-center gap-2">
            <a
              href={zoomImageUrl}
              target="_blank"
              download
              class="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
              title="Buka / Unduh gambar"
            >
              <Download class="w-4 h-4" />
            </a>
            <button
              type="button"
              onclick={() => zoomImageUrl = null}
              class="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition"
              title="Tutup"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>
        <!-- Modal Image -->
        <div class="p-2 overflow-auto flex items-center justify-center max-h-[calc(90vh-50px)]">
          <img src={zoomImageUrl} alt="Pratinjau Gambar" class="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      </div>
    </div>
  {/if}
</div>
