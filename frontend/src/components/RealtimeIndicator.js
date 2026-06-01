import React, { useEffect, useState } from 'react';

const RealtimeIndicator = ({ lastUpdate, isUpdating }) => {
  const [timeSinceUpdate, setTimeSinceUpdate] = useState('Just now');

  useEffect(() => {
    if (!lastUpdate) {
      setTimeSinceUpdate('Never');
      return;
    }

    // Update time display every second
    const updateTime = () => {
      const now = new Date();
      const diffMs = now - lastUpdate;
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);

      if (diffSecs < 5) {
        setTimeSinceUpdate('Just now');
      } else if (diffSecs < 60) {
        setTimeSinceUpdate(`${diffSecs}s ago`);
      } else if (diffMins < 60) {
        setTimeSinceUpdate(`${diffMins}m ago`);
      } else {
        setTimeSinceUpdate('Long ago');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [lastUpdate]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={`w-3 h-3 rounded-full ${isUpdating ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
        <div className={`absolute inset-0 w-3 h-3 rounded-full ${isUpdating ? 'bg-green-400 animate-ping' : ''}`}></div>
      </div>
      <span className="text-sm text-gray-400">
        <span className={isUpdating ? 'text-green-400 font-semibold' : ''}>{timeSinceUpdate}</span>
      </span>
    </div>
  );
};

export default RealtimeIndicator;
