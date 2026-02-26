/**
 * Pre-generate FAQ answers for IVF Explorer and store in the response cache.
 *
 * Usage: ANTHROPIC_API_KEY=sk-... node scripts/seed-faq-cache.mjs
 *
 * This script:
 * - Defines ~20 common IVF questions
 * - For each: searches PubMed, builds community context, calls Claude Haiku
 * - Stores the response + citations in response_cache with source='faq'
 * - Skips questions that already have a non-expired FAQ cache entry
 * - Run manually after deploy or when data changes
 */

import Anthropic from '@anthropic-ai/sdk';
import Database from 'better-sqlite3';
import { createHash, randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'ivfhelper.db');

const CACHE_TTL_DAYS = 7;

// ── FAQ Questions ──

const FAQ_QUESTIONS = [
  'Does CoQ10 improve egg quality for IVF?',
  'How does age affect the number of eggs retrieved in IVF?',
  'What are the average outcomes for women aged 35-37?',
  'Which protocol type has the best blast rate?',
  'What is the difference between antagonist and long lupron protocols?',
  'How does DHEA supplementation affect IVF outcomes?',
  'What does research say about vitamin D and fertility?',
  'What is PGT-A testing and should I do it?',
  'How many eggs do you need for a good chance at IVF?',
  'What is the average fertilization rate in IVF?',
  'Does ICSI improve outcomes compared to conventional IVF?',
  'What factors affect embryo quality in IVF?',
  'How does BMI affect IVF outcomes?',
  'What is the role of progesterone support after embryo transfer?',
  'What does research say about fresh vs frozen embryo transfer?',
  'How does endometriosis affect IVF outcomes?',
  'What is diminished ovarian reserve and how does it affect IVF?',
  'What are the expected outcomes for mini IVF vs conventional IVF?',
  'How does the number of IVF cycles affect cumulative live birth rate?',
  'What does research say about AMH levels and IVF outcomes?',
];

// ── Keyword extraction (mirrors src/lib/services/cache.ts) ──

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'about', 'between',
  'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down',
  'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either',
  'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most',
  'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very',
  'just', 'because', 'if', 'when', 'where', 'how', 'what', 'which',
  'who', 'whom', 'this', 'that', 'these', 'those', 'i', 'me', 'my',
  'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'them',
  'his', 'her', 'its', 'their', 'there', 'here', 'does', 'help',
  'good', 'best', 'really', 'actually', 'much', 'many', 'tell',
  'know', 'think', 'say', 'said', 'like', 'also', 'well', 'still',
  'even', 'way', 'want', 'get', 'make', 'go', 'see', 'look',
  'come', 'take', 'give', 'use', 'find', 'seem',
]);

const BIGRAMS = new Set([
  'live birth', 'male factor', 'egg quality', 'sperm quality',
  'embryo transfer', 'egg retrieval', 'ovarian reserve',
  'frozen transfer', 'fresh transfer', 'birth rate',
  'day 5', 'day 6', 'day 7', 'day 3',
  'vitamin d', 'coq 10', 'folic acid',
  'mini ivf', 'natural ivf',
  'estrogen priming', 'long lupron', 'short lupron',
]);

function extractKeywords(text) {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = normalized.split(' ');
  const foundBigrams = [];
  const bigramIndices = new Set();
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    if (BIGRAMS.has(bigram)) {
      foundBigrams.push(bigram);
      bigramIndices.add(i);
      bigramIndices.add(i + 1);
    }
  }
  const singleWords = words.filter((w, i) => w.length > 1 && !STOPWORDS.has(w) && !bigramIndices.has(i));
  return [...new Set([...foundBigrams, ...singleWords])].sort();
}

