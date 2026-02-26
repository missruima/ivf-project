/**
 * Response cache for IVF Explorer.
 *
 * Two-phase lookup:
 * 1. Exact match by SHA-256 hash of normalized question (fast, indexed)
 * 2. Fuzzy match via Jaccard similarity on extracted IVF-relevant keywords
 *
 * Cache entries expire after CACHE_TTL_DAYS (default 7).
 */

import { getDb } from '@/lib/db';
import { createHash, randomUUID } from 'crypto';
import type { PubMedCitation } from '@/types/chat';

// ── Configuration ──

const CACHE_TTL_DAYS = 7;
const FUZZY_MATCH_THRESHOLD = 0.35;

// ── Stopwords (removed before keyword extraction) ──

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

// Domain-relevant bigrams that should be kept as single terms
const BIGRAMS = new Set([
  'live birth', 'male factor', 'egg quality', 'sperm quality',
  'embryo transfer', 'egg retrieval', 'ovarian reserve',
  'frozen transfer', 'fresh transfer', 'birth rate',
  'day 5', 'day 6', 'day 7', 'day 3',
  'vitamin d', 'coq 10', 'folic acid',
  'mini ivf', 'natural ivf',
  'estrogen priming', 'long lupron', 'short lupron',
]);

// ── Keyword extraction ──

export function extractKeywords(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = normalized.split(' ');

  // Check for bigrams first
  const foundBigrams: string[] = [];
  const bigramIndices = new Set<number>();
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    if (BIGRAMS.has(bigram)) {
      foundBigrams.push(bigram);
      bigramIndices.add(i);
      bigramIndices.add(i + 1);
    }
  }

  // Collect single words (not part of bigrams, not stopwords, length > 1)
  const singleWords = words.filter(
    (w, i) => w.length > 1 && !STOPWORDS.has(w) && !bigramIndices.has(i)
  );

  return [...new Set([...foundBigrams, ...singleWords])].sort();
}

export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hashQuestion(normalizedText: string): string {
  return createHash('sha256').update(normalizedText).digest('hex');
}

// ── Jaccard similarity ──

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ── Cache types ──

export interface CachedResponse {
  responseText: string;
  citations: PubMedCitation[] | null;
  source: 'live' | 'faq';
}

// ── Cache lookup ──

export function lookupCache(question: string): CachedResponse | null {
  const db = getDb();
  const normalized = normalizeQuestion(question);
  const hash = hashQuestion(normalized);

  // Phase 1: Exact match by hash (fast path, indexed)
  const exact = db.prepare(`
    SELECT response_text, citations_json, source
    FROM response_cache
    WHERE question_hash = ? AND expires_at > datetime('now')
    ORDER BY created_at DESC
    LIMIT 1
  `).get(hash) as {
    response_text: string;
    citations_json: string | null;
    source: string;
  } | undefined;

  if (exact) {
    return {
      responseText: exact.response_text,
      citations: exact.citations_json ? JSON.parse(exact.citations_json) : null,
      source: exact.source as 'live' | 'faq',
    };
  }

  // Phase 2: Fuzzy match via Jaccard similarity on keywords
  const queryKeywords = new Set(extractKeywords(question));
  if (queryKeywords.size === 0) return null;

  const candidates = db.prepare(`
    SELECT keywords, response_text, citations_json, source
    FROM response_cache
    WHERE expires_at > datetime('now')
  `).all() as Array<{
    keywords: string;
    response_text: string;
    citations_json: string | null;
    source: string;
  }>;

  let bestMatch: CachedResponse | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const candidateKeywords = new Set<string>(JSON.parse(candidate.keywords));
    const score = jaccardSimilarity(queryKeywords, candidateKeywords);

    if (score > bestScore && score >= FUZZY_MATCH_THRESHOLD) {
      bestScore = score;
      bestMatch = {
        responseText: candidate.response_text,
        citations: candidate.citations_json
          ? JSON.parse(candidate.citations_json)
          : null,
        source: candidate.source as 'live' | 'faq',
      };
    }
  }

  return bestMatch;
}

// ── Cache write ──

export function writeCache(
  question: string,
  responseText: string,
  citations: PubMedCitation[] | null,
  source: 'live' | 'faq' = 'live'
): void {
  const db = getDb();
  const normalized = normalizeQuestion(question);
  const hash = hashQuestion(normalized);
  const keywords = extractKeywords(question);

  // Don't re-cache if exact hash match already exists and is not expired
  const existing = db.prepare(`
    SELECT id FROM response_cache
    WHERE question_hash = ? AND expires_at > datetime('now')
  `).get(hash);

  if (existing) return;

  // Strip abstracts from citations before caching (they're large and not displayed)
  const citationsJson = citations
    ? JSON.stringify(
        citations.map(({ abstract: _a, ...rest }) => rest)
      )
    : null;

  db.prepare(`
    INSERT INTO response_cache
      (id, question_hash, question_text, question_normalized, keywords,
       response_text, citations_json, source, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+${CACHE_TTL_DAYS} days'))
  `).run(
    randomUUID(),
    hash,
    question,
    normalized,
    JSON.stringify(keywords),
    responseText,
    citationsJson,
    source
  );
}

// ── Cache cleanup ──

export function purgeExpiredCache(): number {
  const db = getDb();
  const result = db.prepare(
    `DELETE FROM response_cache WHERE expires_at <= datetime('now')`
  ).run();
  return result.changes;
}
