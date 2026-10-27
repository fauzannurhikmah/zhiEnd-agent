<script lang="ts">
  import type { AppConfig } from '../types';
  import { X, Save, Sliders, Shield, FolderGit, Cpu, Send, MessageSquare, Globe, Plus, Trash2, Mic } from 'lucide-svelte';

  let {
    config,
    isOpen,
    personas = [],
    onClose,
    onSave
  }: {
    config: AppConfig | null;
    isOpen: boolean;
    personas?: any[];
    onClose: () => void;
    onSave: (updates: Partial<AppConfig>) => Promise<boolean>;
  } = $props();

  let activeTab = $state<'general' | 'antigravity' | 'telegram' | 'whatsapp' | 'tunnel' | 'voice'>('general');

  // Form states initialized from config
  let formPort = $state(3888);
  let formPin = $state('');
  let formActiveProj = $state('');
  let formRecentProjects = $state<string[]>([]);
  let newRecentProjInput = $state('');

  let formCliPath = $state('');
  let formDefaultModel = $state('');

  let formTgEnabled = $state(false);
  let formTgToken = $state('');
  let formTgUsers = $state('');
  let formTgPersonaId = $state('persona-default');

  let formWaEnabled = $state(false);
  let formWaNumbers = $state('');
  let formWaPersonaId = $state('persona-default');

  let formTunnelSubdomain = $state('');

  let formVoiceProvider = $state<'groq' | 'openai' | 'gemini'>('groq');
  let formVoiceGroqKey = $state('');
  let formVoiceOpenaiKey = $state('');
  let formVoiceGeminiKey = $state('');
  let formVoiceLang = $state('id');

  let isSaving = $state(false);

  function getSafeEmoji(avatar?: string | null): string {
    if (!avatar) return '⚡';
    if (avatar.startsWith('data:') || avatar.startsWith('http') || avatar.length > 8) {
      return '🎭';
    }
    return avatar;
  }

  $effect(() => {
    if (config && isOpen) {
      formPort = config.port || 3888;
      formPin = config.securityPin || '';
      formActiveProj = config.activeProject || '';
      formRecentProjects = [...(config.recentProjects || [])];

      formCliPath = config.antigravity?.cliPath || '';
      formDefaultModel = config.antigravity?.defaultModel || 'gemini-3.8-flash-high';

      formTgEnabled = !!config.telegram?.enabled;
      formTgToken = config.telegram?.botToken || '';
      formTgUsers = (config.telegram?.allowedUsers || []).join(', ');
      formTgPersonaId = config.telegram?.personaId || 'persona-default';

      formWaEnabled = !!config.whatsapp?.enabled;
      formWaNumbers = (config.whatsapp?.allowedNumbers || []).join(', ');
      formWaPersonaId = config.whatsapp?.personaId || 'persona-default';

      formTunnelSubdomain = config.tunnel?.subdomain || '';

      formVoiceProvider = config.voice?.provider || 'groq';
      formVoiceGroqKey = config.voice?.groqApiKey || '';
      formVoiceOpenaiKey = config.voice?.openaiApiKey || '';
      formVoiceGeminiKey = config.voice?.geminiApiKey || '';
      formVoiceLang = config.voice?.language || 'id';
    }
  });

  function addRecentProject() {
    if (!newRecentProjInput.trim()) return;
    if (!formRecentProjects.includes(newRecentProjInput.trim())) {
      formRecentProjects = [...formRecentProjects, newRecentProjInput.trim()];
    }
    newRecentProjInput = '';
  }

  function removeRecentProject(idx: number) {
    formRecentProjects = formRecentProjects.filter((_, i) => i !== idx);
  }

  async function handleSave() {
    isSaving = true;
    try {
      const updates: Partial<AppConfig> = {
        port: Number(formPort),
        securityPin: formPin.trim(),
        activeProject: formActiveProj.trim(),
        recentProjects: formRecentProjects,
        antigravity: {
          cliPath: formCliPath.trim(),
          defaultModel: formDefaultModel,
          availableModels: config?.antigravity?.availableModels || []
        },
        telegram: {
          enabled: formTgEnabled,
          botToken: formTgToken.trim(),
          allowedUsers: formTgUsers.split(',').map(s => s.trim()).filter(Boolean),
          personaId: formTgPersonaId
        },
        whatsapp: {
          enabled: formWaEnabled,
          allowedNumbers: formWaNumbers.split(',').map(s => s.trim()).filter(Boolean),
          personaId: formWaPersonaId
        },
        tunnel: {
          enabled: config?.tunnel?.enabled || false,
          provider: config?.tunnel?.provider || 'localtunnel',
          subdomain: formTunnelSubdomain.trim(),
          publicUrl: config?.tunnel?.publicUrl || ''
        },
        voice: {
          provider: formVoiceProvider,
          groqApiKey: formVoiceGroqKey.trim(),
          openaiApiKey: formVoiceOpenaiKey.trim(),
          geminiApiKey: formVoiceGeminiKey.trim(),
          language: formVoiceLang
        }
      };

      const ok = await onSave(updates);
      if (ok) {
        onClose();
      }
    } finally {
      isSaving = false;
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
    <div class="glass-panel w-full max-w-2xl rounded-2xl flex flex-col max-h-[85vh] border border-slate-700/80 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Modal Header -->
      <div class="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
            <Sliders class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Pengaturan Sistem zhiEnd Agent</h3>
            <p class="text-[11px] text-slate-400">Konfigurasi seluruh modul, API, model, remote bot & keamanan</p>
          </div>
        </div>
        <button onclick={onClose} class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Settings Navigation Tabs -->
      <div class="flex border-b border-slate-800/80 px-5 gap-4 text-xs font-semibold overflow-x-auto bg-slate-900/40">
        <button
          onclick={() => activeTab = 'general'}
          class="py-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer {activeTab === 'general' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}"
        >
          <Shield class="w-3.5 h-3.5" /> Umum & PIN
        </button>
        <button
          onclick={() => activeTab = 'antigravity'}
          class="py-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer {activeTab === 'antigravity' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}"
        >
          <Cpu class="w-3.5 h-3.5" /> Antigravity AI
        </button>
        <button
          onclick={() => activeTab = 'telegram'}
          class="py-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer {activeTab === 'telegram' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}"
        >
          <Send class="w-3.5 h-3.5" /> Telegram Bot
        </button>
        <button
          onclick={() => activeTab = 'whatsapp'}
          class="py-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer {activeTab === 'whatsapp' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}"
        >
          <MessageSquare class="w-3.5 h-3.5" /> WhatsApp Bot
        </button>
        <button
          onclick={() => activeTab = 'tunnel'}
          class="py-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer {activeTab === 'tunnel' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}"
        >
          <Globe class="w-3.5 h-3.5" /> Remote Tunnel
        </button>
        <button
          onclick={() => activeTab = 'voice'}
          class="py-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer {activeTab === 'voice' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}"
        >
          <Mic class="w-3.5 h-3.5" /> Voice / Suara
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="flex-1 overflow-y-auto p-5 text-xs">
        <!-- GENERAL & PIN -->
        {#if activeTab === 'general'}
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label for="form-pin" class="font-bold text-slate-300">Security PIN (Kunci Akses Web):</label>
              <input
                id="form-pin"
                type="password"
                bind:value={formPin}
                placeholder="Kosongkan jika tidak ingin memakai PIN"
                class="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono outline-none focus:border-indigo-500"
              />
              <span class="text-[11px] text-slate-500">Jika diisi, siapapun yang membuka dashboard dari link publik harus memasukkan PIN ini.</span>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-port" class="font-bold text-slate-300">Server Port:</label>
              <input
                id="form-port"
                type="number"
                bind:value={formPort}
                class="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono outline-none focus:border-indigo-500"
              />
            </div>

            <div class="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
              <label for="form-active-proj" class="font-bold text-slate-300">Active Workspace Directory:</label>
              <input
                id="form-active-proj"
                type="text"
                bind:value={formActiveProj}
                class="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono outline-none focus:border-indigo-500"
              />
            </div>

            <!-- Recent projects manager -->
            <div class="flex flex-col gap-1.5">
              <span class="font-bold text-slate-300">Daftar Project Favorit:</span>
              <div class="flex gap-2">
                <input
                  type="text"
                  bind:value={newRecentProjInput}
                  placeholder="D:\Works\my-other-project"
                  class="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono outline-none focus:border-indigo-500"
                />
                <button
                  onclick={addRecentProject}
                  class="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                >
                  <Plus class="w-4 h-4" />
                </button>
              </div>

              <div class="flex flex-col gap-1 mt-1 max-h-32 overflow-y-auto">
                {#each formRecentProjects as proj, idx}
                  <div class="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800 font-mono text-[11px]">
                    <span class="truncate">{proj}</span>
                    <button onclick={() => removeRecentProject(idx)} class="text-rose-400 hover:text-rose-300 p-1 cursor-pointer">
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {/if}

        <!-- ANTIGRAVITY AI -->
        {#if activeTab === 'antigravity'}
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label for="form-cli-path" class="font-bold text-slate-300">Path Binary Antigravity CLI (agy.exe):</label>
              <input
                id="form-cli-path"
                type="text"
                bind:value={formCliPath}
                placeholder="C:\Users\zhien\AppData\Local\agy\bin\agy.exe"
                class="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono outline-none focus:border-indigo-500"
              />
              <span class="text-[11px] text-slate-500">Executable agy yang digunakan server untuk menjalankan instruksi coding dan tools.</span>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-default-model" class="font-bold text-slate-300">Default Model:</label>
              <select
                id="form-default-model"
                bind:value={formDefaultModel}
                class="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 outline-none focus:border-indigo-500"
              >
                {#if config?.antigravity?.availableModels}
                  {#each config.antigravity.availableModels as m}
                    <option value={m.id}>{m.name}</option>
                  {/each}
                {:else}
                  <option value="gemini-3.8-flash-high">Gemini 3.8 Flash (High)</option>
                  <option value="gemini-3.8-flash-medium">Gemini 3.8 Flash (Medium)</option>
                  <option value="gemini-3.8-flash-low">Gemini 3.8 Flash (Fast)</option>
                  <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                  <option value="claude-opus-4-6-thinking">Claude Opus 4.6</option>
                {/if}
              </select>
            </div>
          </div>
        {/if}

        <!-- TELEGRAM BOT -->
        {#if activeTab === 'telegram'}
          <div class="flex flex-col gap-4">
            <div class="flex items-center gap-2">
              <input type="checkbox" id="form-tg-enabled" bind:checked={formTgEnabled} class="w-4 h-4 rounded cursor-pointer" />
              <label for="form-tg-enabled" class="font-bold text-slate-200 cursor-pointer">Aktifkan Telegram Bot Otomatis Saat Server Start</label>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-tg-persona" class="font-bold text-slate-300">Persona AI Default Telegram:</label>
              <select
                id="form-tg-persona"
                bind:value={formTgPersonaId}
                class="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono outline-none focus:border-indigo-500 cursor-pointer"
              >
                {#each personas as p}
                  <option value={p.id}>{getSafeEmoji(p.avatar)} {p.name} ({p.preferred_model || 'Flash'})</option>
                {/each}
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-tg-token" class="font-bold text-slate-300">Telegram Bot Token:</label>
              <input
                id="form-tg-token"
                type="password"
                bind:value={formTgToken}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                class="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono outline-none focus:border-indigo-500"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-tg-users" class="font-bold text-slate-300">Allowed Telegram User IDs / Usernames (Pisahkan koma):</label>
              <input
                id="form-tg-users"
                type="text"
                bind:value={formTgUsers}
                placeholder="Contoh: 12345678, @username"
                class="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono outline-none focus:border-indigo-500"
              />
              <span class="text-[11px] text-slate-500">Jika kosong, semua pesan yang masuk ke bot akan diizinkan.</span>
            </div>
          </div>
        {/if}

        <!-- WHATSAPP BOT -->
        {#if activeTab === 'whatsapp'}
          <div class="flex flex-col gap-4">
            <div class="flex items-center gap-2">
              <input type="checkbox" id="form-wa-enabled" bind:checked={formWaEnabled} class="w-4 h-4 rounded cursor-pointer" />
              <label for="form-wa-enabled" class="font-bold text-slate-200 cursor-pointer">Aktifkan WhatsApp Bot Otomatis Saat Server Start</label>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-wa-persona" class="font-bold text-slate-300">Persona AI Default WhatsApp:</label>
              <select
                id="form-wa-persona"
                bind:value={formWaPersonaId}
                class="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono outline-none focus:border-indigo-500 cursor-pointer"
              >
                {#each personas as p}
                  <option value={p.id}>{getSafeEmoji(p.avatar)} {p.name} ({p.preferred_model || 'Flash'})</option>
                {/each}
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-wa-numbers" class="font-bold text-slate-300">Allowed Phone Numbers (Pisahkan koma):</label>
              <input
                id="form-wa-numbers"
                type="text"
                bind:value={formWaNumbers}
                placeholder="Contoh: 6281234567890, 6289876543210"
                class="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono outline-none focus:border-indigo-500"
              />
              <span class="text-[11px] text-slate-500">Hanya nomor yang terdaftar di atas yang dapat menjalankan perintah remote coding.</span>
            </div>
          </div>
        {/if}

        <!-- TUNNEL -->
        {#if activeTab === 'tunnel'}
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label for="form-tunnel-subdomain" class="font-bold text-slate-300">Default Subdomain Public Tunnel:</label>
              <input
                id="form-tunnel-subdomain"
                type="text"
                bind:value={formTunnelSubdomain}
                placeholder="Contoh: zhiend-agent"
                class="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono outline-none focus:border-indigo-500"
              />
              <span class="text-[11px] text-slate-500">Subdomain permanen yang akan digunakan saat memulai Public Tunnel.</span>
            </div>
          </div>
        {/if}

        <!-- VOICE / SPEECH-TO-TEXT -->
        {#if activeTab === 'voice'}
          <div class="flex flex-col gap-4">
            <div class="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-slate-300 flex flex-col gap-1.5">
              <span class="font-bold text-indigo-300 flex items-center gap-1.5">
                <Mic class="w-4 h-4" /> Pengaturan Transkripsi Suara (Voice Command)
              </span>
              <p class="text-[11px] text-slate-400 leading-relaxed">
                Digunakan untuk mengubah pesan suara (Voice Note di WhatsApp & Telegram) serta fallback suara Web Chat menjadi teks instruksi coding secara otomatis.
              </p>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-voice-provider" class="font-bold text-slate-300">Penyedia Layanan (Transcription Engine):</label>
              <select
                id="form-voice-provider"
                bind:value={formVoiceProvider}
                class="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="groq">Groq Whisper (Sangat Cepat ~0.8s & Gratis - Rekomendasi)</option>
                <option value="openai">OpenAI Whisper (whisper-1)</option>
                <option value="gemini">Google Gemini API (Multimodal Audio)</option>
              </select>
            </div>

            {#if formVoiceProvider === 'groq'}
              <div class="flex flex-col gap-1.5">
                <label for="form-voice-groq" class="font-bold text-slate-300">Groq API Key:</label>
                <input
                  id="form-voice-groq"
                  type="password"
                  bind:value={formVoiceGroqKey}
                  placeholder="gsk_..."
                  class="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono outline-none focus:border-indigo-500"
                />
                <span class="text-[11px] text-slate-500">
                  Dapatkan API Key gratis di <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:underline">console.groq.com/keys</a>.
                </span>
              </div>
            {:else if formVoiceProvider === 'openai'}
              <div class="flex flex-col gap-1.5">
                <label for="form-voice-openai" class="font-bold text-slate-300">OpenAI API Key:</label>
                <input
                  id="form-voice-openai"
                  type="password"
                  bind:value={formVoiceOpenaiKey}
                  placeholder="sk-..."
                  class="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono outline-none focus:border-indigo-500"
                />
              </div>
            {:else if formVoiceProvider === 'gemini'}
              <div class="flex flex-col gap-1.5">
                <label for="form-voice-gemini" class="font-bold text-slate-300">Google Gemini API Key:</label>
                <input
                  id="form-voice-gemini"
                  type="password"
                  bind:value={formVoiceGeminiKey}
                  placeholder="AIzaSy..."
                  class="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono outline-none focus:border-indigo-500"
                />
              </div>
            {/if}

            <div class="flex flex-col gap-1.5">
              <label for="form-voice-lang" class="font-bold text-slate-300">Bahasa Utama Perintah Suara:</label>
              <select
                id="form-voice-lang"
                bind:value={formVoiceLang}
                class="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="id">Bahasa Indonesia (id)</option>
                <option value="en">English (en)</option>
                <option value="auto">Deteksi Otomatis (Auto)</option>
              </select>
            </div>
          </div>
        {/if}
      </div>

      <!-- Modal Footer -->
      <div class="px-5 py-3.5 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900/60">
        <button
          onclick={onClose}
          class="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
        >
          Batal
        </button>
        <button
          onclick={handleSave}
          disabled={isSaving}
          class="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
        >
          <Save class="w-3.5 h-3.5" />
          {isSaving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
        </button>
      </div>

    </div>
  </div>
{/if}
