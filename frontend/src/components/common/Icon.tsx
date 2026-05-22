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
      <img 
        src="/dandel-logo.svg" 
        alt="dandel.io logo" 
        width={size} 
        height={size} 
        className={className} 
        style={{ objectFit: 'contain' }}
      />
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
