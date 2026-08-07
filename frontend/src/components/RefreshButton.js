import React from 'react';

const RefreshButton = ({ onRefresh, isLoading, disabled }) => {
  return (
    <button
      onClick={onRefresh}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold
        transition-all duration-200
        ${isLoading || disabled
          ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
          : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95'
        }
      `}
      title={disabled ? 'Mises à jour automatiques en cours' : 'Actualiser manuellement les métriques'}
    >
      <svg
        className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      <span>{isLoading ? 'Actualisation...' : 'Actualiser'}</span>
    </button>
  );
};

export default RefreshButton;
