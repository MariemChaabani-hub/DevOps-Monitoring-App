/**
 * Test forcé d'envoi d'email réel pour backup échoué
 * Recharge les variables d'environnement et envoie un vrai email
 */

// Forcer le rechargement des variables d'environnement
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const mongoose = require('mongoose');
const Backup = require('./models/Backup');
const Server = require('./models/Server');

// Importer EmailService après le chargement des variables
const emailService = require('./services/emailService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pfe-monitoring';

async function testForceRealEmail() {
  try {
    console.log('🔧 Vérification des variables d\'environnement:');
    console.log(`   EMAIL_USER: ${process.env.EMAIL_USER || 'NON DÉFINI'}`);
    console.log(`   EMAIL_PASS: ${process.env.EMAIL_PASS ? 'CONFIGURÉ' : 'NON DÉFINI'}`);
    console.log(`   ADMIN_EMAIL: ${process.env.ADMIN_EMAIL || 'NON DÉFINI'}`);
    
    // Connexion à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('\n✅ Connecté à MongoDB');

    // Créer un serveur de test
    const server = new Server({
      server_id: 'force-email-test-' + Date.now(),
      name: 'Force Email Test Server',
      hostname: 'force-email-test',
      ip: '192.168.1.200'
    });
    await server.save();
    console.log(`✅ Serveur créé: ${server.server_id}`);

    // Créer un backup échoué
    const failedBackup = new Backup({
      serverId: server.server_id,
      date: new Date(),
      status: 'FAILED',
      size: 0,
      duration: 30
    });
    await failedBackup.save();
    console.log('✅ Backup échoué créé');

    // Préparer les données pour l'email
    const emailData = {
      serverId: server.server_id,
      type: 'BACKUP_FAILED',
      severity: 'CRITICAL',
      status: 'FAILED',
      duration: 30,
      size: 0,
      date: new Date(),
      message: `Backup failed for server ${server.server_id}`,
      timestamp: new Date(),
      adminEmail: 'mariemchaabani39@gmail.com'
    };

    console.log('\n📧 Test direct d\'envoi d\'email...');
    
    // Envoyer l'email directement avec l'instance exportée
    const result = await emailService.sendBackupAlertEmail(emailData);
    
    console.log('\n🎉 RÉSULTAT DE L\'ENVOI D\'EMAIL:');
    console.log(`   ✅ Success: ${result.success}`);
    console.log(`   📧 Mode: ${result.mode}`);
    console.log(`   📨 Message ID: ${result.messageId || 'N/A'}`);
    console.log(`   ⚠️  Error: ${result.error || 'Aucune'}`);

    if (result.mode === 'real') {
      console.log('\n🎉 EMAIL RÉEL ENVOYÉ AVEC SUCCÈS!');
      console.log('📧 Vérifiez votre boîte mail: mariemchaabani39@gmail.com');
      console.log('📨 Sujet: 🚨 [CRITICAL] Backup Failed on Server ' + server.server_id);
    } else {
      console.log('\n⚠️  Mode démo - Email non envoyé réellement');
      console.log('💡 Pour envoyer des vrais emails, assurez-vous que:');
      console.log('   - EMAIL_USER est configuré');
      console.log('   - EMAIL_PASS est un mot de passe d\'application Gmail valide');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('💡 Vérifiez votre connexion internet et les credentials Gmail');
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Test terminé');
  }
}

// Exécuter le test
console.log('🚀 TEST FORCÉ D\'ENVOI D\'EMAIL RÉEL');
console.log('📧 Destinataire: mariemchaabani39@gmail.com');
console.log('⚡ Test avec rechargement des variables d\'environnement...\n');
testForceRealEmail();
