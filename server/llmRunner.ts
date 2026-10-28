import { AppConfig } from './types';
import fs from 'fs';
import path from 'path';

export interface ProviderModelDefinition {
  id: string;
  name: string;
  provider: 'antigravity' | 'openai' | 'grok' | 'qwen' | 'deepseek' | 'gemini' | 'custom';
  description?: string;
  hasKey?: boolean;
}

export const PRESET_MODELS: ProviderModelDefinition[] = [
  // Antigravity CLI Default
  { id: 'gemini-3.8-flash-high', name: 'Gemini 3.8 Flash (High Reasoning)', provider: 'antigravity', description: 'Antigravity CLI Core Default' },
  { id: 'gemini-3.8-flash-medium', name: 'Gemini 3.8 Flash (Medium Reasoning)', provider: 'antigravity', description: 'Antigravity CLI Core Balance' },
  { id: 'gemini-3.8-flash-low', name: 'Gemini 3.8 Flash (Fast / Low Reasoning)', provider: 'antigravity', description: 'Antigravity CLI Core Ultra Fast' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6 (Thinking)', provider: 'antigravity', description: 'Claude via Antigravity Core' },
  { id: 'claude-opus-4-6-thinking', name: 'Claude Opus 4.6 (Thinking)', provider: 'antigravity', description: 'Opus Thinking via Antigravity Core' },

  // OpenAI
  { id: 'openai:gpt-4o', name: 'GPT-4o (Omni Flagship)', provider: 'openai', description: 'Model multimodal flagship OpenAI' },
  { id: 'openai:gpt-4o-mini', name: 'GPT-4o Mini (Cepat & Ringan)', provider: 'openai', description: 'Hemat biaya & respons sangat cepat' },
  { id: 'openai:o3-mini', name: 'o3-mini (High Reasoning)', provider: 'openai', description: 'Spesialis STEM, math, & koding' },
  { id: 'openai:o1', name: 'o1 (Deep Reasoning)', provider: 'openai', description: 'Penalaran kompleks kelas dunia' },

  // Grok / xAI
  { id: 'grok:grok-2', name: 'Grok 2 (State-of-the-Art)', provider: 'grok', description: 'Model flagship dari xAI' },
  { id: 'grok:grok-2-mini', name: 'Grok 2 Mini (Cepat & Efisien)', provider: 'grok', description: 'Varian ringan & gesit dari Grok' },
  { id: 'grok:grok-beta', name: 'Grok Beta', provider: 'grok', description: 'Model preview eksperimental xAI' },

  // Qwen / Alibaba DashScope
  { id: 'qwen:qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B (Spesialis Koding)', provider: 'qwen', description: 'Model khusus programming & software engineering' },
  { id: 'qwen:qwen-max', name: 'Qwen Max (Flagship)', provider: 'qwen', description: 'Penalaran tingkat tinggi multi-domain' },
  { id: 'qwen:qwen-plus', name: 'Qwen Plus (Balanced)', provider: 'qwen', description: 'Keseimbangan performa & kecepatan' },
  { id: 'qwen:qwen-turbo', name: 'Qwen Turbo (Super Cepat)', provider: 'qwen', description: 'Respons instan throughput tinggi' },

  // DeepSeek
  { id: 'deepseek:deepseek-chat', name: 'DeepSeek V3 (Chat & Coding)', provider: 'deepseek', description: 'Arsitektur MoE 671B canggih & hemat' },
  { id: 'deepseek:deepseek-reasoner', name: 'DeepSeek R1 (Reasoning / Thinking)', provider: 'deepseek', description: 'Model penalaran rantai pikiran (Chain of Thought)' },

  // Google Gemini Direct API
  { id: 'gemini:gemini-2.0-flash', name: 'Gemini 2.0 Flash (Next-Gen)', provider: 'gemini', description: 'Generasi terbaru multimodal Google' },
  { id: 'gemini:gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', provider: 'gemini', description: 'Cepat & hemat latensi rendah' },
  { id: 'gemini:gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini', description: 'Konteks dokumen & kode masif' },
  { id: 'gemini:gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini', description: 'Kecepatan tinggi multimodal' }
];

export function isExternalModel(modelId?: string): boolean {
  if (!modelId) return false;
  const lower = modelId.toLowerCase();
  return (
    lower.startsWith('openai:') ||
    lower.startsWith('grok:') ||
    lower.startsWith('xai:') ||
    lower.startsWith('qwen:') ||
    lower.startsWith('deepseek:') ||
    lower.startsWith('gemini:') ||
    lower.startsWith('custom:')
  );
}

export function parseModelId(modelId: string): { provider: string; modelName: string } {
  if (!modelId.includes(':')) {
    return { provider: 'antigravity', modelName: modelId };
  }
  const parts = modelId.split(':');
  const provider = parts[0].toLowerCase();
  const modelName = parts.slice(1).join(':');
  return { provider, modelName };
}

export function getAllAvailableModels(config: AppConfig): ProviderModelDefinition[] {
  const providers = config.aiProviders || {};

  const hasOpenAI = Boolean(providers.openai?.apiKey || process.env.OPENAI_API_KEY);
  const hasGrok = Boolean(providers.grok?.apiKey || process.env.GROK_API_KEY || process.env.XAI_API_KEY);
  const hasQwen = Boolean(providers.qwen?.apiKey || process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY);
  const hasDeepSeek = Boolean(providers.deepseek?.apiKey || process.env.DEEPSEEK_API_KEY);
  const hasGemini = Boolean(providers.gemini?.apiKey || process.env.GEMINI_API_KEY);

  const result: ProviderModelDefinition[] = PRESET_MODELS.map(m => {
    let hasKey = true;
    if (m.provider === 'openai') hasKey = hasOpenAI;
    else if (m.provider === 'grok') hasKey = hasGrok;
    else if (m.provider === 'qwen') hasKey = hasQwen;
    else if (m.provider === 'deepseek') hasKey = hasDeepSeek;
    else if (m.provider === 'gemini') hasKey = hasGemini;

    return { ...m, hasKey };
  });

  // Tambahkan model custom jika ada
  if (providers.custom && Array.isArray(providers.custom)) {
    for (const c of providers.custom) {
      if (c.models && Array.isArray(c.models)) {
        for (const m of c.models) {
          result.push({
            id: `custom:${c.id}:${m.id}`,
            name: `${c.name}: ${m.name || m.id}`,
            provider: 'custom',
            description: `Model Custom (${c.baseUrl})`,
            hasKey: Boolean(c.apiKey)
          });
        }
      }
    }
  }

  return result;
}

export function resolveProviderConfig(modelId: string, config: AppConfig): {
  provider: string;
  modelName: string;
  apiKey: string;
  baseUrl: string;
} {
  const { provider, modelName } = parseModelId(modelId);
  const aiCfg = config.aiProviders || {};

  let apiKey = '';
  let baseUrl = '';

  switch (provider) {
    case 'openai':
      apiKey = aiCfg.openai?.apiKey || process.env.OPENAI_API_KEY || '';
      baseUrl = (aiCfg.openai?.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
      break;

    case 'grok':
    case 'xai':
      apiKey = aiCfg.grok?.apiKey || process.env.GROK_API_KEY || process.env.XAI_API_KEY || '';
      baseUrl = (aiCfg.grok?.baseUrl || 'https://api.x.ai/v1').replace(/\/+$/, '');
      break;

    case 'qwen':
      apiKey = aiCfg.qwen?.apiKey || process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || '';
      baseUrl = (aiCfg.qwen?.baseUrl || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1').replace(/\/+$/, '');
      break;

    case 'deepseek':
      apiKey = aiCfg.deepseek?.apiKey || process.env.DEEPSEEK_API_KEY || '';
      baseUrl = (aiCfg.deepseek?.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
      break;

    case 'gemini':
      apiKey = aiCfg.gemini?.apiKey || process.env.GEMINI_API_KEY || '';
      baseUrl = (aiCfg.gemini?.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, '');
      break;

    case 'custom': {
      const parts = modelName.split(':');
      const customId = parts[0];
      const actualModel = parts.slice(1).join(':') || customId;
      const customFound = aiCfg.custom?.find(c => c.id === customId);
      if (customFound) {
        apiKey = customFound.apiKey;
        baseUrl = customFound.baseUrl.replace(/\/+$/, '');
      }
      return { provider, modelName: actualModel, apiKey, baseUrl };
    }

    default:
      break;
  }

  return { provider, modelName, apiKey, baseUrl };
}

/**
 * Menguji apakah API Key & Base URL dari suatu provider valid.
 */
export async function testProviderConnection(
  provider: string,
  apiKey: string,
  baseUrl?: string
): Promise<{ success: boolean; message: string; modelTested?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: 'API Key tidak boleh kosong' };
  }

  let endpoint = '';
  let testModel = '';

  switch (provider.toLowerCase()) {
    case 'openai':
      endpoint = `${(baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '')}/chat/completions`;
      testModel = 'gpt-4o-mini';
      break;
    case 'grok':
    case 'xai':
      endpoint = `${(baseUrl || 'https://api.x.ai/v1').replace(/\/+$/, '')}/chat/completions`;
      testModel = 'grok-2-mini';
      break;
    case 'qwen':
      endpoint = `${(baseUrl || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1').replace(/\/+$/, '')}/chat/completions`;
      testModel = 'qwen-turbo';
      break;
    case 'deepseek':
      endpoint = `${(baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '')}/chat/completions`;
      testModel = 'deepseek-chat';
      break;
    case 'gemini':
      endpoint = `${(baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, '')}/chat/completions`;
      testModel = 'gemini-2.0-flash';
      break;
    case 'custom':
      endpoint = `${(baseUrl || '').replace(/\/+$/, '')}/chat/completions`;
      testModel = 'default';
      break;
    default:
      return { success: false, message: `Provider tidak dikenal: ${provider}` };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: testModel,
        messages: [{ role: 'user', content: 'Ping! Balas kata "OK" saja.' }],
        max_tokens: 10
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '');
      let parsedErr = errorBody;
      try {
        const j = JSON.parse(errorBody);
        parsedErr = j.error?.message || j.message || errorBody;
      } catch {}
      return {
        success: false,
        message: `HTTP ${res.status}: ${parsedErr.slice(0, 200)}`,
        modelTested: testModel
      };
    }

    const data = await res.json().catch(() => null);
    const reply = data?.choices?.[0]?.message?.content?.trim() || 'OK';

    return {
      success: true,
      message: `Terhubung sukses! Respons AI (${testModel}): "${reply}"`,
      modelTested: testModel
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, message: 'Request timeout (melebihi 12 detik). Periksa koneksi internet atau Base URL.' };
    }
    return { success: false, message: err.message || 'Gagal menghubungi server API.' };
  }
}

