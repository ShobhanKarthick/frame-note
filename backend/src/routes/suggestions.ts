import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';

const router = Router();

// Initialize Gemini AI
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface SuggestionRequest {
  fullTranscript: string;
  selectionTranscript: string;
  selectionTimeRange: {
    start: number;
    end: number;
  };
}

interface VisualSuggestion {
  category: 'MEME' | 'ANIMATION' | 'ILLUSTRATION';
  title: string;
  description: string;
}

// POST /api/suggestions - Get AI-powered visual suggestions
router.post('/', async (req, res) => {
  try {
    const { fullTranscript, selectionTranscript, selectionTimeRange } = req.body as SuggestionRequest;

    // Validate input
    if (!fullTranscript || !selectionTranscript || !selectionTimeRange) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    // Create the prompt
      const prompt = `You are a creative visual content advisor for video editors.
---

# Visual Suggestion Prompt for Video Editing

You are a creative visual content advisor helping to suggest engaging visuals for video content. 

## Your Task
For the given transcript time range, suggest **exactly 3 different visual options** that span the ENTIRE duration of the time range. Each option should be a complete alternative approach, not sequential segments.

FULL VIDEO TRANSCRIPT (for context):
${fullTranscript}

SELECTED SEGMENT (${selectionTimeRange.start.toFixed(1)}s - ${selectionTimeRange.end.toFixed(1)}s):
${selectionTranscript}

## Requirements

### Format Your Response As:
Provide exactly 3 distinct visual options, where each option covers the full time range:

**Option 1: [Type - Meme/Animation/Illustration]**
- Visual Description: [For animations/illustrations, you can suggest 2-4 sequential visuals that progress through the time range. For memes, suggest a single visual that holds throughout. Describe what appears on screen and when transitions happen if applicable]

**Option 2: [Type - Meme/Animation/Illustration]**
- Visual Description: [Detailed description with sequential breakdown if needed]

**Option 3: [Type - Meme/Animation/Illustration]**
- Visual Description: [Detailed description with sequential breakdown if needed]

### Important Guidelines:
1. **Each option must be a DIFFERENT type** - include one meme, one animation, and one illustration across the three options
2. **Each option covers the FULL time range** - not just parts of it
3. **Each option is a complete alternative** - the user will choose ONE of the three options for this time range
4. **Sequential visuals ARE allowed for animations and illustrations** - When suggesting animations or illustrations, you can break them into a sequence of 2-4 visuals that progress through the time range naturally. However, memes should typically be a single visual that holds throughout.
5. **Be specific and visual** - describe exactly what would appear on screen
6. **Match the tone and content** - ensure visuals align with what's being said in the transcript
7. **Make them diverse** - each option should offer a distinctly different visual style and approach
8. **Consider engagement** - suggest visuals that will keep viewers interested

### Visual Types Explained:
- **Meme**: Popular internet memes, reaction images, viral templates (e.g., "Distracted Boyfriend", "Drake Yes/No", "Expanding Brain")
- **Animation**: Motion graphics, animated sequences, kinetic typography, animated characters or concepts
- **Illustration**: Static or slightly animated illustrations, infographics, diagrams, custom artwork

Do NOT mix different visual types within a single option (e.g., don't suggest "start with a meme, then switch to animation"). Each option should maintain its visual type throughout, but animations and illustrations can use multiple sequential visuals to tell a story or illustrate concepts as they're mentioned in the transcript.

Make suggestions specific, actionable, and creative. Consider the tone and context from the full transcript.`;
    // Call Gemini API using the new SDK
    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const text = result.text || '';
    
    if (!text) {
      throw new Error('No response text received from Gemini API');
    }

    // Parse the response
    const suggestions = parseGeminiResponse(text);

    res.json({ suggestions });
  } catch (error: any) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ 
      error: 'Failed to generate suggestions', 
      details: error.message 
    });
  }
});

// Helper function to parse Gemini's response into structured data
function parseGeminiResponse(text: string): VisualSuggestion[] {
  const suggestions: VisualSuggestion[] = [];
  
  // Parse the new format: **Option N: [Type - Category]**
  // Match pattern: **Option N: [Type - MEME/ANIMATION/ILLUSTRATION]**
  const optionRegex = /\*\*Option\s+\d+:\s*(?:\[Type\s*-\s*)?(MEME|ANIMATION|ILLUSTRATION)(?:\])?\*\*/gi;
  const sections = text.split(optionRegex);
  
  // sections will be: [intro text, category1, content1, category2, content2, category3, content3]
  for (let i = 1; i < sections.length; i += 2) {
    const category = sections[i].toUpperCase() as 'MEME' | 'ANIMATION' | 'ILLUSTRATION';
    const content = sections[i + 1];
    
    if (!content) continue;
    
    // Extract Visual Description only
    const visualDescMatch = content.match(/[-•]\s*Visual Description:\s*(.+?)(?=\*\*Option|$)/is);
    
    if (visualDescMatch) {
      const visualDescription = visualDescMatch[1].trim();
      
      // Create a title from the category
      const title = `${category.charAt(0)}${category.slice(1).toLowerCase()} Option`;
      
      suggestions.push({
        category,
        title,
        description: visualDescription
      });
    }
  }
  
  // If parsing failed, try fallback method for old format
  if (suggestions.length === 0) {
    const lines = text.split('\n');
    let currentSuggestion: Partial<VisualSuggestion> = {};
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.match(/^Category:/i)) {
        const match = trimmedLine.match(/Category:\s*(MEME|ANIMATION|ILLUSTRATION)/i);
        if (match && currentSuggestion.category) {
          // Save previous suggestion
          if (currentSuggestion.category && currentSuggestion.title && currentSuggestion.description) {
            suggestions.push(currentSuggestion as VisualSuggestion);
          }
          currentSuggestion = {};
        }
        if (match) {
          currentSuggestion.category = match[1].toUpperCase() as 'MEME' | 'ANIMATION' | 'ILLUSTRATION';
        }
      } else if (trimmedLine.match(/^Title:/i)) {
        const match = trimmedLine.match(/Title:\s*(.+)/i);
        if (match) {
          currentSuggestion.title = match[1].trim();
        }
      } else if (trimmedLine.match(/^Description:/i)) {
        const match = trimmedLine.match(/Description:\s*(.+)/i);
        if (match) {
          currentSuggestion.description = match[1].trim();
        }
      } else if (currentSuggestion.description && trimmedLine && !trimmedLine.match(/^(Category|Title|Description|SUGGESTION):/i)) {
        // Continue multi-line description
        currentSuggestion.description += ' ' + trimmedLine;
      }
    }
    
    // Add the last suggestion
    if (currentSuggestion.category && currentSuggestion.title && currentSuggestion.description) {
      suggestions.push(currentSuggestion as VisualSuggestion);
    }
  }
  
  return suggestions;
}

export default router;

