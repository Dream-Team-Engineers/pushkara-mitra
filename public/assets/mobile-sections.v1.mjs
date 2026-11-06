// Original, synthetic interface content. No external facts, contacts or services.
import { icon } from './icons.v1.mjs';
const copy = (te, en) => ({ te, en });

export const sections = [
  {
    id: 'explore',
    title: copy('విభాగాలను చూడండి', 'Explore the app'),
    intro: copy(
      'ఈ విభాగాలు యాప్ పనితీరును పరీక్షించడానికి మాత్రమే. నిజమైన ఉత్సవ సమాచారం కాదు.',
      'These sections demonstrate the mobile experience. They contain no verified festival information.',
    ),
    cards: [
      { title: copy('ఘాట్లు మరియు సౌకర్యాలు', 'Ghats and facilities'), route: 'ghats' },
      { title: copy('వసతి', 'Stays'), route: 'stays' },
      { title: copy('ప్రయాణం', 'Transport'), route: 'transport' },
      { title: copy('సాంస్కృతిక సమాచారం', 'Culture'), route: 'culture' },
      { title: copy('స్థితి', 'Conditions'), route: 'conditions' },
      { title: copy('సహాయం', 'Help'), route: 'help' },
      { title: copy('యాత్రికుల పాస్', 'Pilgrim Pass'), route: 'pass' },
      { title: copy('కలిసి ప్రయాణం', 'Travel Together'), route: 'together' },
      { title: copy('భాగస్వాములు', 'Partners'), route: 'partners' },
      { title: copy('సిబ్బంది', 'Staff'), route: 'staff' },
      { title: copy('ఈ నమూనా గురించి', 'About this prototype'), route: 'about' },
      { title: copy('నిర్మాణ సమాచారం', 'Build updates'), route: 'updates' },
    ],
  },
  {
    id: 'ghats',
    title: copy('ఘాట్లు మరియు సౌకర్యాలు', 'Ghats and facilities'),
    intro: copy(
      'నిజమైన ఘాట్ పేర్లు, అందుబాటు మరియు భద్రతా వివరాలు ధృవీకరణ తర్వాత మాత్రమే చూపుతాము.',
      'Real ghat names, access and safety details require source review before display.',
    ),
    cards: [
      {
        title: copy('నమూనా ఘాట్ కార్డు', 'Example ghat card'),
        body: copy(
          'పేరు, చేరుకునే మార్గం, సౌకర్యాలు మరియు మూలం ఇక్కడ కనిపిస్తాయి. ప్రస్తుతం ఇవి అందుబాటులో లేవు.',
          'A verified listing would show access, facilities, source and freshness. No real listing is loaded.',
        ),
        label: 'STRUCTURE ONLY',
      },
      {
        title: copy('దిశలు', 'Directions'),
        body: copy(
          'మ్యాప్ లేదా పరికర లొకేషన్ ఉపయోగించడం లేదు.',
          'Map and device location are inactive. No route or travel time is estimated.',
        ),
        label: 'UNAVAILABLE',
      },
    ],
  },
  {
    id: 'stays',
    title: copy('వసతి', 'Stays'),
    intro: copy(
      'ధృవీకరించిన వసతి జాబితాలు, ధరలు లేదా బుకింగ్‌లు ఈ నమూనాలో లేవు.',
      'No verified lodging, prices, availability or bookings are provided.',
    ),
    cards: [
      {
        title: copy('నమూనా వసతి కార్డు', 'Example stay card'),
        body: copy(
          'సమీక్షించిన పేరు, సౌకర్యాలు, మూలం మరియు సంప్రదింపు వివరాల కోసం స్థలం.',
          'Space for a reviewed name, facilities, provenance and approved contact method.',
        ),
        label: 'STRUCTURE ONLY',
      },
    ],
  },
  {
    id: 'transport',
    title: copy('ప్రయాణం', 'Transport'),
    intro: copy(
      'నిజమైన రవాణా సమయాలు లేదా మార్గాలుగా ఈ నమూనాను ఉపయోగించవద్దు.',
      'Do not use this prototype as a timetable or route guide.',
    ),
    cards: [
      {
        title: copy('బస్సు మరియు రైలు', 'Bus and rail'),
        body: copy(
          'ధృవీకరించిన సేవలు మరియు తాజా సమయాల కోసం స్థలం.',
          'A future reviewed view will show provider, route, last checked time and disruption state.',
        ),
        label: 'UNAVAILABLE',
      },
      {
        title: copy('నడక మరియు చేరిక', 'Walking and arrival'),
        body: copy(
          'అందుబాటు వివరాలు, అధికారిక సూచనలు మరియు మూలం ఇంకా లేవు.',
          'Accessibility details and official arrival guidance are awaiting verification.',
        ),
        label: 'UNAVAILABLE',
      },
    ],
  },
  {
    id: 'culture',
    title: copy('సాంస్కృతిక సమాచారం', 'Culture and preparation'),
    intro: copy(
      'ఆచారాలు మరియు కార్యక్రమాలపై విశ్వసనీయ మూలాల సమీక్ష ఇంకా అవసరం.',
      'Ritual and programme guidance needs qualified source and language review.',
    ),
    cards: [
      {
        title: copy('సన్నాహం', 'Preparation'),
        body: copy(
          'సాధారణ ప్రయాణ సన్నాహం కోసం నమూనా విభాగం. ఆచార సూచన కాదు.',
          'A sample planning section, not religious, medical or safety advice.',
        ),
        label: 'DEMO ONLY',
      },
    ],
  },
  {
    id: 'conditions',
    title: copy('స్థితి మరియు జనసందోహం', 'Weather and crowd conditions'),
    intro: copy(
      'వాతావరణం మరియు జనసందోహానికి ప్రత్యక్ష లేదా ధృవీకరించిన సమాచారం లేదు.',
      'No live or verified weather or crowd feed is connected.',
    ),
    cards: [
      {
        title: copy('వాతావరణం', 'Weather'),
        body: copy(
          'సేవ అందుబాటులో లేదు. తేదీ, ఉష్ణోగ్రత లేదా హెచ్చరికను ఊహించి చూపము.',
          'Unavailable. No temperature, forecast or warning is invented.',
        ),
        label: 'UNAVAILABLE',
      },
      {
        title: copy('జనసందోహం', 'Crowd'),
        body: copy(
          'సెన్సార్ లేదా ధృవీకరించిన సిబ్బంది సమాచారం లేదు. రద్దీ అంచనాను ప్రత్యక్షంగా చూపము.',
          'Unavailable. No heuristic crowd score is presented as a live observation.',
        ),
        label: 'UNAVAILABLE',
      },
    ],
  },
  {
    id: 'help',
    title: copy('సహాయం మరియు కలయిక', 'Help and reunite'),
    intro: copy(
      'ఈ నమూనా అత్యవసర సేవ కాదు. నివేదికలు లేదా వ్యక్తుల వివరాలను స్వీకరించదు.',
      'This prototype is not an emergency service. It does not accept reports or personal details.',
    ),
    cards: [
      {
        title: copy('అత్యవసర సంప్రదింపులు', 'Emergency contacts'),
        body: copy(
          'ధృవీకరించిన స్థానిక సంప్రదింపులు ఇంకా ప్రచురించలేదు.',
          'Verified local contacts have not been published. Use established local emergency channels.',
        ),
        label: 'UNAVAILABLE',
      },
      {
        title: copy('తప్పిపోయిన వస్తువులు లేదా వ్యక్తులు', 'Lost items or people'),
        body: copy(
          'నివేదిక, చిత్ర అప్‌లోడ్ మరియు సంప్రదింపు అభ్యర్థనలు నిలిపివేశాం.',
          'Reports, image uploads and contact requests are disabled pending safety review.',
        ),
        label: 'DISABLED',
      },
    ],
  },
  {
    id: 'pass',
    title: copy('యాత్రికుల పాస్', 'Pilgrim Pass'),
    intro: copy(
      'సైన్-ఇన్, నమోదు, QR కార్డు మరియు వ్యక్తిగత స్థితి ఇంకా ప్రారంభించలేదు.',
      'Sign-in, registration, QR card and private status are inactive.',
    ),
    cards: [
      {
        title: copy('నమోదు స్థితి', 'Registration state'),
        body: copy(
          'సర్వర్ ధృవీకరణ లేకుండా నమోదు విజయవంతమైందని చూపము. ఈ నమూనా ఏ వివరాలనూ అడగదు.',
          'No form is offered and no local action claims server-confirmed registration.',
        ),
        label: 'DISABLED',
      },
    ],
  },
  {
    id: 'together',
    title: copy('కలిసి ప్రయాణం', 'Travel Together'),
    intro: copy(
      'గ్రూప్ ఆహ్వానాలు, లొకేషన్ పంచుకోవడం మరియు SOS నిలిపివేశాం.',
      'Group invites, location sharing and SOS are disabled.',
    ),
    cards: [
      {
        title: copy('గోప్యత మరియు భద్రత', 'Privacy and safety'),
        body: copy(
          'అంగీకారం, సభ్యత్వం, గడువు మరియు స్పందన విధానం ఆమోదం పొందిన తర్వాత మాత్రమే.',
          'Consent, membership, expiry and responder handling require reviewed contracts and operators.',
        ),
        label: 'DISABLED',
      },
    ],
  },
  {
    id: 'partners',
    title: copy('సమాజ భాగస్వాములు', 'Community partners'),
    intro: copy(
      'ఆమోదించిన జాబితాలు లేదా ప్రాయోజక ప్రకటనలు ఇంకా లేవు.',
      'No approved directory or sponsor listings are published.',
    ),
    cards: [
      {
        title: copy('ప్రకటన మరియు సంప్రదింపు', 'Disclosure and contact'),
        body: copy(
          'మూలం, సంబంధం మరియు సంప్రదింపు అనుమతులు సమీక్షలో ఉన్నాయి.',
          'Provenance, disclosure and contact permissions require review. No inquiry or checkout is active.',
        ),
        label: 'UNAVAILABLE',
      },
    ],
  },
  {
    id: 'staff',
    title: copy('సిబ్బంది విభాగం', 'Staff console'),
    intro: copy(
      'అధికారిక సిబ్బంది ప్రవేశం లేదా ప్రచురణ సాధనాలు ఈ నమూనాలో లేవు.',
      'Staff access and publishing tools are not active in this prototype.',
    ),
    cards: [
      {
        title: copy('ప్రవేశ నియంత్రణ', 'Access control'),
        body: copy(
          'ఆమోదించిన గుర్తింపు, అనుమతులు మరియు ఆడిట్ నియమాలు అవసరం.',
          'Verified identity, assigned permissions and audit rules are prerequisites.',
        ),
        label: 'DISABLED',
      },
    ],
  },
];

