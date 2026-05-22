import React, { useEffect, useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useOverlay } from '../../context/OverlayContext';
import Icon from '../common/Icon';
import CustomSelect from '../common/CustomSelect';
import { AdminChatPanel } from './AdminChatPanel';
import './AdminPanel.css';

interface AdminDelivery {
  id: number;
  cargo_name: string;
  cargo_type: string;
  weight: number;
  declared_value: number;
  is_cross_border: boolean;
  origin_city: string;
  destination_city: string;
  sender_name: string;
  receiver_name: string;
  receiver_phone: string;
  scenario: string;
  escort_requested: boolean;
  status: string;
  price: number;
  duration_hours: number;
  safety_score: number;
  co2_footprint: number;
  bonuses_spent: number;
  bonuses_earned: number;
  created_at: string;
  current_lat?: number;
  current_lng?: number;
  last_updated?: string;
  active_delivery?: {
    id: number;
    cargo_name: string;
    origin_city: string;
    destination_city: string;
    status: string;
  };
}

interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  bonuses_balance: number;
  loyalty_level: string;
}

// Reusable Pagination Component
const Pagination = ({ 
  page, 
  totalPages, 
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems
}: { 
  page: number, 
  totalPages: number, 
  onPageChange: (p: number) => void,
  pageSize: number,
  onPageSizeChange: (s: number) => void,
  totalItems: number
}) => {
  return (
    <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
      <div className="page-size-selector">
        <span className="muted-text" style={{marginRight: '10px'}}>Показувати по:</span>
        <div style={{ width: '80px', display: 'inline-block', verticalAlign: 'middle' }}>
          <CustomSelect 
            value={pageSize.toString()} 
            onChange={(val) => onPageSizeChange(Number(val))} 
            options={[
              { value: '10', label: '10' },
              { value: '20', label: '20' },
              { value: '50', label: '50' }
            ]}
          />
        </div>
        <span className="muted-text" style={{marginLeft: '10px'}}>Всього: {totalItems}</span>
      </div>
      
      <div className="page-buttons" style={{ display: 'flex', gap: '5px' }}>
        <button 
          className="btn-secondary" 
          disabled={page <= 1} 
          onClick={() => onPageChange(page - 1)}
          style={{ padding: '5px 10px' }}
        >
          <Icon name="chevron-left" size={16} />
        </button>
        <span style={{ padding: '5px 15px', fontWeight: 'bold' }}>{page} / {totalPages || 1}</span>
        <button 
          className="btn-secondary" 
          disabled={page >= totalPages} 
          onClick={() => onPageChange(page + 1)}
          style={{ padding: '5px 10px' }}
        >
          <Icon name="chevron-right" size={16} />
        </button>
      </div>
    </div>
  );
};

