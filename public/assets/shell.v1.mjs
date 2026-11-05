import { verifyStaticController } from './offline-status.v1.mjs';

const baseTelugu = Object.fromEntries(
  [...document.querySelectorAll('[data-text]')].map((element) => [
    element.dataset.text,
    element.textContent,
  ]),
);
const english = {
  prototype: 'Prototype for human review',
  brandline: 'A little clarity for your journey',
  dark: 'Dark appearance',
  light: 'Light appearance',
  home: 'My Pushkaram',
  plan: 'Plan your visit',
  updates: 'Build updates',
  about: 'About this prototype',
  eyebrow: 'GODAVARI · AN ORIGINAL COMPANION',
  welcome: 'Make space for a calmer journey.',
  welcomeCopy:
    'A place to bring the useful details of your pilgrimage together. This is an early public-interface prototype, still being built.',
  explore: 'Explore the demo plan',
  demoTitle: 'These are not real festival events',
  demoCopy:
    'Activities here are synthetic test fixtures. Verified dates, travel information and emergency services are not available in this prototype.',
  journeys: 'YOUR COMPANION, STEP BY STEP',
  areas: 'A companion along the way',
  eightAreas: 'Eight proposed areas',
  offlineTitle: 'Small. Simple. Ready to travel.',
  offlineCopy:
    'Only these original static prototype pages are prepared for offline use. Accounts and location services are not enabled.',
  demoOnly: 'SYNTHETIC FIXTURES · NOT AN EVENT SCHEDULE',
  planTitle: 'Imagine a simpler plan.',
  planCopy:
    'Fictional examples to test filters and navigation. There are no bookings, event dates or real venues.',
  all: 'All examples',
  prepare: 'Prepare',
  care: 'Care',
  reflect: 'Reflect',
  notLive: 'This is not a live service',
  planBoundary:
    'Verified dates, maps, stays and travel advice require source review before they are added.',
  updatesTitle: 'Clear about what is ready.',
  publicSlice: 'The first public-page prototype',
  sliceCopy:
    'Try navigation, language selection, demo filters and static offline pages. This is not a festival news feed.',
  noServices: 'Personal services are not available',
  serviceBoundary:
    'Accounts, pilgrim passes, groups, reports, chat, payments and location services have not been enabled in this prototype.',
  aboutTitle: 'Clarity comes before trust.',
  independent: 'An independent app',
  disclaimer:
    'This is not an official government application. No affiliation with, or endorsement by, any government, temple body or event organizer is claimed.',
  privacyTitle: 'This prototype does not need your information',
  privacyCopy:
    'The app has no sign-in or forms and does not request location. Language and appearance choices remain only in this page’s memory. Hosting connection-data handling still needs privacy review.',
  reviewTitle: 'Review is still needed',
  footer: 'Independent prototype · Not an official service · No real event information',
  reviewDetails: 'Review details',
};
const catalogs = {
  te: { ...baseTelugu },
  en: english,
  hi: {
    ...english,
    prototype: 'मानव समीक्षा के लिए नमूना',
    brandline: 'आपकी यात्रा में थोड़ी स्पष्टता',
    home: 'मेरा पुष्करम',
    plan: 'यात्रा की योजना',
    updates: 'निर्माण की जानकारी',
    about: 'इस नमूने के बारे में',
    welcome: 'एक शांत यात्रा की शुरुआत।',
    explore: 'नमूना योजना देखें',
    areas: 'यात्रा में आपके साथ',
    demoTitle: 'ये वास्तविक कार्यक्रम नहीं हैं',
    planTitle: 'एक सरल योजना की कल्पना करें।',
    all: 'सभी नमूने',
    prepare: 'तैयारी',
    care: 'देखभाल',
    reflect: 'विश्राम',
    aboutTitle: 'भरोसे से पहले स्पष्टता।',
    independent: 'एक स्वतंत्र ऐप',
    reviewTitle: 'समीक्षा अभी बाकी है',
    dark: 'गहरा रंग',
    light: 'हल्का रंग',
  },
  mr: {
    ...english,
    prototype: 'मानवी पुनरावलोकनासाठी नमुना',
    brandline: 'तुमच्या प्रवासासाठी थोडी स्पष्टता',
    home: 'माझे पुष्करम',
    plan: 'प्रवासाचे नियोजन',
    updates: 'निर्मितीची माहिती',
    about: 'या नमुन्याबद्दल',
    welcome: 'शांत प्रवासाची सुरुवात.',
    explore: 'नमुना योजना पाहा',
    areas: 'प्रवासात तुमची साथ',
    demoTitle: 'हे खरे कार्यक्रम नाहीत',
    planTitle: 'एका सोप्या योजनेची कल्पना करा.',
    all: 'सर्व नमुने',
    prepare: 'तयारी',
    care: 'काळजी',
    reflect: 'विश्रांती',
    aboutTitle: 'विश्वासापूर्वी स्पष्टता.',
    independent: 'एक स्वतंत्र ॲप',
    reviewTitle: 'पुनरावलोकन बाकी आहे',
    dark: 'गडद रंग',
    light: 'फिकट रंग',
  },
};
const areas = [
  {
    letter: 'M',
    key: 'my',
    title: { te: 'నా పుష్కరం', en: 'My Pushkaram', hi: 'मेरा पुष्करम', mr: 'माझे पुष्करम' },
    summary: {
      te: 'ఈ నమూనా, భాష మరియు రంగు ఎంపికలు.',
      en: 'This prototype, language and appearance choices.',
    },
    route: 'home',
  },
  {
    letter: 'P',
    key: 'plan',
    title: {
      te: 'యాత్ర ప్రణాళిక',
      en: 'Plan your visit',
      hi: 'यात्रा की योजना',
      mr: 'प्रवासाचे नियोजन',
    },
    summary: {
      te: 'కల్పిత ఉదాహరణలతో ప్రణాళిక ఫిల్టర్లు చూడండి.',
      en: 'Explore planning filters with fictional examples.',
    },
    route: 'plan',
  },
  {
    letter: 'V',
    key: 'pass',
    title: { te: 'యాత్రికుల పాస్', en: 'Pilgrim Pass', hi: 'यात्री पास', mr: 'यात्रेकरू पास' },
    summary: {
      te: 'పాస్ మరియు వ్యక్తిగత నమోదులు ఇంకా అందుబాటులో లేవు.',
      en: 'Passes and personal registrations are not available.',
    },
  },
  {
    letter: 'T',
    key: 'together',
    title: {
      te: 'కలిసి ప్రయాణిద్దాం',
      en: 'Travel together',
      hi: 'साथ यात्रा करें',
      mr: 'एकत्र प्रवास',
    },
    summary: {
      te: 'గ్రూపులు, లొకేషన్ మరియు SOS ప్రారంభించలేదు.',
      en: 'Groups, location sharing and SOS are not enabled.',
    },
  },
  {
    letter: 'H',
    key: 'help',
    title: {
      te: 'సహాయం మరియు కలయిక',
      en: 'Help & reunite',
      hi: 'सहायता और मिलन',
      mr: 'मदत आणि पुनर्भेट',
    },
    summary: {
      te: 'నివేదికలు లేదా అత్యవసర సేవలు అందుబాటులో లేవు.',
      en: 'Reporting and emergency services are not available.',
    },
  },
  {
    letter: 'U',
    key: 'updates',
    title: {
      te: 'ఉత్సవ సమాచారం',
      en: 'Festival updates',
      hi: 'उत्सव की जानकारी',
      mr: 'उत्सवाची माहिती',
    },
    summary: {
      te: 'నమూనా పనితీరు గురించి తెలుసుకోండి. నిజమైన వార్తలు కావు.',
      en: 'Read prototype build notes, not live festival news.',
    },
    route: 'updates',
  },
  {
    letter: 'C',
    key: 'partners',
    title: {
      te: 'సమాజ భాగస్వాములు',
      en: 'Community partners',
      hi: 'सामुदायिक साझेदार',
      mr: 'समुदाय भागीदार',
    },
    summary: {
      te: 'సమీక్షించిన జాబితాలు లేదా ప్రకటనలు ఇంకా లేవు.',
      en: 'Reviewed listings and sponsorships are not available.',
    },
  },
  {
    letter: 'S',
    key: 'staff',
    title: { te: 'సిబ్బంది విభాగం', en: 'Staff console', hi: 'कर्मचारी कक्ष', mr: 'कर्मचारी कक्ष' },
    summary: {
      te: 'సిబ్బంది సైన్-ఇన్ లేదా నిర్వాహక సేవలు లేవు.',
      en: 'Staff sign-in and administrative services are not available.',
    },
  },
];
const demoEvents = [
  {
    code: 'A',
    category: 'prepare',
    title: {
      te: 'నమూనా పరిచయ సమావేశం',
      en: 'Example orientation',
      hi: 'नमूना परिचय',
      mr: 'नमुना परिचय',
    },
    detail: {
      te: 'తీసుకెళ్లవలసిన వస్తువుల గురించి ఒక కల్పిత చర్చ.',
      en: 'A fictional discussion about preparing a small travel bag.',
    },
  },
  {
    code: 'B',
    category: 'care',
    title: {
      te: 'నమూనా నది సంరక్షణ చర్చ',
      en: 'Example river-care conversation',
      hi: 'नदी की देखभाल का नमूना',
      mr: 'नदीची काळजी — नमुना',
    },
    detail: {
      te: 'కేవలం ఇంటర్‌ఫేస్ పరీక్ష కోసం ఒక కల్పిత ఉదాహరణ.',
      en: 'An invented example used only to test this interface.',
    },
  },
  {
    code: 'C',
    category: 'reflect',
    title: {
      te: 'నమూనా విశ్రాంతి సమయం',
      en: 'Example quiet pause',
      hi: 'नमूना विश्राम',
      mr: 'विश्रांतीचा नमुना',
    },
    detail: {
      te: 'నిజమైన కార్యక్రమం, స్థలం లేదా సమయం కాదు.',
      en: 'Not a real activity, venue or time.',
    },
  },
];
let language = 'te';
let activeFilter = 'all';
let offlineReady = false;
const text = (key) => catalogs[language][key] ?? english[key] ?? baseTelugu[key] ?? key;
const localized = (values) => values[language] ?? values.en;
function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content) node.textContent = content;
  return node;
}
function renderAreas() {
  const grid = document.getElementById('area-grid');
  grid.replaceChildren();
  for (const area of areas) {
    const card = element('article', 'area-card');
    const top = element('div', 'area-top');
    top.append(
      element('span', 'area-letter', area.letter),
      element('span', 'tag', area.route ? 'PROTOTYPE ONLY' : 'NOT AVAILABLE'),
    );
    card.append(
      top,
      element('h3', '', localized(area.title)),
      element('p', '', localized(area.summary)),
    );
    if (area.route && area.route !== 'home') {
      const link = element('a', '', language === 'te' ? 'నమూనా చూడండి >' : 'Open prototype >');
      link.href = `#${area.route}`;
      card.append(link);
    }
    grid.append(card);
  }
}
function renderEvents() {
  const list = document.getElementById('event-list');
  list.replaceChildren();
  const matches = demoEvents.filter(
    (event) => activeFilter === 'all' || event.category === activeFilter,
  );
  for (const event of matches) {
    const card = element('article', 'event-card');
    const content = element('div');
    content.append(
      element('span', 'tag', 'FICTIONAL DEMO'),
      element('h2', '', localized(event.title)),
      element('p', '', localized(event.detail)),
      element(
        'p',
        'small-label',
        language === 'te' ? 'నిజమైన తేదీ లేదా స్థలం లేదు' : 'No real date or venue',
      ),
    );
    card.append(element('div', 'event-code', event.code), content);
    list.append(card);
  }
  document.getElementById('result-count').textContent =
    language === 'te'
      ? `${matches.length} కల్పిత ఉదాహరణలు`
      : `${matches.length} synthetic examples`;
}
function updateOfflineStatus() {
  document.getElementById('offline-status').textContent = offlineReady
    ? navigator.onLine
      ? 'Static pages ready offline · No live services'
      : 'Offline · Static prototype pages only'
    : 'Current static revision not verified offline · No live services';
}
function applyLanguage(value) {
  language = Object.hasOwn(catalogs, value) ? value : 'te';
  document.documentElement.lang = language;
  document.querySelectorAll('[data-text]').forEach((node) => {
    node.textContent = text(node.dataset.text);
  });
  document.getElementById('theme').querySelector('span').textContent = text(
    document.body.classList.contains('dark') ? 'light' : 'dark',
  );
  renderAreas();
  renderEvents();
}
function navigate(focus = false) {
  const requested = window.location.hash.slice(1);
  const route = ['home', 'plan', 'updates', 'about'].includes(requested) ? requested : 'home';
  document.querySelectorAll('.route-panel').forEach((panel) => {
    panel.hidden = panel.id !== `route-${route}`;
  });
  document.querySelectorAll('[data-route]').forEach((link) => {
    if (link.dataset.route === route) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.title = `Pushkara Mitra · ${text(route)} · Prototype`;
  if (focus) {
    document.getElementById('main').focus();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}
document.getElementById('language').addEventListener('change', (event) => {
  applyLanguage(event.target.value);
  navigate();
});
document.getElementById('theme').addEventListener('click', () => {
  const dark = document.body.classList.toggle('dark');
  document.getElementById('theme').setAttribute('aria-pressed', String(dark));
  document.getElementById('theme').querySelector('span').textContent = text(
    dark ? 'light' : 'dark',
  );
});
document.querySelectorAll('[data-filter]').forEach((button) =>
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((item) => {
      item.setAttribute('aria-pressed', String(item === button));
    });
    renderEvents();
  }),
);
document.querySelector('.skip-link').addEventListener('click', (event) => {
  event.preventDefault();
  document.getElementById('main').focus();
});
window.addEventListener('hashchange', () => navigate(true));
window.addEventListener('online', updateOfflineStatus);
window.addEventListener('offline', updateOfflineStatus);
applyLanguage('te');
navigate();
// Only the current controller can acknowledge the expected complete static cache.
let offlineCheck = 0;
async function verifyOfflineController() {
  const check = ++offlineCheck;
  offlineReady = false;
  updateOfflineStatus();
  const controller = navigator.serviceWorker.controller;
  const verified = await verifyStaticController(controller);
  if (check !== offlineCheck || controller !== navigator.serviceWorker.controller) return;
  offlineReady = verified;
  updateOfflineStatus();
}
function watchInstallation(worker) {
  if (!worker) return;
  offlineCheck++;
  offlineReady = false;
  updateOfflineStatus();
  worker.addEventListener('statechange', () => {
    if (worker.state === 'redundant') {
      offlineCheck++;
      offlineReady = false;
      updateOfflineStatus();
    } else if (worker.state === 'activated') {
      void verifyOfflineController();
    }
  });
}
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    void verifyOfflineController();
  });
  navigator.serviceWorker
    .register('/sw.js', { updateViaCache: 'none' })
    .then((registration) => {
      watchInstallation(registration.installing);
      registration.addEventListener('updatefound', () =>
        watchInstallation(registration.installing),
      );
      return navigator.serviceWorker.ready;
    })
    .then(() => {
      // ready may describe an older worker; only a versioned cache response counts.
      void verifyOfflineController();
    })
    .catch(() => {
      offlineCheck++;
      offlineReady = false;
      updateOfflineStatus();
    });
}
