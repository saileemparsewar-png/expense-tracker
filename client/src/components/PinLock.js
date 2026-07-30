import React, { useState } from 'react';
import './PinLock.css';

const CORRECT_PIN = process.env.REACT_APP_PIN || '1234';

export default function PinLock({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  function handleKey(digit) {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      setTimeout(() => {
        if (newPin === CORRECT_PIN) {
          onUnlock();
        } else {
          setShake(true);
          setError(true);
          setTimeout(() => {
            setPin('');
            setShake(false);
          }, 600);
        }
      }, 100);
    }
  }

  function handleDelete() {
    setPin(p => p.slice(0, -1));
    setError(false);
  }

  const dots = [0, 1, 2, 3];

  return (
    <div className="pin-screen">
      <div className="pin-inner">
        <div className="pin-logo">💰</div>
        <h1 className="pin-title">Sailee & Ajinkya</h1>
        <p className="pin-subtitle">Enter PIN to continue</p>

        {/* Dots */}
        <div className={`pin-dots ${shake ? 'shake' : ''}`}>
          {dots.map(i => (
            <div
              key={i}
              className={`pin-dot ${i < pin.length ? 'filled' : ''} ${error ? 'error' : ''}`}
            />
          ))}
        </div>

        {error && <p className="pin-error">Wrong PIN, try again</p>}

        {/* Keypad */}
        <div className="pin-keypad">
          {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((key, i) => (
            <button
              key={i}
              className={`pin-key ${key === '' ? 'pin-key-empty' : ''} ${key === '⌫' ? 'pin-key-delete' : ''}`}
              onClick={() => {
                if (key === '') return;
                if (key === '⌫') handleDelete();
                else handleKey(String(key));
              }}
              disabled={key === ''}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
