import React from 'react';
import * as Icons from 'lucide-react';

export interface IconProps {
  name: string;
  size?: number | string;
  color?: string;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 20, 
  color, 
  className = '' 
}) => {
  // Кастомний логотип кульбаби dandel.io (преміальний мінімалізм)
  if (name === 'dandel-logo') {
    return (
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Преміальна геометрія: мінімалістичний одуванчик */}
        <circle cx="50" cy="50" r="12" stroke={color || "var(--dandel-gold)"} strokeWidth="2.5" />
        <circle cx="50" cy="50" r="4" fill={color || "var(--dandel-gold)"} />
        
        {/* Промені/пух */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
          <line 
            key={angle}
            x1="50" y1="50" 
            x2={50 + 24 * Math.cos(angle * Math.PI / 180)} 
            y2={50 + 24 * Math.sin(angle * Math.PI / 180)} 
            stroke={color || "var(--dandel-gold)"} 
            strokeWidth="1.5" 
            strokeLinecap="round"
            opacity="0.6"
          />
        ))}

        {/* Насіння, що відлітає (символ логістики) */}
        <g style={{ animation: 'float-logo 4s infinite ease-in-out' }}>
          <path d="M75 25L85 15M85 15L90 10M85 15L80 10" stroke={color || "var(--dandel-gold)"} strokeWidth="2" strokeLinecap="round" />
          <circle cx="75" cy="25" r="2" fill={color || "var(--dandel-gold)"} />
        </g>
        
        <path d="M50 62V90" stroke={color || "var(--dandel-green)"} strokeWidth="3" strokeLinecap="round" />
        <path d="M50 75C55 75 60 70 62 72" stroke={color || "var(--dandel-green)"} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </svg>
    );
  }

  // Динамічний пошук іконки в lucide-react
  // Деякі старі іконки можуть відрізнятися, робимо нормалізацію назв
  const normalizedName = name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('') as keyof typeof Icons;

  const LucideIcon = (Icons[normalizedName] || Icons.HelpCircle) as React.ComponentType<{
    size?: number | string;
    color?: string;
    className?: string;
  }>;

  return <LucideIcon size={size} color={color} className={className} />;
};

export default Icon;
