import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import Icon from '../common/Icon';
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
}

interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  bonuses_balance: number;
  loyalty_level: string;
}

export const AdminPanel: React.FC = () => {
  const { token } = useApp();
  const [deliveries, setDeliveries] = useState<AdminDelivery[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [subTab, setSubTab] = useState<'deliveries' | 'users' | 'analytics' | 'fleet'>('deliveries');
  const [updateMsg, setUpdateMsg] = useState('');

  // Fleet management states
  const { fetchVehicles, addVehicle, removeVehicle } = useApp();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [newVehicle, setNewVehicle] = useState({ plate: '', model: '', type: 'Фура', capacity_kg: 20000 });

  const fetchAdminData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Fetch deliveries
      const delRes = await fetch('/api/deliveries/admin/all', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (delRes.ok) {
        const delData = await delRes.json();
        setDeliveries(delData);
      }

      // Fetch users
      const userRes = await fetch('/api/users/admin/all', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsers(userData);
      }

      // Fetch vehicles
      const vehicleData = await fetchVehicles();
      setVehicles(vehicleData);
    } catch (e) {
      console.error("Error fetching admin dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await addVehicle(newVehicle);
    if (success) {
      setUpdateMsg('Автомобіль успішно додано!');
      setNewVehicle({ plate: '', model: '', type: 'Фура', capacity_kg: 20000 });
      fetchAdminData();
      setTimeout(() => setUpdateMsg(''), 4000);
    }
  };

  const handleRemoveVehicle = async (id: number) => {
    if (window.confirm('Ви впевнені, що хочете видалити цей автомобіль?')) {
      const success = await removeVehicle(id);
      if (success) {
        setUpdateMsg('Автомобіль видалено');
        fetchAdminData();
        setTimeout(() => setUpdateMsg(''), 4000);
      }
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

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
        fetchAdminData();
      } else {
        alert('Не вдалося оновити статус.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Analytics helper metrics
  const totalDeliveries = deliveries.length;
  const activeDeliveries = deliveries.filter(d => d.status !== 'Delivered').length;
  const totalBonusesPaid = deliveries.reduce((acc, d) => acc + d.bonuses_earned, 0);
  const totalCo2Saved = deliveries.reduce((acc, d) => {
    // Економ зберігає більше CO2 порівняно з Експрес
    const baseCo2 = d.weight * 0.42; 
    return acc + Math.max(0, baseCo2 - d.co2_footprint);
  }, 0);

  // Filters and searches
  const filteredDeliveries = deliveries.filter(del => {
    const matchesSearch = 
      del.id.toString().includes(searchTerm) ||
      del.cargo_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      del.sender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      del.receiver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      del.origin_city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      del.destination_city.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || del.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusLabelText = (status: string) => {
    switch (status) {
      case 'Created': return 'Створено';
      case 'Processing': return 'Оформлення';
      case 'In_Transit': return 'В дорозі';
      case 'Customs': return 'Митниця';
      case 'Delivered': return 'Доставлено';
      default: return status;
    }
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
            <h3>{totalDeliveries}</h3>
            <span>Усього відправлень</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="card-icon-area yellow-tint">
            <Icon name="truck" size={24} />
          </div>
          <div>
            <h3>{activeDeliveries}</h3>
            <span>Активні доставки</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="card-icon-area green-tint">
            <Icon name="gift" size={24} />
          </div>
          <div>
            <h3>{Math.round(totalBonusesPaid)}</h3>
            <span>Виплачено бонусів</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="card-icon-area mint-tint">
            <Icon name="leaf" size={24} />
          </div>
          <div>
            <h3>{Math.round(totalCo2Saved)} кг</h3>
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
            <Icon name="activity" size={16} />
            <span>Управління Автопарком</span>
          </button>
        </div>
        <button className="btn-secondary refresh-btn" onClick={fetchAdminData} disabled={loading}>
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
              <div className="table-filters">
                <input
                  type="text"
                  placeholder="Пошук за ID, вантажем, містом..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="status-filter-select"
                >
                  <option value="ALL">Всі статуси</option>
                  <option value="Created">Створено</option>
                  <option value="Processing">Оформлення</option>
                  <option value="In_Transit">В дорозі</option>
                  <option value="Customs">Митниця</option>
                  <option value="Delivered">Доставлено</option>
                </select>
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
                    <th>Статус</th>
                    <th>Змінити статус</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeliveries.map(del => (
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
                        {del.is_cross_border && <span className="badge-cross-border">🌍 Міжнар.</span>}
                      </td>
                      <td>
                        {del.receiver_name}
                        <br />
                        <small className="muted-text">{del.receiver_phone}</small>
                      </td>
                      <td className="bold-text highlight-gold">{del.price} грн</td>
                      <td>
                        <span className={`status-pill ${del.status}`}>
                          {getStatusLabelText(del.status)}
                        </span>
                      </td>
                      <td>
                        <select
                          value={del.status}
                          onChange={e => handleStatusChange(del.id, e.target.value)}
                          className="status-change-select"
                        >
                          <option value="Created">Створено</option>
                          <option value="Processing">Оформлення</option>
                          <option value="In_Transit">В дорозі</option>
                          <option value="Customs">Митниця</option>
                          <option value="Delivered">Доставлено</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {filteredDeliveries.length === 0 && (
                    <tr>
                      <td colSpan={8} className="empty-table-row">Доставок не знайдено.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {subTab === 'users' && (
          <div className="glass-card table-wrapper fade-in">
            <div className="table-header-controls">
              <h4>Реєстр зареєстрованих клієнтів</h4>
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
                </tbody>
              </table>
            </div>
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
                    <select 
                      value={newVehicle.type}
                      onChange={e => setNewVehicle({...newVehicle, type: e.target.value})}
                    >
                      <option value="Фура">Фура (20т+)</option>
                      <option value="Рефрижератор">Рефрижератор</option>
                      <option value="Міні-вен">Міні-вен</option>
                      <option value="Електро-трак">Електро-трак</option>
                    </select>
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
                            {v.status === 'Available' ? 'Доступний' : v.status}
                          </span>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
