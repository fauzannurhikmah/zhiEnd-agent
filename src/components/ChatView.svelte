<script lang="ts">
  import type { ChatMessage, AppConfig, ChatSessionItem } from '../types';
  import { renderMarkdown } from '../services/markdown';
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
    Plus
  } from 'lucide-svelte';

  let {
    messages,
    isBusy,
    config,
    activeSession = null,
    onSendMessage,
    onCancelTask,
    onClearMessages,
    onCreateNewSession
  }: {
    messages: ChatMessage[];
    isBusy: boolean;
    config: AppConfig | null;
    activeSession?: ChatSessionItem | null;
    onSendMessage: (text: string) => void;
    onCancelTask: () => void;
    onClearMessages: () => void;
    onCreateNewSession?: () => void;
  } = $props();

  let promptInput = $state('');
  let messagesContainer: HTMLDivElement;
  let copiedMessageId = $state<string | null>(null);
  let expandedProcesses = $state<Record<string, boolean>>({});
  let prevStreamingStatus = $state<Record<string, boolean>>({});

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

  function handleSend() {
    if (!promptInput.trim() || isBusy) return;
    const text = promptInput.trim();
    promptInput = '';
    onSendMessage(text);
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
  <div class="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-zinc-950/40 backdrop-blur-md z-10 shrink-0 select-none">
    <div class="flex items-center gap-2 min-w-0">
      <MessageSquare class="w-3.5 h-3.5 text-indigo-400 shrink-0" />
      <span class="text-xs font-semibold text-zinc-200 truncate max-w-xs">
        {activeSession?.title || 'Diskusi Aktif'}
      </span>
      <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 border border-white/5 text-zinc-400">
        {activeSession?.workspace_id ? 'Workspace' : 'Global'}
      </span>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={onCreateNewSession}
        class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-indigo-500/40 text-[11px] text-zinc-300 hover:text-indigo-300 transition cursor-pointer"
        title="Mulai sesi baru"
      >
        <Plus class="w-3 h-3 text-indigo-400" />
        <span>Chat Baru</span>
      </button>

      {#if messages.length > 0}
        <button
          type="button"
          onclick={onClearMessages}
          class="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 text-[11px] transition cursor-pointer"
          title="Bersihkan pesan di sesi ini"
        >
          <Trash2 class="w-3 h-3" />
          <span>Bersihkan</span>
        </button>
      {/if}
    </div>
  </div>

  <!-- Content Viewport -->
  <div bind:this={messagesContainer} class="flex-1 overflow-y-auto px-4 py-6">
    {#if messages.length === 0}
      <!-- Empty State: Centered Cinematic Hero -->
      <div class="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center gap-6 animate-in fade-in zoom-in-95 duration-300">
        <div class="flex flex-col gap-2.5">
          <div class="inline-flex items-center justify-center gap-1.5 self-center px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-violet-500/15 border border-indigo-500/30 text-[11px] font-mono text-indigo-300 shadow-sm shadow-indigo-500/10">
            <Sparkles class="w-3.5 h-3.5 text-indigo-400" /> Google Antigravity Core
          </div>
          <h1 class="text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            Ada yang ingin dikerjakan hari ini?
          </h1>
          <p class="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            zhiEnd Agent siap membaca, mengedit file, memperbaiki bug, dan melakukan sinkronisasi GitHub di workspace lokal Anda.
          </p>
        </div>

        <!-- Central Cinematic Prompt Box with Ambient Glow -->
        <div class="w-full bg-zinc-950/80 backdrop-blur-2xl border border-indigo-500/30 hover:border-indigo-500/50 rounded-2xl p-3.5 shadow-2xl shadow-indigo-950/30 flex flex-col gap-3 transition-all focus-within:shadow-[0_0_35px_rgba(99,102,241,0.2)] focus-within:border-indigo-500">
          <textarea
            bind:value={promptInput}
            onkeydown={handleKeyDown}
            placeholder="Tulis instruksi coding Anda (contoh: 'Perbaiki endpoint login', 'Refactor styling navbar', 'Tulis unit test')..."
            rows="3"
            class="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none resize-none leading-relaxed"
          ></textarea>

          <div class="flex items-center justify-between pt-2 border-t border-white/[0.08] text-xs">
            <span class="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5">
              Tekan <kbd class="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">Ctrl + Enter</kbd> untuk kirim
            </span>
            <button
              onclick={handleSend}
              disabled={isBusy || !promptInput.trim()}
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
      <div class="max-w-3xl mx-auto flex flex-col gap-6 pb-24">
        {#each messages as msg (msg.id)}
          <div class="flex flex-col gap-1.5 {msg.sender === 'user' ? 'items-end' : 'items-start'} group">
            <!-- Header Username (No copy button here) -->
            <div class="flex items-center text-[10px] font-mono text-zinc-500 px-1 {msg.sender === 'user' ? 'max-w-[88%]' : 'w-full max-w-[88%]'}">
              <span>{msg.sender === 'user' ? 'Anda' : 'Antigravity'}</span>
            </div>

            <!-- Bubble Content -->
            <div class="{msg.sender === 'user' ? 'max-w-[85%] bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-none shadow-md shadow-indigo-600/20' : 'w-full max-w-[88%] bg-zinc-900/50 border border-white/[0.07] px-4 py-3 rounded-2xl text-zinc-200'} text-xs leading-relaxed">
              
              <!-- Professional Execution & Reasoning Accordion (For Agent Responses) -->
              {#if msg.sender !== 'user' && ((msg.steps && msg.steps.length > 0) || (msg.tools && msg.tools.length > 0) || msg.thought || msg.isStreaming)}
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
                        <Sparkles class="w-3.5 h-3.5 text-indigo-400 animate-spin shrink-0" />
                        <span class="text-xs font-semibold text-indigo-300">
                          Sedang Menganalisis & Mengeksekusi...
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
                            <div class="flex items-center gap-2.5 text-indigo-300/80 text-xs py-1 pl-2">
                              <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping shrink-0"></span>
                              <div class="flex items-center gap-2 flex-1">
                                <span class="text-[11px] font-mono text-zinc-400">Menjalankan instruksi berikutnya...</span>
                                <div class="h-2 w-24 rounded skeleton-shimmer"></div>
                              </div>
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
                        <!-- Skeleton Loader when process just started and no steps/tools/thought yet -->
                        <div class="flex flex-col gap-2.5 py-1">
                          <div class="flex items-center gap-2 text-indigo-300 text-[11px] font-mono">
                            <span class="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                            <span>Menganalisis kode & merencanakan tugas...</span>
                          </div>

                          <div class="space-y-2 pl-3 border-l-2 border-indigo-500/20">
                            <div class="h-2.5 w-4/5 rounded skeleton-shimmer"></div>
                            <div class="h-2.5 w-3/5 rounded skeleton-shimmer"></div>
                            <div class="h-2 w-2/5 rounded skeleton-shimmer"></div>
                          </div>
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/if}

              <!-- Main Message Content -->
              {#if msg.sender === 'user'}
                <div class="whitespace-pre-wrap font-sans text-[13px] leading-relaxed">
                  {msg.text}
                </div>
              {:else}
                <div class="prose-chat font-sans text-[13px] leading-relaxed">
                  {@html renderMarkdown(msg.text)}
                </div>
              {/if}

              <!-- Live Streaming Activity Indicator -->
              {#if msg.isStreaming}
                <div class="flex items-center gap-2 mt-2.5 pt-2 border-t border-white/[0.06] text-xs text-indigo-400 font-mono">
                  <span class="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                  {#if msg.steps && msg.steps.length > 0}
                    <span>Eksekusi aktif: <span class="text-zinc-200 font-semibold">{msg.steps[msg.steps.length - 1].title}</span></span>
                  {:else if msg.tools && msg.tools.length > 0}
                    <span>Eksekusi: <span class="text-zinc-200">{msg.tools[msg.tools.length - 1]}</span>...</span>
                  {:else}
                    <span>Memproses instruksi & merencanakan tugas...</span>
                  {/if}
                </div>
              {/if}

            </div>

            <!-- Action Toolbar OUTSIDE & UNDER the bubble - Only Appears on Hover -->
            {#if msg.text && !msg.isStreaming}
              <div class="flex items-center gap-1 px-1 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 {msg.sender === 'user' ? 'justify-end' : 'justify-start'}">
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
        {/each}
      </div>
    {/if}
  </div>

  <!-- Floating Sticky Bottom Input (Shown when messages exist) -->
  {#if messages.length > 0}
    <div class="absolute bottom-4 inset-x-0 px-4 pointer-events-none">
      <div class="max-w-3xl mx-auto bg-zinc-950/90 backdrop-blur-2xl border border-indigo-500/30 rounded-2xl p-2.5 shadow-2xl shadow-indigo-950/30 pointer-events-auto flex items-end gap-2 focus-within:border-indigo-500">
        <textarea
          bind:value={promptInput}
          onkeydown={handleKeyDown}
          placeholder="Tulis instruksi selanjutnya..."
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
            disabled={isBusy || !promptInput.trim()}
            class="p-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-40 text-white font-bold transition cursor-pointer shadow-md shadow-indigo-500/20 active:scale-95"
          >
            <ArrowUp class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
