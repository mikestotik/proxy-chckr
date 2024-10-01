# Proxy Checker

Library for Node.js to check the functionality of proxy servers. Supports HTTP, HTTPS, SOCKS4, and SOCKS5 protocols.

## Features

- **Protocol Support**: HTTP, HTTPS, SOCKS4, SOCKS5
- **Latency Measurement**: Measures connection and response latencies
- **Quality Assessment**: Determines the quality of the proxy (`stable`, `unstable`, `none`)
- **Minimal Dependencies**: Uses minimal external libraries
- **TypeScript Support**: Written in TypeScript with type definitions included

## Installation

Install the package using npm:

```bash
npm install @mss/proxy-checker
```

## Usage

### Basic Example

Check an HTTP proxy with authentication:

```typescript
import { Proxy, ProxyOptions, ProxyProtocol } from '@mss/proxy-checker';

const options: ProxyOptions = {
  host: '45.93.15.173',
  port: 64490,
  protocol: ProxyProtocol.HTTP,
  auth: {
    username: 'username',
    password: 'password',
  },
};

const proxy = new Proxy(options);

(async () => {
  try {
    const result = await proxy.check();
    console.log('Proxy Check Result:', result);
  } catch (error) {
    console.error('Error checking proxy:', error);
  }
})();
```

### Example with Custom Checker Options

Customize the proxy check with specific options:

```typescript
import { Proxy, ProxyOptions, ProxyProtocol, ProxyCheckerOptions } from '@mss/proxy-checker';

const options: ProxyOptions = {
  host: '203.0.113.45',
  port: 8080,
  protocol: ProxyProtocol.HTTPS,
};

const checkerOptions: ProxyCheckerOptions = {
  url: 'https://www.example.com',
  attempts: 5,
  retry: 3,
  timeout: {
    connect: 3000,
    response: 5000,
  },
};

const proxy = new Proxy(options);

(async () => {
  try {
    const result = await proxy.check(checkerOptions);
    console.log('Custom Proxy Check Result:', result);
  } catch (error) {
    console.error('Error checking proxy:', error);
  }
})();
```

### Checking a SOCKS5 Proxy

Check a SOCKS5 proxy with authentication:

```typescript
import { Proxy, ProxyOptions, ProxyProtocol } from '@mss/proxy-checker';

const options: ProxyOptions = {
  host: '198.51.100.27',
  port: 1080,
  protocol: ProxyProtocol.SOCKS5,
  auth: {
    username: 'socksuser',
    password: 'sockspass',
  },
};

const proxy = new Proxy(options);

(async () => {
  try {
    const result = await proxy.check();
    console.log('SOCKS5 Proxy Check Result:', result);
  } catch (error) {
    console.error('Error checking proxy:', error);
  }
})();
```

### Checking Multiple Proxies

Check a list of proxies sequentially:

```typescript
import { Proxy, ProxyOptions, ProxyProtocol } from '@mss/proxy-checker';

const proxies: ProxyOptions[] = [
  {
    host: '45.91.15.172',
    port: 64390,
    protocol: ProxyProtocol.HTTP,
  },
  {
    host: '203.0.113.45',
    port: 8080,
    protocol: ProxyProtocol.HTTPS,
  },
  {
    host: '198.51.100.27',
    port: 1080,
    protocol: ProxyProtocol.SOCKS5,
    auth: {
      username: 'socksuser',
      password: 'sockspass',
    },
  },
];

(async () => {
  for (const proxyOptions of proxies) {
    const proxy = new Proxy(proxyOptions);
    try {
      const result = await proxy.check();
      console.log(`Proxy ${proxyOptions.host}:${proxyOptions.port} result:`, result);
    } catch (error) {
      console.error(`Error checking proxy ${proxyOptions.host}:${proxyOptions.port}:`, error);
    }
  }
})();
```

### Using Proxy Without Authentication

Check a proxy that does not require authentication:

```typescript
import { Proxy, ProxyOptions, ProxyProtocol } from '@mss/proxy-checker';

const options: ProxyOptions = {
  host: '192.0.2.10',
  port: 3128,
  protocol: ProxyProtocol.HTTP,
};

const proxy = new Proxy(options);

(async () => {
  try {
    const result = await proxy.check();
    console.log('Proxy Check Result:', result);
  } catch (error) {
    console.error('Error checking proxy:', error);
  }
})();
```

## API Reference

### Enums

#### `ProxyProtocol`

An enumeration of supported proxy protocols.

