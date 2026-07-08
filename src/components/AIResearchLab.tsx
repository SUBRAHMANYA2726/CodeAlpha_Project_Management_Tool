import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Sparkles, Globe, ExternalLink, HelpCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useToast } from './Toast.tsx';

interface Citation {
  title: string;
  uri: string;
}

interface ResearchResult {
  answer: string;
  queries: string[];
  sources: Citation[];
}

// A beautiful, safe local Markdown renderer to avoid dependencies and render perfectly
export const GroundedMarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  return (
    <div className="space-y-4 text-slate-100 font-sans leading-relaxed text-sm">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // 1. Headers
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-base font-extrabold text-cyan-300 tracking-tight pt-3 border-b border-white/5 pb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              {trimmed.replace('### ', '')}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-lg font-black text-indigo-300 tracking-tight pt-4 pb-1">
              {trimmed.replace('## ', '')}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={idx} className="text-xl font-black text-white tracking-tight pt-5 pb-2 border-b border-white/10">
              {trimmed.replace('# ', '')}
            </h2>
          );
        }

        // 2. Code Block boundary (simple toggle placeholder, we skip displaying raw tags)
        if (trimmed.startsWith('```')) {
          return null;
        }

        // 3. Unordered list items
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const itemText = trimmed.replace(/^[-*]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 flex-shrink-0" />
              <p className="text-slate-200" dangerouslySetInnerHTML={{ __html: parseInlineStyles(itemText) }} />
            </div>
          );
        }

        // 4. Ordered list items
        if (/^\d+\.\s+/.test(trimmed)) {
          const itemText = trimmed.replace(/^\d+\.\s+/, '');
          const match = trimmed.match(/^(\d+)\.\s+/);
          const num = match ? match[1] : '•';
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-2">
              <span className="font-mono text-xs font-black text-indigo-400 mt-0.5 flex-shrink-0">{num}.</span>
              <p className="text-slate-200" dangerouslySetInnerHTML={{ __html: parseInlineStyles(itemText) }} />
            </div>
          );
        }

        // 5. Empty lines
        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        // 6. Blockquote
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote key={idx} className="pl-4 border-l-4 border-indigo-500/80 italic text-slate-300 bg-white/5 py-2 px-3 rounded-r-xl">
              <p dangerouslySetInnerHTML={{ __html: parseInlineStyles(trimmed.replace('> ', '')) }} />
            </blockquote>
          );
        }

        // 7. Regular paragraph
        return (
          <p key={idx} className="text-slate-200" dangerouslySetInnerHTML={{ __html: parseInlineStyles(line) }} />
        );
      })}
    </div>
  );
};

// Helper to parse bold, italic, and inline code formatting nicely
function parseInlineStyles(text: string): string {
  let html = text;
  
  // Escape HTML tags to prevent XSS in parsed text
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  
  // Italics (*text*)
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-slate-300">$1</em>');

  // Inline Code (`code`)
  html = html.replace(/`(.*?)`/g, '<code class="font-mono text-xs text-cyan-300 bg-black/40 px-1.5 py-0.5 rounded-md">$1</code>');

  return html;
}

