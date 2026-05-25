import React, { useState } from 'react';
import Icon from '../common/Icon';
import RouteMap from '../Map/RouteMap';
import { useApp } from '../../context/AppContext';

export const CustomerDeliveries: React.FC = () => {
  const { myDeliveries, simulateStep } = useApp();
  const [trackedDeliveryId, setTrackedDeliveryId] = useState<number | null>(null);

  const trackedDelivery = myDeliveries.find(d => d.id === trackedDeliveryId);

  const getSafeDate = (dateString?: string) => {
    if (!dateString) return new Date();
    let ds = dateString;
    if (!ds.endsWith('Z')) ds += 'Z';
    return new Date(ds);
  };

  const getDynamicStatus = (del: any) => {
    if (del.status?.toLowerCase() === 'cancelled') return 'Cancelled';
    return del.status || 'Created';
  };

  const getDynamicLocation = (del: any) => {
    if (del.status?.toLowerCase() === 'cancelled') return null;
    if (del.current_lat && del.current_lng) return [del.current_lat, del.current_lng];

    const status = getDynamicStatus(del);
    if (status === 'Delivered') return del.route_points?.[del.route_points.length - 1] || null;
    
    const created = getSafeDate(del.created_at).getTime();
    const now = Date.now();
    const elapsedHours = (now - created) / (1000 * 60 * 60);
    const totalHours = del.duration_hours || 24;
    
    let baseProgress = Math.min(Math.max(elapsedHours / totalHours, 0), 1);
    
    // Adjust progress based on manual status override
    let progress = baseProgress;
    if (status === 'Created') progress = Math.min(baseProgress, 0.2);
    else if (status === 'Processing') progress = Math.max(0.2, Math.min(baseProgress, 0.4));
    else if (status === 'In_Transit') progress = Math.max(0.4, Math.min(baseProgress, 0.8));
    else if (status === 'Customs') progress = Math.max(0.8, Math.min(baseProgress, 0.95));
    
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
    const d = getSafeDate(dateString);
    return d.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusProgress = (status: string) => {
    const map: Record<string, number> = {
      'Created': 0,
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
                  <span><Icon name="clock" size={14} /> <strong>Очікується:</strong> {formatDateTime(new Date(getSafeDate(trackedDelivery.created_at).getTime() + (trackedDelivery.duration_hours || 24) * 60 * 60 * 1000).toISOString())}</span>
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

            <div className="delivery-details-section" style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                <div>
                    <h5 style={{ margin: '0 0 10px 0', color: 'var(--dandel-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon name="user" size={16} /> Відправник
                    </h5>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem' }}><strong>ПІБ:</strong> {trackedDelivery.sender_name}</p>
                    <p style={{ margin: '0', fontSize: '0.9rem' }}><strong>Адреса:</strong> {trackedDelivery.sender_address || trackedDelivery.origin_city}</p>
                </div>
                <div>
                    <h5 style={{ margin: '0 0 10px 0', color: 'var(--dandel-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon name="users" size={16} /> Отримувач
                    </h5>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem' }}><strong>ПІБ:</strong> {trackedDelivery.receiver_name}</p>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem' }}><strong>Телефон:</strong> {trackedDelivery.receiver_phone}</p>
                    <p style={{ margin: '0', fontSize: '0.9rem' }}><strong>Адреса:</strong> {trackedDelivery.receiver_address || trackedDelivery.destination_city}</p>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                    <h5 style={{ margin: '0 0 10px 0', color: 'var(--dandel-green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Icon name="package" size={16} /> Деталі вантажу
                    </h5>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '5px 10px', borderRadius: '8px' }}><strong>Тип:</strong> {trackedDelivery.cargo_type}</span>
                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '5px 10px', borderRadius: '8px' }}><strong>Вага:</strong> {trackedDelivery.weight} кг</span>
                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '5px 10px', borderRadius: '8px' }}><strong>Оголошена вартість:</strong> {trackedDelivery.declared_value} грн</span>
                        {trackedDelivery.escort_requested && <span style={{ background: 'rgba(217, 83, 79, 0.2)', color: '#d9534f', padding: '5px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}><Icon name="shield" size={14} /> Збройна охорона</span>}
                    </div>
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
