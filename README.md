# II4021 Secure Chat Backend

Backend Hono untuk aplikasi chat terenkripsi. Server menangani autentikasi,
custom JWT, daftar kontak, penyimpanan pesan terenkripsi di Supabase, dan
pengiriman pesan secara real-time via WebSocket.
Operasi ECDH, HKDF, AES, dan dekripsi pesan tetap dilakukan di client.

## Tech Stack

- Bun
- Hono
- Supabase Postgres via Data REST API
- Node/Bun `crypto` untuk password hashing dan JWT ECDSA

## Setup Supabase

1. Buat project Supabase.
2. Buka SQL Editor.
3. Jalankan isi `supabase/schema.sql`.
4. Ambil `Project URL` dan `service_role` key dari Supabase dashboard.

Catatan: `service_role` hanya boleh dipakai di backend. Jangan kirim key ini ke
frontend.

## Environment

Salin `.env.example` menjadi `.env`, lalu isi:

```sh
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_PRIVATE_KEY_PEM=
JWT_PUBLIC_KEY_PEM=
JWT_ALG=ES256
JWT_ISSUER=ii4021-chat-backend
JWT_AUDIENCE=ii4021-chat-client
JWT_EXPIRES_IN_SECONDS=3600
PORT=3000
```

Jika `JWT_PRIVATE_KEY_PEM` dan `JWT_PUBLIC_KEY_PEM` kosong, server akan membuat
key pair sementara saat start. Untuk demo stabil, isi key PEM sendiri.

## Run

```sh
bun install
bun run dev
```

Server berjalan di `http://localhost:3000`.

## API

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

Register body:

```json
{
  "email": "alice@example.com",
  "password": "password-min-8",
  "publicKey": "base64/spki public key from client",
  "encryptedPrivateKey": "encrypted private key from client",
  "privateKeyIv": "iv",
  "kdfSalt": "salt",
  "keyAlgorithm": "ECDH-P-256",
  "keyMetadata": {}
}
```

Login mengembalikan JWT dan material private key terenkripsi milik user.

### Users

- `GET /users/contacts`
- `GET /users/:email/public-key`

Keduanya membutuhkan header:

```txt
Authorization: Bearer <jwt>
```

### Conversations

- `GET /conversations`

Endpoint ini membutuhkan header `Authorization: Bearer <jwt>` dan
mengembalikan daftar conversation milik user aktif. Conversation dibuat otomatis
saat user pertama kali mengirim pesan ke kontak tertentu.

### Messages

- `GET /messages/:contactEmail`
- `POST /messages`

Create message body:

```json
{
  "receiverEmail": "bob@example.com",
  "ciphertext": "encrypted payload",
  "iv": "message iv",
  "mac": "hmac-sha256 value",
  "algorithm": "AES-256-CTR"
}
```

Server hanya menyimpan ciphertext, IV, MAC, dan metadata. Plaintext tidak pernah
dikirim ke backend.

Varian AES-256 (CTR, CBC, dsb.) dan penggunaan MAC bersifat opsional dan
ditentukan oleh client. MAC dihitung dan diverifikasi di frontend karena backend
tidak memegang kunci komunikasi.

### WebSocket — Real-time Push

- `GET /ws?token=<jwt>`

Membuka koneksi WebSocket yang persisten untuk menerima pesan secara real-time.
Autentikasi menggunakan JWT yang sama dengan REST API, namun dikirim via query
parameter (browser `WebSocket` API tidak mendukung header kustom saat upgrade).

Setelah koneksi terbuka, server mengirimkan:

```json
{ "type": "connected", "email": "alice@example.com" }
```

Setiap kali ada pesan masuk dari pengguna lain, server mendorong:

```json
{
  "type": "new_message",
  "message": {
    "id": "...",
    "sender_email": "bob@example.com",
    "receiver_email": "alice@example.com",
    "ciphertext": "...",
    "iv": "...",
    "mac": "...",
    "algorithm": "AES-256-CTR",
    "timestamp": "2026-05-09T10:00:00.000Z"
  }
}
```

Client dapat mengirim heartbeat untuk menjaga koneksi tetap hidup:

```json
{ "type": "ping" }
```

Server akan membalas dengan `{ "type": "pong" }`.

Alur integrasi di frontend:

```
1. Login → terima JWT
2. Buka WS: new WebSocket(`ws://localhost:3000/ws?token=${jwt}`)
3. Dengarkan event "new_message" → dekripsi di client → tampilkan ke UI
4. Kirim pesan tetap via POST /messages (WS hanya untuk push ke penerima)
```
