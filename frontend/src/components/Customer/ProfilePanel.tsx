import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useOverlay } from '../../context/OverlayContext';
import Icon from '../common/Icon';
import './ProfilePanel.css';

const PRESETS_AVATARS = [
  'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=150&q=80', // Зелена кульбаба
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=150&q=80', // Лісова поляна
  'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=150&q=80', // Росток
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=150&q=80', // Сонячний ліс
  'https://images.unsplash.com/photo-1475113548554-5a36f1f523d6?auto=format&fit=crop&w=150&q=80', // Природа і сонце
  'https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1?auto=format&fit=crop&w=150&q=80'  // Зелений бір
];

export const ProfilePanel: React.FC = () => {
  const { user, updateProfile, uploadAvatar, myDeliveries, loading } = useApp();
  const { showAlert } = useOverlay();
  
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [password, setPassword] = useState('');
  const [updateMsg, setUpdateMsg] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar_url || '');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password.length < 8) {
      showAlert('Пароль має містити щонайменше 8 символів.', 'Помилка');
      return;
    }
    const success = await updateProfile({ 
      full_name: fullName, 
      phone, 
      address, 
      password,
      avatar_url: selectedAvatar 
    });
    if (success) {
      showAlert('Профіль успішно оновлено!', 'Успіх');
      setUpdateMsg('Профіль успішно оновлено!');
      setPassword('');
      setTimeout(() => setUpdateMsg(''), 3000);
    } else {
      showAlert('Не вдалося зберегти зміни профілю', 'Помилка');
    }
  };

  const handleAvatarSelect = (url: string) => {
    setSelectedAvatar(url);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const success = await uploadAvatar(e.target.files[0]);
      if (success) {
        showAlert('Аватар успішно оновлено!', 'Успіх');
        setUpdateMsg('Аватар успішно оновлено!');
        setTimeout(() => setUpdateMsg(''), 3000);
      } else {
        showAlert('Не вдалося завантажити аватар', 'Помилка');
      }
    }
  };

  if (!user) return null;

  return (
    <div className="profile-panel-container fade-in">
      <div className="profile-grid">
        {/* Особисті дані */}
        <div className="glass-card profile-details-card">
          <div className="profile-header">
            <div className="avatar-section">
              <div className="avatar-wrapper">
                {selectedAvatar || user.avatar_url ? (
                  <img src={selectedAvatar || user.avatar_url} alt="Avatar" className="user-avatar-img" />
                ) : (
                  <Icon name="user" size={48} color="var(--dandel-gold)" />
                )}
                <label className="avatar-upload-btn" title="Завантажити своє фото">
                  <Icon name="camera" size={16} />
                  <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                </label>
              </div>
              <div className="user-titles">
                <h2>{user.full_name}</h2>
                <span className="role-badge">{user.role === 'customer' ? 'Клієнт' : user.role === 'driver' ? 'Водій' : 'Адміністратор'}</span>
                <span className="loyalty-badge"><Icon name="award" size={14} /> {user.loyalty_level}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="profile-form">
            <h3>Особисті дані</h3>
            <div className="input-group">
              <label>Електронна пошта</label>
              <input type="email" value={user.email} disabled className="disabled-input" />
            </div>
            
            <div className="input-row-grid">
              <div className="input-group">
                <label>ПІБ</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>

              <div className="input-group">
                <label>Номер телефону</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+380..." />
              </div>
            </div>

            <div className="input-group">
              <label>Адреса / Відділення за замовчуванням</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Ваша адреса" />
            </div>

            <div className="input-group">
              <label>Новий пароль (залиште порожнім, якщо не хочете змінювати)</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            {/* Секція вибору преміум-аватарів */}
            <div className="premium-avatars-section" style={{ marginTop: '20px', marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--dandel-meadow-light)' }}>Оберіть фірмову аватарку dandel.io</label>
              <div className="avatars-presets-grid" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {PRESETS_AVATARS.map((url, i) => (
                  <div 
                    key={i} 
                    className={`avatar-preset-item ${selectedAvatar === url ? 'active' : ''}`}
                    onClick={() => handleAvatarSelect(url)}
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      border: selectedAvatar === url ? '3px solid var(--dandel-gold)' : '2px solid transparent',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      boxShadow: selectedAvatar === url ? '0 0 10px rgba(245, 158, 11, 0.4)' : 'none'
                    }}
                  >
                    <img src={url} alt={`Preset ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-accent" disabled={loading}>
              <Icon name="save" size={16} /> {loading ? 'Збереження...' : 'Зберегти зміни'}
            </button>
            
            {updateMsg && <div className="success-msg" style={{ marginTop: '10px', color: 'var(--dandel-green)', fontWeight: 'bold' }}>{updateMsg}</div>}
          </form>
        </div>

        {/* Статистика та Бонуси */}
        <div className="glass-card profile-stats-card">
          <h3>Ваша статистика</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <Icon name="package" size={24} color="var(--dandel-green)" />
              <div className="stat-info">
                <strong>{myDeliveries.length}</strong>
                <span>Відправлень</span>
              </div>
            </div>
            <div className="stat-item">
              <Icon name="gift" size={24} color="var(--dandel-gold)" />
              <div className="stat-info">
                <strong>{typeof user.bonuses_balance === 'number' ? user.bonuses_balance.toFixed(2) : user.bonuses_balance}</strong>
                <span>Бонусів</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePanel;
