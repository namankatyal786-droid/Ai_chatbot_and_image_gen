/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Image as ImageIcon, 
  Settings as SettingsIcon, 
  Send, 
  Loader2, 
  Sun, 
  Moon, 
  X, 
  Save,
  Trash2,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { Message, Settings, GeneratedImage } from './types';

const INITIAL_SETTINGS: Settings = {
  huggingFaceKey: '',
  theme: 'dark'
};

export default function App() {
  const [mode, setMode] = useState<'chat' | 'image'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>(() => {
    const saved = localStorage.getItem('ai_hub_images');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('ai_hub_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('ai_hub_settings', JSON.stringify(settings));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('ai_hub_images', JSON.stringify(generatedImages));
  }, [generatedImages]);

  useEffect(() => {
    if (mode === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      imagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, generatedImages, mode]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    if (!settings.huggingFaceKey) {
      setError('Please add your Hugging Face API key in settings.');
      setShowSettings(true);
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.huggingFaceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'Qwen/Qwen3-8B:nscale',
          messages: [...messages, userMessage]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch from Hugging Face');
      }
      
      const data = await response.json();
      const aiMessage: Message = {
        role: 'assistant',
        content: data.choices[0].message.content
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!input.trim() || isLoading) return;
    if (!settings.huggingFaceKey) {
      setError('Please add your Hugging Face API key in settings.');
      setShowSettings(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    const currentPrompt = input;
    setInput('');

    try {
      const response = await fetch(
        'https://router.huggingface.co/nscale/v1/images/generations',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.huggingFaceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            response_format: "b64_json",
            prompt: currentPrompt,
            model: "stabilityai/stable-diffusion-xl-base-1.0" 
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || errorData.error || 'Failed to generate image');
      }
      
      const contentType = response.headers.get('content-type');
      let imageUrl = '';
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.data && data.data[0] && data.data[0].b64_json) {
          imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
        } else if (data.data && data.data[0] && data.data[0].url) {
          imageUrl = data.data[0].url;
        } else {
          throw new Error('Invalid JSON response format from image API');
        }
      } else {
        // Handle direct image blob
        const blob = await response.blob();
        imageUrl = URL.createObjectURL(blob);
      }

      const newImage: GeneratedImage = {
        url: imageUrl,
        prompt: currentPrompt,
        timestamp: Date.now()
      };
      setGeneratedImages(prev => [...prev, newImage]);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    setSettings(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  };

  return (
    <div className="min-h-screen bg-gemini-bg dark:bg-gemini-dark-bg text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 glass z-50 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <h1 className="font-bold text-xl hidden sm:block">AI Hub</h1>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-full">
          <button
            onClick={() => setMode('chat')}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-full transition-all duration-200 text-sm font-medium",
              mode === 'chat' ? "bg-white dark:bg-gray-700 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <MessageSquare size={16} />
            <span className="hidden xs:block">Chat</span>
          </button>
          <button
            onClick={() => setMode('image')}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-full transition-all duration-200 text-sm font-medium",
              mode === 'image' ? "bg-white dark:bg-gray-700 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <ImageIcon size={16} />
            <span className="hidden xs:block">Image</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
            {settings.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-32 px-4 max-w-4xl mx-auto h-screen flex flex-col">
        {mode === 'chat' ? (
          <div className="flex-1 overflow-y-auto space-y-6 py-4 scrollbar-hide">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                <Sparkles size={48} className="text-blue-500" />
                <h2 className="text-2xl font-semibold">How can I help you today?</h2>
                <p className="max-w-md">Start a conversation or ask me anything. I'm powered by Qwen 3 via Hugging Face.</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div className={cn(
                  "max-w-[85%] px-4 py-3 rounded-2xl shadow-sm",
                  msg.role === 'user' 
                    ? "bg-blue-600 text-white rounded-tr-none" 
                    : "bg-white dark:bg-gemini-dark-card text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-800"
                )}>
                  <div className="prose dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed">
                    <ReactMarkdown>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gemini-dark-card px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-800 flex items-center gap-2">
                  <Loader2 className="animate-spin text-blue-500" size={16} />
                  <span className="text-sm text-gray-500">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-8 py-4 scrollbar-hide">
            {generatedImages.length === 0 && !isLoading && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                <ImageIcon size={64} className="mx-auto text-purple-500" />
                <h2 className="text-2xl font-semibold">Create something amazing</h2>
                <p className="max-w-md">Describe the image you want to generate using Stable Diffusion XL.</p>
              </div>
            )}
            
            {generatedImages.map((img, idx) => (
              <motion.div 
                key={img.timestamp}
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium px-2">
                  <Sparkles size={12} className="text-purple-500" />
                  <span className="line-clamp-1 italic">"{img.prompt}"</span>
                </div>
                <div className="relative group">
                  <img 
                    src={img.url} 
                    alt={img.prompt} 
                    className="w-full rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = img.url;
                        a.download = `ai-gen-${img.timestamp}.png`;
                        a.click();
                      }}
                      className="bg-white/90 dark:bg-black/90 p-2 rounded-xl shadow-lg hover:scale-105 transition-transform"
                      title="Download Image"
                    >
                      <Save size={20} className="text-blue-500" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <div className="flex flex-col items-center space-y-4 py-8">
                <div className="w-full aspect-square max-w-md bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse flex items-center justify-center">
                  <Loader2 className="animate-spin text-purple-500" size={32} />
                </div>
                <p className="text-sm text-gray-500">Generating your masterpiece...</p>
              </div>
            )}
            <div ref={imagesEndRef} />
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-200 dark:border-red-800/50 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X size={14} /></button>
          </div>
        )}
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-gemini-bg dark:from-gemini-dark-bg via-gemini-bg dark:via-gemini-dark-bg to-transparent pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <div className="relative group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  mode === 'chat' ? handleSendMessage() : handleGenerateImage();
                }
              }}
              placeholder={mode === 'chat' ? "Ask me anything..." : "Describe an image..."}
              className="w-full bg-white dark:bg-gemini-dark-card border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-4 pr-14 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none min-h-[60px] max-h-[200px] transition-all"
              rows={1}
            />
            <button
              onClick={mode === 'chat' ? handleSendMessage : handleGenerateImage}
              disabled={isLoading || !input.trim()}
              className={cn(
                "absolute right-3 bottom-3 p-2 rounded-xl transition-all",
                input.trim() && !isLoading 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
              )}
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
          </div>
          <p className="text-[10px] text-center mt-2 text-gray-500">
            AI can make mistakes. Check important info.
          </p>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-gemini-dark-card rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <SettingsIcon size={20} />
                  Settings
                </h2>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Hugging Face API Key</label>
                  <input
                    type="password"
                    value={settings.huggingFaceKey}
                    onChange={(e) => setSettings(prev => ({ ...prev, huggingFaceKey: e.target.value }))}
                    placeholder="hf_..."
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <p className="text-[10px] text-gray-400">Used for both Chat and Image Generation. Get it at huggingface.co/settings/tokens</p>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => {
                      setMessages([]);
                      setGeneratedImages([]);
                      localStorage.removeItem('ai_hub_images');
                      setShowSettings(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                    Clear History
                  </button>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg"
                  >
                    <Save size={18} />
                    Save & Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
