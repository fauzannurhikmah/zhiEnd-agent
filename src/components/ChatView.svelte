<script lang="ts">
  import type { ChatMessage, AppConfig } from '../types';
  import { Bot, User, Send, StopCircle, Trash2, Sparkles, CheckCircle2, AlertCircle, Wrench, Terminal } from 'lucide-svelte';

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
  }

  // Auto-scroll when messages update
  $effect(() => {
    if (messages.length && messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  const quickChips = [
    { label: 'Review Code', icon: '🔍', prompt: 'Lakukan code review mendalam pada project ini, temukan potensi bug, issue keamanan, atau performa.' },
    { label: 'Jelaskan Project', icon: '🧭', prompt: 'Jelaskan struktur project ini, fungsi utama dari tiap file, dan arsitekturnya.' },
    { label: 'Cari & Fix Bug', icon: '🐛', prompt: 'Cari file yang ada error atau warning, lalu perbaiki bug tersebut dan buat kode lebih clean.' },
    { label: 'Buat Tests', icon: '🧪', prompt: 'Buatkan unit test atau testing script yang relevan untuk file utama pada project ini.' },
    { label: 'Commit & Push', icon: '🚀', prompt: 'Periksa git status, buat commit pesan yang rapi dan deskriptif, lalu push ke origin GitHub.' }
  ];
</script>

<div class="flex flex-col h-full gap-3 overflow-hidden">
  <!-- Messages Scroll Area -->
  <div bind:this={messagesContainer} class="flex-1 overflow-y-auto pr-2 flex flex-col gap-3.5">
    
    <!-- Welcome Card -->
    <div class="glass-panel p-5 rounded-2xl flex flex-col gap-3.5 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-indigo-950/20 border border-slate-800/80">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 text-2xl">
          🤖
        </div>
        <div>
          <h2 class="text-base font-bold text-white flex items-center gap-2">
            zhiEnd AI Coding Agent
            <span class="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">Antigravity Core</span>
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">
            Asisten AI autonomous yang siap membantu eksplorasi, penulisan kode, debugging, dan sinkronisasi GitHub di project <code class="text-indigo-300 font-mono">{config?.activeProject || 'lokal'}</code>.
          </p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 text-[11px] pt-1">
        <span class="px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-300 flex items-center gap-1.5">
          <CheckCircle2 class="w-3.5 h-3.5 text-emerald-400" /> Auto-Edit File & Terminal
        </span>
        <span class="px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-300 flex items-center gap-1.5">
          <CheckCircle2 class="w-3.5 h-3.5 text-emerald-400" /> Remote WhatsApp & Telegram
        </span>
        <span class="px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-300 flex items-center gap-1.5">
          <CheckCircle2 class="w-3.5 h-3.5 text-emerald-400" /> Git Sync & Push
        </span>
      </div>
    </div>

    <!-- Messages List -->
    {#each messages as msg (msg.id)}
      <div class="flex flex-col {msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-[92%] {msg.sender === 'user' ? 'self-end' : 'self-start w-full'}">
        <div class="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400 font-mono">
          {#if msg.sender === 'user'}
            <span>Anda</span> <User class="w-3 h-3 text-indigo-400" />
          {:else}
            <Bot class="w-3 h-3 text-violet-400" /> <span>Antigravity</span>
          {/if}
        </div>

        <div class="p-3.5 rounded-xl text-xs leading-relaxed {msg.sender === 'user' ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-none shadow-md shadow-indigo-600/20' : 'glass-panel text-slate-200 rounded-bl-none border border-slate-800/80 shadow-md shadow-black/30 w-full'}">
          {#if msg.tools && msg.tools.length > 0}
            <div class="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-slate-800">
              {#each msg.tools as tool}
                <span class="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1">
                  <Wrench class="w-2.5 h-2.5" /> {tool}
                </span>
              {/each}
            </div>
          {/if}

          <div class="whitespace-pre-wrap font-sans">
            {msg.text}
          </div>

          {#if msg.isStreaming}
            <div class="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/60 text-[11px] text-violet-400 font-mono">
              <span class="w-2 h-2 rounded-full bg-violet-400 animate-ping"></span>
              Sedang memproses instruksi...
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- Bottom Input & Quick Actions Area -->
  <div class="glass-panel p-3 rounded-xl flex flex-col gap-2.5 border border-slate-800/80 shadow-lg shadow-black/40">
    <!-- Quick Action Chips -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1">
      {#each quickChips as chip}
        <button
          onclick={() => setPrompt(chip.prompt)}
          class="shrink-0 flex items-center gap-1.5 bg-slate-800/50 hover:bg-indigo-500/15 hover:border-indigo-500/40 border border-slate-700/60 text-slate-300 hover:text-indigo-200 px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer"
        >
          <span>{chip.icon}</span>
          <span>{chip.label}</span>
        </button>
      {/each}
    </div>

    <!-- Textarea bar -->
    <div class="flex items-end gap-2">
      <textarea
        bind:value={promptInput}
        onkeydown={handleKeyDown}
        placeholder="Tulis instruksi coding Anda (contoh: 'Perbaiki bug di navbar', 'Buatkan route baru di server', 'Commit & push')..."
        rows="2"
        class="flex-1 bg-slate-900/80 border border-slate-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none resize-none transition"
      ></textarea>

      <div class="flex items-center gap-1.5 shrink-0">
        {#if isBusy}
          <button
            onclick={onCancelTask}
            class="p-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 transition cursor-pointer"
            title="Batalkan Tugas Agent"
          >
            <StopCircle class="w-4 h-4" />
          </button>
        {/if}

        <button
          onclick={onClearMessages}
          class="p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/70 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          title="Bersihkan Percakapan"
        >
          <Trash2 class="w-4 h-4" />
        </button>

        <button
          onclick={handleSend}
          disabled={isBusy || !promptInput.trim()}
          class="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer active:scale-95"
        >
          <span>Kirim</span>
          <Send class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Status footer -->
    <div class="flex items-center justify-between text-[10px] text-slate-500 px-1 font-mono">
      <span class="flex items-center gap-1.5">
        {#if isBusy}
          <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span class="text-amber-400 font-semibold">Agent sedang memproses...</span>
        {:else}
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Standby & Ready</span>
        {/if}
      </span>
      <span>Tekan <kbd class="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">Ctrl</kbd> + <kbd class="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">Enter</kbd> untuk kirim</span>
    </div>
  </div>
</div>
