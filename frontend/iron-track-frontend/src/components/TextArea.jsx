import React from 'react';

const TextArea = ({ 
  value, 
  onChange, 
  placeholder, 
  rows = 4,
  className = '',
  disabled = false 
}) => {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={`w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-dark-text placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-all ${className}`}
    />
  );
};

export default TextArea;
