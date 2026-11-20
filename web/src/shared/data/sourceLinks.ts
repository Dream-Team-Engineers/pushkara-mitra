import type { IconName } from '../ui/Icon';
import type { Locale } from '../i18n/i18n';

/**
 * Outbound links to official or primary sources for travel, stay, culture and maps. Pushkara Mitra
 * only links: it holds no prices, timetables or availability, and takes no booking or payment.
 *
 * `checked` is the date the agent opened the page itself (2026-11-19). Entries the agent could not
 * open (a site blocked automated access, or the page was not reached) carry `checked: null` and
 * show an "owner to confirm" label until the owner has checked them.
 * Telugu and Hindi wording was reviewed by the owner (owner statement 2026-11-19).
 */
export type Localised = Readonly<Record<Locale, string>>;

export interface SourceLink {
  readonly id: string;
  readonly icon: IconName;
  readonly title: Localised;
  readonly note: Localised;
  readonly publisher: string;
  readonly url: string;
  readonly checked: string | null;
}

const L = (en: string, te: string, hi: string): Localised => ({ en, te, hi });
const DISTRICT = 'East Godavari District, Govt. of Andhra Pradesh';

export const TRAVEL_LINKS: readonly SourceLink[] = [
  {
    id: 'irctc',
    icon: 'train',
    title: L('Train tickets (IRCTC)', 'రైలు టికెట్లు (IRCTC)', 'रेल टिकट (IRCTC)'),
    note: L(
      'Official railway booking. Search Rajamahendravaram (RJY) or Kovvur.',
      'అధికారిక రైల్వే బుకింగ్. రాజమహేంద్రవరం (RJY) లేదా కొవ్వూరు వెతకండి.',
      'आधिकारिक रेल बुकिंग। राजमहेंद्रवरम (RJY) या कोव्वूर खोजें।',
    ),
    publisher: 'IRCTC',
    url: 'https://www.irctc.co.in/',
    checked: '2026-11-19',
  },
  {
    id: 'apsrtc',
    icon: 'bus',
    title: L('Bus tickets (APSRTC)', 'బస్సు టికెట్లు (APSRTC)', 'बस टिकट (APSRTC)'),
    note: L(
      'Andhra Pradesh state bus booking.',
      'ఆంధ్రప్రదేశ్ ఆర్టీసీ బస్సు బుకింగ్.',
      'आंध्र प्रदेश राज्य बस बुकिंग।',
    ),
    publisher: 'APSRTC',
    url: 'https://www.apsrtconline.in/',
    checked: null,
  },
  {
    id: 'aai-rja',
    icon: 'plane',
    title: L('Rajahmundry Airport (RJA)', 'రాజమండ్రి విమానాశ్రయం (RJA)', 'राजमुंदरी हवाई अड्डा (RJA)'),
    note: L(
      'Airports Authority of India, for airport information. Book flights with the airline.',
      'విమానాశ్రయ సమాచారం కోసం ఎయిర్‌పోర్ట్స్ అథారిటీ. టికెట్లు విమాన సంస్థ వద్ద.',
      'हवाई अड्डे की जानकारी के लिए AAI। टिकट एयरलाइन से लें।',
    ),
    publisher: 'Airports Authority of India',
    url: 'https://www.aai.aero/',
    checked: null,
  },
  {
    id: 'district-pushkaralu',
    icon: 'info',
    title: L(
      'Official Pushkaralu page (East Godavari)',
      'అధికారిక పుష్కరాల పేజీ (తూర్పు గోదావరి)',
      'आधिकारिक पुष्करालु पृष्ठ (पूर्व गोदावरी)',
    ),
    note: L(
      'District page with dates and ghats. It lists a transport section; details are not yet published.',
      'తేదీలు, ఘాట్లతో జిల్లా పేజీ. రవాణా విభాగం ఉంది; వివరాలు ఇంకా లేవు.',
      'तिथियों और घाटों वाला जिला पृष्ठ। परिवहन अनुभाग है; विवरण अभी नहीं।',
    ),
    publisher: DISTRICT,
    url: 'https://eastgodavari.ap.gov.in/godavari-pushkaralu-2027/',
    checked: '2026-11-19',
  },
];

export const STAY_LINKS: readonly SourceLink[] = [
  {
    id: 'district-hotels',
    icon: 'bed',
    title: L('Hotels and accommodation list', 'హోటళ్లు మరియు వసతి జాబితా', 'होटल और आवास सूची'),
    note: L(
      'District list for Rajamahendravaram and Kovvur (indicative, updated 28.11.2025). Includes APTDC Haritha and planned pilgrim rest centres.',
      'రాజమహేంద్రవరం, కొవ్వూరు జాబితా (సూచనాత్మకం, 28.11.2025). APTDC హరిత, యాత్రికుల విశ్రాంతి కేంద్రాలు.',
      'राजमहेंद्रवरम और कोव्वूर की सूची (सांकेतिक, 28.11.2025)। APTDC हरिता और तीर्थयात्री विश्राम केंद्र।',
    ),
    publisher: DISTRICT,
    url: 'https://eastgodavari.ap.gov.in/Hotels',
    checked: '2026-11-19',
  },
  {
    id: 'district-pushkaralu-stay',
    icon: 'info',
    title: L('Pushkaralu stay plans', 'పుష్కరాల వసతి ఏర్పాట్లు', 'पुष्करालु आवास व्यवस्था'),
    note: L(
      'The district page mentions short stays, homestays and pilgrim rest centres. Details are not yet published.',
      'స్వల్పకాల వసతి, హోమ్‌స్టేలు, విశ్రాంతి కేంద్రాలు ప్రస్తావించారు. వివరాలు ఇంకా లేవు.',
      'अल्पकालिक आवास, होमस्टे और विश्राम केंद्रों का उल्लेख है। विवरण अभी प्रकाशित नहीं।',
    ),
    publisher: DISTRICT,
    url: 'https://eastgodavari.ap.gov.in/godavari-pushkaralu-2027/',
    checked: '2026-11-19',
  },
];

