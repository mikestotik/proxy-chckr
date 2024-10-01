import { ConnectionQuality, ProxyProtocol } from './enums';


export interface ProxyLatency {
  connectionLatency: number;
  responseLatency: number;
}


export interface ConnectionInfo {
  quality: ConnectionQuality;
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