---
name: zhiend-standards
description: Coding guidelines, architecture conventions, TypeScript safety rules, Svelte 5 component patterns, Hono backend patterns, Tailwind CSS v4 styling system, Cinematic Minimalist UI hierarchy, and Mobile-First Responsive UI standards for zhiEnd Agent.
---

# zhiEnd Agent Architecture & Coding Standards

This skill documents the engineering guidelines, design system, and coding standards for **zhiEnd Agent**. Every component, API endpoint, and module must strictly follow these principles to maintain modularity, clean code, high readability, type safety, and UI consistency.

---

## 1. Tech Stack Overview

- **Frontend**: Svelte 5 + Vite (SPA) + TypeScript
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + Lucide Icons + Cinematic Minimalist design tokens
- **Backend**: Hono (`@hono/node-server`) in TypeScript
- **Real-Time Communication**: WebSocket / Socket.io server-client bridge
- **AI Core**: Google Antigravity CLI (`agy.exe`) runner with stream-json parsing
- **Remote Integrations**:
  - WhatsApp: `@whiskeysockets/baileys` Multi-Device
  - Telegram: `telegraf` polling
  - Remote Tunnel: `localtunnel` / Cloudflare Quick Tunnel

---

## 2. Project Directory & Workspace Standards

1. **Default Works Directory**:
   - The default project workspace root is `D:\Works`.
   - The system must automatically scan all projects and subdirectories inside `D:\Works` up to depth 2 (detecting Git repos, `package.json`, or root project folders).
   - When creating a new project via UI, the default target path must be `D:\Works\<project-name>`, automatically creating the directory and initializing git if requested.
   - Manual path input must always remain available for directories outside drive `D:\`.

---

## 3. UI Design System & Strict Color Hierarchy (Cinematic Minimalist)

To avoid dull, monochrome looks while preventing random or inconsistent colors, all UI elements must adhere to this hierarchy:

### A. Color Hierarchy Tokens

1. **Primary (Brand & Main Actions)**:
   - **Gradient**: `from-indigo-500 via-indigo-600 to-violet-600`
   - **Text Accent**: `text-indigo-400` / `text-violet-400`
   - **Glow / Shadow**: `shadow-lg shadow-indigo-500/20`
   - **Usage**: Primary CTA buttons (Send, Push to GitHub, Create Project), active indicators, brand logo icon, focused borders.

2. **Secondary (Surfaces & Structural Elements)**:
   - **Canvas Background**: Deep Midnight Obsidian (`#08090d` / `bg-zinc-950`) with an ambient radial lighting mesh (`radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.12), transparent 70%)`).
   - **Cards & Panels**: Glass panels with subtle backdrop blur: `bg-zinc-900/60 backdrop-blur-xl border border-white/[0.07] hover:border-white/[0.14]`.
   - **Secondary Buttons**: `bg-zinc-800/60 hover:bg-zinc-700/70 border border-zinc-700/50 text-zinc-200`.

3. **Tertiary (Supporting Text & Dividers)**:
   - **Labels / Hints**: `text-zinc-400` and `text-zinc-500 font-mono`.
   - **Borders & Dividers**: `border-zinc-800/60`.

4. **Semantic Status Colors (Strict)**:
   - **Success / Clean / Synced**: Emerald (`text-emerald-400`, `bg-emerald-500/10`, `border-emerald-500/25`).
   - **In-Progress / Busy / Untracked**: Amber (`text-amber-400`, `bg-amber-500/10`, `border-amber-500/25`).
   - **Danger / Destructive / Cancel**: Rose (`text-rose-400`, `bg-rose-500/10`, `border-rose-500/25`).
   - **Info / Branch / Remote Link**: Sky (`text-sky-400`, `bg-sky-500/10`, `border-sky-500/25`).

### B. Cinematic Aesthetics Rules
- **Hero Headlines**: Use gradient text clipping `bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent font-bold`.
- **Card Ambient Elevation**: Use subtle gradient borders and inset highlights rather than flat gray rectangles.
- **Action Buttons**: Important primary action buttons must have a cinematic gradient fill with active press animations (`active:scale-95 transition-all`).

