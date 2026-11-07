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
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="w-full max-w-lg rounded-2xl flex flex-col bg-[#FCFCFA] border border-[#D0CEC7] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-[#191B1D]">
      <div class="px-5 py-4 border-b border-[#D0CEC7] bg-[#ECEAE5] flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-orange-100 text-[#FF5500] border border-orange-300 flex items-center justify-center font-bold">
            <UploadCloud class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-[#191B1D]">Git Push ke GitHub</h3>
            <p class="text-[11px] text-[#5C6066]">Sinkronisasi branch aktif ke remote repository</p>
          </div>
        </div>
        <button onclick={onClose} class="text-[#8C9097] hover:text-[#191B1D] p-1 rounded-lg hover:bg-[#E5E3DD] cursor-pointer">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-5 flex flex-col gap-3 text-xs">
        <!-- Status indicator -->
        <div class="flex items-center gap-3 p-3 rounded-xl border {status === 'running' ? 'bg-orange-50 border-orange-300 text-[#FF5500]' : (status === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800')}">
          {#if status === 'running'}
            <Loader2 class="w-5 h-5 animate-spin text-[#FF5500]" />
            <span class="font-bold">Sedang melakukan push ke remote origin...</span>
          {:else if status === 'success'}
            <CheckCircle2 class="w-5 h-5 text-emerald-600" />
            <span class="font-bold">Berhasil! Branch telah terdorong ke GitHub.</span>
          {:else}
            <AlertCircle class="w-5 h-5 text-rose-600" />
            <span class="font-bold">Push gagal. Periksa credential atau status remote.</span>
          {/if}
        </div>

        <!-- Output logs -->
        <div class="flex flex-col gap-1">
          <span class="text-[10px] text-[#5C6066] uppercase tracking-wider font-mono font-bold">Output Console:</span>
          <pre class="bg-[#ECEAE5] p-3 rounded-lg border border-[#D0CEC7] font-mono text-[11px] leading-relaxed text-[#191B1D] max-h-48 overflow-y-auto whitespace-pre-wrap">{outputLogs || 'Memulai proses git push...'}</pre>
        </div>

        <button
          onclick={onClose}
          class="btn-hardware w-full mt-2 py-2 rounded-lg text-[#191B1D] font-bold text-xs cursor-pointer"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
{/if}
