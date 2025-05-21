import React from 'react';
import Codicon from './Codicon';

interface StatusBadgeProps {
  status: string;
}

/**
 * A component to display operation status with appropriate icon
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getIconName = () => {
    if (status.includes('copied')) return 'check';
    if (status.includes('Error')) return 'warning';
    return 'loading';
  };

  return (
    <div className="status-badge">
      <Codicon name={getIconName()} className="status-icon" />
      <strong>Status:</strong>&nbsp;{status}
    </div>
  );
};

export default StatusBadge; 