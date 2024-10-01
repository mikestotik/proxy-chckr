"use strict";
// utilities.ts
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
exports.mergeOptions = mergeOptions;
exports.calculateLatencyStats = calculateLatencyStats;
exports.determineQuality = determineQuality;
exports.createTunnelAgent = createTunnelAgent;
exports.createSocksConnectionOptions = createSocksConnectionOptions;
const tunnel = __importStar(require("tunnel"));
const const_1 = require("./const");
const enums_1 = require("./typings/enums");
function mergeOptions(options) {
    const defaultOptions = {
        url: const_1.DEFAULT_TEST_URL,
        attempts: const_1.DEFAULT_ATTEMPTS,
        retry: const_1.DEFAULT_RETRY,
        timeout: {
            connect: const_1.DEFAULT_CONNECT_TIMEOUT,
            response: const_1.DEFAULT_RESPONSE_TIMEOUT
        }
    };
    return {
        ...defaultOptions,
        ...options,
        timeout: {
            ...defaultOptions.timeout,
            ...options === null || options === void 0 ? void 0 : options.timeout
        }
    };
}
function calculateLatencyStats(latencies) {
    const validLatencies = latencies.filter((v) => v !== Infinity);
    const latencyMin = Math.min(...validLatencies);
    const latencyMax = Math.max(...validLatencies);
    const latencyAvg = validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length || Infinity;
    return {
        latency: latencyAvg,
        latencyMin: latencyMin,
        latencyMax: latencyMax
    };
}
function determineQuality(successfulAttempts, totalAttempts) {
    if (successfulAttempts === totalAttempts) {
        return enums_1.ConnectionQuality.Stable;
    }
    else if (successfulAttempts > 0) {
        return enums_1.ConnectionQuality.Unstable;
    }
    else {
        return enums_1.ConnectionQuality.None;
    }
}
function createTunnelAgent(options, isHttps) {
    const proxyConfig = {
        host: options.host,
        port: options.port,
        proxyAuth: options.auth ? `${options.auth.username}:${options.auth.password}` : undefined
    };
    switch (options.protocol) {
        case enums_1.ProxyProtocol.HTTP:
            return isHttps
                ? tunnel.httpsOverHttp({ proxy: proxyConfig })
                : tunnel.httpOverHttp({ proxy: proxyConfig });
        case enums_1.ProxyProtocol.HTTPS:
            return isHttps
                ? tunnel.httpsOverHttps({ proxy: proxyConfig })
                : tunnel.httpOverHttps({ proxy: proxyConfig });
        default:
            throw new Error('Unsupported proxy protocol for tunnel agent');
    }
}
function createSocksConnectionOptions(options, urlObj, timeout) {
    const isHttps = urlObj.protocol === 'https:';
    return {
        proxy: {
            host: options.host,
            port: options.port,
            type: options.protocol === enums_1.ProxyProtocol.SOCKS4 ? 4 : 5,
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
