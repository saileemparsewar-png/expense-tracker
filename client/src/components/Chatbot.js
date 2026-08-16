import React, { useState, useEffect, useRef } from 'react';
import './Chatbot.css';

const SUGGESTIONS = [
  'How much have I spent this month?',
  'What\'s my biggest expense category?',
  'Am I on track with my goals?',
  'Compare this month to last month',
  'Where am I overspending?',
  'How much has Ajinkya spent this month?',
  'What are my spending patterns?',
  'How much have we saved this month?',
];

async function sendMessage(messages, user) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, user }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data.reply;
}

export default function Chatbot({ activeUser }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${activeUser === 'sailee' ? 'Sailee' : 'Ajinkya'}! 👋 I know your finances — ask me anything about your spending, goals, or patterns.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;

    setInput('');
    setShowSuggestions(false);

    const userMsg = { role: 'user', content: msg };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // Only send last 10 messages to keep context window manageable
      const contextMessages = updatedMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await sendMessage(contextMessages, activeUser);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Sorry, something went wrong. Please try again.',
      }]);
    }
    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="chat-page">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-avatar">🤖</div>
        <div>
          <div className="chat-title">Finance Assistant</div>
          <div className="chat-status">Knows your transactions & goals</div>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble-wrapper ${msg.role}`}>
            {msg.role === 'assistant' && <div className="chat-bot-icon">🤖</div>}
            <div className={`chat-bubble ${msg.role}`}>
              <MessageContent content={msg.content} />
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-bubble-wrapper assistant">
            <div className="chat-bot-icon">🤖</div>
            <div className="chat-bubble assistant">
              <div className="chat-typing">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        {/* Suggestion chips */}
        {showSuggestions && messages.length === 1 && (
          <div className="chat-suggestions">
            <p className="suggestions-label">Try asking:</p>
            <div className="suggestions-grid">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className="suggestion-chip" onClick={() => handleSend(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-bar">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Ask about your finances..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={loading}
        />
        <button
          className={`chat-send-btn ${(!input.trim() || loading) ? 'disabled' : ''}`}
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

// Renders markdown-like formatting from AI responses
function MessageContent({ content }) {
  // Simple formatting: bold **text**, line breaks
  const lines = content.split('\n').filter((l, i, arr) => !(l === '' && arr[i - 1] === ''));
  return (
    <div className="message-content">
      {lines.map((line, i) => {
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <div key={i} className="msg-bullet">· {line.slice(2)}</div>;
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return <div key={i} className="msg-bold">{line.slice(2, -2)}</div>;
        }
        if (line === '') return <br key={i} />;
        // Inline bold
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <div key={i} className="msg-line">
            {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
          </div>
        );
      })}
    </div>
  );
}