export const sectionRoutes = sections.map(({ id }) => id);
const draftRouteLabels = {
  hi: {
    explore: 'ऐप के विभाग',
    ghats: 'घाट और सुविधाएँ',
    stays: 'ठहरने की जगह',
    transport: 'परिवहन',
    culture: 'संस्कृति और तैयारी',
    conditions: 'मौसम और भीड़ की स्थिति',
    help: 'सहायता और पुनर्मिलन',
    pass: 'यात्री पास',
    together: 'साथ यात्रा',
    partners: 'सामुदायिक साझेदार',
    staff: 'कर्मचारी विभाग',
    about: 'इस नमूने के बारे में',
    updates: 'निर्माण की जानकारी',
  },
};
const exploreIntro = {
  hi: 'ये विभाग केवल मोबाइल अनुभव की समीक्षा के लिए हैं। इनमें सत्यापित उत्सव जानकारी नहीं है।',
};
// Draft translations remain subject to native-language and safety review.
const draftSectionDetails = {
  hi: {
    ghats: {
      intro: 'वास्तविक घाटों के नाम, पहुँच और सुरक्षा विवरण स्रोत समीक्षा के बाद ही दिखाए जाएँगे।',
      cards: [
        [
          'नमूना घाट कार्ड',
          'सत्यापित सूची में पहुँच, सुविधाएँ, स्रोत और जाँच की तारीख होगी। अभी कोई वास्तविक सूची नहीं है।',
        ],
        [
          'दिशाएँ',
          'मानचित्र और उपकरण का स्थान बंद हैं। मार्ग या यात्रा समय का अनुमान नहीं दिया जाता।',
        ],
      ],
    },
    stays: {
      intro: 'इस नमूने में सत्यापित आवास, कीमतें, उपलब्धता या बुकिंग नहीं हैं।',
      cards: [
        ['नमूना आवास कार्ड', 'समीक्षित नाम, सुविधाएँ, स्रोत और स्वीकृत संपर्क विधि के लिए स्थान।'],
      ],
    },
    transport: {
      intro: 'इस नमूने को समय-सारणी या मार्गदर्शिका की तरह उपयोग न करें।',
      cards: [
        [
          'बस और रेल',
          'भविष्य में समीक्षित जानकारी प्रदाता, मार्ग, पिछली जाँच और बाधा की स्थिति दिखाएगी।',
        ],
        ['पैदल चलना और आगमन', 'सुलभता और आधिकारिक आगमन मार्गदर्शन का सत्यापन बाकी है।'],
      ],
    },
    culture: {
      intro:
        'अनुष्ठान और कार्यक्रम संबंधी मार्गदर्शन के लिए योग्य स्रोत और भाषा समीक्षा आवश्यक है।',
      cards: [
        ['तैयारी', 'यह सामान्य यात्रा तैयारी का नमूना है; धार्मिक, चिकित्सा या सुरक्षा सलाह नहीं।'],
      ],
    },
    conditions: {
      intro: 'कोई सीधा या सत्यापित मौसम या भीड़ डेटा जुड़ा नहीं है।',
      cards: [
        ['मौसम', 'उपलब्ध नहीं। तापमान, पूर्वानुमान या चेतावनी गढ़कर नहीं दिखाई जाती।'],
        ['भीड़', 'उपलब्ध नहीं। अनुमानित भीड़ अंक को सीधी जानकारी के रूप में नहीं दिखाया जाता।'],
      ],
    },
    help: {
      intro: 'यह नमूना आपात सेवा नहीं है। यह रिपोर्ट या व्यक्तिगत विवरण नहीं लेता।',
      cards: [
        [
          'आपात संपर्क',
          'सत्यापित स्थानीय संपर्क प्रकाशित नहीं हुए हैं। स्थापित स्थानीय आपात माध्यमों का उपयोग करें।',
        ],
        [
          'खोई वस्तुएँ या व्यक्ति',
          'सुरक्षा समीक्षा तक रिपोर्ट, चित्र अपलोड और संपर्क अनुरोध बंद हैं।',
        ],
      ],
    },
    pass: {
      intro: 'साइन-इन, पंजीकरण, QR कार्ड और निजी स्थिति बंद हैं।',
      cards: [
        [
          'पंजीकरण की स्थिति',
          'यहाँ कोई फ़ॉर्म नहीं है और कोई स्थानीय कार्रवाई सर्वर द्वारा पुष्टि किए गए पंजीकरण का दावा नहीं करती।',
        ],
      ],
    },
    together: {
      intro: 'समूह आमंत्रण, स्थान साझा करना और SOS बंद हैं।',
      cards: [
        [
          'गोपनीयता और सुरक्षा',
          'सहमति, सदस्यता, समाप्ति और प्रतिक्रिया प्रक्रिया के लिए समीक्षित नियम और संचालक आवश्यक हैं।',
        ],
      ],
    },
    partners: {
      intro: 'कोई स्वीकृत निर्देशिका या प्रायोजक सूची प्रकाशित नहीं है।',
      cards: [
        [
          'प्रकटीकरण और संपर्क',
          'स्रोत, संबंध और संपर्क अनुमति की समीक्षा आवश्यक है। पूछताछ या भुगतान चालू नहीं है।',
        ],
      ],
    },
    staff: {
      intro: 'इस नमूने में कर्मचारी प्रवेश या प्रकाशन उपकरण चालू नहीं हैं।',
      cards: [
        ['प्रवेश नियंत्रण', 'सत्यापित पहचान, निर्धारित अनुमतियाँ और ऑडिट नियम पहले आवश्यक हैं।'],
      ],
    },
  },
};
function routeLabel(route, language, fallback) {
  return draftRouteLabels[language]?.[route] ?? fallback;
}
export function sectionTitle(route, language) {
  const section = sections.find(({ id }) => id === route);
  return routeLabel(route, language, section?.title[language] ?? section?.title.en ?? route);
}

