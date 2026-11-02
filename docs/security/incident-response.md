# Incident response

Status: skeleton for review. Roles and contact details are placeholders until named (OQ-001, OQ-005).

## Severity

| Level | Meaning                                                                                | Example                      |
| ----- | -------------------------------------------------------------------------------------- | ---------------------------- |
| SEV1  | Personal data exposed, location persisted, payment compromise, or public-safety impact | Coordinates found in logs    |
| SEV2  | Security control failed, no confirmed exposure                                         | Secret committed and rotated |
| SEV3  | Minor or contained                                                                     | Failed dependency check      |

## Roles

| Role                        | Holder                |
| --------------------------- | --------------------- |
| Incident commander          | LEAD                  |
| Deputy                      | DEV2                  |
| Legal and regulator contact | To be named (counsel) |
| Public communications       | To be named           |

## Flow

1. **Detect and declare.** Anyone can declare. Record the time you became aware.
2. **Contain.** Use the kill switches in `src/flags.ts`; rotate credentials; roll back with `npx wrangler rollback --env production`.
3. **Assess.** Which data, which people, which processors.
4. **Report.** If CERT-In applies, the report must go within 6 hours of noticing (unverified, see [cert-in-checklist](../compliance/cert-in-checklist.md)). For personal-data breaches follow [breach-response](../operations/breach-response.md). Counsel decides what is sent and by whom.
5. **Recover and verify.**
6. **Review** within 5 working days with a blameless write-up in `docs/security/`.

## Never

Paste personal data, locations or secrets into tickets, chat or this repo while handling an incident.
