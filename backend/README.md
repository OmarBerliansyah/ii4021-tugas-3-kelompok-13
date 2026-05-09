# II4021 Secure Chat Backend

Backend Hono untuk aplikasi chat terenkripsi. Server menangani autentikasi,
custom JWT, daftar kontak, dan penyimpanan pesan terenkripsi di Supabase.
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

Untuk menyesuaikan rancangan client-side crypto, pesan diasumsikan memakai
`AES-256-CTR` dan `HMAC-SHA256` dengan pola Encrypt-then-MAC. MAC dihitung dan
diverifikasi di frontend karena backend tidak memegang kunci komunikasi.
