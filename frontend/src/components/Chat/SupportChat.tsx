import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import Icon from '../common/Icon';
import './SupportChat.css';

export const SupportChat: React.FC = () => {
  const { chatMessages, sendChatMessage, fetchChatMessages, user, loading } = useApp();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Отримуємо повідомлення при монтуванні
  useEffect(() => {
    fetchChatMessages();
    
    // Налаштовуємо автооновлення чату кожні 10 секунд
    const interval = setInterval(() => {
      fetchChatMessages();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Скролимо чат до найновіших повідомлень
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const text = inputText;
    setInputText('');
    await sendChatMessage(text);
  };

  const handlePromptClick = async (promptText: string) => {
    await sendChatMessage(promptText);
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const presetPrompts = [
    "Як працює безпечний тариф?",
    "Як списати бонуси кульбаби?",
    "Доставка за кордон (Польща/Німеччина)",
    "Які машини є у вашому автопарку?"
  ];

  return (
    <div className="support-chat-container glass-card fade-in">
      <div className="chat-layout">
        {/* Бокова панель: Оператор */}
        <div className="operator-sidebar">
          <div className="operator-header">
            <div className="operator-avatar-wrapper">
              <Icon name="dandel-logo" size={24} color="var(--dandel-meadow-dark)" />
              <span className="online-indicator"></span>
            </div>
            <div>
              <h5>Служба підтримки dandel.io</h5>
              <span className="operator-status">Логіст-консультант онлайн</span>
            </div>
          </div>
          <p className="operator-description">
            Наші фахівці готові допомогти з будь-якими логістичними питаннями: від вибору оптимального тарифу за методом SAW до координації збройного супроводу та митного оформлення.
          </p>
          <div className="operator-quick-stats">
            <div className="quick-stat">
              <span>Статус:</span>
              <strong><Icon name="activity" size={12} /> {chatMessages.length > 0 ? 'Оператор на зв\'язку' : 'Очікує підключення...'}</strong>
            </div>
          </div>
        </div>

        {/* Основна секція: Повідомлення */}
        <div className="chat-messages-area">
          <div className="messages-window">
            {chatMessages.map((msg) => {
              const isMe = msg.sender_type === 'customer';
              return (
                <div key={msg.id} className={`message-bubble-row ${isMe ? 'me' : 'them'}`}>
                  {!isMe && (
                    <div className="message-avatar">
                      <Icon name="dandel-logo" size={14} color="var(--dandel-meadow-dark)" />
                    </div>
                  )}
                  <div className="message-bubble-wrapper">
                    <div className="message-bubble">
                      <p>{msg.content}</p>
                    </div>
                    <span className="message-time">{formatTime(msg.created_at)}</span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Швидкі підказки-кнопки */}
          <div className="chat-presets-bar">
            <span>Швидкі питання:</span>
            <div className="presets-scroll">
              {presetPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="preset-chip-btn"
                  onClick={() => handlePromptClick(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Поле введення */}
          <form className="chat-input-row" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Введіть ваше запитання логісту dandel.io..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn-accent send-chat-btn" disabled={loading}>
              <Icon name="send" size={18} />
              <span>Надіслати</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default SupportChat;
