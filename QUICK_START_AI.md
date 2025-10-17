# Quick Start Guide: Claude AI Analysis

## Setup (5 minutes)

### Step 1: Install Dependencies
```bash
cd /path/to/chess-com-games-analyzer
npm install
npm run build
```

### Step 2: Configure Claude AI (Optional but Recommended)

#### Option A: Using .env file (Recommended)
```bash
# Create .env file in project root
echo "ANTHROPIC_API_KEY=your_api_key_here" > .env
```

#### Option B: Using environment variable
```bash
# Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
export ANTHROPIC_API_KEY=your_api_key_here
```

#### Get Your API Key
1. Visit https://console.anthropic.com/
2. Sign up or log in
3. Go to API Keys section
4. Create a new key
5. Copy the key (starts with `sk-ant-...`)

### Step 3: Run the Analyzer
```bash
# Start the web server
npm run web

# Open browser to http://localhost:3000
```

## Using the AI Analysis Feature

### Web Interface
1. Enter your Chess.com username
2. Select number of games (20 recommended for first try)
3. Click "Full Analysis"
4. Wait for analysis to complete (1-2 minutes)
5. Scroll to see the **Claude AI Analysis** section (purple header)

### What You'll See

#### 🤖 Claude AI Analysis Section
A beautiful purple card with comprehensive insights:

**Game Summary**
- Quick overview of your performance
- Context about your accuracy and errors

**⭐ Key Moments**
- Important turning points in your game
- Critical decisions that affected the outcome

**✅ What You Did Well**
- Specific strengths identified by AI
- Positive reinforcement

**⚠️ Areas to Improve**
- Concrete weaknesses to work on
- Specific issues to address

**💡 AI Coaching Advice**
- Actionable tips for improvement
- Practical strategies

**📅 Personalized Improvement Plan**
- **Immediate Focus**: What to work on right now
- **Short-term (1-2 weeks)**: Study goals
- **Long-term (1-3 months)**: Skills to develop

## Example Output

```
🤖 Claude AI Analysis

Game Summary:
"Strong performance with 82.3% accuracy. You demonstrated good chess 
understanding with 2 significant errors that can be addressed."

⭐ Key Moments:
• Move 15: Missed tactical opportunity with discovered attack
• Move 22: Excellent positional sacrifice for long-term advantage
• Move 34: Inaccurate endgame technique cost winning chances

✅ What You Did Well:
• Maintained high accuracy throughout the game
• Strong opening preparation in the Italian Game
• Excellent calculation in the middlegame complications

⚠️ Areas to Improve:
• 2 critical blunder(s) - need to slow down and check for tactics
• Endgame technique needs refinement

💡 AI Coaching Advice:
• Before moving, always ask: "What is my opponent threatening?"
• Spend extra time on critical positions where tactics are likely
• Study basic endgame patterns for rook endings

📅 Personalized Improvement Plan

Immediate Focus:
• Review all blunders and mistakes from this game
• Identify the tactical patterns you missed

Short-term (1-2 weeks):
• Solve 10-15 tactical puzzles daily
• Study 2-3 master games in the Italian Game
• Play slower time controls to reduce errors

Long-term (1-3 months):
• Build a solid opening repertoire with understanding
• Study endgame fundamentals systematically
• Develop strategic planning and positional play
```

## Without API Key

If you don't set up the API key, the system will still work!

**You'll get:**
- Rule-based performance summary
- Generic strengths and weaknesses
- Helpful improvement suggestions
- Structured improvement plan

**You won't get:**
- Game-specific insights
- Natural language explanations
- Context-aware coaching

## Troubleshooting

### "Analysis completed" but no AI insights
- Check if ANTHROPIC_API_KEY is set correctly
- Verify the API key is valid (test at console.anthropic.com)
- Check console logs for error messages

### API Rate Limits
- Claude API has rate limits
- Free tier: 5 requests per minute
- Paid tier: Higher limits
- The analyzer processes one game at a time

### Cost Considerations
- Each game analysis costs ~$0.003 (less than 1 cent)
- 100 games ≈ $0.30
- Very affordable for personal use

## Tips

### For Best Results
1. **Use 10-20 games** for initial analysis (good balance)
2. **Analyze recent games** (your current playing strength)
3. **Read the advice carefully** - it's personalized!
4. **Implement one tip at a time** - don't try to fix everything
5. **Re-analyze after 2 weeks** - track your improvement

### Understanding the Analysis
- **Accuracy > 85%**: Excellent play
- **Accuracy 75-85%**: Good play with room to improve
- **Accuracy < 75%**: Focus on reducing errors

### Using the Improvement Plan
- **Immediate**: Do this today
- **Short-term**: Start this week, continue for 1-2 weeks
- **Long-term**: Ongoing development, check progress monthly

## Next Steps

After getting your analysis:

1. **Review the AI Summary** - Read it completely
2. **Focus on 1-2 weaknesses** - Don't try to fix everything
3. **Follow the immediate plan** - Start today
4. **Track your progress** - Re-analyze in 2 weeks
5. **Adjust based on results** - Keep what works

## Questions?

The AI analysis is designed to be:
- **Encouraging**: Highlights your strengths
- **Specific**: Gives concrete advice
- **Actionable**: Clear steps to improve
- **Personalized**: Based on YOUR games

Start analyzing your games now and watch your chess improve! 🚀♟️

