/**
 * One-off cleanup for a stray test server (e.g. one created by running the
 * agent manually with MONITORING_SERVER_ID=test for backup testing) —
 * nothing in this app ever removes a Server document automatically, so a
 * throwaway test id stays visible in GET /api/servers (and therefore on
 * both the web and mobile dashboards) forever until removed by hand.
 *
 * Removes the Server document and every associated document across the
 * collections that carry a server id: Metric, Alert, Backup, Service,
 * AuditLog — field name varies per collection (server_id vs serverId, see
 * each model), handled explicitly below rather than assumed.
 *
 * Defaults to a dry run (prints what would be deleted, deletes nothing).
 * Pass --apply to actually delete.
 *
 * Usage:
 *   MONGODB_URI="mongodb+srv://..." node cleanup-test-server.js <server_id>
 *   MONGODB_URI="mongodb+srv://..." node cleanup-test-server.js <server_id> --apply
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Server = require('./models/Server');
const Metric = require('./models/Metric');
const Alert = require('./models/Alert');
const Backup = require('./models/Backup');
const Service = require('./models/Service');
const AuditLog = require('./models/AuditLog');

const APPLY = process.argv.includes('--apply');
const serverId = process.argv[2];
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pfe-monitoring';

if (!serverId || serverId === '--apply') {
  console.error('Usage: node cleanup-test-server.js <server_id> [--apply]');
  process.exit(1);
}

// Field name isn't consistent across collections in this project — see
// this week's naming-bug fixes (Alert/Backup use serverId, Server/Metric/
// Service/AuditLog use server_id).
const TARGETS = [
  { label: 'Server (le document lui-même)', model: Server, filter: { server_id: serverId } },
  { label: 'Metric', model: Metric, filter: { server_id: serverId } },
  { label: 'Alert', model: Alert, filter: { serverId } },
  { label: 'Backup', model: Backup, filter: { serverId } },
  { label: 'Service', model: Service, filter: { server_id: serverId } },
  { label: 'AuditLog', model: AuditLog, filter: { server_id: serverId } },
];

async function cleanupTestServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`Connecté à MongoDB (${APPLY ? 'mode application' : 'mode simulation (dry run)'})`);
    console.log(`Cible : server_id = "${serverId}"\n`);

    const server = await Server.findOne({ server_id: serverId }).lean();
    if (!server) {
      console.log(`Aucun document Server trouvé pour "${serverId}" — rien à faire (peut-être déjà supprimé, ou mauvais id).`);
      return;
    }
    console.log(`Server trouvé : name="${server.name}", is_active=${server.is_active}, status=${server.status}\n`);

    let totalToDelete = 0;
    for (const { label, model, filter } of TARGETS) {
      const count = await model.countDocuments(filter);
      totalToDelete += count;
      console.log(`  ${label} : ${count} document(s)`);
    }

    if (totalToDelete === 0) {
      console.log('\nRien à supprimer.');
      return;
    }

    if (!APPLY) {
      console.log('\nDry run — aucune suppression effectuée. Relancer avec --apply pour supprimer réellement.');
      return;
    }

    console.log('');
    for (const { label, model, filter } of TARGETS) {
      const result = await model.deleteMany(filter);
      console.log(`  ${label} : ${result.deletedCount} supprimé(s)`);
    }
    console.log(`\nTerminé — server_id "${serverId}" et ses documents associés ont été supprimés.`);
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Déconnecté de MongoDB');
  }
}

cleanupTestServer();
