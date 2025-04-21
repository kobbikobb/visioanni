import React from 'react';

type CardProps = {
    children: React.ReactNode;
    className?: string;
};

const Card = ({ children, className = '' }: CardProps) => (
    <div
        className={`p-4 rounded-2xl border border-gray-300 dark:border-gray-700 
      bg-white dark:bg-gray-800 
      hover:bg-gray-100 dark:hover:bg-gray-700 
      transition-colors ${className}`}
    >
        {children}
    </div>
);

export default Card;
