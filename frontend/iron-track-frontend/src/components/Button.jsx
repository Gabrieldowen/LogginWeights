import React from 'react';

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  disabled = false, 
  type = 'button',
  className = '',
  icon: Icon 
}) => {
  const baseStyles = 'px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-primary hover:bg-primary-dark text-white',
    secondary: 'bg-dark-surface hover:bg-dark-border text-dark-text border border-dark-border',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

export default Button;
