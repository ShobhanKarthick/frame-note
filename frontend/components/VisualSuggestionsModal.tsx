import React from 'react';
import { VisualSuggestion } from '../types';
import { X, Copy, Lightbulb, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/Button';

interface VisualSuggestionsModalProps {
  suggestions: VisualSuggestion[];
  isLoading: boolean;
  onClose: () => void;
  timeRange: { start: number; end: number };
}

export const VisualSuggestionsModal: React.FC<VisualSuggestionsModalProps> = ({
  suggestions,
  isLoading,
  onClose,
  timeRange,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'MEME':
        return <Sparkles className="w-5 h-5" />;
      case 'ANIMATION':
        return <Lightbulb className="w-5 h-5" />;
      case 'ILLUSTRATION':
        return <ImageIcon className="w-5 h-5" />;
      default:
        return <Lightbulb className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'MEME':
        return 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-500/50';
      case 'ANIMATION':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/50';
      case 'ILLUSTRATION':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/50';
      default:
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/50';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyAllSuggestions = () => {
    const text = suggestions
      .map(
        (s, i) =>
          `SUGGESTION ${i + 1}\nCategory: ${s.category}\nTitle: ${s.title}\nDescription: ${s.description}\n`
      )
      .join('\n');
    copyToClipboard(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-500" />
              Visual Suggestions
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              AI-powered ideas for {formatTime(timeRange.start)} - {formatTime(timeRange.end)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-zinc-500 dark:text-zinc-400">Generating creative suggestions...</p>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-5 border border-zinc-200 dark:border-zinc-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${getCategoryColor(
                          suggestion.category
                        )}`}
                      >
                        {getCategoryIcon(suggestion.category)}
                        {suggestion.category}
                      </div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        {suggestion.title}
                      </h3>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${suggestion.category}: ${suggestion.title}\n${suggestion.description}`
                        )
                      }
                      className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {suggestion.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500 dark:text-zinc-400">
              <Lightbulb className="w-12 h-12 mb-4 opacity-50" />
              <p>No suggestions available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && suggestions.length > 0 && (
          <div className="flex items-center justify-between p-6 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} generated
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={copyAllSuggestions}
                className="flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy All
              </Button>
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