function normalizeQuestion(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function hashQuestion(normalized) {
  return createHash('sha256').update(normalized).digest('hex');
}

// ── PubMed search (simplified version of src/lib/services/pubmed.ts) ──

const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

async function searchPubMed(query, maxResults = 5) {
  const params = new URLSearchParams({
    db: 'pubmed',
    term: `${query} AND (IVF OR "in vitro fertilization" OR "assisted reproduction")`,
    retmax: String(maxResults),
    sort: 'relevance',
    retmode: 'json',
  });
  if (process.env.NCBI_API_KEY) params.set('api_key', process.env.NCBI_API_KEY);

  const res = await fetch(`${EUTILS_BASE}/esearch.fcgi?${params}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`PubMed search failed: ${res.status}`);
  const data = await res.json();
  return data.esearchresult.idlist || [];
}

async function fetchArticles(pmids) {
  if (pmids.length === 0) return [];
  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'xml',
    rettype: 'abstract',
  });
  if (process.env.NCBI_API_KEY) params.set('api_key', process.env.NCBI_API_KEY);

  const res = await fetch(`${EUTILS_BASE}/efetch.fcgi?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`PubMed fetch failed: ${res.status}`);
  const xml = await res.text();
  return parseArticleXml(xml);
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ');
}

function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const match = regex.exec(xml);
  return match ? decodeHtmlEntities(match[1].replace(/<[^>]*>/g, '').trim()) : null;
}

function parseArticleXml(xml) {
  const citations = [];
  const articleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
  let match;
  while ((match = articleRegex.exec(xml)) !== null) {
    const article = match[1];
    const pmid = extractTag(article, 'PMID') || '';
    const title = extractTag(article, 'ArticleTitle') || 'Untitled';
    const journal = extractTag(article, 'Title') || extractTag(article, 'ISOAbbreviation') || '';
    const year = extractTag(article, 'Year') || '';
    const authorNames = [];
    const authorRegex = /<Author[^>]*>([\s\S]*?)<\/Author>/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(article)) !== null) {
      const lastName = extractTag(authorMatch[1], 'LastName');
      const initials = extractTag(authorMatch[1], 'Initials');
      if (lastName) authorNames.push(initials ? `${lastName} ${initials}` : lastName);
    }
    const abstractTexts = [];
    const abstractRegex = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
    let abstractMatch;
    while ((abstractMatch = abstractRegex.exec(article)) !== null) {
      abstractTexts.push(abstractMatch[1].replace(/<[^>]*>/g, '').trim());
    }
    citations.push({
      pmid,
      title: decodeHtmlEntities(title.replace(/<[^>]*>/g, '')),
      authors: authorNames.length > 3 ? `${authorNames.slice(0, 3).join(', ')} et al.` : authorNames.join(', '),
      journal,
      year,
      abstract: abstractTexts.join(' ').slice(0, 2000),
    });
  }
  return citations;
}

// ── Community data context (simplified, reads directly from DB) ──

