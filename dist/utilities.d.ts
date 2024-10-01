import { SocksClientOptions } from 'socks/typings/common/constants';
import { ConnectionQuality, ProxyCheckerOptions, ProxyCheckerTimeoutOptions, ProxyOptions } from './typings';
export declare function mergeOptions(options?: ProxyCheckerOptions): ProxyCheckerOptions;
export declare function calculateLatencyStats(latencies: number[]): {
    latency: number;
    latencyMin: number;
    latencyMax: number;
};
export declare function determineQuality(successfulAttempts: number, totalAttempts: number): ConnectionQuality;
export declare function createTunnelAgent(options: ProxyOptions, isHttps: boolean): import("http").Agent;
export declare function createSocksConnectionOptions(options: ProxyOptions, urlObj: URL, timeout: ProxyCheckerTimeoutOptions): SocksClientOptions;
