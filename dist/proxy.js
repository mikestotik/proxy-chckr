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
exports.Proxy = void 0;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const socks_1 = require("socks");
const tls = __importStar(require("tls"));
const const_1 = require("./const");
const typings_1 = require("./typings");
const utilities_1 = require("./utilities");
class Proxy {
    constructor(options) {
        this.options = options;
    }
    async check(options) {
        const mergedOptions = (0, utilities_1.mergeOptions)(options);
        const connectLatencies = [];
        const responseLatencies = [];
        let successfulConnections = 0;
        let successfulResponses = 0;
        for (let i = 0; i < mergedOptions.attempts; i++) {
            let attemptSuccess = false;
            let attemptRetries = 0;
            while (!attemptSuccess && attemptRetries <= mergedOptions.retry) {
                try {
                    const { connectionLatency, responseLatency } = await this.makeRequest(mergedOptions.url, mergedOptions.timeout);
                    connectLatencies.push(connectionLatency);
                    responseLatencies.push(responseLatency);
                    successfulConnections++;
                    successfulResponses++;
                    attemptSuccess = true;
                }
                catch (err) {
                    attemptRetries++;
                    if (attemptRetries > mergedOptions.retry) {
                        connectLatencies.push(Infinity);
                        responseLatencies.push(Infinity);
                    }
                }
            }
        }
        const connectionStats = (0, utilities_1.calculateLatencyStats)(connectLatencies);
        const responseStats = (0, utilities_1.calculateLatencyStats)(responseLatencies);
        const connectionQuality = (0, utilities_1.determineQuality)(successfulConnections, mergedOptions.attempts);
        const responseQuality = (0, utilities_1.determineQuality)(successfulResponses, mergedOptions.attempts);
        return {
            proxy: this.options,
            url: mergedOptions.url,
            connection: {
                quality: connectionQuality,
                ...connectionStats
            },
            response: {
                quality: responseQuality,
                ...responseStats
            }
        };
    }
    async makeRequest(url, timeout) {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        switch (this.options.protocol) {
            case typings_1.ProxyProtocol.HTTP:
            case typings_1.ProxyProtocol.HTTPS:
                return this.makeHttpRequest(urlObj, isHttps, timeout);
            case typings_1.ProxyProtocol.SOCKS4:
            case typings_1.ProxyProtocol.SOCKS5:
                return this.makeSocksRequest(urlObj, isHttps, timeout);
            default:
                throw new Error('Unsupported proxy protocol');
        }
    }
    makeHttpRequest(urlObj, isHttps, timeout) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            let connectionLatency = 0;
            let responseLatency = 0;
            const agent = (0, utilities_1.createTunnelAgent)(this.options, isHttps);
            const requestOptions = {
                method: 'GET',
                host: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                agent: agent,
                timeout: timeout.response,
                headers: {
                    'User-Agent': const_1.DEFAULT_USER_AGENT
                }
            };
            const req = (isHttps ? https : http).request(requestOptions, (res) => {
                responseLatency = Date.now() - startTime;
                res.on('data', () => {
                    /* Consume data */
                });
                res.on('end', () => {
                    resolve({
                        connectionLatency,
                        responseLatency
                    });
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
    makeSocksRequest(urlObj, isHttps, timeout) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const socksOptions = (0, utilities_1.createSocksConnectionOptions)(this.options, urlObj, timeout);
            socks_1.SocksClient.createConnection(socksOptions, (err, info) => {
                if (err) {
                    return reject(err);
                }
                const connectionLatency = Date.now() - startTime;
                const socket = info.socket;
                socket.setTimeout(timeout.response || const_1.DEFAULT_CONNECT_TIMEOUT);
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
                        'User-Agent': const_1.DEFAULT_USER_AGENT
                    },
                    createConnection: () => requestSocket
                };
                const req = (isHttps ? https : http).request(requestOptions, (res) => {
                    const responseLatency = Date.now() - startTime;
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
            })
                .finally();
        });
    }
}
exports.Proxy = Proxy;
