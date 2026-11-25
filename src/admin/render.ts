import type { PartnerOverview, PartnerRow } from '../db/adminPartners';
import type { DayRow, Growth, GroupStats, Live, TableCounts } from '../db/adminStats';

/**
 * Server-rendered pages of the staff dashboard (ADR 0018). No client script: tabs and periods are
 * links, the Live tab refreshes itself every 30 seconds. Every dynamic value is escaped. Pages show
 * counts only, never a person, pseudonym, name, group name, code or position.
 */
export type Tab = 'growth' | 'live' | 'groups' | 'partners' | 'more';
export type Range = 'today' | '7d' | '30d' | 'day';

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const num = (n: number): string => new Intl.NumberFormat('en-IN').format(n);

const ICONS: Readonly<Record<Tab, readonly string[]>> = {
  growth: ['M3 17l6-6 4 4 8-8', 'M15 7h6v6'],
  live: [
    'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
    'M6.3 6.3a8 8 0 0 0 0 11.4',
    'M17.7 6.3a8 8 0 0 1 0 11.4',
  ],
  groups: [
    'M9 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
    'M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6',
    'M16 5.5a2.5 2.5 0 1 1 0 5',
    'M17 14c2.4.4 4 2.5 4 5',
  ],
  partners: ['M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z'],
  more: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
};

const TAB_LABEL: Readonly<Record<Tab, string>> = {
  growth: 'Growth',
  live: 'Live',
  groups: 'Groups',
  partners: 'Partners',
  more: 'More',
};

function icon(tab: Tab): string {
  const paths = ICONS[tab].map((d) => `<path d="${d}"/>`).join('');
  return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
}

export interface PageOptions {
  readonly tab: Tab;
  readonly title: string;
  readonly subtitle: string;
  readonly updated: string;
  readonly refreshSeconds?: number;
}

