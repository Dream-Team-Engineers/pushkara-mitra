/**
 * Fixed public error envelope (docs/contracts/public-information.openapi.yaml and
 * docs/contracts/public-content.openapi.yaml, PublicError).
 * Messages are reviewed constants: they never echo request input, paths or internal detail.
 */
export type InformationErrorCode = 'INVALID_QUERY' | 'INFORMATION_UNAVAILABLE';
export type ContentErrorCode = 'CONTENT_UNAVAILABLE' | 'NOT_FOUND';
export type PublicErrorCode = InformationErrorCode | ContentErrorCode;

const MESSAGES: Readonly<Record<PublicErrorCode, string>> = {
  INVALID_QUERY: 'The request query is not valid.',
  INFORMATION_UNAVAILABLE: 'No approved information is available.',
  CONTENT_UNAVAILABLE: 'No approved content is available.',
  NOT_FOUND: 'Not found.',
};

export function publicError(code: PublicErrorCode, status: 400 | 404): Response {
  return Response.json(
    { error: { code, message: MESSAGES[code] } },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}
