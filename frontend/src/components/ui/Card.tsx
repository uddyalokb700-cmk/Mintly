import React from 'react';
import { cn } from '../../utils/formatters';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  elevated = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-200',
        elevated
          ? 'bg-[#151D19] border-[#223029] shadow-lg shadow-black/20'
          : 'bg-[#111715] border-[#1E2923]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
