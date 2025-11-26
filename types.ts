
export interface QAPageContent {
  question: string;
  answer: string;
  explanation: string;
  illustrationUrl?: string;
  question_sinhala?: string;
  answer_sinhala?: string;
  explanation_sinhala?: string;
  question_tamil?: string;
  answer_tamil?: string;
  explanation_tamil?: string;
}

export type ExplanationStyle = 'concise' | 'detailed' | 'step-by-step';
export type CoverTheme = 'abstract' | 'minimalist' | 'vintage' | 'futuristic';

export type FlipbookPage =
  | { type: 'cover'; imageUrl: string; title: string }
  | { type: 'toc'; title: string; items: string[] }
  | { type: 'qa'; content: QAPageContent; questionNumber: number }
  | { type: 'story'; title: string; content: string; illustrationPrompt: string; illustrationUrl?: string }
  | { type: 'blank' };
