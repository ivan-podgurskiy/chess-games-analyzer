import fetch from 'node-fetch';

export interface ChessComGame {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  tcn: string;
  uuid: string;
  initial_setup: string;
  fen: string;
  time_class: string;
  rules: string;
  white: {
    rating: number;
    result: string;
    '@id': string;
    username: string;
    uuid: string;
  };
  black: {
    rating: number;
    result: string;
    '@id': string;
    username: string;
    uuid: string;
  };
  accuracies?: {
    white: number;
    black: number;
  };
}

export interface GameArchive {
  games: ChessComGame[];
}

export interface ChessComPlayerProfile {
  username: string;
  player_id: number;
  title?: string;
  status: string;
  name?: string;
  avatar?: string;
  location?: string;
  country: string;
  joined: number;
  last_online: number;
  followers: number;
  is_streamer: boolean;
  verified: boolean;
}

export class ChessComService {
  private readonly baseUrl = 'https://api.chess.com/pub';
  private readonly userAgent = 'chess-analyzer/1.0 (contact: analyzer@example.com)';

  async getPlayerArchives(username: string): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/player/${username}/games/archives`, {
      headers: {
        'User-Agent': this.userAgent
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch archives: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { archives: string[] };
    return data.archives;
  }

  async getMonthlyGames(username: string, year: number, month: number): Promise<ChessComGame[]> {
    const monthStr = month.toString().padStart(2, '0');
    const response = await fetch(`${this.baseUrl}/player/${username}/games/${year}/${monthStr}`, {
      headers: {
        'User-Agent': this.userAgent
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch games: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as GameArchive;
    return data.games;
  }

  async getAllPlayerGames(username: string, limit?: number): Promise<ChessComGame[]> {
    const archives = await this.getPlayerArchives(username);
    const allGames: ChessComGame[] = [];

    for (const archive of archives) {
      const urlParts = archive.split('/');
      const year = parseInt(urlParts[urlParts.length - 2]);
      const month = parseInt(urlParts[urlParts.length - 1]);

      try {
        const games = await this.getMonthlyGames(username, year, month);
        allGames.push(...games);

        if (limit && allGames.length >= limit) {
          return allGames.slice(0, limit);
        }

        await this.delay(100);
      } catch (error) {
        console.error(`Failed to fetch games for ${year}/${month}:`, error);
      }
    }

    return allGames;
  }

  async getCurrentGames(username: string): Promise<ChessComGame[]> {
    const response = await fetch(`${this.baseUrl}/player/${username}/games`, {
      headers: {
        'User-Agent': this.userAgent
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch current games: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as GameArchive;
    return data.games;
  }

  async getPlayerProfile(username: string): Promise<ChessComPlayerProfile> {
    const response = await fetch(`${this.baseUrl}/player/${username}`, {
      headers: {
        'User-Agent': this.userAgent
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch player profile: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as ChessComPlayerProfile;
    return data;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}