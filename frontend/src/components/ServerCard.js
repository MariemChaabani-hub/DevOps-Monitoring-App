import React from 'react';
import StatusBadge from './StatusBadge';

const ServerCard = ({ server, metrics, onRemoteActions }) => {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">{server.serverId || 'Unknown'}</h3>
        <p className="text-gray-400">No metrics available</p>
      </div>
    );
  }

  const latestMetric = metrics[metrics.length - 1];
  const cpu = latestMetric.cpu_percent || 0;
  const ram = latestMetric.ram_percent || 0;
  const disk = latestMetric.disk_percent || 0;

  // Determine status based on CPU or if server is offline
  let status = 'OK';
  if (cpu === 0 && ram === 0 && disk === 0) {
    status = 'OFFLINE'; // Serveur arrêté
  } else if (cpu > 90) {
    status = 'CRITICAL';
  } else if (cpu > 70) {
    status = 'WARNING';
  }

  // Calculate progress bar colors
  const getCpuColor = (value) => {
    if (value > 90) return 'bg-red-600';
    if (value > 70) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  const getRamColor = (value) => {
    if (value > 85) return 'bg-red-600';
    if (value > 70) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-bold text-white mb-2">{server.serverId || 'Unknown'}</h3>
          <p className="text-sm text-gray-400">
            {new Date(latestMetric.timestamp).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          {onRemoteActions && (
            <button
              onClick={(e) => {
                e.stopPropagation(); // Empêcher la sélection du serveur
                onRemoteActions(server.serverId);
              }}
              className={`px-3 py-1 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
                status === 'CRITICAL' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : status === 'WARNING'
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : status === 'OFFLINE'
                  ? 'bg-gray-600 hover:bg-gray-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              title={`Actions à distance - Serveur ${status}`}
            >
              Actions
            </button>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="space-y-4">
        {/* CPU */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-semibold text-gray-300">CPU Usage</label>
            <span className="text-sm font-bold text-white">{cpu.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all ${getCpuColor(cpu)}`}
              style={{ width: `${Math.min(cpu, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* RAM */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-semibold text-gray-300">Memory Usage</label>
            <span className="text-sm font-bold text-white">{ram.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all ${getRamColor(ram)}`}
              style={{ width: `${Math.min(ram, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Disk */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-semibold text-gray-300">Disk Usage</label>
            <span className="text-sm font-bold text-white">{disk.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all ${getRamColor(disk)}`}
              style={{ width: `${Math.min(disk, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-6 pt-6 border-t border-gray-700 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Network I/O</p>
          <p className="text-sm font-semibold text-white">
            {(latestMetric.network_in || 0).toLocaleString()} B/s
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Uptime</p>
          <p className="text-sm font-semibold text-white">
            {(() => {
              const uptimeSeconds = latestMetric.uptime_seconds ?? latestMetric.uptime ?? 0;
              const uptimeHours = !isNaN(uptimeSeconds) ? Math.floor(uptimeSeconds / 3600) : 0;
              return `${uptimeHours} hrs`;
            })()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServerCard;
