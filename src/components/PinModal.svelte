<script lang="ts">
  import { Shield, ArrowRight } from 'lucide-svelte';

  let {
    isOpen,
    onSubmit
  }: {
    isOpen: boolean;
    onSubmit: (pin: string) => Promise<boolean>;
  } = $props();

  let pinValue = $state('');
  let isChecking = $state(false);
  let errorMsg = $state('');

  async function handleSubmit() {
    if (!pinValue.trim()) return;
    isChecking = true;
    errorMsg = '';
    try {
      const ok = await onSubmit(pinValue.trim());
      if (!ok) {
        errorMsg = 'PIN salah. Silakan coba lagi.';
      }
    } catch {
      errorMsg = 'Terjadi kesalahan verifikasi.';
    } finally {
      isChecking = false;
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center z-50 p-4">
    <div class="glass-panel w-full max-w-sm rounded-2xl p-6 flex flex-col items-center gap-4 border border-slate-700/80 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200">
      <div class="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
        <Shield class="w-7 h-7" />
      </div>

      <div>
        <h2 class="text-base font-bold text-white">zhiEnd Agent Security</h2>
        <p class="text-xs text-slate-400 mt-1">Masukkan Security PIN untuk membuka akses workspace dan remote kontrol.</p>
      </div>

      <div class="w-full flex gap-2">
        <input
          type="password"
          bind:value={pinValue}
          onkeydown={handleKeyDown}
          placeholder="••••"
          maxlength="12"
          class="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-center text-lg tracking-[0.3em] text-white font-mono outline-none"
        />
        <button
          onclick={handleSubmit}
          disabled={isChecking || !pinValue.trim()}
          class="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold cursor-pointer"
        >
          <ArrowRight class="w-4 h-4" />
        </button>
      </div>

      {#if errorMsg}
        <span class="text-xs text-rose-400 font-semibold">{errorMsg}</span>
      {/if}
    </div>
  </div>
{/if}
