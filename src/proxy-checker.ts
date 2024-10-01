import * as http from 'http';
import * as https from 'https';
import * as net from 'net';
import { SocksClient } from 'socks';
import { SocksClientOptions } from 'socks/typings/common/constants';
import * as tls from 'tls';
import * as tunnel from 'tunnel';


export interface ProxyLatency {
  connectionLatency: number;
  responseLatency: number;
}


export enum ProxyProtocol {
  HTTP = 'http',
  HTTPS = 'https',
  SOCKS4 = 'socks4',
  SOCKS5 = 'socks5',
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


const DEFAULT_TEST_URL = 'https://www.google.com';
const DEFAULT_ATTEMPTS = 3;
const DEFAULT_RETRY = 3;
const DEFAULT_CONNECT_TIMEOUT = 5000;
const DEFAULT_RESPONSE_TIMEOUT = 10000;


export class Proxy {

  private readonly options: ProxyOptions;


  constructor(options: ProxyOptions) {
    this.options = options;
  }


  async check(checkerOptions?: ProxyCheckerOptions): Promise<ProxyCheckResult> {
    const defaultCheckerOptions: ProxyCheckerOptions = {
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
        ...checkerOptions?.timeout
      }
    };

    const connectionLatencies: number[] = [];
    const responseLatencies: number[] = [];

    let successfulConnections = 0;
    let successfulResponses = 0;

    for (let i = 0; i < mergedOptions.attempts!; i++) {
      let attemptSuccess = false;
      let attemptRetries = 0;

      while (!attemptSuccess && attemptRetries <= mergedOptions.retry!) {
        try {
          const { connectionLatency, responseLatency } = await this.makeRequestThroughProxy(
            mergedOptions.url!,
            mergedOptions.timeout!
          );
          connectionLatencies.push(connectionLatency);
          responseLatencies.push(responseLatency);

          successfulConnections++;
          successfulResponses++;

          attemptSuccess = true;
        } catch (err) {
          attemptRetries++;

          if (attemptRetries > mergedOptions.retry!) {
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
    const connectionLatencyAvg =
      validConnectionLatencies.reduce((a, b) => a + b, 0) / validConnectionLatencies.length;

    const responseLatencyMin = Math.min(...validResponseLatencies);
    const responseLatencyMax = Math.max(...validResponseLatencies);
    const responseLatencyAvg =
      validResponseLatencies.reduce((a, b) => a + b, 0) / validResponseLatencies.length;

    const connectionQuality =
      successfulConnections === mergedOptions.attempts
        ? 'stable'
        : successfulConnections > 0
          ? 'unstable'
          : 'none';

    const responseQuality =
      successfulResponses === mergedOptions.attempts
        ? 'stable'
        : successfulResponses > 0
          ? 'unstable'
          : 'none';

    return {
      proxy: this.options,
      url: mergedOptions.url!,
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


  private async makeRequestThroughProxy(url: string, timeoutOptions: ProxyCheckerTimeoutOptions): Promise<ProxyLatency> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';

      let agent: http.Agent | https.Agent;

      const startTime = Date.now();
      let connectionLatency: number = 0;
      let responseLatency: number = 0;

      switch (this.options.protocol) {
        case ProxyProtocol.HTTP:
          agent = isHttps
            ? tunnel.httpsOverHttp({
              proxy: {
                host: this.options.host,
                port: this.options.port,
                proxyAuth: this.options.auth
                  ? `${ this.options.auth.username }:${ this.options.auth.password }`
                  : undefined
              }
            })
            : tunnel.httpOverHttp({
              proxy: {
                host: this.options.host,
                port: this.options.port,
                proxyAuth: this.options.auth
                  ? `${ this.options.auth.username }:${ this.options.auth.password }`
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
                  ? `${ this.options.auth.username }:${ this.options.auth.password }`
                  : undefined
              }
            })
            : tunnel.httpOverHttps({
              proxy: {
                host: this.options.host,
                port: this.options.port,
                proxyAuth: this.options.auth
                  ? `${ this.options.auth.username }:${ this.options.auth.password }`
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

      const requestOptions: http.RequestOptions = {
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


  private async makeRequestThroughSocksProxy(
    url: string,
    timeoutOptions: ProxyCheckerTimeoutOptions
  ): Promise<{ connectionLatency: number; responseLatency: number }> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';

      const socksProxyOptions: SocksClientOptions = {
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
      let connectionLatency: number = 0;
      let responseLatency: number = 0;

      SocksClient.createConnection(socksProxyOptions, (err, info) => {
        if (err) {
          return reject(err);
        }
        connectionLatency = Date.now() - startTime;

        const socket = info!.socket;
        socket.setTimeout(timeoutOptions.response || DEFAULT_RESPONSE_TIMEOUT);

        let requestSocket: net.Socket | tls.TLSSocket;

        if (isHttps) {
          requestSocket = tls.connect({
            socket: socket,
            servername: urlObj.hostname
          });
        } else {
          requestSocket = socket;
        }

        const requestOptions: http.RequestOptions = {
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
