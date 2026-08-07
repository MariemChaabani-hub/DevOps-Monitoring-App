import React, { useState, useEffect } from 'react';

const NotificationPopup = ({ alert, onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        setTimeout(onClose, 300); // Wait for animation to finish
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  // Get colors based on severity
  const getColors = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-900',
          border: 'border-red-700',
          icon: 'bg-red-600',
          text: 'text-red-100',
        };
      case 'WARNING':
        return {
          bg: 'bg-orange-900',
          border: 'border-orange-700',
          icon: 'bg-orange-600',
          text: 'text-orange-100',
        };
      default:
        return {
          bg: 'bg-blue-900',
          border: 'border-blue-700',
          icon: 'bg-blue-600',
          text: 'text-blue-100',
        };
    }
  };

  const colors = getColors(alert.severity);

  const translateSeverity = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'Critique';
      case 'WARNING': return 'Alerte';
      default: return severity;
    }
  };

  return (
    <div className={`fixed top-4 right-4 animate-slide-in transform transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`${colors.bg} border-l-4 ${colors.border} rounded-lg shadow-2xl overflow-hidden max-w-md`}>
        <div className="flex items-start p-4">
          {/* Icon */}
          <div className={`${colors.icon} rounded-full p-2 flex-shrink-0 mr-4`}>
            {alert.severity === 'CRITICAL' ? (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`${colors.text} font-bold text-sm`}>{translateSeverity(alert.severity)}</h3>
              <span className="text-xs opacity-75 text-gray-300">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className={`${colors.text} text-sm`}>{alert.message}</p>
            {alert.server_id && (
              <p className={`${colors.text} text-xs opacity-75 mt-1`}>
                Serveur : {alert.server_id}
              </p>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={() => {
              setIsVisible(false);
              if (onClose) {
                setTimeout(onClose, 300);
              }
            }}
            className={`${colors.text} flex-shrink-0 ml-2 hover:opacity-70 transition-opacity`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-700">
          <div
            className={`h-full ${alert.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-orange-500'}`}
            style={{
              animation: `shrink ${duration}ms linear forwards`,
            }}
          ></div>
        </div>
      </div>

      <style>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationPopup;
