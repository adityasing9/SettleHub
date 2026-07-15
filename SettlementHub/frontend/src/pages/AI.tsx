import React, { useState } from 'react';
import api from '../services/api';
import { Send, HelpCircle, Bot } from 'lucide-react';

export const AI: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const presetQuestions = [
    'How much does Rahul owe me?',
    'Show fuel expenses this year.',
    'Which month had highest spending?',
    'Generate financial summary.'
  ];

  const handleAsk = async (q: string) => {
    setLoading(true);
    setAnswer('');
    try {
      const res = await api.post('/ai/ask', { question: q });
      setAnswer(res.data.answer);
    } catch (err) {
      console.error(err);
      setAnswer('Sorry, I encountered an error answering that query. Please make sure your Gemini configurations are correct.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    handleAsk(question);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">AI Insights</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Ask questions about your transactions, spending habits, and settle metrics in plain English.</p>
      </div>

      {/* QUICK SUGGESTIONS */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-1">
          <HelpCircle size={12} />
          Suggested Questions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {presetQuestions.map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuestion(q);
                handleAsk(q);
              }}
              className="glass-panel p-4 rounded-2xl hover:border-indigo-600/50 hover:bg-slate-200/20 dark:hover:bg-slate-900/20 text-left transition-all font-semibold text-xs text-slate-700 dark:text-slate-300"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* CHAT INPUT AREA */}
      <div className="glass-panel p-6 rounded-3xl space-y-6">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            required
            placeholder="Ask me anything: e.g., How much did I spend on dining last month?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="flex-1 px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all"
          >
            <Send size={16} />
          </button>
        </form>

        {/* RESPONSE BOARD */}
        {(loading || answer) && (
          <div className="p-6 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/20 dark:border-slate-800/20 rounded-2xl space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
              <Bot size={16} />
              AI Assistant Response
            </div>
            
            {loading ? (
              <div className="space-y-2 pt-2">
                <div className="h-3 bg-slate-300 dark:bg-slate-700 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-slate-300 dark:bg-slate-700 rounded w-1/2 animate-pulse" />
                <div className="h-3 bg-slate-300 dark:bg-slate-700 rounded w-2/3 animate-pulse" />
              </div>
            ) : (
              <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line prose prose-slate dark:prose-invert">
                {answer}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
