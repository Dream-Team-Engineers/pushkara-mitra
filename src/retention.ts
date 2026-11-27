/**
 * Partner retention (OQ-046, owner decision 2026-11-27): approved partners' name and email are kept
 * for one year after the event ends. The event runs 26 June 2027 to 7 July 2027; the owner added one
 * week of buffer, so the end date used here is 14 July 2027 and the data goes on 14 July 2028.
 * Change this date only on the owner's say-so. Engineering setting, not legal advice (NEEDS REVIEW).
 */
export const EVENT_END_WITH_BUFFER = '2027-07-14T00:00:00.000Z';
export const PARTNER_RETENTION_ENDS_AT = '2028-07-14T00:00:00.000Z';
