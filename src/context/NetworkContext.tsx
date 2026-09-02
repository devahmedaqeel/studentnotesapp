import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export type NetworkStatusType = 'online' | 'offline' | 'connecting';

export interface NetworkContextType {
  isOnline: boolean;
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  networkStatus: NetworkStatusType;
  networkType: string;
  checkConnection: () => Promise<boolean>;
  reconnectRealtime: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType>({} as NetworkContextType);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
  const [networkType, setNetworkType] = useState<string>('unknown');
  const [networkStatus, setNetworkStatus] = useState<NetworkStatusType>('online');

  const verifyReachable = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('https://www.google.com/generate_204', {
        method: 'GET',
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);
      const ok = Boolean(res && res.status < 500);
      return ok;
    } catch {
      return false;
    }
  }, []);

  const handleNetStateChange = useCallback((state: NetInfoState) => {
    const connected = state.isConnected !== false;
    const isNowOnline = connected;

    setIsConnected(state.isConnected ?? true);
    setIsInternetReachable(state.isInternetReachable ?? true);
    setNetworkType(state.type || 'unknown');
    setNetworkStatus(isNowOnline ? 'online' : 'offline');
  }, []);

  useEffect(() => {
    NetInfo.fetch().then(handleNetStateChange);
    const unsubscribe = NetInfo.addEventListener(handleNetStateChange);
    return () => {
      unsubscribe();
    };
  }, [handleNetStateChange]);

  const checkConnection = async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    const connected = state.isConnected !== false;

    if (!connected) {
      setNetworkStatus('offline');
      return false;
    }

    const reachable = await verifyReachable();
    setNetworkStatus(reachable ? 'online' : 'offline');
    return connected;
  };

  const reconnectRealtime = async () => {
    // Firebase handles automatic reconnection natively
  };

  const isOnline = networkStatus === 'online';

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isConnected,
        isInternetReachable,
        networkStatus,
        networkType,
        checkConnection,
        reconnectRealtime,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
