import React, { useState } from 'react';
import Icon from '../common/Icon';
import RouteMap from '../Map/RouteMap';
import { useApp } from '../../context/AppContext';

export const CustomerDeliveries: React.FC = () => {
  const { myDeliveries, simulateStep } = useApp();
  const [trackedDeliveryId, setTrackedDeliveryId] = useState<number | null>(null);

  const trackedDelivery = myDeliveries.find(d => d.id === trackedDeliveryId);

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      'Created': 'Створено',
      'Processing': 'Сортувальний центр',
      'In_Transit': 'В дорозі',
      'Customs': 'Митний контроль',
      'Delivered': 'Доставлено',
      'Cancelled': 'Скасовано'
    };
    return map[status] || status;
  };

  const getStatusProgress = (status: string) => {
    const map: Record<string, number> = {
      'Created': 10,
      'Processing': 30,
      'In_Transit': 60,
      'Customs': 80,
      'Delivered': 100,
      'Cancelled': 100
    };
    return map[status] || 0;
  };

  const handleSimulate = async (id: number) => {
    await simulateStep(id);
  };

  if (myDeliveries.length === 0) {
    return (
      <div className="glass-card empty-deliveries-card" style={{ marginTop: '20px', padding: '40px', textAlign: 'center' }}>
        <Icon name="truck" size={48} color="var(--dandel-mint)" />
        <h4>У вас ще немає створених доставок вантажу</h4>
        <p>Перейдіть на головну сторінку або натисніть "Оформити доставку", щоб створити своє перше відправлення.</p>
      </div>
    );
  }

  return (
    <div className="deliveries-layout" style={{ marginTop: '20px' }}>
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

      <div className="delivery-tracker-main">
        {trackedDelivery ? (
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

            <RouteMap 
              origin={trackedDelivery.origin_city}
              destination={trackedDelivery.destination_city}
              routePoints={
                trackedDelivery.route_points && trackedDelivery.route_points.length >= 2
                  ? trackedDelivery.route_points
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
        ) : (
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}>
            <div style={{ textAlign: 'center', opacity: 0.5 }}>
              <Icon name="map" size={48} />
              <p style={{ marginTop: '15px' }}>Оберіть відправлення зі списку ліворуч для перегляду деталей</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDeliveries;
