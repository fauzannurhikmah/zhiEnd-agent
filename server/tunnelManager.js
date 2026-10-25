const os = require('os');
const localtunnel = require('localtunnel');
const QRCode = require('qrcode');
const EventEmitter = require('events');

class TunnelManager extends EventEmitter {
  constructor(port = 3888) {
    super();
    this.port = port;
    this.tunnel = null;
    this.publicUrl = null;
    this.tunnelStatus = 'stopped'; // 'stopped' | 'connecting' | 'connected' | 'error'
    this.errorMessage = null;
  }

  setPort(port) {
    this.port = port;
  }

  getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }

  getLocalUrl() {
    const ip = this.getLocalIP();
    return `http://${ip}:${this.port}`;
  }

  async getQrCode(url) {
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

  async startTunnel(subdomain = '') {
    if (this.tunnel) {
      await this.stopTunnel();
    }

    this.tunnelStatus = 'connecting';
    this.errorMessage = null;
    this.emit('status_change', { status: this.tunnelStatus });

    try {
      const options = { port: this.port };
      if (subdomain && subdomain.trim()) {
        options.subdomain = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      }

      this.tunnel = await localtunnel(options);
      this.publicUrl = this.tunnel.url;
      this.tunnelStatus = 'connected';

      this.tunnel.on('close', () => {
        this.tunnel = null;
        this.publicUrl = null;
        this.tunnelStatus = 'stopped';
        this.emit('status_change', { status: this.tunnelStatus });
      });

      this.tunnel.on('error', (err) => {
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
        url: this.publicUrl
      };
    } catch (err) {
      this.tunnelStatus = 'error';
      this.errorMessage = err.message;
      this.emit('status_change', { status: this.tunnelStatus, error: err.message });
      return {
        success: false,
        error: err.message
      };
    }
  }

  async stopTunnel() {
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

  async getNetworkInfo() {
    const localUrl = this.getLocalUrl();
    const localQr = await this.getQrCode(localUrl);
    let publicQr = null;
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

module.exports = TunnelManager;
