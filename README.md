# Nama : Rahma Aulia Khoirunnisa 
# NPM : 714240057
# Kelas : 2B D4 Teknik Informatika
# Implementasi REST API Point of Sale (POS) dengan Integrasi Payment Gateway dan Notification Service

# POS Backend API

Backend sederhana untuk sistem Point of Sale (POS) menggunakan `Express`, `TypeScript`, `Prisma`, dan `MySQL/MariaDB`.

Project ini menyediakan fitur autentikasi user, manajemen produk, dan transaksi penjualan. Repository juga menyertakan koleksi Postman untuk pengujian endpoint API.

## Fitur

- Login dan register user
- Autentikasi menggunakan JWT
- Role user `admin` dan `cashier`
- CRUD produk
- Pencatatan transaksi penjualan
- Integrasi pembayaran Midtrans Snap
- Seed data user dan produk contoh
- Collection Postman untuk testing API

## Struktur Project

```text
tubes_pemrograman3/
|-- pos-backend/
|   |-- prisma/
|   |-- src/
|   |-- dist/
|   `-- package.json
|-- postman/
|-- .postman/
`-- README.md
```

## Teknologi yang Digunakan

- Node.js
- TypeScript
- Express
- Prisma
- MySQL / MariaDB
- JSON Web Token
- bcrypt

## Requirement

Sebelum menjalankan project, pastikan sudah tersedia:

- Node.js
- npm
- MySQL atau MariaDB

## Konfigurasi Environment

Buat file `.env` di folder `pos-backend` lalu isi seperti berikut:

Kalau ingin cepat, salin contoh dari `pos-backend/.env.example`.

```env
PORT=3000
DATABASE_URL="mysql://root:@localhost:3306/pos_backend"
JWT_SECRET="your_jwt_secret"
MIDTRANS_SERVER_KEY="your_midtrans_server_key"
MIDTRANS_CLIENT_KEY="your_midtrans_client_key"
MIDTRANS_IS_PRODUCTION=false
```

Keterangan:

- `PORT` adalah port server backend.
- `DATABASE_URL` adalah koneksi database MySQL/MariaDB.
- `JWT_SECRET` dipakai untuk generate dan verifikasi token login.
- `MIDTRANS_SERVER_KEY` dipakai backend untuk create payment, cek status, dan validasi webhook Midtrans.
- `MIDTRANS_CLIENT_KEY` dikembalikan di response create/retry payment untuk kebutuhan frontend Snap.
- `MIDTRANS_IS_PRODUCTION` isi `false` untuk sandbox dan `true` untuk production.
- `FONNTE_TOKEN` adalah token API WhatsApp dari dashboard Fonnte.
- `FONNTE_DEFAULT_TARGET` adalah nomor WhatsApp fallback jika `customerPhone` tidak dikirim di transaksi.

## Cara Menjalankan Project

Masuk ke folder backend:

```bash
cd pos-backend
```

Install dependency:

```bash
npm install
```

Generate Prisma client:

```bash
npm run prisma:generate
```

Jalankan migration database:

```bash
npm run prisma:migrate
```

Isi data awal:

```bash
npm run seed
```

Jalankan server development:

```bash
npm run dev
```

Jika berhasil, API akan berjalan di:

```text
http://localhost:3000
```

## Akun Default Hasil Seed

Perintah `npm run seed` akan membuat akun berikut:

- `admin / admin123`
- `cashier / cashier123`

Selain itu seed juga menambahkan beberapa produk contoh:

- Indomie
- Teh Botol
- Aqua
- Roti
- Kopi

## Endpoint Utama

### 1. Auth

Base path: `/api/auth`

- `POST /register` untuk mendaftarkan user baru
- `POST /login` untuk login dan mendapatkan token

Contoh body register:

```json
{
  "username": "kasirbaru",
  "password": "password123",
  "role": "cashier"
}
```

Catatan:

- `role` boleh diisi `admin` atau `cashier`
- jika `role` tidak diisi, default-nya `cashier`

Contoh body login:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

### 2. Products

Base path: `/api/products`

- `GET /` melihat semua produk
- `GET /:id` melihat detail produk
- `POST /` menambah produk
- `PUT /:id` mengubah produk
- `DELETE /:id` menghapus produk

Hak akses:

- `admin` dan `cashier` bisa melihat produk
- hanya `admin` yang bisa menambah, mengubah, dan menghapus produk

Contoh body tambah/update produk:

```json
{
  "name": "Susu UHT",
  "price": 6500,
  "stock": 25
}
```

### 3. Transactions

Base path: `/api/transactions`

- `POST /` membuat transaksi
- `GET /` melihat semua transaksi
- `GET /:id` melihat detail transaksi

Hak akses:

