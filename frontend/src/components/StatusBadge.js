import React from 'react';

const StatusBadge = ({ status }) => {
  let bgColor = 'bg-green-600';
  let textColor = 'text-white';
  let label = 'OK';

  const getStatusColor = (status) => {
    switch (status) {
      case 'OK':
        return 'text-green-500 bg-green-500/20 border-green-500';
      case 'WARNING':
        return 'text-yellow-500 bg-yellow-500/20 border-yellow-500';
      case 'CRITICAL':
        return 'text-red-500 bg-red-500/20 border-red-500';
      case 'OFFLINE':
        return 'text-gray-500 bg-gray-500/20 border-gray-500';
      default:
        return 'text-gray-500 bg-gray-500/20 border-gray-500';
    }
  };

  const statusColor = getStatusColor(status);

  if (status === 'WARNING') {
    bgColor = 'bg-yellow-600';
    label = 'WARNING';
  } else if (status === 'CRITICAL') {
    bgColor = 'bg-red-600';
    label = 'CRITICAL';
  } else if (status === 'OFFLINE') {
    bgColor = 'bg-gray-600';
    label = 'OFFLINE';
  }

  return (
    <div className={`${statusColor} px-4 py-2 rounded-full text-sm font-semibold inline-block`}>
      {label}
    </div>
  );
};

export default StatusBadge;
