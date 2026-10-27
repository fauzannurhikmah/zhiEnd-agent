import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { loadConfig } from './config';

export class VoiceService {
  /**
   * Transcribe an audio buffer into text.
   * Supports Groq Whisper (free & ultra-fast), OpenAI Whisper, Gemini multimodal audio, and Antigravity CLI fallback.
   */
  public async transcribeAudio(
    audioBuffer: Buffer,
    originalName: string = 'audio.ogg',
    mimeType: string = 'audio/ogg',
    preferredLang?: string
  ): Promise<{ success: boolean; text?: string; error?: string; provider?: string }> {
    if (!audioBuffer || audioBuffer.length === 0) {
      return { success: false, error: 'Buffer audio kosong' };
    }

    const config = loadConfig();
    const voiceCfg = config.voice || {};
    const lang = preferredLang || voiceCfg.language || 'id';

    // 1. Prioritas Groq Whisper (Gratis, response time ~0.8s, sangat akurat untuk Bahasa Indonesia & Inggris)
    const groqKey = voiceCfg.groqApiKey || process.env.GROQ_API_KEY;
    if (groqKey && (voiceCfg.provider === 'groq' || (!voiceCfg.openaiApiKey && !voiceCfg.geminiApiKey))) {
      try {
        const result = await this.transcribeWithGroq(audioBuffer, originalName, mimeType, groqKey, lang);
        if (result.success && result.text) {
          return { success: true, text: result.text, provider: 'groq' };
        }
      } catch (err: any) {
        console.warn('[VoiceService] Groq Whisper failed:', err.message);
      }
    }

    // 2. OpenAI Whisper
    const openaiKey = voiceCfg.openaiApiKey || process.env.OPENAI_API_KEY;
    if (openaiKey && (voiceCfg.provider === 'openai' || !groqKey)) {
      try {
        const result = await this.transcribeWithOpenAI(audioBuffer, originalName, mimeType, openaiKey, lang);
        if (result.success && result.text) {
          return { success: true, text: result.text, provider: 'openai' };
        }
      } catch (err: any) {
        console.warn('[VoiceService] OpenAI Whisper failed:', err.message);
      }
    }

    // 3. Google Gemini API (Multimodal Audio)
    const geminiKey = voiceCfg.geminiApiKey || process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const result = await this.transcribeWithGemini(audioBuffer, mimeType, geminiKey, lang);
        if (result.success && result.text) {
          return { success: true, text: result.text, provider: 'gemini' };
        }
      } catch (err: any) {
        console.warn('[VoiceService] Gemini Audio failed:', err.message);
      }
    }

    // 4. Zero-Config Fallback: Antigravity CLI (agy.exe)
    const cliPath = config.antigravity?.cliPath || 'C:\\Users\\zhien\\AppData\\Local\\agy\\bin\\agy.exe';
    if (fs.existsSync(cliPath)) {
      try {
        console.log('[VoiceService] Mencoba transkripsi via Antigravity CLI fallback...');
        const result = await this.transcribeWithAgyCli(audioBuffer, originalName, cliPath);
        if (result.success && result.text) {
          return { success: true, text: result.text, provider: 'antigravity-cli' };
        }
      } catch (cliErr: any) {
        console.warn('[VoiceService] Antigravity CLI transcription failed:', cliErr.message);
      }
    }

    return {
      success: false,
      error: 'Tidak ada transcription engine yang tersedia. Masukkan Groq API Key (gratis di console.groq.com) atau OpenAI/Gemini Key di menu Pengaturan Hub.'
    };
  }

  private async transcribeWithGroq(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    apiKey: string,
    lang: string
  ): Promise<{ success: boolean; text?: string; error?: string }> {
    const form = new FormData();
    const blob = new Blob([buffer], { type: mimeType });
    form.append('file', blob, filename);
    form.append('model', 'whisper-large-v3-turbo');
    form.append('response_format', 'json');
    if (lang && lang !== 'auto') {
      form.append('language', lang);
    }

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: form
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API error (${res.status}): ${errText}`);
    }

    const data: any = await res.json();
    return { success: true, text: data?.text?.trim() };
  }

  private async transcribeWithOpenAI(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    apiKey: string,
    lang: string
  ): Promise<{ success: boolean; text?: string; error?: string }> {
    const form = new FormData();
    const blob = new Blob([buffer], { type: mimeType });
    form.append('file', blob, filename);
    form.append('model', 'whisper-1');
    form.append('response_format', 'json');
    if (lang && lang !== 'auto') {
      form.append('language', lang);
    }

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: form
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI Whisper error (${res.status}): ${errText}`);
    }

    const data: any = await res.json();
    return { success: true, text: data?.text?.trim() };
  }

  private async transcribeWithGemini(
    buffer: Buffer,
    mimeType: string,
    apiKey: string,
    lang: string
  ): Promise<{ success: boolean; text?: string; error?: string }> {
    const base64Audio = buffer.toString('base64');
    const targetMime = mimeType.includes('ogg') ? 'audio/ogg' : mimeType.includes('mp4') ? 'audio/mp4' : 'audio/mp3';

    const payload = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: targetMime,
                data: base64Audio
              }
            },
            {
              text: `Transkripsikan seluruh isi rekaman suara ini ke dalam teks secara verbatim, presisi, dan akurat (dalam bahasa ${lang === 'id' ? 'Indonesia' : 'Inggris'}). JANGAN berikan komentar tambahan, JANGAN berikan tanda kutip pembuka/penutup, dan JANGAN berikan pengantar apapun. HANYA keluarkan kalimat/kata yang diucapkan.`
            }
          ]
        }
      ]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const data: any = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return { success: true, text: candidateText?.trim() };
  }

  private async transcribeWithAgyCli(
    buffer: Buffer,
    filename: string,
    cliPath: string
  ): Promise<{ success: boolean; text?: string; error?: string }> {
    const tempDir = path.join(__dirname, '..', 'data', 'uploads', 'voice');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const ext = path.extname(filename) || '.ogg';
    const tempPath = path.join(tempDir, `transcribe_${Date.now()}${ext}`);
    fs.writeFileSync(tempPath, buffer);

    const prompt = `Anda memiliki file rekaman suara biner di: "${tempPath.replace(/\\/g, '/')}".
Gunakan tool view_file(AbsolutePath: "${tempPath.replace(/\\/g, '/')}") untuk mendengarkan/memeriksa rekaman audio tersebut, lalu transkripsikan isi pembicaraan/perintah suaranya ke dalam teks secara presisi.
OUTPUT HANYA TEKS YANG DIUCAPKAN DALAM REKAMAN! Dilarang menambahkan kata pengantar seperti 'Rekaman ini berisi...' atau sejenisnya.`;

    const args = [
      '-p', prompt,
      '--output-format', 'json',
      '--dangerously-skip-permissions',
      '--model', 'gemini-3.8-flash-low'
    ];

    return new Promise((resolve) => {
      let stdout = '';
      try {
        const proc = spawn(cliPath, args, {
          cwd: path.dirname(tempPath),
          env: { ...process.env },
          shell: false,
          windowsHide: true
        });

        proc.stdout?.on('data', (d) => { stdout += d.toString(); });
        proc.on('close', (code) => {
          try { fs.unlinkSync(tempPath); } catch {}
          if (code === 0 && stdout) {
            try {
              const parsed = JSON.parse(stdout);
              const text = parsed?.response?.trim();
              if (text) {
                return resolve({ success: true, text });
              }
            } catch {
              return resolve({ success: true, text: stdout.trim() });
            }
          }
          resolve({ success: false, error: 'Transkripsi CLI tidak menghasilkan teks' });
        });
        proc.on('error', (err) => {
          try { fs.unlinkSync(tempPath); } catch {}
          resolve({ success: false, error: err.message });
        });
      } catch (err: any) {
        try { fs.unlinkSync(tempPath); } catch {}
        resolve({ success: false, error: err.message });
      }
    });
  }
}

export const voiceService = new VoiceService();
