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
      desc: 'Analisis mendalam arsitektur, potensi bug, dan performa kode',
      icon: Search,
      prompt: 'Lakukan code review mendalam pada project ini, temukan potensi bug, issue keamanan, atau performa.'
    },
    {
      title: 'Jelaskan Alur Project',
      desc: 'Pelajari struktur modul, dependensi, dan logika utama aplikasi',
      icon: Compass,
      prompt: 'Jelaskan struktur project ini, fungsi utama dari tiap file, dan arsitekturnya.'
    },
    {
      title: 'Cari & Perbaiki Bug',
      desc: 'Identifikasi error dan perbaiki kode secara autonomous',
      icon: Bug,
      prompt: 'Cari file yang ada error atau warning, lalu perbaiki bug tersebut dan buat kode lebih clean.'
    },
    {
      title: 'Commit & Push GitHub',
      desc: 'Stage file berubah, buat commit pesan rapi, dan push ke remote',
      icon: GitCommit,
      prompt: 'Periksa git status, buat commit pesan yang rapi dan deskriptif, lalu push ke origin GitHub.'
    }
  ];
</script>

<div class="h-full flex flex-col justify-between overflow-hidden relative">
  <!-- Content Viewport -->
  <div bind:this={messagesContainer} class="flex-1 overflow-y-auto px-4 py-6">
    {#if messages.length === 0}
      <!-- Empty State: Centered Minimalist Hero (Linear Style) -->
      <div class="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center gap-6 animate-in fade-in duration-300">
        <div class="flex flex-col gap-2">
          <div class="inline-flex items-center justify-center gap-1.5 self-center px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
            <Sparkles class="w-3 h-3 text-zinc-300" /> Antigravity 1.4.7
          </div>
          <h1 class="text-2xl font-semibold tracking-tight text-zinc-100">
            Ada yang bisa dibantu untuk project ini?
          </h1>
          <p class="text-xs text-zinc-400 max-w-md mx-auto">
            zhiEnd Agent siap membaca, mengedit file, menjalankan perintah shell, hingga melakukan push ke GitHub.
          </p>
        </div>

        <!-- Central Hero Prompt Box -->
        <div class="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 shadow-xl flex flex-col gap-3 transition-colors focus-within:border-zinc-700">
          <textarea
            bind:value={promptInput}
            onkeydown={handleKeyDown}
            placeholder="Tulis instruksi coding Anda (contoh: 'Perbaiki endpoint login', 'Refactor styling navbar', 'Tulis unit test')..."
            rows="3"
            class="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none resize-none"
          ></textarea>

          <div class="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-xs">
            <span class="text-[11px] text-zinc-500 font-mono">
              Tekan <kbd class="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">Ctrl + Enter</kbd>
            </span>
            <button
              onclick={handleSend}
              disabled={isBusy || !promptInput.trim()}
              class="px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
            >
              <span>Kirim</span>
              <ArrowUp class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Suggestion Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left pt-2">
          {#each suggestions as s}
            <button
              onclick={() => setPrompt(s.prompt)}
              class="p-3 rounded-xl bg-zinc-900/40 hover:bg-zinc-900/90 border border-zinc-800/60 hover:border-zinc-700 flex flex-col gap-1 transition text-left cursor-pointer group"
            >
              <div class="flex items-center gap-2 text-xs font-semibold text-zinc-200 group-hover:text-white">
                <s.icon class="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200" />
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

            <div class="max-w-[88%] text-xs leading-relaxed {msg.sender === 'user' ? 'bg-zinc-800 text-zinc-100 px-4 py-3 rounded-2xl rounded-tr-none' : 'text-zinc-200 w-full'}">
              {#if msg.tools && msg.tools.length > 0}
                <div class="flex flex-wrap gap-1.5 mb-2.5">
                  {#each msg.tools as tool}
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400">
                      <Wrench class="w-2.5 h-2.5 text-zinc-500" /> {tool}
                    </span>
                  {/each}
                </div>
              {/if}

              <div class="whitespace-pre-wrap font-sans text-[13px] leading-relaxed">
                {msg.text}
              </div>

              {#if msg.isStreaming}
                <div class="flex items-center gap-2 mt-3 text-xs text-zinc-400 font-mono">
                  <span class="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse"></span>
                  Memproses instruksi...
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
      <div class="max-w-3xl mx-auto bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-xl p-2 shadow-2xl pointer-events-auto flex items-end gap-2">
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
              class="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer"
              title="Hentikan Task"
            >
              <StopCircle class="w-4 h-4" />
            </button>
          {/if}

          <button
            onclick={onClearMessages}
            class="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
            title="Bersihkan Percakapan"
          >
            <Trash2 class="w-4 h-4" />
          </button>

          <button
            onclick={handleSend}
            disabled={isBusy || !promptInput.trim()}
            class="p-2 rounded-lg bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-950 font-bold transition cursor-pointer"
          >
            <ArrowUp class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
