import { useState, useEffect, useRef, useCallback } from 'react';
import { deriveSessionKeys, encryptMessage, decryptMessage } from '../utils/messageCrypto';
import type { EncryptedPayload } from '../utils/messageCrypto';
import { useCryptoSession } from '../contexts/CryptoContext';
import { useToast } from '../contexts/useToast';
import { apiFetch, WS_BASE_URL } from '../lib/api';
import { getJWT } from '../services/auth';

interface Message {
  id: string;
  sender_email: string;
  receiver_email: string;
  ciphertext: string;
  iv: string;
  mac: string;
  algorithm: string;
  timestamp: string;
  text?: string;
  isLocked?: boolean;
  isInvalid?: boolean;
}

export const useSecureChat = (myEmail: string, contactEmail: string | null) => {
  const { myPrivateKey } = useCryptoSession();
  const { pushToast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSecuring, setIsSecuring] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionKeysRef = useRef<Awaited<ReturnType<typeof deriveSessionKeys>> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastReadyContactRef = useRef<string | null>(null);
  const invalidMessageToastShownRef = useRef(false);

  const lockMessage = useCallback((msg: Message): Message => {
    return {
      ...msg,
      text: 'Pesan terenkripsi. Login ulang untuk membaca isi pesan.',
      isLocked: true,
      isInvalid: false,
    };
  }, []);

  const decryptOne = useCallback(async (msg: Message): Promise<Message> => {
    if (!sessionKeysRef.current) return lockMessage(msg);
    try {
      const payload: EncryptedPayload = {
        ciphertext: msg.ciphertext,
        iv: msg.iv,
        mac: msg.mac,
        algorithm: msg.algorithm,
        timestamp: msg.timestamp,
      };
      const text = await decryptMessage(payload, sessionKeysRef.current, msg.sender_email, msg.receiver_email);
      return { ...msg, text, isInvalid: false };
    } catch {
      if (!invalidMessageToastShownRef.current) {
        invalidMessageToastShownRef.current = true;
        pushToast({
          variant: 'warning',
          title: 'Integritas pesan gagal',
          message: 'Verifikasi integritas gagal. Pesan ditandai tidak valid sebelum proses dekripsi.',
        });
      }
      return { ...msg, text: undefined, isInvalid: true };
    }
  }, [lockMessage, pushToast]);

  const openWebSocket = useCallback(() => {
    const jwt = getJWT();
    if (!jwt || !contactEmail) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(`${WS_BASE_URL}/ws?token=${jwt}`);
    wsRef.current = ws;

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data as string);

        if (data?.type !== 'new_message' || !data.message) return;

        const incoming: Message = data.message;

        const isRelevant =
          (incoming.sender_email === contactEmail && incoming.receiver_email === myEmail) ||
          (incoming.sender_email === myEmail && incoming.receiver_email === contactEmail);

        if (!isRelevant) return;

        const decrypted = await decryptOne(incoming);
        setMessages((prev) => {
          if (prev.some((m) => m.id === decrypted.id)) return prev;
          return [...prev, decrypted];
        });
      } 
      catch {
        return;
      }
    };

    ws.onerror = () => {
      return;
    };
  }, [contactEmail, myEmail, decryptOne]);

  useEffect(() => {
    if (!contactEmail) {
      sessionKeysRef.current = null;
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    if (!myPrivateKey) {
      sessionKeysRef.current = null;
      wsRef.current?.close();
      wsRef.current = null;

      const loadLockedHistory = async () => {
        setIsSecuring(true);
        setIsSessionReady(false);
        try {
          const { messages: history } = await apiFetch<{ messages: Message[] }>(
            `/messages/${contactEmail}`,
          );
          if (!history) return;
          setMessages(history.map(lockMessage));
          setError(
            'Sesi kripto lokal belum siap. Riwayat tetap terlihat, tetapi baca isi dan kirim pesan memerlukan login ulang.',
          );
        } catch {
          setMessages([]);
          setError('Sesi kripto lokal belum siap. Silakan login ulang untuk membuka percakapan aman.');
        } finally {
          setIsSecuring(false);
        }
      };

      loadLockedHistory();
      return;
    }

    let active = true;

    const establish = async () => {
      setIsSecuring(true);
      setIsSessionReady(false);
      setError(null);
      setMessages([]);
      invalidMessageToastShownRef.current = false;
      sessionKeysRef.current = null;

      try {
        const { user } = await apiFetch<{ user: { public_key: string } }>(
          `/users/${contactEmail}/public-key`
        );
        const contactJwk = JSON.parse(user.public_key) as JsonWebKey;

        if (contactJwk.kty !== 'OKP' || contactJwk.crv !== 'X25519') {
          throw new Error(
            `${contactEmail} was registered with an outdated key format. They need to re-register.`
          );
        }

        const keys = await deriveSessionKeys(myPrivateKey, contactJwk, myEmail, contactEmail);
        if (!active) return;
        sessionKeysRef.current = keys;

        const { messages: history } = await apiFetch<{ messages: Message[] }>(
          `/messages/${contactEmail}`
        );

        const decryptedHistory = await Promise.all(history.map(decryptOne));

        if (active) {
          setMessages(decryptedHistory);
          setIsSessionReady(true);
          setError(null);
          openWebSocket();
          if (lastReadyContactRef.current !== contactEmail) {
            lastReadyContactRef.current = contactEmail;
            pushToast({
              variant: 'success',
              title: 'Sesi terenkripsi siap',
              message: `Kanal aman dengan ${contactEmail} sudah aktif.`,
            });
          }
        }
      } 
      catch (err) {
        if (active) {
          setIsSessionReady(false);
          const rawMessage = err instanceof Error ? err.message : 'Gagal mengamankan sesi obrolan.';
          const friendlyMessage = rawMessage.toLowerCase().includes('not registered')
            ? `${contactEmail} belum online atau belum terdaftar. Tunggu sampai pengguna tersebut login.`
            : 'Sesi terenkripsi gagal disiapkan. Coba lagi beberapa saat.';
          setError(friendlyMessage);
          pushToast({
            variant: 'error',
            title: 'Sesi terenkripsi gagal',
            message: friendlyMessage,
          });
        }
      } 
      finally {
        if (active) setIsSecuring(false);
      }
    };

    establish();

    return () => {
      active = false;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [contactEmail, myPrivateKey, myEmail, decryptOne, openWebSocket, pushToast, lockMessage]);

  const sendMessage = async (text: string): Promise<void> => {
    if (!contactEmail || !sessionKeysRef.current) {
      setError('Sesi aman belum siap. Login ulang diperlukan untuk mengirim pesan baru.');
      pushToast({
        variant: 'warning',
        title: 'Login ulang diperlukan',
        message: 'Riwayat masih bisa dilihat, namun kirim pesan membutuhkan login ulang.',
      });
      throw new Error('Secure session is not ready');
    }

    try {
      const encryptedPayload = await encryptMessage(text, sessionKeysRef.current, myEmail, contactEmail);

      const { message: saved } = await apiFetch<{ message: Message }>('/messages', {
        method: 'POST',
        body: JSON.stringify({
          receiverEmail: contactEmail,
          ciphertext: encryptedPayload.ciphertext,
          iv: encryptedPayload.iv,
          mac: encryptedPayload.mac,
          algorithm: encryptedPayload.algorithm,
          timestamp: encryptedPayload.timestamp,
        }),
      });

      setMessages((prev) => [...prev, { ...saved, text, isInvalid: false }]);
    } 
    catch (err) {
      setError(err instanceof Error ? err.message : 'Pengiriman pesan gagal.');
      pushToast({
        variant: 'error',
        title: 'Gagal mengirim pesan',
        message: err instanceof Error ? err.message : 'Terjadi kendala saat mengirim pesan.',
      });
      throw err;
    }
  };

  return { messages, isSecuring, isSessionReady, error, sendMessage };
};
