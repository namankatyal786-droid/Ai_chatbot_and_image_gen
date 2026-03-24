export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  timestamp: number;
}

export interface Settings {
  huggingFaceKey: string;
  theme: 'light' | 'dark';
}
