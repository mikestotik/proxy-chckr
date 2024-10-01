import { SocksClientOptions } from 'socks/typings/common/constants';
import * as tunnel from 'tunnel';
import {
  DEFAULT_ATTEMPTS,
  DEFAULT_CONNECT_TIMEOUT,
  DEFAULT_RESPONSE_TIMEOUT,
  DEFAULT_RETRY,
  DEFAULT_TEST_URL
} from './const';
import {
  ConnectionQuality,
  ProxyCheckerOptions,
  ProxyCheckerTimeoutOptions,
  ProxyOptions,
  ProxyProtocol
} from './typings';


export function mergeOptions(options?: ProxyCheckerOptions): ProxyCheckerOptions {
  const defaultOptions: ProxyCheckerOptions = {
    url: DEFAULT_TEST_URL,
    attempts: DEFAULT_ATTEMPTS,
    retry: DEFAULT_RETRY,
    timeout: {
      connect: DEFAULT_CONNECT_TIMEOUT,
      response: DEFAULT_RESPONSE_TIMEOUT
    }
  };

  return {
    ...defaultOptions,
    ...options,
    timeout: {
      ...defaultOptions.timeout,
      ...options?.timeout
    }
  };
}


export function calculateLatencyStats(latencies: number[]) {
  const validLatencies = latencies.filter((v) => v !== Infinity);
  const latencyMin = Math.min(...validLatencies);
  const latencyMax = Math.max(...validLatencies);
  const latencyAvg =
    validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length || Infinity;

  return {
    latency: latencyAvg,
    latencyMin: latencyMin,
    latencyMax: latencyMax
  };
}


export function determineQuality(successfulAttempts: number, totalAttempts: number) {
  if (successfulAttempts === totalAttempts) {
    return ConnectionQuality.Stable;
  } else if (successfulAttempts > 0) {
    return ConnectionQuality.Unstable;
  } else {
    return ConnectionQuality.None;
  }
}


export function createTunnelAgent(options: ProxyOptions, isHttps: boolean) {
  const proxyConfig = {
    host: options.host,
    port: options.port,
    proxyAuth: options.auth ? `${ options.auth.username }:${ options.auth.password }` : undefined
  };

  switch (options.protocol) {
    case ProxyProtocol.HTTP:
      return isHttps
        ? tunnel.httpsOverHttp({ proxy: proxyConfig })
        : tunnel.httpOverHttp({ proxy: proxyConfig });
    case ProxyProtocol.HTTPS:
      return isHttps
        ? tunnel.httpsOverHttps({ proxy: proxyConfig })
        : tunnel.httpOverHttps({ proxy: proxyConfig });
    default:
      throw new Error('Unsupported proxy protocol for tunnel agent');
  }
}


export function createSocksConnectionOptions(
  options: ProxyOptions,
  urlObj: URL,
  timeout: ProxyCheckerTimeoutOptions
): SocksClientOptions {
  const isHttps = urlObj.protocol === 'https:';
  return {
    proxy: {
      host: options.host,
      port: options.port,
      type: options.protocol === ProxyProtocol.SOCKS4 ? 4 : 5,
      userId: options.auth ? options.auth.username : undefined,
      password: options.auth ? options.auth.password : undefined
    },
    command: 'connect',
    destination: {
      host: urlObj.hostname,
      port: parseInt(urlObj.port) || (isHttps ? 443 : 80)
    },
    timeout: timeout.connect
  };
}