- `admin` dan `cashier` bisa mengakses endpoint transaksi

Contoh body create transaction:

```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2
    },
    {
      "productId": 2,
      "quantity": 1
    }
  ],
  "customerPhone": "081234567890"
}
```

### 4. Payments

Base path: `/api/payments`

- `POST /create/:transactionId` membuat Snap transaction Midtrans baru
- `GET /status/:transactionId` cek status payment ke Midtrans lalu sinkronkan status lokal
- `POST /retry/:transactionId` membuat ulang payment Midtrans jika payment sebelumnya sudah gagal/expire/cancel
- `POST /webhook` endpoint callback Midtrans

Hak akses:

- `admin` dan `cashier` bisa membuat payment, cek status, dan retry payment
- webhook Midtrans tidak memakai JWT, tetapi wajib `signature_key` valid

### 5. WhatsApp Notification

Notifikasi WhatsApp otomatis dikirim setelah webhook Midtrans sukses dan transaksi menjadi `paid`.

Pesan invoice sederhana yang dikirim:

```text
Invoice Pembayaran POS

Transaction ID: 12
Total Pembayaran: Rp25.000
Status Pembayaran: paid
Metode Pembayaran: bank_transfer

Pembayaran berhasil diproses. Terima kasih.
```

Contoh request API Fonnte yang dipakai backend:

```http
POST https://api.fonnte.com/send
Authorization: YOUR_FONNTE_TOKEN
Content-Type: application/x-www-form-urlencoded

target=628123456789&message=Invoice%20Pembayaran%20POS...
```

Contoh response JSON Fonnte:

```json
{
  "status": true,
  "detail": "success! message in queue",
  "id": ["80367170"],
  "process": "pending",
  "requestid": 2937124,
  "target": ["628123456789"]
}
```

Flow testing yang disarankan:

1. Buat transaksi dengan `customerPhone` atau siapkan `FONNTE_DEFAULT_TARGET`.
2. Jalankan `POST /api/payments/create/:transactionId`.
3. Simulasikan `POST /api/payments/webhook` dengan status `settlement`.
4. Cek log backend dan inbox WhatsApp tujuan.

Cara mendapatkan token Fonnte:

1. Login ke dashboard Fonnte.
2. Buka menu device.
3. Pilih device WhatsApp yang sudah terhubung.
4. Copy token API yang tersedia di device list.

Cara test WhatsApp terkirim:

1. Pastikan `FONNTE_TOKEN` dan nomor tujuan sudah diisi di `.env`.
2. Buat transaksi lalu jalankan webhook Midtrans sampai status menjadi `paid`.
3. Jika backend berhasil memanggil Fonnte, pesan invoice akan masuk ke nomor tujuan.
4. Jika gagal, cek log backend dan response Fonnte di terminal.

## Cara Menggunakan API

### 1. Jalankan backend

Pastikan server aktif dengan `npm run dev`.

### 2. Login untuk mendapatkan token

Kirim request ke:

```http
POST /api/auth/login
```

Jika berhasil, response akan mengandung token JWT.

### 3. Masukkan token ke header Authorization

Untuk endpoint yang dilindungi, gunakan format:

```http
Authorization: Bearer <token>
```

### 4. Akses endpoint sesuai role

- Gunakan akun `admin` untuk CRUD produk
- Gunakan akun `cashier` atau `admin` untuk transaksi

## Testing dengan Postman

Repository ini sudah memiliki folder `postman` dan `.postman` untuk membantu pengujian endpoint.

Langkah penggunaan:

1. Import file `postman/midtrans-flow.postman_collection.json` ke Postman.
2. Jalankan endpoint `login` terlebih dahulu.
3. Simpan token hasil login.
4. Tambahkan token ke header `Authorization` dengan format `Bearer <token>`.
5. Jalankan flow `Create Transaction -> Create Payment -> Check Payment Status`.
6. Gunakan `Retry Payment` jika payment sebelumnya gagal atau expired.
7. Untuk simulasi callback, isi variable collection `midtransServerKey` lalu jalankan `Midtrans Webhook Example`.

## Response Root API

Jika membuka endpoint root:

```http
GET /
```

Response:

```json
{
  "message": "POS API Running"
}
```

## Screenshot Testing

Dokumentasi testing sebelumnya:

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/0e3b5d6f-4826-47fb-8e4c-2ab6951a9b21" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/0ff17454-1fac-4ee5-b19b-da53c36307ca" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/a78cc5e9-8951-42e2-93d6-5f55eaffbf3b" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/575723d5-a541-408b-9506-59bbc902d23d" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/77e8097a-1b27-4b79-80bb-d099c980a20f" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/74e733f6-e2f0-4405-a0c4-8145166d087f" />
