/**
 * Quick test script to verify backup API functionality
 */
const mongoose = require('mongoose');
require('dotenv').config();

const Backup = require('./models/Backup');
const Server = require('./models/Server');

async function testBackupAPI() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Find all servers
    const servers = await Server.find();
    console.log(`\n✓ Found ${servers.length} servers`);
    servers.forEach(s => console.log(`  - ${s.server_name} (${s.serverId})`));

    // Find all backups
    const allBackups = await Backup.find();
    console.log(`\n✓ Found ${allBackups.length} total backups`);

    // For each server, get latest backup
    for (const server of servers) {
      const latest = await Backup.findOne({ serverId: server.serverId }).sort({ date: -1 });
      if (latest) {
        console.log(`\n✓ Latest backup for ${server.serverId}:`);
        console.log(`  Status: ${latest.status}`);
        console.log(`  Date: ${latest.date}`);
        console.log(`  Size: ${latest.size} MB`);
        console.log(`  Duration: ${latest.duration}s`);
      } else {
        console.log(`\n✗ No backups found for ${server.serverId}`);
      }
    }

    // Test the query that the API uses
    console.log('\n\n=== Testing API Query ===');
    const serverId = 'default-server';
    const latestBackup = await Backup.findOne({ serverId })
      .sort({ date: -1 })
      .exec();

    if (latestBackup) {
      console.log(`✓ Query successful for serverId: ${serverId}`);
      console.log(`  Result: ${JSON.stringify(latestBackup, null, 2)}`);
    } else {
      console.log(`✗ No backup found for serverId: ${serverId}`);
      console.log('  Checking if documents exist with serverId field...');
      const docs = await Backup.find({}).limit(5);
      docs.forEach(doc => {
        console.log(`    - serverId: "${doc.serverId}", status: ${doc.status}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

testBackupAPI();
