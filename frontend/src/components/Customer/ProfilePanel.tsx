import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Icon from '../common/Icon';
import CustomerDeliveries from './CustomerDeliveries';
import './ProfilePanel.css';

export const ProfilePanel: React.FC = () => {
  const { user, updateProfile, uploadAvatar, myDeliveries, loading } = useApp();
  
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [updateMsg, setUpdateMsg] = useState('');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateProfile({ full_name: fullName, phone, address });
    if (success) {
      setUpdateMsg('Профіль успішно оновлено!');
      setTimeout(() => setUpdateMsg(''), 3000);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const success = await uploadAvatar(e.target.files[0]);
      if (success) {
        setUpdateMsg('Аватар успішно оновлено!');
        setTimeout(() => setUpdateMsg(''), 3000);
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
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="user-avatar-img" />
                ) : (
                  <Icon name="user" size={48} color="var(--dandel-gold)" />
                )}
                <label className="avatar-upload-btn">
                  <Icon name="camera" size={16} />
                  <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                </label>
              </div>
              <div className="user-titles">
                <h2>{user.full_name}</h2>
                <span className="role-badge">{user.role}</span>
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
            
            <div className="input-group">
              <label>ПІБ</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>

            <div className="input-group">
              <label>Номер телефону</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+380..." />
            </div>

            <div className="input-group">
              <label>Адреса / Відділення за замовчуванням</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Ваша адреса" />
            </div>

            <button type="submit" className="btn-accent" disabled={loading}>
              <Icon name="save" size={16} /> {loading ? 'Збереження...' : 'Зберегти зміни'}
            </button>
            
            {updateMsg && <div className="success-msg" style={{ marginTop: '10px', color: 'var(--dandel-green)' }}>{updateMsg}</div>}
          </form>
        </div>

        {/* Статистика та Бонуси */}
        <div className="glass-card profile-stats-card">
          <h3>Ваша статистика</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <Icon name="package" size={24} color="var(--dandel-mint)" />
              <div className="stat-info">
                <strong>{myDeliveries.length}</strong>
                <span>Відправлень</span>
              </div>
            </div>
            <div className="stat-item">
              <Icon name="gift" size={24} color="var(--dandel-gold)" />
              <div className="stat-info">
                <strong>{user.bonuses_balance}</strong>
                <span>Бонусів</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <CustomerDeliveries />
    </div>
  );
};

export default ProfilePanel;
