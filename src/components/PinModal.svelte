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
  <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="w-full max-w-sm rounded-2xl p-6 flex flex-col items-center gap-4 bg-[#FCFCFA] border border-[#C8C5BC] shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200 text-[#191B1D]">
      <div class="w-14 h-14 rounded-2xl bg-orange-100 border border-orange-300 flex items-center justify-center text-[#FF5500]">
        <Shield class="w-7 h-7" />
      </div>

      <div>
        <h2 class="text-base font-bold text-[#191B1D]">zhiEnd Agent Security</h2>
        <p class="text-xs text-[#5C6066] mt-1">Masukkan Security PIN untuk membuka akses workspace dan remote kontrol.</p>
      </div>

      <div class="w-full flex gap-2">
        <input
          type="password"
          bind:value={pinValue}
          onkeydown={handleKeyDown}
          placeholder="••••"
          maxlength="12"
          class="flex-1 bg-[#FCFCFA] border border-[#C8C5BC] focus:border-[#FF5500] rounded-xl p-3 text-center text-lg tracking-[0.3em] text-[#191B1D] font-mono outline-none"
        />
        <button
          onclick={handleSubmit}
          disabled={isChecking || !pinValue.trim()}
          class="btn-safety px-4 py-3 rounded-xl text-white font-bold cursor-pointer disabled:opacity-40"
        >
          <ArrowRight class="w-4 h-4" />
        </button>
      </div>

      {#if errorMsg}
        <span class="text-xs text-rose-600 font-bold">{errorMsg}</span>
      {/if}
    </div>
  </div>
{/if}
