import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import type { GeocodeResult } from '../../context/AppContext';
import Icon from '../common/Icon';
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

  // Форма розрахунку
  const [origin, setOrigin] = useState('Львів');
  const [destination, setDestination] = useState('Київ');
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
  const [weight, setWeight] = useState(5.0);
  const [value, setValue] = useState(1000);
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
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [escortRequested, setEscortRequested] = useState(false);
  const [useBonuses, setUseBonuses] = useState(false);
  
  const [orderSuccess, setOrderSuccess] = useState(false);

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

  // Тригер розрахунку при зміні міст, параметрів або повзунків ваг (з дебаунсом для ваг)
  useEffect(() => {
    if (origin !== destination) {
      const timer = setTimeout(() => {
        calculateDelivery(origin, destination, cargoType, weight, value, isCrossBorder, {
          price: priceWeight,
          time: timeWeight,
          safety: safetyWeight,
          eco: ecoWeight
        });
      }, 500); // Оптимізований дебаунс 500мс для запобігання зайвих запитів

      return () => clearTimeout(timer);
    }
  }, [origin, destination, cargoType, weight, value, isCrossBorder, priceWeight, timeWeight, safetyWeight, ecoWeight]);

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
    if (!cargoName || !senderName || !receiverName || !receiverPhone || !selectedScenario) {
      alert('Будь ласка, заповніть усі поля!');
      return;
    }

    const payload = {
      cargo_name: cargoName,
      cargo_type: cargoType,
      weight,
      declared_value: value,
      is_cross_border: isCrossBorder,
      origin_city: origin,
      destination_city: destination,
      sender_name: senderName,
      receiver_name: receiverName,
      receiver_phone: receiverPhone,
      scenario: selectedScenario,
      escort_requested: selectedScenario === 'Безпечний' ? escortRequested : false,
      use_bonuses: useBonuses
    };

    const result = await createDelivery(payload);
    if (result) {
      setOrderSuccess(true);
      setSelectedScenario(null);
      setCargoName('');
      setReceiverName('');
      setReceiverPhone('');
      setEscortRequested(false);
      setUseBonuses(false);
      
      // Скидання сповіщення про успіх через 5 секунд
      setTimeout(() => setOrderSuccess(false), 5000);
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
                  <select value={cargoType} onChange={e => setCargoType(e.target.value)}>
                    <option value="Стандартний">Стандартний</option>
                    <option value="Крихкий">Крихкий вантаж</option>
                    <option value="Терморежим">Терморежим (Холодильник)</option>
                    <option value="Великогабаритний">Великогабаритний</option>
                  </select>
                </div>
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label><Icon name="scale" size={14} /> Вага (кг)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0.1" 
                    value={weight} 
                    onChange={e => setWeight(parseFloat(e.target.value) || 0.1)} 
                  />
                </div>

                <div className="input-group">
                  <label><Icon name="dollar-sign" size={14} /> Оголошена вартість (грн)</label>
                  <input 
                    type="number" 
                    min="100" 
                    value={value} 
                    onChange={e => setValue(parseInt(e.target.value) || 100)} 
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
            />
          )}
        </div>
      </div>

      {/* Нижня частина: Сценарії та Оформлення на повну ширину */}
      {currentCalculation && (
        <div className="delivery-options-area fade-in">
          {orderSuccess && (
            <div className="success-toast">
              <Icon name="check-circle" size={24} color="white" />
              <div>
                <h5>Замовлення успішно оформлено!</h5>
                <p>Баланс бонусів оновлено. Ваша вантажівка готова до відправлення.</p>
              </div>
            </div>
          )}

          <div className="section-divider">
            <div className="divider-line"></div>
            <span className="divider-text">Виберіть найкращий тариф для вашого вантажу</span>
            <div className="divider-line"></div>
          </div>

          {/* Картки сценаріїв доставки - Тепер на повну ширину */}
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
                        <span className="saw-pill">Utility Index: {scen.saw_score}</span>
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
                </div>
              );
            })}
          </div>

          {/* Форма швидкого оформлення */}
          <div className="glass-card panel-card checkout-card">
            <div className="section-title">
              <Icon name="file-text" size={18} color="var(--dandel-green)" />
              <h4>Деталі доставки («{selectedScenario || currentCalculation.recommended_scenario}»)</h4>
            </div>

            <form onSubmit={handleCheckout}>
              <div className="input-row">
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
              </div>

              {/* Особливі опції тарифу Безпечний */}
              {(selectedScenario || currentCalculation.recommended_scenario) === 'Безпечний' && (
                <div className="special-options-box">
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={escortRequested} 
                      onChange={e => setEscortRequested(e.target.checked)} 
                    />
                    <span className="checkbox-custom"></span>
                    <div>
                      <strong><Icon name="shield" size={14} /> Замовити збройний супровід охорони (+1500 грн)</strong>
                      <p className="checkbox-subtext">Партнерська охоронна компанія ДСО забезпечує повний фізичний супровід вантажу та вищий коефіцієнт безпеки (10/10).</p>
                    </div>
                  </label>
                </div>
              )}

              {/* Бонусна система в дії */}
              {user && user.bonuses_balance > 0 && (
                <div className="bonuses-redeem-box">
                  <label className="checkbox-container">
                    <input 
                      type="checkbox" 
                      checked={useBonuses} 
                      onChange={e => setUseBonuses(e.target.checked)} 
                    />
                    <span className="checkbox-custom"></span>
                    <div>
                      <strong><Icon name="gift" size={14} /> Списати бонуси кульбаби (На балансі: {user.bonuses_balance} грн)</strong>
                      <p className="checkbox-subtext">Ви можете оплатити до 50% вартості поїздки. 1 бонус = 1 грн.</p>
                    </div>
                  </label>
                </div>
              )}

              {/* Розрахунок підсумкової вартості */}
              {activeScenarioDetails && (
                <div className="checkout-summary">
                  <div className="summary-row">
                    <span>Базовий тариф:</span>
                    <span>{activeScenarioDetails.price} грн</span>
                  </div>
                  {escortRequested && (
                    <div className="summary-row">
                      <span><Icon name="shield" size={14} /> Супровід ДСО охорони:</span>
                      <span>+1500 грн</span>
                    </div>
                  )}
                  {useBonuses && user && (
                    <div className="summary-row discount">
                      <span><Icon name="gift" size={14} /> Знижка за бонуси:</span>
                      <span>-{Math.min(user.bonuses_balance, (activeScenarioDetails.price + (escortRequested ? 1500 : 0)) * 0.5)} грн</span>
                    </div>
                  )}
                  <hr />
                  <div className="summary-row total">
                    <span>Разом до сплати:</span>
                    <span>
                      {activeScenarioDetails.price + 
                       (escortRequested ? 1500 : 0) - 
                       (useBonuses && user 
                         ? Math.min(user.bonuses_balance, (activeScenarioDetails.price + (escortRequested ? 1500 : 0)) * 0.5) 
                         : 0)} грн
                    </span>
                  </div>
                  <div className="bonus-earn-preview">
                    <Icon name="gift" size={14} color="var(--dandel-green)" />
                    <span>Ви отримаєте +{Math.round((activeScenarioDetails.price + (escortRequested ? 1500 : 0)) * 0.05)} бонусів кешбеку!</span>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className="btn-accent checkout-submit-btn" 
                disabled={loading}
              >
                <Icon name="send" size={18} />
                {loading ? 'Надсилаємо...' : 'Підтвердити замовлення та відправити вантаж'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CriteriaSelector;

