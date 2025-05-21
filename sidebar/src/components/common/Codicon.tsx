import React from 'react';

interface CodiconProps {
  name: string;
  className?: string;
  title?: string;
  onClick?: () => void;
}

/**
 * A component to render VS Code Codicons consistently
 */
const Codicon: React.FC<CodiconProps> = ({ name, className = '', title = '', onClick }) => {
  return (
    <i 
      className={`codicon codicon-${name} ${className}`} 
      title={title}
      onClick={onClick}
    ></i>
  );
};

export default Codicon; 