/**
 * Script pour tester l'historique des backups par serveur
 * Montre comment accéder à l'historique complet
 */

const mongoose = require('mongoose');
const Backup = require('./models/Backup');
const Server = require('./models/Server');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pfe-monitoring';

async function showBackupHistory() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB\n');

    // Récupérer tous les serveurs
    const servers = await Server.find({});
    
    for (const server of servers) {
      console.log(`📋 Historique des backups pour: ${server.server_id}`);
      console.log('='.repeat(50));
      
      // Récupérer tous les backups pour ce serveur
      const backups = await Backup.find({ serverId: server.server_id })
        .sort({ date: -1 })
        .limit(10);
      
      if (backups.length === 0) {
        console.log('❌ Aucun backup trouvé\n');
        continue;
      }
      
      backups.forEach((backup, index) => {
        const date = backup.date.toLocaleDateString();
        const time = backup.date.toLocaleTimeString();
        const statusIcon = backup.status === 'OK' ? '✅' : 
                          backup.status === 'FAILED' ? '❌' : '⏰';
        
        console.log(`${index + 1}. ${statusIcon} ${date} ${time}`);
        console.log(`   Statut: ${backup.status}`);
        console.log(`   Taille: ${backup.size}MB`);
        console.log(`   Durée: ${backup.duration}s`);
        console.log('');
      });
      
      console.log('\n' + '='.repeat(70) + '\n');
    }
    
    // Statistiques globales
    const totalBackups = await Backup.countDocuments();
    const okBackups = await Backup.countDocuments({ status: 'OK' });
    const failedBackups = await Backup.countDocuments({ status: 'FAILED' });
    const lateBackups = await Backup.countDocuments({ status: 'LATE' });
    
    console.log('📊 Statistiques globales:');
    console.log(`Total backups: ${totalBackups}`);
    console.log(`✅ Réussis: ${okBackups} (${((okBackups/totalBackups)*100).toFixed(1)}%)`);
    console.log(`❌ Échoués: ${failedBackups} (${((failedBackups/totalBackups)*100).toFixed(1)}%)`);
    console.log(`⏰ En retard: ${lateBackups} (${((lateBackups/totalBackups)*100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
  }
}

showBackupHistory();
