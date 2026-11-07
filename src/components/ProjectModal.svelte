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
  <div class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-200">
    <div class="w-full max-w-3xl h-[92vh] sm:h-[85vh] bg-[#FCFCFA] border-2 border-[#D0CEC7] rounded-none flex flex-col shadow-2xl overflow-hidden font-sans relative">
      <!-- 4 Corner Registration Marks (Solid Orange Squares ■) -->
      <span class="reg-dot reg-dot-tl"></span>
      <span class="reg-dot reg-dot-tr"></span>
      <span class="reg-dot reg-dot-bl"></span>
      <span class="reg-dot reg-dot-br"></span>
      
      <!-- Top Architectural Drafting Header Seam -->
      <div class="px-4 py-3 border-b border-[#D0CEC7] bg-[#ECEAE5] flex items-center justify-between shrink-0 font-tech">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="crosshair-box w-6 h-6 text-[10px] inline-flex items-center justify-center hover:rotate-45 transition-transform duration-300 cursor-crosshair shrink-0 rounded-none"></span>
          <div class="min-w-0">
            <h3 class="text-xs sm:text-sm font-bold text-[#111315] tracking-wider flex items-center gap-2 truncate uppercase">
              <span>:: WORKSPACE DIRECTORY // MATRIX</span>
              <span class="text-[9px] sm:text-[10px] font-stencil px-1.5 py-0.5 rounded-none bg-[#FCFCFA] text-[#FF5500] border border-[#D0CEC7] font-bold hidden xs:inline">
                ROOT: D:\Works
              </span>
            </h3>
            <p class="text-[10px] text-[#5C6066] font-grotesk truncate">Sistem navigasi direktori proyek, pemindaian otomatis, dan inisialisasi repositori</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="hidden sm:inline font-stencil text-[10px] text-[#8C9097]">SYS // CH-01</span>
          <button onclick={onClose} class="text-[#5C6066] hover:text-[#111315] p-1.5 rounded-none hover:bg-[#D0CEC7]/60 transition-colors cursor-pointer" title="Tutup Matrix">
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Segmented Cyber-Industrial Navigation Bays (Sharp 90° Channels) -->
      <div class="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-[#D0CEC7] bg-[#E5E3DD] text-xs font-tech font-bold overflow-x-auto gap-2 shrink-0 scrollbar-none">
        <div class="flex gap-1.5 shrink-0">
          <button
            onclick={() => activeTab = 'scan'}
            class="px-3 py-1.5 rounded-none flex items-center gap-1.5 cursor-pointer uppercase tracking-wider transition-all active:scale-95 {activeTab === 'scan' ? 'bg-[#FCFCFA] text-[#FF5500] border border-[#D0CEC7] shadow-2xs' : 'text-[#5C6066] hover:text-[#111315] hover:bg-[#ECEAE5]'}"
          >
            <FolderGit class="w-3.5 h-3.5" />
            <span>D:\Works ({scannedProjects.length})</span>
          </button>
          <button
            onclick={() => activeTab = 'create'}
            class="px-3 py-1.5 rounded-none flex items-center gap-1.5 cursor-pointer uppercase tracking-wider transition-all active:scale-95 {activeTab === 'create' ? 'bg-[#FCFCFA] text-[#FF5500] border border-[#D0CEC7] shadow-2xs' : 'text-[#5C6066] hover:text-[#111315] hover:bg-[#ECEAE5]'}"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Buat Project</span>
          </button>
          <button
            onclick={() => activeTab = 'manual'}
            class="px-3 py-1.5 rounded-none flex items-center gap-1.5 cursor-pointer uppercase tracking-wider transition-all active:scale-95 {activeTab === 'manual' ? 'bg-[#FCFCFA] text-[#FF5500] border border-[#D0CEC7] shadow-2xs' : 'text-[#5C6066] hover:text-[#111315] hover:bg-[#ECEAE5]'}"
          >
            <Folder class="w-3.5 h-3.5" />
            <span>Path Manual</span>
          </button>
        </div>

        {#if activeTab === 'scan'}
          <button
            onclick={() => loadScannedProjects('D:\\Works')}
            disabled={isScanning}
            class="text-[11px] text-[#5C6066] hover:text-[#111315] flex items-center gap-1.5 cursor-pointer font-stencil font-semibold px-2 py-1 rounded-none hover:bg-[#ECEAE5] transition-colors"
            title="Scan ulang direktori D:\Works"
          >
            <RotateCw class="w-3 h-3 {isScanning ? 'animate-spin text-[#FF5500]' : ''}" />
            <span>RE-SCAN</span>
          </button>
        {/if}
      </div>

      <!-- Tab Content with Retro Channel Switch Animation -->
      {#key activeTab}
        <div class="flex-1 flex flex-col overflow-hidden min-h-0 animate-retro-channel">
          <!-- Tab 1: Auto-scanned Projects in D:\Works -->
          {#if activeTab === 'scan'}
            <div class="p-3.5 sm:p-4 flex flex-col gap-3 flex-1 overflow-hidden min-h-0 bg-[#ECEAE5]">
              <!-- Search input well -->
              <div class="relative shrink-0">
                <Search class="w-3.5 h-3.5 text-[#5C6066] absolute left-3 top-3" />
                <input
                  type="text"
                  bind:value={searchQuery}
                  placeholder="Filter direktori di D:\Works (contoh: sehati, crm, pacar, affiliate)..."
                  class="w-full bg-[#FCFCFA] border border-[#D0CEC7] rounded-none pl-9 pr-3 py-2 text-xs text-[#111315] placeholder-[#8C9097] outline-none focus:border-[#FF5500] focus:ring-1 focus:ring-[#FF5500] transition font-grotesk shadow-2xs"
                />
              </div>

              <!-- Root Folder (D:\Works) & Clear Workspace Hero Card -->
              <div class="rounded-none border {isAtRoot() ? 'border-[#FF5500] bg-[#FCFCFA] shadow-xs' : 'border-[#D0CEC7] bg-[#FCFCFA] hover:border-[#A8A59C]'} p-3 flex items-center justify-between gap-3 shrink-0 transition relative group">
                <div
                  role="button"
                  tabindex="0"
                  onclick={() => handleSelect('D:\\Works')}
                  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect('D:\\Works'); }}
                  class="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                >
                  <div class="w-8 h-8 rounded-none {isAtRoot() ? 'bg-[#FF5500] text-white' : 'bg-[#E5E3DD] text-[#111315] group-hover:bg-[#FF5500] group-hover:text-white'} border border-[#D0CEC7] flex items-center justify-center transition-all shrink-0">
                    <Folder class="w-4 h-4" />
                  </div>
                  <div class="flex flex-col min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold font-tech uppercase tracking-wider text-[#111315] group-hover:text-[#FF5500] transition-colors">D:\Works (Root Folder)</span>
                      <span class="px-1.5 py-0.5 rounded-none bg-[#E5E3DD] text-[#5C6066] border border-[#D0CEC7] text-[10px] font-stencil font-bold">
                        DEFAULT ROOT
                      </span>
                    </div>
                    <p class="text-[11px] text-[#5C6066] font-grotesk truncate">
                      Tanpa direktori terisolasi. Akses penuh ke seluruh subfolder D:\Works.
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  {#if isAtRoot()}
                    <span class="px-2.5 py-1 rounded-none bg-white border border-[#FF5500] text-[#FF5500] text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
                      <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>AKTIF</span>
                    </span>
                  {:else}
                    <button
                      type="button"
                      onclick={() => handleSelect('D:\\Works')}
                      class="btn-hardware px-3 py-1.5 rounded-none text-xs font-tech font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                    >
                      <RotateCw class="w-3 h-3 text-[#FF5500]" />
                      <span>SET ROOT</span>
                    </button>
                  {/if}
                </div>
              </div>

          <!-- Structured Tree View -->
          <div class="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1.5 min-h-0 font-sans">
            {#if isScanning}
              <div class="py-12 flex flex-col items-center justify-center text-[#5C6066] text-xs gap-2 shrink-0 font-mono">
                <RotateCw class="w-5 h-5 animate-spin text-[#FF5500]" />
                <span>Membaca seluruh folder di D:\Works beserta turunannya...</span>
              </div>
            {:else if projectTree.length === 0}
              <div class="py-12 text-center text-[#5C6066] text-xs shrink-0 font-mono">
                Tidak ada project yang cocok dengan pencarian "{searchQuery}".
              </div>
            {:else}
              {#each projectTree as node}
                {@const isNodeCurrent = isCurrent(node.path)}
                {@const hasChildren = node.children.length > 0}
                {@const isExpanded = isNodeExpanded(node.id)}

                <div class="rounded-xl border {isNodeCurrent ? 'border-[#FF5500] bg-[#FCFCFA] shadow-xs' : 'border-[#D0CEC7] bg-[#FCFCFA] hover:border-[#A8A59C]'} shrink-0 overflow-hidden shadow-2xs transition">
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
                    class="min-h-[52px] flex items-center justify-between p-3 bg-[#FCFCFA] hover:bg-[#ECEAE5]/70 active:scale-[0.99] transition gap-2 cursor-pointer group"
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
                          class="p-1 rounded-md hover:bg-[#E5E3DD] text-[#5C6066] hover:text-[#111315] transition cursor-pointer shrink-0"
                          title={isExpanded ? 'Tutup turunan folder' : 'Buka turunan folder'}
                        >
                          {#if isExpanded}
                            <ChevronDown class="w-4 h-4 text-[#FF5500]" />
                          {:else}
                            <ChevronRight class="w-4 h-4 text-[#5C6066] group-hover:text-[#111315]" />
                          {/if}
                        </button>
                      {:else}
                        <div class="w-6 shrink-0"></div>
                      {/if}

                      <div class="w-8 h-8 rounded-lg {isNodeCurrent ? 'bg-[#FF5500] text-white shadow-xs' : 'bg-[#ECEAE5] text-[#111315] group-hover:bg-[#E5E3DD]'} border border-[#D0CEC7] flex items-center justify-center shrink-0 transition">
                        <FolderGit class="w-4 h-4" />
                      </div>

                      <div class="flex flex-col min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="text-xs font-bold font-tech uppercase tracking-wide {isNodeCurrent ? 'text-[#FF5500]' : 'text-[#111315] group-hover:text-[#FF5500]'} truncate transition-colors">
                            {node.name}
                          </span>
                          {#if hasChildren}
                            <span class="text-[9px] px-1.5 py-0.5 rounded bg-[#ECEAE5] text-[#5C6066] border border-[#D0CEC7] font-stencil select-none font-bold">
                              {node.children.length} SUB-BAYS {isExpanded ? '▲' : '▼'}
                            </span>
                          {/if}
                          {#if node.isGit}
                            <span class="text-[9px] px-1.5 py-0.5 rounded bg-[#FCFCFA] text-[#5C6066] font-stencil flex items-center gap-1 border border-[#D0CEC7]">
                              <GitBranch class="w-2.5 h-2.5 text-[#FF5500]" /> GIT
                            </span>
                          {/if}
                        </div>
                        <span class="text-[10px] text-[#5C6066] font-stencil truncate">{node.path}</span>
                      </div>
                    </div>

                    <!-- RIGHT: CLEAN ACTIVE / HOVER INDICATOR -->
                    <div class="flex items-center gap-2 shrink-0 pr-1">
                      {#if isNodeCurrent}
                        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FCFCFA] border border-[#FF5500] text-[#FF5500] text-[10px] font-tech font-bold uppercase tracking-wider shadow-2xs">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>AKTIF</span>
                        </div>
                      {:else if hasChildren}
                        <button
                          type="button"
                          onclick={(e) => {
                            e.stopPropagation();
                            handleSelect(node.path);
                          }}
                          class="btn-hardware px-2.5 py-1 text-[10px] rounded font-tech font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                          title={`Jadikan seluruh folder ${node.name} sebagai active workspace`}
                        >
                          <span>SET AKTIF</span>
                        </button>
                      {:else}
                        <ArrowRight class="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#FF5500]" />
                      {/if}
                    </div>
                  </div>

                  <!-- LEVEL 2 CHILDREN (EXPANDED TREE LIST) -->
                  {#if hasChildren && isExpanded}
                    <div class="border-t border-[#D0CEC7] bg-[#E5E3DD] p-2 pl-4 flex flex-col gap-1.5">
                      <div class="border-l-2 border-[#D0CEC7] ml-3 pl-3 flex flex-col gap-1.5">
                        {#each node.children as child, idx}
                          {@const isChildCurrent = isCurrent(child.path)}
                          {@const hasSubChildren = child.children.length > 0}
                          {@const isChildExpanded = isNodeExpanded(child.id)}
                          {@const isLastChild = idx === node.children.length - 1}

                          {#if hasSubChildren}
                            <!-- SUB-FOLDER CONTAINER (e.g. CRM, Assets Management) -->
                            <div class="rounded-lg border {isChildCurrent ? 'border-[#FF5500] bg-[#FCFCFA]' : 'border-[#D0CEC7] bg-[#FCFCFA] hover:border-[#A8A59C]'} overflow-hidden my-0.5 transition shadow-2xs">
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
                                class="min-h-[44px] px-3 py-2 flex items-center justify-between hover:bg-[#ECEAE5]/70 active:scale-[0.99] transition gap-2 cursor-pointer group"
                                title={hasSubChildren ? (isChildExpanded ? `Tutup sub-folder ${child.name}` : `Buka sub-folder ${child.name}`) : `Buka workspace: ${child.name}`}
                              >
                                <div class="flex items-center gap-2 min-w-0 flex-1">
                                  <button
                                    type="button"
                                    onclick={(e) => {
                                      e.stopPropagation();
                                      toggleExpand(child.id);
                                    }}
                                    class="p-1 rounded hover:bg-[#E5E3DD] text-[#5C6066] hover:text-[#111315] transition cursor-pointer shrink-0"
                                    title={isChildExpanded ? 'Tutup sub-folder' : 'Buka sub-folder'}
                                  >
                                    {#if isChildExpanded}
                                      <ChevronDown class="w-3.5 h-3.5 text-[#FF5500]" />
                                    {:else}
                                      <ChevronRight class="w-3.5 h-3.5 text-[#5C6066] group-hover:text-[#111315]" />
                                    {/if}
                                  </button>

                                  <div class="w-7 h-7 rounded {isChildCurrent ? 'bg-[#FF5500] text-white shadow-xs' : 'bg-[#ECEAE5] text-[#111315]'} border border-[#D0CEC7] flex items-center justify-center shrink-0 transition">
                                    <FolderGit class="w-3.5 h-3.5" />
                                  </div>

                                  <div class="flex flex-col min-w-0 flex-1">
                                    <div class="flex items-center gap-2 flex-wrap">
                                      <span class="text-xs font-bold font-tech uppercase tracking-wide {isChildCurrent ? 'text-[#FF5500]' : 'text-[#111315] group-hover:text-[#FF5500]'} truncate transition-colors">
                                        {child.name}
                                      </span>
                                      <span class="text-[9px] px-1.5 py-0.5 rounded bg-[#ECEAE5] text-[#5C6066] border border-[#D0CEC7] font-stencil select-none font-bold">
                                        {child.children.length} SUB-PROJECT {isChildExpanded ? '▲' : '▼'}
                                      </span>
                                      {#if child.isGit}
                                        <span class="text-[9px] px-1.5 py-0.5 rounded bg-[#FCFCFA] text-[#5C6066] font-stencil flex items-center gap-1 border border-[#D0CEC7]">
                                          <GitBranch class="w-2.5 h-2.5 text-[#FF5500]" /> GIT
                                        </span>
                                      {/if}
                                    </div>
                                    <span class="text-[10px] text-[#5C6066] font-stencil truncate">{child.relativePath}</span>
                                  </div>
                                </div>

                                <div class="flex items-center gap-2 shrink-0 pr-1">
                                  {#if isChildCurrent}
                                    <div class="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#FCFCFA] border border-[#FF5500] text-[#FF5500] text-[10px] font-tech font-bold uppercase tracking-wider">
                                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                      <span>AKTIF</span>
                                    </div>
                                  {:else if hasSubChildren}
                                    <button
                                      type="button"
                                      onclick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(child.path);
                                      }}
                                      class="btn-hardware px-2 py-0.5 text-[10px] rounded font-tech font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                                      title={`Jadikan folder ${child.name} sebagai active workspace`}
                                    >
                                      <span>SET AKTIF</span>
                                    </button>
                                  {:else}
                                    <ArrowRight class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#FF5500]" />
                                  {/if}
                                </div>
                              </div>

                              <!-- LEVEL 3 SUB-CHILDREN (e.g. crm-backend, crm-frontend, docker-socket, docker-waha) -->
                              {#if isChildExpanded}
                                <div class="border-t border-[#D0CEC7] bg-[#ECEAE5] p-2 pl-4 flex flex-col gap-1.5">
                                  <div class="border-l-2 border-[#D0CEC7] ml-3 pl-3 flex flex-col gap-1.5">
                                    {#each child.children as subChild, sIdx}
                                      {@const isSubCurrent = isCurrent(subChild.path)}
                                      {@const isLastSub = sIdx === child.children.length - 1}
                                      <div
                                        role="button"
                                        tabindex="0"
                                        onclick={() => handleSelect(subChild.path)}
                                        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(subChild.path); }}
                                        class="min-h-[38px] px-3 py-1.5 rounded-lg {isSubCurrent ? 'bg-[#FCFCFA] border-[#FF5500] text-[#FF5500]' : 'bg-[#FCFCFA] hover:bg-[#ECEAE5] border-[#D0CEC7] text-[#111315]'} border flex items-center justify-between shrink-0 transition gap-2 cursor-pointer group active:scale-[0.99] shadow-2xs"
                                        title={`Klik untuk buka workspace: ${subChild.name}`}
                                      >
                                        <div class="flex items-center gap-2.5 min-w-0 flex-1">
                                          <span class="text-[#8C9097] font-stencil text-xs select-none shrink-0">
                                            {isLastSub ? '└──' : '├──'}
                                          </span>
                                          <div class="w-5 h-5 rounded {isSubCurrent ? 'bg-[#FF5500] text-white shadow-xs' : 'bg-[#ECEAE5] text-[#111315]'} border border-[#D0CEC7] flex items-center justify-center shrink-0 transition">
                                            <Package class="w-3 h-3" />
                                          </div>
                                          <div class="flex flex-col min-w-0 flex-1">
                                            <div class="flex items-center gap-1.5">
                                              <span class="text-xs font-tech font-bold uppercase tracking-wider {isSubCurrent ? 'text-[#FF5500]' : 'text-[#111315] group-hover:text-[#FF5500]'} truncate transition-colors">
                                                {subChild.name}
                                              </span>
                                              {#if subChild.isGit}
                                                <span class="text-[9px] px-1.5 py-0.5 rounded bg-[#FCFCFA] text-[#5C6066] font-stencil flex items-center gap-1 border border-[#D0CEC7]">
                                                  <GitBranch class="w-2.5 h-2.5 text-[#FF5500]" /> GIT
                                                </span>
                                              {/if}
                                            </div>
                                            <span class="text-[9px] text-[#5C6066] font-stencil truncate">{subChild.relativePath}</span>
                                          </div>
                                        </div>

                                        <div class="flex items-center gap-2 shrink-0 pr-1">
                                          {#if isSubCurrent}
                                            <div class="flex items-center gap-1 px-2 py-0.5 rounded bg-[#FCFCFA] border border-[#FF5500] text-[#FF5500] text-[10px] font-tech font-bold uppercase tracking-wider">
                                              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                              <span>AKTIF</span>
                                            </div>
                                          {:else}
                                            <ArrowRight class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#FF5500]" />
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
                              class="min-h-[40px] px-3 py-2 rounded-lg {isChildCurrent ? 'bg-[#FCFCFA] border-[#FF5500] text-[#FF5500]' : 'bg-[#FCFCFA] hover:bg-[#ECEAE5] border-[#D0CEC7] text-[#111315]'} border flex items-center justify-between shrink-0 transition gap-2 cursor-pointer group active:scale-[0.99] shadow-2xs"
                              title={`Klik untuk buka: ${child.name}`}
                            >
                              <div class="flex items-center gap-2.5 min-w-0 flex-1">
                                <span class="text-[#5C6066] font-mono text-xs select-none shrink-0">
                                  {isLastChild ? '└──' : '├──'}
                                </span>
                                <div class="w-6 h-6 rounded-md {isChildCurrent ? 'bg-[#FF5500] text-white shadow-xs' : 'bg-[#ECEAE5] text-[#191B1D]'} flex items-center justify-center shrink-0 transition">
                                  <Package class="w-3.5 h-3.5" />
                                </div>
                                <div class="flex flex-col min-w-0 flex-1">
                                  <div class="flex items-center gap-1.5">
                                    <span class="text-xs font-semibold {isChildCurrent ? 'text-[#FF5500]' : 'text-[#191B1D] group-hover:text-[#FF5500]'} truncate transition-colors">
                                      {child.name}
                                    </span>
                                    {#if child.isGit}
                                      <span class="text-[9px] px-1.5 py-0.2 rounded bg-[#ECEAE5] text-[#5C6066] font-mono flex items-center gap-1 border border-[#D0CEC7]">
                                        <GitBranch class="w-2.5 h-2.5 text-[#5C6066]" /> git
                                      </span>
                                    {/if}
                                  </div>
                                  <span class="text-[10px] text-[#5C6066] font-mono truncate">{child.relativePath}</span>
                                </div>
                              </div>

                              <div class="flex items-center gap-2 shrink-0 pr-1">
                                {#if isChildCurrent}
                                  <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-100 border border-[#FF5500] text-[#FF5500] text-[10px] font-mono font-bold">
                                    <Check class="w-3 h-3 text-[#FF5500]" />
                                    <span>Active</span>
                                  </div>
                                {:else}
                                  <ArrowRight class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#FF5500]" />
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
        <div class="p-4 sm:p-6 flex flex-col gap-4 text-xs flex-1 overflow-y-auto min-h-0 bg-[#ECEAE5]">
          <div class="p-3.5 rounded-lg bg-[#FCFCFA] border border-[#D0CEC7] shadow-2xs flex flex-col gap-1.5">
            <span class="font-tech font-bold uppercase tracking-wider text-[#FF5500] text-[11px]">:: DIREKTORI TARGET</span>
            <span class="text-[11px] text-[#5C6066] font-grotesk">Inisialisasi direktori codebase baru di dalam storage matrix D:\Works dengan Git otomatis.</span>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="new-proj-name" class="font-tech font-bold text-[#111315] text-xs uppercase tracking-wider">Nama Project Baru:</label>
            <input
              id="new-proj-name"
              type="text"
              bind:value={newProjectName}
              placeholder="Contoh: my-awesome-app"
              class="bg-[#FCFCFA] border border-[#D0CEC7] focus:border-[#FF5500] focus:ring-1 focus:ring-[#FF5500] rounded-lg p-2.5 text-[#111315] font-stencil text-xs outline-none transition shadow-2xs"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="new-proj-parent" class="font-tech font-bold text-[#111315] text-xs uppercase tracking-wider">Direktori Induk (Parent Folder):</label>
            <input
              id="new-proj-parent"
              type="text"
              bind:value={newProjectParent}
              class="bg-[#FCFCFA] border border-[#D0CEC7] focus:border-[#FF5500] focus:ring-1 focus:ring-[#FF5500] rounded-lg p-2.5 text-[#111315] font-stencil text-xs outline-none transition shadow-2xs"
            />
            <span class="text-[10px] text-[#5C6066] font-stencil">
              LOKASI TUJUAN: <code class="text-[#FF5500] font-bold">{newProjectParent}\{newProjectName || '&lt;nama-project&gt;'}</code>
            </span>
          </div>

          <div class="flex items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              id="init-git-cb"
              bind:checked={initGit}
              class="w-4 h-4 rounded cursor-pointer accent-[#FF5500]"
            />
            <label for="init-git-cb" class="text-[#111315] font-tech font-bold text-xs cursor-pointer select-none uppercase tracking-wide">
              Inisialisasi Git Repository (`git init`) otomatis
            </label>
          </div>

          <button
            onclick={handleCreateProject}
            disabled={isCreating || !newProjectName.trim()}
            class="btn-safety mt-2 py-3 rounded-lg text-white font-tech font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer active:scale-95 disabled:opacity-40"
          >
            <Sparkles class="w-4 h-4" />
            <span>{isCreating ? 'MEMBUAT PROJECT...' : 'BUAT & BUKA PROJECT DI ZHIEND'}</span>
          </button>
        </div>
      {/if}

      <!-- Tab 3: Manual Path Input (Outside D:) -->
      {#if activeTab === 'manual'}
        <div class="p-4 sm:p-6 flex flex-col gap-4 text-xs flex-1 overflow-y-auto min-h-0 bg-[#ECEAE5]">
          <div class="flex flex-col gap-1.5">
            <label for="manual-path-input" class="font-tech font-bold text-[#111315] text-xs uppercase tracking-wider">Masukkan Path Direktori Lengkap:</label>
            <div class="flex gap-2">
              <input
                id="manual-path-input"
                type="text"
                bind:value={manualPathInput}
                placeholder="Contoh: C:\Users\zhien\my-project atau E:\Repos\backend"
                class="flex-1 bg-[#FCFCFA] border border-[#D0CEC7] focus:border-[#FF5500] focus:ring-1 focus:ring-[#FF5500] rounded-lg p-2.5 text-[#111315] font-stencil text-xs outline-none transition shadow-2xs"
              />
              <button
                onclick={() => handleSelect(manualPathInput)}
                disabled={isSelecting || !manualPathInput.trim()}
                class="btn-safety px-5 py-2.5 rounded-lg text-white font-tech font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95 transition disabled:opacity-40"
              >
                <span>BUKA</span>
                <ArrowRight class="w-3.5 h-3.5" />
              </button>
            </div>
            <span class="text-[10px] text-[#5C6066] font-grotesk">Gunakan opsi ini jika project Anda berada di drive C:, E:, atau lokasi jaringan lainnya di luar D:\Works.</span>
          </div>

          {#if recentProjects && recentProjects.length > 0}
            <div class="flex flex-col gap-2.5 pt-3 border-t border-[#D0CEC7] flex-1 min-h-0">
              <div class="flex items-center justify-between">
                <span class="text-xs text-[#111315] font-tech font-bold uppercase tracking-wider">RIWAYAT WORKSPACE TERAKHIR ({recentProjects.length})</span>
                <span class="text-[10px] text-[#5C6066] font-stencil">KLIK UNTUK MEMBUKA</span>
              </div>
              
              <div class="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-1">
                {#each recentProjects as r}
                  {@const isCurrentProj = isCurrent(r)}
                  <button
                    type="button"
                    onclick={() => handleSelect(r)}
                    class="p-2.5 min-h-[42px] shrink-0 rounded-lg {isCurrentProj ? 'bg-[#FCFCFA] border-[#FF5500] text-[#FF5500] font-bold' : 'bg-[#FCFCFA] hover:bg-[#ECEAE5] border-[#D0CEC7] text-[#111315]'} border flex items-center justify-between gap-3 text-left font-stencil text-xs cursor-pointer transition-all active:scale-[0.99] group shadow-2xs"
                    title={`Buka: ${r}`}
                  >
                    <div class="flex items-center gap-2.5 min-w-0">
                      <div class="w-6 h-6 rounded {isCurrentProj ? 'bg-[#FF5500] text-white' : 'bg-[#ECEAE5] text-[#111315]'} border border-[#D0CEC7] flex items-center justify-center shrink-0 transition">
                        <FolderGit class="w-3 h-3" />
                      </div>
                      <span class="truncate">{r}</span>
                    </div>

                    <div class="flex items-center gap-2 shrink-0 pr-1">
                      {#if isCurrentProj}
                        <div class="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#FCFCFA] border border-[#FF5500] text-[#FF5500] text-[10px] font-tech font-bold uppercase tracking-wider">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>AKTIF</span>
                        </div>
                      {:else}
                        <ArrowRight class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#FF5500]" />
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
    {/key}

    </div>
  </div>
{/if}
