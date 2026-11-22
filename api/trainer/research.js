/* Science news for trainers (Trainnery): new peer-reviewed papers from PubMed, by topic.
 *
 * Only sources a trainer can verify: every item is a PubMed record (PMID, journal, date, DOI),
 * limited to the journals of sport science, sports medicine and clinical nutrition, and to the
 * study designs that carry the most weight: guidelines and consensus statements, meta-analyses,
 * systematic reviews and randomized trials. Nothing is rewritten: the title and the authors' own
 * conclusion are shown as PubMed has them, with a link to the record.
 *
 * Uses NCBI's E-utilities (esearch → esummary → efetch for the abstract's conclusion). Without an
 * NCBI_API_KEY, NCBI allows 3 requests a second; this asks for far less: each topic refreshes at
 * most every 12 hours, one request at a time. Results are kept in research.json, so a restart or
 * an NCBI outage still shows the last good list.
 */
const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
export const REFRESH_MS = 12 * 3600000;
export const PER_TOPIC = 20;
const SPACING_MS = 1500;

// Where the papers may come from: the field's main peer-reviewed journals (PubMed abbreviations).
export const JOURNALS = [
  'Sports Med', 'Br J Sports Med', 'Med Sci Sports Exerc', 'J Strength Cond Res', 'J Appl Physiol (1985)',
  'Eur J Appl Physiol', 'Scand J Med Sci Sports', 'J Sports Sci', 'J Int Soc Sports Nutr', 'Int J Sports Physiol Perform',
  'Sports Med Open', 'J Sport Health Sci', 'J Orthop Sports Phys Ther', 'Int J Sport Nutr Exerc Metab',
  'Am J Clin Nutr', 'Obes Rev', 'J Cachexia Sarcopenia Muscle', 'Age Ageing', 'Menopause', 'Front Physiol'
];
const DESIGNS = ['meta-analysis[pt]', 'systematic review[pt]', 'randomized controlled trial[pt]', 'guideline[pt]', 'practice guideline[pt]', 'consensus development conference[pt]'];

const ex = '(exercise[tiab] OR training[tiab])';
export const TOPICS = [
  { id: 'hipertrofia', label: 'Hipertrofia', q: '(resistance training[tiab] OR strength training[tiab]) AND (hypertrophy[tiab] OR muscle mass[tiab] OR muscle thickness[tiab] OR lean mass[tiab])' },
  { id: 'fuerza', label: 'Fuerza y potencia', q: '(resistance training[tiab] OR strength training[tiab] OR plyometric*[tiab]) AND (strength[tiab] OR power[tiab] OR 1RM[tiab])' },
  { id: 'grasa', label: 'Pérdida de grasa', q: `${ex} AND (fat loss[tiab] OR fat mass[tiab] OR body composition[tiab] OR weight loss[tiab] OR obesity[tiab])` },
  { id: 'resistencia', label: 'Resistencia y HIIT', q: '(endurance training[tiab] OR interval training[tiab] OR HIIT[tiab] OR aerobic training[tiab] OR VO2max[tiab])' },
  { id: 'nutricion', label: 'Nutrición deportiva', q: `(protein[tiab] OR creatine[tiab] OR caffeine[tiab] OR supplement*[tiab] OR energy intake[tiab]) AND ${ex}` },
  // population topics match the title, so a paper is about that group and not just tested on it
  { id: 'mayores', label: 'Personas mayores', q: `(older[ti] OR elderly[ti] OR sarcopeni*[ti] OR falls[ti] OR aging[ti] OR ageing[ti]) AND ${ex}` },
  { id: 'mujeres', label: 'Mujeres', q: `(women[ti] OR woman[ti] OR female*[ti] OR menopaus*[ti] OR postmenopausal[ti] OR pregnan*[ti] OR postpartum[ti] OR menstrual[ti]) AND ${ex}` },
  { id: 'lesiones', label: 'Dolor y lesiones', q: '(pain[tiab] OR injur*[tiab] OR tendinopathy[tiab] OR rehabilitation[tiab]) AND (exercise therapy[tiab] OR exercise[tiab] OR resistance training[tiab])' },
  { id: 'movilidad', label: 'Movilidad', q: '(flexibility[tiab] OR range of motion[tiab] OR stretching[tiab] OR mobility[tiab]) AND (training[tiab] OR exercise[tiab])' }
];
export const topicById = Object.fromEntries(TOPICS.map(t => [t.id, t]));

/** The full PubMed query for a topic: its terms, a strong design, one of the journals, last year. */
export function topicQuery(topic) {
  return `(${topic.q}) AND (${DESIGNS.join(' OR ')}) AND (${JOURNALS.map(j => `"${j}"[ta]`).join(' OR ')}) AND hasabstract`;
}

/** How much weight the study design carries, in the words a trainer uses; the strongest wins. */
export function evidenceOf(pubtypes = [], title = '') {
  const pt = pubtypes.map(p => String(p).toLowerCase());
  if (pt.some(p => /guideline|consensus/.test(p)) || /position stand|consensus|guideline|position statement/i.test(title)) return { key: 'guideline', label: 'Guía o consenso' };
  if (pt.includes('meta-analysis') || /meta-analys/i.test(title)) return { key: 'meta', label: 'Metaanálisis' };
  if (pt.includes('systematic review') || /systematic review|umbrella review/i.test(title)) return { key: 'review', label: 'Revisión sistemática' };
  if (pt.includes('randomized controlled trial') || /randomi[sz]ed/i.test(title)) return { key: 'rct', label: 'Ensayo aleatorizado' };
  return { key: 'other', label: 'Estudio' };
}

