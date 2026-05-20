import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Icon from './components/common/Icon';
import CriteriaSelector from './components/CriteriaSelector/CriteriaSelector';
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

  const [activeTab, setActiveTab] = useState<'calculate' | 'deliveries' | 'bonuses' | 'chat' | 'admin'>('calculate');
  const [showLogin, setShowLogin] = useState(true);
  
  // Поля авторизації
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Для активного виділеного замовлення на карті доставки
  const [trackedDeliveryId, setTrackedDeliveryId] = useState<number | null>(null);

  useEffect(() => {
    if (token) {
      fetchMyDeliveries();
    }
  }, [token]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegisterMode) {
      const success = await register(email, fullName, password);
      if (success) {
        setIsRegisterMode(false);
        alert('Реєстрація успішна! Тепер увійдіть.');
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

  // Якщо користувач не авторизований
  if (!token) {
    return (
      <div className="auth-overlay">
        <div className="auth-card glass-card fade-in">
          <div className="auth-brand">
            <Icon name="dandel-logo" size={64} color="var(--dandel-gold)" />
            <h2>dandel.io</h2>
            <p>розумна логістика кульбаби</p>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            {isRegisterMode && (
              <div className="input-group">
                <label><Icon name="user" size={14} /> ПІБ</label>
                <input 
                  type="text" 
                  placeholder="Костянтин Кульбаба" 
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required 
                />
              </div>
            )}
            
            <div className="input-group">
              <label><Icon name="mail" size={14} /> Email</label>
              <input 
                type="email" 
                placeholder="email@dandel.io" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required 
              />
            </div>

            <div className="input-group">
              <label><Icon name="lock" size={14} /> Пароль</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
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
    );
  }


  return (
    <div className="dashboard-container">
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
            className={`tab-link ${activeTab === 'calculate' ? 'active' : ''}`}
            onClick={() => setActiveTab('calculate')}
          >
            <Icon name="sliders" size={16} />
            <span>Оформити & SAW</span>
          </button>
          <button 
            className={`tab-link ${activeTab === 'deliveries' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('deliveries');
              fetchMyDeliveries();
            }}
          >
            <Icon name="truck" size={16} />
            <span>Мої Доставки ({myDeliveries.length})</span>
          </button>
          <button 
            className={`tab-link ${activeTab === 'bonuses' ? 'active' : ''}`}
            onClick={() => setActiveTab('bonuses')}
          >
            <Icon name="gift" size={16} />
            <span>Кабінет Бонусів</span>
          </button>
          <button 
            className={`tab-link ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
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

        {/* Профіль користувача */}
        <div className="navbar-user-area">
          <div className="user-info-text">
            <strong>{user?.full_name}</strong>
            <span className="user-loyalty-label">
              <Icon name={getLoyaltyIconName(user?.loyalty_level)} size={14} />
              {user?.loyalty_level}
            </span>
          </div>
          <div className="user-bonuses-pill" onClick={() => setActiveTab('bonuses')}>
            <Icon name="gift" size={14} color="var(--dandel-gold)" />
            <span>{user?.bonuses_balance}</span>
          </div>
          <button className="logout-btn" onClick={logout} title="Вийти з кабінету">
            <Icon name="log-out" size={16} />
          </button>
        </div>
      </header>

      {/* Головний контент */}
      <main className="dashboard-content-area">
        {activeTab === 'calculate' && (
          <>
            {/* Immersive Hero Section */}
            <div className="hero-section glass-card fade-in">
              <div className="hero-content">
                <h2>Мультикритеріальна смарт-доставка вантажів</h2>
                <p>
                  Ми доставляємо ваш вантаж по всій Україні та за кордон на власних авто. Наче насіння кульбаби dandel.io, що летить за вітром, наша розумна система автоматично розраховує найкращі сценарії доставки на основі ваших критеріїв за методом SAW.
                </p>
                
                <div className="hero-stats-row">
                  <div className="hero-stat-card">
                    <h3>142 <Icon name="truck" size={16} /></h3>
                    <span>Власних машин</span>
                  </div>
                  <div className="hero-stat-card">
                    <h3>99.8% <Icon name="clock" size={16} /></h3>
                    <span>Точність термінів</span>
                  </div>
                  <div className="hero-stat-card">
                    <h3><Icon name="shield" size={16} /> Безпека</h3>
                    <span>Обхід зон воєнних ризиків</span>
                  </div>
                  <div className="hero-stat-card">
                    <h3><Icon name="gift" size={16} /> 5%</h3>
                    <span>Кешбеку бонусами</span>
                  </div>
                </div>
              </div>
            </div>

            <CriteriaSelector />
          </>
        )}

        {activeTab === 'deliveries' && (
          <div className="my-deliveries-tab fade-in">
            {myDeliveries.length === 0 ? (
              <div className="glass-card empty-deliveries-card">
                <Icon name="truck" size={48} color="var(--dandel-mint)" />
                <h4>У вас ще немає створених доставок вантажу</h4>
                <p>Перейдіть на вкладку "Оформити & SAW", щоб розрахувати свій перший маршрут та запустити машину!</p>
                <button className="btn-accent" onClick={() => setActiveTab('calculate')}>Оформити першу доставку</button>
              </div>
            ) : (
              <div className="deliveries-layout">
                {/* Список замовлень */}
                <div className="deliveries-sidebar">
                  <h4 className="sidebar-title">Мої відправлення</h4>
                  <div className="deliveries-list">
                    {myDeliveries.map((del) => (
                      <div 
                        key={del.id}
                        className={`delivery-item-card glass-card ${trackedDelivery?.id === del.id ? 'active' : ''}`}
                        onClick={() => setTrackedDeliveryId(del.id)}
                      >
                        <div className="item-header">
                          <span className="item-scenario">
                            <Icon name={del.scenario === 'Експрес' ? 'zap' : del.scenario === 'Економ' ? 'leaf' : 'shield'} size={14} />
                          </span>
                          <strong>№{del.id}</strong>
                          <span className={`item-status-pill ${del.status}`}>
                            {getStatusLabel(del.status)}
                          </span>
                        </div>
                        
                        <div className="item-route-preview">
                          <span>{del.origin_city}</span>
                          <Icon name="arrow-right" size={12} />
                          <span>{del.destination_city}</span>
                        </div>

                        <div className="item-footer">
                          <span>{del.price} грн</span>
                          <span>{del.weight} кг</span>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Інтерактивний трекер замовлення з картою та симулятором */}
                <div className="delivery-tracker-main">
                  {trackedDelivery && (
                    <div className="tracker-panel glass-card">
                      <div className="tracker-header">
                        <div>
                          <h3>Карта відстеження вантажу №{trackedDelivery.id}</h3>
                          <p>Тариф: «{trackedDelivery.scenario}» | Вантаж: {trackedDelivery.cargo_name}</p>
                        </div>
                        
                        {trackedDelivery.status !== 'Delivered' && (
                          <button 
                            className="btn-primary simulate-btn"
                            onClick={() => handleSimulate(trackedDelivery.id)}
                          >
                            <Icon name="play" size={16} />
                            <span>Симулювати крок доставки</span>
                          </button>
                        )}
                      </div>

                      {/* Карта */}
                      <RouteMap 
                        origin={trackedDelivery.origin_city}
                        destination={trackedDelivery.destination_city}
                        routePoints={
                          trackedDelivery.scenario === 'Експрес'
                            ? [[50.4501, 30.5234], [49.8397, 24.0297]] // default fallback points
                            : [[50.4501, 30.5234], [49.8397, 24.0297]]
                        }
                        scenario={trackedDelivery.scenario}
                        currentLocation={
                          trackedDelivery.current_lat && trackedDelivery.current_lng
                            ? [trackedDelivery.current_lat, trackedDelivery.current_lng]
                            : null
                        }
                        status={getStatusLabel(trackedDelivery.status)}
                      />

                      {/* Шкала виконання */}
                      <div className="execution-timeline">
                        <div className="timeline-header">
                          <h5>Етапи доставки вантажу:</h5>
                          <span className="percentage-completion">{getStatusProgress(trackedDelivery.status)}%</span>
                        </div>

                        <div className="timeline-bar-wrapper">
                          <div 
                            className="timeline-bar-fill"
                            style={{ width: `${getStatusProgress(trackedDelivery.status)}%` }}
                          ></div>
                        </div>

                        <div className="timeline-points">
                          <span className={`point-label ${trackedDelivery.status === 'Created' ? 'active' : ''}`}>Створено</span>
                          <span className={`point-label ${trackedDelivery.status === 'Processing' ? 'active' : ''}`}>Склад</span>
                          <span className={`point-label ${trackedDelivery.status === 'In_Transit' ? 'active' : ''}`}>В дорозі</span>
                          {trackedDelivery.is_cross_border && (
                            <span className={`point-label ${trackedDelivery.status === 'Customs' ? 'active' : ''}`}>Митниця</span>
                          )}
                          <span className={`point-label ${trackedDelivery.status === 'Delivered' ? 'active' : ''}`}>Доставлено</span>
                        </div>
                      </div>

                      {/* Фотозвіти та деталі чекпоінту */}
                      <div className="checkpoint-photo-section">
                        <div className="section-title">
                          <Icon name="camera" size={18} color="var(--dandel-green)" />
                          <h4>Фотоконтроль безпеки вантажу dandel.io</h4>
                        </div>
                        
                        {trackedDelivery.photo_proof ? (
                          <div className="checkpoint-photo-card">
                            <img src={trackedDelivery.photo_proof} alt="Cargo Checkpoint" className="checkpoint-img" />
                            <div className="checkpoint-photo-details">
                              <span className="photo-badge">Живе фото з блокпосту / складу</span>
                              <p>Наш водій зробив знімок під час проходження точки контролю безпеки на маршруті «{trackedDelivery.origin_city} ➔ {trackedDelivery.destination_city}».</p>
                              <div className="driver-meta">
                                <strong>Водій:</strong> Олександр Вітер (Авто: Рено Трафік)
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="checkpoint-photo-empty">
                            <p>Фотоконтроль з'явиться під час переміщення вантажівки в дорозі (натисніть кнопку "Симулювати крок доставки").</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <DashboardContent />
    </AppProvider>
  );
}
