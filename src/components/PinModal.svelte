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
  <div class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
    <div class="w-full max-w-sm rounded-xl overflow-hidden flex flex-col bg-[#FCFCFA] border border-[#D0CEC7] shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative">
      <!-- 4 Corner Registration Marks (Solid Orange Squares ■) -->
      <span class="reg-dot reg-dot-tl"></span>
      <span class="reg-dot reg-dot-tr"></span>
      <span class="reg-dot reg-dot-bl"></span>
      <span class="reg-dot reg-dot-br"></span>

      <!-- Top Drafting Seam -->
      <div class="px-4 py-2.5 bg-[#E5E3DD] border-b border-[#D0CEC7] flex items-center justify-between text-xs font-tech">
        <div class="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#111315]">
          <span class="w-1.5 h-1.5 bg-[#FF5500]"></span>
          <span>:: ACCESS AUTHENTICATION // PIN</span>
        </div>
        <span class="font-stencil text-[10px] text-[#5C6066]">SEC-01</span>
      </div>

      <div class="p-5 sm:p-6 flex flex-col items-center gap-4 text-center text-[#111315]">
        <div class="w-12 h-12 rounded-lg bg-[#ECEAE5] border border-[#D0CEC7] flex items-center justify-center text-[#FF5500] shadow-2xs">
          <Shield class="w-6 h-6" />
        </div>

        <div>
          <h2 class="text-sm font-bold font-tech uppercase tracking-wider text-[#111315]">ZHIEND SECURITY CLEARANCE</h2>
          <p class="text-[11px] text-[#5C6066] font-grotesk mt-1">Masukkan Security PIN untuk membuka akses kontrol workspace & eksekusi.</p>
        </div>

        <div class="w-full flex gap-2">
          <input
            type="password"
            bind:value={pinValue}
            onkeydown={handleKeyDown}
            placeholder="••••"
            maxlength="12"
            class="flex-1 bg-[#FCFCFA] border border-[#D0CEC7] focus:border-[#FF5500] focus:ring-1 focus:ring-[#FF5500] rounded-lg p-2.5 text-center text-lg tracking-[0.3em] text-[#111315] font-stencil outline-none shadow-2xs"
          />
          <button
            onclick={handleSubmit}
            disabled={isChecking || !pinValue.trim()}
            class="btn-safety px-4 py-2.5 rounded-lg text-white font-tech font-bold uppercase tracking-wider cursor-pointer disabled:opacity-40 active:scale-95 transition shadow-2xs"
          >
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>

        {#if errorMsg}
          <span class="text-xs text-rose-600 font-stencil font-bold">{errorMsg}</span>
        {/if}
      </div>
    </div>
  </div>
{/if}