const isoDate = s => {
  const m = String(s || '').match(/^(\d{4})\/(\d{2})\/(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};
// When the paper reached PubMed: that is what "new" means here. Journal issue dates can sit in
// the future (some journals date a whole year's volume 31 December).
const addedOn = r => isoDate((r.history || []).find(h => h.pubstatus === 'pubmed')?.date) || isoDate((r.history || []).find(h => h.pubstatus === 'entrez')?.date) || isoDate(r.sortpubdate);
const entity = (_, h, d) => String.fromCodePoint(h ? parseInt(h, 16) : +d);
const clean = s => String(s || '').replace(/<[^>]+>/g, '').replace(/&#x([0-9a-f]+);|&#(\d+);/gi, entity).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/[   ]/g, ' ').replace(/\s+/g, ' ').trim();

/** One esummary record as the app shows it. */
export function toItem(r) {
  const doi = (r.articleids || []).find(a => a.idtype === 'doi')?.value || null;
  const names = (r.authors || []).map(a => a.name).filter(Boolean);
  return {
    pmid: String(r.uid),
    title: clean(r.title).replace(/\.$/, ''),
    journal: clean(r.fulljournalname || r.source),
    short: clean(r.source),
    date: addedOn(r) || null,
    authors: names.length > 3 ? names.slice(0, 3).join(', ') + ' et al.' : names.join(', '),
    evidence: evidenceOf(r.pubtype, r.title),
    doi,
    url: `https://pubmed.ncbi.nlm.nih.gov/${r.uid}/`
  };
}

/** The authors' conclusion from a PubMed efetch XML, per PMID: the CONCLUSION(S) section of a
 *  structured abstract, or the abstract's last sentences when it is not structured. */
export function conclusionsFrom(xml) {
  const out = {};
  for (const art of String(xml).split('<PubmedArticle>').slice(1)) {
    const pmid = art.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1];
    if (!pmid) continue;
    const parts = [...art.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)].map(m => ({ label: (m[1].match(/Label="([^"]*)"/)?.[1] || '').toUpperCase(), cat: (m[1].match(/NlmCategory="([^"]*)"/)?.[1] || '').toUpperCase(), text: clean(m[2]) }));
    if (!parts.length) continue;
    const c = parts.find(p => p.cat === 'CONCLUSIONS' || /CONCLUSION|INTERPRETATION|PRACTICAL APPLICATION/.test(p.label));
    let text = c ? c.text : parts.map(p => p.text).join(' ');
    if (!c) { const s = text.split(/(?<=\.)\s+(?=[A-Z])/); text = s.slice(-2).join(' '); }
    out[pmid] = text.length > 700 ? text.slice(0, 697).replace(/\s+\S*$/, '') + '…' : text;
  }
  return out;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** The feed: a cache per topic, refreshed in the background, never blocking a request. */
export function createResearch({ read, write, fetchImpl = (...a) => fetch(...a), apiKey = process.env.NCBI_API_KEY || '', spacing = SPACING_MS, now = () => Date.now() }) {
  const state = { topics: {}, ...(read() || {}) };   // { topics: { id: { at, items } } }
  let running = null;

  const get = async (util, params) => {
    const u = BASE + util + '?' + new URLSearchParams({ db: 'pubmed', tool: 'trainnery', ...(apiKey ? { api_key: apiKey } : {}), ...params });
    const r = await fetchImpl(u, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error('NCBI ' + util + ' ' + r.status);
    return util === 'efetch.fcgi' ? r.text() : r.json();
  };

  async function refreshTopic(topic) {
    // newest first by the date each record entered PubMed, over the last year
    const s = await get('esearch.fcgi', { term: topicQuery(topic), retmode: 'json', retmax: String(PER_TOPIC), datetype: 'edat', reldate: '365' });
    const ids = s.esearchresult?.idlist || [];
    if (!ids.length) { state.topics[topic.id] = { at: now(), items: [] }; return; }
    await sleep(spacing);
    const sum = await get('esummary.fcgi', { id: ids.join(','), retmode: 'json' });
    await sleep(spacing);
    let conclusions = {};
    try { conclusions = conclusionsFrom(await get('efetch.fcgi', { id: ids.join(','), retmode: 'xml', rettype: 'abstract' })); } catch { /* titles still go out */ }
    const items = ids.map(id => sum.result?.[id]).filter(r => r && !r.error).map(r => ({ ...toItem(r), conclusion: conclusions[String(r.uid)] || null }));
    state.topics[topic.id] = { at: now(), items };
  }

  /** Refreshes every topic older than 12 hours, one after the other. Never throws. */
  function refresh() {
    if (running) return running;
    running = (async () => {
      for (const topic of TOPICS) {
        if (now() - (state.topics[topic.id]?.at || 0) < REFRESH_MS) continue;
        try { await refreshTopic(topic); write(state); } catch (e) { console.error('research refresh skipped', topic.id, e.message); }
        await sleep(spacing);
      }
    })().finally(() => { running = null; });
    return running;
  }

  /** The list for one topic, or for all of them (newest first, each paper once, with its topics). */
  function feed(topicId) {
    const ids = topicId && topicById[topicId] ? [topicId] : TOPICS.map(t => t.id);
    const byPmid = new Map();
    for (const id of ids) for (const it of state.topics[id]?.items || []) {
      const had = byPmid.get(it.pmid);
      if (had) had.topics.push(id); else byPmid.set(it.pmid, { ...it, topics: [id] });
    }
    const items = [...byPmid.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const ats = ids.map(id => state.topics[id]?.at).filter(Boolean);
    return {
      topics: TOPICS.map(t => ({ id: t.id, label: t.label, count: state.topics[t.id]?.items.length || 0 })),
      items,
      updated: ats.length ? new Date(Math.min(...ats)).toISOString() : null,
      journals: JOURNALS
    };
  }

  return { feed, refresh, refreshTopic };
}
