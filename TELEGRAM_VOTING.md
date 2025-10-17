# Telegram Interactive Voting/Actions

## Overview

The Telegram bot now automatically displays interactive buttons after each game analysis. Users can click these buttons to:
- Get deep dive analysis on specific game phases
- Select focus areas for improvement
- Rate the analysis quality

## How It Works

### 1. **Automatic Display**
After the bot completes game analysis, it automatically sends a message with interactive buttons:

```
🎯 What would you like to do next?

[📚 Opening Analysis] [🎮 Middlegame]
[♟️ Endgame Technique] [⚡ Tactics Training]
[🧮 Focus: Calculation] [🎯 Focus: Strategy]
[⏱️ Time Management] [🧠 Mental Game]
[⭐⭐⭐⭐⭐] [⭐⭐⭐⭐] [⭐⭐⭐]
```

### 2. **Predefined Actions**

#### **Deep Dive Actions** (prefix: `depth_`)
- `depth_opening` - Opening Analysis
- `depth_middlegame` - Middlegame Strategy
- `depth_endgame` - Endgame Technique
- `depth_tactics` - Tactical Patterns

#### **Focus Area Actions** (prefix: `focus_`)
- `focus_calculation` - Calculation & Tactics
- `focus_strategy` - Strategic Planning
- `focus_time` - Time Management
- `focus_psychology` - Mental Game

#### **Rating Actions** (prefix: `rating_`)
- `rating_5` - 5 stars (⭐⭐⭐⭐⭐)
- `rating_4` - 4 stars (⭐⭐⭐⭐)
- `rating_3` - 3 stars (⭐⭐⭐)

## Implementation Details

### Button Structure

Inline keyboard buttons use this format:
```typescript
{
  text: 'Display Text',      // What the user sees
  callback_data: 'action_value'  // Data sent to bot when clicked
}
```

### Callback Handler

When a user clicks a button, the bot receives a callback query with the format:
```
action_value
```

The handler splits this into:
- `action` - The type of action (rating, depth, focus)
- `value` - The specific value (5, opening, calculation, etc.)

### Example: Adding a New Action Type

To add a new action type (e.g., "schedule"):

1. **Add buttons** in `sendInteractiveButtons()`:
```typescript
[
  { text: '📅 Schedule Daily Practice', callback_data: 'schedule_daily' },
  { text: '📅 Schedule Weekly Review', callback_data: 'schedule_weekly' }
]
```

2. **Add handler** in `handleCallbackQuery()`:
```typescript
case 'schedule':
  await this.handleScheduleRequest(chatId, value, callbackQuery.id);
  break;
```

3. **Implement the handler**:
```typescript
private async handleScheduleRequest(
  chatId: number,
  frequency: string,
  queryId: string
): Promise<void> {
  await this.bot.answerCallbackQuery(queryId, {
    text: `✅ ${frequency} practice scheduled!`
  });
  
  // Your custom logic here
  const message = `📅 You've scheduled ${frequency} practice sessions!`;
  await this.bot.sendMessage(chatId, message);
}
```

## User Experience

1. User runs `/analyze username`
2. Bot analyzes games and sends results
3. **Buttons appear automatically** at the end
4. User clicks a button
5. Bot responds instantly with relevant information
6. Buttons can be removed or updated after interaction

## Customization

### Change Button Layout

Modify the `inline_keyboard` array in `sendInteractiveButtons()`:
```typescript
const keyboard = {
  inline_keyboard: [
    [{ text: 'Button 1', callback_data: 'action_1' }],  // Single button per row
    [
      { text: 'Button 2', callback_data: 'action_2' },   // Two buttons
      { text: 'Button 3', callback_data: 'action_3' }    // in one row
    ]
  ]
};
```

### Conditional Buttons

Show different buttons based on analysis results:
```typescript
private async sendInteractiveButtons(chatId: number, profile: any): Promise<void> {
  const buttons = [];
  
  // Always show rating
  buttons.push([
    { text: '⭐⭐⭐⭐⭐', callback_data: 'rating_5' },
    { text: '⭐⭐⭐⭐', callback_data: 'rating_4' }
  ]);
  
  // Show opening help if weak in openings
  if (profile.weakInOpenings) {
    buttons.push([
      { text: '📚 Opening Help', callback_data: 'depth_opening' }
    ]);
  }
  
  // Show tactics if many blunders
  if (profile.blunders > 5) {
    buttons.push([
      { text: '⚡ Tactics Training', callback_data: 'depth_tactics' }
    ]);
  }
  
  const keyboard = { inline_keyboard: buttons };
  await this.bot.sendMessage(chatId, 'Choose an action:', { reply_markup: keyboard });
}
```

## Testing

To test the voting system:

1. Start the bot: `npm run bot`
2. Send `/analyze username` in Telegram
3. Wait for analysis to complete
4. Click any button that appears
5. Verify the bot responds correctly

## Storage (Optional)

To save user votes/selections, add database storage in the handlers:

```typescript
private async handleRatingFeedback(
  chatId: number,
  messageId: number,
  rating: string,
  queryId: string
): Promise<void> {
  // Save to database
  await database.saveRating({
    userId: chatId,
    rating: parseInt(rating),
    timestamp: new Date()
  });
  
  // Rest of the handler...
}
```

## Notes

- Buttons are limited to 64 bytes of callback_data
- Maximum 8 buttons per row
- Maximum 100 rows per keyboard
- Callback queries expire after 30 days


