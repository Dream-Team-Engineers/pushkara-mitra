# Ghat coordinate checklist (O7) — 2026-11-21

Prepared by Claude Code (agent) for the owner, Krishna Murthy Raju G (`gkmraju`). Generated from [scripts/owner-ghats.json](../../scripts/owner-ghats.json) as committed at the time of writing. Every position is **unverified**; none was surveyed. The agent does not invent coordinates.

## How to fill it in

For each row, write the confirmed position (decimal degrees, at least 4 decimals, e.g. `17.0084, 81.7669`) and where it came from: your own reading at the ghat (phone GPS, standing at the steps), the district "Ghats Details" list, or another official page (give the link). Leave a row blank if you don't know; it keeps its "approximate" label.

Then send the filled table, or just the changed rows, and say "update ghat positions from O7". The agent updates `scripts/owner-ghats.json`, removes `approx` only where you gave a confirmed position, rebuilds `web/public/maps/places.json`, and runs the checks.

**Priority:** _High_ = several ghats share one point, so their pins sit on top of each other and distances are wrong. _Medium_ = a village or town position, could be a kilometre or more off. _Low_ = positions that look right, just confirm.

**Map area:** west 81.6, south 16.88, east 81.95, north 17.28. Ghats outside it get an "Open on OpenStreetMap" link instead of a pin. Widening the map for them is a separate decision (it stays a static file on the free tier).

| #   | Ghat                     | Area                            | Current position (lat, lng) | Where it came from                               | On the map?       | Priority     | Confirmed position | Source |
| --- | ------------------------ | ------------------------------- | --------------------------- | ------------------------------------------------ | ----------------- | ------------ | ------------------ | ------ |
| 1   | Pushkar Ghat             | Rajamahendravaram               | 17.00841, 81.76695          | OpenStreetMap ("Pushkar Ghat")                   | Yes               | Low: confirm |                    |        |
| 2   | Kotilingala Revu         | Rajamahendravaram               | 17.02239, 81.7841           | Owner reading, not surveyed                      | Yes               | Low: confirm |                    |        |
| 3   | Saraswati Ghat           | Rajamahendravaram               | 16.99483, 81.77087          | OpenStreetMap ("Saraswathi Ghat")                | Yes               | Low: confirm |                    |        |
| 4   | Gowthami Ghat            | Rajamahendravaram               | 16.99, 81.7833              | Approximate (village or town position)           | Yes               | Medium       |                    |        |
| 5   | Tummalapalli Vari Revu   | Rajamahendravaram               | 16.9833, 81.7833            | Approximate, shares a point with 2 other ghat(s) | Yes               | High         |                    |        |
| 6   | Sri Narasimha Nagar Ghat | Rajamahendravaram               | 16.9833, 81.7833            | Approximate, shares a point with 2 other ghat(s) | Yes               | High         |                    |        |
| 7   | Dowleswaram Barrage Ghat | Dowleswaram                     | 16.9363, 81.762             | Owner reading, not surveyed                      | Yes               | Low: confirm |                    |        |
| 8   | Venkateswara Ghat        | Rajamahendravaram               | 16.9833, 81.7833            | Approximate, shares a point with 2 other ghat(s) | Yes               | High         |                    |        |
| 9   | Goshpada Kshetram Ghat   | Kovvur                          | 17.0167, 81.7333            | Approximate, shares a point with 2 other ghat(s) | Yes               | High         |                    |        |
| 10  | Subrahmanyeswara Ghat    | Kovvur                          | 17.0167, 81.7333            | Approximate, shares a point with 2 other ghat(s) | Yes               | High         |                    |        |
| 11  | Nagareswaram Ghat        | Kovvur                          | 17.0167, 81.7333            | Approximate, shares a point with 2 other ghat(s) | Yes               | High         |                    |        |
| 12  | Seethanagaram Ghat       | Seethanagaram                   | 17.1779, 81.6932            | Approximate (village or town position)           | Yes               | Medium       |                    |        |
| 13  | Purushottapatnam Ghat    | Purushottapatnam, Seethanagaram | 17.2523, 81.6628            | Approximate (village or town position)           | Yes               | Medium       |                    |        |
| 14  | Vangalapudi Ghat         | Vangalapudi, Seethanagaram      | 17.1972, 81.6729            | Approximate (village or town position)           | Yes               | Medium       |                    |        |
| 15  | Pattiseema Ghat          | Pattiseema, Devipatnam          | 17.21769, 81.63509          | Approximate (village or town position)           | Yes               | Medium       |                    |        |
| 16  | Polavaram Ghat           | Polavaram, Eluru district       | 17.24674, 81.64391          | Approximate (village or town position)           | Yes               | Medium       |                    |        |
| 17  | Narasapuram Ghat         | Narasapuram, West Godavari      | 16.4386, 81.7015            | Approximate (village or town position)           | **No**, link only | Medium       |                    |        |
| 18  | Antarvedi Ghat           | Antarvedi, Konaseema            | 16.3333, 81.7333            | Approximate (village or town position)           | **No**, link only | Medium       |                    |        |
| 19  | Bhadrachalam Ghat        | Bhadrachalam, Telangana         | 17.6666, 80.8797            | Approximate (village or town position)           | **No**, link only | Medium       |                    |        |

## Summary

- 2 found by name on OpenStreetMap, 2 owner readings, 15 approximate.
- 6 ghats share a point with another ghat (high priority).
- 3 outside the map area: Narasapuram Ghat, Antarvedi Ghat, Bhadrachalam Ghat.

Ghat data is not legal sign-off: OpenStreetMap-derived positions remain under the ODbL review (OQ-036).