export const CULTURE_LINKS: readonly SourceLink[] = [
  {
    id: 'religious-tourism',
    icon: 'temple',
    title: L('Temples and sacred places', 'ఆలయాలు మరియు పుణ్యక్షేత్రాలు', 'मंदिर और पवित्र स्थल'),
    note: L(
      'Temples around Rajamahendravaram, from the district tourism page.',
      'రాజమహేంద్రవరం చుట్టూ ఆలయాలు, జిల్లా పర్యాటక పేజీ నుండి.',
      'राजमहेंद्रवरम के आसपास के मंदिर, जिला पर्यटन पृष्ठ से।',
    ),
    publisher: DISTRICT,
    url: 'https://eastgodavari.ap.gov.in/religious-tourism/',
    checked: '2026-11-19',
  },
  {
    id: 'cultural-tourism',
    icon: 'partners',
    title: L('Culture and heritage', 'సంస్కృతి మరియు వారసత్వం', 'संस्कृति और विरासत'),
    note: L(
      'Cultural tourism page of the district.',
      'జిల్లా సాంస్కృతిక పర్యాటక పేజీ.',
      'जिले का सांस्कृतिक पर्यटन पृष्ठ।',
    ),
    publisher: DISTRICT,
    url: 'https://eastgodavari.ap.gov.in/cultural-tourism/',
    checked: '2026-11-19',
  },
  {
    id: 'wiki-pushkaram',
    icon: 'book',
    title: L('About Godavari Pushkaram', 'గోదావరి పుష్కరం గురించి', 'गोदावरी पुष्करम के बारे में'),
    note: L(
      'Background on the 12-year cycle, the holy dip and related rituals (Wikipedia, not an official source).',
      '12 ఏళ్ల చక్రం, పుణ్యస్నానం, ఆచారాల నేపథ్యం (వికీపీడియా, అధికారిక మూలం కాదు).',
      '12 वर्ष के चक्र, पवित्र स्नान और अनुष्ठानों की पृष्ठभूमि (विकिपीडिया, आधिकारिक स्रोत नहीं)।',
    ),
    publisher: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Godavari_Pushkaram',
    checked: '2026-11-19',
  },
];

export interface SignificanceNote {
  readonly id: string;
  readonly text: Localised;
  readonly source: string;
}

/**
 * Cultural significance as stated on the district's Pushkaralu and Religious Tourism pages and in
 * the Wikipedia article (all read 2026-11-19). Short and attributed; not a religious authority.
 * A priest or temple should be asked about the details of any ritual.
 */
export const SIGNIFICANCE: readonly SignificanceNote[] = [
  {
    id: 'cycle',
    text: L(
      'Pushkaralu is held once every 12 years, when Jupiter (Guru) is in Simha (Leo). The Godavari festival is linked to that sign.',
      'పుష్కరాలు 12 ఏళ్లకు ఒకసారి, గురుడు సింహరాశిలో ఉన్నప్పుడు జరుగుతాయి.',
      'पुष्करालु 12 वर्ष में एक बार, जब गुरु सिंह राशि में हो, तब होते हैं।',
    ),
    source: 'Wikipedia: Godavari Pushkaram',
  },
  {
    id: 'dip',
    text: L(
      'Millions take a holy dip in the Godavari. It is believed to give the merit of bathing in 12 rivers over 12 years.',
      'లక్షలాది మంది గోదావరిలో పుణ్యస్నానం చేస్తారు. 12 నదుల స్నాన పుణ్యం లభిస్తుందని నమ్మకం.',
      'लाखों लोग गोदावरी में पवित्र स्नान करते हैं। माना जाता है कि इससे 12 नदियों में स्नान का पुण्य मिलता है।',
    ),
    source: `${DISTRICT}: Godavari Pushkaralu 2027`,
  },
  {
    id: 'temples',
    text: L(
      'Devotees also visit temples on the river banks. At the Markandeya Temple in Rajamahendravaram, devotees traditionally bathe in the Godavari before entering.',
      'భక్తులు నది ఒడ్డున ఆలయాలను దర్శిస్తారు. రాజమహేంద్రవరం మార్కండేయ ఆలయంలో ప్రవేశించే ముందు గోదావరిలో స్నానం చేయడం సంప్రదాయం.',
      'भक्त नदी तट के मंदिरों के दर्शन भी करते हैं। राजमहेंद्रवरम के मार्कंडेय मंदिर में प्रवेश से पहले गोदावरी में स्नान की परंपरा है।',
    ),
    source: `${DISTRICT}: Religious Tourism`,
  },
];

/** Link to one point on OpenStreetMap. Opens in a new tab; nothing is sent from here. */
export function osmPointUrl(lat: number, lng: number): string {
  const la = lat.toFixed(5);
  const lo = lng.toFixed(5);
  return 'https://www.openstreetmap.org/?mlat=' + la + '&mlon=' + lo + '#map=15/' + la + '/' + lo;
}

/** Search link into OpenStreetMap (open data, no key). Opens in a new tab; nothing is sent from here. */
export function osmSearchUrl(query: string): string {
  return 'https://www.openstreetmap.org/search?query=' + encodeURIComponent(query);
}
