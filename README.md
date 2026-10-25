# ⚡ zhiEnd Agent — Autonomous AI Coding & Remote Hub

AI Coding Assistant berbasis **Google Antigravity Core** dengan UI modern, clean, dan intuitif. Membantu Anda mengelola codebase lokal, melakukan refactoring, debugging, serta commit dan push ke GitHub secara langsung — dapat diakses secara lokal maupun remote melalui Internet, WhatsApp, dan Telegram.

---

## 🌟 Fitur Utama

1. **AI Coding Engine (Google Antigravity Core)**:
   - Menggunakan binary CLI resmi `agy` dengan model performa tinggi: **Gemini 3.8 Flash (High/Medium/Low)**, **Claude Sonnet 4.6**, dan **Claude Opus 4.6**.
   - Autonomous code inspection, file editing, shell command execution, dan real-time stream token.
   - Quick action chips: *Review Code*, *Jelaskan Project*, *Cari & Fix Bug*, *Buat Tests*, *Commit & Push*.

2. **Modern & Clean UI (Dark / Glassmorphism)**:
   - Tampilan responsif dengan Obsidian/Slate palette dan aksen glowing.
   - Project Workspace Switcher: navigasi dan pilih project lokal mana saja di komputer Anda.
   - File Tree Explorer & System Terminal log streaming.

3. **Git & GitHub Integration**:
   - Status visual branch aktif, remote GitHub repository, ahead/behind counters.
   - Staging/unstaging file dan visual Code Diff Viewer.
   - **AI Generate Commit Message**: Membuat pesan commit konvensional otomatis dari diff perubahan.
   - **One-Click Push to GitHub**: Push branch ke origin dengan output modal langsung dan animasi confetti perayaan.

4. **Akses Lokal & Luar (Internet)**:
   - **Local & LAN**: Dapat diakses di komputer via `http://localhost:3888` atau melalui HP di jaringan Wi-Fi yang sama via IP LAN (dilengkapi QR Code untuk scan cepat).
   - **Akses Luar / Remote Tunnel**: Built-in Public Tunnel (Localtunnel) menghasilkan link HTTPS aman yang bisa diakses dari mana saja tanpa setting router.
   - **Security PIN**: Pengamanan akses Web UI dengan PIN agar orang lain tidak dapat mengakses dashboard dari luar tanpa izin.

5. **Remote WhatsApp Bot**:
   - Terintegrasi menggunakan protokol Baileys Multi-Device.
   - Cukup klik tombol di tab *Remote Hub* dan scan QR Code melalui WhatsApp (Menu *Perangkat Tertaut*).
   - Kontrol coding dan git langsung dari percakapan WhatsApp.

6. **Remote Telegram Bot**:
   - Terintegrasi menggunakan Telegraf polling (berjalan langsung tanpa port forwarding).
   - Masukkan token dari `@BotFather` dan jalankan dengan 1-klik.
   - Mendukung whitelist user ID untuk keamanan maksimal.

---

## 🚀 Cara Menjalankan

### 1. Jalankan Server
Buka terminal di folder project:
```bash
npm start
```

Server akan langsung aktif:
```
===============================================
🚀 zhiEnd Agent Server running on:
   👉 Local:   http://localhost:3888
   👉 LAN:     http://192.168.0.100:3888
   📁 Project: D:/Works/zhiEnd-agent
===============================================
```

### 2. Akses Dashboard
Buka browser Anda dan kunjungi:
👉 **[http://localhost:3888](http://localhost:3888)**

---

## 📱 Panduan Remote Control

### 🟢 WhatsApp Bot
1. Buka tab **Remote & Mobile Hub** di Web UI.
2. Pada kartu *WhatsApp Remote Control*, klik **Hubungkan WhatsApp**.
3. Di HP Anda, buka **WhatsApp > Pengaturan / Titik Tiga > Perangkat Tertaut > Tautkan Perangkat**.
4. Arahkan kamera HP ke QR Code yang muncul di layar dashboard.
5. Setelah terhubung, Anda dapat mengirim pesan ke nomor bot:
   - `!code <instruksi>` (atau kirim pesan langsung) : Minta agent menulis/mengedit kode
   - `!git` : Cek file yang berubah dan branch git
   - `!diff` : Cek diff perubahan kode
   - `!commit <pesan>` : Stage semua file dan lakukan commit
   - `!push` : Push commit ke GitHub
   - `!project <path>` : Ganti folder project yang sedang dikerjakan
   - `!status` : Cek status kesibukan agent
   - `!cancel` : Batalkan proses agent yang sedang berjalan

---

### 🔵 Telegram Bot
1. Buat bot baru di Telegram melalui **[@BotFather](https://t.me/BotFather)** dan dapatkan Bot Token.
2. Buka tab **Remote & Mobile Hub** di Web UI.
3. Masukkan Token ke kolom *Bot Token*, lalu klik **Simpan** dan **Jalankan Bot**.
4. Buka bot Anda di Telegram dan kirim perintah:
   - `/start` atau `/help` : Menampilkan menu perintah
   - Kirim teks langsung atau `/code <perintah>` : Minta agent coding
   - `/git` : Cek status git repository
   - `/diff` : Cek diff file yang berubah
   - `/commit <pesan>` : Commit perubahan
   - `/push` : Push ke GitHub
   - `/project <path>` : Berpindah ke direktori project lain
   - `/cancel` : Batalkan task yang sedang diproses

---

### 🌐 Akses Luar (Public Tunnel)
1. Buka tab **Remote & Mobile Hub** > Bagian **Akses Luar / Internet**.
2. Masukkan custom subdomain (opsional), lalu klik **Buka Akses Publik (Start Tunnel)**.
3. Link HTTPS publik dan QR code akan otomatis dibuat. Anda bisa membuka link tersebut dari HP saat berada di luar rumah atau jaringan kantor.
4. Anda dapat mengatur **PIN Akses Web UI** pada bagian *Kunci Keamanan PIN* agar akses dashboard tetap terlindungi.

---

## 🛠️ Struktur Project

```
d:/Works/zhiEnd-agent/
├── package.json
├── data/
│   ├── config.json          # Pengaturan tersimpan (project, token, pin)
│   └── baileys_auth/        # Session WhatsApp Web terenkripsi
├── server/
│   ├── index.js             # Express API & Socket.io server
│   ├── config.js            # Configuration manager
│   ├── agentRunner.js       # Antigravity CLI runner & stream parser
│   ├── gitManager.js        # Git status, diff, commit, dan push
│   ├── tunnelManager.js     # IP detector & Localtunnel launcher
│   └── bots/
│       ├── telegramBot.js   # Telegram bot controller
│       └── whatsappBot.js   # WhatsApp bot controller
└── public/
    ├── index.html           # Single Page Application
    ├── css/
    │   └── style.css        # Clean & modern dark-glass UI
    └── js/
        ├── app.js           # Socket.io & view bootstrap
        ├── chat.js          # Real-time streaming chat
        ├── git.js           # Git & GitHub visual manager
        └── bots.js          # WhatsApp, Telegram & Tunnel controls
```
