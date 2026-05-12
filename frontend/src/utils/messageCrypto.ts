import { encodeUtf8, decodeUtf8, arrayBufferToBase64, base64ToArrayBuffer } from './cryptoUtils';

export type EncryptedPayload = {
    ciphertext: string;
    iv: string;
    mac: string;
    algorithm: string;
    timestamp: string;
}

interface SessionKeys {
    aesKey: CryptoKey;
    hmacKey: CryptoKey;
}

const getSubtleCrypto = (): SubtleCrypto => {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
        throw new Error('Web Crypto API membutuhkan secure context. Gunakan HTTPS atau localhost.');
    }
    return subtle;
}

const getWebCrypto = (): Crypto => {
    if (!globalThis.crypto) {
        throw new Error('Web Crypto API tidak tersedia di browser ini.');
    }
    return globalThis.crypto;
}

const normalizeTimestampForMac = (timestamp: string): string => {
    const parsed = new Date(timestamp);
    return Number.isNaN(parsed.getTime()) ? timestamp : parsed.toISOString();
}

export async function deriveSessionKeys(privateKey: CryptoKey, contactKeyJwk: JsonWebKey, myEmail: string, contactEmail: string) : Promise<SessionKeys> {
    const subtle = getSubtleCrypto();
    const contactKey = await subtle.importKey('jwk', contactKeyJwk, { name: 'X25519' }, false, []);

    const sharedSecret = await subtle.deriveBits({ name: 'X25519', public: contactKey }, privateKey, 256);

    const emails = [myEmail.toLowerCase().trim(), contactEmail.toLowerCase().trim()].sort();

    const saltString = `${emails[0]}|${emails[1]}`;
    const salt = await subtle.digest('SHA-256', encodeUtf8(saltString));

    const info = encodeUtf8('ii4021-crypto-chat-v1');

    const baseKey = await subtle.importKey('raw', new Uint8Array(sharedSecret), 'HKDF', false, ['deriveBits']);

    const expandedBits = await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, baseKey, 512);

    const aesBytes = expandedBits.slice(0, 32);
    const hmacBytes = expandedBits.slice(32, 64);

    const aesKey = await subtle.importKey('raw', aesBytes, 'AES-CTR', false, ['encrypt', 'decrypt']);
    const hmacKey = await subtle.importKey('raw', hmacBytes, {  name:'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

    return { aesKey, hmacKey };
}

export async function encryptMessage(message: string, sessionKeys: SessionKeys, senderEmail: string, receiverEmail: string) : Promise<EncryptedPayload> {
    const subtle = getSubtleCrypto();
    const webCrypto = getWebCrypto();
    const iv = webCrypto.getRandomValues(new Uint8Array(16));
    const timestamp = new Date().toISOString();

    const ciphertextBuffer = await subtle.encrypt({ name: 'AES-CTR', counter: iv, length: 128 }, sessionKeys.aesKey, encodeUtf8(message));
    const ciphertext = arrayBufferToBase64(ciphertextBuffer);

    const ivB64 = arrayBufferToBase64(iv.buffer);
    const safeSender = senderEmail.toLowerCase().trim();
    const safeReceiver = receiverEmail.toLowerCase().trim();

    if (safeSender.includes('|') || safeReceiver.includes('|')) {
        throw new Error("Karakter tidak valid pada alamat email.");
    }

    const macInput = ['v1', 'AES-256-CTR', safeSender, safeReceiver, timestamp, ivB64, ciphertext].join('|');

    const mac = await subtle.sign({ name: 'HMAC', hash: 'SHA-256' }, sessionKeys.hmacKey, encodeUtf8(macInput));

    return { ciphertext, iv: ivB64, mac: arrayBufferToBase64(mac), algorithm: 'AES-256-CTR', timestamp };
}

export async function decryptMessage(payload: EncryptedPayload, sessionKeys: SessionKeys, expectedSender: string, expectedReceiver: string) : Promise<string> {
    const subtle = getSubtleCrypto();
    const safeSender = expectedSender.toLowerCase().trim();
    const safeReceiver = expectedReceiver.toLowerCase().trim();
    const normalizedTimestamp = normalizeTimestampForMac(payload.timestamp);

    const macInput = ['v1', payload.algorithm, safeSender, safeReceiver, normalizedTimestamp, payload.iv, payload.ciphertext].join('|');

    const isValidMac = await subtle.verify('HMAC', sessionKeys.hmacKey, base64ToArrayBuffer(payload.mac), encodeUtf8(macInput));

    if (!isValidMac) {
        throw new Error("Integritas Gagal: Pesan dimodifikasi atau salah konteks pengirim/penerima.");
    }

    const decryptedBuffer = await subtle.decrypt(
        { name: 'AES-CTR', counter: base64ToArrayBuffer(payload.iv), length: 128 },
        sessionKeys.aesKey,
        base64ToArrayBuffer(payload.ciphertext)
    );

    return decodeUtf8(decryptedBuffer);
}