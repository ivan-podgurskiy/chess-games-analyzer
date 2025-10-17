export interface MistakePattern {
  type: 'tactical' | 'positional' | 'opening' | 'endgame' | 'time_management';
  description: string;
  frequency: number;
  severity: 'minor' | 'moderate' | 'major';
  examples: {
    gameId: string;
    moveNumber: number;
    position: string; // FEN
    explanation: string;
  }[];
}

export interface ImprovementArea {
  category: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
  studyResources: string[];
}

export interface PlayerAvatar {
  generatedAvatarUrl: string;
  chessComAvatarIcon?: string;
  generatedStyle: string;
  styleDescription: string;
  visualDescription: string;
  badges: Array<{
    icon: string;
    label: string;
    color: string;
    description: string;
  }>;
  archetype: string;
  archetypeDescription: string;
  personalityTraits: string[];
}

export interface PlayerProfile {
  username: string;
  totalGames: number;
  winRate: number;
  averageRating: number;
  averageAccuracy: number;
  timeClassStats: {
    [key: string]: {
      games: number;
      wins: number;
      losses: number;
      draws: number;
      averageAccuracy: number;
    };
  };
  mistakePatterns: MistakePattern[];
  improvementAreas: ImprovementArea[];
  strengths: string[];
  weaknesses: string[];
  lastAnalyzed: Date;
  avatar?: PlayerAvatar;
}