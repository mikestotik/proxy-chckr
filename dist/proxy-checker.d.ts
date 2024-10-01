export interface ProxyLatency {
    connectionLatency: number;
    responseLatency: number;
}
export declare enum ProxyProtocol {
    HTTP = "http",
    HTTPS = "https",
    SOCKS4 = "socks4",
    SOCKS5 = "socks5"
}
export interface ConnectionInfo {
    quality: 'stable' | 'unstable' | 'none';
    latency: number;
    latencyMin: number;
    latencyMax: number;
}
export interface ProxyCheckResult {
    proxy: ProxyOptions;
    url: string;
    connection: ConnectionInfo;
    response: ConnectionInfo;
}
export interface ProxyAuthOptions {
    username: string;
    password: string;
}
export interface ProxyOptions {
    host: string;
    port: number;
    protocol: ProxyProtocol;
    auth?: ProxyAuthOptions;
}
export interface ProxyCheckerTimeoutOptions {
    connect?: number;
    response?: number;
}
export interface ProxyCheckerOptions {
    url?: string;
    attempts?: number;
    retry?: number;
    timeout?: ProxyCheckerTimeoutOptions;
}
export declare class Proxy {
    private readonly options;
    constructor(options: ProxyOptions);
    check(checkerOptions?: ProxyCheckerOptions): Promise<ProxyCheckResult>;
    private makeRequestThroughProxy;
    private makeRequestThroughSocksProxy;
}
