#!/usr/bin/env node

/**
 * Alert System Test Script
 * 
 * Tests the CPU alerting system by sending metrics with various CPU levels
 * Usage: node test-alerts.js [cpu_percent] [server_id]
 * 
 * Examples:
 *   node test-alerts.js 85            # WARNING alert for server-1
 *   node test-alerts.js 95 server-2   # CRITICAL alert for server-2
 *   node test-alerts.js 50            # No alert (normal)
 */

const http = require('http');

// Parse command line arguments
const cpuPercent = parseFloat(process.argv[2]) || 85;
const serverId = process.argv[3] || 'server-1';

// Validate input
if (isNaN(cpuPercent) || cpuPercent < 0 || cpuPercent > 100) {
  console.error('❌ Error: CPU percent must be between 0 and 100');
  process.exit(1);
}

// Prepare metric data
const metric = {
  server_id: serverId,
  timestamp: new Date().toISOString(),
  cpu_percent: cpuPercent,
  memory_percent: 50,
  disk_percent: 40,
  network_in: 1000,
  network_out: 2000,
  uptime: 86400
};

// Prepare POST request
const postData = JSON.stringify(metric);
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/metrics',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

// Send request
const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n✅ Metric sent successfully!');
    console.log('─'.repeat(50));
    console.log('Request Details:');
    console.log(`  Server ID: ${serverId}`);
    console.log(`  CPU Percent: ${cpuPercent}%`);
    console.log(`  Timestamp: ${metric.timestamp}`);
    console.log('─'.repeat(50));
    
    if (cpuPercent > 90) {
      console.log('🔴 CRITICAL Alert: Expected to be triggered');
      console.log('   (CPU > 90%)');
    } else if (cpuPercent > 80) {
      console.log('🟠 WARNING Alert: Expected to be triggered');
      console.log('   (CPU > 80% and <= 90%)');
    } else {
      console.log('🟢 No Alert: Expected (CPU <= 80%)');
    }
    
    console.log('─'.repeat(50));
    console.log('\nCheck results:');
    console.log('1. MongoDB: db.alerts.find({ serverId: "' + serverId + '" })');
    console.log('2. API: GET http://localhost:3000/api/alerts/' + serverId);
    console.log('3. Stats: GET http://localhost:3000/api/alerts/stats/summary');
    console.log('4. Email: Check your inbox or console logs\n');
  });
});

req.on('error', (error) => {
  if (error.code === 'ECONNREFUSED') {
    console.error('\n❌ Error: Cannot connect to backend!');
    console.error('   Make sure backend is running: npm start');
    console.error('   Check that port 3000 is correct in server.js\n');
  } else {
    console.error('❌ Error:', error.message);
  }
  process.exit(1);
});

// Send the request
req.write(postData);
req.end();

console.log('\n📤 Sending metric to http://localhost:3000/metrics...\n');