```typescript
export enum ProxyProtocol {
  HTTP = 'http',
  HTTPS = 'https',
  SOCKS4 = 'socks4',
  SOCKS5 = 'socks5',
}
```

### Interfaces

#### `ProxyOptions`

Options for configuring a proxy.

```typescript
export interface ProxyOptions {
  host: string;
  port: number;
  protocol: ProxyProtocol;
  auth?: ProxyAuthOptions;
}
```

- `host`: The proxy server hostname or IP address.
- `port`: The proxy server port.
- `protocol`: The proxy protocol (`http`, `https`, `socks4`, `socks5`).
- `auth` (optional): Authentication credentials.

#### `ProxyAuthOptions`

Authentication options for the proxy.

```typescript
export interface ProxyAuthOptions {
  username: string;
  password: string;
}
```

- `username`: The username for proxy authentication.
- `password`: The password for proxy authentication.

#### `ProxyCheckerOptions`

Options for the proxy checker.

```typescript
export interface ProxyCheckerOptions {
  url?: string; // Default: 'https://www.google.com'
  attempts?: number; // Default: 3
  retry?: number; // Default: 2
  timeout?: {
    connect?: number; // Default: 5000 (ms)
    response?: number; // Default: 10000 (ms)
  };
}
```

- `url` (optional): The URL to request through the proxy.
- `attempts` (optional): Number of requests to compute average response speed.
- `retry` (optional): Number of retries if a request fails.
- `timeout` (optional):
    - `connect` (optional): Maximum time to wait for connection in milliseconds.
    - `response` (optional): Maximum time to wait for response from the URL in milliseconds.

#### `ProxyCheckResult`

The result of the proxy check.

```typescript
export interface ProxyCheckResult {
  proxy: ProxyOptions;
  url: string;
  connection: {
    quality: 'stable' | 'unstable' | 'none';
    latency: number;
    latencyMin: number;
    latencyMax: number;
  };
  response: {
    quality: 'stable' | 'unstable' | 'none';
    latencyMin: number;
    latencyMax: number;
  };
}
```

- `proxy`: The proxy options used for the check.
- `url`: The URL that was requested.
- `connection`:
    - `quality`: Connection quality (`stable`, `unstable`, `none`).
    - `latency`: Average connection latency in milliseconds.
    - `latencyMin`: Minimum connection latency in milliseconds.
    - `latencyMax`: Maximum connection latency in milliseconds.
- `response`:
    - `quality`: Response quality (`stable`, `unstable`, `none`).
    - `latencyMin`: Minimum response latency in milliseconds.
    - `latencyMax`: Maximum response latency in milliseconds.

### Class `Proxy`

#### Constructor

```typescript
constructor(options: ProxyOptions)
```

Creates a new instance of the `Proxy` class.

- `options`: Proxy configuration options.

#### Methods

##### `check(checkerOptions?: ProxyCheckerOptions): Promise<ProxyCheckResult>`

Performs a check of the proxy's functionality.

- `checkerOptions` (optional): Options for the proxy checker.
- Returns a promise that resolves to a `ProxyCheckResult`.

## Error Handling

The `check` method may throw errors which should be handled using try/catch blocks.

```typescript
try {
  const result = await proxy.check();
  console.log(result);
} catch (error) {
  console.error('Error checking proxy:', error);
}
```

## TypeScript Support

This library is written in TypeScript and includes type definitions. It can be used seamlessly in TypeScript projects.

## Dependencies

- [socks](https://www.npmjs.com/package/socks): A SOCKS client module for Node.js.
- [tunnel](https://www.npmjs.com/package/tunnel): HTTP/HTTPS proxy tunneling agent.

## License

ISC License

```
ISC License

Copyright (c) 2024

Permission to use, copy, modify, and/or distribute this software
for any purpose with or without fee is hereby granted...
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/my-feature`).
3. Commit your changes (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature/my-feature`).
5. Open a Pull Request.

## Issues

If you encounter any issues or have suggestions, please open an issue on the [GitHub repository](https://github.com/mikestotik/proxy-checker/issues).

## Support

For support or questions, please contact [mikestotik@gmail.com](mailto:mikestotik@gmail.com).

## Acknowledgments

- Thanks to the developers of the `socks` and `tunnel` libraries for making proxy handling easier in Node.js.

---

**Note:** Replace `[2024]`, `Mike Stotik`, and `mikestotik@gmail.com` with your actual information. If you are publishing this package to npm, ensure that the `name`, `version`, `repository`, and other fields in your `package.json` are correctly set.