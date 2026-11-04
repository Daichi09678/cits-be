# CITS Backend API (`cits-be`)

## Login Super Admin dan Admin biasa

Jalankan `bun run db:migrate:auth` untuk menyiapkan tabel autentikasi tanpa mengubah akun yang sudah ada.
Backend membaca Super Admin dari `admin_users` dan Admin biasa dari `internal_accounts`, yaitu tabel akun internal yang dipakai frontend.
Jika Super Admin sudah mengganti kata sandi melalui website, hash dari `admin_credentials` menjadi acuan. Admin biasa menggunakan hash scrypt atau SHA-256 lama yang tersimpan; akun nonaktif ditolak.

`POST http://localhost:3001/api/auth/login` — Body → raw → JSON:

```json
{
  "email": "EMAIL_AKUN_TERDAFTAR",
  "password": "PASSWORD_AKUN_TERSEBUT",
  "title": "Admin"
}
```

Ganti email dan password dengan kredensial akun yang sebenarnya. Pilihan `title` adalah `Super Admin` atau `Admin` (untuk admin biasa). Field ini opsional agar request lama tetap bekerja; jika tidak dikirim, jenis akun dideteksi dari database.
Pilihan title yang tidak cocok dengan akun menghasilkan 401, bukan menaikkan hak akses akun.
Respons sukses berisi `token` dan `user.title`, beserta `user.role`, `user.pageAccess`, dan `user.permissions`. Token backend berlaku 8 jam.
`GET /api/auth/me` dengan Bearer token mengembalikan data akun terkini; akun internal yang dinonaktifkan tidak bisa memakai token lamanya.

Admin biasa hanya bisa menggunakan API tim sesuai izin `team`: `view` untuk membaca, `create` untuk menambah, `edit` untuk mengubah, dan `delete` untuk menghapus. Izin tindakan juga membutuhkan `view`. Izin dicocokkan ulang dengan database setiap request. Akun yang berhasil login tetapi belum mendapat izin tim menerima 403; Super Admin dapat memberikan izin melalui pengelolaan akun internal di website.

Tes: `bun run test:auth`. Integrasi database lokal: PowerShell `$env:TEST_AUTH_API='1'`, lalu `bun run test:auth`. Untuk menguji server yang berjalan, tambahkan `$env:TEST_AUTH_BASE_URL='http://localhost:3001'`. Tes integrasi memakai akun sementara yang dibersihkan setelah tes.

## API Tim

Field opsional `teamName` menyimpan kelompok tim (maksimal 100 karakter; spasi awal/akhir dibuang).
Contoh: `"teamName": "Pengembangan Aplikasi"`. Field kosong atau tidak dikirim berarti anggota belum dikelompokkan.
GET mengembalikan nilai tersimpan; POST/PUT menerima field yang sama. PUT tetap mengganti seluruh data anggota,
jadi kirim kembali `teamName` ketika mempertahankan kelompoknya. Data lama tanpa field ini tetap didukung.

Jalankan `bun run db:migrate:team` sekali untuk menyiapkan tabel (aman dijalankan ulang; data lama dipertahankan), lalu `bun run dev`.
Tabel `team_members` menggunakan format JSONB yang sama dengan frontend. Kedua aplikasi harus memakai database yang sama agar perubahan terlihat di website.

| Method | URL lokal | Token admin |
| --- | --- | --- |
| GET | `http://localhost:3001/api/team` | Tidak; hanya anggota aktif yang ditampilkan di website |
| GET | `http://localhost:3001/api/team?admin=1` | Ya; semua anggota |
| GET | `http://localhost:3001/api/team/:id` | Ya |
| POST | `http://localhost:3001/api/team` | Ya |
| PUT | `http://localhost:3001/api/team/:id` | Ya |
| DELETE | `http://localhost:3001/api/team/:id` | Ya |

Login melalui `POST /api/auth/login` dengan JSON `{"email":"EMAIL_ADMIN","password":"PASSWORD_ADMIN"}`.
Gunakan nilai `token` dari respons di Postman Authorization → Bearer Token. Token login frontend port 3000 memakai format berbeda; gunakan login backend port 3001.

Untuk POST dan PUT, pilih Body → raw → JSON:

```json
{
  "name": "Anggota Uji Postman",
  "position": "Software Engineer",
  "photoUrl": null,
  "displayOrder": 1,
  "isActive": false,
  "showOnHomepage": false,
  "isDemo": true
}
```

POST mengembalikan 201 dan `data.id` yang dibuat server. Gunakan ID tersebut untuk GET detail, PUT, dan DELETE.
PUT mengganti seluruh data: `name` dan `position` wajib; field opsional yang tidak dikirim kembali ke default (`photoUrl: null`, `displayOrder: 0`, `isActive: true`, `showOnHomepage: true`, `isDemo: false`).
Foto menerima URL HTTP/HTTPS, path lokal seperti `/uploads/foto.webp`, atau data URL gambar yang valid.
Nama maksimal 120 karakter, jabatan maksimal 160 karakter, dan urutan angka bulat 0–9999.
Respons sukses berbentuk `{"success":true,"data":...}`; DELETE hanya mengembalikan success dan message.
Status error: 400 input tidak valid, 401 token tidak valid, 404 anggota tidak ditemukan, 422 tipe/field JSON tidak sesuai, 503 database tidak tersedia.

Swagger: `http://localhost:3001/swagger` (tag **Team**). OpenAPI: `http://localhost:3001/swagger/json`.
Tes dasar: `bun run test:team`. Tes integrasi dengan database lokal: PowerShell `$env:TEST_TEAM_API='1'`, lalu `bun run test:team`.
Tes integrasi membuat data sementara dan membersihkannya setelah pengujian; memerlukan satu akun admin backend yang sudah ada.

Backend service untuk portal CITS Indonesia berbasis Bun, Elysia.js, PostgreSQL, Redis, dan Drizzle ORM.

## Prasyarat
- [Bun](https://bun.com) runtime (v1.2+)
- [Docker & Docker Compose](https://www.docker.com/)

## Cara Menjalankan

1. **Jalankan Database (PostgreSQL & Redis) dengan Docker**:
   ```bash
   bun run docker:up
   # Atau langsung via docker compose:
   docker compose up -d
   ```

2. **Install dependensi**:
   ```bash
   bun install
   ```

3. **Konfigurasi Environment**:
   Salin `.env.example` ke `.env`:
   ```bash
   cp .env.example .env
   ```

4. **Jalankan Server Backend (Development)**:
   ```bash
   bun run dev
   ```
   Backend akan aktif di `http://localhost:3001` dengan dokumentasi Swagger di `http://localhost:3001/swagger`.
   Endpoint `GET /health` juga menguji koneksi PostgreSQL secara langsung dan mengembalikan HTTP 503 jika database tidak dapat diakses.

5. **Perintah Berguna Lainnya**:
   - `bun run docker:down` : Menghentikan container database
   - `bun run docker:logs` : Melihat log PostgreSQL & Redis
   - `bun run db:studio`   : Membuka Drizzle Studio GUI database