export function page(options: PageOptions, body: string): string {
  const nav = (Object.keys(TAB_LABEL) as Tab[])
    .map(
      (tab) =>
        `<a href="/?tab=${tab}"${tab === options.tab ? ' class="on" aria-current="page"' : ''}>${icon(tab)}<span>${TAB_LABEL[tab]}</span></a>`,
    )
    .join('');
  const refresh =
    options.refreshSeconds === undefined
      ? ''
      : `<meta http-equiv="refresh" content="${String(options.refreshSeconds)}">`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
${refresh}
<title>${escapeHtml(options.title)} · Pushkara Mitra admin</title>
<link rel="stylesheet" href="/admin.css">
</head>
<body>
<div class="fx" aria-hidden="true"><i></i><i></i><i></i><b></b></div>
<header class="top">
  <div>
    <h1><span class="dot" aria-hidden="true"></span><span>${escapeHtml(options.title)}</span></h1>
    <p class="sub">${escapeHtml(options.subtitle)}</p>
  </div>
  <p class="updated"><span class="live-dot" aria-hidden="true"></span>${escapeHtml(options.updated)}</p>
</header>
<main>
${body}
</main>
<nav class="tabs" aria-label="Dashboard sections">${nav}</nav>
</body>
</html>`;
}

/** An area line of daily values with first, peak and last labels. */
export function sparkline(values: readonly number[], labels: readonly [string, string]): string {
  const width = 300;
  const height = 70;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((v, i) => {
    const x = values.length > 1 ? i * step : width / 2;
    const y = height - 6 - (v / max) * (height - 16);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = points.join(' ');
  const area = `0,${String(height)} ${line} ${String(width)},${String(height)}`;
  const peak = Math.max(0, ...values);
  return `<figure class="spark">
<svg viewBox="0 0 ${String(width)} ${String(height)}" preserveAspectRatio="none" role="img" aria-label="App opens per day, peak ${num(peak)}">
<polygon class="spark__area" points="${area}"/>
<polyline class="spark__line" points="${line}"/>
</svg>
<figcaption><span>${escapeHtml(labels[0])}</span><span>peak ${num(peak)}</span><span>${escapeHtml(labels[1])}</span></figcaption>
</figure>`;
}

function stat(value: number | string, label: string): string {
  const shown = typeof value === 'number' ? num(value) : escapeHtml(value);
  return `<div class="stat"><strong>${shown}</strong><span>${escapeHtml(label)}</span></div>`;
}

function shortDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function weekday(day: string, today: string): string {
  if (day === today) return 'Today';
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000)
    .toISOString()
    .slice(0, 10);
  if (day === yesterday) return 'Yesterday';
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', {
    weekday: 'short',
    timeZone: 'UTC',
  });
}

const sum = (rows: readonly DayRow[], key: keyof Omit<DayRow, 'day'>): number =>
  rows.reduce((total, row) => total + row[key], 0);

export function growthBody(data: Growth, range: Range, day: string, today: string): string {
  const chip = (value: Range, label: string) =>
    `<a class="chip${range === value ? ' on' : ''}" href="/?tab=growth&amp;range=${value}">${label}</a>`;
  const rows = data.days;
  const opens = sum(rows, 'opens');
  const locales = data.opensByLocale;
  const share = (n: number) => (opens === 0 ? '0%' : `${String(Math.round((n / opens) * 100))}%`);
  const first = rows[0]?.day ?? today;
  const last = rows[rows.length - 1]?.day ?? today;
  const table = [...rows]
    .reverse()
    .map((row) => {
      const maxOpens = Math.max(1, ...rows.map((r) => r.opens));
      const bar = Math.round((row.opens / maxOpens) * 100);
      return `<tr><th scope="row">${escapeHtml(shortDay(row.day))}<small>${escapeHtml(weekday(row.day, today))}</small></th>
<td><span class="bar w${String(Math.round(bar / 10))}"></span>${num(row.opens)}</td><td>${num(row.signIns)}</td><td>${num(row.newSignIns)}</td><td class="hot">${num(row.groupsCreated)}</td><td>${num(row.joins)}</td><td>${num(row.installs)}</td></tr>`;
    })
    .join('');
  return `<div class="chips">${chip('today', 'Today')}${chip('7d', '7 days')}${chip('30d', '30 days')}
<form class="chip-form${range === 'day' ? ' on' : ''}" method="get" action="/"><input type="hidden" name="tab" value="growth"><input type="hidden" name="range" value="day"><label><span class="visually-hidden">Day</span><input type="date" name="day" value="${escapeHtml(day)}" max="${escapeHtml(today)}"></label><button type="submit">Go</button></form></div>
<section class="hero" aria-label="Summary">
  <p class="big"><strong>${num(opens)}</strong> App opens</p>
  <p class="mid"><strong>${num(sum(rows, 'newSignIns'))}</strong> New sign-ins</p>
  <p class="mid"><strong>${num(sum(rows, 'groupsCreated'))}</strong> Groups created</p>
  ${
    rows.length > 1
      ? sparkline(
          rows.map((r) => r.opens),
          [shortDay(first), shortDay(last)],
        )
      : ''
  }
  <div class="grid">
    ${stat(sum(rows, 'signIns'), 'All sign-ins')}
    ${stat(sum(rows, 'signIns') - sum(rows, 'newSignIns'), 'Returning sign-ins')}
    ${stat(sum(rows, 'joins'), 'Joined a group')}
    ${stat(sum(rows, 'installs'), 'App installs')}
    ${stat(share(locales.te), 'Telugu')}
    ${stat(`${share(locales.en)} · ${share(locales.hi)}`, 'English · Hindi')}
  </div>
</section>
<h2 class="section">Day by day</h2>
<div class="table-wrap"><table>
<thead><tr><th scope="col">Day</th><th scope="col">Opens</th><th scope="col">Sign-ins</th><th scope="col">New</th><th scope="col">Groups</th><th scope="col">Joins</th><th scope="col">Installs</th></tr></thead>
<tbody>${table}</tbody></table></div>
<p class="note">Counts only. App opens are counted once per page load with the screen language, no device or person identifier (ADR 0018). Days are India time.</p>`;
}

function ago(iso: string, nowMs: number): string {
  const minutes = Math.max(0, Math.round((nowMs - Date.parse(iso)) / 60_000));
  if (minutes < 60) return `${String(minutes)} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${String(hours)} h ago` : `${String(Math.round(hours / 24))} days ago`;
}

export function liveBody(data: Live, nowMs: number, staleMinutes: number): string {
  const crowd =
    data.crowd.length === 0
      ? '<p class="note">No crowd readings reported yet.</p>'
      : `<div class="table-wrap"><table><thead><tr><th scope="col">Ghat</th><th scope="col">Level</th><th scope="col">Reported</th></tr></thead><tbody>${data.crowd
          .map((r) => {
            const stale = nowMs - Date.parse(r.reportedAt) > staleMinutes * 60_000;
            return `<tr${stale ? ' class="stale"' : ''}><th scope="row">${escapeHtml(r.ghatId)}</th><td><span class="lvl lvl--${escapeHtml(r.level)}">${escapeHtml(r.level)}</span></td><td>${escapeHtml(ago(r.reportedAt, nowMs))}${stale ? ' · stale' : ''}</td></tr>`;
          })
          .join('')}</tbody></table></div>`;
  return `<section class="hero" aria-label="Right now">
  <p class="big"><strong>${num(data.opensThisHour)}</strong> App opens this hour</p>
  <div class="grid">
    ${stat(data.opensLastHour, 'Opens last hour')}
    ${stat(data.signInsLastHour, 'Sign-ins, last 60 min')}
    ${stat(data.activeGroups, 'Active groups')}
  </div>
</section>
<h2 class="section">Crowd readings</h2>
${crowd}
<p class="note">Refreshes every 30 seconds. Live sharing inside groups is never shown here: positions stay in memory on the group's own room (ADR 0017).</p>`;
}

