/**
 * /browser/ws auth fence + downlink-only contract tests (Phase 2/5).
 *
 * isTrustedUpgrade / rejectWebSocketUpgrade unit cases, plus a real upgrade
 * over a throwaway node:http server: untrusted → raw 403 before negotiation;
 * a client message on a trusted socket → close(1008,"downlink only").
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { WebSocket } from "ws";
import { FilePaneWss, isTrustedUpgrade, rejectWebSocketUpgrade } from "../lib/ws-server.mjs";

function req(headers) { return { headers }; }

test("isTrustedUpgrade accepts loopback hosts + same/no origin", () => {
	for (const host of ["localhost:3080", "127.0.0.1:3080", "[::1]:3080", "localhost"]) {
		assert.equal(isTrustedUpgrade(req({ host })), true, `loopback ${host}`);
	}
	assert.equal(isTrustedUpgrade(req({ host: "localhost:3080", origin: "http://localhost:3080" })), true);
	assert.equal(isTrustedUpgrade(req({ host: "localhost:3080", "sec-fetch-site": "same-origin" })), true);
});

test("isTrustedUpgrade rejects non-loopback / cross-site / wrong-origin", () => {
	assert.equal(isTrustedUpgrade(req({ host: "evil.example.com" })), false, "non-loopback host");
	assert.equal(isTrustedUpgrade(req({ host: "localhost:3080", "sec-fetch-site": "cross-site" })), false);
	assert.equal(isTrustedUpgrade(req({ host: "localhost:3080", origin: "http://evil.example.com" })), false);
	assert.equal(isTrustedUpgrade(req({})), false, "missing host");
	assert.equal(isTrustedUpgrade(req({ host: "localhost:3080", origin: "not a url" })), false);
});

test("isTrustedUpgrade honors trustedHosts for non-loopback authorities", () => {
	assert.equal(isTrustedUpgrade(req({ host: "harness.internal:3080" }), ["harness.internal"]), true, "port-less trusted matches any port");
	assert.equal(isTrustedUpgrade(req({ host: "harness.internal:3081" }), ["harness.internal:3081"]), true, "exact port trusted");
	assert.equal(isTrustedUpgrade(req({ host: "harness.internal:3081" }), ["harness.internal:3080"]), false, "mismatched port");
	assert.equal(isTrustedUpgrade(req({ host: "harness.internal:3080" }), []), false, "not trusted without entry");
});

test("rejectWebSocketUpgrade writes a raw 403 with Connection: close", () => {
	let wrote = "";
	const socket = { end: (chunk) => { wrote = String(chunk); } };
	rejectWebSocketUpgrade(socket);
	assert.ok(wrote.startsWith("HTTP/1.1 403 Forbidden"));
	assert.ok(wrote.includes("Connection: close"));
	assert.ok(wrote.endsWith("forbidden"));
});

test("real upgrade: untrusted refused (403), trusted + message → close(1008)", async () => {
	const wss = new FilePaneWss({ trustedHosts: ["harness.internal"] });
	const server = createServer();
	server.on("upgrade", (req, socket, head) => wss.upgrade(req, socket, head));
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	const port = server.address().port;
	try {
		// Untrusted host → raw 403 (no handshake). The ws client's error code 1006
		// means the connection died before upgrade (no 101 Switching Protocols).
		const bad = new WebSocket(`ws://127.0.0.1:${port}/browser/ws`, { headers: { host: "evil.example.com" } });
		const badErr = await new Promise((r) => { bad.on("error", (e) => r(e)); bad.on("open", () => r(null)); });
		assert.ok(badErr, "untrusted upgrade refused");
		// Trusted (loopback) socket: opening works; a client message is answered
		// with close 1008 (downlink only).
		const good = new WebSocket(`ws://127.0.0.1:${port}/browser/ws`, { headers: { host: `127.0.0.1:${port}` } });
		await new Promise((r) => { good.on("open", r); good.on("error", () => r()); });
		const closed = await new Promise((r) => { good.on("close", (code, reason) => r({ code, reason: reason.toString() })); good.send("hello"); });
		assert.equal(closed.code, 1008);
		assert.match(closed.reason, /downlink only/);
	} finally {
		try { await wss.close(); } catch {}
		server.close();
	}
});