"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Proxy = exports.ProxyProtocol = void 0;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const socks_1 = require("socks");
const tls = __importStar(require("tls"));
const tunnel = __importStar(require("tunnel"));
var ProxyProtocol;
(function (ProxyProtocol) {
    ProxyProtocol["HTTP"] = "http";
    ProxyProtocol["HTTPS"] = "https";
    ProxyProtocol["SOCKS4"] = "socks4";
    ProxyProtocol["SOCKS5"] = "socks5";
})(ProxyProtocol || (exports.ProxyProtocol = ProxyProtocol = {}));
const DEFAULT_TEST_URL = 'https://www.google.com';
const DEFAULT_ATTEMPTS = 3;
const DEFAULT_RETRY = 3;
const DEFAULT_CONNECT_TIMEOUT = 5000;
const DEFAULT_RESPONSE_TIMEOUT = 10000;
class Proxy {
    constructor(options) {
        this.options = options;
    }
    async check(checkerOptions) {
        const defaultCheckerOptions = {
            url: DEFAULT_TEST_URL,
            attempts: DEFAULT_ATTEMPTS,
            retry: DEFAULT_RETRY,
            timeout: {
                connect: DEFAULT_CONNECT_TIMEOUT,
                response: DEFAULT_RESPONSE_TIMEOUT
            }
        };
        const mergedOptions = {
            ...defaultCheckerOptions,
            ...checkerOptions,
            timeout: {
                ...defaultCheckerOptions.timeout,
                ...checkerOptions === null || checkerOptions === void 0 ? void 0 : checkerOptions.timeout
            }
        };
        const connectionLatencies = [];
        const responseLatencies = [];
        let successfulConnections = 0;
        let successfulResponses = 0;
        for (let i = 0; i < mergedOptions.attempts; i++) {
            let attemptSuccess = false;
            let attemptRetries = 0;
            while (!attemptSuccess && attemptRetries <= mergedOptions.retry) {
                try {
                    const { connectionLatency, responseLatency } = await this.makeRequestThroughProxy(mergedOptions.url, mergedOptions.timeout);
                    connectionLatencies.push(connectionLatency);
                    responseLatencies.push(responseLatency);
                    successfulConnections++;
                    successfulResponses++;
                    attemptSuccess = true;
                }
                catch (err) {
                    attemptRetries++;
                    if (attemptRetries > mergedOptions.retry) {
                        connectionLatencies.push(Infinity);
                        responseLatencies.push(Infinity);
                    }
                }
            }
        }
        const validConnectionLatencies = connectionLatencies.filter((v) => v !== Infinity);
        const validResponseLatencies = responseLatencies.filter((v) => v !== Infinity);
        const connectionLatencyMin = Math.min(...validConnectionLatencies);
        const connectionLatencyMax = Math.max(...validConnectionLatencies);
        const connectionLatencyAvg = validConnectionLatencies.reduce((a, b) => a + b, 0) / validConnectionLatencies.length;
        const responseLatencyMin = Math.min(...validResponseLatencies);
        const responseLatencyMax = Math.max(...validResponseLatencies);
        const responseLatencyAvg = validResponseLatencies.reduce((a, b) => a + b, 0) / validResponseLatencies.length;
        const connectionQuality = successfulConnections === mergedOptions.attempts
            ? 'stable'
            : successfulConnections > 0
                ? 'unstable'
                : 'none';
        const responseQuality = successfulResponses === mergedOptions.attempts
            ? 'stable'
            : successfulResponses > 0
                ? 'unstable'
                : 'none';
        return {
            proxy: this.options,
            url: mergedOptions.url,
            connection: {
                quality: connectionQuality,
                latency: connectionLatencyAvg,
                latencyMin: connectionLatencyMin,
                latencyMax: connectionLatencyMax
            },
            response: {
                quality: responseQuality,
                latency: responseLatencyAvg,
                latencyMin: responseLatencyMin,
                latencyMax: responseLatencyMax
            }
        };
    }
    async makeRequestThroughProxy(url, timeoutOptions) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            let agent;
            const startTime = Date.now();
            let connectionLatency = 0;
            let responseLatency = 0;
            switch (this.options.protocol) {
                case ProxyProtocol.HTTP:
                    agent = isHttps
                        ? tunnel.httpsOverHttp({
                            proxy: {
                                host: this.options.host,
                                port: this.options.port,
                                proxyAuth: this.options.auth
                                    ? `${this.options.auth.username}:${this.options.auth.password}`
                                    : undefined
                            }
                        })
                        : tunnel.httpOverHttp({
                            proxy: {
                                host: this.options.host,
                                port: this.options.port,
                                proxyAuth: this.options.auth
                                    ? `${this.options.auth.username}:${this.options.auth.password}`
                                    : undefined
                            }
                        });
                    break;
                case ProxyProtocol.HTTPS:
                    agent = isHttps
                        ? tunnel.httpsOverHttps({
                            proxy: {
                                host: this.options.host,
                                port: this.options.port,
                                proxyAuth: this.options.auth
                                    ? `${this.options.auth.username}:${this.options.auth.password}`
                                    : undefined
                            }
                        })
                        : tunnel.httpOverHttps({
                            proxy: {
                                host: this.options.host,
                                port: this.options.port,
                                proxyAuth: this.options.auth
                                    ? `${this.options.auth.username}:${this.options.auth.password}`
                                    : undefined
                            }
                        });
                    break;
                case ProxyProtocol.SOCKS4:
                case ProxyProtocol.SOCKS5:
                    return this.makeRequestThroughSocksProxy(url, timeoutOptions)
                        .then(resolve)
                        .catch(reject);
                default:
                    return reject(new Error('Unsupported proxy protocol'));
            }
            const requestOptions = {
                method: 'GET',
                host: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                agent: agent,
                timeout: timeoutOptions.response,
                headers: {
                    'User-Agent': 'NodeJS Proxy Checker'
                }
            };
            const req = (isHttps ? https : http).request(requestOptions, (res) => {
                responseLatency = Date.now() - startTime;
                res.on('data', () => {
                    /* Consume data */
                });
                res.on('end', () => {
                    resolve({ connectionLatency: responseLatency, responseLatency: responseLatency });
                });
            });
            req.on('socket', (socket) => {
                socket.on('connect', () => {
                    connectionLatency = Date.now() - startTime;
                });
            });
            req.on('error', (err) => {
                reject(err);
            });
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            req.end();
        });
    }
    async makeRequestThroughSocksProxy(url, timeoutOptions) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const socksProxyOptions = {
                proxy: {
                    host: this.options.host,
                    port: this.options.port,
                    type: this.options.protocol === ProxyProtocol.SOCKS4 ? 4 : 5,
                    userId: this.options.auth ? this.options.auth.username : undefined,
                    password: this.options.auth ? this.options.auth.password : undefined
                },
                command: 'connect',
                destination: {
                    host: urlObj.hostname,
                    port: parseInt(urlObj.port) || (isHttps ? 443 : 80)
                },
                timeout: timeoutOptions.connect
            };
            const startTime = Date.now();
            let connectionLatency = 0;
            let responseLatency = 0;
            socks_1.SocksClient.createConnection(socksProxyOptions, (err, info) => {
                if (err) {
                    return reject(err);
                }
                connectionLatency = Date.now() - startTime;
                const socket = info.socket;
                socket.setTimeout(timeoutOptions.response || DEFAULT_RESPONSE_TIMEOUT);
                let requestSocket;
                if (isHttps) {
                    requestSocket = tls.connect({
                        socket: socket,
                        servername: urlObj.hostname
                    });
                }
                else {
                    requestSocket = socket;
                }
                const requestOptions = {
                    method: 'GET',
                    path: urlObj.pathname + urlObj.search,
                    headers: {
                        Host: urlObj.hostname,
                        'User-Agent': 'NodeJS Proxy Checker'
                    },
                    createConnection: () => requestSocket
                };
                const req = (isHttps ? https : http).request(requestOptions, (res) => {
                    responseLatency = Date.now() - startTime;
                    res.on('data', () => {
                        /* Consume data */
                    });
                    res.on('end', () => {
                        requestSocket.end();
                        resolve({ connectionLatency, responseLatency });
                    });
                });
                req.on('error', (err) => {
                    requestSocket.end();
                    reject(err);
                });
                req.end();
            });
        });
    }
}
exports.Proxy = Proxy;