export const AdminPanel: React.FC = () => {
  const { token } = useApp();
  const { showAlert, showConfirm } = useOverlay();
  
  const [subTab, setSubTab] = useState<'deliveries' | 'users' | 'analytics' | 'fleet' | 'chat'>('deliveries');
  const [updateMsg, setUpdateMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Deliveries State
  const [deliveries, setDeliveries] = useState<AdminDelivery[]>([]);
  const [delPage, setDelPage] = useState(1);
  const [delPageSize, setDelPageSize] = useState(10);
  const [delTotal, setDelTotal] = useState(0);
  const [delTotalPages, setDelTotalPages] = useState(0);
  const [delSearch, setDelSearch] = useState('');
  const [delSearchQuery, setDelSearchQuery] = useState('');
  const [delStatus, setDelStatus] = useState('ALL');

  // Users State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usrPage, setUsrPage] = useState(1);
  const [usrPageSize, setUsrPageSize] = useState(10);
  const [usrTotal, setUsrTotal] = useState(0);
  const [usrTotalPages, setUsrTotalPages] = useState(0);
  const [usrSearch, setUsrSearch] = useState('');
  const [usrSearchQuery, setUsrSearchQuery] = useState('');
  const [usrRole, setUsrRole] = useState('ALL');

  // Stats State
  const [stats, setStats] = useState({ totalDeliveries: 0, activeDeliveries: 0, totalBonusesPaid: 0, totalCo2Saved: 0 });

  // Fleet management states
  const { addVehicle, removeVehicle } = useApp();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [newVehicle, setNewVehicle] = useState({ plate: '', model: '', type: 'Фура', capacity_kg: 20000 });
  const [vehPage, setVehPage] = useState(1);
  const [vehPageSize, setVehPageSize] = useState(10);
  const [vehTotal, setVehTotal] = useState(0);
  const [vehTotalPages, setVehTotalPages] = useState(0);
  const [vehSearch, setVehSearch] = useState('');
  const [vehSearchQuery, setVehSearchQuery] = useState('');

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDelSearchQuery(delSearch);
      setDelPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [delSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setUsrSearchQuery(usrSearch);
      setUsrPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [usrSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setVehSearchQuery(vehSearch);
      setVehPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [vehSearch]);

  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/deliveries/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDeliveriesData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const skip = (delPage - 1) * delPageSize;
      let url = `/api/deliveries/admin/all?skip=${skip}&limit=${delPageSize}`;
      if (delSearchQuery) url += `&search=${encodeURIComponent(delSearchQuery)}`;
      if (delStatus !== 'ALL') url += `&status=${delStatus}`;
      
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.items || []);
        setDelTotal(data.total || 0);
        setDelTotalPages(data.pages || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const skip = (usrPage - 1) * usrPageSize;
      let url = `/api/users/admin/all?skip=${skip}&limit=${usrPageSize}`;
      if (usrSearchQuery) url += `&search=${encodeURIComponent(usrSearchQuery)}`;
      if (usrRole !== 'ALL') url += `&role=${usrRole}`;
      
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.items || []);
        setUsrTotal(data.total || 0);
        setUsrTotalPages(data.pages || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadFleet = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const skip = (vehPage - 1) * vehPageSize;
      let url = `/api/admin/fleet/vehicles?skip=${skip}&limit=${vehPageSize}`;
      if (vehSearchQuery) url += `&search=${encodeURIComponent(vehSearchQuery)}`;
      
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.items || []);
        setVehTotal(data.total || 0);
        setVehTotalPages(data.pages || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === 'deliveries') {
      fetchDeliveriesData();
      fetchStats();
    }
  }, [token, delPage, delPageSize, delSearchQuery, delStatus, subTab]);

  useEffect(() => {
    if (subTab === 'users') {
      fetchUsersData();
    }
  }, [token, usrPage, usrPageSize, usrSearchQuery, usrRole, subTab]);

  useEffect(() => {
    if (subTab === 'fleet') {
      loadFleet();
    }
  }, [token, vehPage, vehPageSize, vehSearchQuery, subTab]);


  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await addVehicle(newVehicle);
    if (success) {
      setUpdateMsg('Автомобіль успішно додано!');
      setNewVehicle({ plate: '', model: '', type: 'Фура', capacity_kg: 20000 });
      loadFleet();
      setTimeout(() => setUpdateMsg(''), 4000);
    }
  };

  const handleRemoveVehicle = async (id: number) => {
    if (await showConfirm('Ви впевнені, що хочете видалити цей автомобіль?')) {
      const success = await removeVehicle(id);
      if (success) {
        setUpdateMsg('Автомобіль видалено');
        loadFleet();
        setTimeout(() => setUpdateMsg(''), 4000);
      }
    }
  };

  const handleStatusChange = async (deliveryId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/deliveries/admin/${deliveryId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setUpdateMsg(`Статус замовлення №${deliveryId} успішно змінено на "${newStatus}"!`);
        setTimeout(() => setUpdateMsg(''), 4000);
        fetchDeliveriesData();
        fetchStats();
      } else {
        showAlert('Не вдалося оновити статус.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusLabelText = (status: string) => {
    switch (status) {
      case 'Created': return 'Створено';
      case 'Processing': return 'Оформлення';
      case 'In_Transit': return 'В дорозі';
      case 'Customs': return 'Митниця';
      case 'Delivered': return 'Доставлено';
      case 'Cancelled':
      case 'cancelled': return 'Скасовано';
      default: return status;
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Невідомо';
    const d = new Date(dateString);
    return d.toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="admin-panel-container fade-in">
      {/* KPI Cards */}
      <div className="admin-stats-grid">
        <div className="glass-card stat-card">
          <div className="card-icon-area blue-tint">
            <Icon name="package" size={24} />
          </div>
          <div>
            <h3>{stats.totalDeliveries}</h3>
            <span>Усього відправлень</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="card-icon-area yellow-tint">
            <Icon name="truck" size={24} />
          </div>
          <div>
            <h3>{stats.activeDeliveries}</h3>
            <span>Активні доставки</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="card-icon-area green-tint">
            <Icon name="gift" size={24} />
          </div>
          <div>
            <h3>{Math.round(stats.totalBonusesPaid)}</h3>
            <span>Виплачено бонусів</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="card-icon-area mint-tint">
            <Icon name="leaf" size={24} />
          </div>
          <div>
            <h3>{Math.round(stats.totalCo2Saved)} кг</h3>
            <span>Сэкономлено CO₂</span>
          </div>
        </div>
      </div>

      {updateMsg && (
        <div className="admin-toast-success">
          <Icon name="check-circle" size={16} />
          <span>{updateMsg}</span>
        </div>
      )}

      {/* Sub tabs navigation */}
      <div className="admin-tabs-navbar glass-card">
        <div className="sub-navbar-tabs">
          <button 
            className={`sub-tab-link ${subTab === 'deliveries' ? 'active' : ''}`}
            onClick={() => setSubTab('deliveries')}
          >
            <Icon name="truck" size={16} />
            <span>Управління доставками</span>
          </button>
          <button 
            className={`sub-tab-link ${subTab === 'users' ? 'active' : ''}`}
            onClick={() => setSubTab('users')}
          >
            <Icon name="users" size={16} />
            <span>База користувачів</span>
          </button>
          <button 
            className={`sub-tab-link ${subTab === 'fleet' ? 'active' : ''}`}
            onClick={() => setSubTab('fleet')}
          >
            <Icon name="truck" size={16} />
            <span>Управління Автопарком</span>
          </button>
          <button 
            className={`sub-tab-link ${subTab === 'chat' ? 'active' : ''}`}
            onClick={() => setSubTab('chat')}
          >
            <Icon name="message-circle" size={16} />
            <span>Чат з клієнтами</span>
          </button>
        </div>
        <button className="btn-secondary refresh-btn" onClick={() => {
          if(subTab === 'deliveries') { fetchDeliveriesData(); fetchStats(); }
          if(subTab === 'users') fetchUsersData();
          if(subTab === 'fleet') loadFleet();
        }} disabled={loading}>
          <Icon name="refresh-cw" size={14} className={loading ? 'spinning' : ''} />
          <span>Оновити дані</span>
        </button>
      </div>

      {/* Tab content */}
      <div className="admin-tab-content">
        {subTab === 'deliveries' && (
          <div className="glass-card table-wrapper fade-in">
            <div className="table-header-controls">
              <h4>Управління доставками</h4>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Пошук за ID, вантажем, містом..."
                  value={delSearch}
                  onChange={e => setDelSearch(e.target.value)}
                  className="search-input"
                />
                <div style={{ width: '180px' }}>
                  <CustomSelect
                    value={delStatus}
                    onChange={(val) => { setDelStatus(val); setDelPage(1); }}
                    options={[
                      { value: 'ALL', label: 'Всі статуси' },
                      { value: 'Created', label: 'Створено' },
                      { value: 'Processing', label: 'Оформлення' },
                      { value: 'In_Transit', label: 'В дорозі' },
                      { value: 'Customs', label: 'Митниця' },
                      { value: 'Delivered', label: 'Доставлено' }
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="table-scroll-area">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Вантаж</th>
                    <th>Відправник</th>
                    <th>Маршрут</th>
                    <th>Отримувач</th>
                    <th>Ціна</th>
                    <th>Терміни</th>
                    <th>Статус</th>
                    <th>Змінити статус</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map(del => (
                    <tr key={del.id}>
                      <td className="bold-text">#{del.id}</td>
                      <td>
                        <span className="bold-text">{del.cargo_name}</span>
                        <br />
                        <small className="muted-text">{del.weight} кг · {del.cargo_type}</small>
                      </td>
                      <td>{del.sender_name}</td>
                      <td>
                        {del.origin_city} → {del.destination_city}
                        {del.is_cross_border && <span className="badge-cross-border"><Icon name="globe" size={14} /> Міжнар.</span>}
                      </td>
                      <td>
                        {del.receiver_name}
                        <br />
                        <small className="muted-text">{del.receiver_phone}</small>
                      </td>
                      <td className="bold-text highlight-gold">{del.price} грн</td>
                      <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        <div><strong style={{ color: '#666' }}>Прийнято:</strong><br />{formatDateTime(del.created_at)}</div>
                        <div style={{ marginTop: '4px' }}><strong style={{ color: '#666' }}>Очікується:</strong><br />{formatDateTime(new Date(new Date(del.created_at || Date.now()).getTime() + (del.duration_hours || 24) * 60 * 60 * 1000).toISOString())}</div>
                      </td>
                      <td>
                        <span className={`status-pill ${del.status.toLowerCase()}`}>
                          {getStatusLabelText(del.status)}
                        </span>
                      </td>
                      <td>
                        <div style={{ width: '150px' }}>
                          <CustomSelect
                            value={del.status}
                            onChange={(val) => handleStatusChange(del.id, val)}
                            options={[
                              { value: 'Created', label: 'Створено' },
                              { value: 'Processing', label: 'Оформлення' },
                              { value: 'In_Transit', label: 'В дорозі' },
                              { value: 'Customs', label: 'Митниця' },
                              { value: 'Delivered', label: 'Доставлено' }
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {deliveries.length === 0 && (
                    <tr>
                      <td colSpan={9} className="empty-table-row">{loading ? 'Завантаження...' : 'Доставок не знайдено.'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {deliveries.length > 0 && (
              <Pagination 
                page={delPage} 
                totalPages={delTotalPages} 
                onPageChange={setDelPage} 
                pageSize={delPageSize} 
                onPageSizeChange={s => { setDelPageSize(s); setDelPage(1); }} 
                totalItems={delTotal} 
              />
            )}
          </div>
        )}

        {subTab === 'users' && (
          <div className="glass-card table-wrapper fade-in">
            <div className="table-header-controls">
              <h4>Реєстр зареєстрованих клієнтів</h4>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Пошук за ID, ПІБ, Email..."
                  value={usrSearch}
                  onChange={e => setUsrSearch(e.target.value)}
                  className="search-input"
                />
                <div style={{ width: '180px' }}>
                  <CustomSelect
                    value={usrRole}
                    onChange={(val) => { setUsrRole(val); setUsrPage(1); }}
                    options={[
                      { value: 'ALL', label: 'Всі ролі' },
                      { value: 'customer', label: 'Клієнт' },
                      { value: 'admin', label: 'Адміністратор' },
                      { value: 'driver', label: 'Водій' }
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="table-scroll-area">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Клієнт (ПІБ)</th>
                    <th>Email</th>
                    <th>Роль у системі</th>
                    <th>Баланс Бонусів</th>
                    <th>Рівень Лояльності</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="bold-text">#{u.id}</td>
                      <td className="bold-text">{u.full_name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`role-badge ${u.role}`}>
                          {u.role === 'admin' ? 'Адміністратор' : u.role === 'driver' ? 'Водій' : 'Клієнт'}
                        </span>
                      </td>
                      <td className="bold-text highlight-gold">{u.bonuses_balance} бонусів</td>
                      <td>
                        <span className="loyalty-cell">
                          <Icon 
                            name={
                              u.loyalty_level === 'Золота кульбаба' ? 'crown' : 
                              u.loyalty_level === 'Суцвіття' ? 'flower2' : 
                              u.loyalty_level === 'Парашутик' ? 'wind' : 'sprout'
                            } 
                            size={14} 
                          />
                          {u.loyalty_level}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="empty-table-row">{loading ? 'Завантаження...' : 'Користувачів не знайдено.'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {users.length > 0 && (
              <Pagination 
                page={usrPage} 
                totalPages={usrTotalPages} 
                onPageChange={setUsrPage} 
                pageSize={usrPageSize} 
                onPageSizeChange={s => { setUsrPageSize(s); setUsrPage(1); }} 
                totalItems={usrTotal} 
              />
            )}
          </div>
        )}

        {subTab === 'fleet' && (
          <div className="fleet-tab-layout fade-in">
            <div className="glass-card add-form-card mb-6">
              <div className="table-header-controls">
                <h4><Icon name="plus-circle" size={18} /> Додати новий автомобіль до парку</h4>
              </div>
              <form onSubmit={handleAddVehicle} className="fleet-form">
                <div className="input-row">
                  <div className="input-group">
                    <label>Номерний знак</label>
                    <input 
                      type="text" 
                      placeholder="AA0000BB" 
                      value={newVehicle.plate}
                      onChange={e => setNewVehicle({...newVehicle, plate: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="input-group">
                    <label>Марка та модель</label>
                    <input 
                      type="text" 
                      placeholder="Volvo FH16" 
                      value={newVehicle.model}
                      onChange={e => setNewVehicle({...newVehicle, model: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="input-group">
                    <label>Тип транспорту</label>
                    <CustomSelect 
                      value={newVehicle.type}
                      onChange={(val) => setNewVehicle({...newVehicle, type: val})}
                      options={[
                        { value: 'Фура', label: 'Фура (20т+)' },
                        { value: 'Рефрижератор', label: 'Рефрижератор' },
                        { value: 'Міні-вен', label: 'Міні-вен' },
                        { value: 'Електро-трак', label: 'Електро-трак' }
                      ]}
                    />
                  </div>
                  <div className="input-group">
                    <label>Вантажність (кг)</label>
                    <input 
                      type="number" 
                      value={newVehicle.capacity_kg}
                      onChange={e => setNewVehicle({...newVehicle, capacity_kg: parseInt(e.target.value)})}
                      required 
                    />
                  </div>
                  <button type="submit" className="btn-accent fleet-add-btn" disabled={loading}>
                    <Icon name="plus" size={16} />
                    Додати
                  </button>
                </div>
              </form>
            </div>

            <div className="glass-card table-wrapper">
              <div className="table-header-controls">
                <h4>Активний автопарк dandel.io</h4>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Пошук авто..."
                    value={vehSearch}
                    onChange={e => setVehSearch(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>
              <div className="table-scroll-area">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Номер</th>
                      <th>Модель</th>
                      <th>Тип</th>
                      <th>Вантажність</th>
                      <th>Статус</th>
                      <th>Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map(v => (
                      <tr key={v.id}>
                        <td className="bold-text">{v.plate}</td>
                        <td className="bold-text">{v.model}</td>
                        <td>{v.type}</td>
                        <td>{v.capacity_kg / 1000} т</td>
                        <td>
                          <span className={`status-pill ${v.status}`}>
                            {v.status === 'Available' ? 'Доступний' : 
                             v.status === 'In_Transit' ? 'В дорозі' : 
                             v.status === 'Maintenance' ? 'ТО' : 
                             v.status === 'Offline' ? 'Не в мережі' : v.status}
                          </span>
                          {v.active_delivery && (
                            <div style={{ fontSize: '0.75rem', marginTop: '4px', color: '#666' }}>
                              <Icon name="package" size={12} /> {v.active_delivery.cargo_name} ({v.active_delivery.origin_city} - {v.active_delivery.destination_city})
                            </div>
                          )}
                        </td>
                        <td>
                          <button 
                            className="btn-secondary danger-hover"
                            onClick={() => handleRemoveVehicle(v.id)}
                            title="Видалити авто"
                          >
                            <Icon name="trash-2" size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {vehicles.length === 0 && (
                      <tr>
                        <td colSpan={6} className="empty-table-row">Автопарк поки що порожній.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {vehicles.length > 0 && (
                <Pagination 
                  page={vehPage} 
                  totalPages={vehTotalPages} 
                  onPageChange={setVehPage} 
                  pageSize={vehPageSize} 
                  onPageSizeChange={s => { setVehPageSize(s); setVehPage(1); }} 
                  totalItems={vehTotal} 
                />
              )}
            </div>
          </div>
        )}

        {subTab === 'chat' && (
          <AdminChatPanel />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
