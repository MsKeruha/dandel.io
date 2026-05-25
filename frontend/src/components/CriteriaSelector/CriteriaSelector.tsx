import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useOverlay } from '../../context/OverlayContext';
import type { GeocodeResult } from '../../context/AppContext';
import Icon from '../common/Icon';
import CustomSelect from '../common/CustomSelect';
import RouteMap from '../Map/RouteMap';
import './CriteriaSelector.css';

interface CriteriaSelectorProps {
    onComplete?: () => void;
}

export const CriteriaSelector: React.FC<CriteriaSelectorProps> = ({ onComplete }) => {
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
    const [originCountry, setOriginCountry] = useState('Україна');
    const [destCountry, setDestCountry] = useState('Україна');
    const [originSuggestions, setOriginSuggestions] = useState<GeocodeResult[]>([]);
    const [destSuggestions, setDestSuggestions] = useState<GeocodeResult[]>([]);
    const [showOriginDropdown, setShowOriginDropdown] = useState(false);
    const [showDestDropdown, setShowDestDropdown] = useState(false);
    
    const [senderAddressSuggestions, setSenderAddressSuggestions] = useState<GeocodeResult[]>([]);
    const [receiverAddressSuggestions, setReceiverAddressSuggestions] = useState<GeocodeResult[]>([]);
    const [showSenderAddressDropdown, setShowSenderAddressDropdown] = useState(false);
    const [showReceiverAddressDropdown, setShowReceiverAddressDropdown] = useState(false);
    
    const originRef = useRef<HTMLDivElement>(null);
    const destRef = useRef<HTMLDivElement>(null);
    const senderAddressRef = useRef<HTMLDivElement>(null);
    const receiverAddressRef = useRef<HTMLDivElement>(null);

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

    // Стан платіжного шлюзу
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentCardNumber, setPaymentCardNumber] = useState('');
    const [paymentCardExpiry, setPaymentCardExpiry] = useState('');
    const [paymentCardCvc, setPaymentCardCvc] = useState('');
    const [paymentCardName, setPaymentCardName] = useState('');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentStep, setPaymentStep] = useState(0);

    // Закриття дропдаунів при кліку зовні
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (originRef.current && !originRef.current.contains(event.target as Node)) {
                setShowOriginDropdown(false);
            }
            if (destRef.current && !destRef.current.contains(event.target as Node)) {
                setShowDestDropdown(false);
            }
            if (senderAddressRef.current && !senderAddressRef.current.contains(event.target as Node)) {
                setShowSenderAddressDropdown(false);
            }
            if (receiverAddressRef.current && !receiverAddressRef.current.contains(event.target as Node)) {
                setShowReceiverAddressDropdown(false);
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

    // Пошук адрес відправника та авто-оновлення координат
    useEffect(() => {
        if (senderAddress.length < 3) {
            setSenderAddressSuggestions([]);
            return;
        }
        const timer = setTimeout(async () => {
            const query = `${senderAddress}, ${origin}`;
            const results = await searchCities(query);
            setSenderAddressSuggestions(results);
        }, 600);
        return () => clearTimeout(timer);
    }, [senderAddress, origin]);

    // Авто-вибір координати при закритті списку (клік ззовні)
    useEffect(() => {
        if (!showSenderAddressDropdown && senderAddressSuggestions.length > 0) {
            const match = senderAddressSuggestions.find(s => (s.full_address || s.name) === senderAddress);
            if (!match) {
                setOriginCoords([senderAddressSuggestions[0].lat, senderAddressSuggestions[0].lon]);
            }
        }
    }, [showSenderAddressDropdown]);

    // Пошук адрес отримувача та авто-оновлення координат
    useEffect(() => {
        if (receiverAddress.length < 3) {
            setReceiverAddressSuggestions([]);
            return;
        }
        const timer = setTimeout(async () => {
            const query = `${receiverAddress}, ${destination}`;
            const results = await searchCities(query);
            setReceiverAddressSuggestions(results);
        }, 600);
        return () => clearTimeout(timer);
    }, [receiverAddress, destination]);

    // Авто-вибір координати при закритті списку (клік ззовні)
    useEffect(() => {
        if (!showReceiverAddressDropdown && receiverAddressSuggestions.length > 0) {
            const match = receiverAddressSuggestions.find(s => (s.full_address || s.name) === receiverAddress);
            if (!match) {
                setDestCoords([receiverAddressSuggestions[0].lat, receiverAddressSuggestions[0].lon]);
            }
        }
    }, [showReceiverAddressDropdown]);

    // Автоматичний перерахунок транскордонності
    useEffect(() => {
        setIsCrossBorder(originCountry !== 'Україна' || destCountry !== 'Україна');
    }, [originCountry, destCountry]);

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

    const handleCheckoutSubmit = async (e: React.FormEvent) => {
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

        // Замість прямого створення відкриваємо платіжну форму
        setShowPaymentForm(true);
    };

    const handleProcessPayment = async (e: React.FormEvent) => {
        e.preventDefault();

        const cleanCardNum = paymentCardNumber.replace(/\s/g, '');
        if (cleanCardNum.length !== 16 || !/^\d+$/.test(cleanCardNum)) {
            showAlert('Номер картки повинен містити 16 цифр', 'Помилка оплати');
            return;
        }

        if (!/^\d{2}\/\d{2}$/.test(paymentCardExpiry)) {
            showAlert('Термін дії повинен бути у форматі ММ/ГГ', 'Помилка оплати');
            return;
        }

        if (paymentCardCvc.length !== 3 || !/^\d+$/.test(paymentCardCvc)) {
            showAlert('Код CVC/CVV повинен містити 3 цифри', 'Помилка оплати');
            return;
        }

        if (!paymentCardName.trim()) {
            showAlert('Вкажіть ім\'я власника картки', 'Помилка оплати');
            return;
        }

        setIsProcessingPayment(true);
        setPaymentStep(1);

        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

        await sleep(1200);
        setPaymentStep(2);
        await sleep(1200);
        setPaymentStep(3);
        await sleep(1200);
        setPaymentStep(4);
        await sleep(1000);

        const finalScenario = selectedScenario || currentCalculation?.recommended_scenario;
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

        setIsProcessingPayment(false);
        setShowPaymentForm(false);
        setPaymentStep(0);
        setPaymentCardNumber('');
        setPaymentCardExpiry('');
        setPaymentCardCvc('');
        setPaymentCardName('');

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

            setTimeout(() => {
                setOrderSuccess(false);
                setGeneratedPassword(null);
                if (onComplete) {
                    onComplete();
                }
            }, 2000);
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
                                                            setOriginCountry(item.country);
                                                            setShowOriginDropdown(false);
                                                        }}
                                                    >
                                                        <strong>{item.name}</strong>
                                                        <span style={{ fontSize: '0.85rem' }}>{item.full_address || `${item.state ? `${item.state}, ` : ''}${item.country}`}</span>
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
                                                            setDestCountry(item.country);
                                                            setShowDestDropdown(false);
                                                        }}
                                                    >
                                                        <strong>{item.name}</strong>
                                                        <span style={{ fontSize: '0.85rem' }}>{item.full_address || `${item.state ? `${item.state}, ` : ''}${item.country}`}</span>
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

                            <form onSubmit={handleCheckoutSubmit}>
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

                                <div className="input-row" style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '15px' }}>
                                    <div className="input-group">
                                        <label><Icon name="user" size={14} /> Відправник</label>
                                        <input
                                            type="text"
                                            value={senderName}
                                            onChange={e => setSenderName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="input-group autocomplete-group" ref={senderAddressRef}>
                                        <label><Icon name="map-pin" size={14} /> Відділення/Адреса відправника</label>
                                        <div className="search-input-wrapper">
                                            <input
                                                type="text"
                                                placeholder="вул. Хрещатик 22, або Відділення №1"
                                                value={senderAddress}
                                                onChange={e => {
                                                    setSenderAddress(e.target.value);
                                                    setShowSenderAddressDropdown(true);
                                                }}
                                                onFocus={() => setShowSenderAddressDropdown(true)}
                                                required
                                            />
                                            {showSenderAddressDropdown && senderAddressSuggestions.length > 0 && (
                                                <div className="suggestions-dropdown glass-card">
                                                    {senderAddressSuggestions.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="suggestion-item"
                                                            onClick={() => {
                                                                setSenderAddress(item.full_address || item.name);
                                                                setOriginCoords([item.lat, item.lon]);
                                                                setShowSenderAddressDropdown(false);
                                                            }}
                                                        >
                                                            <strong>{item.name}</strong>
                                                            <span style={{ fontSize: '0.85rem' }}>{item.full_address || `${item.state ? `${item.state}, ` : ''}${item.country}`}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="input-row" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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

                                    <div className="input-group autocomplete-group" ref={receiverAddressRef}>
                                        <label><Icon name="map-pin" size={14} /> Відділення/Адреса отримувача</label>
                                        <div className="search-input-wrapper">
                                            <input
                                                type="text"
                                                placeholder="вул. Дерибасівська 1, або Відділення №4"
                                                value={receiverAddress}
                                                onChange={e => {
                                                    setReceiverAddress(e.target.value);
                                                    setShowReceiverAddressDropdown(true);
                                                }}
                                                onFocus={() => setShowReceiverAddressDropdown(true)}
                                                required
                                            />
                                            {showReceiverAddressDropdown && receiverAddressSuggestions.length > 0 && (
                                                <div className="suggestions-dropdown glass-card">
                                                    {receiverAddressSuggestions.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="suggestion-item"
                                                            onClick={() => {
                                                                setReceiverAddress(item.full_address || item.name);
                                                                setDestCoords([item.lat, item.lon]);
                                                                setShowReceiverAddressDropdown(false);
                                                            }}
                                                        >
                                                            <strong>{item.name}</strong>
                                                            <span style={{ fontSize: '0.85rem' }}>{item.full_address || `${item.state ? `${item.state}, ` : ''}${item.country}`}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
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
                                                <strong><Icon name="gift" size={14} /> Списати бонуси (доступно: {user.bonuses_balance.toFixed(2)} грн)</strong>
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
                                                <span>-{Math.min(user.bonuses_balance, (activeScenarioDetails.price + (escortRequested ? 1500 : 0)) * 0.5).toFixed(2)} грн</span>
                                            </div>
                                        )}
                                        <hr style={{ margin: '10px 0', borderColor: 'rgba(255,255,255,0.1)' }} />
                                        <div className="summary-row total" style={{ fontSize: '18px', fontWeight: 'bold' }}>
                                            <span>Разом до сплати:</span>
                                            <span style={{ color: 'var(--dandel-gold)' }}>
                                                {(activeScenarioDetails.price +
                                                    (escortRequested ? 1500 : 0) -
                                                    (useBonuses && user
                                                        ? Math.min(user.bonuses_balance, (activeScenarioDetails.price + (escortRequested ? 1500 : 0)) * 0.5)
                                                        : 0)).toFixed(2)} грн
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="btn-accent"
                                    style={{ width: '100%', marginTop: '20px', padding: '10px 0' }}
                                    disabled={loading}
                                >
                                    <Icon name="send" size={18} />
                                    {loading ? 'Надсилаємо...' : 'Підтвердити замовлення'}
                                </button>
                            </form>
                        </div>
                    )}
                    {/* Платіжне вікно dandel.pay */}
                    {showPaymentForm && (
                        <div className="checkout-step2-overlay glass-card fade-in" style={{
                            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            zIndex: 1000, width: '90%', maxWidth: '500px', padding: '2rem', borderRadius: '16px',
                            border: '1px solid var(--dandel-gold)', background: 'rgba(20, 20, 20, 0.96)',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Icon name="credit-card" size={24} color="var(--dandel-green)" />
                                    <h3 style={{ margin: 0, color: 'white' }}>Безпечна оплата рейсу</h3>
                                </div>
                                {!isProcessingPayment && (
                                    <button className="btn-secondary" onClick={() => setShowPaymentForm(false)} style={{ padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#fff' }}>
                                        <Icon name="x" size={16} />
                                    </button>
                                )}
                            </div>

                            {isProcessingPayment ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 0', textAlign: 'center', gap: '1.5rem' }}>
                                    <Icon name="loader" size={48} className="spin" color="var(--dandel-green)" />
                                    <div>
                                        <h4 style={{ color: 'white', marginBottom: '10px' }}>Обробка трансакції dandel.pay</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.7)', textAlign: 'left', width: '100%', marginTop: '15px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: paymentStep >= 1 ? '#00e676' : undefined }}>
                                                <Icon name={paymentStep >= 1 ? 'check-circle' : 'circle'} size={14} />
                                                <span>🔒 Ініціалізація безпечного з'єднання...</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: paymentStep >= 2 ? '#00e676' : undefined }}>
                                                <Icon name={paymentStep >= 2 ? 'check-circle' : 'circle'} size={14} />
                                                <span>📡 Зв'язок із платіжним шлюзом dandel.pay...</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: paymentStep >= 3 ? '#00e676' : undefined }}>
                                                <Icon name={paymentStep >= 3 ? 'check-circle' : 'circle'} size={14} />
                                                <span>💸 Проведення трансакції...</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: paymentStep >= 4 ? '#00e676' : undefined }}>
                                                <Icon name={paymentStep >= 4 ? 'check-circle' : 'circle'} size={14} />
                                                <span>✅ Оплата успішна! Створення замовлення...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleProcessPayment}>
                                    {/* 3D Обертова Банківська Карта */}
                                    <div style={{ perspective: '1000px', marginBottom: '20px' }}>
                                        <div style={{
                                            position: 'relative',
                                            width: '100%',
                                            height: '180px',
                                            transition: 'transform 0.6s',
                                            transformStyle: 'preserve-3d',
                                            transform: paymentCardCvc === 'focus' || (document.activeElement?.id === 'cvc-input') ? 'rotateY(180deg)' : 'rotateY(0deg)'
                                        }}>
                                            {/* Лицьова сторона */}
                                            <div style={{
                                                position: 'absolute',
                                                width: '100%',
                                                height: '100%',
                                                backfaceVisibility: 'hidden',
                                                background: 'linear-gradient(135deg, rgba(63, 143, 82, 0.85) 0%, rgba(245, 158, 11, 0.85) 100%)',
                                                borderRadius: '12px',
                                                padding: '20px',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 10px 20px rgba(0,0,0,0.3)',
                                                color: 'white',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                fontFamily: 'monospace'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>dandel.pay</span>
                                                    <Icon name="credit-card" size={24} />
                                                </div>
                                                <div style={{ fontSize: '20px', letterSpacing: '2px', textAlign: 'center', margin: '15px 0' }}>
                                                    {paymentCardNumber || '•••• •••• •••• ••••'}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                                    <div>
                                                        <span style={{ display: 'block', opacity: 0.6, fontSize: '10px' }}>ВЛАСНИК</span>
                                                        <span>{paymentCardName.toUpperCase() || 'CARDHOLDER NAME'}</span>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <span style={{ display: 'block', opacity: 0.6, fontSize: '10px' }}>ТЕРМІН</span>
                                                        <span>{paymentCardExpiry || 'MM/YY'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Зворотна сторона */}
                                            <div style={{
                                                position: 'absolute',
                                                width: '100%',
                                                height: '100%',
                                                backfaceVisibility: 'hidden',
                                                transform: 'rotateY(180deg)',
                                                background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(50, 50, 50, 0.95) 100%)',
                                                borderRadius: '12px',
                                                padding: '20px 0',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
                                                color: 'white',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between'
                                            }}>
                                                <div style={{ width: '100%', height: '40px', background: '#000', margin: '10px 0' }}></div>
                                                <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                    <div style={{ background: '#fff', color: '#000', padding: '5px 10px', borderRadius: '4px', fontStyle: 'italic', fontWeight: 'bold', width: '50px', textAlign: 'center' }}>
                                                        {paymentCardCvc.replace(/./g, '•') || '•••'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="input-group" style={{ marginBottom: '15px' }}>
                                        <label>Номер картки</label>
                                        <input
                                            type="text"
                                            placeholder="4242 4242 4242 4242"
                                            value={paymentCardNumber}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                                                const matches = val.match(/\d{1,4}/g);
                                                setPaymentCardNumber(matches ? matches.join(' ') : '');
                                            }}
                                            required
                                        />
                                    </div>

                                    <div className="input-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                        <div className="input-group">
                                            <label>Термін дії (ММ/ГГ)</label>
                                            <input
                                                type="text"
                                                placeholder="12/28"
                                                value={paymentCardExpiry}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                                    if (val.length >= 3) {
                                                        setPaymentCardExpiry(`${val.slice(0, 2)}/${val.slice(2)}`);
                                                    } else {
                                                        setPaymentCardExpiry(val);
                                                    }
                                                }}
                                                required
                                            />
                                        </div>
                                        <div className="input-group">
                                            <label>Код CVC/CVV</label>
                                            <input
                                                id="cvc-input"
                                                type="password"
                                                placeholder="•••"
                                                maxLength={3}
                                                value={paymentCardCvc === 'focus' ? '' : paymentCardCvc}
                                                onFocus={() => {
                                                    // Force render rotation
                                                    setPaymentCardCvc('focus');
                                                }}
                                                onBlur={e => {
                                                    setPaymentCardCvc(e.target.value);
                                                }}
                                                onChange={e => setPaymentCardCvc(e.target.value.replace(/\D/g, ''))}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="input-group" style={{ marginBottom: '20px' }}>
                                        <label>Ім'я власника картки</label>
                                        <input
                                            type="text"
                                            placeholder="ANDRII KOLISNYK"
                                            value={paymentCardName}
                                            onChange={e => setPaymentCardName(e.target.value.toUpperCase())}
                                            required
                                        />
                                    </div>

                                    <button type="submit" className="btn-accent" style={{ width: '100%', padding: '12px' }}>
                                        <Icon name="lock" size={16} /> Оплатити та замовити рейс
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CriteriaSelector;