export function groupsBody(data: GroupStats, maxMembers: number): string {
  const avg = data.active === 0 ? '0' : (data.members / data.active).toFixed(1);
  return `<section class="hero" aria-label="Groups">
  <p class="big"><strong>${num(data.active)}</strong> Active groups</p>
  <p class="mid"><strong>${num(data.members)}</strong> People in active groups</p>
  <div class="grid">
    ${stat(avg, 'Average size')}
    ${stat(data.full, `Full (${String(maxMembers)} people)`)}
    ${stat(data.named, 'Have a name')}
    ${stat(data.endingSoon, 'Ending in 48 h')}
    ${stat(data.removals, 'Members removed')}
    ${stat(data.createdTotal, 'Created, all time')}
  </div>
</section>
<p class="note">No group names, codes or member names are shown here.</p>`;
}

export const PARTNER_NOTICES: Readonly<Record<string, string>> = {
  approved: 'Partner approved.',
  rejected: 'Application rejected.',
  suspended: 'Partner suspended.',
  nudged: 'Nudge sent to partners.',
  hidden: 'Update hidden from pilgrims.',
  shown: 'Update shown again.',
  limit: 'Too many nudges this hour. Try again later.',
  invalid: 'That could not be done (already changed, or not allowed).',
};

export interface PartnersView {
  readonly data: PartnerOverview;
  /** Hidden form field proving the request came from this page (derived from the Access token). */
  readonly csrf: string;
  /** False when FLAG_PARTNERS is not enabled: the page then only reads. */
  readonly writable: boolean;
  readonly notice: string | null;
  readonly nowMs: number;
}

const csrfField = (csrf: string): string =>
  `<input type="hidden" name="csrf" value="${escapeHtml(csrf)}">`;

function action(
  path: string,
  csrf: string,
  fields: Readonly<Record<string, string>>,
  label: string,
  tone: 'go' | 'stop',
): string {
  const hidden = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}">`)
    .join('');
  return `<form class="act" method="post" action="${escapeHtml(path)}">${csrfField(csrf)}${hidden}<button class="btn btn--${tone}" type="submit">${escapeHtml(label)}</button></form>`;
}

function partnerCard(p: PartnerRow, csrf: string, writable: boolean, nowMs: number): string {
  const who = `${p.role === 'priest' ? 'Priest' : 'Volunteer'}${p.ghatId === null ? '' : ` · ${p.ghatId}`}`;
  const buttons = !writable
    ? ''
    : p.status === 'pending'
      ? action('/partners/decide', csrf, { ref: p.ref, do: 'approve' }, 'Approve', 'go') +
        action('/partners/decide', csrf, { ref: p.ref, do: 'reject' }, 'Reject', 'stop')
      : p.status === 'approved'
        ? action('/partners/decide', csrf, { ref: p.ref, do: 'suspend' }, 'Suspend', 'stop')
        : action('/partners/decide', csrf, { ref: p.ref, do: 'approve' }, 'Approve again', 'go');
  const state =
    p.status === 'approved'
      ? p.available
        ? 'Available now'
        : 'Not available'
      : p.status === 'suspended'
        ? 'Suspended'
        : `Applied ${ago(p.appliedAt, nowMs)}`;
  return `<li class="person">
  <div><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(p.email)}</span><span>${escapeHtml(who)}</span><span class="state state--${escapeHtml(p.status)}">${escapeHtml(state)}</span></div>
  <div class="acts">${buttons}</div>
</li>`;
}