/**
 * Eksekusi Autonomous Streaming Chat Completion dengan Provider Eksternal (OpenAI, Grok, Qwen, DeepSeek, Gemini).
 */
export async function runExternalLLM(options: {
  prompt: string;
  systemPrompt?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  modelId: string;
  config: AppConfig;
  images?: string[];
  onDelta: (chunk: string) => void;
  onThought?: (thought: string) => void;
  abortSignal?: AbortSignal;
}): Promise<{ response: string; thought?: string }> {
  const { provider, modelName, apiKey, baseUrl } = resolveProviderConfig(options.modelId, options.config);

  if (!apiKey) {
    throw new Error(
      `API Key untuk provider "${provider.toUpperCase()}" belum dikonfigurasi. ` +
      `Silakan buka Pengaturan > AI Providers di Web UI untuk memasukkan API Key Anda.`
    );
  }

  const endpoint = `${baseUrl}/chat/completions`;

  // Susun messages array
  const messages: any[] = [];

  if (options.systemPrompt && options.systemPrompt.trim()) {
    messages.push({
      role: 'system',
      content: options.systemPrompt.trim()
    });
  }

  // Sisipkan riwayat percakapan sebelumnya jika ada (multi-turn memory)
  if (options.history && Array.isArray(options.history)) {
    for (const h of options.history) {
      if (h.content && h.content.trim()) {
        messages.push({
          role: h.role === 'assistant' ? 'assistant' : 'user',
          content: h.content.trim()
        });
      }
    }
  }

  // Handle multimodal images if provided
  if (options.images && options.images.length > 0) {
    const contentParts: any[] = [{ type: 'text', text: options.prompt }];

    for (const img of options.images) {
      try {
        let imageUri = img;
        if (img.startsWith('/uploads/')) {
          const absPath = path.join(__dirname, '..', '..', 'data', img.replace(/^\//, ''));
          if (fs.existsSync(absPath)) {
            const buf = fs.readFileSync(absPath);
            const ext = path.extname(absPath).slice(1).toLowerCase() || 'png';
            const mime = ext === 'jpg' ? 'jpeg' : ext;
            imageUri = `data:image/${mime};base64,${buf.toString('base64')}`;
          }
        }
        contentParts.push({
          type: 'image_url',
          image_url: { url: imageUri }
        });
      } catch (e) {
        console.warn('[LLMRunner] Gagal membaca lampiran gambar:', e);
      }
    }

    messages.push({
      role: 'user',
      content: contentParts
    });
  } else {
    messages.push({
      role: 'user',
      content: options.prompt
    });
  }

  const payload: any = {
    model: modelName,
    messages,
    stream: true
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload),
    signal: options.abortSignal
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    let errMessage = errorBody;
    try {
      const parsed = JSON.parse(errorBody);
      errMessage = parsed.error?.message || parsed.message || errorBody;
    } catch {}
    throw new Error(`Provider ${provider.toUpperCase()} Error (${res.status}): ${errMessage}`);
  }

  if (!res.body) {
    throw new Error('Respons stream body dari provider kosong.');
  }

  let accumulatedText = '';
  let accumulatedThought = '';

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed === 'data: [DONE]') {
          break;
        }

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;

            // Handle reasoning/thought (seperti DeepSeek R1 atau QwQ atau o1/o3)
            if (delta?.reasoning_content) {
              accumulatedThought += delta.reasoning_content;
              if (options.onThought) {
                options.onThought(accumulatedThought);
              }
            }

            if (delta?.content) {
              accumulatedText += delta.content;
              options.onDelta(delta.content);
            }
          } catch {
            // Abaikan baris format non-json atau keep-alive
          }
        }
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Tugas dibatalkan oleh pengguna.');
    }
    throw err;
  }

  return {
    response: accumulatedText,
    thought: accumulatedThought || undefined
  };
}
