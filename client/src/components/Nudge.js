import React, { useState, useEffect } from 'react';
import './Nudge.css';

/**
 * Nudge — shows a dismissible alert after adding a transaction.
 * Accepts an array of nudge objects: { severity, message }
 */
export default function Nudge({ nudges, onDismiss }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!nudges || nudges.length === 0) return;
    // Auto-dismiss after 8 seconds
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 8000);
    return () => clearTimeout(t);
  }, [nudges]);

  if (!visible || !nudges || nudges.length === 0) return null;

  return (
    <div className="nudge-container">
      {nudges.map((nudge, i) => (
        <div key={i} className={`nudge nudge-${nudge.severity}`}>
          <p className="nudge-message">{nudge.message}</p>
          <button className="nudge-close" onClick={() => { setVisible(false); onDismiss?.(); }}>✕</button>
        </div>
      ))}
    </div>
  );
}
