import React, { createContext, useContext, useState } from 'react';

interface CryptoSession {
  myPrivateKey: CryptoKey | null;
  setMyPrivateKey: (key: CryptoKey) => void;
  clearSession: () => void;
}

const CryptoSessionContext = createContext<CryptoSession | null>(null);

export const CryptoSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [myPrivateKey, setMyPrivateKey] = useState<CryptoKey | null>(null);

  const clearSession = () => setMyPrivateKey(null);

  return (
    <CryptoSessionContext.Provider value={{ myPrivateKey, setMyPrivateKey, clearSession }}>
      {children}
    </CryptoSessionContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCryptoSession = () => {
  const context = useContext(CryptoSessionContext);
  if (!context) throw new Error('Must be used within CryptoSessionProvider');
  return context;
};