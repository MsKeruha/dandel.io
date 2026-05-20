import React, { createContext, useState, useEffect, useContext } from 'react';

// Визначаємо інтерфейси
export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  bonuses_balance: number;
  loyalty_level: string;
}

export interface ScenarioDetails {
  scenario: string;
  price: number;
  duration_hours: number;
  safety_score: number;
  co2_footprint: number;
  escort_available: boolean;
  description: string;
  route_points: [number, number][];
  saw_score: number;
}

export interface DeliveryCalculateResponse {
  origin: string;
  destination: string;
  scenarios: ScenarioDetails[];
  recommended_scenario: string;
}

export interface Delivery {
  id: number;
  sender_id: number;
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
  photo_proof: string | null;
  status: string;
  current_lat: number | null;
  current_lng: number | null;
  price: number;
  duration_hours: number;
  safety_score: number;
  co2_footprint: number;
  bonuses_spent: number;
  bonuses_earned: number;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  user_id: number;
  sender_type: string;
  content: string;
  created_at: string;
}

export interface Vehicle {
  id: number;
  plate: string;
  model: string;
  type: string;
  capacity_kg: number;
  status: string;
  current_lat: number | null;
  current_lng: number | null;
  last_updated: string;
}

export interface GeocodeResult {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
}

interface AppContextType {
  user: User | null;
  token: string | null;
  myDeliveries: Delivery[];
  chatMessages: ChatMessage[];
  currentCalculation: DeliveryCalculateResponse | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, fullName: string, password: string) => Promise<boolean>;
  logout: () => void;
  calculateDelivery: (
    origin: string,
    dest: string,
    cargoType: string,
    weight: number,
    value: number,
    isCrossBorder: boolean,
    weights: { price: number; time: number; safety: number; eco: number }
  ) => Promise<void>;
  createDelivery: (data: any) => Promise<Delivery | null>;
  fetchMyDeliveries: () => Promise<void>;
  fetchChatMessages: () => Promise<void>;
  sendChatMessage: (content: string) => Promise<void>;
  simulateStep: (deliveryId: number) => Promise<void>;
  clearError: () => void;
  
  // Нові функції для адмінки та геокодування
  searchCities: (q: string) => Promise<GeocodeResult[]>;
  fetchVehicles: () => Promise<Vehicle[]>;
  addVehicle: (data: any) => Promise<boolean>;
  removeVehicle: (id: number) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Використовуємо відносні шляхи для проксі-сервера Vite (запити йдуть на /api/...)
