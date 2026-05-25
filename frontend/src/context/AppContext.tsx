import React, { createContext, useState, useEffect, useContext } from 'react';

// Визначаємо інтерфейси
export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
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
  sender_address?: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address?: string;
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
  route_points?: [number, number][];
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
  full_address?: string;
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
  isCalculating: boolean;
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
    weights: { price: number; time: number; safety: number; eco: number },
    coords?: { origin: [number, number] | null; dest: [number, number] | null }
  ) => Promise<DeliveryCalculateResponse | null>;
  createDelivery: (data: any) => Promise<{ delivery: Delivery | null, password?: string }>;
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
  updateProfile: (data: any) => Promise<boolean>;
  uploadAvatar: (file: File) => Promise<boolean>;
  driverDeliveries: Delivery[];
  fetchDriverDeliveries: () => Promise<void>;
  updateDriverDeliveryStatus: (deliveryId: number, status: string) => Promise<boolean>;
  uploadDeliveryPhoto: (deliveryId: number, file: File) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Використовуємо відносні шляхи для проксі-сервера Vite (запити йдуть на /api/...)
const API_URL = import.meta.env.VITE_API_BASE_URL || '';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('dandel_token'));
  const [myDeliveries, setMyDeliveries] = useState<Delivery[]>([]);
  const [driverDeliveries, setDriverDeliveries] = useState<Delivery[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentCalculation, setCurrentCalculation] = useState<DeliveryCalculateResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
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
    } catch (e: any) {
      console.error(e);
      setError('Не вдалося зв\'язатися з бекендом. Сервер недоступний.');
      logout();
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
    } catch (e: any) {
      console.error(e);
      setError('Сервер не відповідає. Перевірте підключення.');
      setLoading(false);
      return false;
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
    } catch (e: any) {
      console.error(e);
      setError('Не вдалося з\'єднатися з сервером реєстрації.');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setMyDeliveries([]);
    setChatMessages([]);
    localStorage.removeItem('dandel_token');
  };

  const updateProfile = async (data: any) => {
    if (!token) return false;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/users/me`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setUser(await res.json());
        return true;
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Помилка при оновленні профілю');
        return false;
      }
    } catch (err: any) {
      console.error(err);
      setError('Помилка з\'єднання.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!token) return false;
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/api/users/me/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (res.ok) {
        setUser(await res.json());
        return true;
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Помилка при завантаженні аватару');
        return false;
      }
    } catch (err: any) {
      console.error(err);
      setError('Помилка з\'єднання.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const calculateDelivery = async (
    origin: string,
    dest: string,
    cargoType: string,
    weight: number,
    value: number,
    isCrossBorder: boolean,
    weights: { price: number; time: number; safety: number; eco: number },
    coords?: { origin: [number, number] | null; dest: [number, number] | null }
  ): Promise<DeliveryCalculateResponse | null> => {
    setIsCalculating(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/deliveries/calculate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          origin_city: origin,
          destination_city: dest,
          origin_lat: coords?.origin?.[0] || 50.45,
          origin_lng: coords?.origin?.[1] || 30.52,
          destination_lat: coords?.dest?.[0] || 49.83,
          destination_lng: coords?.dest?.[1] || 24.02,
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
        return data;
      } else {
        const errData = await res.json();
        setError(errData.detail || 'API помилка розрахунку');
        return null;
      }
    } catch (e: any) {
      console.error(e);
      setError('Сервер недоступний або сталася помилка. Неможливо розрахувати доставку.');
      return null;
    } finally {
      setLoading(false);
      setIsCalculating(false);
    }
  };

  const createDelivery = async (data: any): Promise<{ delivery: Delivery | null, password?: string }> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/deliveries/create`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const responseData = await res.json();
        
        // Перевіряємо чи це гостьовий запис з автореєстрацією
        if (responseData.token) {
          localStorage.setItem('dandel_token', responseData.token.access_token);
          setToken(responseData.token.access_token);
          setUser(responseData.token.user);
        }

        const newDel = responseData.delivery || responseData;
        setMyDeliveries((prev) => [newDel, ...prev]);
        
        if (token || responseData.token) {
          fetchProfile(); // оновлюємо баланс бонусів
        }
        
        setLoading(false);
        return { delivery: newDel, password: responseData.generated_password };
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Не вдалося створити замовлення');
        setLoading(false);
        return { delivery: null };
      }
    } catch (e: any) {
      console.error(e);
      setError('Сервер недоступний. Неможливо створити замовлення.');
      setLoading(false);
      return { delivery: null };
    }
  };

  const fetchMyDeliveries = async () => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/deliveries/my`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMyDeliveries(data);
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Помилка отримання замовлень');
      }
    } catch (e: any) {
      console.error(e);
      setError('Сервер недоступний. Неможливо завантажити замовлення.');
    }
  };

  const fetchChatMessages = async () => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/chat/messages`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Помилка отримання чату');
      }
    } catch (e: any) {
      console.error(e);
      setError('Сервер недоступний. Чат тимчасово не працює.');
    }
  };

  const sendChatMessage = async (content: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/chat/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        fetchChatMessages();
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Помилка відправки повідомлення');
      }
    } catch (e: any) {
      console.error(e);
      setError('Помилка відправки повідомлення. Перевірте з\'єднання.');
    }
  };

  const simulateStep = async (deliveryId: number) => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/deliveries/${deliveryId}/simulate-step`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        fetchMyDeliveries();
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Помилка симуляції статусу');
      }
    } catch (e: any) {
      console.error(e);
      setError('Помилка симуляції статусу. Сервер недоступний.');
    }
  };

  const searchCities = async (q: string): Promise<GeocodeResult[]> => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/fleet/search-city?q=${encodeURIComponent(q)}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        return await res.json();
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Помилка пошуку міст');
        return [];
      }
    } catch (e: any) {
      console.error(e);
      setError('Помилка пошуку міст. Сервер недоступний.');
      return [];
    }
  };
  
  const fetchVehicles = async (): Promise<Vehicle[]> => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/fleet/vehicles`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        return await res.json();
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Помилка отримання автопарку');
        return [];
      }
    } catch (e: any) {
      console.error(e);
      setError('Помилка отримання автопарку. Сервер недоступний.');
      return [];
    }
  };

  const addVehicle = async (data: any): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/fleet/vehicles`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json();
        setError(errData.detail || 'Помилка додавання авто');
      }
      setLoading(false);
      return res.ok;
    } catch (e: any) {
      console.error(e);
      setError('Помилка додавання авто. Сервер недоступний.');
      setLoading(false);
      return false;
    }
  };

  const removeVehicle = async (id: number): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/fleet/vehicles/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) {
        const errData = await res.json();
        setError(errData.detail || 'Помилка видалення авто');
      }
      return res.ok;
    } catch (e: any) {
      console.error(e);
      setError('Помилка видалення авто. Сервер недоступний.');
      return false;
    }
  };

  const fetchDriverDeliveries = async () => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/deliveries/driver/active`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setDriverDeliveries(data);
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Помилка отримання доставок водія');
      }
    } catch (e: any) {
      console.error(e);
      setError('Сервер недоступний. Неможливо завантажити доставки водія.');
    }
  };

  const updateDriverDeliveryStatus = async (deliveryId: number, status: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/deliveries/driver/${deliveryId}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await fetchDriverDeliveries();
        return true;
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Помилка оновлення статусу');
        return false;
      }
    } catch (e: any) {
      console.error(e);
      setError('Сервер недоступний. Помилка оновлення статусу.');
      return false;
    }
  };

  const uploadDeliveryPhoto = async (deliveryId: number, file: File): Promise<boolean> => {
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/api/deliveries/driver/${deliveryId}/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (res.ok) {
        await fetchDriverDeliveries();
        return true;
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Помилка завантаження фото');
        return false;
      }
    } catch (e: any) {
      console.error(e);
      setError('Сервер недоступний. Помилка завантаження фото.');
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
        isCalculating,
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
        removeVehicle,
        updateProfile,
        uploadAvatar,
        driverDeliveries,
        fetchDriverDeliveries,
        updateDriverDeliveryStatus,
        uploadDeliveryPhoto
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
