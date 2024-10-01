"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionQuality = exports.ProxyProtocol = void 0;
var ProxyProtocol;
(function (ProxyProtocol) {
    ProxyProtocol["HTTP"] = "http";
    ProxyProtocol["HTTPS"] = "https";
    ProxyProtocol["SOCKS4"] = "socks4";
    ProxyProtocol["SOCKS5"] = "socks5";
})(ProxyProtocol || (exports.ProxyProtocol = ProxyProtocol = {}));
var ConnectionQuality;
(function (ConnectionQuality) {
    ConnectionQuality["Stable"] = "STABLE";
    ConnectionQuality["Unstable"] = "UNSTABLE";
    ConnectionQuality["None"] = "NONE";
})(ConnectionQuality || (exports.ConnectionQuality = ConnectionQuality = {}));
