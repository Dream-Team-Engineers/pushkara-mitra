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
<header class="top">
  <div>
    <h1><span class="dot" aria-hidden="true"></span>${escapeHtml(options.title)}</h1>
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

export function partnersBody(): string {
  return `<section class="hero" aria-label="Partners">
  <p class="big"><strong>0</strong> Partners live</p>
  <div class="grid">
    ${stat(0, 'Priests available')}
    ${stat(0, 'Volunteers available')}
    ${stat(0, 'Waiting for approval')}
    ${stat(0, 'Nudges sent today')}
  </div>
</section>
<h2 class="section">Coming next</h2>
<ul class="steps">
  <li><strong>Phase 2:</strong> priests and volunteers sign in with Google and ask to join; one of the three admins approves them here. Approved partners mark themselves available. Nudge them for crowd level, river level and free-food updates through an in-app inbox; their updates show to pilgrims at once, marked as from a volunteer, and can be hidden here.</li>
  <li><strong>Phase 3:</strong> nudges also arrive as phone notifications (with the partner's permission).</li>
</ul>`;
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
:root{--bg1:#061a12;--bg2:#0d3323;--card:rgba(255,255,255,.06);--line:rgba(255,255,255,.12);--text:#effcf5;--muted:#a9cbb9;--accent:#4ade80;--accent2:#15803d;--ok:#34d399;--warn:#fbbf24;--bad:#f87171}
*{box-sizing:border-box}
html{background:var(--bg1)}
body{margin:0 auto;max-width:560px;min-height:100vh;padding:0 14px 84px;background:linear-gradient(180deg,var(--bg2),var(--bg1) 60%);color:var(--text);font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans",sans-serif}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:18px 2px 8px}
h1{display:flex;align-items:center;gap:10px;margin:0;font-size:1.75rem;font-weight:800}
.dot{width:14px;height:14px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#bbf7d0,#22c55e);box-shadow:0 0 12px #22c55e}
.sub{margin:2px 0 0;color:var(--muted)}
.updated{margin:6px 0 0;color:var(--muted);font-size:.85rem;white-space:nowrap}
.live-dot{display:inline-block;width:8px;height:8px;margin-right:6px;border-radius:50%;background:var(--ok)}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 12px}
.chip,.chip-form{display:inline-flex;align-items:center;gap:6px;min-height:38px;padding:0 14px;border:1px solid var(--line);border-radius:999px;color:var(--text);text-decoration:none;font-weight:700}
.chip.on,.chip-form.on{background:var(--text);color:var(--bg1)}
.chip-form{padding:0 4px 0 10px}
.chip-form input{background:transparent;color:inherit;border:0;font:inherit;color-scheme:dark}
.chip-form.on input{color-scheme:light}
.chip-form button{min-height:30px;padding:0 10px;border:0;border-radius:999px;background:var(--accent2);color:#fff;font:inherit;font-weight:700}
.hero{padding:16px;border:1px solid rgba(74,222,128,.45);border-radius:20px;background:linear-gradient(160deg,rgba(21,128,61,.45),rgba(74,222,128,.12) 50%,rgba(255,255,255,.03))}
.hero p{margin:0 0 6px}
.big strong{font-size:2.6rem;font-weight:900;letter-spacing:-.02em;margin-right:6px}
.big{font-size:1.1rem;font-weight:700}
.mid strong{font-size:1.4rem;font-weight:800;margin-right:6px}
.mid{font-weight:700}
.spark{margin:10px 0 4px}
.spark svg{display:block;width:100%;height:70px}
.spark__area{fill:rgba(74,222,128,.22)}
.spark__line{fill:none;stroke:var(--accent);stroke-width:2.5;vector-effect:non-scaling-stroke}
.spark figcaption{display:flex;justify-content:space-between;color:var(--muted);font-size:.8rem}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px 8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}
.stat strong{display:block;font-size:1.35rem;font-weight:800}
.stat span{color:var(--muted);font-size:.82rem;font-weight:600}
.section{margin:22px 2px 8px;color:var(--muted);font-size:.85rem;letter-spacing:.12em;text-transform:uppercase}
.table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:14px;background:var(--card)}
table{width:100%;border-collapse:collapse;font-size:.9rem}
th,td{padding:10px 8px;text-align:right;white-space:nowrap}
thead th{color:var(--muted);font-size:.75rem;text-transform:uppercase;letter-spacing:.04em}
tbody th{text-align:left}
tbody th small{display:block;color:var(--muted);font-weight:400}
tbody tr+tr{border-top:1px solid var(--line)}
td.hot{color:var(--accent);font-weight:800}
.w0{width:0px}.w1{width:4px}.w2{width:8px}.w3{width:12px}.w4{width:16px}.w5{width:20px}.w6{width:24px}.w7{width:28px}.w8{width:32px}.w9{width:36px}.w10{width:40px}
.bar{display:inline-block;height:6px;margin-right:6px;border-radius:3px;background:linear-gradient(90deg,var(--accent),#bef264);vertical-align:middle}
.stale td,.stale th{color:var(--muted)}
.lvl{padding:1px 8px;border-radius:999px;font-weight:700}
.lvl--low{background:rgba(52,211,153,.2);color:var(--ok)}
.lvl--moderate{background:rgba(251,191,36,.2);color:var(--warn)}
.lvl--high{background:rgba(248,113,113,.2);color:var(--bad)}
.note{margin:12px 2px;color:var(--muted);font-size:.85rem}
.card{padding:14px 16px;border:1px solid var(--line);border-radius:16px;background:var(--card)}
.card h2{margin:0 0 8px;font-size:1.1rem}
dl{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;margin:0}
dt{color:var(--muted)}
dd{margin:0}
.steps{margin:0;padding-left:18px;color:var(--muted)}
.steps li{margin-bottom:10px}
.steps strong{color:var(--text)}
.tabs{position:fixed;right:0;bottom:0;left:0;display:flex;justify-content:space-around;max-width:560px;margin:0 auto;padding:6px 4px calc(6px + env(safe-area-inset-bottom));background:rgba(4,20,13,.92);border-top:1px solid var(--line);backdrop-filter:blur(10px)}
.tabs a{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:56px;min-height:48px;padding:4px;color:var(--muted);text-decoration:none;font-size:.78rem;font-weight:700}
.tabs a.on{color:var(--text)}
.tabs a.on .ico{stroke:var(--accent)}
.ico{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #fde047;outline-offset:2px}
`;
