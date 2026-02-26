import type { PubMedCitation } from '@/types/chat';

const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

interface ESearchResult {
  esearchresult: {
    idlist: string[];
    count: string;
  };
}

/**
 * Search PubMed for articles matching the query.
 * Returns up to `maxResults` article IDs.
 */
async function searchPubMed(
  query: string,
  maxResults: number = 5
): Promise<string[]> {
  const apiKey = process.env.NCBI_API_KEY;
  const params = new URLSearchParams({
    db: 'pubmed',
    term: `${query} AND (IVF OR "in vitro fertilization" OR "assisted reproduction")`,
    retmax: String(maxResults),
    sort: 'relevance',
    retmode: 'json',
  });
  if (apiKey) params.set('api_key', apiKey);

  const res = await fetch(`${EUTILS_BASE}/esearch.fcgi?${params}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`PubMed search failed: ${res.status}`);

  const data: ESearchResult = await res.json();
  return data.esearchresult.idlist || [];
}

/**
 * Fetch article details from PubMed by their IDs.
 * Returns XML which we parse into structured citations.
 */
async function fetchArticles(pmids: string[]): Promise<PubMedCitation[]> {
  if (pmids.length === 0) return [];

  const apiKey = process.env.NCBI_API_KEY;
  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'xml',
    rettype: 'abstract',
  });
  if (apiKey) params.set('api_key', apiKey);

  const res = await fetch(`${EUTILS_BASE}/efetch.fcgi?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`PubMed fetch failed: ${res.status}`);

  const xml = await res.text();
  return parseArticleXml(xml);
}

/**
 * Parse PubMed XML response into structured citations.
 * Uses simple regex parsing to avoid needing a full XML parser dependency.
 */
function parseArticleXml(xml: string): PubMedCitation[] {
  const citations: PubMedCitation[] = [];
  const articleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;

  let match;
  while ((match = articleRegex.exec(xml)) !== null) {
    const article = match[1];

    const pmid = extractTag(article, 'PMID') || '';
    const title = extractTag(article, 'ArticleTitle') || 'Untitled';
    const journal = extractTag(article, 'Title') || extractTag(article, 'ISOAbbreviation') || '';
    const year = extractTag(article, 'Year') || '';

    // Extract authors
    const authorNames: string[] = [];
    const authorRegex = /<Author[^>]*>([\s\S]*?)<\/Author>/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(article)) !== null) {
      const lastName = extractTag(authorMatch[1], 'LastName');
      const initials = extractTag(authorMatch[1], 'Initials');
      if (lastName) {
        authorNames.push(initials ? `${lastName} ${initials}` : lastName);
      }
    }

    // Extract abstract
    const abstractTexts: string[] = [];
    const abstractRegex = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
    let abstractMatch;
    while ((abstractMatch = abstractRegex.exec(article)) !== null) {
      abstractTexts.push(abstractMatch[1].replace(/<[^>]*>/g, '').trim());
    }

    const authors =
      authorNames.length > 3
        ? `${authorNames.slice(0, 3).join(', ')} et al.`
        : authorNames.join(', ');

    citations.push({
      pmid,
      title: decodeHtmlEntities(title.replace(/<[^>]*>/g, '')),
      authors,
      journal,
      year,
      abstract: abstractTexts.join(' ').slice(0, 2000),
    });
  }

  return citations;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const match = regex.exec(xml);
  return match ? decodeHtmlEntities(match[1].replace(/<[^>]*>/g, '').trim()) : null;
}

/**
 * Search PubMed and return structured citations.
 * This is the main entry point for the research chat.
 */
export async function searchAndFetchArticles(
  query: string,
  maxResults: number = 5
): Promise<PubMedCitation[]> {
  try {
    const pmids = await searchPubMed(query, maxResults);
    return await fetchArticles(pmids);
  } catch (error) {
    console.error('PubMed search error:', error);
    return [];
  }
}
