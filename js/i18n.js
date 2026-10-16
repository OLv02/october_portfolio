// Languages: English, French and German.
// English is what's written in the page. Each row below is one English string followed by its French and German
// versions, so every translation can be reviewed side by side. On a switch, every text node, alt text and label whose
// English matches a row is swapped. Names stay as they are: organizations, programs, products and awards.

export const LANGS = [
  { code: 'en', label: 'EN', name: 'English', html: 'en', locale: 'en-CA' },
  { code: 'fr', label: 'FR', name: 'Français', html: 'fr', locale: 'fr-CA' },
  { code: 'de', label: 'DE', name: 'Deutsch', html: 'de', locale: 'de-DE' },
];

const N = ' ';   // French puts a no-break space before : ? ! and inside « »
const H = '\u00ad';   // a soft hyphen: where a long German word may break, shown only when it does

// [English, French, German]
const ROWS = [
  // page
  ['Owen Lavender, Foreign Direct Investment Specialist at Invest Ottawa. International business graduate of Carleton University\'s Sprott School of Business, working in English, French and German.',
    'Owen Lavender, spécialiste de l’investissement direct étranger chez Investir Ottawa. Diplômé en commerce international de l’École de commerce Sprott de l’Université Carleton, il travaille en anglais, en français et en allemand.',
    'Owen Lavender, Spezialist für ausländische Direktinvestitionen bei Invest Ottawa. Absolvent in International Business der Sprott School of Business der Carleton University; arbeitet auf Englisch, Französisch und Deutsch.'],
  ['Skip to content', 'Aller au contenu', 'Zum Inhalt springen'],
  ['Gathering {n} seeds', 'Rassemblement de {n} graines', '{n} Samen werden gesammelt'],
  ['Look closer.', 'Regardez de plus près.', 'Sehen Sie genauer hin.'],
  ['Scroll to explore', 'Faites défiler pour explorer', 'Zum Erkunden scrollen'],
  ['Swipe to explore', 'Balayez pour explorer', 'Zum Erkunden wischen'],
  ['Mute sound', 'Couper le son', 'Ton ausschalten'],
  ['Turn sound on', 'Activer le son', 'Ton einschalten'],
  ['Language', 'Langue', 'Sprache'],
  ['Owen Lavender, back to the top', 'Owen Lavender, retour en haut', 'Owen Lavender, zurück nach oben'],
  ['Sections', 'Sections', 'Abschnitte'],
  ['Introduction', 'Introduction', 'Einführung'],

  // menu and section titles
  ['Menu', 'Menu', 'Menü'],
  ['About', 'À propos', 'Über mich'],
  ['Work', 'Expérience', `Berufs${H}erfahrung`],
  ['Highlights', 'Faits saillants', 'Highlights'],
  ['Leadership', 'Leadership', 'Engagement'],
  ['Writing', 'Écrits', 'Texte'],
  ['Education', 'Formation', 'Ausbildung'],
  ['Awards', 'Distinctions', `Aus${H}zeich${H}nungen`],
  ['Contact', 'Contact', 'Kontakt'],
  ['Back to the top ↑', 'Retour en haut ↑', 'Nach oben ↑'],
  ['The blog ↗', 'Le blogue ↗', 'Zum Blog ↗'],

  // hero
  ['Foreign Direct Investment Specialist', 'Spécialiste de l’investissement direct étranger', 'Spezialist für ausländische Direktinvestitionen'],

  // about
  ['I\'m a Foreign Direct Investment Specialist at Invest Ottawa, where I help international companies explore and expand into Ottawa, from the first lead through the delegation visit and the follow-up.',
    'Je suis spécialiste de l’investissement direct étranger chez Investir Ottawa, où j’aide des entreprises internationales à explorer Ottawa et à s’y implanter, du premier contact à la visite de délégation, jusqu’au suivi.',
    'Ich bin Spezialist für ausländische Direktinvestitionen bei Invest Ottawa und unterstütze internationale Unternehmen dabei, Ottawa kennenzulernen und sich hier anzusiedeln – vom ersten Kontakt über den Delegationsbesuch bis zur Nachbetreuung.'],
  ['I graduated With High Distinction from Carleton University\'s Sprott School of Business, with a Bachelor of International Business and minors in Economics and German. I spent a study year at Universität Leipzig in Germany, and I work in English and French, with intermediate German.',
    'J’ai obtenu avec grande distinction mon baccalauréat en commerce international à l’École de commerce Sprott de l’Université Carleton, avec des mineures en économie et en allemand. J’ai passé une année d’études à l’Universität Leipzig, en Allemagne, et je travaille en anglais et en français, avec un allemand de niveau intermédiaire.',
    'Ich habe meinen Bachelor of International Business an der Sprott School of Business der Carleton University mit Auszeichnung abgeschlossen, mit den Nebenfächern Volkswirtschaftslehre und Deutsch. Ein Studienjahr habe ich an der Universität Leipzig verbracht; ich arbeite auf Englisch und Französisch und spreche Deutsch auf mittlerem Niveau.'],
  ['Before that, I was a head lifeguard with the City of Ottawa, a census operator at Statistics Canada, and a volunteer consultant and case competitor at Sprott.',
    'Auparavant, j’ai été chef sauveteur à la Ville d’Ottawa, opérateur du recensement à Statistique Canada, ainsi que consultant bénévole et participant à des compétitions de cas à Sprott.',
    'Davor war ich leitender Rettungsschwimmer bei der Stadt Ottawa, Mitarbeiter bei der Volkszählung von Statistics Canada sowie ehrenamtlicher Berater und Teilnehmer an Fallstudienwettbewerben an der Sprott School.'],
  ['Based in', 'Basé à', 'Standort'],
  ['Ottawa, Canada', 'Ottawa, Canada', 'Ottawa, Kanada'],
  ['Role', 'Poste', 'Position'],
  ['FDI Specialist, Invest Ottawa', 'Spécialiste de l’IDE, Investir Ottawa', 'FDI-Spezialist, Invest Ottawa'],
  ['Studied', 'Études', 'Studium'],
  ['International Business, Carleton University', 'Commerce international, Université Carleton', 'International Business, Carleton University'],
  ['Languages', 'Langues', 'Sprachen'],
  ['English · French · German', 'Anglais · français · allemand', 'Englisch · Französisch · Deutsch'],
  ['Toolkit', 'Boîte à outils', 'Kompetenzen'],
  ['Focus', 'Domaines', 'Schwerpunkte'],
  ['Foreign direct investment', 'Investissement direct étranger', 'Ausländische Direktinvestitionen'],
  ['Investment attraction', 'Attraction d’investissements', 'Investorenakquise'],
  ['Delegations and missions', 'Délégations et missions', 'Delegationen und Wirtschaftsmissionen'],
  ['Stakeholder relations', 'Relations avec les parties prenantes', 'Stakeholder-Management'],
  ['Pipeline reporting', 'Suivi du pipeline', 'Pipeline-Reporting'],
  ['Practice', 'Pratique', 'Praxis'],
  ['Lead generation', 'Génération de pistes', 'Leadgenerierung'],
  ['Needs assessments', 'Évaluation des besoins', 'Bedarfsanalysen'],
  ['Process improvement', 'Amélioration des processus', 'Prozessoptimierung'],
  ['Market and competitor research', 'Études de marché et de la concurrence', 'Markt- und Wettbewerbsanalyse'],
  ['Client triage', 'Triage des demandes', 'Anfragen-Triage'],
  ['Tools', 'Outils', 'Werkzeuge'],
  ['CRM dashboards', 'Tableaux de bord CRM', 'CRM-Dashboards'],
  ['English', 'Anglais', 'Englisch'],
  ['French (certified working proficiency)', 'Français (compétence professionnelle certifiée)', 'Französisch (zertifizierte berufliche Kompetenz)'],
  ['German (intermediate)', 'Allemand (intermédiaire)', 'Deutsch (Mittelstufe)'],

  // work
  ['OTTAWA · 2024 – PRESENT', 'OTTAWA · 2024 – AUJOURD’HUI', 'OTTAWA · 2024 – HEUTE'],
  ['Invest Ottawa', 'Investir Ottawa', 'Invest Ottawa'],
  ['OCT 2024 – PRESENT', 'OCT. 2024 – AUJOURD’HUI', 'OKT. 2024 – HEUTE'],
  ['Joined the team as Foreign Direct Investment Assistant in October 2024.',
    'Arrivé dans l’équipe en octobre 2024 à titre d’adjoint à l’investissement direct étranger.',
    'Im Oktober 2024 als Assistent für ausländische Direktinvestitionen ins Team gekommen.'],
  ['Coordinate end-to-end logistics for delegation visits of up to 30 people, working with 15+ public and private partners on site tours and information sessions.',
    'Coordonne de bout en bout la logistique de visites de délégations pouvant compter jusqu’à 30 personnes, avec plus de 15 partenaires publics et privés, pour des visites de sites et des séances d’information.',
    'Koordiniere die gesamte Logistik für Delegationsbesuche mit bis zu 30 Personen und arbeite mit über 15 öffentlichen und privaten Partnern an Standortbesichtigungen und Informationsveranstaltungen.'],
  ['Support outbound FDI missions from lead generation and meeting coordination to needs assessments and follow-up, and cut outreach preparation time by 28% with Microsoft Copilot.',
    `Appuie les missions d’IDE à l’étranger, de la génération de pistes et de la planification des rencontres à l’évaluation des besoins et au suivi, et a réduit de 28${N}% le temps de préparation de la prospection grâce à Microsoft Copilot.`,
    'Unterstütze Auslandsmissionen für Direktinvestitionen von der Leadgenerierung und Terminplanung bis zur Bedarfsanalyse und Nachbetreuung und habe die Vorbereitungszeit für die Akquise mit Microsoft Copilot um 28 % verkürzt.'],
  ['Built a CRM dashboard for pipeline visibility, presented pipeline summaries that guided annual planning, and worked with the Systems team on the Global Runway CRM workflow.',
    'A conçu un tableau de bord CRM pour une meilleure visibilité du pipeline, présenté des synthèses du pipeline qui ont orienté la planification annuelle et collaboré avec l’équipe des systèmes au flux de travail du CRM Global Runway.',
    'Ein CRM-Dashboard für mehr Transparenz in der Pipeline aufgebaut, Pipeline-Übersichten präsentiert, die in die Jahresplanung eingeflossen sind, und mit dem Systems-Team am Workflow des Global Runway CRM gearbeitet.'],
  ['Set up a booking page for lead generators that streamlined meeting coordination and prevented conflicts.',
    'A mis en place une page de réservation pour les responsables de la prospection, ce qui a simplifié la planification des rencontres et évité les conflits d’horaire.',
    'Eine Buchungsseite für die Leadgenerierung eingerichtet, die die Terminabstimmung vereinfacht und Überschneidungen verhindert.'],
  ['JUL – OCT 2024', 'JUILL. – OCT. 2024', 'JULI – OKT. 2024'],
  ['Service Intake Administrator', 'Administrateur de l’accueil des demandes', 'Administrator für Serviceanfragen'],
  ['Assessed and triaged support requests, matching founders with advisors, tools and other organizations.',
    'A évalué et trié les demandes de soutien, en orientant les fondateurs vers des conseillers, des outils et d’autres organisations.',
    'Supportanfragen bewertet und priorisiert und Gründerinnen und Gründer an passende Beratende, Tools und Organisationen vermittelt.'],
  ['Cut email composition time by 57% with Quick Parts templates and custom key bindings.',
    `A réduit de 57${N}% le temps de rédaction des courriels grâce à des modèles Quick Parts et à des raccourcis clavier personnalisés.`,
    'Die Zeit für das Verfassen von E-Mails mit Quick-Parts-Vorlagen und eigenen Tastenkürzeln um 57 % verkürzt.'],
  ['Evaluated and categorized 235 information sources into an interactive resource database, tripling the resources sent to clients and contributing to a 20% year-over-year rise in Net Promoter Score.',
    `A évalué et classé 235 sources d’information dans une base de données interactive de ressources, ce qui a triplé le nombre de ressources envoyées aux clients et contribué à une hausse de 20${N}% du Net Promoter Score d’une année à l’autre.`,
    '235 Informationsquellen bewertet und in einer interaktiven Ressourcendatenbank kategorisiert; dadurch hat sich die Zahl der an Kundinnen und Kunden verschickten Ressourcen verdreifacht, und der Net Promoter Score stieg im Jahresvergleich um 20 %.'],
  ['City of Ottawa', 'Ville d’Ottawa', 'Stadt Ottawa'],
  ['JAN 2024 – 2025', 'JANV. 2024 – 2025', 'JAN. 2024 – 2025'],
  ['Head Lifeguard', 'Chef sauveteur', 'Leitender Rettungsschwimmer'],
  ['Supervised teams of up to five and ran performance evaluations that led to retraining for two staff.',
    'A supervisé des équipes pouvant compter jusqu’à cinq personnes et réalisé des évaluations du rendement qui ont mené à la reformation de deux membres du personnel.',
    'Teams von bis zu fünf Personen geleitet und Leistungsbeurteilungen durchgeführt, die zur Nachschulung von zwei Mitarbeitenden führten.'],
  ['Reported to supervisors and staff in writing and in meetings, giving accurate data for programming and maintenance.',
    'A rendu compte aux superviseurs et au personnel par écrit et en réunion, en fournissant des données exactes pour la programmation et l’entretien.',
    'Vorgesetzte und Team schriftlich und in Besprechungen informiert und genaue Daten für Programmplanung und Instandhaltung geliefert.'],
  ['SEP 2019 – DEC 2023', 'SEPT. 2019 – DÉC. 2023', 'SEPT. 2019 – DEZ. 2023'],
  ['Lifeguard, Instructor & Customer Service Representative', 'Sauveteur, moniteur et préposé au service à la clientèle', 'Rettungsschwimmer, Schwimmlehrer und Kundenservice'],
  ['Enforced safety policies, handled payments and taught swim lessons, working with parents and supervisors.',
    'A fait respecter les règles de sécurité, traité les paiements et donné des cours de natation, en lien avec les parents et les superviseurs.',
    'Sicherheitsregeln durchgesetzt, Zahlungen abgewickelt und Schwimmunterricht gegeben, in Abstimmung mit Eltern und Vorgesetzten.'],
  ['Statistics Canada', 'Statistique Canada', 'Statistics Canada'],
  ['APR – AUG 2021', 'AVR. – AOÛT 2021', 'APR. – AUG. 2021'],
  ['Census Operator', 'Opérateur du recensement', 'Mitarbeiter Volkszählung'],
  ['Answered bilingual inquiries with 15% faster talk time and 50% less hold time than the department average.',
    `A répondu à des demandes dans les deux langues officielles, avec une durée d’appel 15${N}% plus courte et un temps d’attente 50${N}% plus bas que la moyenne du service.`,
    'Zweisprachige Anfragen beantwortet, mit 15 % kürzerer Gesprächszeit und 50 % kürzerer Wartezeit als der Abteilungsdurchschnitt.'],

  // highlights
  ['INVEST OTTAWA · OUTBOUND MISSIONS', 'INVESTIR OTTAWA · MISSIONS À L’ÉTRANGER', 'INVEST OTTAWA · AUSLANDSMISSIONEN'],
  ['Missions abroad', 'Missions à l’étranger', 'Missionen im Ausland'],
  ['Supporting Invest Ottawa\'s outbound investment missions end to end, from lead generation and meeting coordination to needs assessments and follow-up.',
    `Soutien aux missions d’investissement d’Investir Ottawa à l’étranger, de bout en bout${N}: génération de pistes, planification des rencontres, évaluation des besoins et suivi.`,
    'Begleitung der Auslandsmissionen von Invest Ottawa von Anfang bis Ende – von der Leadgenerierung und Terminplanung bis zur Bedarfsanalyse und Nachbetreuung.'],
  ['OTTAWA · INBOUND DELEGATIONS', 'OTTAWA · DÉLÉGATIONS EN VISITE', 'OTTAWA · DELEGATIONSBESUCHE'],
  ['Welcoming delegations to Ottawa', 'Accueillir des délégations à Ottawa', 'Delegationen in Ottawa empfangen'],
  ['Hosting international delegations of up to 30 people, with site tours and information sessions alongside more than 15 public and private partners.',
    'Accueil de délégations internationales pouvant compter jusqu’à 30 personnes, avec visites de sites et séances d’information, aux côtés de plus de 15 partenaires publics et privés.',
    'Empfang internationaler Delegationen mit bis zu 30 Personen, mit Standortbesichtigungen und Informationsveranstaltungen gemeinsam mit über 15 öffentlichen und privaten Partnern.'],

  // leadership
  ['SPROTT STUDENT CONSULTING GROUP · JAN – APR 2024', 'SPROTT STUDENT CONSULTING GROUP · JANV. – AVR. 2024', 'SPROTT STUDENT CONSULTING GROUP · JAN. – APR. 2024'],
  ['Project Analyst', 'Analyste de projet', 'Projektanalyst'],
  ['Interviewed competing firms to write case studies and identify best practices for a Carleton charity initiative.',
    'A interrogé des entreprises concurrentes pour rédiger des études de cas et dégager les pratiques exemplaires pour une initiative caritative de Carleton.',
    'Interviews mit Wettbewerbern geführt, um Fallstudien zu verfassen und Best Practices für eine gemeinnützige Initiative der Carleton University herauszuarbeiten.'],
  ['Analyzed organizational data in Excel to forecast sales volume and find high-value consumer segments.',
    'A analysé des données organisationnelles dans Excel pour prévoir le volume des ventes et repérer les segments de clientèle à forte valeur.',
    'Organisationsdaten in Excel analysiert, um Absatzmengen zu prognostizieren und besonders wertvolle Kundensegmente zu identifizieren.'],
  ['JDCC SPROTT · OCT 2023 – MAR 2024', 'JDCC SPROTT · OCT. 2023 – MARS 2024', 'JDCC SPROTT · OKT. 2023 – MÄRZ 2024'],
  ['International Business Delegate', 'Délégué en commerce international', 'Delegierter International Business'],
  ['Led a three-person team that won Half Delegation of the Year at a national case competition.',
    `A dirigé une équipe de trois personnes, lauréate du prix «${N}Half Delegation of the Year${N}» à une compétition de cas nationale.`,
    'Ein dreiköpfiges Team geleitet, das bei einem nationalen Fallstudienwettbewerb als „Half Delegation of the Year“ ausgezeichnet wurde.'],

  // writing: the latest posts from the blog
  ['Latest posts', 'Derniers billets', 'Neueste Beiträge'],
  ['BLOG', 'BLOGUE', 'BLOG'],
  ['Notes on investment, Ottawa and international business', 'Notes sur l’investissement, Ottawa et le commerce international', 'Notizen zu Investitionen, Ottawa und internationalem Business'],
  ['Read the blog ↗', 'Lire le blogue ↗', 'Zum Blog ↗'],
  ['Follow new posts in your feed reader', 'Suivez les nouveaux billets dans votre lecteur de flux', 'Neue Beiträge im Feedreader verfolgen'],
  ['Subscribe ↗', 'S’abonner ↗', 'Abonnieren ↗'],
  ['Read the post ↗', 'Lire le billet ↗', 'Beitrag lesen ↗'],
  ['ARCHIVE', 'ARCHIVES', 'ARCHIV'],
  ['Every post on the blog', 'Tous les billets du blogue', 'Alle Beiträge im Blog'],
  ['All posts ↗', 'Tous les billets ↗', 'Alle Beiträge ↗'],
  ['Untitled', 'Sans titre', 'Ohne Titel'],

  // education
  ['SEP 2020 – APR 2024 · OTTAWA', 'SEPT. 2020 – AVR. 2024 · OTTAWA', 'SEPT. 2020 – APR. 2024 · OTTAWA'],
  ['WITH HIGH DISTINCTION', 'AVEC GRANDE DISTINCTION', 'MIT AUSZEICHNUNG'],
  ['Carleton University', 'Université Carleton', 'Carleton University'],
  ['Bachelor of International Business, Sprott School of Business', 'Baccalauréat en commerce international, École de commerce Sprott', 'Bachelor of International Business, Sprott School of Business'],
  ['Minor in Economics', 'Mineure en économie', 'Nebenfach Volkswirtschaftslehre'],
  ['Minor in German', 'Mineure en allemand', 'Nebenfach Deutsch'],
  ['Senate Medal', 'Médaille du Sénat', 'Senate Medal'],
  ['Swiss Ambassador\'s Award', 'Prix de l’ambassadeur de Suisse', 'Preis des Schweizer Botschafters'],
  ['STUDY YEAR ABROAD · LEIPZIG, GERMANY', 'ANNÉE D’ÉTUDES À L’ÉTRANGER · LEIPZIG, ALLEMAGNE', 'AUSLANDSSTUDIENJAHR · LEIPZIG, DEUTSCHLAND'],
  ['Exchange year in economics and political science', 'Année d’échange en économie et en science politique', 'Austauschjahr in Volkswirtschaftslehre und Politikwissenschaft'],
  ['Economics', 'Économie', 'Volkswirtschaftslehre'],
  ['Political science', 'Science politique', 'Politikwissenschaft'],
  ['German', 'Allemand', 'Deutsch'],

  // awards
  ['CARLETON UNIVERSITY · 2024', 'UNIVERSITÉ CARLETON · 2024', 'CARLETON UNIVERSITY · 2024'],
  ['Senate Medal for Outstanding Academic Achievement', 'Médaille du Sénat pour réussite scolaire exceptionnelle', 'Senate Medal für herausragende akademische Leistungen'],
  ['Awarded on graduating With High Distinction from the Bachelor of International Business.',
    'Décernée à l’obtention, avec grande distinction, du baccalauréat en commerce international.',
    'Verliehen zum Abschluss des Bachelor of International Business mit Auszeichnung.'],
  ['JDCC · NATIONAL CASE COMPETITION · 2024', 'JDCC · COMPÉTITION DE CAS NATIONALE · 2024', 'JDCC · NATIONALER FALLSTUDIENWETTBEWERB · 2024'],
  ['Won with the three-person Sprott team I led.', 'Remporté avec l’équipe Sprott de trois personnes que je dirigeais.', 'Gewonnen mit dem dreiköpfigen Sprott-Team, das ich geleitet habe.'],

  // contact and footer
  ['Let\'s talk', 'Discutons', 'Sprechen wir'],
  ['Exploring Ottawa for your company, planning a delegation, or just want to connect? Email is the fastest way to reach me.',
    `Vous envisagez Ottawa pour votre entreprise, vous planifiez une délégation ou vous souhaitez simplement échanger${N}? Le courriel est le moyen le plus rapide de me joindre.`,
    'Sie erwägen Ottawa als Standort für Ihr Unternehmen, planen eine Delegationsreise oder möchten sich einfach vernetzen? Am schnellsten erreichen Sie mich per E-Mail.'],
  ['Copy', 'Copier', 'Kopieren'],
  ['Copied', 'Copié', 'Kopiert'],
  ['Press and hold to copy', 'Appuyez longuement pour copier', 'Zum Kopieren gedrückt halten'],
  ['Ottawa, Ontario, Canada', 'Ottawa (Ontario), Canada', 'Ottawa, Ontario, Kanada'],
  ['Elsewhere', 'Ailleurs', 'Weitere Profile'],
  ['Blog', 'Blogue', 'Blog'],
  ['· Foreign Direct Investment Specialist · Ottawa', '· Spécialiste de l’investissement direct étranger · Ottawa', '· Spezialist für ausländische Direktinvestitionen · Ottawa'],
];