export function partnersBody(view: PartnersView): string {
  const { data, csrf, writable, notice, nowMs } = view;
  const live = data.priestsAvailable + data.volunteersAvailable;
  const flash =
    notice === null
      ? ''
      : `<p class="flash" role="status">${escapeHtml(PARTNER_NOTICES[notice] ?? PARTNER_NOTICES['invalid'] ?? '')}</p>`;
  const off = writable
    ? ''
    : '<p class="note">Partners are switched off in this environment (FLAG_PARTNERS), so nothing can be changed here yet.</p>';
  const waiting =
    data.waiting.length === 0
      ? '<p class="note">Nobody is waiting for approval.</p>'
      : `<ul class="people">${data.waiting.map((p) => partnerCard(p, csrf, writable, nowMs)).join('')}</ul>`;
  const partners =
    data.partners.length === 0
      ? '<p class="note">No approved partners yet.</p>'
      : `<ul class="people">${data.partners.map((p) => partnerCard(p, csrf, writable, nowMs)).join('')}</ul>`;
  const nudge = writable
    ? `<form class="card nudge" method="post" action="/partners/nudge">${csrfField(csrf)}
  <h2>Ask partners for an update</h2>
  <label>What<select name="kind"><option value="crowd">Crowd level</option><option value="river">River level</option><option value="food">Free food</option></select></label>
  <label>Ghat (optional)<input name="ghat" maxlength="64" pattern="[a-z0-9][a-z0-9/\\-]{0,63}" placeholder="all ghats" autocomplete="off"></label>
  <button class="btn btn--go" type="submit">Send nudge</button>
  <p class="note">Fixed wording only. Goes to approved partners (all, or those with that home ghat) and closes after 6 hours. 10 per hour.</p>
</form>`
    : '';
  const updates =
    data.updates.length === 0
      ? '<p class="note">No volunteer updates in the last 24 hours.</p>'
      : `<div class="table-wrap"><table><thead><tr><th scope="col">Ghat</th><th scope="col">What</th><th scope="col">From</th><th scope="col">When</th></tr></thead><tbody>${data.updates
          .map(
            (u) =>
              `<tr${u.hidden ? ' class="stale"' : ''}><th scope="row">${escapeHtml(u.ghatId)}${
                writable
                  ? action(
                      '/partners/hide',
                      csrf,
                      { id: u.id, do: u.hidden ? 'show' : 'hide' },
                      u.hidden ? 'Show' : 'Hide',
                      u.hidden ? 'go' : 'stop',
                    )
                  : ''
              }</th><td>${escapeHtml(u.kind)}: ${escapeHtml(u.value)}${u.hidden ? ' · hidden' : ''}</td><td>${escapeHtml(u.partnerName)}</td><td>${escapeHtml(ago(u.createdAt, nowMs))}</td></tr>`,
          )
          .join('')}</tbody></table></div>`;
  return `${flash}<section class="hero" aria-label="Partners">
  <p class="big"><strong>${num(live)}</strong> Partners available</p>
  <div class="grid">
    ${stat(data.priestsAvailable, 'Priests available')}
    ${stat(data.volunteersAvailable, 'Volunteers available')}
    ${stat(data.pending, 'Waiting for approval')}
    ${stat(data.approved, 'Approved')}
    ${stat(data.nudgesToday, 'Nudges in 24 h')}
  </div>
</section>${off}
<h2 class="section">Waiting for approval</h2>
${waiting}
${nudge}
<h2 class="section">Partners</h2>
${partners}
<h2 class="section">Volunteer updates (24 hours)</h2>
${updates}
<p class="note">Names and emails here are for approving people only. Pilgrims never see them: they see "From a volunteer", the age, and that it is not an official figure.</p>`;
}

