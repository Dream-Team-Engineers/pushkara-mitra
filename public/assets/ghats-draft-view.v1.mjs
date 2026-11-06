// Team review only. Submitted names and locations are unverified leads.
import { GHATS_DRAFT_STATUS, submittedGhats } from './ghats-draft.v1.mjs';

const words = {
  te: {
    heading: 'సమీక్ష కోసం సమర్పించిన ఘాట్ వివరాలు',
    warning:
      'సమీక్ష ముసాయిదా మాత్రమే. ఈ 159 పేర్లు, జిల్లాలు మరియు ప్రాంతాలు ధృవీకరించబడలేదు. ప్రయాణం లేదా భద్రత కోసం ఈ జాబితాను ఉపయోగించవద్దు.',
    unknown: 'ప్రవేశం, భద్రత, సౌకర్యాలు మరియు దారులు తెలియవు. పేర్ల అనువాదం కూడా సమీక్షలో ఉంది.',
    search: 'సమర్పించిన పేర్లు లేదా ప్రాంతాలను వెతకండి',
    matches: (count) => `${count} / ${submittedGhats.length} సమీక్ష వివరాలు కనిపిస్తున్నాయి`,
    entries: (count) => `${count} సమర్పించిన వివరాలు`,
  },
  en: {
    heading: 'Submitted ghats for team review',
    warning:
      'UNVERIFIED DRAFT. These 159 submitted names, district assignments and localities have not been checked. Do not use this list for travel or safety decisions.',
    unknown:
      'Opening, access, safety, facilities and directions are unknown. Names and translations need review.',
    search: 'Search submitted names or localities',
    matches: (count) => `${count} of ${submittedGhats.length} draft entries shown`,
    entries: (count) => `${count} submitted entries`,
  },
  hi: {
    heading: 'टीम समीक्षा के लिए जमा किए गए घाट',
    warning:
      'असत्यापित मसौदा। ये 159 नाम, जिले और स्थान जाँचे नहीं गए हैं। यात्रा या सुरक्षा के निर्णय के लिए इस सूची का उपयोग न करें।',
    unknown:
      'खुलने, पहुँच, सुरक्षा, सुविधाओं और रास्तों की स्थिति अज्ञात है। नाम और अनुवाद समीक्षा में हैं।',
    search: 'जमा किए गए नाम या स्थान खोजें',
    matches: (count) => `${count} / ${submittedGhats.length} मसौदा प्रविष्टियाँ दिखाई गईं`,
    entries: (count) => `${count} जमा की गई प्रविष्टियाँ`,
  },
};

const addText = (parent, tag, value, className = '') => {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  parent.append(node);
  return node;
};

export function mountGhatsDraft(panel, language) {
  if (GHATS_DRAFT_STATUS !== 'NEEDS_REVIEW') throw new Error('Unexpected ghat review state.');
  const labels = words[language] ?? words.en;
  const wrapper = document.createElement('section');
  wrapper.className = 'ghats-draft';
  wrapper.setAttribute('data-review-status', 'unverified');
  addText(wrapper, 'h2', labels.heading);
  addText(wrapper, 'p', labels.warning, 'ghats-draft-warning');
  addText(wrapper, 'p', labels.unknown);

  const searchLabel = addText(wrapper, 'label', labels.search);
  searchLabel.htmlFor = 'ghats-draft-search';
  const search = document.createElement('input');
  search.id = 'ghats-draft-search';
  search.type = 'search';
  search.autocomplete = 'off';
  wrapper.append(search);
  const status = addText(wrapper, 'p', labels.matches(submittedGhats.length));
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const districts = new Map();
  for (const ghat of submittedGhats) {
    if (!districts.has(ghat.district)) districts.set(ghat.district, []);
    districts.get(ghat.district).push(ghat);
  }
  const rendered = [];
  for (const [district, ghats] of districts) {
    const group = document.createElement('details');
    group.className = 'ghats-draft-district';
    addText(group, 'summary', `${district} · ${labels.entries(ghats.length)}`);
    const list = document.createElement('ul');
    for (const ghat of ghats) {
      const item = document.createElement('li');
      addText(item, 'strong', ghat.name);
      addText(item, 'span', `${ghat.mandal} · ${ghat.locality}`);
      list.append(item);
      rendered.push({ item, group, searchable: Object.values(ghat).join(' ').toLocaleLowerCase() });
    }
    group.append(list);
    wrapper.append(group);
  }

  search.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase();
    let matches = 0;
    for (const { item, group, searchable } of rendered) {
      item.hidden = !!query && !searchable.includes(query);
      if (!item.hidden) {
        matches++;
        if (query) group.open = true;
      }
    }
    for (const group of wrapper.querySelectorAll('.ghats-draft-district')) {
      group.hidden = !!query && ![...group.querySelectorAll('li')].some((item) => !item.hidden);
    }
    status.textContent = labels.matches(matches);
  });

  panel.append(wrapper);
  return wrapper;
}