// Paragraphs with a link inside are swapped whole (word order differs between languages).
const CREDIT = '<a href="https://realarmaansidhu.com/" target="_blank" rel="noopener">Armaan Sidhu</a>';
const BLOCKS = {
  credit: {
    fr: `Construit à partir du code du site d’${CREDIT}, avec three.js`,
    de: `Basiert auf dem Website-Code von ${CREDIT}, mit three.js`,
  },
};

// Strings that read the same in every language: names, programs, products, awards and contact details.
const KEEP = new Set(['OL', 'Owen Lavender', 'Owen Lavender ·', 'OWEN', 'LAVENDER', 'Global Runway CRM', 'Microsoft Copilot', 'Excel', 'Microsoft 365',
  'OTTAWA · 2019 – 2025', 'OTTAWA · 2021', 'Universität Leipzig', 'Half Delegation of the Year', 'RSS', 'owen.lavender.02@gmail.com', 'in/owenlavender',
  'olv02.github.io/blog', 'LinkedIn', 'EN', 'FR', 'DE']);

const COL = { fr: 1, de: 2 };
const DICT = { fr: new Map(), de: new Map() };
for (const row of ROWS) for (const c of ['fr', 'de']) DICT[c].set(row[0], row[COL[c]]);

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const STORE = 'site.lang';
let lang = 'en';
const before = [], listeners = [];

