'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './chat.module.scss';

const wsUrl = process.env.NEXT_PUBLIC_WS_API;
console.log(`varenv: ${wsUrl}`)

if (!wsUrl) {
  throw new Error('Variável de ambiente NEXT_PUBLIC_WS_API não está definida');
}

const ChatWithVoice = () => {
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([]);
  const [listening, setListening] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
// Inicializa o WebSocket quando o componente monta
useEffect(() => {
  const ws = new WebSocket(wsUrl.replace(/^http/, 'ws'));
  setSocket(ws);

  return () => {
    ws.close();
  };
}, []);

 useEffect(() => {
  if (!socket) return;

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.error) {
        console.error('Erro do servidor:', data.error);
        return;
      }

      const { sender, text } = data;

      setMessages((prev) => [...prev, { sender, text }]);

      if (synth && sender === 'bot') {
        const utterance = new SpeechSynthesisUtterance(text);
        synth.speak(utterance);
      }
    } catch {
      // Caso mensagem não seja JSON, tratar como string simples
      let text = event.data as string;
      if (text.startsWith('Cali_Bot:')) {
        text = text.replace('Cali_Bot: ', '');
      }

      setMessages((prev) => [...prev, { sender: 'bot', text }]);

      if (synth) {
        const utterance = new SpeechSynthesisUtterance(text);
        synth.speak(utterance);
      }
    }
  };

  socket.onerror = (err) => {
    console.error('WebSocket error:', err);
  };

  return () => {
    socket.close();
  };
}, [socket]);


  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { sender: 'user', text }]);

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(text);
    } else {
      console.error('WebSocket não está conectado.');
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
      <h1 className={styles.title}>CaliBot</h1>

      <div className={styles.chatBox}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`${styles.message} ${msg.sender === 'user' ? styles.user : styles.bot}`}
          >
            <strong>{msg.sender === 'user' ? 'Você' : 'CaliBot'}:</strong> {msg.text}
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
