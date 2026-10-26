import os from 'os';
import localtunnel from 'localtunnel';
import QRCode from 'qrcode';
import { EventEmitter } from 'events';
import { TunnelStatus } from './types';

export class TunnelManager extends EventEmitter {
  public port: number;
  private tunnel: any = null;
  public publicUrl: string | null = null;
  public tunnelStatus: TunnelStatus['status'] = 'stopped';
  public errorMessage: string | null = null;

  constructor(port: number = 3888) {
    super();
    this.port = port;
  }

  public setPort(port: number): void {
    this.port = port;
  }

  public getLocalIP(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const netList = interfaces[name];
      if (netList) {
        for (const iface of netList) {
          if (iface.family === 'IPv4' && !iface.internal) {
            return iface.address;
          }
        }
      }
    }
    return '127.0.0.1';
  }

  public getLocalUrl(): string {
    const ip = this.getLocalIP();
    return `http://${ip}:${this.port}`;
  }

  public async getQrCode(url: string | null): Promise<string | null> {
    if (!url) return null;
    try {
      return await QRCode.toDataURL(url, {
        margin: 2,
        scale: 6,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (err) {
      console.error('Error generating QR code:', err);
      return null;
    }
  }

  private currentSubdomain: string = 'zhiend-agent';

  public async startTunnel(subdomain: string = ''): Promise<{ success: boolean; url?: string; error?: string }> {
    if (this.tunnel) {
      await this.stopTunnel();
      await new Promise(r => setTimeout(r, 1200));
    }

    if (subdomain && subdomain.trim()) {
      this.currentSubdomain = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    } else if (!this.currentSubdomain) {
      this.currentSubdomain = 'zhiend-agent';
    }

    const targetSubdomain = this.currentSubdomain;
    this.tunnelStatus = 'connecting';
    this.errorMessage = null;
    this.emit('status_change', { status: this.tunnelStatus });

    const maxAttempts = 6;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const options: any = { 
          port: this.port,
          local_host: '127.0.0.1'
        };
        if (targetSubdomain) {
          options.subdomain = targetSubdomain;
        }

        const tun = await localtunnel(options);

        // Jika loca.lt sempat melempar random domain karena socket lama baru saja ditutup, tolak dan coba lagi
        if (targetSubdomain && !tun.url.toLowerCase().includes(targetSubdomain)) {
          console.warn(`[Tunnel] Diminta '${targetSubdomain}' tapi loca.lt mengembalikan '${tun.url}'. Menunggu pelepasan socket di loca.lt (${attempt}/${maxAttempts})...`);
          try { tun.close(); } catch {}
          if (attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, 2500));
            continue;
          } else {
            this.stopHeartbeat();
            this.tunnelStatus = 'error';
            this.errorMessage = `Subdomain '${targetSubdomain}' masih dalam antrian pelepasan oleh server loca.lt. Mohon tunggu sekitar 5 detik lalu klik Buka lagi.`;
            this.emit('status_change', { status: this.tunnelStatus, error: this.errorMessage });
            return {
              success: false,
              error: this.errorMessage
            };
          }
        }

        this.tunnel = tun;
        this.publicUrl = tun.url;
        this.tunnelStatus = 'connected';
        this.startHeartbeat();

        this.tunnel.on('close', () => {
          this.stopHeartbeat();
          this.tunnel = null;
          this.publicUrl = null;
          this.tunnelStatus = 'stopped';
          this.emit('status_change', { status: this.tunnelStatus });
        });

        this.tunnel.on('error', (err: any) => {
          console.error('[Tunnel Error]', err?.message || err);
          this.stopHeartbeat();
          this.errorMessage = err.message;
          this.tunnelStatus = 'error';
          this.emit('status_change', { status: this.tunnelStatus, error: err.message });
        });

        this.emit('status_change', {
          status: this.tunnelStatus,
          url: this.publicUrl
        });

        return {
          success: true,
          url: this.publicUrl || undefined
        };
      } catch (err: any) {
        console.warn(`[Tunnel] Gagal terhubung pada percobaan ${attempt}:`, err?.message || err);
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        this.stopHeartbeat();
        this.tunnelStatus = 'error';
        this.errorMessage = err.message;
        this.emit('status_change', { status: this.tunnelStatus, error: err.message });
        return {
          success: false,
          error: err.message
        };
      }
    }

    return {
      success: false,
      error: `Gagal mendapatkan subdomain '${targetSubdomain}'. Silakan coba lagi.`
    };
  }

  private pingInterval: NodeJS.Timeout | null = null;
  public publicIp: string | null = null;

  public async getPublicIp(): Promise<string> {
    if (this.publicIp) return this.publicIp;
    try {
      const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
      const data: any = await res.json();
      if (data?.ip) {
        this.publicIp = data.ip;
        return data.ip;
      }
    } catch {}
    return '';
  }

  private failedPings: number = 0;

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.failedPings = 0;
    this.pingInterval = setInterval(async () => {
      if (!this.publicUrl || this.tunnelStatus !== 'connected') return;
      try {
        const res = await fetch(`${this.publicUrl}/api/auth/status`, {
          headers: { 'Bypass-Tunnel-Reminder': 'true' },
          signal: AbortSignal.timeout(10000)
        });
        if (res.ok) {
          this.failedPings = 0;
        } else if (res.status === 503) {
          this.failedPings++;
          console.warn(`[Tunnel Heartbeat] 503 from loca.lt (${this.failedPings}/3)...`);
          if (this.failedPings >= 3) {
            console.warn('[Tunnel Heartbeat] 3 consecutive 503s, reconnecting tunnel...');
            this.failedPings = 0;
            this.startTunnel(this.currentSubdomain).catch(() => {});
          }
        }
      } catch (e: any) {
        this.failedPings++;
        console.warn(`[Tunnel Heartbeat] Ping failed (${this.failedPings}/3): ${e.message}`);
        if (this.failedPings >= 3) {
          console.warn('[Tunnel Heartbeat] 3 consecutive ping failures, reconnecting tunnel...');
          this.failedPings = 0;
          this.startTunnel(this.currentSubdomain).catch(() => {});
        }
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public async stopTunnel(): Promise<{ success: boolean }> {
    this.stopHeartbeat();
    if (this.tunnel) {
      try {
        await this.tunnel.close();
      } catch (err) {
        console.error('Error closing tunnel:', err);
      }
      this.tunnel = null;
    }
    this.publicUrl = null;
    this.tunnelStatus = 'stopped';
    this.errorMessage = null;
    this.emit('status_change', { status: this.tunnelStatus });
    return { success: true };
  }

  public getStatus(): { status: TunnelStatus['status']; url: string | null; error: string | null } {
    return {
      status: this.tunnelStatus,
      url: this.publicUrl,
      error: this.errorMessage
    };
  }

  public async getNetworkInfo(): Promise<TunnelStatus> {
    const localUrl = this.getLocalUrl();
    const localQr = await this.getQrCode(localUrl);
    let publicQr: string | null = null;
    if (this.publicUrl) {
      publicQr = await this.getQrCode(this.publicUrl);
    }

    return {
      localIp: this.getLocalIP(),
      localUrl,
      localQr,
      publicUrl: this.publicUrl,
      publicQr,
      status: this.tunnelStatus,
      error: this.errorMessage
    };
  }
}
