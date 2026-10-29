import React from 'react';
import * as LucideIcons from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-5 h-5', style }) => {
  // Map common icon names or use direct Lucide icon lookup
  const cleanName = name?.replace(/[^a-zA-Z0-9]/g, '');
  const IconComponent = (LucideIcons as any)[cleanName] || LucideIcons.CircleDollarSign;

  return <IconComponent className={className} style={style} />;
};
