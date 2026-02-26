export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: PubMedCitation[];
  extractedData?: Record<string, unknown>;
  timestamp: number;
}

export interface PubMedCitation {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  abstract?: string;
}

export interface StreamEvent {
  type: 'text' | 'citations' | 'extracted_data' | 'done' | 'error';
  content?: string;
  papers?: PubMedCitation[];
  data?: Record<string, unknown>;
  error?: string;
}