---

## 4. TypeScript & Architecture Guidelines

1. **Strict Type Safety**:
   - Declare explicit types in `server/types.ts` and `src/types/index.ts`. No untyped objects or implicit `any`.
2. **Svelte 5 Runes**:
   - Use `$state()` for reactive data.
   - Use `$derived()` for computed values.
   - Use `$effect()` for DOM side-effects.
3. **Hono Route Organization**:
   - Modular routes, JSON envelope consistency, and security PIN validation middleware on `/api/*`.
4. **Hierarchical Tree Patterns**:
   - Folders and workspaces must be organized hierarchically with parents (`D:\Works\Parent`) and child subfolders (`├── child-a`, `└── child-b`), both individually selectable.
5. **No Native OS Select Form Elements**:
   - Never use ugly native `<select>` / `<option>` elements. Use custom floating popover dropdowns with glassmorphism (`backdrop-blur-2xl`), badge pills, active indicators, and click-outside dismissal.
6. **Strict Prohibition of Native Browser Dialogs (`alert`, `confirm`, `prompt`)**:
   - **NEVER** use browser-native `alert()`, `confirm()`, or `prompt()` popups. They break the immersive Cinematic Minimalist aesthetic and degrade user experience (e.g. intrusive "localhost:5173 says" boxes).
   - **Always Use Custom UI Modals via Universal Dialog Service (`src/services/dialog.svelte.ts`)**:
     - **Action Confirmations**: Use `dialog.showConfirm({ title, message, confirmText, cancelText, variant: 'danger' | 'warning' | 'primary', action })` paired with `ConfirmModal.svelte`.
     - **Success Information**: Use `dialog.showSuccess(message, title?)` with glowing Emerald accents (`CheckCircle2`, gradient emerald CTA).
     - **Error / Failure Information**: Use `dialog.showError(message, title?)` with glowing Rose accents (`AlertCircle`, gradient rose CTA).
     - **Warning Information**: Use `dialog.showWarning(message, title?)` with glowing Amber accents (`AlertTriangle`, gradient amber CTA).
     - **General Notice / Info**: Use `dialog.showInfo(message, title?)` with glowing Indigo/Sky accents (`Info`, gradient indigo CTA).
   - Every modal dialog must provide backdrop glassmorphism (`bg-black/80 backdrop-blur-md`), ambient obsidian card surface (`bg-zinc-900/95 border border-white/[0.08] shadow-2xl`), smooth zoom-in transitions, and keyboard accessibility (`Enter` to confirm/close, `Escape` to dismiss).

---

## 5. Mobile-First & Fully Responsive UI Standards (Mandatory)

Semua halaman dan komponen web UI di zhiEnd Agent **WAJIB** ramah pengguna mobile (smartphone/tablet) dan responsif penuh di berbagai ukuran layar (dari 320px hingga 4K desktop). DILARANG KERAS membuat UI yang hanya optimal di layar lebar laptop/desktop dan hancur di HP.

### A. Core Mobile Responsiveness Rules

1. **Zero Horizontal Viewport Overflow (`overflow-x-hidden`)**:
   - Tidak boleh ada elemen, tabel, kartu, atau teks kode yang meluber keluar layar (`body` atau container horizontal tidak boleh goyang/bisa di-scroll ke samping).
   - Selalu gunakan `w-full max-w-full overflow-hidden` pada container utama dan `overflow-x-auto` khusus untuk kontainer tabel atau blok kode (`pre/code`) dengan touch inertia scrolling (`-webkit-overflow-scrolling: touch`).

