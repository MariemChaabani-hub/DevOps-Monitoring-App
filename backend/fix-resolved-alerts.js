/**
 * One-off fix-up for alerts stuck as status: 'RESOLVED' with resolvedAt: null.
 *
 * Caused by routes/alerts.js's PUT /:alert_id/resolve writing `resolved_at`
 * (snake_case) instead of `resolvedAt` — silently dropped under the old
 * strict:true default, so `status` flipped to RESOLVED but `resolvedAt`
 * never got set. Now fixed at the source (routes/alerts.js + Alert.js's
 * strict: 'throw'); this script repairs the documents already affected.
 *
 * There's no way to recover the *real* resolution time, so this uses each
 * document's own `updatedAt` (set by Mongoose's timestamps option) as the
 * best available approximation — that's exactly when the broken write
 * happened and `status` flipped to RESOLVED.
 *
 * Defaults to a dry run (prints what would change, writes nothing). Pass
 * --apply to actually update the documents.
 *
 * Usage:
 *   MONGODB_URI="mongodb+srv://..." node fix-resolved-alerts.js
 *   MONGODB_URI="mongodb+srv://..." node fix-resolved-alerts.js --apply
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Alert = require('./models/Alert');

const APPLY = process.argv.includes('--apply');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pfe-monitoring';

async function fixResolvedAlerts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`Connecté à MongoDB (${APPLY ? 'mode application' : 'mode simulation (dry run)'})`);

    const affected = await Alert.find({ status: 'RESOLVED', resolvedAt: null });
    console.log(`\n${affected.length} alerte(s) RESOLVED avec resolvedAt: null trouvée(s).\n`);

    if (affected.length === 0) {
      console.log('Rien à corriger.');
      return;
    }

    console.log('Aperçu (5 premières) :');
    for (const alert of affected.slice(0, 5)) {
      console.log(`  ${alert._id} | ${alert.serverId} | ${alert.metric} | timestamp=${alert.timestamp?.toISOString()} | updatedAt=${alert.updatedAt?.toISOString()}`);
    }

    if (!APPLY) {
      console.log('\nDry run — aucune écriture effectuée. Relancer avec --apply pour corriger.');
      return;
    }

    let fixed = 0;
    for (const alert of affected) {
      alert.resolvedAt = alert.updatedAt;
      await alert.save();
      fixed++;
    }

    console.log(`\n${fixed} alerte(s) corrigée(s) (resolvedAt = updatedAt).`);
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Déconnecté de MongoDB');
  }
}

fixResolvedAlerts();
