import { describe, it, expect } from 'bun:test';
import { generateKeyPairSync, diffieHellman } from 'node:crypto';
import { encryptMessage, decryptMessage } from '../utils/messageCrypto';
import { encodeUtf8 } from '../utils/cryptoUtils';

async function buildSessionKeysFromSecret(
    sharedSecretBytes: Uint8Array,
    myEmail: string,
    contactEmail: string,
) {
    const emails = [myEmail.toLowerCase(), contactEmail.toLowerCase()].sort();
    const salt = await crypto.subtle.digest('SHA-256', encodeUtf8(`${emails[0]}|${emails[1]}`));
    const info = encodeUtf8('ii4021-crypto-chat-v1');

    const baseKey = await crypto.subtle.importKey('raw', new Uint8Array(sharedSecretBytes), 'HKDF', false, ['deriveBits']);
    const expandedBits = await crypto.subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt, info },
        baseKey,
        512,
    );

    const aesKey = await crypto.subtle.importKey('raw', expandedBits.slice(0, 32), 'AES-CTR', false, ['encrypt', 'decrypt']);
    const hmacKey = await crypto.subtle.importKey('raw', expandedBits.slice(32, 64), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

    return { aesKey, hmacKey };
}

const ALICE_EMAIL = 'alice@test.com';
const BOB_EMAIL = 'bob@test.com';

async function buildSharedFixture() {
    const aliceNodeKeys = generateKeyPairSync('x25519');
    const bobNodeKeys = generateKeyPairSync('x25519');

    const aliceSharedBytes = diffieHellman({ privateKey: aliceNodeKeys.privateKey, publicKey: bobNodeKeys.publicKey });
    const bobSharedBytes = diffieHellman({ privateKey: bobNodeKeys.privateKey, publicKey: aliceNodeKeys.publicKey });

    const aliceSession = await buildSessionKeysFromSecret(new Uint8Array(aliceSharedBytes), ALICE_EMAIL, BOB_EMAIL);
    const bobSession = await buildSessionKeysFromSecret(new Uint8Array(bobSharedBytes), BOB_EMAIL, ALICE_EMAIL);

    return { aliceNodeKeys, bobNodeKeys, aliceSharedBytes, bobSharedBytes, aliceSession, bobSession };
}

describe('ECDH Key Exchange & KDF', () => {
    it('Alice dan Bob menghasilkan shared secret yang identik dari sisi masing-masing', () => {
        const aliceKeys = generateKeyPairSync('x25519');
        const bobKeys = generateKeyPairSync('x25519');

        const aliceShared = diffieHellman({ privateKey: aliceKeys.privateKey, publicKey: bobKeys.publicKey });
        const bobShared = diffieHellman({ privateKey: bobKeys.privateKey, publicKey: aliceKeys.publicKey });

        expect(aliceShared.equals(bobShared)).toBe(true);
    });

    it('shared secret berhasil diturunkan menjadi kunci AES-256-CTR dan HMAC-SHA256', async () => {
        const { aliceSession } = await buildSharedFixture();

        expect(aliceSession.aesKey.type).toBe('secret');
        expect(aliceSession.aesKey.algorithm.name).toBe('AES-CTR');
        expect((aliceSession.aesKey.algorithm as AesKeyAlgorithm).length).toBe(256);

        expect(aliceSession.hmacKey.type).toBe('secret');
        expect(aliceSession.hmacKey.algorithm.name).toBe('HMAC');
        expect(aliceSession.hmacKey.usages).toContain('sign');
        expect(aliceSession.hmacKey.usages).toContain('verify');
    });

    it('session keys yang identik memungkinkan komunikasi dua arah', async () => {
        const { aliceSession, bobSession } = await buildSharedFixture();

        const msgAlice = 'Halo Bob, ini dari Alice!';
        const payloadAlice = await encryptMessage(msgAlice, aliceSession, ALICE_EMAIL, BOB_EMAIL);
        expect(await decryptMessage(payloadAlice, bobSession, ALICE_EMAIL, BOB_EMAIL)).toBe(msgAlice);

        const msgBob = 'Halo Alice, balasan dari Bob!';
        const payloadBob = await encryptMessage(msgBob, bobSession, BOB_EMAIL, ALICE_EMAIL);
        expect(await decryptMessage(payloadBob, aliceSession, BOB_EMAIL, ALICE_EMAIL)).toBe(msgBob);
    });
});