2. **Adaptive App Shell & Navigation Layout**:
   - **Desktop (`md:` / `lg:`)**: Sidebar samping persisten atau semi-collapsible, breadcrumb horizontal lengkap, tombol aksi sejajar (inline).
   - **Mobile (`< md:`)**:
     - Sidebar harus berubah menjadi **Off-Canvas Drawer** (slide-over dari kiri/kanan dengan tombol hamburger dan backdrop blur gelap) atau **Bottom Sheet Navigation**.
     - Tombol-tombol navigasi penting harus mudah dijangkau dengan ibu jari (thumb-zone friendly).
     - Grid layout wajib responsif: gunakan `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (jangan memaksakan `grid-cols-3` atau `grid-cols-4` di layar kecil).

3. **Touch Targets & Interactive Sizing**:
   - Semua tombol aksi, ikon interaktif, pill tag, toggle, dan opsi dropdown di layar HP **WAJIB** memiliki target sentuh minimal **44x44px** (atau padding minimal `p-2.5` / `p-3`, `min-h-[44px]`).
   - Hindari tombol-tombol mini yang berdempetan rapat sehingga rawan salah pencet di layar sentuh. Berikan jarak `gap-2` atau `gap-3`.

4. **Mobile Chat & Sticky Input Bar**:
   - Area input chat harus menempel rapi di bagian bawah viewport (`sticky bottom-0 pb-safe z-30`).
   - Perhitungkan virtual keyboard di mobile: input bar tidak boleh tertutup keyboard atau terlempar keluar layar.
   - Textarea input pesan di mobile harus otomatis menyesuaikan tinggi (`max-h-32 overflow-y-auto`) dengan tombol kirim yang jelas dan mudah diakses.

5. **Adaptive Modals & Popovers**:
   - Pada layar desktop, modal muncul di tengah dengan efek zoom.
   - Pada layar mobile (`< sm:`), modal harus otomatis beradaptasi menjadi **Bottom Sheet** (`fixed inset-x-0 bottom-0 rounded-t-2xl max-h-[90vh]`) atau **Full Screen Modal** dengan tombol tutup (X) yang jelas di pojok atas dan konten yang bisa di-scroll (`overflow-y-auto`).

6. **Typography & Spacing Fluidity**:
   - Gunakan ukuran teks responsif:
     - Judul: `text-xl sm:text-2xl lg:text-3xl font-bold`
     - Subtitle / Label: `text-xs sm:text-sm`
     - Body Text: `text-sm sm:text-base leading-relaxed`
   - Gunakan padding & margin adaptif: `p-3 sm:p-5 lg:p-6`, `gap-3 sm:gap-4 lg:gap-6`.

7. **Kewajiban Pengujian (Self-Audit)**:
   - Setiap kali membuat atau memodifikasi halaman / komponen UI, **WAJIB** membayangkan dan menguji tampilan pada resolusi layar mobile (375px / 390px / 414px) sebelum menyatakan tugas selesai.

---

## 6. Static Asset & Media Integrity over Public Tunnels & Proxies (Mandatory)

Ketika web app diakses melalui **Public Tunnel** (seperti `localtunnel` / `*.loca.lt`, Cloudflare Tunnel, dsb.) atau reverse proxy, seluruh aset statis (gambar, icon, favicon, font) harus dipastikan dapat dimuat secara utuh tanpa error broken image:

1. **Simpan Aset di Direktori `public/` (Bukan Hanya di `dist/`)**:
   - Seluruh gambar, logo, dan favicon **WAJIB** diletakkan di dalam folder `public/` (misal `public/img/logo.png`, `public/favicon.ico`).
   - Karena Vite build memiliki opsi `emptyOutDir: true`, setiap kali perintah `npm run build` dijalankan, folder `dist/` akan dihapus bersih lalu Vite menyalin ulang seluruh isi `public/` ke `dist/`. Jika aset hanya diletakkan di `dist/`, aset akan terhapus dan hilang saat build dijalankan.

2. **Gunakan URL-Safe Naming (Kebab-case / Tanpa Spasi)**:
   - Selalu gunakan nama file yang aman untuk URL web (contoh: `logo.png`, `zhiend-logo.png`, `favicon.png`).
   - Hindari nama file dengan spasi (seperti `zhiEnd Gradient Tech Logo.png`). Beberapa reverse proxy atau tunnel proxy di internet sering kali gagal mem-parse atau me-rewrite URL encoding (`%20`), sehingga browser gagal memuat gambar.

3. **Backend Static Middleware & Anti-HTML Fallback**:
   - Dalam arsitektur SPA (Single Page Application), backend server menyediakan catch-all route `app.get('*')` yang menyajikan `index.html`.
   - **Kritikal**: Server backend **WAJIB** mengecek dan menyajikan seluruh file statis (`/img/*`, `/favicon.ico`, `/assets/*`, `/uploads/*`, dsb.) dengan `Content-Type` biner yang tepat (`image/png`, `image/x-icon`, dsb.) dan `decodeURIComponent(path)` **SEBELUM** permintaan jatuh ke catch-all route `app.get('*')`.
   - Jangan pernah membiarkan request gambar yang tidak cocok jatuh ke `index.html` (text/html), karena browser akan menganggap gambar korup dan menampilkan icon broken image di UI serta favicon rusak di title bar browser.

4. **Verifikasi Pengujian Multi-Network**:
   - Setiap kali menambahkan gambar atau favicon baru, verifikasi bahwa aset dapat di-load secara sukses di tiga lingkungan: Localhost, IP LAN Wi-Fi, dan Public Tunnel (`loca.lt`).

---

## 7. AI Image Generation & Inline Visual Presentation Standards (Mandatory)

Ketika pengguna meminta AI untuk membuat gambar (*image generation* seperti Tokisaki Kurumi, ilustrasi konsep, mockup desain UI, diagram arsitektur, dsb.):

1. **Inline Visual Card, Bukan Sekadar Path Teks**:
   - DILARANG KERAS hanya menampilkan lokasi file teks mentah atau link `file:///...` yang tidak bisa dibuka browser karena batasan keamanan lokal (*browser security sandbox*).
   - Seluruh hasil generasi gambar **WAJIB** dirender langsung sebagai **Visual Image Card** interaktif di dalam bubble chat.

2. **Media Gateway Endpoint (`/api/media/file`)**:
   - Browser modern memblokir protokol `file:///` dari halaman HTTP/HTTPS (`Not allowed to load local resource`).
   - Sistem menggunakan backend gateway `/api/media/file?path=${encodeURIComponent(filePath)}` yang secara aman membaca file biner gambar dari folder artifact/workspace dan mengembalikannya dengan header MIME yang tepat (`image/png`, `image/jpeg`).
   - Untuk mengunduh, gateway mendukung query parameter `&download=1` yang memicu header `Content-Disposition: attachment; filename="..."`.

3. **Ultra-Clean Visual Presentation & Click-to-Download Ergonomics**:
   - **Tanpa Tombol Download Berlebih**: Di dalam bubble chat, kartu gambar dibuat bersih (*clean frame visual*) tanpa footer tombol download ungu yang menumpuk.
   - **Hapus Teks Lokasi File**: DILARANG KERAS menampilkan baris `📁 Lokasi File:` atau link path disk lokal yang merusak kerapian UI.
   - **Download saat Gambar Diklik**: Tombol download resolusi penuh disajikan secara terpusat dan elegan di dalam **Lightbox Modal** ketika pengguna mengklik gambar tersebut.

4. **Bot Integration (Telegram & WhatsApp)**:
   - Ketika AI menghasilkan gambar, bot Telegram & WhatsApp **WAJIB** mendeteksi file gambar di disk dan mengirimkan **FOTO ASLI** secara langsung (`ctx.replyWithPhoto({ source: path })` atau Baileys `sendMessage: image`) ke chat HP pengguna.
   - Bersihkan teks balasan bot dari teks teknis seperti `![caption](file:///...)` dan `📁 Lokasi File:`, sehingga pengguna di HP menerima foto yang jernih dengan caption yang natural.

5. **Anti-Double Image (Pemisahan Input User vs Output AI)**:
   - Array `task.images` HANYA diperuntukkan bagi lampiran yang diunggah oleh pengguna. Gambar hasil generasi AI wajib disimpan di properti terpisah `task.generatedImages` agar gambar tidak tersimpan ke bubble user dan tidak muncul ganda (*double*).




