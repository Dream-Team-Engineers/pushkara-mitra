import { verifyStaticController } from './offline-status.v1.mjs';
import { mountSections, sectionRoutes, sectionTitle } from './mobile-sections.v1.mjs';
import { icon } from './icons.v1.mjs';

const baseTelugu = Object.fromEntries(
  [...document.querySelectorAll('[data-text]')].map((element) => [
    element.dataset.text,
    element.textContent,
  ]),
);
const english = {
  prototype: 'Prototype for human review',
  brandline: 'A little clarity for your journey',
  dark: 'Dark mode',
  light: 'Light mode',
  home: 'My Pushkaram',
  plan: 'Plan your visit',
  updates: 'Build updates',
  about: 'About this prototype',
  eyebrow: 'GODAVARI · AN ORIGINAL COMPANION',
  welcome: 'Make space for a calmer journey.',
  welcomeCopy:
    'A place to bring the useful details of your pilgrimage together. This is an early public-interface prototype, still being built.',
  explore: 'Plan your visit',
  demoTitle: 'Official information is under review',
  demoCopy:
    'Dates and places will appear after review. Live travel and emergency services are not available.',
  journeys: 'YOUR COMPANION, STEP BY STEP',
  areas: 'A companion along the way',
  eightAreas: 'Eight proposed areas',
  offlineTitle: 'Small. Simple. Ready to travel.',
  offlineCopy:
    'Only these original static prototype pages are prepared for offline use. Accounts and location services are not enabled.',
  demoOnly: 'OFFICIAL INFORMATION · REVIEW PENDING',
  planTitle: 'Plan your visit.',
  planCopy: 'Official dates and places are being prepared for human review.',
  all: 'All examples',
  prepare: 'Prepare',
  care: 'Care',
  reflect: 'Reflect',
  notLive: 'Information is unavailable until review is complete',
  planBoundary:
    'Official sources for dates and places are being checked. They will be shown only after approval.',
  updatesTitle: 'Clear about what is ready.',
  publicSlice: 'The first public-page prototype',
  sliceCopy:
    'Try navigation, language selection and static offline pages. This is not a festival news feed.',
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
  exploreNav: 'Explore',
  menu: 'Menu',
  quickAccess: 'Quick access',
  quickCopy: 'Fictional images. No live information.',
  more: 'More',
  ghatsTab: 'Ghats',
  staysTab: 'Stays',
  homeTab: 'Home',
  planTab: 'Plan',
  featureDetails: 'More feature previews',
  localReview: 'PUSHKARA MITRA / LOCAL REVIEW',
  prototypeOnly: 'PROTOTYPE ONLY',
  fictionalDemo: 'FICTIONAL DEMO',
  openPrototype: 'Open prototype →',
  noRealVenue: 'No real date or venue',
  syntheticCount: 'synthetic examples',
  buildNote: 'BUILD NOTES / NO LIVE FEED',
  independentNote: 'INDEPENDENT BY DESIGN',
  translationNote:
    'Telugu and Hindi translations are unreviewed drafts. Native-language and legal review are pending. Demo content is synthetic. This prototype is not approval to launch or enable services.',
  footReview: 'Unreviewed translations · Human review pending',
};
const catalogs = {
  te: {
    ...baseTelugu,
    dark: 'డార్క్ మోడ్',
    light: 'లైట్ మోడ్',
    prototypeOnly: 'నమూనా మాత్రమే',
    fictionalDemo: 'కల్పిత నమూనా',
  },
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
    explore: 'यात्रा योजना देखें',
    areas: 'यात्रा में आपके साथ',
    demoTitle: 'आधिकारिक जानकारी की समीक्षा जारी है',
    planTitle: 'अपनी यात्रा की योजना बनाएँ।',
    all: 'सभी नमूने',
    prepare: 'तैयारी',
    care: 'देखभाल',
    reflect: 'विश्राम',
    aboutTitle: 'भरोसे से पहले स्पष्टता।',
    independent: 'एक स्वतंत्र ऐप',
    reviewTitle: 'समीक्षा अभी बाकी है',
    dark: 'डार्क मोड',
    light: 'लाइट मोड',
    menu: 'मेनू',
    exploreNav: 'और देखें',
    quickAccess: 'जल्दी पहुँचें',
    quickCopy: 'चित्र काल्पनिक हैं। कोई सीधी जानकारी नहीं है।',
    more: 'और',
    ghatsTab: 'घाट',
    staysTab: 'ठहरना',
    homeTab: 'होम',
    planTab: 'योजना',
    featureDetails: 'और नमूना सुविधाएँ',
    journeys: 'यात्रा के हर चरण में',
    eightAreas: 'आठ प्रस्तावित क्षेत्र',
    demoCopy:
      'तारीखें और स्थान समीक्षा के बाद दिखाए जाएँगे। सीधी यात्रा और आपात सेवाएँ उपलब्ध नहीं हैं।',
    offlineTitle: 'सरल और यात्रा के लिए तैयार।',
    offlineCopy:
      'केवल ये नमूना पृष्ठ ऑफलाइन उपयोग के लिए तैयार हैं। खाते और स्थान सेवाएँ चालू नहीं हैं।',
    demoOnly: 'आधिकारिक जानकारी · समीक्षा बाकी',
    planCopy: 'आधिकारिक तारीखों और स्थानों की जानकारी मानवीय समीक्षा के लिए तैयार की जा रही है।',
    notLive: 'समीक्षा पूरी होने तक जानकारी उपलब्ध नहीं है',
    planBoundary:
      'तारीखों और स्थानों के आधिकारिक स्रोतों की जाँच जारी है। स्वीकृति के बाद ही उन्हें दिखाया जाएगा।',
    footer: 'स्वतंत्र नमूना · आधिकारिक सेवा नहीं · वास्तविक कार्यक्रम जानकारी नहीं',
    reviewDetails: 'समीक्षा का विवरण',
    localReview: 'पुष्कर मित्र / स्थानीय समीक्षा',
    eyebrow: 'गोदावरी · एक स्वतंत्र साथी',
    welcomeCopy:
      'आपकी यात्रा की उपयोगी जानकारी एक जगह रखने का प्रयास। यह सार्वजनिक इंटरफ़ेस का शुरुआती नमूना है और अभी बनाया जा रहा है।',
    prototypeOnly: 'केवल नमूना',
    fictionalDemo: 'काल्पनिक नमूना',
    openPrototype: 'नमूना खोलें →',
    noRealVenue: 'कोई वास्तविक तारीख या स्थान नहीं',
    syntheticCount: 'काल्पनिक उदाहरण',
    buildNote: 'निर्माण जानकारी / सीधी खबरें नहीं',
    independentNote: 'स्वतंत्र रूप से बनाया गया',
    updatesTitle: 'जो तैयार है, उसे स्पष्ट रूप से जानें।',
    publicSlice: 'सार्वजनिक पृष्ठों का पहला नमूना',
    sliceCopy: 'नेविगेशन, भाषा चयन और स्थिर ऑफलाइन पृष्ठ जाँचें। यह उत्सव समाचार सेवा नहीं है।',
    noServices: 'व्यक्तिगत सेवाएँ उपलब्ध नहीं हैं',
    serviceBoundary:
      'इस नमूने में खाते, यात्री पास, समूह, रिपोर्ट, चैट, भुगतान और स्थान सेवाएँ चालू नहीं हैं।',
    disclaimer:
      'यह आधिकारिक सरकारी ऐप नहीं है। किसी सरकार, मंदिर संस्था या आयोजक से संबद्धता या समर्थन का दावा नहीं किया जाता।',
    privacyTitle: 'इस नमूने को आपकी जानकारी की आवश्यकता नहीं है',
    privacyCopy:
      'यहाँ साइन-इन या फ़ॉर्म नहीं हैं और स्थान नहीं माँगा जाता। भाषा और रंग के विकल्प केवल इस पृष्ठ की स्मृति में रहते हैं। होस्टिंग कनेक्शन डेटा की गोपनीयता समीक्षा बाकी है।',
    translationNote:
      'तेलुगु और हिंदी अनुवाद अभी असमीक्षित मसौदे हैं। भाषा और कानूनी समीक्षा बाकी है। उदाहरण काल्पनिक हैं। यह नमूना सेवाएँ शुरू करने की अनुमति नहीं है।',
    footReview: 'असमीक्षित अनुवाद · मानवीय समीक्षा बाकी',
  },
};
const areas = [
  {
    letter: 'M',
    key: 'my',
    title: { te: 'నా పుష్కరం', en: 'My Pushkaram', hi: 'मेरा पुष्करम' },
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
    },
    summary: {
      te: 'అధికారిక తేదీలు మరియు ప్రదేశాలు సమీక్షలో ఉన్నాయి.',
      en: 'Official dates and places await review.',
    },
    route: 'plan',
  },
  {
    letter: 'V',
    key: 'pass',
    title: { te: 'యాత్రికుల పాస్', en: 'Pilgrim Pass', hi: 'यात्री पास' },
    summary: {
      te: 'పాస్ మరియు వ్యక్తిగత నమోదులు ఇంకా అందుబాటులో లేవు.',
      en: 'Passes and personal registrations are not available.',
    },
    route: 'pass',
  },
  {
    letter: 'T',
    key: 'together',
    title: {
      te: 'కలిసి ప్రయాణిద్దాం',
      en: 'Travel together',
      hi: 'साथ यात्रा करें',
    },
    summary: {
      te: 'గ్రూపులు, లొకేషన్ మరియు SOS ప్రారంభించలేదు.',
      en: 'Groups, location sharing and SOS are not enabled.',
    },
    route: 'together',
  },
  {
    letter: 'H',
    key: 'help',
    title: {
      te: 'సహాయం మరియు కలయిక',
      en: 'Help & reunite',
      hi: 'सहायता और मिलन',
    },
    summary: {
      te: 'నివేదికలు లేదా అత్యవసర సేవలు అందుబాటులో లేవు.',
      en: 'Reporting and emergency services are not available.',
    },
    route: 'help',
  },
  {
    letter: 'U',
    key: 'updates',
    title: {
      te: 'ఉత్సవ సమాచారం',
      en: 'Festival updates',
      hi: 'उत्सव की जानकारी',
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
    },
    summary: {
      te: 'సమీక్షించిన జాబితాలు లేదా ప్రకటనలు ఇంకా లేవు.',
      en: 'Reviewed listings and sponsorships are not available.',
    },
    route: 'partners',
  },
  {
    letter: 'S',
    key: 'staff',
    title: { te: 'సిబ్బంది విభాగం', en: 'Staff console', hi: 'कर्मचारी कक्ष' },
    summary: {
      te: 'సిబ్బంది సైన్-ఇన్ లేదా నిర్వాహక సేవలు లేవు.',
      en: 'Staff sign-in and administrative services are not available.',
    },
    route: 'staff',
  },
];
let language = 'te';
let offlineReady = false;
const text = (key) => catalogs[language][key] ?? english[key] ?? baseTelugu[key] ?? key;
const localized = (values) => values[language] ?? values.en;
const draftAreaSummaries = {
  hi: {
    home: 'यह नमूना, भाषा और रंग के विकल्प।',
    plan: 'आधिकारिक तारीखों और स्थानों की समीक्षा बाकी है।',
    pass: 'पास और व्यक्तिगत पंजीकरण उपलब्ध नहीं हैं।',
    together: 'समूह, स्थान साझा करना और SOS चालू नहीं हैं।',
    help: 'रिपोर्ट और आपात सेवाएँ उपलब्ध नहीं हैं।',
    updates: 'नमूने की निर्माण जानकारी; सीधी उत्सव खबरें नहीं।',
    partners: 'समीक्षित सूचियाँ या प्रायोजन उपलब्ध नहीं हैं।',
    staff: 'कर्मचारी प्रवेश और प्रशासनिक सेवाएँ उपलब्ध नहीं हैं।',
  },
};
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
    const isLink = area.route && area.route !== 'home';
    const card = element(isLink ? 'a' : 'article', 'area-card');
    if (isLink) card.href = `#${area.route}`;
    const imageRoute =
      { home: 'ghats', pass: 'plan', together: 'help', partners: 'help', staff: 'updates' }[
        area.route
      ] ?? area.route;
    const picture = element('span', `area-image quick-icon-${imageRoute}`);
    picture.setAttribute('aria-hidden', 'true');
    picture.append(icon(area.route === 'home' ? 'home' : area.route));
    const content = element('div', 'area-content');
    content.append(
      element('h3', '', localized(area.title)),
      element('p', '', draftAreaSummaries[language]?.[area.route] ?? localized(area.summary)),
      element('span', 'tag', text('prototypeOnly')),
    );
    card.append(picture, content);
    if (isLink) {
      const arrow = element('span', 'area-arrow', '→');
      arrow.setAttribute('aria-hidden', 'true');
      card.append(arrow);
    }
    grid.append(card);
  }
}
const quickRoutes = [
  'plan',
  'ghats',
  'stays',
  'transport',
  'culture',
  'conditions',
  'help',
  'updates',
];
const quickNames = {
  te: {
    plan: 'ప్రణాళిక',
    ghats: 'ఘాట్లు',
    stays: 'వసతి',
    transport: 'రవాణా',
    culture: 'సంస్కృతి',
    conditions: 'స్థితి',
    help: 'సహాయం',
    updates: 'నమూనా సమాచారం',
  },
  en: {
    plan: 'Plan',
    ghats: 'Ghats',
    stays: 'Stays',
    transport: 'Travel',
    culture: 'Culture',
    conditions: 'Conditions',
    help: 'Help',
    updates: 'Build notes',
  },
  hi: {
    plan: 'योजना',
    ghats: 'घाट',
    stays: 'ठहरना',
    transport: 'परिवहन',
    culture: 'संस्कृति',
    conditions: 'स्थिति',
    help: 'सहायता',
    updates: 'निर्माण जानकारी',
  },
};
function routeLabel(route) {
  return sectionRoutes.includes(route) ? sectionTitle(route, language) : text(route);
}
function renderQuickAccess() {
  const grid = document.getElementById('quick-grid');
  grid.replaceChildren();
  for (const route of quickRoutes) {
    const link = element('a', 'quick-tile');
    link.href = `#${route}`;
    const symbol = element('span', `quick-icon quick-icon-${route}`);
    symbol.append(icon(route));
    link.append(
      symbol,
      element('span', 'quick-name', quickNames[language]?.[route] ?? routeLabel(route)),
    );
    grid.append(link);
  }
}
function decorateNavigation() {
  document
    .querySelectorAll('.primary-nav a[data-route], .bottom-nav a[data-route]')
    .forEach((link) => {
      if (!link.querySelector('svg')) link.prepend(icon(link.dataset.route));
    });
}
function updateOfflineStatus() {
  const messages = {
    te: [
      'స్థిర పేజీలు ఆఫ్‌లైన్‌కు సిద్ధంగా ఉన్నాయి · ప్రత్యక్ష సేవలు లేవు',
      'ఆఫ్‌లైన్ · నమూనా స్థిర పేజీలు మాత్రమే',
      'ప్రస్తుత నమూనా ఆఫ్‌లైన్‌లో ధృవీకరించబడలేదు · ప్రత్యక్ష సేవలు లేవు',
    ],
    en: [
      'Static pages ready offline · No live services',
      'Offline · Static prototype pages only',
      'Current static revision not verified offline · No live services',
    ],
    hi: [
      'स्थिर पृष्ठ ऑफलाइन तैयार हैं · कोई सीधी सेवा नहीं',
      'ऑफलाइन · केवल नमूना पृष्ठ',
      'वर्तमान नमूना ऑफलाइन सत्यापित नहीं है · कोई सीधी सेवा नहीं',
    ],
  };
  const status = document.getElementById('offline-status');
  const state = offlineReady ? (navigator.onLine ? 0 : 1) : 2;
  status.dataset.offlineState = ['ready-online', 'ready-offline', 'not-verified'][state];
  status.textContent = messages[language][state];
}
function applyLanguage(value) {
  language = Object.hasOwn(catalogs, value) ? value : 'te';
  document.documentElement.lang = language;
  document.querySelectorAll('[data-text]').forEach((node) => {
    node.textContent = text(node.dataset.text);
  });
  document.getElementById('theme').querySelector('[data-text]').textContent = text(
    document.body.classList.contains('dark') ? 'light' : 'dark',
  );
  renderAreas();
  renderQuickAccess();
  mountSections(document.getElementById('main'), language);
  decorateNavigation();
  updateOfflineStatus();
}
function navigate(focus = false) {
  const requested = window.location.hash.slice(1);
  const route = ['home', 'plan', 'updates', 'about', ...sectionRoutes].includes(requested)
    ? requested
    : 'home';
  document.querySelectorAll('.route-panel').forEach((panel) => {
    panel.hidden = panel.id !== `route-${route}`;
  });
  document.querySelectorAll('[data-route]').forEach((link) => {
    const isMoreRoute = !['home', 'ghats', 'plan', 'stays'].includes(route);
    if (
      link.dataset.route === route ||
      (link.closest('.bottom-nav') && link.dataset.route === 'explore' && isMoreRoute)
    )
      link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.title = `Pushkara Mitra · ${sectionRoutes.includes(route) ? sectionTitle(route, language) : text(route)} · Prototype`;
  document.getElementById('mobile-menu-button').setAttribute('aria-expanded', 'false');
  if (focus) {
    document.getElementById('main').focus();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}
const mobileMenuButton = document.getElementById('mobile-menu-button');
mobileMenuButton.addEventListener('click', () => {
  const open = mobileMenuButton.getAttribute('aria-expanded') === 'true';
  mobileMenuButton.setAttribute('aria-expanded', String(!open));
});
document.getElementById('primary-nav').addEventListener('click', (event) => {
  if (event.target.closest('a[data-route]')) {
    mobileMenuButton.setAttribute('aria-expanded', 'false');
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mobileMenuButton.getAttribute('aria-expanded') === 'true') {
    mobileMenuButton.setAttribute('aria-expanded', 'false');
    mobileMenuButton.focus();
  }
});
document.getElementById('language').addEventListener('change', (event) => {
  applyLanguage(event.target.value);
  navigate();
});
document.getElementById('theme').addEventListener('click', () => {
  const dark = document.body.classList.toggle('dark');
  document.getElementById('theme').setAttribute('aria-pressed', String(dark));
  document.getElementById('theme').querySelector('[data-text]').textContent = text(
    dark ? 'light' : 'dark',
  );
});
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
