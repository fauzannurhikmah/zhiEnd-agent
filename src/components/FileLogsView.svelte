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

<div class="h-full grid grid-cols-1 md:grid-cols-[320px_1fr] gap-3 overflow-y-auto md:overflow-hidden pb-20 md:pb-0 p-3 sm:p-4 text-[#111315] font-tech">
  <!-- Left: File Tree Explorer -->
  <div class="relative bg-[#ECEAE5] border border-[#D0CEC7] p-3.5 rounded-none flex flex-col gap-2.5 h-64 md:h-auto overflow-hidden shadow-2xs">
    <span class="reg-dot reg-dot-tl"></span>
    <div class="flex items-center justify-between border-b border-[#D0CEC7] pb-2">
      <span class="text-xs font-bold text-[#111315] uppercase tracking-wider flex items-center gap-1.5">
        <FolderTree class="w-4 h-4 text-[#FF5500]" />
        PROJECT BLUEPRINT FILES
      </span>
      <button onclick={onRefreshFiles} class="p-1 rounded-none hover:bg-[#E5E3DD] text-[#60646C] hover:text-[#111315] cursor-pointer" title="Refresh files">
        <RotateCw class="w-3.5 h-3.5" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto font-stencil text-xs flex flex-col gap-1 pr-1">
      {#if !files || files.length === 0}
        <div class="text-[#8C9097] py-4 text-center">Folder kosong.</div>
      {:else}
        {#each files as f}
          <div class="flex items-center gap-1.5 py-1 px-1.5 rounded-none hover:bg-[#E5E3DD] cursor-pointer text-[#111315]">
            {#if f.isDirectory}
              <Folder class="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span class="font-bold text-[#111315]">{f.name}/</span>
            {:else}
              {@const IconComponent = getFileIcon(f.name)}
              <IconComponent class="w-3.5 h-3.5 text-[#FF5500] shrink-0" />
              <span>{f.name}</span>
            {/if}
          </div>

          <!-- Children if directory -->
          {#if f.isDirectory && f.children && f.children.length > 0}
            <div class="pl-4 border-l border-[#D0CEC7] ml-2 flex flex-col gap-0.5">
              {#each f.children as child}
                <div class="flex items-center gap-1.5 py-0.5 px-1 rounded-none hover:bg-[#E5E3DD] text-[#60646C] hover:text-[#111315]">
                  {#if child.isDirectory}
                    <Folder class="w-3 h-3 text-amber-600/80 shrink-0" />
                    <span>{child.name}/</span>
                  {:else}
                    {@const ChildIcon = getFileIcon(child.name)}
                    <ChildIcon class="w-3 h-3 text-[#60646C] shrink-0" />
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

  <!-- Right: Terminal & Stream Logs (Authentic CRT Screen Look) -->
  <div class="relative bg-[#ECEAE5] border border-[#D0CEC7] p-3.5 rounded-none flex flex-col gap-2.5 min-h-[320px] md:min-h-0 overflow-hidden shadow-2xs">
    <span class="reg-dot reg-dot-tr"></span>
    <div class="flex items-center justify-between border-b border-[#D0CEC7] pb-2">
      <span class="text-xs font-bold text-[#111315] uppercase tracking-wider flex items-center gap-1.5">
        <Terminal class="w-4 h-4 text-[#FF5500]" />
        TELEMETRY STREAM & TASK TRACE
      </span>
      <div class="flex items-center gap-2">
        <span class="font-stencil text-[10px] text-emerald-700 font-bold px-1.5 py-0.2 bg-emerald-100 rounded-none border border-emerald-300">LIVE FEED</span>
        <button onclick={onClearLogs} class="p-1 rounded-none hover:bg-[#E5E3DD] text-[#60646C] hover:text-[#111315] cursor-pointer" title="Clear logs">
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Inner CRT Screen Terminal Well -->
    <div class="relative flex-1 overflow-y-auto bg-[#101114] p-3.5 rounded-none border border-black/40 font-stencil text-[11px] leading-relaxed flex flex-col gap-1 text-emerald-400 crt-screen">
      <!-- Subtle scanlines overlay -->
      <div class="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px]"></div>
      {#if !logs || logs.length === 0}
        <div class="text-[#8C9097] italic">[System] Standby. Menunggu aktivitas task...</div>
      {:else}
        {#each logs as log}
          <div class="whitespace-pre-wrap break-all relative z-10">{log}</div>
        {/each}
      {/if}
    </div>
  </div>
</div>
