<script lang="ts">
  import { FolderOpen, X, ArrowRight, Folder } from 'lucide-svelte';

  let {
    isOpen,
    recentProjects,
    onClose,
    onSelectProject
  }: {
    isOpen: boolean;
    recentProjects: string[];
    onClose: () => void;
    onSelectProject: (path: string) => Promise<boolean>;
  } = $props();

  let customPathInput = $state('');
  let isSelecting = $state(false);

  async function handleSelect(path: string) {
    if (!path.trim()) return;
    isSelecting = true;
    try {
      const ok = await onSelectProject(path.trim());
      if (ok) {
        customPathInput = '';
        onClose();
      }
    } finally {
      isSelecting = false;
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
    <div class="glass-panel w-full max-w-lg rounded-2xl flex flex-col border border-slate-700/80 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      <div class="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <FolderOpen class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Buka / Ganti Project Workspace</h3>
            <p class="text-[11px] text-slate-400">Pilih direktori project lokal di komputer Anda</p>
          </div>
        </div>
        <button onclick={onClose} class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-5 flex flex-col gap-4 text-xs">
        <div class="flex flex-col gap-1.5">
          <label for="custom-path-input" class="font-bold text-slate-300">Masukkan Path Direktori:</label>
          <div class="flex gap-2">
            <input
              id="custom-path-input"
              type="text"
              bind:value={customPathInput}
              placeholder="Contoh: D:\Works\my-project atau D:/Works/zhiEnd-agent"
              class="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono outline-none focus:border-amber-500"
            />
            <button
              onclick={() => handleSelect(customPathInput)}
              disabled={isSelecting || !customPathInput.trim()}
              class="px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold flex items-center gap-1 cursor-pointer"
            >
              Buka <ArrowRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
          <span class="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Project Terakhir Dibuka:</span>
          <div class="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
            {#each recentProjects as p}
              <button
                onclick={() => handleSelect(p)}
                class="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/60 hover:bg-amber-500/10 border border-slate-800 hover:border-amber-500/30 text-slate-300 hover:text-amber-200 font-mono text-[11px] text-left transition cursor-pointer"
              >
                <Folder class="w-4 h-4 text-amber-400 shrink-0" />
                <span class="truncate">{p}</span>
              </button>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
