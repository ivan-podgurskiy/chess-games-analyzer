export interface Player {
  username: string;
  rating: number;
  result: 'win' | 'lose' | 'draw' | 'timeout' | 'resigned' | 'abandoned';
}

export interface Game {
  id: string;
  url: string;
  pgn: string;
  timeControl: string;
  timeClass: 'bullet' | 'blitz' | 'rapid' | 'daily';
  endTime: Date;
  rated: boolean;
  white: Player;
  black: Player;
  accuracies?: {
    white: number;
    black: number;
  };
  rules: string;
}

export interface Move {
  san: string;
  fen: string;
  moveNumber: number;
  isWhiteMove: boolean;
  evaluation?: number;
  bestMove?: string;
  classification?: 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
}

export interface MistakeExample {
  moveNumber: number;
  move: string;
  type: 'blunder' | 'mistake' | 'inaccuracy';
  position: string;
  explanation: string;
  betterMove: string;
  pattern?: string;
  gameId?: string;
}

export interface CommonPattern {
  pattern: string;
  description: string;
  frequency: number;
  examples?: MistakeExample[];
}

export interface AIGameSummary {
  summary: string;
  keyMoments: string[];
  strengths: string[];
  weaknesses: string[];
  advice: string[];
  improvementPlan: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  mistakeExamples: MistakeExample[];
  commonPatterns: CommonPattern[];
}

export interface GameAnalysis {
  gameId: string;
  moves: Move[];
  playerColor: 'white' | 'black';
  mistakes: any[];
  recommendations: string[];
  overallAccuracy: number;
  openingName?: string;
  endgameType?: string;
  aiSummary?: AIGameSummary;
}