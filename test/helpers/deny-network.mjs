import { Socket } from 'node:net';
import tls from 'node:tls';

// Fail closed if an offline unit test accidentally reaches a real transport.
// Explicit injected fetchFn/reader fixtures remain usable; no response fallback.
const denied = () => { throw new Error('Network access is forbidden in offline unit tests'); };
Socket.prototype.connect = denied;
tls.connect = denied;
globalThis.fetch = async () => denied();
