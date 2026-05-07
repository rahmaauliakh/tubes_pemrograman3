# Nama : Rahma Aulia Khoirunnisa 
# NPM : 714240057
# Kelas : 2B D4 Teknik Informatika

# POS Backend API

Backend sederhana untuk sistem Point of Sale (POS) menggunakan `Express`, `TypeScript`, `Prisma`, dan `MySQL/MariaDB`.

Project ini menyediakan fitur autentikasi user, manajemen produk, dan transaksi penjualan. Repository juga menyertakan koleksi Postman untuk pengujian endpoint API.

## Fitur

- Login dan register user
- Autentikasi menggunakan JWT
- Role user `admin` dan `cashier`
- CRUD produk
- Pencatatan transaksi penjualan
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

```env
PORT=3000
DATABASE_URL="mysql://root:@localhost:3306/pos_backend"
JWT_SECRET="your_jwt_secret"
```

Keterangan:

- `PORT` adalah port server backend.
- `DATABASE_URL` adalah koneksi database MySQL/MariaDB.
- `JWT_SECRET` dipakai untuk generate dan verifikasi token login.

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
  ]
}
```

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

1. Import collection/folder Postman dari repository ini ke Postman.
2. Jalankan endpoint `login` terlebih dahulu.
3. Simpan token hasil login.
4. Tambahkan token ke header `Authorization` dengan format `Bearer <token>`.
5. Lanjutkan pengujian endpoint produk dan transaksi.

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
