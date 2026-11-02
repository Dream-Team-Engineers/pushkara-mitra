/**
 * Stub for real-time group location (milestone M2).
 * Privacy rule (ADR 0004): location lives in memory only. Never call the storage API,
 * never serialise WebSocket attachments, and never log coordinates.
 */
export class GroupLocation implements DurableObject {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-unused-vars
  constructor(_ctx: DurableObjectState, _env: unknown) {
    // Intentionally empty.
  }

  fetch(): Response {
    return new Response('Not implemented', { status: 501 });
  }
}
