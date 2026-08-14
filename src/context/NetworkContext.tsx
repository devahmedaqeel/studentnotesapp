import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { supabase } from '../services/supabase';

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

      // Ping Supabase or reliable endpoint
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://supabase.co'}/auth/v1/health`, {
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
    // If state.isConnected is not explicitly false, treat the device as online.
    // On Android, isInternetReachable is frequently delayed, null, or false on cellular networks.
    const connected = state.isConnected !== false;
    const isNowOnline = connected;

    setIsConnected(state.isConnected ?? true);
    setIsInternetReachable(state.isInternetReachable ?? true);
    setNetworkType(state.type || 'unknown');
    setNetworkStatus(isNowOnline ? 'online' : 'offline');
  }, []);

  useEffect(() => {
    // Initial fetch
    NetInfo.fetch().then(handleNetStateChange);

    // Event listener
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

    // On Android, NetInfo can report connected=true even when there's no actual internet.
    // Do a real reachability check to verify.
    const reachable = await verifyReachable();
    setNetworkStatus(reachable ? 'online' : 'offline');
    
    // If NetInfo says connected, trust it even if our ping failed
    // (the ping endpoint might be temporarily down but internet works)
    return connected;
  };

  const reconnectRealtime = async () => {
    try {
      supabase.realtime.connect();
    } catch {}
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
