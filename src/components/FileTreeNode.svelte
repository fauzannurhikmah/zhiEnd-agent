<script lang="ts">
  import { type FileItem, sortFileItems } from "../types";
  import {
    ChevronRight,
    ChevronDown,
    Folder,
    FolderOpen,
  } from "lucide-svelte";
  import FileTreeNode from "./FileTreeNode.svelte";

  let {
    item,
    depth = 0,
    expandedFolders,
    selectedFile,
    onToggleFolder,
    onOpenFile,
    getFileIcon,
  }: {
    item: FileItem;
    depth?: number;
    expandedFolders: Set<string>;
    selectedFile: { path: string; name: string } | null;
    onToggleFolder: (path: string, item?: FileItem) => void;
    onOpenFile: (file: FileItem) => void;
    getFileIcon: (name: string) => any;
  } = $props();

  const isExpanded = $derived(expandedFolders.has(item.path));
  const isSelected = $derived(selectedFile?.path === item.path);
  const Icon = $derived(getFileIcon(item.name));
</script>

{#if item.isDirectory}
  <div>
    <button
      onclick={() => onToggleFolder(item.path, item)}
      class="w-full flex items-center gap-1.5 py-1 px-1.5 rounded-none hover:bg-[#ECEAE5] cursor-pointer text-[#111315] text-left transition group"
      style="padding-left: {depth * 12 + 6}px;"
      title="{item.path}/"
    >
      {#if isExpanded}
        <ChevronDown class="w-3 h-3 text-[#60646C] shrink-0" />
        <FolderOpen class="w-3.5 h-3.5 text-amber-600 shrink-0" />
      {:else}
        <ChevronRight class="w-3 h-3 text-[#60646C] shrink-0" />
        <Folder class="w-3.5 h-3.5 text-amber-600 shrink-0" />
      {/if}
      <span
        class="{depth === 0 ? 'font-bold' : 'font-medium'} truncate text-xs text-[#111315] group-hover:text-[#FF5500] transition-colors"
      >
        {item.name}/
      </span>
    </button>

    {#if isExpanded && item.children && item.children.length > 0}
      <div class="flex flex-col gap-0.5">
        {#each sortFileItems(item.children) as child (child.path)}
          <FileTreeNode
            item={child}
            depth={depth + 1}
            {expandedFolders}
            {selectedFile}
            {onToggleFolder}
            {onOpenFile}
            {getFileIcon}
          />
        {/each}
      </div>
    {:else if isExpanded && item.children && item.children.length === 0}
      <div
        class="text-[10px] text-[#8C9097] italic py-0.5"
        style="padding-left: {(depth + 1) * 12 + 18}px;"
      >
        (kosong)
      </div>
    {/if}
  </div>
{:else}
  <button
    onclick={() => onOpenFile(item)}
    class="w-full flex items-center gap-1.5 py-0.5 px-1.5 rounded-none cursor-pointer transition text-left {isSelected
      ? 'bg-[#E5E3DD] text-[#FF5500] font-bold border-l-2 border-[#FF5500]'
      : 'text-[#60646C] hover:bg-[#ECEAE5] hover:text-[#111315]'}"
    style="padding-left: {depth * 12 + 6}px;"
    title={item.path}
  >
    <Icon
      class="w-3 h-3 shrink-0 {isSelected ? 'text-[#FF5500]' : 'text-[#8C9097]'}"
    />
    <span class="truncate text-xs">{item.name}</span>
  </button>
{/if}

