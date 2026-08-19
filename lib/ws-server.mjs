/**
 * dsh-file-pane / ws-server
 *
 * Browser WebSocket downlink for live file-watch signals, ported faithfully
 * from DSH's own `dsh-client-connection` WebSocketDownlinks pattern
 * (`isTrustedApiRequest` / `rejectWebSocketUpgrade`). Downlink-only: the
 * server never accepts a client message (close 1008), and it broadcasts only
 * workspace-relative `{kind,rel}` dirty tuples — never file contents.
 *
 * Auth fence (before any handshake):
 *   - Host must be loopback (localhost / 127/8 / [::1]) or a configured
 *     `trustedHosts` authority (exact host[:port] or port-less hostname).
 *   - `sec-fetch-site: cross-site` is refused.
 *   - A present `Origin` must be same-origin with the Host authority.
 * Anything else gets a raw HTTP/1.1 403 before protocol negotiation.
 */
import { WebSocketServer, WebSocket } from "ws";

/** localhost, [::1], or any IPv4 in 127/8 (WHATWG hostname, IPv6 bracketed). */
export function isLoopbackHostname(hostname) {
	if (hostname === "localhost" || hostname === "[::1]") return true;
	const parts = hostname.split(".");
	return parts.length === 4 && parts[0] === "127" && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}

function parseAuthority(authority) {
	try { return new URL(`http://${authority}`); } catch { return undefined; }
}

function canonicalAuthority(entry, entryUrl) {
	const port = entryUrl.port !== "" ? entryUrl.port : new URL(`https://${entry}`).port;
	return port === "" ? entryUrl.hostname : `${entryUrl.hostname}:${port}`;
}

/** Whether the request authority matches a `trustedHosts` entry (exact port or port-less hostname). */
export function isTrustedAuthority(hostUrl, trustedHosts) {
	return trustedHosts.some((entry) => {
		const entryUrl = parseAuthority(entry);
		if (entryUrl === undefined) return false;
		return canonicalAuthority(entry, entryUrl) === entryUrl.hostname
			? entryUrl.hostname === hostUrl.hostname
			: entryUrl.host === hostUrl.host;
	});
}

/** Decode a header value from a Node req or Headers-like object. */
function header(headers, name) {
	if (!headers) return undefined;
	if (headers instanceof Headers) return headers.get(name) ?? undefined;
	const v = headers[name];
	return typeof v === "string" ? v : undefined;
}

/**
 * Decide whether a WS upgrade request may proceed. Mirrors DSH's
 * isTrustedApiRequest: Host must be loopback/trusted, not cross-site, and a
 * present Origin must be same-origin.
 */
export function isTrustedUpgrade(req, trustedHosts = []) {
	const host = header(req.headers, "host");
	if (host === undefined) return false;
	const hostUrl = parseAuthority(host);
	if (hostUrl === undefined) return false;
	if (!isLoopbackHostname(hostUrl.hostname) && !isTrustedAuthority(hostUrl, trustedHosts)) return false;
	if (header(req.headers, "sec-fetch-site") === "cross-site") return false;
	const origin = header(req.headers, "origin");
	if (origin === undefined) return true;
	try { return new URL(origin).host === hostUrl.host; } catch { return false; }
}

/** Raw 403 before protocol negotiation (no handshake ever). */
export function rejectWebSocketUpgrade(socket) {
	socket.end([
		"HTTP/1.1 403 Forbidden",
		"Connection: close",
		"Content-Type: text/plain; charset=utf-8",
		"Content-Length: 9",
		"",
		"forbidden"
	].join("\r\n"));
}

/**
 * Downlink-only WebSocket server for /browser/ws. `onClient(ws)` is called
 * for every accepted socket (register into a client set); a client→server
 * message is answered with close(1008,"downlink only").
 */
export class FilePaneWss {
	constructor({ trustedHosts = [], onClient = () => {} } = {}) {
		this.trustedHosts = trustedHosts;
		this.onClient = onClient;
		this.server = new WebSocketServer({ noServer: true });
	}

	upgrade(req, socket, head) {
		if (!isTrustedUpgrade(req, this.trustedHosts)) {
			rejectWebSocketUpgrade(socket);
			return;
		}
		this.server.handleUpgrade(req, socket, head, (ws) => {
			ws.once("message", () => ws.close(1008, "downlink only")); // gate: downlink-only
			ws.once("close", () => this.onClient(ws, null));
			ws.once("error", () => { try { ws.close(); } catch {} });
			this.onClient(ws);
		});
	}

	broadcast(msg) {
		const frame = JSON.stringify(msg);
		for (const ws of this.server.clients) {
			if (ws.readyState === WebSocket.OPEN) ws.send(frame);
		}
	}

	close() {
		for (const ws of this.server.clients) { try { ws.terminate(); } catch {} }
		return new Promise((resolve) => this.server.close(() => resolve()));
	}
}