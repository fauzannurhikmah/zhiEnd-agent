<script lang="ts">
  import type { FileItem } from '../types';
  import { FolderTree, Terminal, RotateCw, Trash2, Folder, File, Code, FileText } from 'lucide-svelte';

  let {
    files,
    logs,
    onRefreshFiles,
    onClearLogs
  }: {
    files: FileItem[];
    logs: string[];
    onRefreshFiles: () => void;
    onClearLogs: () => void;
  } = $props();

  function getFileIcon(name: string) {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'ts' || ext === 'js' || ext === 'svelte') return Code;
    if (ext === 'json' || ext === 'md') return FileText;
    return File;
  }
</script>

<div class="h-full grid grid-cols-1 md:grid-cols-[320px_1fr] gap-3 overflow-hidden">
  <!-- Left: File Tree Explorer -->
  <div class="glass-panel p-3.5 rounded-xl flex flex-col gap-2.5 overflow-hidden border border-slate-800/80 shadow-md">
    <div class="flex items-center justify-between border-b border-slate-800/80 pb-2">
      <span class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
        <FolderTree class="w-4 h-4 text-amber-400" />
        Struktur File Project
      </span>
      <button onclick={onRefreshFiles} class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer" title="Refresh files">
        <RotateCw class="w-3.5 h-3.5" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto font-mono text-xs flex flex-col gap-1 pr-1">
      {#if !files || files.length === 0}
        <div class="text-slate-500 py-4 text-center">Folder kosong.</div>
      {:else}
        {#each files as f}
          <div class="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-slate-800/50 cursor-pointer text-slate-300">
            {#if f.isDirectory}
              <Folder class="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span class="font-semibold text-slate-200">{f.name}/</span>
            {:else}
              {@const IconComponent = getFileIcon(f.name)}
              <IconComponent class="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>{f.name}</span>
            {/if}
          </div>

          <!-- Children if directory -->
          {#if f.isDirectory && f.children && f.children.length > 0}
            <div class="pl-4 border-l border-slate-800/80 ml-2 flex flex-col gap-0.5">
              {#each f.children as child}
                <div class="flex items-center gap-1.5 py-0.5 px-1 rounded hover:bg-slate-800/40 text-slate-400 hover:text-slate-200">
                  {#if child.isDirectory}
                    <Folder class="w-3 h-3 text-amber-500/80 shrink-0" />
                    <span>{child.name}/</span>
                  {:else}
                    {@const ChildIcon = getFileIcon(child.name)}
                    <ChildIcon class="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{child.name}</span>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        {/each}
      {/if}
    </div>
  </div>

  <!-- Right: Terminal & Stream Logs -->
  <div class="glass-panel p-3.5 rounded-xl flex flex-col gap-2.5 overflow-hidden border border-slate-800/80 shadow-md">
    <div class="flex items-center justify-between border-b border-slate-800/80 pb-2">
      <span class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
        <Terminal class="w-4 h-4 text-violet-400" />
        Antigravity Agent & System Stream
      </span>
      <button onclick={onClearLogs} class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer" title="Clear logs">
        <Trash2 class="w-3.5 h-3.5" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto bg-slate-950/90 p-3 rounded-lg border border-slate-900 font-mono text-[11px] leading-relaxed flex flex-col gap-1 text-slate-300">
      {#if !logs || logs.length === 0}
        <div class="text-slate-600 italic">[System] Menunggu aktivitas task...</div>
      {:else}
        {#each logs as log}
          <div class="whitespace-pre-wrap">{log}</div>
        {/each}
      {/if}
    </div>
  </div>
</div>
