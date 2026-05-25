import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useOverlay } from '../../context/OverlayContext';
import Icon from '../common/Icon';
import './DriverPanel.css';

const DriverPanel: React.FC = () => {
  const {
    driverDeliveries,
    fetchDriverDeliveries,
    updateDriverDeliveryStatus,
    loading
  } = useApp();

  const { showAlert } = useOverlay();
  const [filterTab, setFilterTab] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    fetchDriverDeliveries();
  }, []);

  const handleStatusChange = async (deliveryId: number, currentStatus: string, isCrossBorder: boolean) => {
    let nextStatus = '';
    if (currentStatus === 'Created') nextStatus = 'Processing';
    else if (currentStatus === 'Processing') nextStatus = 'In_Transit';
    else if (currentStatus === 'In_Transit') {
      nextStatus = isCrossBorder ? 'Customs' : 'Delivered';
    } else if (currentStatus === 'Customs') nextStatus = 'Delivered';

    if (nextStatus) {
      const success = await updateDriverDeliveryStatus(deliveryId, nextStatus);
      if (success) {
        showAlert(`Статус доставки успішно оновлено на: ${getStatusLabel(nextStatus)}`);
      } else {
        showAlert('Не вдалося оновити статус доставки');
      }
    }
  };



  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Created': return 'Створено';
      case 'Processing': return 'Оформлення';
      case 'In_Transit': return 'В дорозі';
      case 'Customs': return 'Митниця';
      case 'Delivered': return 'Доставлено';
      default: return status;
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'Created': return 15;
      case 'Processing': return 40;
      case 'In_Transit': return 70;
      case 'Customs': return 85;
      case 'Delivered': return 100;
      default: return 0;
    }
  };

  const filteredDeliveries = driverDeliveries.filter(d => {
    if (filterTab === 'active') {
      return d.status !== 'Delivered' && d.status !== 'Cancelled';
    } else {
      return d.status === 'Delivered';
    }
  });

  const activeCount = driverDeliveries.filter(d => d.status !== 'Delivered' && d.status !== 'Cancelled').length;
  const completedCount = driverDeliveries.filter(d => d.status === 'Delivered').length;

  return (
    <div className="driver-panel-container fade-in">
      <div className="driver-welcome-banner glass-card">
        <div className="driver-info">
          <div className="driver-avatar-circle">
            <Icon name="truck" size={32} color="var(--dandel-green)" />
          </div>
          <div>
            <h2>Кабінет екіпажу dandel.io</h2>
            <p>Вітаємо на маршруті! Тут ви можете керувати призначеними рейсами.</p>
          </div>
        </div>
        <div className="driver-stats-summary">
          <div className="stat-box">
            <span className="stat-val">{activeCount}</span>
            <span className="stat-lbl">Активні рейси</span>
          </div>
          <div className="stat-box">
            <span className="stat-val">{completedCount}</span>
            <span className="stat-lbl">Виконано</span>
          </div>
        </div>
      </div>

      <div className="tab-filters-row">
        <button
          className={`filter-tab-btn ${filterTab === 'active' ? 'active' : ''}`}
          onClick={() => setFilterTab('active')}
        >
          <Icon name="clock" size={16} />
          <span>Активні завдання ({activeCount})</span>
        </button>
        <button
          className={`filter-tab-btn ${filterTab === 'completed' ? 'active' : ''}`}
          onClick={() => setFilterTab('completed')}
        >
          <Icon name="check-circle" size={16} />
          <span>Завершені рейси ({completedCount})</span>
        </button>
      </div>

      {loading && driverDeliveries.length === 0 ? (
        <div className="driver-loader glass-card">
          <Icon name="loader" size={48} className="spin" color="var(--dandel-green)" />
          <p>Завантаження рейсів...</p>
        </div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="driver-empty-state glass-card">
          <Icon name="package" size={64} color="rgba(255,255,255,0.15)" />
          <h3>Рейсів не знайдено</h3>
          <p>{filterTab === 'active' ? 'У вас немає активних завдань на даний момент.' : 'Історія завершених рейсів порожня.'}</p>
        </div>
      ) : (
        <div className="driver-deliveries-list">
          {filteredDeliveries.map(d => (
            <div key={d.id} className="driver-delivery-card glass-card fade-in">
              <div className="card-header">
                <span className="delivery-id">Рейс #{d.id}</span>
                <span className={`status-badge status-${d.status.toLowerCase()}`}>
                  {getStatusLabel(d.status)}
                </span>
              </div>

              <div className="route-flow">
                <div className="route-point">
                  <Icon name="map-pin" size={16} color="var(--dandel-green)" />
                  <div className="point-details">
                    <strong>{d.origin_city}</strong>
                    <span>Відправник: {d.sender_name}</span>
                  </div>
                </div>
                <div className="flow-line">
                  <div className="flow-progress" style={{ width: `${getStatusProgress(d.status)}%` }}></div>
                </div>
                <div className="route-point text-right">
                  <Icon name="navigation" size={16} color="var(--dandel-gold)" />
                  <div className="point-details">
                    <strong>{d.destination_city}</strong>
                    <span>Отримувач: {d.receiver_name}</span>
                  </div>
                </div>
              </div>

              <div className="card-details-grid">
                <div className="detail-item">
                  <span className="label">Вантаж:</span>
                  <span className="value">{d.cargo_name} ({d.cargo_type})</span>
                </div>
                <div className="detail-item">
                  <span className="label">Вага:</span>
                  <span className="value">{d.weight} кг</span>
                </div>
                <div className="detail-item">
                  <span className="label">Телефон отримувача:</span>
                  <a href={`tel:${d.receiver_phone}`} className="value phone-link">
                    <Icon name="phone" size={12} /> {d.receiver_phone}
                  </a>
                </div>
                <div className="detail-item">
                  <span className="label">Сценарій SAW:</span>
                  <span className="value scenario-val">{d.scenario}</span>
                </div>
              </div>

              {/* Зона дій водія */}
              {d.status !== 'Delivered' && (
                <div className="driver-actions-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                  <button
                    className="btn-accent action-step-btn"
                    onClick={() => handleStatusChange(d.id, d.status, d.is_cross_border)}
                    style={{
                      background: d.status === 'In_Transit' || d.status === 'Customs' ? 'linear-gradient(135deg, #00e676 0%, #00b0ff 100%)' : undefined,
                      boxShadow: d.status === 'In_Transit' || d.status === 'Customs' ? '0 4px 15px rgba(0, 230, 118, 0.3)' : undefined
                    }}
                  >
                    <Icon name={d.status === 'In_Transit' || d.status === 'Customs' ? 'check-circle' : 'truck'} size={18} />
                    <span style={{ marginLeft: '8px' }}>
                      {d.status === 'Created' && 'Почати оформлення на складі'}
                      {d.status === 'Processing' && 'Забрати вантаж та виїхати'}
                      {d.status === 'In_Transit' && (d.is_cross_border ? 'Пройти митний контроль' : 'Доставлено отримувачу (Завершити рейс)')}
                      {d.status === 'Customs' && 'Доставлено отримувачу (Завершити рейс)'}
                    </span>
                  </button>
                </div>
              )}


            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DriverPanel;
