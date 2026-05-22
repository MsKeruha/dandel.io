import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import './RouteMap.css';

interface RouteMapProps {
  origin: string;
  destination: string;
  routePoints: [number, number][];
  scenario: string;
  currentLocation?: [number, number] | null;
  status?: string;
  isCrossBorder?: boolean;
  allScenarios?: any[];
}

export const RouteMap: React.FC<RouteMapProps> = React.memo(({
  origin,
  destination,
  routePoints,
  scenario,
  currentLocation,
  status,
  isCrossBorder,
  allScenarios
}) => {
  const { isCalculating } = useApp();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);
  const otherRoutesRefs = useRef<any[]>([]);
  const markerOriginRef = useRef<any>(null);
  const markerDestRef = useRef<any>(null);
  const markerCarRef = useRef<any>(null);
  const riskCircleRef = useRef<any>(null);

  // Функція для визначення кольору за тарифом
  const getScenarioColor = (name: string) => {
    switch (name) {
      case 'Експрес': return '#FFC72C'; // золотий одуванчик
      case 'Економ': return '#8A6E55';  // стебло/земляний
      case 'Безпечний': return '#3F8F52'; // зелений лист
      default: return '#3F8F52';
    }
  };

  useEffect(() => {
    // Якщо Leaflet скрипт не завантажений або контейнер недоступний, виходимо
    if (!mapContainerRef.current || !(window as any).L) {
      return;
    }

    const L = (window as any).L;

    // Ініціалізація карти, якщо її ще немає
    if (!leafletMapRef.current) {
      leafletMapRef.current = L.map(mapContainerRef.current, {
        center: [49.0, 31.0],
        zoom: 6,
        zoomControl: false
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB &copy; OpenStreetMap contributors',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(leafletMapRef.current);

      L.control.zoom({ position: 'bottomright' }).addTo(leafletMapRef.current);
    }

    const map = leafletMapRef.current;

    // Видаляємо старі шари перед оновленням
    if (routePolylineRef.current) map.removeLayer(routePolylineRef.current);
    otherRoutesRefs.current.forEach(layer => map.removeLayer(layer));
    otherRoutesRefs.current = [];
    
    if (markerOriginRef.current) map.removeLayer(markerOriginRef.current);
    if (markerDestRef.current) map.removeLayer(markerDestRef.current);
    if (markerCarRef.current) map.removeLayer(markerCarRef.current);
    if (riskCircleRef.current) map.removeLayer(riskCircleRef.current);

    // Спочатку малюємо всі інші маршрути як фонові (дуже тонкими та прозорими)
    if (!isCalculating && allScenarios) {
      allScenarios.forEach(sc => {
        if (sc.scenario !== scenario && sc.route_points && sc.route_points.length >= 2) {
          const pts = sc.route_points.map((p: any) => [p[0], p[1]]);
          const poly = L.polyline(pts, {
            color: getScenarioColor(sc.scenario),
            weight: 2,
            opacity: 0.15,
            dashArray: '5, 5'
          }).addTo(map);
          otherRoutesRefs.current.push(poly);
        }
      });
    }

    if (!isCalculating && routePoints && routePoints.length >= 2) {
      const latLngs = routePoints.map(p => [p[0], p[1]]);
      const color = getScenarioColor(scenario);

      // Малюємо лінію активного маршруту
      routePolylineRef.current = L.polyline(latLngs, {
        color: color,
        weight: 5,
        opacity: 0.9,
        dashArray: scenario === 'Економ' ? '10, 10' : 'none',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
      routePolylineRef.current.bringToFront();

      // Кастомні маркери
      const createCustomIcon = (colorBg: string, label: string) => {
        return L.divIcon({
          html: `<div class="map-custom-marker" style="background-color: ${colorBg}">
                  <span>${label}</span>
                  <div class="marker-pulse"></div>
                 </div>`,
          className: 'custom-div-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });
      };

      const startPoint = latLngs[0];
      const endPoint = latLngs[latLngs.length - 1];

      markerOriginRef.current = L.marker(startPoint, {
        icon: createCustomIcon('#3F8F52', 'A')
      }).addTo(map).bindPopup(`<b>Відправлення:</b> ${origin}`);

      markerDestRef.current = L.marker(endPoint, {
        icon: createCustomIcon('#FFC72C', 'B')
      }).addTo(map).bindPopup(`<b>Призначення:</b> ${destination}`);

      if (scenario === 'Безпечний') {
        riskCircleRef.current = L.circle([48.6, 36.8], {
          color: '#D9534F',
          fillColor: '#D9534F',
          fillOpacity: 0.15,
          radius: 120000 
        }).addTo(map).bindPopup('<b>⚠️ Зона підвищеного воєнного ризику</b><br>Маршрут dandel.io прокладено в обхід цього сектору.');
      }

      if (currentLocation) {
        const carIcon = L.divIcon({
          html: `<div class="map-car-marker" style="border-color: ${color}">
                  <span class="car-emoji">${scenario === 'Експрес' ? '✈️' : '🚚'}</span>
                 </div>`,
          className: 'custom-div-icon',
          iconSize: [38, 38],
          iconAnchor: [19, 19]
        });

        markerCarRef.current = L.marker(currentLocation, {
          icon: carIcon
        }).addTo(map).bindPopup(`<b>Статус:</b> ${status || 'В дорозі'}`);
        
        map.setView(currentLocation, 7);
      } else {
        map.fitBounds(routePolylineRef.current.getBounds(), { padding: [50, 50] });
      }
    }
  }, [origin, destination, routePoints, scenario, currentLocation, status, allScenarios]);

  const hasLeaflet = !!(window as any).L;

  return (
    <div className="route-map-wrapper glass-card">
      <div className="map-header">
        <div className="map-title-row">
          <span className="dot-pulse"></span>
          <h4>Інтелектуальний Моніторинг Маршруту dandel.io</h4>
        </div>
        <div className="map-legend">
          <span className="legend-item"><span className="legend-line" style={{backgroundColor: '#FFC72C'}}></span>Експрес</span>
          <span className="legend-item"><span className="legend-line" style={{backgroundColor: '#8A6E55', borderStyle: 'dashed'}}></span>Економ</span>
          <span className="legend-item"><span className="legend-line" style={{backgroundColor: '#3F8F52'}}></span>Безпечний</span>
        </div>
      </div>
      
      {/* Контейнер для карти Leaflet */}
      <div 
        id="leaflet-map" 
        ref={mapContainerRef} 
        className={isCalculating ? 'map-calculating' : ''}
        style={{ height: '400px', width: '100%', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', position: 'relative' }}
      >
        {isCalculating && (
          <div className="map-loading-overlay">
            <div className="loader-content">
              <span className="dot-pulse"></span>
              <p>dandel.io розраховує оптимальний маршрут...</p>
            </div>
          </div>
        )}
        {/* Запасна інтерактивна SVG карта на випадок відсутності завантаження Leaflet */}
        {!hasLeaflet && (
          <div className="svg-map-fallback">
            <svg viewBox="0 0 800 450" className="ukraine-vector-map">
              {/* Спрощений силует кордонів України та Польщі */}
              <path 
                d="M150,150 L250,130 L380,120 L480,100 L580,120 L680,140 L700,200 L680,260 L580,280 L480,310 L380,330 L250,300 L180,310 Z" 
                fill="#EDF4EE" 
                stroke="#C2DEC8" 
                strokeWidth="3" 
              />
              <text x="180" y="110" fill="var(--dandel-meadow-light)" opacity="0.6" fontSize="12" fontWeight="bold">ПОЛЬЩА</text>
              <text x="450" y="220" fill="var(--dandel-meadow-light)" opacity="0.4" fontSize="24" fontWeight="bold">УКРАЇНА</text>
              
              {/* Позначення міст */}
              <circle cx="250" cy="200" r="5" fill="var(--dandel-meadow-mid)" />
              <text x="260" y="205" fontSize="11" fontWeight="bold">Львів</text>
              
              <circle cx="460" cy="180" r="5" fill="var(--dandel-meadow-mid)" />
              <text x="470" y="185" fontSize="11" fontWeight="bold">Київ</text>
              
              <circle cx="610" cy="160" r="5" fill="var(--dandel-meadow-mid)" />
              <text x="620" y="165" fontSize="11" fontWeight="bold">Харків</text>

              <circle cx="480" cy="300" r="5" fill="var(--dandel-meadow-mid)" />
              <text x="490" y="305" fontSize="11" fontWeight="bold">Одеса</text>

              {/* Умовна зона воєнних ризиків */}
              {scenario === 'Безпечний' && (
                <g>
                  <circle cx="640" cy="230" r="60" fill="#D9534F" fillOpacity="0.12" stroke="#D9534F" strokeWidth="1" strokeDasharray="3" />
                  <circle cx="640" cy="230" r="3" fill="#D9534F" />
                  <text x="590" y="295" fill="#D9534F" fontSize="10" fontWeight="bold">Зона воєнних ризиків</text>
                </g>
              )}

              {/* Маршрутна лінія */}
              {!isCalculating && routePoints && routePoints.length >= 2 && (
                <g>
                  <path 
                    d={scenario === 'Експрес' 
                      ? 'M 250,200 L 300,190 L 350,185 L 400,182 L 460,180' 
                      : scenario === 'Економ'
                        ? 'M 250,200 L 280,230 L 350,240 L 420,220 L 460,180'
                        : 'M 250,200 L 320,150 L 400,155 L 460,180'} 
                    fill="none" 
                    stroke={getScenarioColor(scenario)} 
                    strokeWidth="5" 
                    strokeDasharray={scenario === 'Економ' ? '10,5' : 'none'}
                    strokeLinecap="round"
                    className="animated-dash"
                  />
                  {/* Анімований транспорт */}
                  <circle cx="350" cy="180" r="14" fill="white" stroke={getScenarioColor(scenario)} strokeWidth="3">
                    <animateMotion 
                      path={scenario === 'Експрес' 
                        ? 'M 250,200 Q 350,170 460,180' 
                        : scenario === 'Економ'
                          ? 'M 250,200 Q 300,240 380,210 T 460,180'
                          : 'M 250,200 Q 330,140 400,160 T 460,180'}
                      dur="8s" 
                      repeatCount="indefinite" 
                    />
                  </circle>
                  <text fontSize="14">
                    <animateMotion 
                      path={scenario === 'Експрес' 
                        ? 'M 250,200 Q 350,170 460,180' 
                        : scenario === 'Економ'
                          ? 'M 250,200 Q 300,240 380,210 T 460,180'
                          : 'M 250,200 Q 330,140 400,160 T 460,180'}
                      dur="8s" 
                      repeatCount="indefinite" 
                    />
                    <tspan dx="-6" dy="4">{scenario === 'Експрес' ? '✈️' : '🚚'}</tspan>
                  </text>
                </g>
              )}
            </svg>
            <div className="map-fallback-banner">
              <p>📍 Відображено інтерактивну векторну схему dandel.io</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default RouteMap;
