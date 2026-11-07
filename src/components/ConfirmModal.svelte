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
  <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
    <!-- Click outside to cancel -->
    <button 
      type="button"
      class="absolute inset-0 cursor-default bg-transparent border-0" 
      onclick={handleCancelAction}
      tabindex="-1"
      aria-label="Tutup modal"
    ></button>

    <!-- Modal Box -->
    <div class="relative w-full max-w-sm rounded-2xl bg-[#FCFCFA] border border-[#C8C5BC] shadow-2xl p-5 flex flex-col gap-4 text-center z-10 animate-in zoom-in-95 duration-200 text-[#191B1D]">
      
      <!-- Close icon button -->
      <button 
        type="button"
        onclick={handleCancelAction}
        class="absolute top-3.5 right-3.5 p-1 rounded-lg text-[#8C9097] hover:text-[#191B1D] hover:bg-[#E9E7E0] transition cursor-pointer"
        title="Tutup"
      >
        <X class="w-4 h-4" />
      </button>

      <!-- Icon Header -->
      <div class="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center {activeVariant === 'danger' ? 'bg-rose-100 border border-rose-300 text-rose-700' : activeVariant === 'warning' ? 'bg-amber-100 border border-amber-300 text-amber-700' : 'bg-orange-100 border border-orange-300 text-[#FF5500]'}">
        {#if activeVariant === 'danger'}
          <Trash2 class="w-6 h-6" />
        {:else if activeVariant === 'warning'}
          <AlertTriangle class="w-6 h-6" />
        {:else}
          <HelpCircle class="w-6 h-6" />
        {/if}
      </div>

      <!-- Title & Message -->
      <div class="space-y-1.5 px-1">
        <h3 class="text-sm font-bold text-[#191B1D]">{activeTitle}</h3>
        <p class="text-xs text-[#5C6066] leading-relaxed">{activeMessage}</p>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2 pt-2 border-t border-[#C8C5BC]">
        <button
          type="button"
          onclick={handleCancelAction}
          class="btn-hardware flex-1 py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer active:scale-95"
        >
          {activeCancelText}
        </button>

        <button
          type="button"
          onclick={handleConfirmAction}
          class="flex-1 py-2 px-3 rounded-xl {activeVariant === 'danger' ? 'bg-rose-600 hover:bg-rose-500 shadow-sm' : activeVariant === 'warning' ? 'bg-amber-600 hover:bg-amber-500 shadow-sm' : 'btn-safety'} text-white text-xs font-bold shadow-sm transition cursor-pointer active:scale-95"
        >
          {activeConfirmText}
        </button>
      </div>
    </div>
  </div>
{/if}
