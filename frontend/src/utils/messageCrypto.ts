import { encodeUtf8, decodeUtf8, arrayBufferToBase64, base64ToArrayBuffer } from './cryptoUtils';

export type EncryptedPayload = {
    ciphertext: string;
    iv: string;
    mac: string;
    algorithm: string;
}

interface SessionKeys {
    aesKey: CryptoKey;
    hmacKey: CryptoKey;
}

export async function deriveSessionKeys(privateKey: CryptoKey, contactKeyJwk: JsonWebKey, myEmail: string, contactEmail: string) : Promise<SessionKeys> {
    const contactKey = await crypto.subtle.importKey('jwk', contactKeyJwk, { name: 'X25519' }, false, []);

    const sharedSecret = await crypto.subtle.deriveBits({ name: 'X25519', public: contactKey }, privateKey, 256);

    const emails = [myEmail.toLowerCase(), contactEmail.toLowerCase()].sort();

    const saltString = `${emails[0]}|${emails[1]}`;
    const salt = await crypto.subtle.digest('SHA-256', encodeUtf8(saltString));

    const info = encodeUtf8('ii4021-crypto-chat-v1');

    const baseKey = await crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, ['deriveBits']);

    const expandedBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, baseKey, 512);

    const aesBytes = expandedBits.slice(0, 32);
    const hmacBytes = expandedBits.slice(32, 64);

    const aesKey = await crypto.subtle.importKey('raw', aesBytes, 'AES-CTR', false, ['encrypt', 'decrypt']);
    const hmacKey = await crypto.subtle.importKey('raw', hmacBytes, {  name:'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

    return { aesKey, hmacKey };
}

export async function encryptMessage(message: string, sessionKeys: SessionKeys) : Promise<EncryptedPayload> {
    const iv = crypto.getRandomValues(new Uint8Array(16));

    const ciphertextBuffer = await crypto.subtle.encrypt({ name: 'AES-CTR', counter: iv, length: 128 }, sessionKeys.aesKey, encodeUtf8(message));
    const ciphertext = arrayBufferToBase64(ciphertextBuffer);

    const ivB64 = arrayBufferToBase64(iv.buffer);
    const macInput = `AES-256-CTR.${ivB64}.${ciphertext}`;
    const mac = arrayBufferToBase64(await crypto.subtle.sign({ name: 'HMAC', hash: 'SHA-256' }, sessionKeys.hmacKey, encodeUtf8(macInput)));

    return { ciphertext, iv: ivB64, mac, algorithm: 'AES-256-CTR' };
    
}

export async function decryptMessage(payload: EncryptedPayload, sessionKeys: SessionKeys) : Promise<string> {
    const macInput = `${payload.algorithm}.${payload.iv}.${payload.ciphertext}`;

    const isValidMac = await crypto.subtle.verify('HMAC', sessionKeys.hmacKey, base64ToArrayBuffer(payload.mac), encodeUtf8(macInput));

    if (!isValidMac) {
        throw new Error("Integritas Tidak Valid: Verifikasi MAC gagal. Pesan telah dimanipulasi.");
    }

    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-CTR', counter: base64ToArrayBuffer(payload.iv), length: 128 },
        sessionKeys.aesKey,
        base64ToArrayBuffer(payload.ciphertext)
    );

    return decodeUtf8(decryptedBuffer);
}