export const AIResearchLab: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);

  const { showSuccess, showError } = useToast();

  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const finalQuery = customQuery || query;
    if (!finalQuery.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/ai/research-general', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ query: finalQuery.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        if (customQuery) setQuery(customQuery);
        showSuccess('🔍 Grounded Search completed!');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      showError(err.message || 'Grounded Search failed.');
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    'How to handle file uploads securely with Node Express?',
    'React 19 useTransition and useActionState benefits',
    'Best practices for secure JWT cookie management in 2026',
    'What is Google Search Grounding for AI models?'
  ];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header Accent */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Globe className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h2 className="font-extrabold text-xl text-white tracking-tight flex items-center gap-1.5">
                AI Research Lab <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Grounding</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-medium">Real-time technical intelligence powered by Google Search & Gemini 3.5 Flash</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input and Samples */}
        <div className="lg:col-span-4 space-y-5">
          <div className="glass-panel p-5 rounded-3xl border border-white/10 shadow-lg space-y-4">
            <h4 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-indigo-400" /> Enter Query
            </h4>

            <form onSubmit={(e) => handleSearch(e)} className="space-y-3">
              <div className="relative">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask any technical, code, design, or agile planning questions..."
                  className="w-full h-28 p-3.5 bg-black/25 rounded-2xl border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium leading-relaxed resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-extrabold text-xs rounded-xl hover:opacity-95 shadow-md shadow-cyan-500/10 focus:outline-none transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Searching Google...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run Grounded Search</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Preset Questions */}
          <div className="glass-panel p-5 rounded-3xl border border-white/10 shadow-lg space-y-4">
            <h4 className="font-bold text-xs text-slate-300 uppercase tracking-widest">Agile Suggestions</h4>
            <div className="space-y-2">
              {sampleQueries.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSearch(undefined, q)}
                  disabled={loading}
                  className="w-full text-left p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-xs text-slate-300 hover:text-white transition-all font-medium flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <span className="line-clamp-2">{q}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-300 flex-shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Search Results */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading-screen"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass-panel p-12 rounded-3xl border border-white/10 shadow-lg flex flex-col items-center justify-center text-center space-y-5"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-cyan-400 animate-spin" />
                  <Globe className="w-6 h-6 text-cyan-300 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-extrabold text-base text-white tracking-tight">Accessing Google Search Index</h4>
                  <p className="text-xs text-slate-400 max-w-sm leading-relaxed font-medium">Retrieving real-time benchmarks, live code documentation, and references to compile a secure implementation guide.</p>
                </div>
              </motion.div>
            ) : result ? (
              <motion.div
                key="results-screen"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {/* Search Queries Run card */}
                {result.queries && result.queries.length > 0 && (
                  <div className="p-4 bg-cyan-950/20 rounded-2xl border border-cyan-500/20 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
                      <Globe className="w-3.5 h-3.5" /> Google Search Query:
                    </span>
                    {result.queries.map((q, idx) => (
                      <span key={idx} className="text-xs text-slate-100 font-mono italic font-semibold">"{q}"</span>
                    ))}
                  </div>
                )}

                {/* Grounded Guide Markdown details */}
                <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-lg space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h3 className="font-extrabold text-base text-white tracking-tight flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-400" /> Grounded Technical Intelligence
                    </h3>
                  </div>

                  {/* Guide Markdown renderer */}
                  <div className="overflow-x-auto scrollbar-none">
                    <GroundedMarkdownRenderer content={result.answer} />
                  </div>
                </div>

                {/* Web Citations / Sources Segment */}
                {result.sources && result.sources.length > 0 && (
                  <div className="glass-panel p-5 rounded-3xl border border-white/10 shadow-lg space-y-3">
                    <h4 className="font-extrabold text-xs text-cyan-300 uppercase tracking-widest flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" /> Verified Grounding Sources ({result.sources.length})
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-normal font-medium mb-3">These direct web endpoints were analyzed by Gemini 3.5 Flash to construct the guide above:</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {result.sources.map((src, idx) => (
                        <a
                          key={idx}
                          href={src.uri}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-xs text-slate-200 hover:text-white transition-all font-semibold flex items-center justify-between gap-3 group"
                        >
                          <div className="overflow-hidden pr-2">
                            <p className="truncate text-slate-200 group-hover:text-cyan-300 font-bold text-xs">{src.title}</p>
                            <p className="truncate text-[10px] text-slate-500 font-mono mt-0.5">{src.uri}</p>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="glass-panel p-12 rounded-3xl border border-white/10 shadow-lg text-center space-y-4">
                <HelpCircle className="w-12 h-12 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-200 text-sm">Awaiting Grounding Query</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">Select one of our preset templates or enter your own search request to fetch grounded live solutions.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
