/**
 * Live group room (ADR 0004, ADR 0017). One object per group, reached only through the Worker route
 * `GET /api/v1/groups/{id}/live`, which has already checked sign-in and membership.
 *
 * Privacy rules:
 * - Everything lives in the `peers` map in memory. Never call the storage API, never use the
 *   hibernation API or WebSocket attachments, never set alarms, never log coordinates or names.
 * - A member's position exists only while they share and stay connected; it is dropped on "stop",
 *   on disconnect, when they leave the group, and is hidden from others after POSITION_TTL_MS.
 * - Positions are rounded to 5 decimals (about 1 m) and sent only to members of this group.
 */

export const POSITION_TTL_MS = 2 * 60 * 1000;
export const MIN_UPDATE_INTERVAL_MS = 3000;
export const MAX_CONNECTIONS = 20;
export const MAX_MESSAGE_CHARS = 200;
const HANDLE = /^[a-f0-9]{16}$/;
const MAX_NAME = 20;

interface Position {
  readonly lat: number;
  readonly lng: number;
  readonly acc: number;
  readonly at: number;
}

interface Peer {
  readonly handle: string;
  readonly name: string;
  readonly role: 'owner' | 'member';
  pos: Position | null;
  lastUpdate: number;
}

const round = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

/** Parses one client message. Returns null for anything that is not exactly a valid message. */
export function parseMessage(
  raw: unknown,
): { readonly t: 'stop' } | { readonly t: 'pos'; lat: number; lng: number; acc: number } | null {
  if (typeof raw !== 'string' || raw.length > MAX_MESSAGE_CHARS) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const keys = Object.keys(body).sort().join(',');
  if (body['t'] === 'stop' && keys === 't') return { t: 'stop' };
  if (body['t'] !== 'pos' || keys !== 'acc,lat,lng,t') return null;
  const { lat, lng, acc } = body;
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    typeof acc !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !Number.isFinite(acc) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180 ||
    acc <= 0 ||
    acc > 10_000
  ) {
    return null;
  }
  return { t: 'pos', lat: round(lat, 5), lng: round(lng, 5), acc: Math.round(acc) };
}

function cleanName(raw: string | null): string {
  const first = (raw ?? '').trim().split(/\s+/)[0] ?? '';
  return first.slice(0, MAX_NAME);
}

export class GroupLocation implements DurableObject {
  private readonly peers = new Map<WebSocket, Peer>();
  private readonly now: () => number;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_ctx: DurableObjectState, _env: unknown) {
    this.now = () => Date.now();
  }

  fetch(request: Request): Response {
    const { pathname } = new URL(request.url);
    const handle = request.headers.get('X-PM-Member') ?? '';
    if (!HANDLE.test(handle)) return new Response('Bad Request', { status: 400 });

    if (pathname === '/kick' && request.method === 'POST') {
      // 4001: the person left. 4002: the owner removed them. The app tells the two apart.
      const removed = new URL(request.url).searchParams.get('reason') === 'removed';
      this.kick(handle, removed ? 4002 : 4001, removed ? 'removed' : 'left');
      return new Response(null, { status: 204 });
    }
    if (pathname !== '/live' || request.method !== 'GET') {
      return new Response('Not Found', { status: 404 });
    }
    if ((request.headers.get('Upgrade') ?? '').toLowerCase() !== 'websocket') {
      return new Response('Upgrade Required', { status: 426 });
    }
    if (this.peers.size >= MAX_CONNECTIONS) {
      return new Response('Too Many Connections', { status: 429 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    this.peers.set(server, {
      handle,
      name: cleanName(request.headers.get('X-PM-Name')),
      role: request.headers.get('X-PM-Role') === 'owner' ? 'owner' : 'member',
      pos: null,
      lastUpdate: 0,
    });
    server.addEventListener('message', (event) => {
      this.onMessage(server, event.data);
    });
    server.addEventListener('close', () => {
      this.drop(server);
    });
    server.addEventListener('error', () => {
      this.drop(server);
    });
    this.broadcast();
    return new Response(null, { status: 101, webSocket: client });
  }

  private onMessage(socket: WebSocket, data: unknown): void {
    const peer = this.peers.get(socket);
    if (peer === undefined) return;
    const message = parseMessage(data);
    if (message === null) return;
    const now = this.now();
    if (message.t === 'stop') {
      peer.pos = null;
    } else {
      if (now - peer.lastUpdate < MIN_UPDATE_INTERVAL_MS) return;
      peer.lastUpdate = now;
      peer.pos = { lat: message.lat, lng: message.lng, acc: message.acc, at: now };
    }
    this.broadcast();
  }

  private drop(socket: WebSocket): void {
    if (this.peers.delete(socket)) this.broadcast();
  }

  private kick(handle: string, code: number, reason: string): void {
    for (const [socket, peer] of this.peers) {
      if (peer.handle !== handle) continue;
      this.peers.delete(socket);
      try {
        socket.close(code, reason);
      } catch {
        // Already closed.
      }
    }
    this.broadcast();
  }

  /** Sends every connected member the current room: one row per person, newest position wins. */
  private broadcast(): void {
    const now = this.now();
    const byHandle = new Map<string, Peer>();
    for (const peer of this.peers.values()) {
      if (peer.pos !== null && now - peer.pos.at > POSITION_TTL_MS) peer.pos = null;
      const seen = byHandle.get(peer.handle);
      if (seen === undefined || (peer.pos?.at ?? 0) > (seen.pos?.at ?? 0)) {
        byHandle.set(peer.handle, peer);
      }
    }
    const rows = [...byHandle.values()].map((peer) => ({
      id: peer.handle,
      name: peer.name,
      role: peer.role,
      pos:
        peer.pos === null
          ? null
          : {
              lat: peer.pos.lat,
              lng: peer.pos.lng,
              acc: peer.pos.acc,
              ageS: Math.floor((now - peer.pos.at) / 1000),
            },
    }));
    for (const [socket, peer] of this.peers) {
      const message = JSON.stringify({
        t: 'state',
        members: rows.map((row) => ({ ...row, you: row.id === peer.handle })),
      });
      try {
        socket.send(message);
      } catch {
        this.peers.delete(socket);
      }
    }
  }
}
