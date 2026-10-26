<script lang="ts">
  import { onMount } from 'svelte';
  import type { ScannedProject } from '../types';
  import { api } from '../services/api';
  import { dialog } from '../services/dialog.svelte';
  import { 
    FolderGit, 
    X, 
    ArrowRight, 
    Folder, 
    Plus, 
    Search, 
    RotateCw, 
    Check, 
    GitBranch, 
    Package, 
    Sparkles,
    ChevronRight,
    ChevronDown
  } from 'lucide-svelte';

  let {
    isOpen,
    recentProjects,
    activeProjectPath,
    onClose,
    onSelectProject
  }: {
    isOpen: boolean;
    recentProjects: string[];
    activeProjectPath?: string;
    onClose: () => void;
    onSelectProject: (path: string) => Promise<boolean>;
  } = $props();

  let activeTab = $state<'scan' | 'create' | 'manual'>('scan');
  let scannedProjects = $state<ScannedProject[]>([]);
  let isScanning = $state(false);
  let searchQuery = $state('');

  // Create project form
  let newProjectName = $state('');
  let newProjectParent = $state('D:\\Works');
  let initGit = $state(true);
  let isCreating = $state(false);

  // Manual path
  let manualPathInput = $state('');
  let isSelecting = $state(false);

  export interface ProjectTreeNode {
    id: string;               // Unique id like "Sehati" or "Sehati/CRM"
    name: string;             // Folder name e.g. "Sehati" or "CRM"
    path: string;             // Absolute path e.g. "D:\Works\Sehati\CRM"
    relativePath: string;     // Relative path e.g. "Sehati/CRM"
    depth: number;
    isGit: boolean;
    hasPackageJson: boolean;
    isProject: boolean;
    children: ProjectTreeNode[];
  }

  $effect(() => {
    if (isOpen) {
      loadScannedProjects('D:\\Works');
    }
  });

  async function loadScannedProjects(dir: string = 'D:\\Works') {
    isScanning = true;
    try {
      const res = await api.scanProjects(dir);
      scannedProjects = res.projects || [];
    } catch (e) {
      console.error('Scan error:', e);
    } finally {
      isScanning = false;
    }
  }

  let collapsedNodes = $state<Record<string, boolean>>({});

  function toggleExpand(id: string) {
    collapsedNodes[id] = !collapsedNodes[id];
    collapsedNodes = { ...collapsedNodes };
  }

  function isNodeExpanded(id: string): boolean {
    if (searchQuery.trim().length > 0) return true;
    return !collapsedNodes[id];
  }

  function isCurrent(pathToCheck?: string): boolean {
    if (!activeProjectPath || !pathToCheck) return false;
    return activeProjectPath.replace(/\\/g, '/').toLowerCase() === pathToCheck.replace(/\\/g, '/').toLowerCase();
  }

  function isAtRoot(): boolean {
    if (!activeProjectPath) return true;
    const norm = activeProjectPath.replace(/\\/g, '/').toLowerCase().replace(/\/+$/, '');
    return norm === 'd:/works' || norm === 'd:';
  }

  const projectTree = $derived.by(() => {
    const q = searchQuery.toLowerCase().trim();
    const rootMap = new Map<string, any>();

    for (const p of scannedProjects) {
      const normRel = p.relativePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
      const parts = normRel.split('/').filter(Boolean);
      if (parts.length === 0) continue;

      let currentLevel = rootMap;
      let accumulatedRel = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        accumulatedRel = accumulatedRel ? `${accumulatedRel}/${part}` : part;
        const isLeaf = i === parts.length - 1;

        let node = currentLevel.get(part);
        if (!node) {
          const absPath = isLeaf ? p.path : `D:/Works/${accumulatedRel}`;
          node = {
            id: accumulatedRel,
            name: part,
            path: absPath,
            relativePath: accumulatedRel,
            depth: i,
            isGit: false,
            hasPackageJson: false,
            isProject: false,
            children: []
          };
          currentLevel.set(part, node);
        }

        if (isLeaf) {
          node.name = p.name;
          node.path = p.path;
          node.relativePath = p.relativePath;
          node.isGit = p.isGit;
          node.hasPackageJson = p.hasPackageJson;
          node.isProject = true;
        }

        if (!node.childMap) node.childMap = new Map<string, any>();
        currentLevel = node.childMap;
      }
    }

    function convertToArray(map: Map<string, any>): ProjectTreeNode[] {
      const arr: ProjectTreeNode[] = [];
      for (const node of map.values()) {
        if (node.childMap && node.childMap.size > 0) {
          node.children = convertToArray(node.childMap);
          node.children.sort((a: ProjectTreeNode, b: ProjectTreeNode) => {
            const aHas = a.children.length > 0 ? 0 : 1;
            const bHas = b.children.length > 0 ? 0 : 1;
            if (aHas !== bHas) return aHas - bHas;
            return a.name.localeCompare(b.name);
          });
        } else {
          node.children = [];
        }
        delete node.childMap;
        arr.push(node);
      }
      arr.sort((a, b) => {
        const aHas = a.children.length > 0 ? 0 : 1;
        const bHas = b.children.length > 0 ? 0 : 1;
        if (aHas !== bHas) return aHas - bHas;
        return a.name.localeCompare(b.name);
      });
      return arr;
    }

    const fullTree = convertToArray(rootMap);
    if (!q) return fullTree;

    function filterTree(nodes: ProjectTreeNode[]): ProjectTreeNode[] {
      const res: ProjectTreeNode[] = [];
      for (const node of nodes) {
        const match = node.name.toLowerCase().includes(q) || node.relativePath.toLowerCase().includes(q);
        const filteredChildren = filterTree(node.children);
        if (match || filteredChildren.length > 0) {
          res.push({
            ...node,
            children: filteredChildren
          });
        }
      }
      return res;
    }

    return filterTree(fullTree);
  });

  async function handleSelect(path: string) {
    if (!path.trim()) return;
    isSelecting = true;
    try {
      const ok = await onSelectProject(path.trim());
      if (ok) {
        manualPathInput = '';
        onClose();
      }
    } finally {
      isSelecting = false;
    }
  }

  async function handleCreateProject() {
    if (!newProjectName.trim()) {
      dialog.showWarning('Nama project harus diisi.');
      return;
    }
    isCreating = true;
    try {
      const res = await api.createProject(newProjectName.trim(), newProjectParent.trim(), initGit);
      if (res.success && res.activeProject) {
        newProjectName = '';
        await onSelectProject(res.activeProject);
        onClose();
        dialog.showSuccess(`Project "${res.activeProject}" berhasil dibuat.`);
      } else {
        dialog.showError('Gagal membuat project: ' + (res.error || 'Terjadi kesalahan'));
      }
    } catch (e: any) {
      dialog.showError('Error: ' + e.message);
    } finally {
      isCreating = false;
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
    <div class="w-full max-w-3xl h-[85vh] bg-zinc-950/95 border border-white/[0.12] rounded-2xl flex flex-col shadow-2xl shadow-indigo-950/40 overflow-hidden">
      
      <!-- Modal Header with Cinematic Accent -->
      <div class="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-gradient-to-r from-zinc-900/60 via-zinc-900/30 to-zinc-900/60">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
            <FolderGit class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Workspace & Project Manager
              <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Default: D:\Works
              </span>
            </h3>
            <p class="text-[11px] text-zinc-400">Pilih dari folder D:\Works, buat baru, atau masukkan path manual</p>
          </div>
        </div>
        <button onclick={onClose} class="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center justify-between px-5 border-b border-zinc-800/60 bg-zinc-900/40 text-xs font-semibold">
        <div class="flex gap-4">
          <button
            onclick={() => activeTab = 'scan'}
            class="py-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer {activeTab === 'scan' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}"
          >
            <FolderGit class="w-3.5 h-3.5" /> Project D:\Works ({scannedProjects.length})
          </button>
          <button
            onclick={() => activeTab = 'create'}
            class="py-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer {activeTab === 'create' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}"
          >
            <Plus class="w-3.5 h-3.5" /> Buat Project Baru
          </button>
          <button
            onclick={() => activeTab = 'manual'}
            class="py-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer {activeTab === 'manual' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}"
          >
            <Folder class="w-3.5 h-3.5" /> Path Manual (C:, E:, dll)
          </button>
        </div>

        {#if activeTab === 'scan'}
          <button
            onclick={() => loadScannedProjects('D:\\Works')}
            disabled={isScanning}
            class="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
            title="Scan ulang D:\Works"
          >
            <RotateCw class="w-3 h-3 {isScanning ? 'animate-spin' : ''}" />
            Scan Ulang
          </button>
        {/if}
      </div>

      <!-- Tab 1: Auto-scanned Projects in D:\Works -->
      {#if activeTab === 'scan'}
        <div class="p-4 flex flex-col gap-3 flex-1 overflow-hidden min-h-0">
          <!-- Search input -->
          <div class="relative shrink-0">
            <Search class="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Cari project di D:\Works (contoh: sehati, affiliate, image, pacar)..."
              class="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500/60 transition"
            />
          </div>

          <!-- Root Folder (D:\Works) & Clear Workspace Hero Card -->
          <div class="rounded-xl border {isAtRoot() ? 'border-indigo-500/60 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-zinc-900/60 shadow-md shadow-indigo-950/20' : 'border-white/[0.08] bg-zinc-900/50 hover:border-indigo-500/30'} p-3 flex items-center justify-between gap-3 shrink-0 transition">
            <div
              role="button"
              tabindex="0"
              onclick={() => handleSelect('D:\\Works')}
              onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect('D:\\Works'); }}
              class="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
            >
              <div class="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                <Folder class="w-4 h-4 text-indigo-300" />
              </div>
              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-white tracking-tight group-hover:text-indigo-200 transition">D:\Works (Root Folder)</span>
                  <span class="px-2 py-0.2 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 text-[10px] font-mono">
                    Default Workspace
                  </span>
                </div>
                <p class="text-[11px] text-zinc-400 truncate">
                  Tanpa spesifik project. Simpan / buat project baru langsung di root folder ini.
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              {#if isAtRoot()}
                <span class="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center gap-1 font-mono">
                  <Check class="w-3.5 h-3.5 text-indigo-400" /> Sedang Aktif
                </span>
              {:else}
                <button
                  type="button"
                  onclick={() => handleSelect('D:\\Works')}
                  class="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-indigo-600 hover:text-white border border-white/10 text-zinc-200 text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <RotateCw class="w-3 h-3 text-indigo-400" />
                  <span>Set Root / Clear Workspace</span>
                </button>
              {/if}
            </div>
          </div>

          <!-- Structured Tree View -->
          <div class="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1.5 min-h-0 font-sans">
            {#if isScanning}
              <div class="py-12 flex flex-col items-center justify-center text-zinc-500 text-xs gap-2 shrink-0">
                <RotateCw class="w-5 h-5 animate-spin text-indigo-400" />
                <span>Membaca seluruh folder di D:\Works beserta turunannya...</span>
              </div>
            {:else if projectTree.length === 0}
              <div class="py-12 text-center text-zinc-500 text-xs shrink-0">
                Tidak ada project yang cocok dengan pencarian "{searchQuery}".
              </div>
            {:else}
              {#each projectTree as node}
                {@const isNodeCurrent = isCurrent(node.path)}
                {@const hasChildren = node.children.length > 0}
                {@const isExpanded = isNodeExpanded(node.id)}

                <div class="rounded-xl border {isNodeCurrent ? 'border-indigo-500/50 bg-indigo-950/20 shadow-indigo-950/20' : 'border-white/[0.08] bg-zinc-900/40 hover:border-white/[0.16]'} shrink-0 overflow-hidden shadow-sm transition">
                  <!-- PARENT FOLDER ROW (CLICKABLE AREA) -->
                  <div
                    role="button"
                    tabindex="0"
                    onclick={() => {
                      if (hasChildren) {
                        toggleExpand(node.id);
                      } else {
                        handleSelect(node.path);
                      }
                    }}
                    onkeydown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        if (hasChildren) toggleExpand(node.id);
                        else handleSelect(node.path);
                      }
                    }}
                    class="min-h-[52px] flex items-center justify-between p-3 bg-zinc-900/70 hover:bg-zinc-800/70 transition gap-2 cursor-pointer group"
                    title={hasChildren ? (isExpanded ? `Tutup folder ${node.name}` : `Buka folder ${node.name}`) : `Buka workspace: ${node.name}`}
                  >
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                      {#if hasChildren}
                        <button
                          type="button"
                          onclick={(e) => {
                            e.stopPropagation();
                            toggleExpand(node.id);
                          }}
                          class="p-1 rounded-md hover:bg-zinc-700/80 text-zinc-400 hover:text-white transition cursor-pointer shrink-0"
                          title={isExpanded ? 'Tutup turunan folder' : 'Buka turunan folder'}
                        >
                          {#if isExpanded}
                            <ChevronDown class="w-4 h-4 text-indigo-400" />
                          {:else}
                            <ChevronRight class="w-4 h-4 text-zinc-400 group-hover:text-zinc-200" />
                          {/if}
                        </button>
                      {:else}
                        <div class="w-6 shrink-0"></div>
                      {/if}

                      <div class="w-8 h-8 rounded-lg {isNodeCurrent ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200 group-hover:bg-zinc-750'} flex items-center justify-center shrink-0 transition">
                        <FolderGit class="w-4 h-4" />
                      </div>

                      <div class="flex flex-col min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="text-xs font-bold text-zinc-100 group-hover:text-white truncate transition-colors">
                            {node.name}
                          </span>
                          {#if hasChildren}
                            <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-mono select-none">
                              {node.children.length} sub-folder {isExpanded ? '▲' : '▼'}
                            </span>
                          {/if}
                          {#if node.isGit}
                            <span class="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800/80 text-zinc-400 font-mono flex items-center gap-1">
                              <GitBranch class="w-2.5 h-2.5 text-zinc-400" /> git
                            </span>
                          {/if}
                        </div>
                        <span class="text-[10px] text-zinc-500 font-mono truncate">{node.path}</span>
                      </div>
                    </div>

                    <!-- RIGHT: CLEAN ACTIVE / HOVER INDICATOR -->
                    <div class="flex items-center gap-2 shrink-0 pr-1">
                      {#if isNodeCurrent}
                        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[11px] font-mono font-bold shadow-sm shadow-indigo-500/20">
                          <Check class="w-3 h-3 text-indigo-400" />
                          <span>Active</span>
                        </div>
                      {:else if hasChildren}
                        <button
                          type="button"
                          onclick={(e) => {
                            e.stopPropagation();
                            handleSelect(node.path);
                          }}
                          class="px-2.5 py-1 text-[11px] rounded-lg bg-zinc-800/80 hover:bg-indigo-600 hover:text-white border border-white/10 text-zinc-300 font-medium transition cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
                          title={`Jadikan seluruh folder ${node.name} sebagai active workspace`}
                        >
                          <span>Set Active</span>
                        </button>
                      {:else}
                        <ArrowRight class="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-indigo-400" />
                      {/if}
                    </div>
                  </div>

                  <!-- LEVEL 2 CHILDREN (EXPANDED TREE LIST) -->
                  {#if hasChildren && isExpanded}
                    <div class="border-t border-white/[0.06] bg-zinc-950/80 p-2 pl-4 flex flex-col gap-1.5">
                      <div class="border-l-2 border-indigo-500/30 ml-3 pl-3 flex flex-col gap-1.5">
                        {#each node.children as child, idx}
                          {@const isChildCurrent = isCurrent(child.path)}
                          {@const hasSubChildren = child.children.length > 0}
                          {@const isChildExpanded = isNodeExpanded(child.id)}
                          {@const isLastChild = idx === node.children.length - 1}

                          {#if hasSubChildren}
                            <!-- SUB-FOLDER CONTAINER (e.g. CRM, Assets Management) -->
                            <div class="rounded-xl border {isChildCurrent ? 'border-indigo-500/50 bg-indigo-950/30' : 'border-white/[0.08] bg-zinc-900/60 hover:border-white/[0.14]'} overflow-hidden my-0.5 transition">
                              <div
                                role="button"
                                tabindex="0"
                                onclick={() => {
                                  if (hasSubChildren) {
                                    toggleExpand(child.id);
                                  } else {
                                    handleSelect(child.path);
                                  }
                                }}
                                onkeydown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    if (hasSubChildren) toggleExpand(child.id);
                                    else handleSelect(child.path);
                                  }
                                }}
                                class="min-h-[44px] px-3 py-2 flex items-center justify-between hover:bg-zinc-800/70 transition gap-2 cursor-pointer group"
                                title={hasSubChildren ? (isChildExpanded ? `Tutup sub-folder ${child.name}` : `Buka sub-folder ${child.name}`) : `Buka workspace: ${child.name}`}
                              >
                                <div class="flex items-center gap-2 min-w-0 flex-1">
                                  <button
                                    type="button"
                                    onclick={(e) => {
                                      e.stopPropagation();
                                      toggleExpand(child.id);
                                    }}
                                    class="p-1 rounded hover:bg-zinc-700/80 text-zinc-400 hover:text-white transition cursor-pointer shrink-0"
                                    title={isChildExpanded ? 'Tutup sub-folder' : 'Buka sub-folder'}
                                  >
                                    {#if isChildExpanded}
                                      <ChevronDown class="w-3.5 h-3.5 text-indigo-400" />
                                    {:else}
                                      <ChevronRight class="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200" />
                                    {/if}
                                  </button>

                                  <div class="w-7 h-7 rounded-lg {isChildCurrent ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'} flex items-center justify-center shrink-0 transition">
                                    <FolderGit class="w-3.5 h-3.5" />
                                  </div>

                                  <div class="flex flex-col min-w-0 flex-1">
                                    <div class="flex items-center gap-2 flex-wrap">
                                      <span class="text-xs font-bold {isChildCurrent ? 'text-white' : 'text-zinc-200 group-hover:text-white'} truncate transition-colors">
                                        {child.name}
                                      </span>
                                      <span class="text-[9px] px-2 py-0.2 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 font-mono select-none">
                                        {child.children.length} sub-project {isChildExpanded ? '▲' : '▼'}
                                      </span>
                                      {#if child.isGit}
                                        <span class="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800/80 text-zinc-400 font-mono flex items-center gap-1">
                                          <GitBranch class="w-2.5 h-2.5 text-zinc-400" /> git
                                        </span>
                                      {/if}
                                    </div>
                                    <span class="text-[10px] text-zinc-500 font-mono truncate">{child.relativePath}</span>
                                  </div>
                                </div>

                                <div class="flex items-center gap-2 shrink-0 pr-1">
                                  {#if isChildCurrent}
                                    <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/25 border border-indigo-500/40 text-indigo-300 text-[10px] font-mono font-bold">
                                      <Check class="w-3 h-3 text-indigo-400" />
                                      <span>Active</span>
                                    </div>
                                  {:else if hasSubChildren}
                                    <button
                                      type="button"
                                      onclick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(child.path);
                                      }}
                                      class="px-2 py-0.5 text-[10px] rounded-md bg-zinc-800/80 hover:bg-indigo-600 hover:text-white border border-white/10 text-zinc-300 font-medium transition cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
                                      title={`Jadikan folder ${child.name} sebagai active workspace`}
                                    >
                                      <span>Set Active</span>
                                    </button>
                                  {:else}
                                    <ArrowRight class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-indigo-400" />
                                  {/if}
                                </div>
                              </div>

                              <!-- LEVEL 3 SUB-CHILDREN (e.g. crm-backend, crm-frontend, docker-socket, docker-waha) -->
                              {#if isChildExpanded}
                                <div class="border-t border-white/[0.04] bg-zinc-950/70 p-2 pl-4 flex flex-col gap-1.5">
                                  <div class="border-l-2 border-indigo-500/30 ml-3 pl-3 flex flex-col gap-1.5">
                                    {#each child.children as subChild, sIdx}
                                      {@const isSubCurrent = isCurrent(subChild.path)}
                                      {@const isLastSub = sIdx === child.children.length - 1}
                                      <div
                                        role="button"
                                        tabindex="0"
                                        onclick={() => handleSelect(subChild.path)}
                                        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(subChild.path); }}
                                        class="min-h-[38px] px-3 py-1.5 rounded-lg {isSubCurrent ? 'bg-indigo-600/25 border-indigo-500/50 text-white' : 'bg-zinc-900/40 hover:bg-zinc-800/80 border-white/[0.04] hover:border-white/[0.1] text-zinc-300'} border flex items-center justify-between shrink-0 transition gap-2 cursor-pointer group"
                                        title={`Klik untuk buka workspace: ${subChild.name}`}
                                      >
                                        <div class="flex items-center gap-2.5 min-w-0 flex-1">
                                          <span class="text-zinc-600 font-mono text-xs select-none shrink-0">
                                            {isLastSub ? '└──' : '├──'}
                                          </span>
                                          <div class="w-5 h-5 rounded {isSubCurrent ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'} flex items-center justify-center shrink-0 transition">
                                            <Package class="w-3 h-3" />
                                          </div>
                                          <div class="flex flex-col min-w-0 flex-1">
                                            <div class="flex items-center gap-1.5">
                                              <span class="text-xs font-semibold {isSubCurrent ? 'text-white font-bold' : 'text-zinc-200 group-hover:text-white'} truncate transition-colors">
                                                {subChild.name}
                                              </span>
                                              {#if subChild.isGit}
                                                <span class="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800/80 text-zinc-400 font-mono flex items-center gap-1">
                                                  <GitBranch class="w-2.5 h-2.5 text-zinc-400" /> git
                                                </span>
                                              {/if}
                                            </div>
                                            <span class="text-[9px] text-zinc-500 font-mono truncate">{subChild.relativePath}</span>
                                          </div>
                                        </div>

                                        <div class="flex items-center gap-2 shrink-0 pr-1">
                                          {#if isSubCurrent}
                                            <div class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
                                              <Check class="w-3 h-3 text-emerald-400" />
                                              <span>Active</span>
                                            </div>
                                          {:else}
                                            <ArrowRight class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-indigo-400" />
                                          {/if}
                                        </div>
                                      </div>
                                    {/each}
                                  </div>
                                </div>
                              {/if}
                            </div>
                          {:else}
                            <!-- DIRECT LEAF PROJECT UNDER LEVEL 1 (e.g. ecommerce-sehati, erp-finance) -->
                            <div
                              role="button"
                              tabindex="0"
                              onclick={() => handleSelect(child.path)}
                              onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(child.path); }}
                              class="min-h-[40px] px-3 py-2 rounded-xl {isChildCurrent ? 'bg-indigo-600/15 border-indigo-500/40 text-white' : 'bg-zinc-900/50 hover:bg-zinc-800/80 border-white/[0.04] hover:border-white/[0.1] text-zinc-300'} border flex items-center justify-between shrink-0 transition gap-2 cursor-pointer group"
                              title={`Klik untuk buka: ${child.name}`}
                            >
                              <div class="flex items-center gap-2.5 min-w-0 flex-1">
                                <span class="text-zinc-600 font-mono text-xs select-none shrink-0">
                                  {isLastChild ? '└──' : '├──'}
                                </span>
                                <div class="w-6 h-6 rounded-md {isChildCurrent ? 'bg-indigo-600 text-white shadow-sm' : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'} flex items-center justify-center shrink-0 transition">
                                  <Package class="w-3.5 h-3.5" />
                                </div>
                                <div class="flex flex-col min-w-0 flex-1">
                                  <div class="flex items-center gap-1.5">
                                    <span class="text-xs font-semibold {isChildCurrent ? 'text-white' : 'text-zinc-200 group-hover:text-white'} truncate transition-colors">
                                      {child.name}
                                    </span>
                                    {#if child.isGit}
                                      <span class="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800/80 text-zinc-400 font-mono flex items-center gap-1">
                                        <GitBranch class="w-2.5 h-2.5 text-zinc-400" /> git
                                      </span>
                                    {/if}
                                  </div>
                                  <span class="text-[10px] text-zinc-500 font-mono truncate">{child.relativePath}</span>
                                </div>
                              </div>

                              <div class="flex items-center gap-2 shrink-0 pr-1">
                                {#if isChildCurrent}
                                  <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/25 border border-indigo-500/40 text-indigo-300 text-[10px] font-mono font-bold">
                                    <Check class="w-3 h-3 text-indigo-400" />
                                    <span>Active</span>
                                  </div>
                                {:else}
                                  <ArrowRight class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-indigo-400" />
                                {/if}
                              </div>
                            </div>
                          {/if}
                        {/each}
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            {/if}
          </div>
        </div>
      {/if}

      <!-- Tab 2: Create New Project (Default: D:\Works) -->
      {#if activeTab === 'create'}
        <div class="p-6 flex flex-col gap-5 text-xs flex-1 overflow-y-auto min-h-0">
          <div class="flex flex-col gap-2">
            <label for="new-proj-name" class="font-bold text-zinc-200 text-xs">Nama Project Baru:</label>
            <input
              id="new-proj-name"
              type="text"
              bind:value={newProjectName}
              placeholder="Contoh: my-awesome-app"
              class="bg-zinc-900/80 border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-zinc-100 font-mono text-xs outline-none transition"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="new-proj-parent" class="font-bold text-zinc-200 text-xs">Direktori Induk (Parent Folder):</label>
            <input
              id="new-proj-parent"
              type="text"
              bind:value={newProjectParent}
              class="bg-zinc-900/80 border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-zinc-100 font-mono text-xs outline-none transition"
            />
            <span class="text-[11px] text-zinc-500 font-mono">
              Lokasi tujuan: <code class="text-indigo-400">{newProjectParent}\{newProjectName || '&lt;nama-project&gt;'}</code>
            </span>
          </div>

          <div class="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="init-git-cb"
              bind:checked={initGit}
              class="w-4 h-4 rounded cursor-pointer accent-indigo-600"
            />
            <label for="init-git-cb" class="text-zinc-300 font-medium cursor-pointer select-none">
              Inisialisasi Git Repository (`git init`) otomatis
            </label>
          </div>

          <button
            onclick={handleCreateProject}
            disabled={isCreating || !newProjectName.trim()}
            class="mt-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition cursor-pointer active:scale-95"
          >
            <Sparkles class="w-4 h-4" />
            {isCreating ? 'Membuat Project...' : 'Buat & Buka Project di zhiEnd Agent'}
          </button>
        </div>
      {/if}

      <!-- Tab 3: Manual Path Input (Outside D:) -->
      {#if activeTab === 'manual'}
        <div class="p-6 flex flex-col gap-6 text-xs flex-1 overflow-y-auto min-h-0">
          <div class="flex flex-col gap-2">
            <label for="manual-path-input" class="font-bold text-zinc-200 text-xs">Masukkan Path Direktori Lengkap:</label>
            <div class="flex gap-2">
              <input
                id="manual-path-input"
                type="text"
                bind:value={manualPathInput}
                placeholder="Contoh: C:\Users\zhien\my-project atau E:\Repos\backend"
                class="flex-1 bg-zinc-900/80 border border-white/[0.08] focus:border-indigo-500 rounded-xl p-3 text-zinc-100 font-mono text-xs outline-none transition"
              />
              <button
                onclick={() => handleSelect(manualPathInput)}
                disabled={isSelecting || !manualPathInput.trim()}
                class="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-40 text-white font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-500/20 active:scale-95 transition"
              >
                <span>Buka</span>
                <ArrowRight class="w-3.5 h-3.5" />
              </button>
            </div>
            <span class="text-[11px] text-zinc-500">Gunakan opsi ini jika project Anda berada di drive C:, E:, atau lokasi jaringan lainnya di luar D:\Works.</span>
          </div>

          {#if recentProjects && recentProjects.length > 0}
            <div class="flex flex-col gap-3 pt-4 border-t border-white/[0.08] flex-1 min-h-0">
              <div class="flex items-center justify-between">
                <span class="text-xs text-zinc-300 font-bold">Riwayat Workspace Terakhir ({recentProjects.length})</span>
                <span class="text-[10px] text-zinc-500 font-mono">Klik baris untuk langsung membuka</span>
              </div>
              
              <div class="flex flex-col gap-2 flex-1 overflow-y-auto pr-1">
                {#each recentProjects as r}
                  {@const isCurrentProj = isCurrent(r)}
                  <button
                    type="button"
                    onclick={() => handleSelect(r)}
                    class="p-3 min-h-[46px] shrink-0 rounded-xl {isCurrentProj ? 'bg-indigo-600/15 border-indigo-500/40 text-white shadow-sm' : 'bg-zinc-900/60 hover:bg-zinc-800/80 border-white/[0.06] hover:border-indigo-500/30 text-zinc-300 hover:text-white'} border flex items-center justify-between gap-3 text-left font-mono text-xs cursor-pointer transition group"
                    title={`Buka: ${r}`}
                  >
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div class="w-7 h-7 rounded-lg {isCurrentProj ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 group-hover:text-indigo-300 group-hover:bg-zinc-750'} flex items-center justify-center shrink-0 transition">
                        <FolderGit class="w-3.5 h-3.5" />
                      </div>
                      <span class="truncate">{r}</span>
                    </div>

                    <div class="flex items-center gap-2 shrink-0 pr-1">
                      {#if isCurrentProj}
                        <div class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/25 border border-indigo-500/40 text-indigo-300 text-[10px] font-mono font-bold">
                          <Check class="w-3 h-3 text-indigo-400" />
                          <span>Active</span>
                        </div>
                      {:else}
                        <ArrowRight class="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-indigo-400" />
                      {/if}
                    </div>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}

    </div>
  </div>
{/if}
