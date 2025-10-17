# Chess.com Games Analyzer 🧠

An **Claude AI-powered** chess analysis tool that imports your Chess.com games, provides intelligent analysis with natural language insights, and delivers personalized improvement recommendations.

## Features

- 🏁 **Import Games**: Automatically fetch games from Chess.com using their public API
- 🧠 **Claude AI Analysis**: Real AI-powered comprehensive game analysis with natural language insights
- 🤖 **AI Summary Section**: Get personalized AI-generated summaries including:
  - Game overview and performance assessment
  - Key moments and turning points
  - Strengths and weaknesses analysis
  - Actionable coaching advice
  - Personalized improvement plan (immediate, short-term, long-term)
- 🎯 **Pattern Recognition**: Advanced tactical and positional concept identification
- 🔍 **Pattern Detection**: Identify recurring mistake patterns across games
- 📊 **Performance Tracking**: Track win rates, accuracy, and improvement over time
- 🎯 **Personalized Recommendations**: Get specific advice based on your playing style
- 📚 **Study Plans**: Receive customized daily and weekly study plans
- ⚡ **Quick Analysis**: Fast overview of recent games

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd chess-com-games-analyzer

# Install dependencies
npm install

# Build the project
npm run build

# (Optional) Set up Claude AI for comprehensive analysis
# Create a .env file and add your Anthropic API key
echo "ANTHROPIC_API_KEY=your_api_key_here" > .env

# Install globally for CLI usage
npm install -g .
```

## Configuration

### AI Integration (Optional)

For the most comprehensive AI-powered game analysis and realistic avatar generation:

#### Claude AI (For Game Analysis)
1. Get an API key from [Anthropic Console](https://console.anthropic.com/)
2. Add to your `.env` file:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

#### OpenAI (For Realistic Avatar Generation)
1. Get an API key from [OpenAI Platform](https://platform.openai.com/)
2. Add to your `.env` file:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

**Complete .env example:**
```
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

**Note:** If API keys are not provided, the system will automatically use sophisticated fallback systems:
- Game analysis: Rule-based intelligent analysis
- Avatar generation: DiceBear realistic avatars (free, no API key needed)

## Usage

### Telegram Bot (New!)
Get chess analysis directly in Telegram:

```bash
# Start the Telegram bot
npm run bot
```

**Setup:**
1. Create a bot with [@BotFather](https://t.me/BotFather) on Telegram
2. Get your bot token
3. Add to your `.env` file:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ```
4. Run `npm run bot`

**Bot Commands:**
- `/start` - Welcome message and help
- `/analyze <username> [limit]` - Analyze Chess.com games
- `/help` - Show available commands

**Example:**
```
/analyze magnuscarlsen
/analyze your_username 50
```

**Features:**
- 🤖 Direct analysis in Telegram
- 📊 Real-time progress updates
- 📱 Mobile-optimized formatting
- 🎯 Personalized recommendations
- 📋 Games list with insights
- 🧠 AI-powered summaries

### Web Interface (Recommended)
The easiest way to use the analyzer:

```bash
# Start the web server
npm run web

# Open your browser to http://localhost:3000
```

**Features:**
- 🌐 Beautiful web interface
- 📊 Real-time progress tracking
- 📱 Mobile-friendly design
- 🎯 Interactive results display
- ⚡ Both quick and full analysis modes

### Command Line Interface

#### Full Analysis
```bash
node dist/index.js analyze <username> [options]

# Examples:
node dist/index.js analyze your_username
node dist/index.js analyze your_username --limit 100 --time 45
```

#### Quick Analysis
```bash
node dist/index.js quick <username>

# Example:
node dist/index.js quick your_username
```

**Options:**
- `-l, --limit <number>`: Number of games to analyze (default: 50)
- `-t, --time <minutes>`: Available study time per day (default: 30)

## Example Output

```
🏁 Chess.com Game Analyzer for your_username
Analyzing last 50 games...

📊 PLAYER PROFILE
──────────────────────────────────────────────────
👤 Username: your_username
🎮 Games Analyzed: 47
📈 Win Rate: 62.3%
🎯 Average Accuracy: 78.5%

💪 STRENGTHS
  ✓ Solid opening play
  ✓ Avoids major blunders

⚠️  COMMON MISTAKE PATTERNS
  🟡 Endgame technique issues (12 games)
  🟡 Positional mistakes (8 games)

🎯 PERSONALIZED RECOMMENDATIONS
──────────────────────────────────────────────────
  👑 Endgame Focus: Learn basic checkmate patterns
  🏁 Practice: King + Queen vs King, King + Rook vs King
  📚 Study: Basic tactical patterns (pins, forks, skewers)
  🎯 Accuracy Goal: Aim for 80%+ accuracy by slowing down critical moves

📚 DAILY STUDY PLAN
──────────────────────────────────────────────────
  📅 12min: Basic endgame positions
  📅 9min: Endgame puzzles
  📅 6min: Game analysis review

🎓 STUDY RESOURCES
──────────────────────────────────────────────────
Endgame Technique:
  📖 Dvoretsky's Endgame Manual
  📖 Chess.com endgame trainer
  📖 Silman's Complete Endgame Course
```

## Development

```bash
# Development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run typecheck
```

## Architecture

The application is structured into several key components:

- **ChessComService**: Handles API communication with Chess.com
- **PgnParser**: Parses PGN notation and extracts game information
- **GameAnalyzer**: Analyzes individual games and moves
- **MoveAnalyzer**: Evaluates chess positions and moves
- **PatternDetector**: Identifies recurring mistake patterns
- **RecommendationEngine**: Generates personalized improvement advice

## API Rate Limits

The Chess.com API has rate limits to prevent abuse. The application includes:
- Automatic delays between requests
- Retry logic for failed requests
- Proper User-Agent headers as recommended by Chess.com

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Disclaimer

This tool is not affiliated with Chess.com. It uses publicly available data through Chess.com's published API for educational and improvement purposes.
This tool is not affiliated with Chess.com. It uses publicly available data through Chess.com's published API for educational and improvement purposes.