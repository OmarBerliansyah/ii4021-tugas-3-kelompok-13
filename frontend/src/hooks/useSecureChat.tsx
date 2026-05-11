import { useState, useEffect, useRef, useCallback } from 'react';
import { deriveSessionKeys, encryptMessage, decryptMessage } from '../utils/messageCrypto';
import type { EncryptedPayload } from '../utils/messageCrypto';
import { useCryptoSession } from '../contexts/CryptoContext';
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
  isInvalid?: boolean;
}

export const useSecureChat = (myEmail: string, contactEmail: string | null) => {
  const { myPrivateKey } = useCryptoSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSecuring, setIsSecuring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionKeysRef = useRef<Awaited<ReturnType<typeof deriveSessionKeys>> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const decryptOne = useCallback(async (msg: Message): Promise<Message> => {
    if (!sessionKeysRef.current) return { ...msg, text: undefined, isInvalid: true };
    try {
      const payload: EncryptedPayload = {
        ciphertext: msg.ciphertext,
        iv: msg.iv,
        mac: msg.mac,
        algorithm: msg.algorithm,
      };
      const text = await decryptMessage(payload, sessionKeysRef.current);
      return { ...msg, text, isInvalid: false };
    } catch {
      return { ...msg, text: undefined, isInvalid: true };
    }
  }, []);

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
    if (!contactEmail || !myPrivateKey) return;

    let active = true;

    const establish = async () => {
      setIsSecuring(true);
      setError(null);
      setMessages([]);
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
          openWebSocket();
        }
      } 
      catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Gagal mengamankan sesi obrolan.');
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
  }, [contactEmail, myPrivateKey, myEmail, decryptOne, openWebSocket]);

  const sendMessage = async (text: string): Promise<void> => {
    if (!sessionKeysRef.current || !contactEmail) return;

    try {
      const encryptedPayload = await encryptMessage(text, sessionKeysRef.current);

      const { message: saved } = await apiFetch<{ message: Message }>('/messages', {
        method: 'POST',
        body: JSON.stringify({
          receiverEmail: contactEmail,
          ciphertext: encryptedPayload.ciphertext,
          iv: encryptedPayload.iv,
          mac: encryptedPayload.mac,
          algorithm: encryptedPayload.algorithm,
        }),
      });

      setMessages((prev) => [...prev, { ...saved, text, isInvalid: false }]);
    } 
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
      throw err;
    }
  };

  return { messages, isSecuring, error, sendMessage };
};