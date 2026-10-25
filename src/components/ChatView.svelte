<script lang="ts">
  import type { ChatMessage, AppConfig } from '../types';
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
    Check
  } from 'lucide-svelte';

  let {
    messages,
    isBusy,
    config,
    onSendMessage,
    onCancelTask,
    onClearMessages
  }: {
    messages: ChatMessage[];
    isBusy: boolean;
    config: AppConfig | null;
    onSendMessage: (text: string) => void;
    onCancelTask: () => void;
    onClearMessages: () => void;
  } = $props();

  let promptInput = $state('');
  let messagesContainer: HTMLDivElement;

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
          <div class="flex flex-col gap-1.5 {msg.sender === 'user' ? 'items-end' : 'items-start'}">
            <span class="text-[10px] font-mono text-zinc-500 px-1">
              {msg.sender === 'user' ? 'Anda' : 'Antigravity'}
            </span>

            <div class="max-w-[88%] text-xs leading-relaxed {msg.sender === 'user' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-3 rounded-2xl rounded-tr-none shadow-md shadow-indigo-600/20' : 'bg-zinc-900/50 border border-white/[0.07] px-4 py-3.5 rounded-2xl text-zinc-200 w-full'}">
              {#if msg.tools && msg.tools.length > 0}
                <div class="flex flex-wrap gap-1.5 mb-2.5 pb-2 border-b border-white/[0.06]">
                  {#each msg.tools as tool}
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-950 border border-indigo-500/20 text-[10px] font-mono text-indigo-300">
                      <Wrench class="w-2.5 h-2.5 text-indigo-400" /> {tool}
                    </span>
                  {/each}
                </div>
              {/if}

              <div class="whitespace-pre-wrap font-sans text-[13px] leading-relaxed">
                {msg.text}
              </div>

              {#if msg.isStreaming}
                <div class="flex items-center gap-2 mt-3 pt-2 border-t border-white/[0.06] text-xs text-indigo-400 font-mono">
                  <span class="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                  {#if msg.tools && msg.tools.length > 0}
                    <span>Eksekusi: <span class="text-zinc-200">{msg.tools[msg.tools.length - 1]}</span>...</span>
                  {:else}
                    <span>Memproses instruksi & merencanakan tugas...</span>
                  {/if}
                </div>
              {/if}
            </div>
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
