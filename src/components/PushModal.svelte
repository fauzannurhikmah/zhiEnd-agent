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
  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="relative w-full max-w-lg rounded-none flex flex-col bg-[#FCFCFA] border-2 border-[#D0CEC7] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-[#111315] font-tech">
      <!-- 4 Corner Registration Marks -->
      <span class="reg-dot reg-dot-tl"></span>
      <span class="reg-dot reg-dot-tr"></span>
      <span class="reg-dot reg-dot-bl"></span>
      <span class="reg-dot reg-dot-br"></span>

      <!-- Modal Header Seam -->
      <div class="px-4 py-3 border-b border-[#D0CEC7] bg-[#ECEAE5] flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-none bg-[#FF5500] text-white flex items-center justify-center font-bold shadow-xs">
            <UploadCloud class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-xs sm:text-sm font-bold text-[#111315] uppercase tracking-wider">GIT DEPLOYMENT // PUSH</h3>
            <p class="text-[10px] text-[#60646C] font-stencil leading-none mt-0.5">:: SYNCING ACTIVE REPO TO GITHUB</p>
          </div>
        </div>
        <button onclick={onClose} class="text-[#8C9097] hover:text-[#111315] p-1 rounded-none hover:bg-[#E5E3DD] transition cursor-pointer" title="Tutup">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-4 sm:p-5 flex flex-col gap-3 text-xs">
        <!-- Status indicator banner -->
        <div class="flex items-center gap-2.5 p-3 rounded-none border font-stencil text-xs {
          status === 'running' ? 'bg-orange-50 border-orange-300 text-[#FF5500]' :
          status === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
          'bg-rose-50 border-rose-300 text-rose-800'
        }">
          {#if status === 'running'}
            <Loader2 class="w-4 h-4 animate-spin text-[#FF5500] shrink-0" />
            <span class="font-bold">TRANSMITTING COMMITS TO GITHUB REMOTE...</span>
          {:else if status === 'success'}
            <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
            <span class="font-bold">STATUS NOMINAL: REPO BRANCH SYNCHRONIZED.</span>
          {:else}
            <AlertCircle class="w-4 h-4 text-rose-600 shrink-0" />
            <span class="font-bold">PUSH FAILED: RECHECK AUTH & REMOTE PERMISSIONS.</span>
          {/if}
        </div>

        <!-- Output CRT Console -->
        <div class="flex flex-col gap-1.5">
          <span class="text-[10px] text-[#60646C] uppercase tracking-wider font-stencil font-bold flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 bg-[#FF5500]"></span>
            TERMINAL TELEMETRY STREAM:
          </span>
          <div class="relative bg-[#101114] p-3 rounded-none border border-black/50 font-stencil text-[11px] leading-relaxed text-emerald-400 max-h-52 overflow-y-auto crt-screen">
            <!-- Scanline Texture Overlay -->
            <div class="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px]"></div>
            <pre class="whitespace-pre-wrap relative z-10">{outputLogs || 'Memulai proses git push...'}</pre>
          </div>
        </div>

        <button
          onclick={onClose}
          class="btn-hardware w-full h-9 mt-1 rounded-none text-[#111315] font-bold text-xs uppercase tracking-wider cursor-pointer active:scale-95"
        >
          {status === 'running' ? 'BACKGROUND PROCESS' : 'CLOSE TELEMETRY'}
        </button>
      </div>
    </div>
  </div>
{/if}