describe('Enkripsi dan Dekripsi Pesan', () => {
    it('pesan berhasil didekripsi menjadi plaintext dengan kunci yang benar', async () => {
        const { aliceSession, bobSession } = await buildSharedFixture();

        const plaintext = 'Pesan ini harus bisa dibaca Bob setelah dekripsi.';
        const payload = await encryptMessage(plaintext, aliceSession, ALICE_EMAIL, BOB_EMAIL);

        expect(payload.ciphertext).not.toBe(plaintext);
        expect(payload.iv).toBeDefined();
        expect(payload.mac).toBeDefined();
        expect(payload.timestamp).toBeDefined();
        expect(payload.algorithm).toBe('AES-256-CTR');

        const recovered = await decryptMessage(payload, bobSession, ALICE_EMAIL, BOB_EMAIL);
        expect(recovered).toBe(plaintext);
    });

    it('dekripsi gagal jika menggunakan kunci yang salah (MitM tidak dapat membaca)', async () => {
        const { aliceSession, bobNodeKeys } = await buildSharedFixture();

        const eveNodeKeys = generateKeyPairSync('x25519');
        const eveShared = diffieHellman({ privateKey: eveNodeKeys.privateKey, publicKey: bobNodeKeys.publicKey });
        const eveSession = await buildSessionKeysFromSecret(new Uint8Array(eveShared), ALICE_EMAIL, BOB_EMAIL);

        const payload = await encryptMessage('Rahasia Alice untuk Bob', aliceSession, ALICE_EMAIL, BOB_EMAIL);

        await expect(decryptMessage(payload, eveSession, ALICE_EMAIL, BOB_EMAIL)).rejects.toThrow(/Integritas Gagal/);
    });

    it('setiap pesan menghasilkan IV yang unik (mencegah nonce reuse)', async () => {
        const { aliceSession } = await buildSharedFixture();

        const payloads = await Promise.all(
            Array.from({ length: 5 }, () =>
                encryptMessage('pesan sama', aliceSession, ALICE_EMAIL, BOB_EMAIL),
            ),
        );

        const ivSet = new Set(payloads.map((p) => p.iv));
        expect(ivSet.size).toBe(5);
    });
});

describe('Integritas & Autentikasi Pesan (MAC)', () => {
    it('pesan dengan MAC valid diterima dan didekripsi dengan benar', async () => {
        const { aliceSession, bobSession } = await buildSharedFixture();

        const payload = await encryptMessage('Pesan valid dengan MAC benar', aliceSession, ALICE_EMAIL, BOB_EMAIL);
        const result = await decryptMessage(payload, bobSession, ALICE_EMAIL, BOB_EMAIL);

        expect(result).toBe('Pesan valid dengan MAC benar');
    });

    it('modifikasi ciphertext memicu kegagalan MAC sebelum dekripsi dilakukan', async () => {
        const { aliceSession, bobSession } = await buildSharedFixture();

        const payload = await encryptMessage('Isi pesan asli', aliceSession, ALICE_EMAIL, BOB_EMAIL);

        const tamperedCiphertext = payload.ciphertext.slice(0, -1) + (payload.ciphertext.endsWith('A') ? 'B' : 'A');
        const tampered = { ...payload, ciphertext: tamperedCiphertext };

        await expect(decryptMessage(tampered, bobSession, ALICE_EMAIL, BOB_EMAIL)).rejects.toThrow(/Integritas Gagal/);
    });

    it('modifikasi field MAC secara langsung ditolak', async () => {
        const { aliceSession, bobSession } = await buildSharedFixture();

        const payload = await encryptMessage('Pesan asli', aliceSession, ALICE_EMAIL, BOB_EMAIL);
        const tampered = { ...payload, mac: payload.mac.slice(0, -4) + 'AAAA' };

        await expect(decryptMessage(tampered, bobSession, ALICE_EMAIL, BOB_EMAIL)).rejects.toThrow(/Integritas Gagal/);
    });

    it('MAC mengikat konteks pengirim/penerima – swap sender-receiver ditolak', async () => {
        const { aliceSession, bobSession } = await buildSharedFixture();

        const payload = await encryptMessage('Pesan dari Alice ke Bob', aliceSession, ALICE_EMAIL, BOB_EMAIL);

        await expect(decryptMessage(payload, bobSession, BOB_EMAIL, ALICE_EMAIL)).rejects.toThrow(/Integritas Gagal/);
    });

    it('MAC mengikat timestamp - pemalsuan waktu kirim pesan ditolak', async () => {
        const { aliceSession, bobSession } = await buildSharedFixture();

        const payload = await encryptMessage('Pesan dengan timestamp terikat MAC', aliceSession, ALICE_EMAIL, BOB_EMAIL);
        const tampered = { ...payload, timestamp: '1970-01-01T00:00:00.000Z' };

        await expect(decryptMessage(tampered, bobSession, ALICE_EMAIL, BOB_EMAIL)).rejects.toThrow(/Integritas Gagal/);
    });

    it('timestamp ekuivalen dengan format offset tetap lolos validasi MAC', async () => {
        const { aliceSession, bobSession } = await buildSharedFixture();

        const payload = await encryptMessage('Pesan valid dengan timestamp yang dinormalisasi', aliceSession, ALICE_EMAIL, BOB_EMAIL);
        const normalizedToOffset = payload.timestamp.replace('Z', '+00:00');

        const recovered = await decryptMessage(
            { ...payload, timestamp: normalizedToOffset },
            bobSession,
            ALICE_EMAIL,
            BOB_EMAIL
        );

        expect(recovered).toBe('Pesan valid dengan timestamp yang dinormalisasi');
    });
});