const API_URL = import.meta.env.VITE_API_BASE_URL || '';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('dandel_token'));
  const [myDeliveries, setMyDeliveries] = useState<Delivery[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentCalculation, setCurrentCalculation] = useState<DeliveryCalculateResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Створюємо заголовки для запитів з JWT токеном
  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const clearError = () => setError(null);

  // Автоматичне отримання профілю користувача за наявності токена
  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setUser(null);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/me`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        logout();
      }
    } catch (e) {
      console.error('Не вдалося зв\'язатися з бекендом. Перемикання в демо-режим.');
      // Демо-користувач за замовчуванням для фронтенду без запущеного бекенду
      setUser({
        id: 1,
        email: 'test@dandel.io',
        full_name: 'Костянтин Кульбаба',
        role: 'customer',
        bonuses_balance: 250.0,
        loyalty_level: 'Парашутик'
      });
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('dandel_token', data.access_token);
        setToken(data.access_token);
        setUser(data.user);
        setLoading(false);
        return true;
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Неправильний email або пароль');
        setLoading(false);
        return false;
      }
    } catch (e) {
      console.warn('Сервер не відповідає. Вхід у локальний демо-режим.');
      // Локальний демо-вхід для демонстрації
      const mockUser = {
        id: 1,
        email: email,
        full_name: 'Костянтин Кульбаба',
        role: 'customer',
        bonuses_balance: 250.0,
        loyalty_level: 'Парашутик'
      };
      setUser(mockUser);
      setToken('mock-token-dandelion');
      localStorage.setItem('dandel_token', 'mock-token-dandelion');
      setLoading(false);
      return true;
    }
  };

  const register = async (email: string, fullName: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: fullName, password }),
      });
      
      if (res.ok) {
        setLoading(false);
        return true;
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Помилка при реєстрації');
        setLoading(false);
        return false;
      }
    } catch (e) {
      setError('Не вдалося з\'єднатися з сервером реєстрації.');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('dandel_token');
    setToken(null);
    setUser(null);
    setMyDeliveries([]);
    setChatMessages([]);
    setCurrentCalculation(null);
  };

  const calculateDelivery = async (
    origin: string,
    dest: string,
    cargoType: string,
    weight: number,
    value: number,
    isCrossBorder: boolean,
    weights: { price: number; time: number; safety: number; eco: number }
  ) => {
    setLoading(true);
    setError(null);

    // Локальний SAW-розрахунок (використовується як fallback)
    const runLocalCalculation = () => {
      const CITIES_COORDS: Record<string, [number, number]> = {
        'Київ': [50.4501, 30.5234], 'Львів': [49.8397, 24.0297],
        'Одеса': [46.4825, 30.7233], 'Харків': [49.9935, 36.2304],
        'Дніпро': [48.4647, 35.0462], 'Варшава': [52.2297, 21.0122],
        'Берлін': [52.5200, 13.4050], 'Прага': [50.0755, 14.4378]
      };
      const start = CITIES_COORDS[origin] || [50.45, 30.52];
      const end = CITIES_COORDS[dest] || [49.83, 24.02];
      const dist = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2)) * 100;

      const expPrice = 500 + dist * 18 + weight * 40;
      const econPrice = 150 + dist * 4.5 + weight * 12;
      const safePrice = 300 + dist * 10 + weight * 22;

      // SAW: зважена сума за критеріями
      const calcSaw = (price: number, hours: number, safety: number, co2: number) => {
        const maxPrice = Math.max(expPrice, econPrice, safePrice);
        const maxHours = Math.max(dist / 85, dist / 40 + 12, dist / 55 + 2);
        return (
          weights.price * (1 - price / maxPrice) +
          weights.time * (1 - hours / maxHours) +
          weights.safety * (safety / 10) +
          weights.eco * (1 - co2 / (dist * 0.42 + 1))
        );
      };

      const scenarios: ScenarioDetails[] = [
        {
          scenario: 'Експрес',
          price: Math.round(expPrice),
          duration_hours: Math.round(dist / 85),
          safety_score: 8.5,
          co2_footprint: Math.round(dist * 0.42),
          escort_available: false,
          description: 'Швидка кур\'єрська доставка прямим сполученням.',
          route_points: [start, [(start[0]+end[0])/2+0.1, (start[1]+end[1])/2+0.1], end],
          saw_score: Math.round(calcSaw(expPrice, dist/85, 8.5, dist*0.42) * 100) / 100
        },
        {
          scenario: 'Економ',
          price: Math.round(econPrice),
          duration_hours: Math.round(dist / 40 + 12),
          safety_score: 7.0,
          co2_footprint: Math.round(dist * 0.11),
          escort_available: false,
          description: 'Вигідна доставка збірного вантажу через сортувальні центри.',
          route_points: [start, [(start[0]+end[0])/2+0.4, (start[1]+end[1])/2-0.5], end],
          saw_score: Math.round(calcSaw(econPrice, dist/40+12, 7.0, dist*0.11) * 100) / 100
        },
        {
          scenario: 'Безпечний',
          price: Math.round(safePrice),
          duration_hours: Math.round(dist / 55 + 2),
          safety_score: 9.8,
          co2_footprint: Math.round(dist * 0.21),
          escort_available: true,
          description: 'Маршрут в обхід воєнних ризиків. Додано фотозвіти на контрольних пунктах.',
          route_points: [start, [(start[0]+end[0])/2-0.3, (start[1]+end[1])/2+0.3], end],
          saw_score: Math.round(calcSaw(safePrice, dist/55+2, 9.8, dist*0.21) * 100) / 100
        }
      ];

      const sorted = scenarios.sort((a, b) => b.saw_score - a.saw_score);
      setCurrentCalculation({
        origin,
        destination: dest,
        scenarios: sorted,
        recommended_scenario: sorted[0].scenario
      });
    };

    try {
      const res = await fetch(`${API_URL}/api/deliveries/calculate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          origin_city: origin,
          destination_city: dest,
          cargo_type: cargoType,
          weight,
          declared_value: value,
          is_cross_border: isCrossBorder,
          price_weight: weights.price,
          time_weight: weights.time,
          safety_weight: weights.safety,
          eco_weight: weights.eco
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentCalculation(data);
      } else {
        // Бекенд недоступний або повернув помилку — використовуємо локальний SAW
        console.warn('API помилка розрахунку, перемикання на локальний SAW.');
        runLocalCalculation();
      }
    } catch (e) {
      console.warn('Сервер недоступний. Використовуються локальні алгоритми МКВ.');
      runLocalCalculation();
    } finally {
      setLoading(false);
    }
  };

  const createDelivery = async (data: any): Promise<Delivery | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/deliveries/create`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const newDel = await res.json();
        setMyDeliveries((prev) => [newDel, ...prev]);
        fetchProfile(); // оновлюємо баланс бонусів
        setLoading(false);
        return newDel;
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Не вдалося створити замовлення');
        setLoading(false);
        return null;
      }
    } catch (e) {
      console.warn('Сервер недоступний. Створення замовлення локально.');
      // Створення демо-замовлення локально
      const mockDel: Delivery = {
        id: Math.floor(Math.random() * 100000),
        sender_id: user?.id || 1,
        cargo_name: data.cargo_name,
        cargo_type: data.cargo_type,
        weight: data.weight,
        declared_value: data.declared_value,
        is_cross_border: data.is_cross_border,
        origin_city: data.origin_city,
        destination_city: data.destination_city,
        sender_name: data.sender_name,
        receiver_name: data.receiver_name,
        receiver_phone: data.receiver_phone,
        scenario: data.scenario,
        escort_requested: data.escort_requested || false,
        photo_proof: null,
        status: 'Created',
        current_lat: 50.4501,
        current_lng: 30.5234,
        price: data.scenario === 'Експрес' ? 850 : data.scenario === 'Економ' ? 320 : 540,
        duration_hours: data.scenario === 'Експрес' ? 5 : data.scenario === 'Економ' ? 24 : 12,
        safety_score: data.scenario === 'Експрес' ? 8.5 : data.scenario === 'Економ' ? 7.0 : 9.8,
        co2_footprint: data.scenario === 'Експрес' ? 120 : data.scenario === 'Економ' ? 35 : 60,
        bonuses_spent: data.use_bonuses ? 50 : 0,
        bonuses_earned: 25,
        created_at: new Date().toISOString()
      };
      
      setMyDeliveries((prev) => [mockDel, ...prev]);
      if (user) {
        setUser({
          ...user,
          bonuses_balance: user.bonuses_balance - (data.use_bonuses ? 50 : 0) + 25
        });
      }
      setLoading(false);
      return mockDel;
    }
  };

  const fetchMyDeliveries = async () => {
    try {
      const res = await fetch(`${API_URL}/api/deliveries/my`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMyDeliveries(data);
      }
    } catch (e) {
      console.warn('Сервер недоступний. Використовуються демонстраційні доставки.');
      if (myDeliveries.length === 0) {
        setMyDeliveries([
          {
            id: 87491,
            sender_id: 1,
            cargo_name: 'Подарунковий бокс',
            cargo_type: 'Стандартний',
            weight: 3.5,
            declared_value: 2000,
            is_cross_border: false,
            origin_city: 'Львів',
            destination_city: 'Київ',
            sender_name: 'Костянтин Кульбаба',
            receiver_name: 'Марія Вітер',
            receiver_phone: '+380671234567',
            scenario: 'Безпечний',
            escort_requested: false,
            photo_proof: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
            status: 'In_Transit',
            current_lat: 50.1234,
            current_lng: 27.2345,
            price: 450,
            duration_hours: 10,
            safety_score: 9.8,
            co2_footprint: 22,
            bonuses_spent: 0,
            bonuses_earned: 22.5,
            created_at: new Date(Date.now() - 3600000 * 4).toISOString()
          }
        ]);
      }
    }
  };

  const fetchChatMessages = async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/messages`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
      }
    } catch (e) {
      console.warn('Сервер недоступний. Завантаження чату в демо-режимі.');
      if (chatMessages.length === 0) {
        setChatMessages([
          {
            id: 1,
            user_id: 1,
            sender_type: 'support',
            content: 'Вітаємо у dandel.io, Костянтин! Я твій логістичний помічник. Як я можу допомогти обрати маршрут чи проконсультувати щодо безпеки під час війни?',
            created_at: new Date(Date.now() - 3600000).toISOString()
          }
        ]);
      }
    }
  };

  const sendChatMessage = async (content: string) => {
    try {
      const res = await fetch(`${API_URL}/api/chat/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        fetchChatMessages();
      }
    } catch (e) {
      console.warn('Сервер недоступний. Обробка повідомлень локально.');
      const userMsg: ChatMessage = {
        id: Math.floor(Math.random() * 1000),
        user_id: 1,
        sender_type: 'customer',
        content,
        created_at: new Date().toISOString()
      };
      
      setChatMessages((prev) => [...prev, userMsg]);
      
      // Імітуємо швидку відповідь бота
      setTimeout(() => {
        let reply = "Дякую за запитання! Ваше звернення вже передано менеджерам dandel.io.";
        const text = content.toLowerCase();
        if (text.includes('цін') || text.includes('дорого') || text.includes('дешев')) {
          reply = "Розрахувати найкращу ціну ви можете в калькуляторі SAW на головній сторінці! Наш економ-варіант дозволяє доставити вантаж максимально ощадливо.";
        } else if (text.includes('безпек') || text.includes('війн') || text.includes('охорон')) {
          reply = "Для максимального спокою під час війни оберіть тариф 'Безпечний Шлях'. Він прокладає коридори через найменш ризиковані траси та надає озброєний супровід!";
        } else if (text.includes('бонус') || text.includes('знижк')) {
          reply = "За кожне замовлення ви отримуєте 5% бонусів, якими можна оплатити наступні відправки. На вашому балансі вже є бонуси!";
        }
        
        const botMsg: ChatMessage = {
          id: Math.floor(Math.random() * 1000) + 1,
          user_id: 1,
          sender_type: 'support',
          content: reply,
          created_at: new Date().toISOString()
        };
        setChatMessages((prev) => [...prev, botMsg]);
      }, 800);
    }
  };

  const simulateStep = async (deliveryId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/deliveries/${deliveryId}/simulate-step`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        fetchMyDeliveries();
      }
    } catch (e) {
      console.warn('Сервер недоступний. Симуляція статусу локально.');
      setMyDeliveries((prev) =>
        prev.map((d) => {
          if (d.id === deliveryId) {
            const flows = ['Created', 'Processing', 'In_Transit', 'Delivered'];
            const curIdx = flows.indexOf(d.status);
            const nextIdx = (curIdx + 1) % flows.length;
            const nextStatus = flows[nextIdx];
            
            // Симулюємо переміщення координат
            const CITIES_COORDS: Record<string, [number, number]> = {
              'Київ': [50.4501, 30.5234], 'Львів': [49.8397, 24.0297],
              'Одеса': [46.4825, 30.7233], 'Харків': [49.9935, 36.2304],
              'Дніпро': [48.4647, 35.0462]
            };
            const start = CITIES_COORDS[d.origin_city] || [50.45, 30.52];
            const end = CITIES_COORDS[d.destination_city] || [49.83, 24.02];
            const progress = nextIdx / (flows.length - 1);
            
            return {
              ...d,
              status: nextStatus,
              current_lat: start[0] + (end[0] - start[0]) * progress,
              current_lng: start[1] + (end[1] - start[1]) * progress,
              photo_proof: nextStatus === 'In_Transit' 
                ? 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80' 
                : nextStatus === 'Delivered' 
                  ? 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80' 
                  : d.photo_proof
            };
          }
          return d;
        })
      );
    }
  };

  const searchCities = async (q: string): Promise<GeocodeResult[]> => {
    try {
      const res = await fetch(`${API_URL}/api/admin/fleet/search-city?q=${encodeURIComponent(q)}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch (e) {
      return [];
    }
  };

  const fetchVehicles = async (): Promise<Vehicle[]> => {
    try {
      const res = await fetch(`${API_URL}/api/admin/fleet/vehicles`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch (e) {
      return [];
    }
  };

  const addVehicle = async (data: any): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/fleet/vehicles`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      setLoading(false);
      return res.ok;
    } catch (e) {
      setLoading(false);
      return false;
    }
  };

  const removeVehicle = async (id: number): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/api/admin/fleet/vehicles/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        myDeliveries,
        chatMessages,
        currentCalculation,
        loading,
        error,
        login,
        register,
        logout,
        calculateDelivery,
        createDelivery,
        fetchMyDeliveries,
        fetchChatMessages,
        sendChatMessage,
        simulateStep,
        clearError,
        searchCities,
        fetchVehicles,
        addVehicle,
        removeVehicle
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
