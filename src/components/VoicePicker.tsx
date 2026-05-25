import { useEffect, useState } from 'react';
import { commentator } from '../audio/commentator';

export interface VoicePickerProps {
  value: string;
  onChange: (name: string) => void;
}

export function VoicePicker({ value, onChange }: VoicePickerProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!commentator.available()) return;
    const refresh = () => setVoices(commentator.listVoices());
    refresh();
    try {
      speechSynthesis.addEventListener('voiceschanged', refresh);
    } catch {
      speechSynthesis.onvoiceschanged = refresh;
    }
    return () => {
      try {
        speechSynthesis.removeEventListener('voiceschanged', refresh);
      } catch {
        /* ignore */
      }
    };
  }, []);

  if (!commentator.available()) {
    return <div className="muted" style={{ fontSize: 11 }}>Speech synthesis is not available in this browser.</div>;
  }

  return (
    <select
      className="voice-picker"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">— Auto (browser default) —</option>
      {voices.map((v) => (
        <option key={`${v.name}|${v.lang}`} value={v.name}>
          {v.name} · {v.lang}
          {v.default ? ' ★' : ''}
        </option>
      ))}
    </select>
  );
}
