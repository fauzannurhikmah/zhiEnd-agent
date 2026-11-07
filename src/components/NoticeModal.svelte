<script lang="ts">
  import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-svelte';
  import { dialog } from '../services/dialog.svelte';

  function handleKeyDown(e: KeyboardEvent) {
    if (!dialog.notice.isOpen) return;
    if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault();
      dialog.closeNotice();
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if dialog.notice.isOpen}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
    <!-- Click backdrop to close -->
    <button 
      type="button"
      class="absolute inset-0 cursor-default bg-transparent border-0" 
      onclick={() => dialog.closeNotice()}
      tabindex="-1"
      aria-label="Tutup modal informasi"
    ></button>

    <!-- Cyber-Industrial Notice Modal Box -->
    <div class="relative w-full max-w-sm rounded-xl bg-[#FCFCFA] border border-[#D0CEC7] shadow-2xl p-5 flex flex-col gap-4 text-center z-10 animate-in zoom-in-95 duration-200 text-[#111315] font-tech">
      <!-- 4 Corner Registration Marks -->
      <span class="reg-dot reg-dot-tl"></span>
      <span class="reg-dot reg-dot-tr"></span>
      <span class="reg-dot reg-dot-bl"></span>
      <span class="reg-dot reg-dot-br"></span>
      
      <!-- Top Drafting Seam -->
      <div class="flex items-center justify-between pb-2 border-b border-[#D0CEC7] text-[10px] text-[#60646C]">
        <span class="flex items-center gap-1 font-bold">
          <span class="w-1.5 h-1.5 {
            dialog.notice.type === 'success' ? 'bg-emerald-500' :
            dialog.notice.type === 'error' ? 'bg-rose-500' :
            dialog.notice.type === 'warning' ? 'bg-amber-500' :
            'bg-[#FF5500]'
          }"></span>
          :: SYSTEM DISPATCH NOTICE
        </span>
        <button 
          type="button"
          onclick={() => dialog.closeNotice()}
          class="p-0.5 rounded text-[#8C9097] hover:text-[#111315] hover:bg-[#E5E3DD] transition cursor-pointer"
          title="Tutup"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Icon Header -->
      <div class="w-12 h-12 rounded-xl mx-auto flex items-center justify-center {
        dialog.notice.type === 'success' ? 'bg-emerald-100 border border-emerald-300 text-emerald-700' :
        dialog.notice.type === 'error' ? 'bg-rose-100 border border-rose-300 text-rose-700' :
        dialog.notice.type === 'warning' ? 'bg-amber-100 border border-amber-300 text-amber-700' :
        'bg-orange-100 border border-orange-300 text-[#FF5500]'
      }">
        {#if dialog.notice.type === 'success'}
          <CheckCircle2 class="w-6 h-6 animate-pulse" />
        {:else if dialog.notice.type === 'error'}
          <AlertCircle class="w-6 h-6" />
        {:else if dialog.notice.type === 'warning'}
          <AlertTriangle class="w-6 h-6" />
        {:else}
          <Info class="w-6 h-6" />
        {/if}
      </div>

      <!-- Title & Message -->
      <div class="space-y-1.5 px-2">
        <h3 class="text-sm font-bold text-[#111315] uppercase tracking-wider">{dialog.notice.title}</h3>
        <p class="text-xs text-[#60646C] font-grotesk leading-relaxed break-words whitespace-pre-wrap">{dialog.notice.message}</p>
      </div>

      <!-- Single Action Button (OK / Mengerti) -->
      <div class="pt-2 border-t border-[#D0CEC7]">
        <button
          type="button"
          onclick={() => dialog.closeNotice()}
          class="w-full h-9 px-4 rounded-lg {
            dialog.notice.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-500' :
            dialog.notice.type === 'error' ? 'bg-rose-600 hover:bg-rose-500' :
            dialog.notice.type === 'warning' ? 'bg-amber-600 hover:bg-amber-500' :
            'btn-safety'
          } text-white text-xs font-bold uppercase tracking-wider shadow-sm transition cursor-pointer active:translate-y-0.5"
        >
          {dialog.notice.buttonText || 'ACKNOWLEDGE & CLOSE'}
        </button>
      </div>
    </div>
  </div>
{/if}