export function mountSections(main, language) {
  for (const section of sections) {
    let panel = document.getElementById(`route-${section.id}`);
    if (!panel) {
      panel = document.createElement('section');
      panel.id = `route-${section.id}`;
      panel.className = 'route-panel';
      panel.hidden = true;
      main.append(panel);
    }
    panel.replaceChildren();
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent =
      language === 'hi'
        ? 'स्थानीय समीक्षा नमूना'
        : language === 'te'
          ? 'స్థానిక సమీక్ష నమూనా'
          : 'ORIGINAL LOCAL REVIEW BUILD';
    const title = document.createElement('h1');
    title.id = `${section.id}-title`;
    title.textContent = sectionTitle(section.id, language);
    panel.setAttribute('aria-labelledby', title.id);
    const intro = document.createElement('p');
    intro.className = 'page-summary';
    intro.textContent =
      section.id === 'explore' && exploreIntro[language]
        ? exploreIntro[language]
        : (draftSectionDetails[language]?.[section.id]?.intro ??
          section.intro[language] ??
          section.intro.en);
    const grid = document.createElement('div');
    grid.className = 'section-card-grid';
    for (const [index, card] of section.cards.entries()) {
      if (!card.route && ['STRUCTURE ONLY', 'DEMO ONLY'].includes(card.label)) continue;
      const translatedCard = draftSectionDetails[language]?.[section.id]?.cards[index];
      const article = document.createElement(card.route ? 'a' : 'article');
      article.className = 'section-card';
      if (card.route) {
        article.classList.add('section-link-card');
        article.href = `#${card.route}`;
      }
      const symbol = document.createElement('span');
      symbol.className = `section-icon quick-icon-${card.route ?? section.id}`;
      symbol.append(icon(card.route ?? section.id));
      const cardTitle = document.createElement('h2');
      cardTitle.textContent = card.route
        ? routeLabel(card.route, language, card.title[language] ?? card.title.en)
        : (translatedCard?.[0] ?? card.title[language] ?? card.title.en);
      article.append(symbol, cardTitle);
      if (!card.route) {
        const label = document.createElement('span');
        label.className = 'tag';
        const states = {
          te: {
            'STRUCTURE ONLY': 'రూపకల్పన మాత్రమే',
            UNAVAILABLE: 'అందుబాటులో లేదు',
            DISABLED: 'నిలిపివేయబడింది',
            'DEMO ONLY': 'నమూనా మాత్రమే',
          },
          hi: {
            'STRUCTURE ONLY': 'केवल रूपरेखा',
            UNAVAILABLE: 'उपलब्ध नहीं',
            DISABLED: 'बंद',
            'DEMO ONLY': 'केवल नमूना',
          },
        };
        label.textContent = states[language]?.[card.label] ?? card.label ?? 'STRUCTURE ONLY';
        article.insertBefore(label, cardTitle);
      }
      if (card.body) {
        const body = document.createElement('p');
        body.textContent = translatedCard?.[1] ?? card.body[language] ?? card.body.en;
        article.append(body);
      }
      if (card.route) {
        const arrow = document.createElement('span');
        arrow.className = 'section-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '↗';
        article.append(arrow);
      }
      grid.append(article);
    }
    if (!grid.children.length) {
      const pending = document.createElement('div');
      pending.className = 'notice';
      pending.setAttribute('role', 'status');
      pending.textContent =
        language === 'te'
          ? 'అధికారిక సమాచారం సమీక్ష పూర్తయ్యే వరకు అందుబాటులో లేదు.'
          : language === 'hi'
            ? 'आधिकारिक जानकारी समीक्षा पूरी होने तक उपलब्ध नहीं है।'
            : 'Official information is unavailable until review is complete.';
      grid.append(pending);
    }
    panel.append(eyebrow, title, intro, grid);
  }
}
