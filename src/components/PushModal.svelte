<script lang="ts">
  import { UploadCloud, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-svelte';

  let {
    isOpen,
    isPushing,
    status,
    outputLogs,
    onClose
  }: {
    isOpen: boolean;
    isPushing: boolean;
    status: 'idle' | 'running' | 'success' | 'error';
    outputLogs: string;
    onClose: () => void;
  } = $props();

  // Trigger celebration confetti on success
  $effect(() => {
    if (status === 'success' && typeof (window as any).confetti === 'function') {
      (window as any).confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  });
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
    <div class="glass-panel w-full max-w-lg rounded-2xl flex flex-col border border-slate-700/80 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div class="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <UploadCloud class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Git Push ke GitHub</h3>
            <p class="text-[11px] text-slate-400">Sinkronisasi branch aktif ke remote repository</p>
          </div>
        </div>
        <button onclick={onClose} class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-5 flex flex-col gap-3 text-xs">
        <!-- Status indicator -->
        <div class="flex items-center gap-3 p-3 rounded-xl border {status === 'running' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : (status === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300')}">
          {#if status === 'running'}
            <Loader2 class="w-5 h-5 animate-spin text-indigo-400" />
            <span class="font-semibold">Sedang melakukan push ke remote origin...</span>
          {:else if status === 'success'}
            <CheckCircle2 class="w-5 h-5 text-emerald-400" />
            <span class="font-bold">Berhasil! Branch telah terdorong ke GitHub.</span>
          {:else}
            <AlertCircle class="w-5 h-5 text-rose-400" />
            <span class="font-bold">Push gagal. Periksa credential atau status remote.</span>
          {/if}
        </div>

        <!-- Output logs -->
        <div class="flex flex-col gap-1">
          <span class="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-bold">Output Console:</span>
          <pre class="bg-slate-950 p-3 rounded-lg border border-slate-900 font-mono text-[11px] leading-relaxed text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap">{outputLogs || 'Memulai proses git push...'}</pre>
        </div>

        <button
          onclick={onClose}
          class="w-full mt-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs cursor-pointer"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
{/if}