function getCommunityDataContext(db) {
  try {
    // Build a simple summary from the database directly
    const stats = db.prepare(`
      SELECT
        COUNT(DISTINCT p.id) as total,
        ROUND(AVG(o.eggs_retrieved), 1) as avg_retrieved,
        ROUND(AVG(o.eggs_mature), 1) as avg_mature,
        ROUND(AVG(o.eggs_fertilized), 1) as avg_fertilized,
        ROUND(AVG(COALESCE(o.blasts_day5, 0) + COALESCE(o.blasts_day6, 0) + COALESCE(o.blasts_day7, 0)), 1) as avg_blasts,
        ROUND(AVG(o.pgt_euploid), 1) as avg_euploid
      FROM protocols p
      JOIN outcomes o ON o.protocol_id = p.id
      WHERE p.is_active = 1 AND o.eggs_retrieved IS NOT NULL
    `).get();

    const byAge = db.prepare(`
      SELECT
        CASE WHEN p.age < 30 THEN 'Under 30' WHEN p.age < 35 THEN '30-34' WHEN p.age < 38 THEN '35-37'
             WHEN p.age < 41 THEN '38-40' WHEN p.age < 43 THEN '41-42' ELSE '43+' END as bracket,
        COUNT(*) as n,
        ROUND(AVG(o.eggs_retrieved), 1) as eggs,
        ROUND(AVG(COALESCE(o.blasts_day5, 0) + COALESCE(o.blasts_day6, 0) + COALESCE(o.blasts_day7, 0)), 1) as blasts
      FROM protocols p JOIN outcomes o ON o.protocol_id = p.id
      WHERE p.is_active = 1 AND o.eggs_retrieved IS NOT NULL
      GROUP BY bracket HAVING n >= 5
      ORDER BY MIN(p.age)
    `).all();

    const byProtocol = db.prepare(`
      SELECT p.protocol_type as label, COUNT(*) as n,
        ROUND(AVG(o.eggs_retrieved), 1) as eggs,
        ROUND(AVG(COALESCE(o.blasts_day5, 0) + COALESCE(o.blasts_day6, 0) + COALESCE(o.blasts_day7, 0)), 1) as blasts
      FROM protocols p JOIN outcomes o ON o.protocol_id = p.id
      WHERE p.is_active = 1 AND o.eggs_retrieved IS NOT NULL
      GROUP BY p.protocol_type HAVING n >= 5
    `).all();

    const byAmh = db.prepare(`
      SELECT p.amh_range as label, COUNT(*) as n,
        ROUND(AVG(o.eggs_retrieved), 1) as eggs,
        ROUND(AVG(COALESCE(o.blasts_day5, 0) + COALESCE(o.blasts_day6, 0) + COALESCE(o.blasts_day7, 0)), 1) as blasts
      FROM protocols p JOIN outcomes o ON o.protocol_id = p.id
      WHERE p.is_active = 1 AND o.eggs_retrieved IS NOT NULL AND p.amh_range IS NOT NULL
      GROUP BY p.amh_range HAVING n >= 5
    `).all();

    let ctx = `Community Data Summary (${stats.total} self-reported IVF cycles with outcomes)\n`;
    ctx += `OVERALL: eggs=${stats.avg_retrieved}, mature=${stats.avg_mature}, fertilized=${stats.avg_fertilized}, blasts=${stats.avg_blasts}, euploid=${stats.avg_euploid}\n`;
    ctx += `BY AGE:\n${byAge.map(r => `${r.bracket} (n=${r.n}) eggs=${r.eggs}, blasts=${r.blasts}`).join('\n')}\n`;
    ctx += `BY PROTOCOL:\n${byProtocol.map(r => `${r.label} (n=${r.n}) eggs=${r.eggs}, blasts=${r.blasts}`).join('\n')}\n`;
    ctx += `BY AMH:\n${byAmh.map(r => `${r.label} (n=${r.n}) eggs=${r.eggs}, blasts=${r.blasts}`).join('\n')}`;
    return ctx;
  } catch (err) {
    console.error('Failed to build community context:', err.message);
    return '';
  }
}

// ── System prompt (mirrors src/lib/prompts/research-system.ts) ──

function buildSystemPrompt(pubmedContext, communityContext) {
  return `You are a compassionate, evidence-based research assistant helping people understand IVF (in vitro fertilization) research. You are part of IVF Project, a non-profit, open-source tool.

## Your Role
You help users understand published scientific research about IVF, fertility treatments, and reproductive medicine. You also have access to anonymized community data from IVF cycles shared by users. You translate complex medical research into clear, accessible language.

## Tone & Voice
- Warm, empathetic, and patient.
- Use clear, simple language. Avoid unnecessary jargon.
- Never use "success" or "failure" when discussing IVF outcomes.

## What You MUST Do
- Always cite specific papers when making claims from research. Use the format: "According to [Author] et al. ([Year]), published in [Journal]..." followed by (PMID: [number]).
- Explain limitations of studies.
- Distinguish between correlation and causation.
- Include this disclaimer naturally in your first response: "This information is from published research and community-reported data, and is not medical advice. Your fertility specialist can help you understand how this applies to your specific situation."

## Community Data
When community data is provided below, reference it to complement published research:
- ALWAYS clearly label it as "community-reported data" — it is NOT clinical data.
- ALWAYS mention sample sizes (the n= values).
- Use language like "In our community data..." or "Among the [N] cycles reported to IVF Project..."
- Round numbers naturally (say "about 12 eggs" not "11.7 eggs").

## PubMed Research Context
${pubmedContext || 'No PubMed articles were found for this query.'}

## IVF Project Community Data
${communityContext || 'No community data available.'}`;
}

