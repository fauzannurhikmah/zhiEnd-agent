<script lang="ts">
  import type { AppConfig } from '../types';
  import { api } from '../services/api';
  import {
    X,
    Save,
    Sliders,
    Shield,
    Cpu,
    Send,
    MessageSquare,
    Globe,
    Plus,
    Trash2,
    Mic,
    Key,
    Eye,
    EyeOff,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Sparkles,
    ExternalLink,
    RefreshCw
  } from 'lucide-svelte';

  let {
    config,
    isOpen,
    personas = [],
    initialTab = 'general',
    onClose,
    onSave
  }: {
    config: AppConfig | null;
    isOpen: boolean;
    personas?: any[];
    initialTab?: 'general' | 'antigravity' | 'ai_providers' | 'telegram' | 'whatsapp' | 'tunnel' | 'voice';
    onClose: () => void;
    onSave: (updates: Partial<AppConfig>) => Promise<boolean>;
  } = $props();

  let activeTab = $state<'general' | 'antigravity' | 'ai_providers' | 'telegram' | 'whatsapp' | 'tunnel' | 'voice'>('general');

  // Form states initialized from config
  let formPort = $state(3888);
  let formPin = $state('');
  let formActiveProj = $state('');
  let formRecentProjects = $state<string[]>([]);
  let newRecentProjInput = $state('');

  let formCliPath = $state('');
  let formDefaultModel = $state('');

  // AI Providers Keys & URLs
  let formOpenaiKey = $state('');
  let formOpenaiBaseUrl = $state('https://api.openai.com/v1');
  let showOpenaiKey = $state(false);

  let formGrokKey = $state('');
  let formGrokBaseUrl = $state('https://api.x.ai/v1');
  let showGrokKey = $state(false);

  let formQwenKey = $state('');
  let formQwenBaseUrl = $state('https://dashscope-intl.aliyuncs.com/compatible-mode/v1');
  let showQwenKey = $state(false);

  let formDeepseekKey = $state('');
  let formDeepseekBaseUrl = $state('https://api.deepseek.com');
  let showDeepseekKey = $state(false);

  let formGeminiKey = $state('');
  let formGeminiBaseUrl = $state('https://generativelanguage.googleapis.com/v1beta/openai');
  let showGeminiKey = $state(false);

  // Provider Connection Test States
  let testStates = $state<Record<string, { loading: boolean; success?: boolean; message?: string }>>({});

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
    if (isOpen) {
      if (initialTab) {
        activeTab = initialTab;
      }
    }
  });

  $effect(() => {
    if (config && isOpen) {
      formPort = config.port || 3888;
      formPin = config.securityPin || '';
      formActiveProj = config.activeProject || '';
      formRecentProjects = [...(config.recentProjects || [])];

      formCliPath = config.antigravity?.cliPath || '';
      formDefaultModel = config.antigravity?.defaultModel || 'gemini-3.8-flash-high';

      // AI Providers
      const ai = config.aiProviders;
      formOpenaiKey = ai?.openai?.apiKey || '';
      formOpenaiBaseUrl = ai?.openai?.baseUrl || 'https://api.openai.com/v1';

      formGrokKey = ai?.grok?.apiKey || '';
      formGrokBaseUrl = ai?.grok?.baseUrl || 'https://api.x.ai/v1';

      formQwenKey = ai?.qwen?.apiKey || '';
      formQwenBaseUrl = ai?.qwen?.baseUrl || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';

      formDeepseekKey = ai?.deepseek?.apiKey || '';
      formDeepseekBaseUrl = ai?.deepseek?.baseUrl || 'https://api.deepseek.com';

      formGeminiKey = ai?.gemini?.apiKey || '';
      formGeminiBaseUrl = ai?.gemini?.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai';

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

  async function handleTestConnection(provider: string, apiKey: string, baseUrl?: string) {
    testStates[provider] = { loading: true };
    try {
      const res = await api.testAIProvider({ provider, apiKey, baseUrl });
      testStates[provider] = {
        loading: false,
        success: res.success,
        message: res.message
      };
    } catch (err: any) {
      testStates[provider] = {
        loading: false,
        success: false,
        message: err.message || 'Gagal menghubungi server API'
      };
    }
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
        aiProviders: {
          openai: {
            apiKey: formOpenaiKey.trim(),
            baseUrl: formOpenaiBaseUrl.trim()
          },
          grok: {
            apiKey: formGrokKey.trim(),
            baseUrl: formGrokBaseUrl.trim()
          },
          qwen: {
            apiKey: formQwenKey.trim(),
            baseUrl: formQwenBaseUrl.trim()
          },
          deepseek: {
            apiKey: formDeepseekKey.trim(),
            baseUrl: formDeepseekBaseUrl.trim()
          },
          gemini: {
            apiKey: formGeminiKey.trim(),
            baseUrl: formGeminiBaseUrl.trim()
          }
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
  <div class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4">
    <div class="w-full max-w-3xl rounded-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] bg-zinc-950/95 border border-white/[0.08] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Modal Header -->
      <div class="px-4 sm:px-6 py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-zinc-900/60">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-sm">
            <Sliders class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm sm:text-base font-bold text-white tracking-tight">Pengaturan Sistem zhiEnd Agent</h3>
            <p class="text-[11px] text-zinc-400">Konfigurasi seluruh modul, API Keys, model AI, remote bot & keamanan</p>
          </div>
        </div>
        <button onclick={onClose} class="text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-zinc-800 transition cursor-pointer">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Settings Navigation Tabs -->
      <div class="flex border-b border-white/[0.08] px-3 sm:px-5 gap-1 sm:gap-2 text-xs font-semibold overflow-x-auto bg-zinc-900/40 shrink-0 scrollbar-none">
        <button
          onclick={() => activeTab = 'general'}
          class="py-2.5 px-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition {activeTab === 'general' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}"
        >
          <Shield class="w-3.5 h-3.5" /> Umum & PIN
        </button>
        <button
          onclick={() => activeTab = 'ai_providers'}
          class="py-2.5 px-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition {activeTab === 'ai_providers' ? 'border-indigo-500 text-indigo-400 font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-200'}"
        >
          <Key class="w-3.5 h-3.5 text-amber-400" /> AI API Keys & Model
        </button>
        <button
          onclick={() => activeTab = 'antigravity'}
          class="py-2.5 px-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition {activeTab === 'antigravity' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}"
        >
          <Cpu class="w-3.5 h-3.5" /> Antigravity Core
        </button>
        <button
          onclick={() => activeTab = 'telegram'}
          class="py-2.5 px-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition {activeTab === 'telegram' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}"
        >
          <Send class="w-3.5 h-3.5" /> Telegram Bot
        </button>
        <button
          onclick={() => activeTab = 'whatsapp'}
          class="py-2.5 px-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition {activeTab === 'whatsapp' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}"
        >
          <MessageSquare class="w-3.5 h-3.5" /> WhatsApp Bot
        </button>
        <button
          onclick={() => activeTab = 'tunnel'}
          class="py-2.5 px-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition {activeTab === 'tunnel' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}"
        >
          <Globe class="w-3.5 h-3.5" /> Remote Tunnel
        </button>
        <button
          onclick={() => activeTab = 'voice'}
          class="py-2.5 px-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition {activeTab === 'voice' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-zinc-400 hover:text-zinc-200'}"
        >
          <Mic class="w-3.5 h-3.5" /> Voice / Audio
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 text-xs">
        
        <!-- ========================================== -->
        <!-- AI PROVIDERS & API KEYS (NEW)               -->
        <!-- ========================================== -->
        {#if activeTab === 'ai_providers'}
          <div class="flex flex-col gap-5">
            <!-- Hero Banner -->
            <div class="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-violet-500/10 border border-amber-500/20 flex flex-col gap-2">
              <div class="flex items-center gap-2 text-amber-300 font-bold text-xs sm:text-sm">
                <Key class="w-4 h-4 text-amber-400" />
                <span>Konfigurasi AI Provider & API Key Eksternal</span>
              </div>
              <p class="text-[11px] text-zinc-400 leading-relaxed">
                Tautkan Persona Anda ke model AI pihak ketiga selain default Antigravity CLI (Gemini). Masukkan API Key untuk provider yang ingin Anda gunakan. Persona dapat langsung memilih model ini di jendela Persona.
              </p>
            </div>

            <!-- Provider 1: OpenAI -->
            <div class="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.08] hover:border-emerald-500/30 transition flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    ⚡
                  </div>
                  <span class="font-bold text-zinc-100 text-xs sm:text-sm">OpenAI</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    GPT-4o, GPT-4o Mini, o3-mini, o1
                  </span>
                </div>
                {#if formOpenaiKey}
                  <span class="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 class="w-3 h-3" /> Terkonfigurasi
                  </span>
                {:else}
                  <span class="text-[10px] text-zinc-500 font-mono">Belum Diisi</span>
                {/if}
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="openai-key" class="text-zinc-300 font-semibold flex items-center justify-between">
                  <span>OpenAI API Key:</span>
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" class="text-[10px] text-indigo-400 hover:underline flex items-center gap-1">
                    Dapatkan Key <ExternalLink class="w-2.5 h-2.5" />
                  </a>
                </label>
                <div class="relative flex items-center">
                  <input
                    id="openai-key"
                    type={showOpenaiKey ? 'text' : 'password'}
                    bind:value={formOpenaiKey}
                    placeholder="sk-proj-..."
                    class="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 pr-10 text-zinc-100 font-mono outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onclick={() => showOpenaiKey = !showOpenaiKey}
                    class="absolute right-2.5 text-zinc-400 hover:text-zinc-200 cursor-pointer p-1"
                    title={showOpenaiKey ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {#if showOpenaiKey}
                      <EyeOff class="w-3.5 h-3.5" />
                    {:else}
                      <Eye class="w-3.5 h-3.5" />
                    {/if}
                  </button>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <div class="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                  <span>Base URL:</span>
                  <input
                    type="text"
                    bind:value={formOpenaiBaseUrl}
                    class="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-300 text-[11px] font-mono outline-none focus:border-indigo-500 w-52"
                  />
                </div>
                <button
                  type="button"
                  disabled={!formOpenaiKey || testStates['openai']?.loading}
                  onclick={() => handleTestConnection('openai', formOpenaiKey, formOpenaiBaseUrl)}
                  class="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                >
                  {#if testStates['openai']?.loading}
                    <Loader2 class="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    <span>Menguji...</span>
                  {:else}
                    <RefreshCw class="w-3.5 h-3.5 text-emerald-400" />
                    <span>Uji Koneksi API</span>
                  {/if}
                </button>
              </div>

              {#if testStates['openai']?.message}
                <div class="p-2.5 rounded-xl text-xs flex items-center gap-2 {testStates['openai']?.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'}">
                  {#if testStates['openai']?.success}
                    <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" />
                  {:else}
                    <AlertCircle class="w-4 h-4 text-rose-400 shrink-0" />
                  {/if}
                  <span class="truncate">{testStates['openai']?.message}</span>
                </div>
              {/if}
            </div>

            <!-- Provider 2: xAI / Grok -->
            <div class="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.08] hover:border-violet-500/30 transition flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-xs">
                    X
                  </div>
                  <span class="font-bold text-zinc-100 text-xs sm:text-sm">Grok (xAI)</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    Grok 2, Grok 2 Mini, Grok Beta
                  </span>
                </div>
                {#if formGrokKey}
                  <span class="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 class="w-3 h-3" /> Terkonfigurasi
                  </span>
                {:else}
                  <span class="text-[10px] text-zinc-500 font-mono">Belum Diisi</span>
                {/if}
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="grok-key" class="text-zinc-300 font-semibold flex items-center justify-between">
                  <span>xAI Grok API Key:</span>
                  <a href="https://console.x.ai" target="_blank" rel="noopener noreferrer" class="text-[10px] text-indigo-400 hover:underline flex items-center gap-1">
                    Dapatkan Key di console.x.ai <ExternalLink class="w-2.5 h-2.5" />
                  </a>
                </label>
                <div class="relative flex items-center">
                  <input
                    id="grok-key"
                    type={showGrokKey ? 'text' : 'password'}
                    bind:value={formGrokKey}
                    placeholder="xai-..."
                    class="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 pr-10 text-zinc-100 font-mono outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onclick={() => showGrokKey = !showGrokKey}
                    class="absolute right-2.5 text-zinc-400 hover:text-zinc-200 cursor-pointer p-1"
                    title={showGrokKey ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {#if showGrokKey}
                      <EyeOff class="w-3.5 h-3.5" />
                    {:else}
                      <Eye class="w-3.5 h-3.5" />
                    {/if}
                  </button>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <div class="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                  <span>Base URL:</span>
                  <input
                    type="text"
                    bind:value={formGrokBaseUrl}
                    class="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-300 text-[11px] font-mono outline-none focus:border-indigo-500 w-52"
                  />
                </div>
                <button
                  type="button"
                  disabled={!formGrokKey || testStates['grok']?.loading}
                  onclick={() => handleTestConnection('grok', formGrokKey, formGrokBaseUrl)}
                  class="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                >
                  {#if testStates['grok']?.loading}
                    <Loader2 class="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    <span>Menguji...</span>
                  {:else}
                    <RefreshCw class="w-3.5 h-3.5 text-violet-400" />
                    <span>Uji Koneksi API</span>
                  {/if}
                </button>
              </div>

              {#if testStates['grok']?.message}
                <div class="p-2.5 rounded-xl text-xs flex items-center gap-2 {testStates['grok']?.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'}">
                  {#if testStates['grok']?.success}
                    <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" />
                  {:else}
                    <AlertCircle class="w-4 h-4 text-rose-400 shrink-0" />
                  {/if}
                  <span class="truncate">{testStates['grok']?.message}</span>
                </div>
              {/if}
            </div>

            <!-- Provider 3: Qwen (Alibaba DashScope) -->
            <div class="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.08] hover:border-amber-500/30 transition flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                    Q
                  </div>
                  <span class="font-bold text-zinc-100 text-xs sm:text-sm">Qwen (Alibaba DashScope)</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Qwen 2.5 Coder 32B, Qwen Max, Qwen Plus
                  </span>
                </div>
                {#if formQwenKey}
                  <span class="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 class="w-3 h-3" /> Terkonfigurasi
                  </span>
                {:else}
                  <span class="text-[10px] text-zinc-500 font-mono">Belum Diisi</span>
                {/if}
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="qwen-key" class="text-zinc-300 font-semibold flex items-center justify-between">
                  <span>DashScope API Key:</span>
                  <a href="https://dashscope.console.aliyun.com" target="_blank" rel="noopener noreferrer" class="text-[10px] text-indigo-400 hover:underline flex items-center gap-1">
                    Dapatkan Key di DashScope Console <ExternalLink class="w-2.5 h-2.5" />
                  </a>
                </label>
                <div class="relative flex items-center">
                  <input
                    id="qwen-key"
                    type={showQwenKey ? 'text' : 'password'}
                    bind:value={formQwenKey}
                    placeholder="sk-..."
                    class="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 pr-10 text-zinc-100 font-mono outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onclick={() => showQwenKey = !showQwenKey}
                    class="absolute right-2.5 text-zinc-400 hover:text-zinc-200 cursor-pointer p-1"
                    title={showQwenKey ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {#if showQwenKey}
                      <EyeOff class="w-3.5 h-3.5" />
                    {:else}
                      <Eye class="w-3.5 h-3.5" />
                    {/if}
                  </button>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <div class="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                  <span>Base URL:</span>
                  <input
                    type="text"
                    bind:value={formQwenBaseUrl}
                    class="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-300 text-[11px] font-mono outline-none focus:border-indigo-500 w-52 truncate"
                  />
                </div>
                <button
                  type="button"
                  disabled={!formQwenKey || testStates['qwen']?.loading}
                  onclick={() => handleTestConnection('qwen', formQwenKey, formQwenBaseUrl)}
                  class="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                >
                  {#if testStates['qwen']?.loading}
                    <Loader2 class="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    <span>Menguji...</span>
                  {:else}
                    <RefreshCw class="w-3.5 h-3.5 text-amber-400" />
                    <span>Uji Koneksi API</span>
                  {/if}
                </button>
              </div>

              {#if testStates['qwen']?.message}
                <div class="p-2.5 rounded-xl text-xs flex items-center gap-2 {testStates['qwen']?.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'}">
                  {#if testStates['qwen']?.success}
                    <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" />
                  {:else}
                    <AlertCircle class="w-4 h-4 text-rose-400 shrink-0" />
                  {/if}
                  <span class="truncate">{testStates['qwen']?.message}</span>
                </div>
              {/if}
            </div>

            <!-- Provider 4: DeepSeek -->
            <div class="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.08] hover:border-sky-500/30 transition flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                    🐋
                  </div>
                  <span class="font-bold text-zinc-100 text-xs sm:text-sm">DeepSeek</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    DeepSeek V3, DeepSeek R1 (Thinking)
                  </span>
                </div>
                {#if formDeepseekKey}
                  <span class="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 class="w-3 h-3" /> Terkonfigurasi
                  </span>
                {:else}
                  <span class="text-[10px] text-zinc-500 font-mono">Belum Diisi</span>
                {/if}
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="deepseek-key" class="text-zinc-300 font-semibold flex items-center justify-between">
                  <span>DeepSeek API Key:</span>
                  <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" class="text-[10px] text-indigo-400 hover:underline flex items-center gap-1">
                    Dapatkan Key di platform.deepseek.com <ExternalLink class="w-2.5 h-2.5" />
                  </a>
                </label>
                <div class="relative flex items-center">
                  <input
                    id="deepseek-key"
                    type={showDeepseekKey ? 'text' : 'password'}
                    bind:value={formDeepseekKey}
                    placeholder="sk-..."
                    class="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 pr-10 text-zinc-100 font-mono outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onclick={() => showDeepseekKey = !showDeepseekKey}
                    class="absolute right-2.5 text-zinc-400 hover:text-zinc-200 cursor-pointer p-1"
                    title={showDeepseekKey ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {#if showDeepseekKey}
                      <EyeOff class="w-3.5 h-3.5" />
                    {:else}
                      <Eye class="w-3.5 h-3.5" />
                    {/if}
                  </button>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <div class="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                  <span>Base URL:</span>
                  <input
                    type="text"
                    bind:value={formDeepseekBaseUrl}
                    class="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-300 text-[11px] font-mono outline-none focus:border-indigo-500 w-52"
                  />
                </div>
                <button
                  type="button"
                  disabled={!formDeepseekKey || testStates['deepseek']?.loading}
                  onclick={() => handleTestConnection('deepseek', formDeepseekKey, formDeepseekBaseUrl)}
                  class="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                >
                  {#if testStates['deepseek']?.loading}
                    <Loader2 class="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    <span>Menguji...</span>
                  {:else}
                    <RefreshCw class="w-3.5 h-3.5 text-sky-400" />
                    <span>Uji Koneksi API</span>
                  {/if}
                </button>
              </div>

              {#if testStates['deepseek']?.message}
                <div class="p-2.5 rounded-xl text-xs flex items-center gap-2 {testStates['deepseek']?.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'}">
                  {#if testStates['deepseek']?.success}
                    <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" />
                  {:else}
                    <AlertCircle class="w-4 h-4 text-rose-400 shrink-0" />
                  {/if}
                  <span class="truncate">{testStates['deepseek']?.message}</span>
                </div>
              {/if}
            </div>

            <!-- Provider 5: Google Gemini Direct API -->
            <div class="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.08] hover:border-blue-500/30 transition flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                    ✨
                  </div>
                  <span class="font-bold text-zinc-100 text-xs sm:text-sm">Google Gemini (Direct API)</span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Gemini 2.0 Flash, Gemini 1.5 Pro
                  </span>
                </div>
                {#if formGeminiKey}
                  <span class="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 class="w-3 h-3" /> Terkonfigurasi
                  </span>
                {:else}
                  <span class="text-[10px] text-zinc-500 font-mono">Belum Diisi</span>
                {/if}
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="gemini-key" class="text-zinc-300 font-semibold flex items-center justify-between">
                  <span>Gemini API Key:</span>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" class="text-[10px] text-indigo-400 hover:underline flex items-center gap-1">
                    Dapatkan Key di Google AI Studio <ExternalLink class="w-2.5 h-2.5" />
                  </a>
                </label>
                <div class="relative flex items-center">
                  <input
                    id="gemini-key"
                    type={showGeminiKey ? 'text' : 'password'}
                    bind:value={formGeminiKey}
                    placeholder="AIzaSy..."
                    class="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 pr-10 text-zinc-100 font-mono outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onclick={() => showGeminiKey = !showGeminiKey}
                    class="absolute right-2.5 text-zinc-400 hover:text-zinc-200 cursor-pointer p-1"
                    title={showGeminiKey ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {#if showGeminiKey}
                      <EyeOff class="w-3.5 h-3.5" />
                    {:else}
                      <Eye class="w-3.5 h-3.5" />
                    {/if}
                  </button>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <div class="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                  <span>Base URL:</span>
                  <input
                    type="text"
                    bind:value={formGeminiBaseUrl}
                    class="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-300 text-[11px] font-mono outline-none focus:border-indigo-500 w-52 truncate"
                  />
                </div>
                <button
                  type="button"
                  disabled={!formGeminiKey || testStates['gemini']?.loading}
                  onclick={() => handleTestConnection('gemini', formGeminiKey, formGeminiBaseUrl)}
                  class="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                >
                  {#if testStates['gemini']?.loading}
                    <Loader2 class="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    <span>Menguji...</span>
                  {:else}
                    <RefreshCw class="w-3.5 h-3.5 text-blue-400" />
                    <span>Uji Koneksi API</span>
                  {/if}
                </button>
              </div>

              {#if testStates['gemini']?.message}
                <div class="p-2.5 rounded-xl text-xs flex items-center gap-2 {testStates['gemini']?.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'}">
                  {#if testStates['gemini']?.success}
                    <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" />
                  {:else}
                    <AlertCircle class="w-4 h-4 text-rose-400 shrink-0" />
                  {/if}
                  <span class="truncate">{testStates['gemini']?.message}</span>
                </div>
              {/if}
            </div>

          </div>
        {/if}

        <!-- GENERAL & PIN -->
        {#if activeTab === 'general'}
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label for="form-pin" class="font-bold text-zinc-300">Security PIN (Kunci Akses Web):</label>
              <input
                id="form-pin"
                type="password"
                bind:value={formPin}
                placeholder="PIN 4-8 digit angka (opsional)"
                class="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono outline-none focus:border-indigo-500"
              />
              <span class="text-[11px] text-zinc-500">Kosongkan jika tidak ingin memproteksi akses Web UI dengan PIN sandi.</span>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-port" class="font-bold text-zinc-300">Port Server Backend:</label>
              <input
                id="form-port"
                type="number"
                bind:value={formPort}
                class="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono outline-none focus:border-indigo-500"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-active-project" class="font-bold text-zinc-300">Active Project Workspace:</label>
              <input
                id="form-active-project"
                type="text"
                bind:value={formActiveProj}
                class="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono outline-none focus:border-indigo-500"
              />
            </div>

            <!-- Recent projects manager -->
            <div class="flex flex-col gap-1.5">
              <span class="font-bold text-zinc-300">Daftar Project Favorit:</span>
              <div class="flex gap-2">
                <input
                  type="text"
                  bind:value={newRecentProjInput}
                  placeholder="D:\Works\my-other-project"
                  class="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-zinc-200 font-mono outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onclick={addRecentProject}
                  class="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer transition"
                >
                  <Plus class="w-4 h-4" />
                </button>
              </div>

              <div class="flex flex-col gap-1 mt-1 max-h-32 overflow-y-auto">
                {#each formRecentProjects as proj, idx}
                  <div class="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-zinc-800 font-mono text-[11px]">
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
              <label for="form-cli-path" class="font-bold text-zinc-300">Path Binary Antigravity CLI (agy.exe):</label>
              <input
                id="form-cli-path"
                type="text"
                bind:value={formCliPath}
                placeholder="C:\Users\zhien\AppData\Local\agy\bin\agy.exe"
                class="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono outline-none focus:border-indigo-500"
              />
              <span class="text-[11px] text-zinc-500">Executable agy yang digunakan server untuk menjalankan instruksi coding dan tools core.</span>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-default-model" class="font-bold text-zinc-300">Default Model Antigravity CLI:</label>
              <div class="relative">
                <select
                  id="form-default-model"
                  bind:value={formDefaultModel}
                  class="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 outline-none focus:border-indigo-500 cursor-pointer"
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
          </div>
        {/if}

        <!-- TELEGRAM BOT -->
        {#if activeTab === 'telegram'}
          <div class="flex flex-col gap-4">
            <div class="flex items-center gap-2">
              <input type="checkbox" id="form-tg-enabled" bind:checked={formTgEnabled} class="w-4 h-4 rounded cursor-pointer" />
              <label for="form-tg-enabled" class="font-bold text-zinc-200 cursor-pointer">Aktifkan Telegram Bot Otomatis Saat Server Start</label>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-tg-persona" class="font-bold text-zinc-300">Persona AI Default Telegram:</label>
              <select
                id="form-tg-persona"
                bind:value={formTgPersonaId}
                class="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono outline-none focus:border-indigo-500 cursor-pointer"
              >
                {#each personas as p}
                  <option value={p.id}>{getSafeEmoji(p.avatar)} {p.name} ({p.preferred_model || 'Flash'})</option>
                {/each}
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-tg-token" class="font-bold text-zinc-300">Telegram Bot Token:</label>
              <input
                id="form-tg-token"
                type="password"
                bind:value={formTgToken}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                class="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono outline-none focus:border-indigo-500"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-tg-users" class="font-bold text-zinc-300">Allowed Telegram User IDs / Usernames (Pisahkan koma):</label>
              <input
                id="form-tg-users"
                type="text"
                bind:value={formTgUsers}
                placeholder="Contoh: 12345678, @username"
                class="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono outline-none focus:border-indigo-500"
              />
              <span class="text-[11px] text-zinc-500">Jika kosong, semua pesan yang masuk ke bot akan diizinkan.</span>
            </div>
          </div>
        {/if}

        <!-- WHATSAPP BOT -->
        {#if activeTab === 'whatsapp'}
          <div class="flex flex-col gap-4">
            <div class="flex items-center gap-2">
              <input type="checkbox" id="form-wa-enabled" bind:checked={formWaEnabled} class="w-4 h-4 rounded cursor-pointer" />
              <label for="form-wa-enabled" class="font-bold text-zinc-200 cursor-pointer">Aktifkan WhatsApp Bot Otomatis Saat Server Start</label>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-wa-persona" class="font-bold text-zinc-300">Persona AI Default WhatsApp:</label>
              <select
                id="form-wa-persona"
                bind:value={formWaPersonaId}
                class="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono outline-none focus:border-indigo-500 cursor-pointer"
              >
                {#each personas as p}
                  <option value={p.id}>{getSafeEmoji(p.avatar)} {p.name} ({p.preferred_model || 'Flash'})</option>
                {/each}
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-wa-numbers" class="font-bold text-zinc-300">Allowed Phone Numbers (Pisahkan koma):</label>
              <input
                id="form-wa-numbers"
                type="text"
                bind:value={formWaNumbers}
                placeholder="Contoh: 6281234567890, 6289876543210"
                class="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono outline-none focus:border-indigo-500"
              />
              <span class="text-[11px] text-zinc-500">Hanya nomor yang terdaftar di atas yang dapat menjalankan perintah remote coding.</span>
            </div>
          </div>
        {/if}

        <!-- TUNNEL -->
        {#if activeTab === 'tunnel'}
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label for="form-tunnel-subdomain" class="font-bold text-zinc-300">Default Subdomain Public Tunnel:</label>
              <input
                id="form-tunnel-subdomain"
                type="text"
                bind:value={formTunnelSubdomain}
                placeholder="Contoh: zhiend-agent"
                class="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono outline-none focus:border-indigo-500"
              />
              <span class="text-[11px] text-zinc-500">Subdomain permanen yang akan digunakan saat memulai Public Tunnel.</span>
            </div>
          </div>
        {/if}

        <!-- VOICE / SPEECH-TO-TEXT -->
        {#if activeTab === 'voice'}
          <div class="flex flex-col gap-4">
            <div class="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-zinc-300 flex flex-col gap-1.5">
              <span class="font-bold text-indigo-300 flex items-center gap-1.5">
                <Mic class="w-4 h-4" /> Pengaturan Transkripsi Suara (Voice Command)
              </span>
              <p class="text-[11px] text-zinc-400 leading-relaxed">
                Digunakan untuk mengubah pesan suara (Voice Note di WhatsApp & Telegram) serta fallback suara Web Chat menjadi teks instruksi coding secara otomatis.
              </p>
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="form-voice-provider" class="font-bold text-zinc-300">Penyedia Layanan (Transcription Engine):</label>
              <select
                id="form-voice-provider"
                bind:value={formVoiceProvider}
                class="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="groq">Groq Whisper (Sangat Cepat ~0.8s & Gratis - Rekomendasi)</option>
                <option value="openai">OpenAI Whisper (whisper-1)</option>
                <option value="gemini">Google Gemini API (Multimodal Audio)</option>
              </select>
            </div>

            {#if formVoiceProvider === 'groq'}
              <div class="flex flex-col gap-1.5">
                <label for="form-voice-groq" class="font-bold text-zinc-300">Groq API Key:</label>
                <input
                  id="form-voice-groq"
                  type="password"
                  bind:value={formVoiceGroqKey}
                  placeholder="gsk_..."
                  class="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono outline-none focus:border-indigo-500"
                />
                <span class="text-[11px] text-zinc-500">
                  Dapatkan API Key gratis di <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:underline">console.groq.com/keys</a>.
                </span>
              </div>
            {:else if formVoiceProvider === 'openai'}
              <div class="flex flex-col gap-1.5">
                <label for="form-voice-openai" class="font-bold text-zinc-300">OpenAI API Key (Whisper):</label>
                <input
                  id="form-voice-openai"
                  type="password"
                  bind:value={formVoiceOpenaiKey}
                  placeholder="sk-..."
                  class="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono outline-none focus:border-indigo-500"
                />
              </div>
            {:else if formVoiceProvider === 'gemini'}
              <div class="flex flex-col gap-1.5">
                <label for="form-voice-gemini" class="font-bold text-zinc-300">Google Gemini API Key:</label>
                <input
                  id="form-voice-gemini"
                  type="password"
                  bind:value={formVoiceGeminiKey}
                  placeholder="AIzaSy..."
                  class="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 font-mono outline-none focus:border-indigo-500"
                />
              </div>
            {/if}

            <div class="flex flex-col gap-1.5">
              <label for="form-voice-lang" class="font-bold text-zinc-300">Bahasa Utama Perintah Suara:</label>
              <select
                id="form-voice-lang"
                bind:value={formVoiceLang}
                class="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-zinc-100 outline-none focus:border-indigo-500 cursor-pointer"
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
      <div class="px-4 sm:px-6 py-3.5 border-t border-white/[0.08] flex items-center justify-end gap-3 bg-zinc-900/60 shrink-0">
        <button
          onclick={onClose}
          class="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer transition"
        >
          Batal
        </button>
        <button
          onclick={handleSave}
          disabled={isSaving}
          class="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 transition cursor-pointer active:scale-95"
        >
          <Save class="w-3.5 h-3.5" />
          {isSaving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
        </button>
      </div>

    </div>
  </div>
{/if}
