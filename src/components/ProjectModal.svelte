<script lang="ts">
  import { onMount } from 'svelte';
  import type { ScannedProject } from '../types';
  import { api } from '../services/api';
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
    Sparkles 
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

  const filteredProjects = $derived(() => {
    if (!searchQuery.trim()) return scannedProjects;
    const q = searchQuery.toLowerCase();
    return scannedProjects.filter(p => 
      p.name.toLowerCase().includes(q) || p.relativePath.toLowerCase().includes(q)
    );
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
      alert('Nama project harus diisi.');
      return;
    }
    isCreating = true;
    try {
      const res = await api.createProject(newProjectName.trim(), newProjectParent.trim(), initGit);
      if (res.success && res.activeProject) {
        newProjectName = '';
        await onSelectProject(res.activeProject);
        onClose();
      } else {
        alert('Gagal membuat project: ' + (res.error || 'Terjadi kesalahan'));
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      isCreating = false;
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
    <div class="w-full max-w-2xl bg-zinc-950/90 border border-white/[0.08] rounded-2xl flex flex-col shadow-2xl shadow-indigo-950/20 max-h-[85vh] overflow-hidden">
      
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
        <div class="p-4 flex flex-col gap-3 flex-1 overflow-hidden">
          <!-- Search input -->
          <div class="relative">
            <Search class="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Cari project di D:\Works (contoh: sehati, affiliate, image, pacar)..."
              class="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500/60 transition"
            />
          </div>

          <!-- Project list grid -->
          <div class="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
            {#if isScanning}
              <div class="py-12 flex flex-col items-center justify-center text-zinc-500 text-xs gap-2">
                <RotateCw class="w-5 h-5 animate-spin text-indigo-400" />
                <span>Membaca seluruh folder di D:\Works beserta turunannya...</span>
              </div>
            {:else if filteredProjects().length === 0}
              <div class="py-12 text-center text-zinc-500 text-xs">
                Tidak ada project yang cocok dengan pencarian "{searchQuery}".
              </div>
            {:else}
              {#each filteredProjects() as p}
                {@const isCurrent = activeProjectPath && p.path.toLowerCase() === activeProjectPath.replace(/\\/g, '/').toLowerCase()}
                <button
                  type="button"
                  onclick={() => handleSelect(p.path)}
                  class="w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer {isCurrent ? 'bg-indigo-600/15 border-indigo-500/40 text-white' : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-800/60 hover:border-zinc-700 text-zinc-300'}"
                >
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-7 h-7 rounded-lg {isCurrent ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'} flex items-center justify-center shrink-0">
                      <FolderGit class="w-3.5 h-3.5" />
                    </div>
                    <div class="flex flex-col min-w-0">
                      <div class="flex items-center gap-1.5">
                        <span class="text-xs font-semibold truncate text-zinc-100">{p.name}</span>
                        {#if isCurrent}
                          <span class="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200 font-mono font-bold">ACTIVE</span>
                        {/if}
                      </div>
                      <span class="text-[10px] text-zinc-500 font-mono truncate">{p.relativePath}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0 text-[10px] font-mono">
                    {#if p.isGit}
                      <span class="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 flex items-center gap-1">
                        <GitBranch class="w-2.5 h-2.5 text-zinc-400" /> git
                      </span>
                    {/if}
                    {#if p.hasPackageJson}
                      <span class="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 flex items-center gap-1">
                        <Package class="w-2.5 h-2.5 text-amber-400" /> node
                      </span>
                    {/if}
                  </div>
                </button>
              {/each}
            {/if}
          </div>
        </div>
      {/if}

      <!-- Tab 2: Create New Project (Default: D:\Works) -->
      {#if activeTab === 'create'}
        <div class="p-5 flex flex-col gap-4 text-xs">
          <div class="flex flex-col gap-1.5">
            <label for="new-proj-name" class="font-bold text-zinc-200">Nama Project Baru:</label>
            <input
              id="new-proj-name"
              type="text"
              bind:value={newProjectName}
              placeholder="Contoh: my-awesome-app"
              class="bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl p-2.5 text-zinc-100 font-mono outline-none"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="new-proj-parent" class="font-bold text-zinc-200">Direktori Induk (Parent Folder):</label>
            <input
              id="new-proj-parent"
              type="text"
              bind:value={newProjectParent}
              class="bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl p-2.5 text-zinc-100 font-mono outline-none"
            />
            <span class="text-[11px] text-zinc-500">
              Project akan dibuat di: <code class="text-indigo-400 font-mono">{newProjectParent}\{newProjectName || '&lt;nama-project&gt;'}</code>
            </span>
          </div>

          <div class="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="init-git-cb"
              bind:checked={initGit}
              class="w-4 h-4 rounded cursor-pointer accent-indigo-600"
            />
            <label for="init-git-cb" class="text-zinc-300 font-medium cursor-pointer">
              Inisialisasi Git Repository (`git init`) otomatis
            </label>
          </div>

          <button
            onclick={handleCreateProject}
            disabled={isCreating || !newProjectName.trim()}
            class="mt-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition cursor-pointer"
          >
            <Sparkles class="w-4 h-4" />
            {isCreating ? 'Membuat Project...' : 'Buat & Buka Project di zhiEnd Agent'}
          </button>
        </div>
      {/if}

      <!-- Tab 3: Manual Path Input (Outside D:) -->
      {#if activeTab === 'manual'}
        <div class="p-5 flex flex-col gap-4 text-xs">
          <div class="flex flex-col gap-1.5">
            <label for="manual-path-input" class="font-bold text-zinc-200">Masukkan Path Direktori Lengkap:</label>
            <div class="flex gap-2">
              <input
                id="manual-path-input"
                type="text"
                bind:value={manualPathInput}
                placeholder="Contoh: C:\Users\zhien\my-project atau E:\Repos\backend"
                class="flex-1 bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-xl p-2.5 text-zinc-100 font-mono outline-none"
              />
              <button
                onclick={() => handleSelect(manualPathInput)}
                disabled={isSelecting || !manualPathInput.trim()}
                class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
              >
                Buka <ArrowRight class="w-3.5 h-3.5" />
              </button>
            </div>
            <span class="text-[11px] text-zinc-500">Gunakan opsi ini jika project Anda berada di drive C:, E:, atau lokasi jaringan lainnya.</span>
          </div>

          {#if recentProjects && recentProjects.length > 0}
            <div class="flex flex-col gap-1.5 pt-3 border-t border-zinc-800">
              <span class="text-[11px] text-zinc-400 font-semibold">Riwayat Terakhir:</span>
              <div class="flex flex-col gap-1 max-h-36 overflow-y-auto">
                {#each recentProjects as r}
                  <button
                    onclick={() => handleSelect(r)}
                    class="p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-left font-mono text-[11px] text-zinc-300 truncate cursor-pointer"
                  >
                    {r}
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
