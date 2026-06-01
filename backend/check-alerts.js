/**
 * Script pour vérifier et expliquer les alertes de backup
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Alert = require('./models/Alert');

async function checkAlerts() {
  try {
    await mongoose.connect('mongodb://localhost:27017/pfe-monitoring');
    console.log('✅ Connecté à MongoDB');

    const alerts = await Alert.find({}).sort({ timestamp: -1 }).limit(10);
    console.log('\n📋 DERNIÈRES ALERTES DE BACKUP:\n');
    
    alerts.forEach((alert, index) => {
      console.log(`${index + 1}. 🚨 Alerte #${alert._id.toString().slice(-6)}`);
      console.log(`   🖥️  Serveur: ${alert.serverId}`);
      console.log(`   📅 Date: ${alert.timestamp.toLocaleString()}`);
      console.log(`   📝 Type: ${alert.type}`);
      console.log(`   ⚠️  Sévérité: ${alert.severity}`);
      console.log(`   📊 Statut: ${alert.status}`);
      console.log(`   💬 Message: ${alert.message}`);
      console.log(`   📈 Valeur: ${alert.value} | Seuil: ${alert.threshold}`);
      console.log('');
    });

    // Compter les types d'alertes
    const alertTypes = {};
    alerts.forEach(alert => {
      alertTypes[alert.type] = (alertTypes[alert.type] || 0) + 1;
    });

    console.log('📊 RÉPARTITION DES ALERTES:');
    Object.entries(alertTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
}

checkAlerts();
