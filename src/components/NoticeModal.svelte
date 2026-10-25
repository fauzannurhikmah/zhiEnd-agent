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

    <!-- Modal Box -->
    <div class="relative w-full max-w-sm rounded-2xl bg-zinc-900/95 border border-white/[0.08] shadow-2xl p-5 flex flex-col gap-4 text-center z-10 animate-in zoom-in-95 duration-200">
      
      <!-- Close icon button -->
      <button 
        type="button"
        onclick={() => dialog.closeNotice()}
        class="absolute top-3.5 right-3.5 p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
        title="Tutup"
      >
        <X class="w-4 h-4" />
      </button>

      <!-- Icon Header with Glow -->
      <div class="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center {
        dialog.notice.type === 'success' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.25)]' :
        dialog.notice.type === 'error' ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.25)]' :
        dialog.notice.type === 'warning' ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.25)]' :
        'bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.25)]'
      }">
        {#if dialog.notice.type === 'success'}
          <CheckCircle2 class="w-6 h-6" />
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
        <h3 class="text-sm font-bold text-zinc-100">{dialog.notice.title}</h3>
        <p class="text-xs text-zinc-400 leading-relaxed break-words whitespace-pre-wrap">{dialog.notice.message}</p>
      </div>

      <!-- Single Action Button (OK / Mengerti) -->
      <div class="pt-2 border-t border-white/[0.06]">
        <button
          type="button"
          onclick={() => dialog.closeNotice()}
          class="w-full py-2.5 px-4 rounded-xl {
            dialog.notice.type === 'success' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/25' :
            dialog.notice.type === 'error' ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/25' :
            dialog.notice.type === 'warning' ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-600/25' :
            'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-600/25'
          } text-white text-xs font-bold shadow-lg transition cursor-pointer active:scale-95"
        >
          {dialog.notice.buttonText || 'Mengerti'}
        </button>
      </div>
    </div>
  </div>
{/if}
