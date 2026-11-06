// Original line icons for the local review interface. Decorative SVGs inherit currentColor.
const paths = {
  home: '<path d="M3.5 11 12 4l8.5 7M5.8 9.7V20h12.4V9.7M9.5 20v-5.5h5V20"/><path d="M9 7.5h6"/>',
  plan: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M8 3.5v4M16 3.5v4M4 10h16M8 15l2.2 2 5-4.5"/>',
  ghats:
    '<path d="M4 6.5h7M4 9.5h5M4 12.5h3M4 16c2.7-1.8 5.3-1.8 8 0s5.3 1.8 8 0M4 20c2.7-1.8 5.3-1.8 8 0s5.3 1.8 8 0"/><circle cx="17.5" cy="7" r="2"/>',
  stays:
    '<path d="M3.5 11 12 4l8.5 7M5.5 10v9h13v-9M3.5 19h17M9.5 19v-5h5v5"/><path d="M10 7.5h4"/>',
  transport:
    '<rect x="5" y="4" width="14" height="14" rx="4"/><path d="M5 11h14M8 18v2m8-2v2M8.5 7.5h7M8.5 15h.01M15.5 15h.01"/>',
  culture:
    '<path d="M5 15c1 3 3.5 4.5 7 4.5s6-1.5 7-4.5H5ZM12 13.5c-2-2.3-1.4-4.2 0-6 1.4 1.8 2 3.7 0 6ZM5 21h14M6 6l1 1m11-1-1 1"/>',
  conditions:
    '<path d="M7 18h10a3 3 0 0 0 .3-6A5.5 5.5 0 0 0 7 10.5 3.8 3.8 0 0 0 7 18ZM5 5l1 1M10 3v1.5M15 5l-1 1"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1.1 1-1.7 1.5-1.7 3.2m0 3h.01"/>',
  updates: '<path d="M5 4h14v16H5zM8 8h8m-8 4h8m-8 4h5"/>',
  explore:
    '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9zM12 3.5v1.4M12 19.1v1.4"/>',
  pass: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c1-2 5-2 6 0m3-6h3m-3 4h3"/>',
  together:
    '<circle cx="8" cy="9" r="2"/><circle cx="16" cy="9" r="2"/><path d="M3 19v-2a4 4 0 0 1 8 0v2m2 0v-2a4 4 0 0 1 8 0v2"/>',
  partners: '<path d="M3 9 8 5l4 3 4-3 5 4-5 6-4-2-4 2zM3 9l5 6 4-2m9-4-5 6-4-2"/>',
  staff: '<circle cx="12" cy="8" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2H5Zm2-8h10"/>',
  about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
};

export function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.65');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = paths[name] ?? paths.explore;
  return svg;
}
