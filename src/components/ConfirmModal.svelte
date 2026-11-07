<script lang="ts">
  import { AlertTriangle, Trash2, HelpCircle, X } from 'lucide-svelte';
  import { dialog } from '../services/dialog.svelte';

  let {
    isOpen = false,
    title,
    message,
    confirmText,
    cancelText,
    variant,
    onConfirm,
    onCancel
  }: {
    isOpen?: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm?: () => void;
    onCancel?: () => void;
  } = $props();

  let activeIsOpen = $derived(isOpen || dialog.confirm.isOpen);
  let activeTitle = $derived(title || dialog.confirm.title || 'Konfirmasi Tindakan');
  let activeMessage = $derived(message || dialog.confirm.message || 'Apakah Anda yakin ingin melanjutkan?');
  let activeConfirmText = $derived(confirmText || dialog.confirm.confirmText || 'Lanjutkan');
  let activeCancelText = $derived(cancelText || dialog.confirm.cancelText || 'Batal');
  let activeVariant = $derived(variant || dialog.confirm.variant || 'danger');

  function handleConfirmAction() {
    if (onConfirm) {
      onConfirm();
    } else {
      dialog.handleConfirm();
    }
  }

  function handleCancelAction() {
    if (onCancel) {
      onCancel();
    } else {
      dialog.closeConfirm();
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!activeIsOpen) return;
    if (e.key === 'Escape') {
      handleCancelAction();
    } else if (e.key === 'Enter') {
      handleConfirmAction();
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if activeIsOpen}
  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
    <!-- Click outside to cancel -->
    <button 
      type="button"
      class="absolute inset-0 cursor-default bg-transparent border-0" 
      onclick={handleCancelAction}
      tabindex="-1"
      aria-label="Tutup modal"
    ></button>

    <!-- Cyber-Industrial Confirmation Modal Box (Sharp 90° Framing) -->
    <div class="relative w-full max-w-sm rounded-none bg-[#FCFCFA] border-2 border-[#D0CEC7] shadow-2xl p-5 flex flex-col gap-4 text-center z-10 animate-in zoom-in-95 duration-200 text-[#111315] font-tech">
      <!-- 4 Corner Registration Marks -->
      <span class="reg-dot reg-dot-tl"></span>
      <span class="reg-dot reg-dot-tr"></span>
      <span class="reg-dot reg-dot-bl"></span>
      <span class="reg-dot reg-dot-br"></span>
      
      <!-- Top Drafting Seam -->
      <div class="flex items-center justify-between pb-2 border-b border-[#D0CEC7] text-[10px] text-[#60646C]">
        <span class="flex items-center gap-1 font-bold">
          <span class="w-1.5 h-1.5 {activeVariant === 'danger' ? 'bg-rose-500' : (activeVariant === 'warning' ? 'bg-amber-500' : 'bg-[#FF5500]')}"></span>
          :: PROTOCOL CONFIRMATION
        </span>
        <button 
          type="button"
          onclick={handleCancelAction}
          class="p-0.5 rounded-none text-[#8C9097] hover:text-[#111315] hover:bg-[#E5E3DD] transition cursor-pointer"
          title="Tutup"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Icon Header -->
      <div class="w-12 h-12 rounded-none mx-auto flex items-center justify-center border {activeVariant === 'danger' ? 'bg-rose-50 border-rose-300 text-rose-600' : activeVariant === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-600' : 'bg-orange-50 border-orange-300 text-[#FF5500]'}">
        {#if activeVariant === 'danger'}
          <Trash2 class="w-5 h-5 animate-pulse" />
        {:else if activeVariant === 'warning'}
          <AlertTriangle class="w-5 h-5 animate-bounce" />
        {:else}
          <HelpCircle class="w-5 h-5" />
        {/if}
      </div>

      <!-- Title & Message -->
      <div class="space-y-1 px-1">
        <h3 class="text-sm font-bold text-[#111315] uppercase tracking-wider">{activeTitle}</h3>
        <p class="text-xs text-[#60646C] font-grotesk leading-relaxed">{activeMessage}</p>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2 pt-2 border-t border-[#D0CEC7]">
        <button
          type="button"
          onclick={handleCancelAction}
          class="btn-hardware flex-1 h-9 rounded-none text-xs font-bold uppercase tracking-wider cursor-pointer active:scale-95"
        >
          {activeCancelText}
        </button>

        <button
          type="button"
          onclick={handleConfirmAction}
          class="flex-1 h-9 rounded-none {activeVariant === 'danger' ? 'bg-rose-600 hover:bg-rose-500 shadow-none' : activeVariant === 'warning' ? 'bg-amber-600 hover:bg-amber-500 shadow-none' : 'btn-safety'} text-white text-xs font-bold uppercase tracking-wider shadow-none transition cursor-pointer active:scale-95"
        >
          {activeConfirmText}
        </button>
      </div>
    </div>
  </div>
{/if}
