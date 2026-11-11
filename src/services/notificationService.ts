/**
 * zhiEnd Agent - Cyber-Industrial Background Audio & Desktop Notification Service
 * Synthesizes a futuristic dual-tone chime via Web Audio API and triggers
 * OS-level desktop notifications when tasks complete while the browser tab is inactive.
 */

class NotificationService {
  private audioCtx: AudioContext | null = null;
  public soundEnabled: boolean = true;
  public desktopEnabled: boolean = true;
  private titleBlinkInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedSound = localStorage.getItem('zhiend_notify_sound');
      this.soundEnabled = savedSound !== null ? savedSound === 'true' : true;

      const savedDesktop = localStorage.getItem('zhiend_notify_desktop');
      this.desktopEnabled = savedDesktop !== null ? savedDesktop === 'true' : true;

      // Automatically reset flashing title when user returns to this tab
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.resetTitle();
        }
      });

      window.addEventListener('focus', () => {
        this.resetTitle();
      });
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('zhiend_notify_sound', String(enabled));
    }
  }

  public setDesktopEnabled(enabled: boolean) {
    this.desktopEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('zhiend_notify_desktop', String(enabled));
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Synthesize a clean, retro-futuristic Cyber-Industrial chime
   * (Teenage Engineering style resonant dual-tone ping)
   */
  public playChime(type: 'success' | 'alert' = 'success') {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.22, now);
      masterGain.connect(ctx.destination);

      if (type === 'success') {
        // Oscillator 1: D5 (587.33Hz) ramping to A5 (880Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.12);

        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.38, now + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        osc1.connect(gain1);
        gain1.connect(masterGain);

        // Oscillator 2: High resonant bell harmonic D6 (1174.66Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1174.66, now + 0.08);

        gain2.gain.setValueAtTime(0, now + 0.08);
        gain2.gain.linearRampToValueAtTime(0.18, now + 0.10);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc2.connect(gain2);
        gain2.connect(masterGain);

        osc1.start(now);
        osc1.stop(now + 0.6);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.5);
      } else {
        // Alert chime: C5 (523Hz) -> G4 (392Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(392.00, now + 0.15);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch (e) {
      console.warn('[NotificationService] Audio chime error:', e);
    }
  }

  /**
   * Request native browser desktop push notification permission
   */
  public async requestDesktopPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      try {
        const perm = await Notification.requestPermission();
        return perm === 'granted';
      } catch (e) {
        console.warn('[NotificationService] Request permission error:', e);
      }
    }
    return false;
  }

  /**
   * Notify that agent has started processing a task
   */
  public notifyTaskStart() {
    this.stopTitleBlink();
    if (typeof document !== 'undefined') {
      document.title = '⏳ [MEMPROSES...] zhiEnd Agent';
    }
  }

  /**
   * Notify that agent has completed execution
   * Only sounds and fires notifications if user is in another tab or background
   */
  public notifyTaskComplete(details: { prompt?: string; summary?: string; force?: boolean }) {
    const isBackground = typeof document !== 'undefined' && (document.hidden || !document.hasFocus());

    if (isBackground || details.force) {
      // 1. Play cybernetic chime
      this.playChime('success');

      // 2. Trigger OS Desktop Notification
      if (this.desktopEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const bodyText = details.summary
            ? (details.summary.length > 130 ? details.summary.slice(0, 127) + '...' : details.summary)
            : 'Tugas coding telah selesai dieksekusi oleh AI Agent.';

          const notif = new Notification('zhiEnd Agent :: Tugas Selesai ✅', {
            body: bodyText,
            icon: '/favicon.ico',
            tag: 'zhiend-task-finish'
          });

          notif.onclick = () => {
            window.focus();
            notif.close();
            this.resetTitle();
          };
        } catch (e) {
          console.warn('[NotificationService] Desktop notification error:', e);
        }
      }

      // 3. Pulse Tab Title
      this.startTitleBlink('🔔 [SELESAI!] zhiEnd Agent');
    } else {
      this.resetTitle();
    }
  }

  private startTitleBlink(alertTitle: string) {
    this.stopTitleBlink();
    if (typeof document === 'undefined') return;
    let state = false;
    document.title = alertTitle;
    this.titleBlinkInterval = setInterval(() => {
      state = !state;
      document.title = state ? alertTitle : '✨ SELESAI :: zhiEnd Agent';
    }, 1200);
  }

  public resetTitle() {
    this.stopTitleBlink();
    if (typeof document !== 'undefined') {
      document.title = 'zhiEnd Agent';
    }
  }

  private stopTitleBlink() {
    if (this.titleBlinkInterval) {
      clearInterval(this.titleBlinkInterval);
      this.titleBlinkInterval = null;
    }
  }
}

export const notificationService = new NotificationService();

