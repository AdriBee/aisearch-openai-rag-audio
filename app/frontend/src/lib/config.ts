import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

const BACKEND_PORT = 8765;

function getHostFromExpoDev(): string | null {
  try {
    // Prefer hostUri from expo config if present
    const hostUri: string | undefined = (Constants as any)?.expoConfig?.hostUri;
    if (hostUri) {
      // hostUri like "192.168.1.5:8081"
      const [host] = hostUri.split(':');
      if (host) return host;
    }
  } catch {}

  try {
    // Fallback: parse from scriptURL
    const scriptURL: string | undefined = (NativeModules as any)?.SourceCode?.scriptURL;
    if (scriptURL && (scriptURL.startsWith('http://') || scriptURL.startsWith('https://') || scriptURL.startsWith('exp://'))) {
      // Normalize exp:// to http:// for URL parsing
      const normalized = scriptURL.replace('exp://', 'http://');
      // Use URL constructor safely
      if (typeof URL !== 'undefined') {
        const url = new URL(normalized);
        return url.hostname || null;
      } else {
        // Manual parsing fallback
        const match = normalized.match(/^https?:\/\/([^:\/]+)/);
        return match ? match[1] : null;
      }
    }
  } catch {}

  return null;
}

export function getApiBaseUrl(): string {
  // 1) Explicit env override
  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, '');

  // 2) Web: derive from window location
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { protocol, host } = window.location;
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return 'http://localhost:' + BACKEND_PORT;
    }
    return `${protocol}//${host}`;
  }

  // 3) Native dev: infer from Metro host
  const devHost = getHostFromExpoDev();
  if (devHost) {
    return `http://${devHost}:${BACKEND_PORT}`;
  }

  // 4) Emulator/simulator defaults
  if (Platform.OS === 'android') return 'http://10.0.2.2:' + BACKEND_PORT;
  return 'http://localhost:' + BACKEND_PORT;
}

export function getWsUrl(): string {
  // 1) Explicit env override
  const envWs = process.env.EXPO_PUBLIC_WS_URL;
  if (envWs) return envWs;

  // 2) Web: derive from window location
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return `ws://localhost:${BACKEND_PORT}/realtime`;
    }
    return `${protocol}//${host}/realtime`;
  }

  // 3) Native dev: infer from Metro host
  const devHost = getHostFromExpoDev();
  if (devHost) {
    return `ws://${devHost}:${BACKEND_PORT}/realtime`;
  }

  // 4) Emulator/simulator defaults
  if (Platform.OS === 'android') return `ws://10.0.2.2:${BACKEND_PORT}/realtime`;
  return `ws://localhost:${BACKEND_PORT}/realtime`;
}


