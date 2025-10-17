# Chess.com Games Analyzer - Usage Guide

## Installation & Setup

```bash
# Install dependencies and build
npm install
npm run build
```

## Commands

### 1. Quick Analysis
Get a fast overview of recent performance:

```bash
node dist/index.js quick <username>

# Examples:
node dist/index.js quick hikaru
node dist/index.js quick magnuscarlsen
node dist/index.js quick YOUR_USERNAME
```

### 2. Full Analysis
Comprehensive analysis with personalized recommendations:

```bash
node dist/index.js analyze <username> [options]

# Examples:
node dist/index.js analyze YOUR_USERNAME
node dist/index.js analyze YOUR_USERNAME --limit 100
node dist/index.js analyze YOUR_USERNAME --limit 50 --time 30
```

**Options:**
- `--limit <number>`: Number of games to analyze (default: 50)
- `--time <minutes>`: Available study time per day (default: 30)

## Sample Output

### Quick Analysis:
```
⚡ Quick Analysis for hikaru

📊 Recent Performance:
🎯 Average Accuracy: 97.1%
⚠️  Total Blunders: 7

💡 Quick Tip: Focus on tactical training to reduce blunders!
```

### Full Analysis:
```
🏁 Chess.com Game Analyzer for YOUR_USERNAME
Analyzing last 50 games...

📊 PLAYER PROFILE
──────────────────────────────────────────────────
👤 Username: YOUR_USERNAME
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

📅 WEEKLY GOALS
──────────────────────────────────────────────────
  🗓️  Analyze 2-3 of your recent games thoroughly
  🗓️  Play practice games in your weakest time control
  🗓️  Review one master game in your opening

🎓 STUDY RESOURCES
──────────────────────────────────────────────────
Endgame Technique:
  📖 Dvoretsky's Endgame Manual
  📖 Chess.com endgame trainer
  📖 Silman's Complete Endgame Course

✅ Analysis complete! Good luck with your chess improvement! 🚀
```

## Tips for Best Results

1. **Use your actual Chess.com username** for personalized analysis
2. **Start with quick analysis** to test the connection
3. **Analyze recent games** (limit 10-20) for faster results
4. **Use higher limits** (50-100) for more comprehensive patterns
5. **Set realistic study time** to get achievable daily plans

## Troubleshooting

- **"No games found"**: Check that the username is correct and has public games
- **Rate limiting**: The tool automatically handles Chess.com API rate limits
- **Long analysis times**: Large game counts take longer - start with smaller limits

## Technical Details

- Uses Chess.com's public API (no authentication needed)
- Respects rate limits with automatic delays
- Analyzes move accuracy using a simplified chess engine
- Detects patterns across multiple games for actionable insights