export function moreBody(counts: TableCounts, environment: string, subject: string): string {
  const rows = Object.entries(counts)
    .map(
      ([table, n]) =>
        `<tr><th scope="row"><code>${escapeHtml(table)}</code></th><td>${num(n)}</td></tr>`,
    )
    .join('');
  const shortSubject = subject.length > 12 ? `${subject.slice(0, 8)}…` : subject;
  return `<section class="card">
  <h2>System</h2>
  <dl>
    <dt>Environment</dt><dd>${escapeHtml(environment)}</dd>
    <dt>Signed in as</dt><dd>Access subject ${escapeHtml(shortSubject)} (who may sign in is set in the Cloudflare Access policy)</dd>
  </dl>
</section>
<h2 class="section">Rows per table</h2>
<div class="table-wrap"><table><tbody>${rows}</tbody></table></div>
<p class="note">Read-only. Data rules: ADR 0004, 0006, 0017, 0018. No location is ever stored.</p>`;
}

export const ADMIN_CSS = `
@property --ang{syntax:'<angle>';initial-value:0deg;inherits:false}
:root{--bg1:#04140d;--bg2:#0d3323;--card:rgba(255,255,255,.06);--line:rgba(255,255,255,.12);--text:#effcf5;--muted:#a9cbb9;--accent:#4ade80;--accent2:#15803d;--ok:#34d399;--warn:#fbbf24;--bad:#f87171;--head:"Space Grotesk",system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans",sans-serif}
*{box-sizing:border-box}
html{background:var(--bg1)}
body{position:relative;margin:0 auto;max-width:560px;min-height:100vh;padding:0 14px 96px;background:var(--bg1);color:var(--text);font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans",sans-serif;overflow-x:hidden}
.fx{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
.fx i{position:absolute;border-radius:50%;filter:blur(100px);opacity:.45;animation:drift 18s ease-in-out infinite alternate}
.fx i:nth-child(1){width:520px;height:520px;left:-140px;top:-160px;background:#16a34a}
.fx i:nth-child(2){width:420px;height:420px;right:-120px;top:240px;background:#0d9488;opacity:.3;animation-delay:-7s}
.fx i:nth-child(3){width:380px;height:380px;left:30%;bottom:-200px;background:#65a30d;opacity:.22;animation-delay:-12s}
.fx b{position:absolute;inset:0;background-image:radial-gradient(rgba(187,247,208,.2) 1px,transparent 1.3px);background-size:26px 26px;-webkit-mask-image:radial-gradient(ellipse 80% 45% at 50% 0%,#000 20%,transparent 80%);mask-image:radial-gradient(ellipse 80% 45% at 50% 0%,#000 20%,transparent 80%)}
@keyframes drift{to{transform:translate(60px,40px) scale(1.15)}}
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:20px 2px 8px}
h1{display:flex;align-items:center;gap:10px;margin:0;font:700 1.9rem/1.15 var(--head);letter-spacing:-.02em}
h1 .dot+*{background:linear-gradient(110deg,#bbf7d0 35%,#fff 50%,#bbf7d0 65%) 120% 0/220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent}
.dot{flex:none;width:14px;height:14px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#bbf7d0,#22c55e);box-shadow:0 0 14px #22c55e}
.sub{margin:2px 0 0;color:var(--muted)}
.updated{margin:8px 0 0;padding:5px 12px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--muted);font-size:.82rem;white-space:nowrap}
.live-dot{display:inline-block;width:8px;height:8px;margin-right:7px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 0 rgba(52,211,153,.7);animation:pulse 1.8s infinite}
@keyframes pulse{70%{box-shadow:0 0 0 8px rgba(52,211,153,0)}100%{box-shadow:0 0 0 0 rgba(52,211,153,0)}}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px}
.chip,.chip-form{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 16px;border:1px solid var(--line);border-radius:999px;background:var(--card);color:var(--text);text-decoration:none;font-weight:700;transition:background .25s,transform .25s}
.chip:hover{background:rgba(255,255,255,.12);transform:translateY(-1px)}
.chip.on,.chip-form.on{background:var(--text);color:var(--bg1);border-color:var(--text)}
.chip-form{padding:0 4px 0 12px}
.chip-form input{background:transparent;color:inherit;border:0;font:inherit;color-scheme:dark}
.chip-form.on input{color-scheme:light}
.chip-form button{min-height:32px;padding:0 12px;border:0;border-radius:999px;background:var(--accent2);color:#fff;font:inherit;font-weight:700}
.hero{position:relative;padding:20px;border:1px solid rgba(255,255,255,.1);border-radius:24px;background:linear-gradient(155deg,rgba(21,128,61,.5),rgba(74,222,128,.08) 55%,rgba(255,255,255,.03));backdrop-filter:blur(10px);animation:rise .7s cubic-bezier(.2,.8,.2,1) both}
.hero::before{content:"";position:absolute;inset:0;border-radius:24px;padding:1.5px;pointer-events:none;background:conic-gradient(from var(--ang),transparent 0 75%,#86efac 88%,#fff 93%,transparent 100%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:ang 5s linear infinite}
@keyframes ang{to{--ang:360deg}}
.hero p{margin:0 0 6px}
.big strong{display:block;font:700 4rem/1 var(--head);letter-spacing:-.04em;margin:4px 0 2px;background:linear-gradient(180deg,#fff,#86efac);-webkit-background-clip:text;background-clip:text;color:transparent}
.big{font-size:.8rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.mid strong{font:700 1.5rem var(--head);margin-right:6px}
.mid{font-weight:600}
.spark{margin:12px 0 4px}
.spark svg{display:block;width:100%;height:80px;overflow:visible}
.spark__area{fill:rgba(74,222,128,.2);opacity:0;animation:fade 1s 1.1s ease forwards}
@keyframes fade{to{opacity:1}}
.spark__line{fill:none;stroke:var(--accent);stroke-width:2.6;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke;filter:drop-shadow(0 0 7px rgba(74,222,128,.7));stroke-dasharray:2000;stroke-dashoffset:2000;animation:draw 1.8s .2s ease forwards}
@keyframes draw{to{stroke-dashoffset:0}}
.spark figcaption{display:flex;justify-content:space-between;color:var(--muted);font-size:.8rem}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px 8px;margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
.stat strong{display:block;font:700 1.4rem var(--head);letter-spacing:-.01em}
.stat span{color:var(--muted);font-size:.82rem;font-weight:600}
.section{margin:24px 2px 10px;color:var(--muted);font-size:.8rem;letter-spacing:.14em;text-transform:uppercase}
.table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:18px;background:var(--card);backdrop-filter:blur(8px);animation:rise .7s .1s cubic-bezier(.2,.8,.2,1) both}
table{width:100%;border-collapse:collapse;font-size:.9rem}
th,td{padding:11px 10px;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
thead th{color:var(--muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.08em}
tbody th{text-align:left}
tbody th small{display:block;color:var(--muted);font-weight:400}
tbody tr{transition:background .2s}
tbody tr+tr{border-top:1px solid rgba(255,255,255,.07)}
tbody tr:hover{background:rgba(74,222,128,.07)}
td.hot{color:var(--accent);font-weight:800}
.w0{width:0px}.w1{width:4px}.w2{width:8px}.w3{width:12px}.w4{width:16px}.w5{width:20px}.w6{width:24px}.w7{width:28px}.w8{width:32px}.w9{width:36px}.w10{width:40px}
.bar{display:inline-block;height:6px;margin-right:6px;border-radius:3px;background:linear-gradient(90deg,var(--accent),#bef264);vertical-align:middle}
.stale td,.stale th{color:var(--muted)}
.lvl{padding:2px 10px;border-radius:999px;font-weight:700}
.lvl--low{background:rgba(52,211,153,.2);color:var(--ok)}
.lvl--moderate{background:rgba(251,191,36,.2);color:var(--warn)}
.lvl--high{background:rgba(248,113,113,.2);color:var(--bad)}
.note{margin:14px 2px;color:var(--muted);font-size:.85rem}
.card{padding:16px 18px;border:1px solid var(--line);border-radius:20px;background:linear-gradient(160deg,rgba(255,255,255,.075),rgba(255,255,255,.025));backdrop-filter:blur(10px);animation:rise .7s cubic-bezier(.2,.8,.2,1) both}
.card h2{margin:0 0 8px;font:600 1.1rem var(--head)}
dl{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;margin:0}
dt{color:var(--muted)}
dd{margin:0}
.steps{margin:0;padding-left:18px;color:var(--muted)}
.steps li{margin-bottom:10px}
.steps strong{color:var(--text)}
.tabs{position:fixed;right:0;bottom:12px;left:0;display:flex;justify-content:space-around;width:calc(100% - 28px);max-width:420px;margin:0 auto;padding:6px;border:1px solid rgba(255,255,255,.16);border-radius:26px;background:rgba(8,32,22,.74);box-shadow:0 18px 40px -10px rgba(0,0,0,.7);backdrop-filter:blur(18px)}
.tabs a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;flex:1;min-height:52px;padding:4px;border:1px solid transparent;border-radius:20px;color:var(--muted);text-decoration:none;font-size:.72rem;font-weight:700;transition:color .2s,background .35s,border-color .35s}
.tabs a:hover{color:var(--text)}
.tabs a.on{color:var(--text);background:linear-gradient(160deg,rgba(74,222,128,.35),rgba(74,222,128,.1));border-color:rgba(74,222,128,.5)}
.tabs a.on .ico{stroke:var(--accent)}
.ico{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.flash{margin:10px 0;padding:10px 14px;border:1px solid rgba(74,222,128,.45);border-radius:14px;background:rgba(21,128,61,.3);font-weight:700}
.people{margin:0;padding:0;list-style:none;display:grid;gap:10px}
.person{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:13px 15px;border:1px solid var(--line);border-radius:18px;background:var(--card);transition:transform .3s,border-color .3s}
.person:hover{transform:translateY(-2px);border-color:rgba(74,222,128,.5)}
.person>div:first-child{display:grid;gap:2px;min-width:0}
.person span{color:var(--muted);font-size:.85rem;overflow-wrap:anywhere}
.person strong{overflow-wrap:anywhere}
.person .state--approved{color:var(--ok)}.person .state--suspended,.person .state--rejected{color:var(--bad)}
.acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.act{margin:0}
.btn{min-height:40px;padding:0 16px;border:1px solid var(--line);border-radius:999px;color:#fff;font:inherit;font-weight:700;cursor:pointer;transition:transform .2s,filter .2s}
.btn:hover{transform:translateY(-1px);filter:brightness(1.15)}
.btn--go{position:relative;overflow:hidden;isolation:isolate;background:#0b2a1c;border-color:rgba(255,255,255,.14)}
.btn--go::before{content:"";position:absolute;inset:-100% -40%;z-index:-2;background:conic-gradient(from 0deg,transparent 0 300deg,rgba(134,239,172,.9) 340deg,transparent 360deg);animation:spin 3s linear infinite}
.btn--go::after{content:"";position:absolute;inset:2px;z-index:-1;border-radius:999px;background:#0b2a1c}
@keyframes spin{to{transform:rotate(360deg)}}
.btn--stop{background:rgba(248,113,113,.22);color:var(--text)}
.nudge{display:grid;gap:10px;margin-top:14px}
.nudge label{display:grid;gap:4px;color:var(--muted);font-size:.85rem}
.nudge select,.nudge input{min-height:42px;padding:0 10px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.08);color:var(--text);font:inherit;color-scheme:dark}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #fde047;outline-offset:2px}
@media (min-width:900px){
body{max-width:1100px;padding:0 24px 24px 288px}
.top{padding:30px 2px 12px}
h1{font-size:2.4rem}
.hero{padding:26px}
.big strong{font-size:5rem}
.spark svg{height:130px}
.tabs{top:0;bottom:0;left:max(0px,calc((100vw - 1100px) / 2));right:auto;flex-direction:column;justify-content:flex-start;gap:6px;width:248px;max-width:none;margin:0;padding:84px 14px 14px;border:0;border-right:1px solid rgba(255,255,255,.08);border-radius:0;background:rgba(4,20,13,.6);box-shadow:none}
.tabs::before{content:"Pushkara Mitra";position:absolute;top:26px;left:20px;font:700 1.1rem var(--head)}
.tabs a{flex:none;flex-direction:row;justify-content:flex-start;gap:12px;min-height:46px;padding:0 14px;border-radius:12px;font-size:.95rem}
.table-wrap{border-radius:22px}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.spark__line{stroke-dashoffset:0}.spark__area{opacity:1}}
`;
