import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import Icon from '../common/Icon';
import '../Chat/SupportChat.css'; // Reusing some chat styles
import { useOverlay } from '../../context/OverlayContext';

interface AdminChatUser {
  user_id: number;
  full_name: string;
  email: string;
  last_message: string;
  last_message_date: string;
  unread: boolean;
  is_resolved: boolean;
}

interface ChatMessage {
  id: number;
  user_id: number;
  sender_type: string;
  content: string;
  created_at: string;
}

export const AdminChatPanel: React.FC = () => {
  const { token } = useApp();
  const { showConfirm } = useOverlay();
  const [chats, setChats] = useState<AdminChatUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [chatFilter, setChatFilter] = useState<'active' | 'resolved'>('active');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChats = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/chat/admin/chats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        let data: AdminChatUser[] = await res.json();
        data.sort((a, b) => {
          if (a.unread && !b.unread) return -1;
          if (!a.unread && b.unread) return 1;
          const dateA = new Date(a.last_message_date || 0).getTime();
          const dateB = new Date(b.last_message_date || 0).getTime();
          return dateB - dateA;
        });
        setChats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (userId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/chat/admin/messages/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMessages(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchChats();
    const interval = setInterval(() => {
      fetchChats();
      if (selectedUserId) {
        fetchMessages(selectedUserId);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [token, selectedUserId]);

  useEffect(() => {
    if (selectedUserId) {
      fetchMessages(selectedUserId);
    }
  }, [selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedUserId || !token) return;
    
    const text = inputText;
    setInputText('');
    setLoading(true);
    
    try {
      const res = await fetch('/api/chat/admin/messages', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: selectedUserId, content: text })
      });
      
      if (res.ok) {
        await fetchMessages(selectedUserId);
        fetchChats();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveChat = async () => {
    if (!selectedUserId || !token) return;
    if (!(await showConfirm("Ви впевнені, що хочете закрити чат? Він буде переміщений в історію."))) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/chat/admin/messages/${selectedUserId}/resolve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSelectedUserId(null);
        setMessages([]);
        fetchChats();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const selectedUser = chats.find(c => c.user_id === selectedUserId);
  const filteredChats = chats.filter(c => chatFilter === 'active' ? !c.is_resolved : c.is_resolved);

  return (
    <div className="glass-card fade-in" style={{ padding: '1rem', height: '600px', display: 'flex', gap: '1rem' }}>
      {/* Список чатів */}
      <div style={{ width: '300px', borderRight: '1px solid rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
          <button 
            style={{ flex: 1, padding: '0.75rem', background: chatFilter === 'active' ? 'white' : 'transparent', border: 'none', fontWeight: chatFilter === 'active' ? 'bold' : 'normal', borderBottom: chatFilter === 'active' ? '2px solid var(--dandel-green)' : '2px solid transparent', cursor: 'pointer' }}
            onClick={() => setChatFilter('active')}
          >
            Активні
          </button>
          <button 
            style={{ flex: 1, padding: '0.75rem', background: chatFilter === 'resolved' ? 'white' : 'transparent', border: 'none', fontWeight: chatFilter === 'resolved' ? 'bold' : 'normal', borderBottom: chatFilter === 'resolved' ? '2px solid var(--dandel-green)' : '2px solid transparent', cursor: 'pointer' }}
            onClick={() => setChatFilter('resolved')}
          >
            Історія
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredChats.map(chat => (
            <div 
              key={chat.user_id} 
              onClick={() => setSelectedUserId(chat.user_id)}
              style={{
                padding: '1rem',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                background: selectedUserId === chat.user_id ? 'rgba(63, 143, 82, 0.1)' : 'transparent',
                borderLeft: chat.unread ? '4px solid var(--dandel-green)' : '4px solid transparent'
              }}
            >
              <div style={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                <span>{chat.full_name}</span>
                <span style={{ fontSize: '0.7rem', color: '#888' }}>
                  {chat.last_message_date ? formatTime(chat.last_message_date) : ''}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {chat.last_message}
              </div>
            </div>
          ))}
          {filteredChats.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Немає чатів</div>
          )}
        </div>
      </div>

      {/* Вікно повідомлень */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '8px' }}>
        {selectedUserId ? (
          <>
            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.1)', background: '#f8f9fa', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Клієнт: {selectedUser?.full_name}</strong> ({selectedUser?.email})
                {selectedUser?.is_resolved && <span style={{ marginLeft: '10px', fontSize: '0.75rem', background: '#ccc', padding: '2px 6px', borderRadius: '4px' }}>Закрито</span>}
              </div>
              {!selectedUser?.is_resolved && (
                <button 
                  className="btn-secondary" 
                  onClick={handleResolveChat}
                  disabled={loading}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', color: 'var(--dandel-danger-text)' }}>
                  <Icon name="check-circle" size={14} /> Маркувати як вирішене
                </button>
              )}
            </div>
            
            <div className="support-chat-messages" style={{ height: 'auto', flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {messages.map((msg) => {
                const isMe = msg.sender_type === 'support';
                return (
                  <div key={msg.id} className={`message-bubble-row ${isMe ? 'me' : 'them'}`}>
                    {!isMe && (
                      <div className="message-avatar" style={{ background: '#e9ecef', borderRadius: '50%' }}>
                        <Icon name="user" size={14} color="#6c757d" />
                      </div>
                    )}
                    <div className="message-bubble-wrapper">
                      <div className="message-bubble" style={{ background: isMe ? 'var(--dandel-green)' : '#f1f3f5', color: isMe ? 'white' : 'black' }}>
                        <p>{msg.content}</p>
                      </div>
                      <span className="message-time" style={{ alignSelf: isMe ? 'flex-end' : 'flex-start' }}>{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="support-chat-input-area" style={{ background: '#f8f9fa', padding: '1rem', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Введіть відповідь..."
                className="chat-input"
                disabled={loading || selectedUser?.is_resolved}
                style={{ flex: 1, padding: '0.8rem', borderRadius: '4px', border: '1px solid #ddd' }}
              />
              <button type="submit" className="chat-send-btn" disabled={!inputText.trim() || loading || selectedUser?.is_resolved} style={{ padding: '0 1.5rem' }}>
                <Icon name="send" size={18} />
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
            Виберіть чат зліва, щоб почати спілкування
          </div>
        )}
      </div>
    </div>
  );
};
