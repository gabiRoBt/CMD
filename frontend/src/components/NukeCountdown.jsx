import { useEffect, useState, useRef } from 'react';
import { sounds } from '../utils/sounds';

export function NukeCountdown({ onFinish, t }) {
  const [count, setCount] = useState(5);
  const endTimeRef = useRef(Date.now() + 5000);

  useEffect(() => {
    // start continuous war-time alarm overlay
    sounds.startAlarm();
    // initially ping for t-5 right away since left starts on 5 and next interval might miss ping 5 start
    sounds.countdownTick();

    const interval = setInterval(() => {
      const left = Math.ceil((endTimeRef.current - Date.now()) / 1000);
      if (left <= 0) {
        setCount(prev => {
          if (prev > 0) sounds.countdownEnd();
          return 0;
        });
        clearInterval(interval);
      } else {
        setCount(prev => {
          if (prev !== left && prev > left) sounds.countdownTick();
          return left;
        });
      }
    }, 100);
    return () => {
      clearInterval(interval);
      sounds.stopAlarm();
    };
  }, []);

  useEffect(() => {
    if (count === 0) {
      const timer = setTimeout(() => {
        sounds.tvSwitch();
        onFinish();
      }, 600); // 0.6s fade to black
      return () => clearTimeout(timer);
    }
  }, [count, onFinish]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 499, // underneath the CRT overlay (500)
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: '#000',
      color: 'var(--red)',
      fontFamily: '"Orbitron", monospace',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: count > 0 ? 1 : 0,
        transition: 'opacity 0.6s ease'
      }}>
        <div style={{
          fontSize: '5rem', fontWeight: 900,
          textShadow: '0 0 30px var(--red)',
          marginBottom: '2rem',
          textAlign: 'center',
          textTransform: 'uppercase'
        }}>
          {t?.arenaStarting || 'ARENA STARTING'}
        </div>
        <div style={{
          fontSize: '15rem', fontWeight: 900, lineHeight: 1,
          textShadow: '0 0 50px var(--red)',
        }}>
          {count > 0 ? count : 1}
        </div>
      </div>
    </div>
  );
}
