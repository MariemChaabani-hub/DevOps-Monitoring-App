import React from 'react';
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
  Area
} from 'recharts';

const MetricsChart = ({ data, title, lines = ['cpu_percent'] }) => {
  if (!data || data.length === 0) {
    return <div className="p-4 text-gray-400">No data available</div>;
  }

  // Prepare data for chart (last 12 data points, every 5 seconds = 1 minute)
  const chartData = data.slice(-12).map((item, index) => ({
    time: index,
    cpu_percent: item.cpu_percent,
    ram_percent: item.ram_percent,
    disk_percent: item.disk_percent,
    timestamp: new Date(item.timestamp).toLocaleTimeString()
  }));

  const colors = {
    cpu_percent: '#ef4444',
    ram_percent: '#3b82f6',
    disk_percent: '#f59e0b'
  };
  // eslint-disable-next-line no-unused-vars

  return (
    <div className="w-full h-80 bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="timestamp" 
            stroke="#9ca3af"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            stroke="#9ca3af"
            tick={{ fontSize: 12 }}
            domain={[0, 100]}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px'
            }}
            labelStyle={{ color: '#f3f4f6' }}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="cpu_percent" 
            stroke="#ef4444"
            fill="url(#colorCpu)"
            name="CPU %"
          />
          <Area 
            type="monotone" 
            dataKey="ram_percent" 
            stroke="#3b82f6"
            fill="url(#colorRam)"
            name="RAM %"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MetricsChart;
