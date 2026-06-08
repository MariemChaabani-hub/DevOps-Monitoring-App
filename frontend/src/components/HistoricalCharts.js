/**
 * Historical Charts Component
 * Displays CPU and RAM usage over time with time range selector
 * Uses Recharts for visualization
 */

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

const HistoricalCharts = ({ serverId }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('1h'); // 1h, 24h, 7d

  // Map time range to minutes
  const timeRangeMap = {
    '1h': 60,
    '24h': 24 * 60,
    '7d': 7 * 24 * 60,
  };

  // Fetch historical metrics when serverId or timeRange changes
  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!serverId) return;

      setLoading(true);
      setError(null);

      try {
        const minutes = timeRangeMap[timeRange];
        const response = await fetch(
          `http://localhost:3000/api/metrics/history/${serverId}?minutes=${minutes}&limit=1000`
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[HistoricalCharts] Fetched ${data.length} metrics for ${serverId}`, data);

        // Format data for Recharts with only necessary fields and timestamps
        const formattedData = data.map((metric) => ({
          timestamp: new Date(metric.timestamp).getTime(),
          time: new Date(metric.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          cpu: Math.round(metric.cpu_percent * 10) / 10,
          ram: Math.round(metric.ram_percent * 10) / 10,
          disk: Math.round(metric.disk_percent * 10) / 10,
        }));

        setChartData(formattedData);
      } catch (err) {
        console.error('[HistoricalCharts] Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalData();

    return () => {};
  }, [serverId, timeRange]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-300 text-sm">
            {new Date(payload[0].payload.timestamp).toLocaleString()}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="font-semibold">
              {entry.name}: {entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-100">Historical Metrics</h3>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {Object.keys(timeRangeMap).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                timeRange === range
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && chartData.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="ml-3 text-gray-400">Loading metrics...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-4">
          <p className="text-red-100">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && chartData.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <svg
            className="w-12 h-12 mb-2 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p>No data available for this time range</p>
        </div>
      )}

      {/* CPU & RAM Combined Chart */}
      {!loading && chartData.length > 0 && (
        <>
          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: 'CPU Average',
                value: (chartData.reduce((sum, d) => sum + d.cpu, 0) / chartData.length).toFixed(1),
                unit: '%',
                color: 'text-red-400',
              },
              {
                label: 'CPU Max',
                value: Math.max(...chartData.map((d) => d.cpu)).toFixed(1),
                unit: '%',
                color: 'text-red-600',
              },
              {
                label: 'RAM Average',
                value: (chartData.reduce((sum, d) => sum + d.ram, 0) / chartData.length).toFixed(1),
                unit: '%',
                color: 'text-blue-400',
              },
              {
                label: 'RAM Max',
                value: Math.max(...chartData.map((d) => d.ram)).toFixed(1),
                unit: '%',
                color: 'text-blue-600',
              },
            ].map((stat, idx) => (
              <div key={idx} className="bg-gray-700 rounded-lg p-3">
                <p className="text-gray-400 text-xs font-medium uppercase">{stat.label}</p>
                <p className={`${stat.color} text-2xl font-bold mt-1`}>
                  {stat.value}
                  <span className="text-sm">{stat.unit}</span>
                </p>
              </div>
            ))}
          </div>

          {/* CPU Chart */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-300 mb-4">CPU Usage</h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="time"
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'CPU %', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke="#ef4444"
                  fillOpacity={1}
                  fill="url(#colorCpu)"
                  dot={false}
                  name="CPU %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* RAM Chart */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-300 mb-4">RAM Usage</h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="time"
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'RAM %', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="ram"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorRam)"
                  dot={false}
                  name="RAM %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* CPU vs RAM Comparison Chart */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-4">CPU vs RAM Comparison</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="time"
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Usage %', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  contentStyle={{ color: '#d1d5db' }}
                />
                <Line
                  type="monotone"
                  dataKey="cpu"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  name="CPU %"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="ram"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="RAM %"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Data Info */}
          <p className="text-gray-500 text-xs mt-4">
            Showing {chartData.length} data points for {timeRange}
          </p>
        </>
      )}
    </div>
  );
};

export default HistoricalCharts;
