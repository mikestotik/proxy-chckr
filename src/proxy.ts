import * as http from 'http';
import * as https from 'https';
import * as net from 'net';
import { SocksClient } from 'socks';
import * as tls from 'tls';
import { DEFAULT_CONNECT_TIMEOUT, DEFAULT_USER_AGENT } from './const';
import { ProxyProtocol } from './typings';
import {
  ProxyCheckerOptions,
  ProxyCheckerTimeoutOptions,
  ProxyCheckResult,
  ProxyLatency,
  ProxyOptions
} from './typings';
import {
  calculateLatencyStats,
  createSocksConnectionOptions,
  createTunnelAgent,
  determineQuality,
  mergeOptions
} from './utilities';


export class Proxy {
  private readonly options: ProxyOptions;


  constructor(options: ProxyOptions) {
    this.options = options;
  }


  async check(options?: ProxyCheckerOptions): Promise<ProxyCheckResult> {
    const mergedOptions = mergeOptions(options);

    const connectLatencies: number[] = [];
    const responseLatencies: number[] = [];

    let successfulConnections = 0;
    let successfulResponses = 0;

    for (let i = 0; i < mergedOptions.attempts!; i++) {
      let attemptSuccess = false;
      let attemptRetries = 0;

      while (!attemptSuccess && attemptRetries <= mergedOptions.retry!) {
        try {
          const { connectionLatency, responseLatency } = await this.makeRequest(
            mergedOptions.url!,
            mergedOptions.timeout!
          );
          connectLatencies.push(connectionLatency);
          responseLatencies.push(responseLatency);

          successfulConnections++;
          successfulResponses++;

          attemptSuccess = true;
        } catch (err) {
          attemptRetries++;

          if (attemptRetries > mergedOptions.retry!) {
            connectLatencies.push(Infinity);
            responseLatencies.push(Infinity);
          }
        }
      }
    }
    const connectionStats = calculateLatencyStats(connectLatencies);
    const responseStats = calculateLatencyStats(responseLatencies);

    const connectionQuality = determineQuality(successfulConnections, mergedOptions.attempts!);
    const responseQuality = determineQuality(successfulResponses, mergedOptions.attempts!);

    return {
      proxy: this.options,
      url: mergedOptions.url!,
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


  private async makeRequest(url: string, timeout: ProxyCheckerTimeoutOptions): Promise<ProxyLatency> {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';

    switch (this.options.protocol) {
      case ProxyProtocol.HTTP:
      case ProxyProtocol.HTTPS:
        return this.makeHttpRequest(urlObj, isHttps, timeout);
      case ProxyProtocol.SOCKS4:
      case ProxyProtocol.SOCKS5:
        return this.makeSocksRequest(urlObj, isHttps, timeout);
      default:
        throw new Error('Unsupported proxy protocol');
    }
  }


  private makeHttpRequest(
    urlObj: URL,
    isHttps: boolean,
    timeout: ProxyCheckerTimeoutOptions
  ): Promise<ProxyLatency> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      let connectionLatency = 0;
      let responseLatency = 0;

      const agent = createTunnelAgent(this.options, isHttps);

      const requestOptions: http.RequestOptions = {
        method: 'GET',
        host: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        agent: agent,
        timeout: timeout.response,
        headers: {
          'User-Agent': DEFAULT_USER_AGENT
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


  private makeSocksRequest(
    urlObj: URL,
    isHttps: boolean,
    timeout: ProxyCheckerTimeoutOptions
  ): Promise<ProxyLatency> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const socksOptions = createSocksConnectionOptions(this.options, urlObj, timeout);

      SocksClient.createConnection(socksOptions, (err, info) => {
        if (err) {
          return reject(err);
        }
        const connectionLatency = Date.now() - startTime;

        const socket = info!.socket;
        socket.setTimeout(timeout.response || DEFAULT_CONNECT_TIMEOUT);

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
            'User-Agent': DEFAULT_USER_AGENT
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
