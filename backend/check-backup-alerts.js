/**
 * Script pour vérifier uniquement les alertes de backup
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Alert = require('./models/Alert');

async function checkBackupAlerts() {
  try {
    await mongoose.connect('mongodb://localhost:27017/pfe-monitoring');
    console.log('✅ Connecté à MongoDB');

    const backupAlerts = await Alert.find({ metric: 'backup_status' }).sort({ timestamp: -1 });
    console.log('\n📋 ALERTES DE BACKUP SPÉCIFIQUES:\n');
    
    if (backupAlerts.length === 0) {
      console.log('❌ Aucune alerte de backup trouvée dans la base de données');
      console.log('💡 Les alertes de backup créées lors des tests ne sont peut-être pas enregistrées');
    } else {
      backupAlerts.forEach((alert, index) => {
        console.log(`${index + 1}. 🚨 Alerte Backup`);
        console.log(`   🖥️  Serveur: ${alert.serverId}`);
        console.log(`   📅 Date: ${alert.timestamp.toLocaleString()}`);
        console.log(`   📝 Type: ${alert.type}`);
        console.log(`   ⚠️  Sévérité: ${alert.severity}`);
        console.log(`   📊 Statut: ${alert.status}`);
        console.log(`   💬 Message: ${alert.message}`);
        console.log('');
      });
    }

    // Vérifier les backups récents
    const Backup = require('./models/Backup');
    const recentBackups = await Backup.find({}).sort({ date: -1 }).limit(5);
    console.log('📦 BACKUPS RÉCENTS:\n');
    
    if (recentBackups.length === 0) {
      console.log('❌ Aucun backup trouvé');
    } else {
      recentBackups.forEach((backup, index) => {
        console.log(`${index + 1}. 📦 Backup`);
        console.log(`   🖥️  Serveur: ${backup.serverId}`);
        console.log(`   📅 Date: ${backup.date.toLocaleString()}`);
        console.log(`   📊 Statut: ${backup.status}`);
        console.log(`   💾 Taille: ${backup.size} MB`);
        console.log(`   ⏱️  Durée: ${backup.duration}s`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
}

checkBackupAlerts();
