import React, { useState } from 'react';
import Icon from '../common/Icon';
import RouteMap from '../Map/RouteMap';
import { useApp } from '../../context/AppContext';

export const CustomerDeliveries: React.FC = () => {
  const { myDeliveries, simulateStep } = useApp();
  const [trackedDeliveryId, setTrackedDeliveryId] = useState<number | null>(null);

  const trackedDelivery = myDeliveries.find(d => d.id === trackedDeliveryId);

  const getDynamicStatus = (del: any) => {
    if (del.status?.toLowerCase() === 'cancelled') return 'Cancelled';
    
    const created = new Date(del.created_at || Date.now()).getTime();
    const now = Date.now();
    const elapsedHours = (now - created) / (1000 * 60 * 60);
    const totalHours = del.duration_hours || 24;
    
    if (elapsedHours >= totalHours) return 'Delivered';
    if (elapsedHours >= totalHours * 0.8 && del.is_cross_border) return 'Customs';
    if (elapsedHours >= totalHours * 0.3) return 'In_Transit';
    if (elapsedHours >= totalHours * 0.1) return 'Processing';
    return 'Created';
  };

  const getDynamicLocation = (del: any) => {
    if (del.status?.toLowerCase() === 'cancelled') return null;
    const status = getDynamicStatus(del);
    if (status === 'Delivered') return del.route_points?.[del.route_points.length - 1] || null;
    
    const created = new Date(del.created_at || Date.now()).getTime();
    const now = Date.now();
    const elapsedHours = (now - created) / (1000 * 60 * 60);
    const totalHours = del.duration_hours || 24;
    
    const progress = Math.min(Math.max(elapsedHours / totalHours, 0), 1);
    
    if (progress === 0 || !del.route_points || del.route_points.length < 2) return null;
    
    const points = del.route_points;
    const totalSegments = points.length - 1;
    const exactIndex = progress * totalSegments;
    const floorIndex = Math.floor(exactIndex);
    const remainder = exactIndex - floorIndex;
    
    if (floorIndex >= totalSegments) return points[totalSegments];
    
    const p1 = points[floorIndex];
    const p2 = points[floorIndex + 1];
    
    return [
      p1[0] + (p2[0] - p1[0]) * remainder,
      p1[1] + (p2[1] - p1[1]) * remainder
    ];
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      'Created': 'Створено',
      'Processing': 'Сортувальний центр',
      'In_Transit': 'В дорозі',
      'Customs': 'Митний контроль',
      'Delivered': 'Доставлено',
      'Cancelled': 'Скасовано',
      'cancelled': 'Скасовано'
    };
    return map[status] || status;
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Невідомо';
    const d = new Date(dateString);
    return d.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
          {myDeliveries.map((del) => {
            const dynamicStatus = getDynamicStatus(del);
            return (
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
                <span className={`item-status-pill ${dynamicStatus}`}>
                  {getStatusLabel(dynamicStatus)}
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
            );
          })}
        </div>
      </div>

      <div className="delivery-tracker-main">
        {trackedDelivery ? (
          <div className="tracker-panel glass-card">
            <div className="tracker-header">
              <div>
                <h3>Карта відстеження вантажу №{trackedDelivery.id}</h3>
                <p>Тариф: «{trackedDelivery.scenario}» | Вантаж: {trackedDelivery.cargo_name}</p>
                <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#666', display: 'flex', gap: '2rem' }}>
                  <span><Icon name="calendar" size={14} /> <strong>Прийнято:</strong> {formatDateTime(trackedDelivery.created_at)}</span>
                  <span><Icon name="clock" size={14} /> <strong>Очікується:</strong> {formatDateTime(new Date(new Date(trackedDelivery.created_at || Date.now()).getTime() + (trackedDelivery.duration_hours || 24) * 60 * 60 * 1000).toISOString())}</span>
                </div>
              </div>
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
              currentLocation={getDynamicLocation(trackedDelivery)}
              status={getStatusLabel(getDynamicStatus(trackedDelivery))}
            />

            <div className="execution-timeline">
              <div className="timeline-header">
                <h5>Етапи доставки вантажу:</h5>
                <span className="percentage-completion">{getStatusProgress(getDynamicStatus(trackedDelivery))}%</span>
              </div>

              <div className="timeline-bar-wrapper">
                <div 
                  className="timeline-bar-fill"
                  style={{ width: `${getStatusProgress(getDynamicStatus(trackedDelivery))}%` }}
                ></div>
              </div>

              <div className="timeline-points">
                <span className={`point-label ${getDynamicStatus(trackedDelivery) === 'Created' ? 'active' : ''}`}>Створено</span>
                <span className={`point-label ${getDynamicStatus(trackedDelivery) === 'Processing' ? 'active' : ''}`}>Склад</span>
                <span className={`point-label ${getDynamicStatus(trackedDelivery) === 'In_Transit' ? 'active' : ''}`}>В дорозі</span>
                {trackedDelivery.is_cross_border && (
                  <span className={`point-label ${getDynamicStatus(trackedDelivery) === 'Customs' ? 'active' : ''}`}>Митниця</span>
                )}
                <span className={`point-label ${getDynamicStatus(trackedDelivery) === 'Delivered' ? 'active' : ''}`}>Доставлено</span>
              </div>
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
