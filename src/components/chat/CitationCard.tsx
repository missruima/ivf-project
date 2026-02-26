import type { PubMedCitation } from '@/types/chat';

interface CitationCardProps {
  citation: PubMedCitation;
}

export function CitationCard({ citation }: CitationCardProps) {
  return (
    <a
      href={`https://pubmed.ncbi.nlm.nih.gov/${citation.pmid}/`}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-border/60 bg-card px-3 py-2.5 hover:border-primary/30 hover:shadow-sm transition-all text-left"
    >
      <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">
        {citation.title}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1">
        {citation.authors} &middot; {citation.journal} ({citation.year})
      </p>
      <p className="text-[11px] text-primary mt-0.5">PMID: {citation.pmid}</p>
    </a>
  );
}