export const currentLang = () => lang;
export const locale = () => LANGS.find((l) => l.code === lang).locale;
export function t(s, vars) {
  let out = (lang !== 'en' && DICT[lang].get(s)) || s;
  if (vars) for (const k in vars) out = out.split(`{${k}}`).join(vars[k]);
  return out;
}
// beforeLangChange runs just ahead of a switch (to note where the reader is), onLangChange right after it.
export function beforeLangChange(fn) { before.push(fn); }
export function onLangChange(fn) { listeners.push(fn); }

let texts = [], attrs = [], blocks = [], nums = [], ready = false;
const DECIMAL = /(\d)\.(\d)/g;   // 3.97 → 3,97 in French and German

// Remember every translatable piece of the page as it is in English.
function capture() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const p = n.parentElement;
      if (!p || p.closest('script, style, [data-i18n-skip], [data-i18n-html]')) return NodeFilter.FILTER_REJECT;
      return /\p{L}|\d\.\d/u.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const v = n.nodeValue, key = norm(v);
    if (!/\p{L}/u.test(v)) { nums.push({ n, orig: v }); continue; }   // a bare figure like a GPA
    texts.push({ n, orig: v, key, lead: v.match(/^\s*/)[0], tail: v.match(/\s*$/)[0] });
  }
  for (const el of document.body.querySelectorAll('[alt], [aria-label], [title]')) {
    if (el.closest('[data-i18n-skip]')) continue;
    for (const a of ['alt', 'aria-label', 'title']) {
      const v = el.getAttribute(a);
      if (v && /\p{L}/u.test(v)) attrs.push({ el, a, orig: v, key: norm(v) });
    }
  }
  for (const el of document.querySelectorAll('[data-i18n-html]')) blocks.push({ el, key: el.dataset.i18nHtml, orig: el.innerHTML });
}