// ── Main ──

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required.');
    console.error('Usage: ANTHROPIC_API_KEY=sk-... node scripts/seed-faq-cache.mjs');
    process.exit(1);
  }

  const anthropic = new Anthropic();

  console.log(`Opening database at ${DB_PATH}...`);
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Ensure cache table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS response_cache (
      id TEXT PRIMARY KEY, question_hash TEXT NOT NULL, question_text TEXT NOT NULL,
      question_normalized TEXT NOT NULL, keywords TEXT NOT NULL,
      response_text TEXT NOT NULL, citations_json TEXT,
      source TEXT NOT NULL DEFAULT 'live' CHECK(source IN ('live', 'faq')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cache_hash ON response_cache(question_hash);
    CREATE INDEX IF NOT EXISTS idx_cache_expires ON response_cache(expires_at);
  `);

  // Purge expired entries
  const purged = db.prepare(`DELETE FROM response_cache WHERE expires_at <= datetime('now')`).run();
  if (purged.changes > 0) console.log(`Purged ${purged.changes} expired cache entries.`);

  // Build community context once
  const communityContext = getCommunityDataContext(db);

  const insertStmt = db.prepare(`
    INSERT INTO response_cache
      (id, question_hash, question_text, question_normalized, keywords,
       response_text, citations_json, source, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'faq', datetime('now', '+${CACHE_TTL_DAYS} days'))
  `);

  let seeded = 0;
  let skipped = 0;

  for (let i = 0; i < FAQ_QUESTIONS.length; i++) {
    const question = FAQ_QUESTIONS[i];
    const normalized = normalizeQuestion(question);
    const hash = hashQuestion(normalized);

    // Skip if non-expired FAQ entry already exists
    const existing = db.prepare(
      `SELECT id FROM response_cache WHERE question_hash = ? AND expires_at > datetime('now') AND source = 'faq'`
    ).get(hash);

    if (existing) {
      console.log(`  [${i + 1}/${FAQ_QUESTIONS.length}] SKIP (cached): ${question}`);
      skipped++;
      continue;
    }

    console.log(`  [${i + 1}/${FAQ_QUESTIONS.length}] Generating: ${question}`);

    // Search PubMed
    let citations = [];
    try {
      const pmids = await searchPubMed(question, 5);
      citations = await fetchArticles(pmids);
    } catch (err) {
      console.warn(`    PubMed search failed: ${err.message}`);
    }

    const pubmedContext = citations.length > 0
      ? citations.map((c, j) =>
          `[${j + 1}] ${c.authors} (${c.year}). "${c.title}". ${c.journal}. PMID: ${c.pmid}\nAbstract: ${c.abstract || 'Not available'}`
        ).join('\n\n')
      : '';

    const systemPrompt = buildSystemPrompt(pubmedContext, communityContext);

    // Call Claude (non-streaming)
    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }],
      });

      const responseText = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('');

      if (responseText.length < 50) {
        console.warn(`    Response too short, skipping cache.`);
        continue;
      }

      // Strip abstracts from citations before caching
      const citationsJson = citations.length > 0
        ? JSON.stringify(citations.map(({ abstract, ...rest }) => rest))
        : null;

      const keywords = extractKeywords(question);

      insertStmt.run(
        randomUUID(), hash, question, normalized,
        JSON.stringify(keywords), responseText, citationsJson
      );

      seeded++;
      console.log(`    ✓ Cached (${responseText.length} chars, ${citations.length} citations)`);
    } catch (err) {
      console.error(`    Claude API error: ${err.message}`);
    }

    // Small delay between requests to respect PubMed rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n✅ FAQ seeding complete!`);
  console.log(`   Seeded: ${seeded}`);
  console.log(`   Skipped (already cached): ${skipped}`);

  const total = db.prepare(`SELECT COUNT(*) as count FROM response_cache WHERE source = 'faq'`).get();
  console.log(`   Total FAQ entries in cache: ${total.count}`);

  db.close();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
