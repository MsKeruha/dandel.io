import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import Icon from '../common/Icon';
import './BonusSystem.css';

interface BonusTransaction {
  id: number;
  amount: number;
  description: string;
  created_at: string;
}

export const BonusSystem: React.FC = () => {
  const { user, token } = useApp();
  const [history, setHistory] = useState<BonusTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchHistory();
    } else {
      // Локальна демо-історія якщо немає підключення
      setHistory([
        {
          id: 1,
          amount: 250.0,
          description: "Вітальний бонус при реєстрації (Символ розсіювання насіння dandel.io)",
          created_at: new Date(Date.now() - 3600000 * 24).toISOString()
        }
      ]);
    }
  }, [token, user?.bonuses_balance]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/users/me/bonuses', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.warn("Бекенд недоступний. Показано локальну історію.");
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const getLoyaltyIconName = (level: string) => {
    switch (level) {
      case 'Золота кульбаба': return 'crown';
      case 'Суцвіття': return 'flower2';
      case 'Парашутик': return 'wind';
      default: return 'sprout';
    }
  };

  const getLoyaltyColor = (level: string) => {
    switch (level) {
      case 'Золота кульбаба': return 'var(--dandel-gold)';
      case 'Суцвіття': return 'var(--dandel-mint)';
      case 'Парашутик': return 'var(--dandel-green)';
      default: return 'var(--dandel-meadow-light)';
    }
  };

  // Вираховуємо відсоток прогресу до наступного рівня
  const getProgressPercentage = (balance: number) => {
    if (balance >= 500) return 100;
    if (balance >= 250) return 50 + ((balance - 250) / 250) * 50;
    if (balance >= 100) return 20 + ((balance - 100) / 150) * 30;
    return (balance / 100) * 20;
  };

  const getNextLevelInfo = (level: string, balance: number) => {
    if (level === 'Золота кульбаба') {
      return "У вас максимальний рівень! Ви справжнє Золоте Суцвіття!";
    }
    if (level === 'Суцвіття') {
      return `Потрібно накопичити ще ${Math.max(0, 500 - balance)} бонусів до рівня «Золота кульбаба»`;
    }
    if (level === 'Парашутик') {
      return `Потрібно накопичити ще ${Math.max(0, 250 - balance)} бонусів до рівня «Суцвіття»`;
    }
    return `Потрібно накопичити ще ${Math.max(0, 100 - balance)} бонусів до рівня «Парашутик»`;
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const activeBalance = user?.bonuses_balance || 0;
  const activeLevel = user?.loyalty_level || 'Насіння';

  return (
    <div className="bonus-system-container fade-in">
      <div className="bonus-grid">
        {/* Панель балансу */}
        <div className="glass-card balance-card">
          <div className="balance-header">
            <div className="balance-title">
              <Icon name="dandel-logo" size={36} color="var(--dandel-gold)" />
              <div>
                <h4>Мій баланс кульбаби</h4>
                <p>Програма лояльності dandel.io</p>
              </div>
            </div>
            <div className="level-badge" style={{ backgroundColor: `${getLoyaltyColor(activeLevel)}20`, color: getLoyaltyColor(activeLevel) }}>
              <span className="level-emoji"><Icon name={getLoyaltyIconName(activeLevel)} size={16} /></span>
              <span>{activeLevel}</span>
            </div>
          </div>

          <div className="balance-value-row">
            <h2 className="balance-value">{activeBalance} <span>бонусів</span></h2>
            <span className="rate-badge">Кешбек: 5%</span>
          </div>

          {/* Шкала прогресу */}
          <div className="progress-section">
            <div className="progress-bar-wrapper">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${getProgressPercentage(activeBalance)}%`, backgroundColor: getLoyaltyColor(activeLevel) }}
              ></div>
              
              {/* Позначки рівнів */}
              <span className="progress-marker marker-0" title="Насіння (0)"><Icon name="sprout" size={12} /></span>
              <span className="progress-marker marker-100" title="Парашутик (100)"><Icon name="wind" size={12} /></span>
              <span className="progress-marker marker-250" title="Суцвіття (250)"><Icon name="flower2" size={12} /></span>
              <span className="progress-marker marker-500" title="Золота кульбаба (500)"><Icon name="crown" size={12} /></span>
            </div>
            <div className="progress-labels">
              <span><Icon name="sprout" size={12} /> Насіння</span>
              <span><Icon name="wind" size={12} /> Парашутик</span>
              <span><Icon name="flower2" size={12} /> Суцвіття</span>
              <span><Icon name="crown" size={12} /> Кульбаба</span>
            </div>
          </div>

          <p className="next-level-text">
            <Icon name="info" size={14} />
            {getNextLevelInfo(activeLevel, activeBalance)}
          </p>
        </div>

        {/* Правила накопичення */}
        <div className="glass-card rules-card">
          <h4>Як працює бонусна програма?</h4>
          <div className="rules-list">
            <div className="rule-item">
              <span className="rule-number">1</span>
              <div>
                <h6>Оформлюйте доставки вантажу</h6>
                <p>За кожну успішну доставку ми повертаємо 5% від її вартості у вигляді накопичувальних бонусів.</p>
              </div>
            </div>

            <div className="rule-item">
              <span className="rule-number">2</span>
              <div>
                <h6>Накопичуйте та ростіть рівень</h6>
                <p>Більше відправок — вищий рівень вашої кульбаби: від крихітного Насіння до величного Золотого Суцвіття.</p>
              </div>
            </div>

            <div className="rule-item">
              <span className="rule-number">3</span>
              <div>
                <h6>Списуйте бонуси на нові замовлення</h6>
                <p>Ви можете оплатити бонусами до 50% вартості будь-якої наступної доставки. 1 бонус = 1 гривня!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Таблиця трансакцій */}
      <div className="glass-card history-card">
        <div className="history-header">
          <Icon name="history" size={20} color="var(--dandel-green)" />
          <h4>Історія бонусних операцій</h4>
        </div>

        {loading ? (
          <div className="history-loading">Завантаження трансакцій...</div>
        ) : history.length === 0 ? (
          <div className="history-empty">У вас ще немає проведених операцій. Бонуси з'являться після першої доставки!</div>
        ) : (
          <div className="table-responsive">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Дата та час</th>
                  <th>Опис операції</th>
                  <th className="text-right">Сума</th>
                </tr>
              </thead>
              <tbody>
                {history.map((tx) => {
                  const isPositive = tx.amount > 0;
                  return (
                    <tr key={tx.id}>
                      <td className="date-cell">{formatDate(tx.created_at)}</td>
                      <td className="desc-cell">{tx.description}</td>
                      <td className={`amount-cell text-right ${isPositive ? 'positive' : 'negative'}`}>
                        {isPositive ? '+' : ''}{tx.amount} грн
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default BonusSystem;
