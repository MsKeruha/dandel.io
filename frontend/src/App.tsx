import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { OverlayProvider, useOverlay } from './context/OverlayContext';
import Icon from './components/common/Icon';
import CriteriaSelector from './components/CriteriaSelector/CriteriaSelector';
import CreateDeliveryModal from './components/Customer/CreateDeliveryModal';
import ProfilePanel from './components/Customer/ProfilePanel';
import SupportChat from './components/Chat/SupportChat';
import BonusSystem from './components/Dashboard/BonusSystem';
import RouteMap from './components/Map/RouteMap';
import AdminPanel from './components/Admin/AdminPanel';
import './App.css';

const DashboardContent: React.FC = () => {
  const {
    user,
    token,
    login,
    register,
    logout,
    myDeliveries,
    fetchMyDeliveries,
    simulateStep,
    loading
  } = useApp();

  const { showAlert } = useOverlay();

  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'bonuses' | 'chat' | 'admin'>('home');
  const [showLogin, setShowLogin] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  // Поля авторизації
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Для активного виділеного замовлення на карті доставки
  const [trackedDeliveryId, setTrackedDeliveryId] = useState<number | null>(null);

  // Статистика
  const [stats, setStats] = useState({ vehicle_count: 142, on_time_percentage: 99.8, cashback_percentage: 5 });

  useEffect(() => {
    fetch('http://localhost:8000/api/stats')
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(e => console.warn('Stats fetch failed', e));

    if (token) {
      fetchMyDeliveries();
      setShowLogin(false);
    }
  }, [token]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegisterMode) {
      const success = await register(email, fullName, password);
      if (success) {
        setIsRegisterMode(false);
        showAlert('Реєстрація успішна! Тепер увійдіть.');
      }
    } else {
      await login(email, password);
    }
  };

  const handleSimulate = async (deliveryId: number) => {
    await simulateStep(deliveryId);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Created': return 'Створено вантаж';
      case 'Processing': return 'Оформлення на складі';
      case 'In_Transit': return 'В дорозі';
      case 'Customs': return 'Митний контроль';
      case 'Delivered': return 'Доставлено отримувачу';
      default: return status;
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'Created': return 20;
      case 'Processing': return 40;
      case 'In_Transit': return 70;
      case 'Customs': return 85;
      case 'Delivered': return 100;
      default: return 0;
    }
  };

  const getLoyaltyIconName = (level?: string) => {
    switch (level) {
      case 'Золота кульбаба': return 'crown';
      case 'Суцвіття': return 'flower2';
      case 'Парашутик': return 'wind';
      default: return 'sprout';
    }
  };

  const trackedDelivery = myDeliveries.find(d => d.id === trackedDeliveryId) || myDeliveries[0];

  const handleProtectedTab = (tab: any) => {
    if (!token) {
      setShowLogin(true);
      return;
    }
    setActiveTab(tab);
    if (tab === 'profile') {
      fetchMyDeliveries();
    }
  };

  return (
    <div className="dashboard-container">
      {/* Авторизаційна модалка */}
      {showLogin && !token && (
        <div className="auth-overlay">
          <div className="auth-card glass-card fade-in">
            <div className="auth-brand">
              <Icon name="dandel-logo" size={64} color="var(--dandel-gold)" />
              <h2>dandel.io</h2>
              <p>розумна логістика кульбаби</p>
              <button className="close-auth-btn" onClick={() => setShowLogin(false)} style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', cursor: 'pointer' }}>
                <Icon name="x" size={24} />
              </button>
            </div>

            <form onSubmit={handleAuth} className="auth-form">
              {isRegisterMode && (
                <div className="input-group">
                  <label htmlFor="fullName"><Icon name="user" size={14} /> ПІБ</label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Костянтин Кульбаба"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              <div className="input-group">
                <label htmlFor="email"><Icon name="mail" size={14} /> Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@dandel.io"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="password"><Icon name="lock" size={14} /> Пароль</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={isRegisterMode ? "new-password" : "current-password"}
                  required
                />
              </div>

              <button type="submit" className="btn-accent auth-btn" disabled={loading}>
                <Icon name="log-in" size={18} />
                <span>{loading ? 'Чекайте...' : isRegisterMode ? 'Зареєструватися' : 'Увійти в кабінет'}</span>
              </button>
            </form>

            <div className="auth-toggle">
              {isRegisterMode ? (
                <p>Вже маєте кабінет? <span onClick={() => setIsRegisterMode(false)}>Увійти</span></p>
              ) : (
                <p>Вперше у нас? <span onClick={() => setIsRegisterMode(true)}>Зареєструвати кабінет</span></p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Летюче насіння на фоні */}
      <div className="dandelion-seeds-bg">
        <div className="seed" style={{ top: '20%', left: '-5%', animationDelay: '0s' }}></div>
        <div className="seed" style={{ top: '50%', left: '-5%', animationDelay: '4s', animationDuration: '24s' }}></div>
        <div className="seed" style={{ top: '80%', left: '-5%', animationDelay: '8s', animationDuration: '18s' }}></div>
      </div>

      {/* Шапка сайту */}
      <header className="main-navbar glass-card">
        <div className="navbar-logo-area">
          <Icon name="dandel-logo" size={36} color="var(--dandel-gold)" />
          <div>
            <h1>dandel.io</h1>
            <span>розумна логістика кульбаби</span>
          </div>
        </div>

        {/* Навігаційне меню */}
        <nav className="navbar-tabs">
          <button
            className={`tab-link ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <Icon name="home" size={16} />
            <span>Головна</span>
          </button>
          <button
            className="tab-link action-btn"
            onClick={() => setShowDeliveryModal(true)}
            style={{ background: 'rgba(255,199,44,0.1)', color: 'var(--dandel-gold)' }}
          >
            <Icon name="plus-circle" size={16} />
            <span>Оформити доставку</span>
          </button>
          <button
            className={`tab-link ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleProtectedTab('profile')}
          >
            <Icon name="user" size={16} />
            <span>Профіль та Доставки</span>
          </button>
          <button
            className={`tab-link ${activeTab === 'bonuses' ? 'active' : ''}`}
            onClick={() => handleProtectedTab('bonuses')}
          >
            <Icon name="gift" size={16} />
            <span>Кабінет Бонусів</span>
          </button>
          <button
            className={`tab-link ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => handleProtectedTab('chat')}
          >
            <Icon name="message-square" size={16} />
            <span>Чат Підтримки</span>
          </button>
          {user?.role === 'admin' && (
            <button
              className={`tab-link ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <Icon name="settings" size={16} />
              <span>Адміністрування</span>
            </button>
          )}
        </nav>

        {/* Профіль користувача або кнопка входу */}
        <div className="navbar-user-area">
          {token && user ? (
            <div className="user-profile-badge">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="Аватар" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <Icon name="user" size={20} color="var(--dandel-gold)" />
              )}
              <span>{user.full_name.split(' ')[0]}</span>
              <button
                className="btn-logout"
                onClick={logout}
                title="Вийти з акаунту"
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', marginLeft: '10px' }}
              >
                <Icon name="log-out" size={18} />
              </button>
            </div>
          ) : (
            <button className="btn-accent" onClick={() => setShowLogin(true)} style={{ padding: '8px 16px', fontSize: '14px' }}>
              <Icon name="user" size={16} />
              Увійти
            </button>
          )}
        </div>
      </header>

      {/* Головний контент */}
      <main className="dashboard-content-area">
        {activeTab === 'home' && (
          <>
            {/* Immersive Hero Section */}
            <div className="hero-section glass-card fade-in">
              <div className="hero-content">
                <h2>Мультикритеріальна смарт-доставка вантажів</h2>
                <p>
                  Ми доставляємо ваш вантаж по всій Україні та за кордон на власних авто. Наче насіння кульбаби dandel.io, що летить за вітром, наша розумна система автоматично розраховує найкращі сценарії доставки на основі ваших критеріїв за методом SAW.
                </p>
                <div style={{ marginTop: '2rem' }}>
                  <CriteriaSelector />
                </div>
                
                <div className="hero-stats-row" style={{ marginTop: '4rem' }}>
                  <div className="hero-stat-card">
                    <h3>{stats.vehicle_count} <Icon name="truck" size={16} /></h3>
                    <span>Власних машин</span>
                  </div>
                  <div className="hero-stat-card">
                    <h3>{stats.on_time_percentage}% <Icon name="clock" size={16} /></h3>
                    <span>Точність термінів</span>
                  </div>
                  <div className="hero-stat-card">
                    <h3><Icon name="shield" size={16} /> Безпека</h3>
                    <span>Обхід зон воєнних ризиків</span>
                  </div>
                  <div className="hero-stat-card">
                    <h3><Icon name="gift" size={16} /> {stats.cashback_percentage}%</h3>
                    <span>Кешбеку бонусами</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* === Вкладка "Профіль та Доставки" === */}
        {activeTab === 'profile' && (
          <ProfilePanel />
        )}

        {activeTab === 'bonuses' && <BonusSystem />}

        {activeTab === 'chat' && <SupportChat />}

        {activeTab === 'admin' && user?.role === 'admin' && <AdminPanel />}
      </main>

      {/* Футер */}
      <footer className="main-footer">
        <p>© 2026 dandel.io — Інтелектуальна веборієнтована логістична платформа. Всі права захищені.</p>
        <p>Розроблено на тему: "Розроблення веборієнтованої системи для транскордонних та внутрішніх перевезеннь з мультикритеріальним вибором сценаріїв доставки"</p>
      </footer>

      {/* Модальне вікно створення доставки */}
      {showDeliveryModal && (
        <CreateDeliveryModal onClose={() => setShowDeliveryModal(false)} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <OverlayProvider>
      <AppProvider>
        <DashboardContent />
      </AppProvider>
    </OverlayProvider>
  );
}