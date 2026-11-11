/**
 * Fixed public error envelope (docs/contracts/public-information.openapi.yaml, PublicError).
 * Messages are reviewed constants: they never echo request input, paths or internal detail.
 */
export type PublicErrorCode = 'INVALID_QUERY' | 'INFORMATION_UNAVAILABLE';

const MESSAGES: Readonly<Record<PublicErrorCode, string>> = {
  INVALID_QUERY: 'The request query is not valid.',
  INFORMATION_UNAVAILABLE: 'No approved information is available.',
};

export function publicError(code: PublicErrorCode, status: 400 | 404): Response {
  return Response.json(
    { error: { code, message: MESSAGES[code] } },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}
