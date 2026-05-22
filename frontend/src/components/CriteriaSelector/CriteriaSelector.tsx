import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useOverlay } from '../../context/OverlayContext';
import type { GeocodeResult } from '../../context/AppContext';
import Icon from '../common/Icon';
import CustomSelect from '../common/CustomSelect';
import RouteMap from '../Map/RouteMap';
import './CriteriaSelector.css';

export const CriteriaSelector: React.FC = () => {
  const { 
    currentCalculation, 
    calculateDelivery, 
    createDelivery, 
    searchCities,
    user, 
    loading, 
    error 
  } = useApp();

  const { showAlert } = useOverlay();

  // Форма розрахунку
  const [origin, setOrigin] = useState('Львів');
  const [destination, setDestination] = useState('Київ');
  const [originCoords, setOriginCoords] = useState<[number, number] | null>([49.8397, 24.0297]);
  const [destCoords, setDestCoords] = useState<[number, number] | null>([50.4501, 30.5234]);
  const [originInput, setOriginInput] = useState('Львів');
  const [destInput, setDestInput] = useState('Київ');
  const [originSuggestions, setOriginSuggestions] = useState<GeocodeResult[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<GeocodeResult[]>([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  const originRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);

  const [cargoName, setCargoName] = useState('');
  const [cargoType, setCargoType] = useState('Стандартний');
  const [weight, setWeight] = useState<number | string>(5.0);
  const [value, setValue] = useState<number | string>(1000);
  const [isCrossBorder, setIsCrossBorder] = useState(false);

  // Ваги критеріїв для SAW
  const [priceWeight, setPriceWeight] = useState(0.25);
  const [timeWeight, setTimeWeight] = useState(0.25);
  const [safetyWeight, setSafetyWeight] = useState(0.25);
  const [ecoWeight, setEcoWeight] = useState(0.25);

  // Вибраний сценарій для оформлення
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  
  // Додаткові поля замовлення
  const [senderName, setSenderName] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [escortRequested, setEscortRequested] = useState(false);
  const [useBonuses, setUseBonuses] = useState(false);
  
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  // Закриття дропдаунів при кліку зовні
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (originRef.current && !originRef.current.contains(event.target as Node)) {
        setShowOriginDropdown(false);
      }
      if (destRef.current && !destRef.current.contains(event.target as Node)) {
        setShowDestDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Пошук міст для відправлення
  useEffect(() => {
    if (originInput.length < 2) {
      setOriginSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchCities(originInput);
      setOriginSuggestions(results);
    }, 400);
    return () => clearTimeout(timer);
  }, [originInput]);

  // Пошук міст для отримання
  useEffect(() => {
    if (destInput.length < 2) {
      setDestSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchCities(destInput);
      setDestSuggestions(results);
    }, 400);
    return () => clearTimeout(timer);
  }, [destInput]);

  // Автоматичний перерахунок транскордонності
  useEffect(() => {
    const isForeign = (origin.includes(',') || destination.includes(',') || 
                       ['Варшава', 'Берлін', 'Прага', 'London', 'Paris', 'Berlin', 'Warsaw'].some(c => origin.includes(c) || destination.includes(c)));
    setIsCrossBorder(isForeign);
  }, [origin, destination]);

  // Тригер розрахунку при зміні міст (з дебаунсом 500мс)
  useEffect(() => {
    if (origin !== destination) {
      const timer = setTimeout(() => {
        const parsedWeight = parseFloat(weight as string) || 0.1;
        const parsedValue = parseInt(value as string) || 100;

        calculateDelivery(
          origin,
          destination,
          cargoType,
          parsedWeight,
          parsedValue,
          isCrossBorder,
          { price: priceWeight, time: timeWeight, safety: safetyWeight, eco: ecoWeight },
          { origin: originCoords, dest: destCoords }
        ).then(result => {
          if (!selectedScenario && result) {
            setSelectedScenario(result.recommended_scenario);
          }
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [origin, destination, originCoords, destCoords]);

  // Окремий тригер для миттєвого перерахунку ціни (без очікування карти)
  useEffect(() => {
    if (currentCalculation) {
      const timer = setTimeout(() => {
        const parsedWeight = parseFloat(weight as string) || 0.1;
        const parsedValue = parseInt(value as string) || 100;

        calculateDelivery(
          origin,
          destination,
          cargoType,
          parsedWeight,
          parsedValue,
          isCrossBorder,
          { price: priceWeight, time: timeWeight, safety: safetyWeight, eco: ecoWeight },
          { origin: originCoords, dest: destCoords }
        ).then(result => {
          if (!selectedScenario && result) {
            setSelectedScenario(result.recommended_scenario);
          }
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [cargoType, weight, value, isCrossBorder, priceWeight, timeWeight, safetyWeight, ecoWeight]);

  // Заповнення дефолтних значень для імені відправника
  useEffect(() => {
    if (user && !senderName) {
      setSenderName(user.full_name);
    }
  }, [user]);

  const handleWeightChange = (type: string, val: number) => {
    // Встановлюємо значення ваги від 0 до 1
    if (type === 'price') setPriceWeight(val);
    if (type === 'time') setTimeWeight(val);
    if (type === 'safety') setSafetyWeight(val);
    if (type === 'eco') setEcoWeight(val);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalScenario = selectedScenario || currentCalculation?.recommended_scenario;
    
    const missingFields = [];
    if (!cargoName.trim()) missingFields.push('Назва вантажу');
    if (!senderName.trim()) missingFields.push('Відправник');
    if (!senderAddress.trim()) missingFields.push('Відділення/Адреса відправника');
    if (!receiverName.trim()) missingFields.push('Отримувач');
    if (!receiverPhone.trim()) missingFields.push('Телефон отримувача');
    if (!receiverAddress.trim()) missingFields.push('Відділення/Адреса отримувача');
    if (!finalScenario) missingFields.push('Тариф доставки');

    if (missingFields.length > 0) {
      showAlert(`Будь ласка, заповніть обов'язкові поля: ${missingFields.join(', ')}`, 'Увага');
      return;
    }

    const parsedWeight = parseFloat(weight as string) || 0.1;
    const parsedValue = parseInt(value as string) || 100;

    const payload = {
      cargo_name: cargoName,
      cargo_type: cargoType,
      weight: parsedWeight,
      declared_value: parsedValue,
      is_cross_border: isCrossBorder,
      origin_city: origin,
      destination_city: destination,
      origin_lat: originCoords ? originCoords[0] : 50.4501,
      origin_lng: originCoords ? originCoords[1] : 30.5234,
      destination_lat: destCoords ? destCoords[0] : 49.8397,
      destination_lng: destCoords ? destCoords[1] : 24.0297,
      sender_name: senderName,
      sender_address: senderAddress,
      receiver_name: receiverName,
      receiver_phone: receiverPhone,
      receiver_address: receiverAddress,
      scenario: finalScenario,
      escort_requested: finalScenario === 'Безпечний' ? escortRequested : false,
      use_bonuses: useBonuses
    };

    const result = await createDelivery(payload);
    if (result && result.delivery) {
      setOrderSuccess(true);
      if (result.password) {
        setGeneratedPassword(result.password);
      }
      setShowCheckoutModal(false);
      setSelectedScenario(null);
      setCargoName('');
      setSenderAddress('');
      setReceiverName('');
      setReceiverPhone('');
      setReceiverAddress('');
      setEscortRequested(false);
      setUseBonuses(false);
      
      // Скидання сповіщення про успіх через 8 секунд
      setTimeout(() => {
        setOrderSuccess(false);
        setGeneratedPassword(null);
      }, 8000);
    }
  };

  // Пошук деталей вибраного сценарію
  const activeScenarioDetails = currentCalculation?.scenarios.find(
    s => s.scenario === (selectedScenario || currentCalculation?.recommended_scenario)
  );

  return (
    <div className="criteria-selector-container fade-in">
      <div className="layout-grid">
        {/* Ліва панель: Введення даних та повзунки */}
        <div className="form-column">
          <div className="glass-card panel-card">
            <div className="panel-header">
              <Icon name="dandel-logo" size={32} color="var(--dandel-gold)" />
              <h3>Калькулятор мультикритеріальної доставки</h3>
            </div>

            <div className="inputs-section">
              <div className="input-row">
                <div className="input-group autocomplete-group" ref={originRef}>
                  <label><Icon name="map-pin" size={14} /> Звідки</label>
                  <div className="search-input-wrapper">
                    <input 
                      type="text" 
                      placeholder="Місто відправлення..."
                      value={originInput}
                      onChange={e => {
                        setOriginInput(e.target.value);
                        setShowOriginDropdown(true);
                      }}
                      onFocus={() => setShowOriginDropdown(true)}
                    />
                    {showOriginDropdown && originSuggestions.length > 0 && (
                      <div className="suggestions-dropdown glass-card">
                        {originSuggestions.map((item, idx) => (
                          <div 
                            key={idx} 
                            className="suggestion-item"
                            onClick={() => {
                              setOrigin(item.name);
                              setOriginInput(item.name);
                              setOriginCoords([item.lat, item.lon]);
                              setShowOriginDropdown(false);
                            }}
                          >
                            <strong>{item.name}</strong>
                            <span>{item.state ? `${item.state}, ` : ''}{item.country}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="input-group autocomplete-group" ref={destRef}>
                  <label><Icon name="flag" size={14} /> Куди</label>
                  <div className="search-input-wrapper">
                    <input 
                      type="text" 
                      placeholder="Місто доставки..."
                      value={destInput}
                      onChange={e => {
                        setDestInput(e.target.value);
                        setShowDestDropdown(true);
                      }}
                      onFocus={() => setShowDestDropdown(true)}
                    />
                    {showDestDropdown && destSuggestions.length > 0 && (
                      <div className="suggestions-dropdown glass-card">
                        {destSuggestions.map((item, idx) => (
                          <div 
                            key={idx} 
                            className="suggestion-item"
                            onClick={() => {
                              setDestination(item.name);
                              setDestInput(item.name);
                              setDestCoords([item.lat, item.lon]);
                              setShowDestDropdown(false);
                            }}
                          >
                            <strong>{item.name}</strong>
                            <span>{item.state ? `${item.state}, ` : ''}{item.country}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isCrossBorder && (
                <div className="cross-border-badge">
                  <Icon name="globe" size={16} color="var(--dandel-green)" />
                  <span>Транскордонний маршрут. Система автоматично готує митні декларації.</span>
                </div>
              )}

              <div className="input-row">
                <div className="input-group">
                  <label><Icon name="box" size={14} /> Назва вантажу</label>
                  <input 
                    type="text" 
                    placeholder="Напр. Запчастини, Одяг..." 
                    value={cargoName} 
                    onChange={e => setCargoName(e.target.value)} 
                  />
                </div>

                <div className="input-group">
                  <label><Icon name="tag" size={14} /> Тип вантажу</label>
                  <CustomSelect 
                    value={cargoType} 
                    onChange={setCargoType}
                    options={[
                      { value: 'Стандартний', label: 'Стандартний' },
                      { value: 'Крихкий', label: 'Крихкий вантаж' },
                      { value: 'Терморежим', label: 'Терморежим (Холодильник)' },
                      { value: 'Великогабаритний', label: 'Великогабаритний' }
                    ]}
                  />
                </div>
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label><Icon name="scale" size={14} /> Вага (кг)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    value={weight} 
                    onChange={e => setWeight(e.target.value)} 
                  />
                </div>

                <div className="input-group">
                  <label><Icon name="dollar-sign" size={14} /> Оголошена вартість (грн)</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={value} 
                    onChange={e => setValue(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* Секція налаштування критеріїв вибору (SAW) */}
            <div className="saw-weights-section">
              <div className="section-title">
                <Icon name="sliders" size={18} color="var(--dandel-green)" />
                <h4>Налаштуйте ваші пріоритети доставки</h4>
              </div>
              <p className="saw-instruction">Ми підберемо кращий сценарій за допомогою алгоритму SAW на основі ваших пріоритетів.</p>
              
              <div className="sliders-container">
                <div className="slider-group">
                  <div className="slider-label">
                    <span><Icon name="dollar-sign" size={14} /> Економія ціни</span>
                    <span className="weight-percent">{Math.round(priceWeight * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.05" 
                    max="1.0" 
                    step="0.05" 
                    value={priceWeight} 
                    onChange={e => handleWeightChange('price', parseFloat(e.target.value))} 
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-label">
                    <span><Icon name="zap" size={14} /> Швидкість доставки</span>
                    <span className="weight-percent">{Math.round(timeWeight * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.05" 
                    max="1.0" 
                    step="0.05" 
                    value={timeWeight} 
                    onChange={e => handleWeightChange('time', parseFloat(e.target.value))} 
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-label">
                    <span><Icon name="shield" size={14} /> Безпека вантажу</span>
                    <span className="weight-percent">{Math.round(safetyWeight * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.05" 
                    max="1.0" 
                    step="0.05" 
                    value={safetyWeight} 
                    onChange={e => handleWeightChange('safety', parseFloat(e.target.value))} 
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-label">
                    <span><Icon name="leaf" size={14} /> Екологічність (CO₂)</span>
                    <span className="weight-percent">{Math.round(ecoWeight * 100)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.05" 
                    max="1.0" 
                    step="0.05" 
                    value={ecoWeight} 
                    onChange={e => handleWeightChange('eco', parseFloat(e.target.value))} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Права панель: Результати та Оформлення */}
        <div className="results-column">
          {error && (
            <div className="error-toast">
              <Icon name="alert-triangle" size={20} color="var(--dandel-danger-text)" />
              <span>{error}</span>
            </div>
          )}

          {/* Інтерактивна карта */}
          {currentCalculation && activeScenarioDetails && (
            <RouteMap 
              origin={currentCalculation.origin}
              destination={currentCalculation.destination}
              routePoints={activeScenarioDetails.route_points}
              scenario={activeScenarioDetails.scenario}
              isCrossBorder={isCrossBorder}
              allScenarios={currentCalculation.scenarios}
            />
          )}
        </div>
      </div>

      {/* Нижня частина: Сценарії та Оформлення на повну ширину */}
      {currentCalculation && (
        <div className="delivery-options-area fade-in">
          {orderSuccess && (
            <div className="success-toast" style={{ height: generatedPassword ? 'auto' : undefined, padding: generatedPassword ? '20px' : undefined }}>
              <Icon name="check-circle" size={24} color="white" />
              <div>
                <h5>Замовлення успішно оформлено!</h5>
                <p>Ваша вантажівка готова до відправлення.</p>
                {generatedPassword && (
                  <div style={{ marginTop: '10px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                    <strong style={{ color: 'var(--dandel-gold)' }}>Увага! Ваш кабінет створено.</strong>
                    <p style={{ margin: '5px 0 0 0' }}>Тимчасовий пароль для входу: <strong style={{ fontSize: '16px', letterSpacing: '1px' }}>{generatedPassword}</strong></p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', opacity: 0.8 }}>Збережіть його. Ви можете змінити пароль у профілі.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="section-divider">
            <div className="divider-line"></div>
            <span className="divider-text">Виберіть найкращий тариф для вашого вантажу</span>
            <div className="divider-line"></div>
          </div>

          {/* Картки сценаріїв доставки - Тепер на повну ширину */}
          {/* Картки сценаріїв доставки - Тепер на повну ширину */}
          {!showCheckoutModal && (
            <div className="scenarios-grid">
              {currentCalculation.scenarios.map((scen) => {
                const isRecommended = scen.scenario === currentCalculation.recommended_scenario;
                const isSelected = selectedScenario 
                  ? scen.scenario === selectedScenario 
                  : isRecommended;

                return (
                  <div 
                    key={scen.scenario}
                    className={`scenario-card glass-card ${isSelected ? 'selected' : ''} ${isRecommended ? 'recommended' : ''}`}
                    onClick={() => setSelectedScenario(scen.scenario)}
                  >
                    {isRecommended && (
                      <div className="recommended-badge">
                        <Icon name="star" size={12} color="var(--dandel-meadow-dark)" />
                        <span>dandel.io Рекомендує</span>
                      </div>
                    )}

                    <div className="card-header-row">
                      <div className="scenario-title-area">
                        <span className="scenario-icon">
                          <Icon name={scen.scenario === 'Експрес' ? 'zap' : scen.scenario === 'Економ' ? 'leaf' : 'shield'} size={16} />
                        </span>
                        <div>
                          <h5>Тариф «{scen.scenario}»</h5>
                          <span className="saw-pill">Коефіцієнт відповідності: {scen.saw_score}</span>
                        </div>
                      </div>
                      <h4 className="scenario-price">{scen.price} грн</h4>
                    </div>

                    <p className="scenario-desc">{scen.description}</p>

                    <div className="scenario-stats">
                      <span className="stat"><Icon name="clock" size={14} /> {scen.duration_hours} год</span>
                      <span className="stat"><Icon name="shield" size={14} /> Безпека: {scen.safety_score}/10</span>
                      <span className="stat"><Icon name="leaf" size={14} /> CO₂: {scen.co2_footprint} кг</span>
                    </div>

                    <button 
                      className="btn-accent" 
                      style={{ width: '100%', marginTop: '16px', padding: '12px 0', fontSize: '1rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedScenario(scen.scenario);
                        setShowCheckoutModal(true);
                      }}
                    >
                      Оформити цей тариф
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Форма швидкого оформлення */}
          {showCheckoutModal && (
            <div className="checkout-step2-overlay glass-card fade-in" style={{
              marginTop: '20px', padding: '2rem', borderRadius: '16px', border: '1px solid var(--dandel-gold)'
            }}>
              <div className="auth-brand" style={{ marginBottom: '20px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon name="file-text" size={24} color="var(--dandel-green)" />
                  <h3 style={{ margin: 0, color: 'white' }}>Деталі доставки («{selectedScenario || currentCalculation.recommended_scenario}»)</h3>
                </div>
                <button className="btn-secondary" onClick={() => setShowCheckoutModal(false)} style={{ padding: '8px 12px' }}>
                  <Icon name="arrow-left" size={16} /> Назад
                </button>
              </div>

              {!user && (
                  <div className="cross-border-badge" style={{ marginBottom: '20px', background: 'rgba(245, 158, 11, 0.1)' }}>
                    <Icon name="user-plus" size={16} color="var(--dandel-gold)" />
                    <span><strong>Автореєстрація:</strong> Ваш кабінет буде створено автоматично після оформлення замовлення.</span>
                  </div>
                )}

                <form onSubmit={handleCheckout}>
                  <div className="input-group" style={{ marginBottom: '15px' }}>
                    <label><Icon name="package" size={14} /> Назва вантажу</label>
                    <input 
                      type="text" 
                      placeholder="Що відправляємо?" 
                      value={cargoName} 
                      onChange={e => setCargoName(e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="input-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <div className="input-group">
                      <label><Icon name="user" size={14} /> Відправник</label>
                      <input 
                        type="text" 
                        value={senderName} 
                        onChange={e => setSenderName(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="input-group">
                      <label><Icon name="map-pin" size={14} /> Відділення/Адреса відправника</label>
                      <input 
                        type="text" 
                        placeholder="вул. Хрещатик 22, або Відділення №1" 
                        value={senderAddress} 
                        onChange={e => setSenderAddress(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>

                  <div className="input-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="input-group">
                      <label><Icon name="users" size={14} /> Отримувач</label>
                      <input 
                        type="text" 
                        placeholder="ПІБ отримувача" 
                        value={receiverName} 
                        onChange={e => setReceiverName(e.target.value)} 
                        required 
                      />
                    </div>

                    <div className="input-group">
                      <label><Icon name="phone" size={14} /> Телефон отримувача</label>
                      <input 
                        type="tel" 
                        placeholder="+380..." 
                        value={receiverPhone} 
                        onChange={e => setReceiverPhone(e.target.value)} 
                        required 
                      />
                    </div>
                    
                    <div className="input-group" style={{ gridColumn: 'span 2' }}>
                      <label><Icon name="map-pin" size={14} /> Відділення/Адреса отримувача</label>
                      <input 
                        type="text" 
                        placeholder="вул. Дерибасівська 1, або Відділення №4" 
                        value={receiverAddress} 
                        onChange={e => setReceiverAddress(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>

                  {/* Особливі опції тарифу Безпечний */}
                  {(selectedScenario || currentCalculation.recommended_scenario) === 'Безпечний' && (
                    <div className="special-options-box" style={{ marginTop: '15px' }}>
                      <label className="checkbox-container">
                        <input 
                          type="checkbox" 
                          checked={escortRequested} 
                          onChange={e => setEscortRequested(e.target.checked)} 
                        />
                        <span className="checkbox-custom"></span>
                        <div>
                          <strong><Icon name="shield" size={14} /> Замовити збройний супровід охорони (+1500 грн)</strong>
                          <p className="checkbox-subtext" style={{ fontSize: '12px' }}>Партнерська охоронна компанія забезпечує повний супровід вантажу (10/10).</p>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Бонусна система в дії */}
                  {user && user.bonuses_balance > 0 && (
                    <div className="bonuses-redeem-box" style={{ marginTop: '15px' }}>
                      <label className="checkbox-container">
                        <input 
                          type="checkbox" 
                          checked={useBonuses} 
                          onChange={e => setUseBonuses(e.target.checked)} 
                        />
                        <span className="checkbox-custom"></span>
                        <div>
                          <strong><Icon name="gift" size={14} /> Списати бонуси кульбаби (На балансі: {user.bonuses_balance} грн)</strong>
                          <p className="checkbox-subtext" style={{ fontSize: '12px' }}>Ви можете оплатити до 50% вартості поїздки. 1 бонус = 1 грн.</p>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Розрахунок підсумкової вартості */}
                  {activeScenarioDetails && (
                    <div className="checkout-summary" style={{ marginTop: '20px' }}>
                      <div className="summary-row">
                        <span>Базовий тариф:</span>
                        <span>{activeScenarioDetails.price} грн</span>
                      </div>
                      {escortRequested && (
                        <div className="summary-row">
                          <span><Icon name="shield" size={14} /> Супровід охорони:</span>
                          <span>+1500 грн</span>
                        </div>
                      )}
                      {useBonuses && user && (
                        <div className="summary-row discount">
                          <span><Icon name="gift" size={14} /> Знижка за бонуси:</span>
                          <span>-{Math.min(user.bonuses_balance, (activeScenarioDetails.price + (escortRequested ? 1500 : 0)) * 0.5)} грн</span>
                        </div>
                      )}
                      <hr style={{ margin: '10px 0', borderColor: 'rgba(255,255,255,0.1)' }} />
                      <div className="summary-row total" style={{ fontSize: '18px', fontWeight: 'bold' }}>
                        <span>Разом до сплати:</span>
                        <span style={{ color: 'var(--dandel-gold)' }}>
                          {activeScenarioDetails.price + 
                           (escortRequested ? 1500 : 0) - 
                           (useBonuses && user 
                             ? Math.min(user.bonuses_balance, (activeScenarioDetails.price + (escortRequested ? 1500 : 0)) * 0.5) 
                             : 0)} грн
                        </span>
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="btn-accent" 
                    style={{ width: '100%', marginTop: '20px' }}
                    disabled={loading}
                  >
                    <Icon name="send" size={18} />
                    {loading ? 'Надсилаємо...' : 'Підтвердити замовлення'}
                  </button>
                </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CriteriaSelector;

