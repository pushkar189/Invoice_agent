import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Lightbulb } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { agentApi } from '../services/api';

const SUGGESTED = [
  'How many invoices are pending?',
  'Which vendor has the highest spending?',
  'Show me overdue invoices',
  'How much GST did we pay this year?',
  'Are there any duplicate invoices?',
  'Show invoices above ₹50000',
  'Which invoices need review?',
  'What is the total spending this month?',
];

const Message = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-primary-600' : 'bg-gradient-to-br from-purple-600 to-primary-600'}`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
      </div>
      <div className={`max-w-2xl ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1 animate-slide-up`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm
          ${isUser ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'}`}>
          {msg.content}
        </div>
        {msg.tool && !isUser && (
          <p className="text-xs text-slate-400 px-1">Used tool: {msg.tool}</p>
        )}
        <p className="text-xs text-slate-400 px-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
      </div>
    </div>
  );
};

const AIAssistant = () => {
  const [messages, setMessages] = useState([{
    id: 'welcome',
    role: 'assistant',
    content: "Hi! I'm your AI Invoice Assistant powered by Gemma 4. I can answer questions about your invoices, vendors, expenses, taxes, and more.\n\nAll my answers are based on real data from your invoice database. What would you like to know?",
    timestamp: new Date().toISOString(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    setInput('');
    setError('');

    const userMsg = { id: Date.now(), role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await agentApi.chat(msg);
      const { response, tool } = res.data.data;
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: response,
        tool,
        timestamp: new Date().toISOString(),
      }]);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to get AI response. Is Ollama running?';
      setError(errMsg);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `⚠️ ${errMsg}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="AI Assistant" subtitle="Ask questions about your invoices in natural language">
      <div className="flex flex-col h-[calc(100vh-10rem)]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.map(m => <Message key={m.id} msg={m} />)}
          {loading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-primary-600 flex items-center justify-center">
                <Bot size={14} className="text-white" />
              </div>
              <div className="px-4 py-3 bg-white border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Loader2 size={14} className="animate-spin text-primary-500" />
                  Thinking with Gemma...
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="mb-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={13} className="text-amber-500" />
              <span className="text-xs text-slate-500 font-medium">Try asking:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50 transition-colors shadow-sm hover:shadow">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex gap-3 pt-4 border-t border-slate-200 bg-slate-50">
          <input
            id="chat-input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about invoices, vendors, expenses, GST..."
            className="input flex-1"
            disabled={loading}
          />
          <button
            id="chat-send"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="btn-primary px-4 disabled:opacity-50">
            <Send size={16} />
          </button>
        </div>
        <p className="text-xs text-slate-500 text-center mt-2">
          AI responses are based on real database data. All financial queries use secure pre-defined tools.
        </p>
      </div>
    </Layout>
  );
};

export default AIAssistant;
