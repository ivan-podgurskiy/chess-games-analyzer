import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { ChessComGame, ChessComPlayerProfile } from './ChessComService';
import { GameAnalysis } from '../models/Game';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class CacheService {
  private db: sqlite3.Database | null = null;
  private dbReady: Promise<void>;
  
  // In-memory cache for user profiles (short-term)
  private userProfileCache = new Map<string, CacheEntry<ChessComPlayerProfile>>();
  private readonly USER_PROFILE_TTL = 3600000; // 1 hour in milliseconds
  
  // In-memory cache for monthly games (medium-term)
  private monthlyGamesCache = new Map<string, CacheEntry<ChessComGame[]>>();
  private readonly MONTHLY_GAMES_TTL = 86400000; // 24 hours in milliseconds

  constructor(private cacheDir: string = '.cache') {
    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    // Initialize SQLite database for long-term game storage
    this.dbReady = this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(this.cacheDir, 'games.db');
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Failed to open database:', err);
          reject(err);
          return;
        }

        // Create games table for long-term storage
        this.db!.run(`
          CREATE TABLE IF NOT EXISTS games (
            uuid TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            game_data TEXT NOT NULL,
            cached_at INTEGER NOT NULL
          )
        `, (err) => {
          if (err) {
            console.error('Failed to create table:', err);
            reject(err);
            return;
          }
          
          // Create index for efficient lookups by username and date
          this.db!.run(`
            CREATE INDEX IF NOT EXISTS idx_username_date 
            ON games(username, year, month)
          `, (err) => {
            if (err) {
              console.error('Failed to create index:', err);
              reject(err);
              return;
            }
            
            // Create analysis table for caching AI analysis results
            this.db!.run(`
              CREATE TABLE IF NOT EXISTS analysis (
                game_uuid TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                analysis_data TEXT NOT NULL,
                cached_at INTEGER NOT NULL,
                FOREIGN KEY (game_uuid) REFERENCES games(uuid)
              )
            `, (err) => {
              if (err) {
                console.error('Failed to create analysis table:', err);
                reject(err);
                return;
              }
              
              // Create index for efficient lookups by username
              this.db!.run(`
                CREATE INDEX IF NOT EXISTS idx_analysis_username 
                ON analysis(username)
              `, (err) => {
                if (err) {
                  console.error('Failed to create analysis index:', err);
                  reject(err);
                } else {
                  console.log('✅ Cache database initialized (games + analysis)');
                  resolve();
                }
              });
            });
          });
        });
      });
    });
  }

  // ============= USER PROFILE CACHING (In-Memory, Short-term) =============

  getCachedUserProfile(username: string): ChessComPlayerProfile | null {
    const cached = this.userProfileCache.get(username.toLowerCase());
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now > cached.expiresAt) {
      this.userProfileCache.delete(username.toLowerCase());
      return null;
    }

    console.log(`💾 Cache hit: User profile for ${username}`);
    return cached.data;
  }

  cacheUserProfile(username: string, profile: ChessComPlayerProfile): void {
    const now = Date.now();
    this.userProfileCache.set(username.toLowerCase(), {
      data: profile,
      timestamp: now,
      expiresAt: now + this.USER_PROFILE_TTL
    });
    console.log(`💾 Cached user profile for ${username} (TTL: 1 hour)`);
  }

  // ============= MONTHLY GAMES CACHING (In-Memory, Medium-term) =============

  getCachedMonthlyGames(username: string, year: number, month: number): ChessComGame[] | null {
    const key = `${username.toLowerCase()}_${year}_${month}`;
    const cached = this.monthlyGamesCache.get(key);
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    
    // For current month, always refresh (games are still being played)
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    if (year === currentYear && month === currentMonth) {
      // Current month: short TTL or no cache
      if (now > cached.timestamp + 300000) { // 5 minutes for current month
        this.monthlyGamesCache.delete(key);
        return null;
      }
    } else {
      // Past months: games are immutable, cache longer
      if (now > cached.expiresAt) {
        this.monthlyGamesCache.delete(key);
        return null;
      }
    }

    console.log(`💾 Cache hit: Monthly games for ${username} ${year}/${month}`);
    return cached.data;
  }

  cacheMonthlyGames(username: string, year: number, month: number, games: ChessComGame[]): void {
    const now = Date.now();
    const key = `${username.toLowerCase()}_${year}_${month}`;
    
    this.monthlyGamesCache.set(key, {
      data: games,
      timestamp: now,
      expiresAt: now + this.MONTHLY_GAMES_TTL
    });
    
    console.log(`💾 Cached ${games.length} games for ${username} ${year}/${month} (TTL: 24 hours)`);
  }

  // ============= INDIVIDUAL GAME CACHING (SQLite, Long-term) =============

  async getCachedGame(uuid: string): Promise<ChessComGame | null> {
    await this.dbReady;
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      this.db.get(
        'SELECT game_data FROM games WHERE uuid = ?',
        [uuid],
        (err, row: any) => {
          if (err) {
            console.error('Error fetching cached game:', err);
            resolve(null);
            return;
          }

          if (!row) {
            resolve(null);
            return;
          }

          try {
            const game = JSON.parse(row.game_data) as ChessComGame;
            console.log(`💾 Cache hit: Game ${uuid}`);
            resolve(game);
          } catch (error) {
            console.error('Error parsing cached game:', error);
            resolve(null);
          }
        }
      );
    });
  }

  async cacheGame(game: ChessComGame, username: string): Promise<void> {
    await this.dbReady;
    
    if (!this.db) {
      return;
    }

    // Extract year/month from game URL or end_time
    let year = 0;
    let month = 0;
    
    if (game.end_time) {
      const date = new Date(game.end_time * 1000);
      year = date.getFullYear();
      month = date.getMonth() + 1;
    }

    return new Promise((resolve, reject) => {
      this.db!.run(
        `INSERT OR REPLACE INTO games (uuid, username, year, month, game_data, cached_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          game.uuid,
          username.toLowerCase(),
          year,
          month,
          JSON.stringify(game),
          Date.now()
        ],
        (err) => {
          if (err) {
            console.error('Error caching game:', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async cacheGames(games: ChessComGame[], username: string): Promise<void> {
    await this.dbReady;
    
    if (!this.db || games.length === 0) {
      return;
    }

    const promises = games.map(game => this.cacheGame(game, username));
    await Promise.all(promises);
    
    console.log(`💾 Cached ${games.length} games to database for ${username}`);
  }

  // ============= ANALYSIS CACHING (SQLite, Long-term) =============

  async getCachedAnalysis(gameUuid: string, username: string): Promise<GameAnalysis | null> {
    await this.dbReady;
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      this.db.get(
        'SELECT analysis_data FROM analysis WHERE game_uuid = ? AND username = ?',
        [gameUuid, username.toLowerCase()],
        (err, row: any) => {
          if (err) {
            console.error('Error fetching cached analysis:', err);
            resolve(null);
            return;
          }

          if (!row) {
            resolve(null);
            return;
          }

          try {
            const analysis = JSON.parse(row.analysis_data) as GameAnalysis;
            console.log(`💾 Cache hit: Analysis for game ${gameUuid}`);
            resolve(analysis);
          } catch (error) {
            console.error('Error parsing cached analysis:', error);
            resolve(null);
          }
        }
      );
    });
  }

  async cacheAnalysis(gameUuid: string, username: string, analysis: GameAnalysis): Promise<void> {
    await this.dbReady;
    
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.db!.run(
        `INSERT OR REPLACE INTO analysis (game_uuid, username, analysis_data, cached_at)
         VALUES (?, ?, ?, ?)`,
        [
          gameUuid,
          username.toLowerCase(),
          JSON.stringify(analysis),
          Date.now()
        ],
        (err) => {
          if (err) {
            console.error('Error caching analysis:', err);
            reject(err);
          } else {
            console.log(`💾 Cached analysis for game ${gameUuid}`);
            resolve();
          }
        }
      );
    });
  }

  async getCachedAnalyses(username: string, gameUuids: string[]): Promise<Map<string, GameAnalysis>> {
    await this.dbReady;
    
    const cachedAnalyses = new Map<string, GameAnalysis>();
    
    if (!this.db || gameUuids.length === 0) {
      return cachedAnalyses;
    }

    const placeholders = gameUuids.map(() => '?').join(',');
    const query = `SELECT game_uuid, analysis_data FROM analysis 
                   WHERE username = ? AND game_uuid IN (${placeholders})`;

    return new Promise((resolve, reject) => {
      this.db!.all(
        query,
        [username.toLowerCase(), ...gameUuids],
        (err, rows: any[]) => {
          if (err) {
            console.error('Error fetching cached analyses:', err);
            resolve(cachedAnalyses);
            return;
          }

          if (!rows) {
            resolve(cachedAnalyses);
            return;
          }

          rows.forEach(row => {
            try {
              const analysis = JSON.parse(row.analysis_data) as GameAnalysis;
              cachedAnalyses.set(row.game_uuid, analysis);
            } catch (error) {
              console.error('Error parsing cached analysis:', error);
            }
          });

          if (cachedAnalyses.size > 0) {
            console.log(`💾 Cache hit: ${cachedAnalyses.size} analyses for ${username}`);
          }

          resolve(cachedAnalyses);
        }
      );
    });
  }

  // ============= CACHE STATISTICS =============

  async getCacheStats(): Promise<{
    userProfiles: number;
    monthlyGamesEntries: number;
    totalCachedGames: number;
    totalCachedAnalyses: number;
    databaseSize: string;
  }> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve({
          userProfiles: this.userProfileCache.size,
          monthlyGamesEntries: this.monthlyGamesCache.size,
          totalCachedGames: 0,
          totalCachedAnalyses: 0,
          databaseSize: '0 KB'
        });
        return;
      }

      // Get games count
      this.db.get('SELECT COUNT(*) as count FROM games', (err, gamesRow: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Get analysis count
        this.db!.get('SELECT COUNT(*) as count FROM analysis', (err, analysisRow: any) => {
          if (err) {
            reject(err);
            return;
          }

          // Get database file size
          const dbPath = path.join(this.cacheDir, 'games.db');
          let dbSize = '0 KB';
          try {
            const stats = fs.statSync(dbPath);
            const sizeKB = (stats.size / 1024).toFixed(2);
            dbSize = `${sizeKB} KB`;
          } catch (error) {
            // File might not exist yet
          }

          resolve({
            userProfiles: this.userProfileCache.size,
            monthlyGamesEntries: this.monthlyGamesCache.size,
            totalCachedGames: gamesRow?.count || 0,
            totalCachedAnalyses: analysisRow?.count || 0,
            databaseSize: dbSize
          });
        });
      });
    });
  }

  // ============= CACHE CLEANUP =============

  clearUserProfileCache(username?: string): void {
    if (username) {
      this.userProfileCache.delete(username.toLowerCase());
      console.log(`🗑️ Cleared user profile cache for ${username}`);
    } else {
      this.userProfileCache.clear();
      console.log('🗑️ Cleared all user profile cache');
    }
  }

  clearMonthlyGamesCache(username?: string): void {
    if (username) {
      const keysToDelete: string[] = [];
      for (const key of this.monthlyGamesCache.keys()) {
        if (key.startsWith(username.toLowerCase())) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.monthlyGamesCache.delete(key));
      console.log(`🗑️ Cleared monthly games cache for ${username}`);
    } else {
      this.monthlyGamesCache.clear();
      console.log('🗑️ Cleared all monthly games cache');
    }
  }

  async clearGameCache(username?: string): Promise<void> {
    await this.dbReady;
    
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      if (username) {
        this.db!.run(
          'DELETE FROM games WHERE username = ?',
          [username.toLowerCase()],
          (err) => {
            if (err) {
              reject(err);
            } else {
              console.log(`🗑️ Cleared game cache for ${username}`);
              resolve();
            }
          }
        );
      } else {
        this.db!.run('DELETE FROM games', (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('🗑️ Cleared all game cache');
            resolve();
          }
        });
      }
    });
  }

  async clearAnalysisCache(username?: string): Promise<void> {
    await this.dbReady;
    
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      if (username) {
        this.db!.run(
          'DELETE FROM analysis WHERE username = ?',
          [username.toLowerCase()],
          (err) => {
            if (err) {
              reject(err);
            } else {
              console.log(`🗑️ Cleared analysis cache for ${username}`);
              resolve();
            }
          }
        );
      } else {
        this.db!.run('DELETE FROM analysis', (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('🗑️ Cleared all analysis cache');
            resolve();
          }
        });
      }
    });
  }

  async clearAllCache(username?: string): Promise<void> {
    this.clearUserProfileCache(username);
    this.clearMonthlyGamesCache(username);
    await this.clearGameCache(username);
    await this.clearAnalysisCache(username);
    console.log('🗑️ All caches cleared');
  }

  // ============= CLEANUP =============

  async close(): Promise<void> {
    await this.dbReady;
    
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db!.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('💾 Cache database closed');
            resolve();
          }
        });
      });
    }
  }
}

