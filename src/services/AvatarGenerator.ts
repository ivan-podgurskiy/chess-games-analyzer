export interface PlayerAvatar {
  generatedAvatarUrl: string;
  chessComAvatarIcon?: string;
  generatedStyle: string;
  styleDescription: string;
  visualDescription: string;
  badges: AvatarBadge[];
  archetype: string;
  archetypeDescription: string;
  personalityTraits: string[];
}

export interface AvatarBadge {
  icon: string;
  label: string;
  color: string;
  description: string;
}

interface AvatarCacheEntry {
  avatar: PlayerAvatar;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class AvatarGenerator {
  private avatarCache: Map<string, AvatarCacheEntry> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  private generateCacheKey(
    username: string,
    accuracy: number,
    blunders: number,
    mistakes: number,
    inaccuracies: number,
    strengths: string[],
    weaknesses: string[],
    commonPatterns: any[]
  ): string {
    // Create a deterministic cache key based on user characteristics
    const normalizedUsername = username.toLowerCase().trim();
    const normalizedAccuracy = Math.round(accuracy * 10) / 10; // Round to 1 decimal
    const normalizedStrengths = strengths.sort().join(',');
    const normalizedWeaknesses = weaknesses.sort().join(',');
    const patternSummary = commonPatterns
      .map(p => `${p.type}-${p.severity}-${p.frequency}`)
      .sort()
      .join(',');
    
    return `${normalizedUsername}-${normalizedAccuracy}-${blunders}-${mistakes}-${inaccuracies}-${normalizedStrengths}-${normalizedWeaknesses}-${patternSummary}`;
  }

  private isCacheValid(entry: AvatarCacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.avatarCache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.avatarCache.delete(key);
      }
    }
  }

  getCacheStats(): { size: number; entries: Array<{ key: string; age: number; ttl: number }> } {
    const now = Date.now();
    const entries = Array.from(this.avatarCache.entries()).map(([key, entry]) => ({
      key: key.substring(0, 50) + '...', // Truncate for readability
      age: now - entry.timestamp,
      ttl: entry.ttl
    }));
    
    return {
      size: this.avatarCache.size,
      entries
    };
  }

  async generatePlayerAvatar(
    username: string,
    accuracy: number,
    blunders: number,
    mistakes: number,
    inaccuracies: number,
    strengths: string[],
    weaknesses: string[],
    commonPatterns: any[],
    chessComAvatar?: string,
    openaiApiKey?: string
  ): Promise<PlayerAvatar> {
    
    // Generate cache key based on user characteristics
    const cacheKey = this.generateCacheKey(
      username, accuracy, blunders, mistakes, inaccuracies,
      strengths, weaknesses, commonPatterns
    );
    
    // Cleanup expired cache entries periodically
    if (Math.random() < 0.1) { // 10% chance to cleanup on each request
      this.cleanupExpiredCache();
    }
    
    // Check cache first
    const cachedEntry = this.avatarCache.get(cacheKey);
    if (cachedEntry && this.isCacheValid(cachedEntry)) {
      console.log(`🎨 Using cached avatar for ${username} (${cachedEntry.avatar.archetype})`);
      // Update Chess.com avatar if it's different (this can change independently)
      if (chessComAvatar && chessComAvatar !== cachedEntry.avatar.chessComAvatarIcon) {
        cachedEntry.avatar.chessComAvatarIcon = chessComAvatar;
      }
      return cachedEntry.avatar;
    }
    
    console.log(`🎨 Generating new avatar for ${username}...`);
    
    // Determine playing archetype
    const archetype = this.determineArchetype(accuracy, blunders, commonPatterns);
    const archetypeDescription = this.getArchetypeDescription(archetype);
    
    // Generate style based on analysis
    const style = this.generateStyle(archetype, accuracy);
    const styleDescription = this.generateStyleDescription(archetype, accuracy);
    
    // Create badges based on performance
    const badges = this.generateBadges(accuracy, blunders, mistakes, strengths, weaknesses, commonPatterns);
    
    // Identify personality traits
    const traits = this.identifyPersonalityTraits(accuracy, blunders, strengths, weaknesses);
    
    // Generate visual description for avatar
    const visualDescription = this.generateVisualDescription(archetype, traits, accuracy);
    
    // Try to generate realistic avatar with OpenAI DALL-E
    let generatedAvatarUrl: string;
    try {
      if (openaiApiKey) {
        generatedAvatarUrl = await this.generateOpenAIAvatar(username, archetype, visualDescription, openaiApiKey);
      } else {
        // Fallback to DiceBear API (free, no API key needed)
        generatedAvatarUrl = this.generateDiceBearAvatar(username, archetype, style);
      }
    } catch (error) {
      console.error('Error generating OpenAI avatar, falling back to DiceBear:', error);
      generatedAvatarUrl = this.generateDiceBearAvatar(username, archetype, style);
    }
    
    const avatar: PlayerAvatar = {
      generatedAvatarUrl,
      chessComAvatarIcon: chessComAvatar,
      generatedStyle: style,
      styleDescription,
      visualDescription,
      badges,
      archetype,
      archetypeDescription,
      personalityTraits: traits
    };
    
    // Cache the generated avatar
    this.avatarCache.set(cacheKey, {
      avatar,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL
    });
    
    console.log(`✅ Avatar cached for ${username} (${archetype})`);
    
    return avatar;
  }

  private determineArchetype(accuracy: number, blunders: number, patterns: any[]): string {
    // Determine player archetype based on their play
    if (accuracy >= 90 && blunders === 0) {
      return 'The Grandmaster';
    }
    if (accuracy >= 85 && blunders <= 1) {
      return 'The Strategist';
    }
    if (blunders > 3) {
      const hasOpeningErrors = patterns.some(p => p.pattern?.includes('Opening'));
      if (hasOpeningErrors) return 'The Improviser';
      return 'The Warrior';
    }
    if (accuracy >= 80) {
      return 'The Calculator';
    }
    if (accuracy >= 70) {
      return 'The Student';
    }
    return 'The Enthusiast';
  }

  private getArchetypeDescription(archetype: string): string {
    const descriptions: Record<string, string> = {
      'The Grandmaster': 'Plays with precision and minimal errors, demonstrating mastery of chess principles',
      'The Strategist': 'Strong positional understanding with excellent planning and few tactical oversights',
      'The Calculator': 'Solid tactical vision with consistent calculation, but room for refinement',
      'The Warrior': 'Aggressive and fighting spirit, sometimes at the cost of accuracy',
      'The Improviser': 'Creative and unpredictable, with a tendency to deviate from theory early',
      'The Student': 'Learning and improving, with clear areas for focused development',
      'The Enthusiast': 'Passionate about the game, with significant room for growth'
    };
    return descriptions[archetype] || 'Developing chess player with unique style';
  }

  private generateStyle(archetype: string, accuracy: number): string {
    // Generate visual style identifier (could be used for actual avatar generation)
    const styles: Record<string, string> = {
      'The Grandmaster': '👑-precision-royal-gold',
      'The Strategist': '🧠-analytical-navy-silver',
      'The Calculator': '📊-methodical-blue-white',
      'The Warrior': '⚔️-aggressive-red-black',
      'The Improviser': '🎨-creative-purple-orange',
      'The Student': '📚-learning-green-blue',
      'The Enthusiast': '🌟-passionate-yellow-red'
    };
    return styles[archetype] || '♟️-player-gray-white';
  }

  private generateStyleDescription(archetype: string, accuracy: number): string {
    const level = accuracy >= 85 ? 'advanced' : accuracy >= 75 ? 'intermediate' : 'developing';
    return `${archetype} - ${level} level player`;
  }

  private generateBadges(
    accuracy: number,
    blunders: number,
    mistakes: number,
    strengths: string[],
    weaknesses: string[],
    patterns: any[]
  ): AvatarBadge[] {
    const badges: AvatarBadge[] = [];

    // Accuracy badge
    if (accuracy >= 90) {
      badges.push({
        icon: '🏆',
        label: 'High Accuracy',
        color: 'gold',
        description: `${accuracy.toFixed(1)}% accuracy - Excellent precision`
      });
    } else if (accuracy >= 85) {
      badges.push({
        icon: '⭐',
        label: 'Strong Player',
        color: 'blue',
        description: `${accuracy.toFixed(1)}% accuracy - Very good play`
      });
    } else if (accuracy >= 75) {
      badges.push({
        icon: '📈',
        label: 'Improving',
        color: 'green',
        description: `${accuracy.toFixed(1)}% accuracy - Solid foundation`
      });
    }

    // Blunder-free badge
    if (blunders === 0) {
      badges.push({
        icon: '🛡️',
        label: 'No Blunders',
        color: 'success',
        description: 'Excellent tactical awareness - no critical mistakes'
      });
    } else if (blunders > 3) {
      badges.push({
        icon: '⚠️',
        label: 'Tactical Training Needed',
        color: 'warning',
        description: `${blunders} blunders - Focus on tactics`
      });
    }

    // Pattern-based badges
    const tacticalPattern = patterns.find(p => p.pattern?.includes('Tactical'));
    if (tacticalPattern && tacticalPattern.frequency >= 3) {
      badges.push({
        icon: '🎯',
        label: 'Tactics Focus',
        color: 'danger',
        description: 'Work on spotting opponent threats'
      });
    }

    const openingPattern = patterns.find(p => p.pattern?.includes('Opening'));
    if (openingPattern && openingPattern.frequency >= 2) {
      badges.push({
        icon: '📖',
        label: 'Opening Study',
        color: 'info',
        description: 'Strengthen opening repertoire'
      });
    }

    const endgamePattern = patterns.find(p => p.pattern?.includes('Endgame'));
    if (endgamePattern) {
      badges.push({
        icon: '👑',
        label: 'Endgame Practice',
        color: 'warning',
        description: 'Improve endgame technique'
      });
    }

    // Strength-based badges
    if (strengths.length >= 3) {
      badges.push({
        icon: '💪',
        label: 'Well-Rounded',
        color: 'primary',
        description: 'Multiple strengths identified'
      });
    }

    // Consistency badge
    if (mistakes <= 2 && blunders <= 1) {
      badges.push({
        icon: '🎖️',
        label: 'Consistent',
        color: 'success',
        description: 'Reliable and steady play'
      });
    }

    return badges.slice(0, 6); // Limit to 6 most relevant badges
  }

  private identifyPersonalityTraits(
    accuracy: number,
    blunders: number,
    strengths: string[],
    weaknesses: string[]
  ): string[] {
    const traits: string[] = [];

    if (accuracy >= 85) {
      traits.push('Precise');
      traits.push('Disciplined');
    } else if (accuracy >= 75) {
      traits.push('Careful');
    }

    if (blunders === 0) {
      traits.push('Cautious');
      traits.push('Alert');
    } else if (blunders > 3) {
      traits.push('Aggressive');
      traits.push('Risk-taker');
    }

    if (strengths.some(s => s.toLowerCase().includes('tactical'))) {
      traits.push('Tactical');
    }

    if (strengths.some(s => s.toLowerCase().includes('positional'))) {
      traits.push('Strategic');
    }

    if (weaknesses.some(w => w.toLowerCase().includes('endgame'))) {
      traits.push('Action-oriented');
    }

    // Default traits if none identified
    if (traits.length === 0) {
      traits.push('Developing');
      traits.push('Determined');
    }

    return traits.slice(0, 4); // Max 4 traits
  }

  private generateVisualDescription(archetype: string, traits: string[], accuracy: number): string {
    const archetypeVisuals: Record<string, string> = {
      'The Grandmaster': 'Seasoned grandmaster with distinguished features, exuding confidence and decades of chess mastery.',
      'The Strategist': 'Thoughtful intellectual with analytical gaze, often wearing glasses, deep in strategic contemplation.',
      'The Calculator': 'Sharp-minded tactician with focused expression, methodical and precise in every decision.',
      'The Warrior': 'Determined competitor with fierce determination, ready to fight for every advantage on the board.',
      'The Improviser': 'Creative player with bright, expressive features, always ready to surprise with unconventional moves.',
      'The Student': 'Eager learner with youthful enthusiasm, hungry for knowledge and rapid improvement.',
      'The Enthusiast': 'Passionate chess lover with warm, energetic expression, bringing joy to every game.'
    };

    return archetypeVisuals[archetype] || 'A dedicated chess player on their journey to mastery.';
  }

  private async generateOpenAIAvatar(username: string, archetype: string, visualDescription: string, apiKey: string): Promise<string> {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey });
    
    // Generate detailed prompt for realistic chess player portrait
    const prompt = this.buildOpenAIPrompt(archetype, visualDescription);
    
    console.log(`🎨 Generating realistic avatar with OpenAI for ${archetype}...`);
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "natural"
    });
    
    if (!response.data || response.data.length === 0) {
      throw new Error('No image data returned from OpenAI');
    }
    
    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL returned from OpenAI');
    }
    
    console.log(`✅ OpenAI avatar generated successfully`);
    return imageUrl;
  }

  private buildOpenAIPrompt(archetype: string, visualDescription: string): string {
    const archetypePrompts: Record<string, string> = {
      'The Grandmaster': 'Professional portrait of a distinguished senior chess grandmaster, age 50-65, with wise, calculating eyes, wearing elegant casual attire. Serious but confident expression. Studio lighting, neutral background.',
      'The Strategist': 'Professional portrait of an intellectual chess player, age 35-45, wearing glasses, thoughtful analytical expression, business casual attire. Natural lighting, clean background.',
      'The Calculator': 'Professional portrait of a sharp, methodical chess player, age 30-40, focused intense gaze, modern professional attire. Clean studio lighting, minimal background.',
      'The Warrior': 'Professional portrait of a determined competitive chess player, age 28-38, fierce determined expression, athletic casual style. Strong lighting, dark background.',
      'The Improviser': 'Professional portrait of a creative unconventional chess player, age 25-35, bright expressive features, artistic casual style. Soft lighting, colorful background.',
      'The Student': 'Professional portrait of an eager young chess learner, age 18-25, enthusiastic friendly expression, casual student attire. Bright lighting, light background.',
      'The Enthusiast': 'Professional portrait of a passionate energetic chess lover, age 20-30, warm welcoming smile, casual comfortable attire. Natural bright lighting, warm background.'
    };
    
    const basePrompt = archetypePrompts[archetype] || 'Professional portrait of a chess player, realistic photo';
    return `${basePrompt} High quality professional headshot, photorealistic, 4k, detailed facial features.`;
  }

  private generateDiceBearAvatar(username: string, archetype: string, style: string): string {
    // Map archetypes to realistic avatar styles and characteristics
    const archetypeStyles: Record<string, {style: string; options: string}> = {
      'The Grandmaster': { 
        style: 'personas',
        options: 'mood=serious&backgroundColor=1e293b&hair=longHair,mediumHair&facialHair=beardMedium,beardLight'
      },
      'The Strategist': { 
        style: 'lorelei',
        options: 'backgroundColor=1e40af&glasses=true'
      },
      'The Calculator': { 
        style: 'notionists-neutral',
        options: 'backgroundColor=2563eb'
      },
      'The Warrior': { 
        style: 'personas',
        options: 'mood=determined&backgroundColor=7f1d1d&hair=shortHair&facialHair=beardMedium'
      },
      'The Improviser': { 
        style: 'lorelei',
        options: 'backgroundColor=6b21a8&glasses=false'
      },
      'The Student': { 
        style: 'notionists-neutral',
        options: 'backgroundColor=15803d'
      },
      'The Enthusiast': { 
        style: 'personas',
        options: 'mood=happy&backgroundColor=a16207&hair=shortHair'
      }
    };

    const config = archetypeStyles[archetype] || { 
      style: 'personas', 
      options: 'backgroundColor=6b7280&mood=neutral'
    };
    
    // Use DiceBear API with realistic human-like avatars
    // Add username as seed for consistent avatar generation
    const seed = `${username}-${archetype}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    return `https://api.dicebear.com/7.x/${config.style}/svg?seed=${seed}&${config.options}&size=200&scale=90`;
  }

  async generateAIDescription(
    archetype: string,
    accuracy: number,
    traits: string[],
    anthropic?: any
  ): Promise<string> {
    if (!anthropic) {
      // Fallback description
      return `${archetype} with ${accuracy.toFixed(1)}% accuracy. Playing style: ${traits.join(', ')}.`;
    }

    try {
      const prompt = `Create a short, engaging 2-sentence description for a chess player with these characteristics:
      - Archetype: ${archetype}
      - Accuracy: ${accuracy.toFixed(1)}%
      - Personality traits: ${traits.join(', ')}
      
      Make it encouraging and specific. Return only the description, no other text.`;

      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 150,
        temperature: 0.8,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return message.content[0].type === 'text' ? message.content[0].text : '';
    } catch (error) {
      console.error('Error generating AI description:', error);
      return `${archetype} with ${accuracy.toFixed(1)}% accuracy. Playing style: ${traits.join(', ')}.`;
    }
  }
}

