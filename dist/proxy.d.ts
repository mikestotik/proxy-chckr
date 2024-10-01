import { ProxyCheckerOptions, ProxyCheckResult, ProxyOptions } from './typings';
export declare class Proxy {
    private readonly options;
    constructor(options: ProxyOptions);
    check(options?: ProxyCheckerOptions): Promise<ProxyCheckResult>;
    private makeRequest;
    private makeHttpRequest;
    private makeSocksRequest;
}
