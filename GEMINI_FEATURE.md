# Gemini Visual Suggestions - Implementation Summary

## What Was Built

An AI-powered feature that provides creative visual suggestions (memes, animations, illustrations) for video content based on captions/transcripts. The feature uses Google's Gemini AI to analyze the video transcript and generate actionable suggestions that graphic designers and video editors can implement.

## How It Works

1. **User uploads a video** with captions (.vtt or .srt files)
2. **User selects a time range** on the video timeline
3. **User clicks "Visual Ideas"** button (appears when captions are loaded and selection exists)
4. **System sends transcript context** to Gemini AI:
   - Full video transcript (for context)
   - Selected segment transcript (for specific suggestions)
   - Time range information
5. **Gemini generates 3 creative suggestions** in categories:
   - **MEME**: Specific internet memes or trending formats
   - **ANIMATION**: Motion graphics and animated effects
   - **ILLUSTRATION**: Static graphics, icons, or illustrations
6. **Results display in a modal** with detailed descriptions

## Files Created

### Backend
- `backend/src/routes/suggestions.ts` - New API route for Gemini integration
- Updated `backend/src/index.ts` - Registered suggestions route and added dotenv
- Installed `@google/genai` package (Google's latest Gemini SDK)
- Installed `dotenv` package for environment variable loading

### Frontend
- `frontend/utils/transcript.ts` - VTT parsing utilities
- `frontend/components/VisualSuggestionsModal.tsx` - Modal component
- Updated `frontend/types.ts` - Added VisualSuggestion interface
- Updated `frontend/services/api.ts` - Added getVisualSuggestions function
- Updated `frontend/App.tsx` - Integrated feature with state management

### Documentation
- Updated `README.md` - Added feature documentation and API key setup

## Key Features

✅ **Smart Context Awareness**: Sends full transcript for context + selected segment for specificity
✅ **Beautiful UI**: Modal with loading states, category badges, and copy functionality
✅ **Easy Integration**: Button only appears when captions are loaded AND selection exists
✅ **Error Handling**: Graceful fallbacks and user-friendly error messages
✅ **Secure**: API key stored on backend (not exposed to browser)

## Usage Instructions

### Setup
1. Get a Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Set environment variable: `export GEMINI_API_KEY="your-key"`
3. Start backend: `cd backend && npm run dev`
4. Start frontend: `cd frontend && bun run dev`

### Using the Feature
1. Upload a video
2. Upload captions (.vtt or .srt file)
3. Select a time range using keyboard shortcuts (A/S) or by dragging on timeline
4. Click the "Visual Ideas" button (sparkle icon) in the toolbar
5. Wait for AI to generate suggestions
6. Copy individual suggestions or all at once

## Keyboard Shortcuts (For Selection)
- **A**: Set start of selection range
- **S**: Set end of selection range and pause
- **Q**: Snap start to current cursor position
- **W**: Snap end to current cursor position
- **Escape**: Clear selection

## API Endpoint

**POST** `/api/suggestions`

Request body:
```json
{
  "fullTranscript": "Complete video transcript...",
  "selectionTranscript": "Selected segment text...",
  "selectionTimeRange": {
    "start": 10.5,
    "end": 25.3
  }
}
```

Response:
```json
{
  "suggestions": [
    {
      "category": "MEME",
      "title": "Distracted Boyfriend Meme",
      "description": "Use the classic distracted boyfriend meme format..."
    },
    {
      "category": "ANIMATION",
      "title": "Text Pop-In Animation",
      "description": "Create a bouncy text animation that appears..."
    },
    {
      "category": "ILLUSTRATION",
      "title": "Comparison Diagram",
      "description": "Design a side-by-side comparison graphic..."
    }
  ]
}
```

## Technical Highlights

- **Robust VTT Parsing**: Handles both VTT and SRT formats with proper timestamp conversion
- **Response Parsing**: Flexible parsing that handles variations in Gemini's output format
- **State Management**: Clean separation of transcript state and suggestions state
- **Conditional UI**: Button only shows when feature is available (captions + selection)
- **Loading States**: Professional loading spinner with clear feedback
- **Copy Functionality**: Easy clipboard copy for individual or all suggestions

## Future Enhancements

Potential improvements:
- Support for multiple languages in transcripts
- Ability to save favorite suggestions
- History of past suggestions
- Option to regenerate with different style preferences
- Integration with image search APIs to preview suggested memes
- Voice input for transcript generation