function apply(code) {
  lang = LANGS.some((l) => l.code === code) ? code : 'en';
  const meta = LANGS.find((l) => l.code === lang);
  document.documentElement.lang = meta.html;
  for (const x of texts) x.n.nodeValue = lang === 'en' ? x.orig : x.lead + (DICT[lang].get(x.key) || x.key) + x.tail;
  for (const x of attrs) x.el.setAttribute(x.a, lang === 'en' ? x.orig : DICT[lang].get(x.key) || x.orig);
  for (const x of nums) x.n.nodeValue = lang === 'fr' || lang === 'de' ? x.orig.replace(DECIMAL, '$1,$2') : x.orig;
  for (const x of blocks) x.el.innerHTML = lang === 'en' ? x.orig : (BLOCKS[x.key] && BLOCKS[x.key][lang]) || x.orig;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) { desc.dataset.en = desc.dataset.en || desc.content; desc.content = t(desc.dataset.en); }
  for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  document.documentElement.classList.remove('i18n-wait');
  for (const fn of listeners) fn(lang);
}

export function setLang(code) {
  try { localStorage.setItem(STORE, code); } catch (e) { /* private mode */ }
  for (const fn of before) fn(lang);
  apply(code);
  const u = new URL(location.href);
  if (u.searchParams.has('lang')) { u.searchParams.delete('lang'); history.replaceState(null, '', u); }
}

// The switcher: three buttons. On narrow screens only the current language shows; tapping it opens the other two.
function wire() {
  const box = document.getElementById('lang');
  if (!box) return;
  const narrow = matchMedia('(max-width: 559px)');
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]');
    if (!b) return;
    if (narrow.matches && b.dataset.lang === lang && !box.classList.contains('open')) { box.classList.add('open'); return; }
    box.classList.remove('open');
    if (b.dataset.lang !== lang) setLang(b.dataset.lang);
  });
  document.addEventListener('click', (e) => { if (!box.contains(e.target)) box.classList.remove('open'); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') box.classList.remove('open'); });
}

export function initI18n() {
  if (ready) return;
  ready = true;
  capture();
  wire();
  apply(window.__siteLang || 'en');   // chosen in boot.js: a ?lang= link, the visitor's last pick, or their device's language
  // for checking coverage: strings on the page that have neither a translation nor a reason to stay the same
  window.__i18n = {
    set: setLang,
    missing: (c) => [...new Set([...texts.map((x) => x.key), ...attrs.map((x) => x.key)])].filter((k) => !KEEP.has(k) && !DICT[c].has(k)),
  };
}

// Runs on its own as soon as the page is parsed, so the switcher works even when the 3D scene doesn't.
initI18n();
