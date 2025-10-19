'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './chat.module.scss';
const api = process.env.NEXT_PUBLIC_WS_API;
if (!api) {
  throw new Error('Variável de ambiente NEXT_PUBLIC_WS_API não está definida');
}

const ChatWithVoice = () => {
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([]);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { sender: 'user', text }]);

    try {
      const res = await fetch(api, {
        method: 'POST',
        body: JSON.stringify({ message: text }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      setMessages((prev) => [...prev, { sender: 'bot', text: data.response }]);

      if (synth) {
        const utterance = new SpeechSynthesisUtterance(data.response);
        synth.speak(utterance);
      }
    } catch (err) {
      console.error('Erro ao buscar resposta:', err);
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Navegador não suporta reconhecimento de voz.');

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      handleSendMessage(transcript);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Chat com Voz 🤖🎙️</h1>

      <div className={styles.chatBox}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`${styles.message} ${msg.sender === 'user' ? styles.user : styles.bot}`}
          >
            <strong>{msg.sender === 'user' ? 'Você' : 'Bot'}:</strong> {msg.text}
          </div>
        ))}
      </div>

      <button
        onClick={startListening}
        disabled={listening}
        className={styles.listenButton}
      >
        🎤 {listening ? 'Ouvindo...' : 'Falar'}
      </button>
    </div>
  );
};

export default ChatWithVoice;
