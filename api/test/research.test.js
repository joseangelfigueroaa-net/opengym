import test from 'node:test';
import assert from 'node:assert/strict';
import * as RS from '../trainer/research.js';

const summary = {
  result: {
    uids: ['111', '222'],
    111: { uid: '111', title: 'Resistance training volume and hypertrophy: a systematic review and meta-analysis.', fulljournalname: 'Sports medicine (Auckland, N.Z.)', source: 'Sports Med', sortpubdate: '2026/10/03 00:00', authors: [{ name: 'Smith A' }, { name: 'Lee B' }, { name: 'Diaz C' }, { name: 'Ng D' }], pubtype: ['Journal Article', 'Meta-Analysis', 'Systematic Review'], articleids: [{ idtype: 'doi', value: '10.1/abc' }] },
    222: { uid: '222', title: 'Protein &amp; <i>older</i> adults: a randomized controlled trial', fulljournalname: 'The American journal of clinical nutrition', source: 'Am J Clin Nutr', sortpubdate: '2026/11/01 00:00', authors: [{ name: 'Ruiz E' }], pubtype: ['Journal Article', 'Randomized Controlled Trial'], articleids: [] }
  }
};
const xml = `<PubmedArticleSet><PubmedArticle><MedlineCitation><PMID Version="1">111</PMID><Abstract>
<AbstractText Label="BACKGROUND" NlmCategory="BACKGROUND">Why.</AbstractText>
<AbstractText Label="CONCLUSIONS" NlmCategory="CONCLUSIONS">More weekly sets produce more growth, with <i>diminishing</i> returns.</AbstractText>
</Abstract></MedlineCitation></PubmedArticle><PubmedArticle><MedlineCitation><PMID Version="1">222</PMID><Abstract>
<AbstractText>We tested protein. It was fine. Older adults gained lean mass. Protein helps.</AbstractText></Abstract></MedlineCitation></PubmedArticle></PubmedArticleSet>`;

const fakeFetch = calls => async url => {
  calls.push(url);
  if (url.includes('esearch')) return { ok: true, json: async () => ({ esearchresult: { idlist: ['111', '222'] } }) };
  if (url.includes('esummary')) return { ok: true, json: async () => summary };
  return { ok: true, text: async () => xml };
};

test('the query keeps to strong designs, the listed journals and papers with an abstract', () => {
  const q = RS.topicQuery(RS.topicById.hipertrofia);
  assert.match(q, /meta-analysis\[pt\]/);
  assert.match(q, /"Br J Sports Med"\[ta\]/);
  assert.match(q, /hasabstract$/);
});

test('evidence labels follow the strongest design', () => {
  assert.equal(RS.evidenceOf(['Meta-Analysis', 'Systematic Review']).key, 'meta');
  assert.equal(RS.evidenceOf(['Journal Article'], 'ACSM position stand on resistance training').key, 'guideline');
  assert.equal(RS.evidenceOf(['Randomized Controlled Trial']).key, 'rct');
  assert.equal(RS.evidenceOf([]).key, 'other');
});

test('a summary record becomes a clean item with its PubMed link', () => {
  const it = RS.toItem(summary.result[222]);
  assert.equal(it.title, 'Protein & older adults: a randomized controlled trial');
  assert.equal(it.date, '2026-11-01');
  assert.equal(it.url, 'https://pubmed.ncbi.nlm.nih.gov/222/');
  assert.equal(RS.toItem(summary.result[111]).authors, 'Smith A, Lee B, Diaz C et al.');
});

test('the conclusion is the structured section, or the last sentences', () => {
  const c = RS.conclusionsFrom(xml);
  assert.equal(c['111'], 'More weekly sets produce more growth, with diminishing returns.');
  assert.equal(c['222'], 'Older adults gained lean mass. Protein helps.');
});

test('a refresh fills every topic, saves it, and the feed merges topics newest first', async () => {
  const calls = []; let saved = null; let t = 1e12;
  const r = RS.createResearch({ read: () => ({}), write: s => { saved = s; }, fetchImpl: fakeFetch(calls), spacing: 0, now: () => t });
  await r.refresh();
  assert.equal(calls.length, RS.TOPICS.length * 3);
  assert.ok(!calls.some(u => u.includes('email')), 'no personal data goes to NCBI');
  const f = r.feed();
  assert.deepEqual(f.items.map(i => i.pmid), ['222', '111']);
  assert.equal(f.items[0].topics.length, RS.TOPICS.length);
  assert.equal(f.items[1].conclusion, 'More weekly sets produce more growth, with diminishing returns.');
  assert.equal(r.feed('hipertrofia').items.length, 2);
  assert.ok(saved.topics.hipertrofia.items.length);
  // a second refresh inside 12 hours asks NCBI nothing
  t += 3600000; await r.refresh();
  assert.equal(calls.length, RS.TOPICS.length * 3);
});

test('an NCBI failure keeps the last good list', async () => {
  const prev = { topics: { hipertrofia: { at: 1, items: [{ pmid: '9', date: '2026-01-01', title: 'old' }] } } };
  const r = RS.createResearch({ read: () => prev, write: () => {}, fetchImpl: async () => ({ ok: false, status: 503 }), spacing: 0, now: () => 1e12 });
  const orig = console.error; console.error = () => {};
  await r.refresh();
  console.error = orig;
  assert.deepEqual(r.feed('hipertrofia').items.map(i => i.pmid), ['9']);
});
