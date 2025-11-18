
export interface QAPageContent {
  question: string;
  answer: string;
  explanation: string;
}

export type ExplanationStyle = 'concise' | 'detailed' | 'step-by-step';
export type CoverTheme = 'abstract' | 'minimalist' | 'vintage' | 'futuristic';

export type FlipbookPage =
  | { type: 'cover'; imageUrl: string; title: string }
  | { type: 'toc'; title: string; items: string[] }
  | { type: 'qa'; content: QAPageContent; questionNumber: number }
  | { type: 'blank' };
