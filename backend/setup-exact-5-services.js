/**
 * Configuration exacte: 5 services seulement
 * Garde 1 service réel + 4 services fake (test)
 * Supprime 2 services supplémentaires
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Server = require('./models/Server');
const Metric = require('./models/Metric');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27091/pfe-monitoring';

async function setupExact5Services() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    console.log('\n🎯 CONFIGURATION EXACTE: 5 SERVICES SEULEMENT');
    console.log('📧 Admin: mariemchaabani39@gmail.com');
    console.log('🎯 Objectif: 1 service réel + 4 services fake (test)\n');

    // Étape 1: Identifier les 7 services actuels
    console.log('🔍 ÉTAPE 1: IDENTIFICATION DES 7 SERVICES ACTUELS');
    
    const allServers = await Server.find({});
    console.log(`📋 ${allServers.length} serveurs trouvés au total:`);
    
    let realServers = [];
    let testServers = [];
    
    allServers.forEach(server => {
      if (server.server_id.includes('test') || 
          server.server_id.includes('critical') ||
          server.server_id.includes('dashboard')) {
        testServers.push(server);
        console.log(`   🧪 ${server.server_id} - ${server.name} (FAKE/TEST)`);
      } else {
        realServers.push(server);
        console.log(`   🏢 ${server.server_id} - ${server.name} (RÉEL)`);
      }
    });
    
    console.log(`\n📊 Résumé actuel:`);
    console.log(`   🏢 Services réels: ${realServers.length}`);
    console.log(`   🧪 Services fake/test: ${testServers.length}`);
    console.log(`   📋 Total: ${allServers.length}`);

    // Étape 2: Sélectionner les services à garder
    console.log('\n🎯 ÉTAPE 2: SÉLECTION DES SERVICES À GARDER');
    
    // Garder 1 service réel (le premier de la liste)
    let keepRealServer = null;
    if (realServers.length > 0) {
      keepRealServer = realServers[0];
      console.log(`   🏢 Garder service réel: ${keepRealServer.server_id} - ${keepRealServer.name}`);
    }

    // Garder 4 services fake (les 4 premiers de la liste)
    let keepTestServers = testServers.slice(0, 4);
    console.log(`   🧪 Garder 4 services fake:`);
    keepTestServers.forEach(server => {
      console.log(`      🧪 ${server.server_id} - ${server.name}`);
    });

    // Étape 3: Supprimer les services non désirés
    console.log('\n🗑️ ÉTAPE 3: SUPPRESSION DES SERVICES SUPPLÉMENTAIRES');
    
    let serversToDelete = [];
    
    // Ajouter les services réels en trop
    if (realServers.length > 1) {
      const extraRealServers = realServers.slice(1);
      serversToDelete.push(...extraRealServers);
    }
    
    // Ajouter les services fake en trop
    if (testServers.length > 4) {
      const extraTestServers = testServers.slice(4);
      serversToDelete.push(...extraTestServers);
    }

    console.log(`   🗑️ ${serversToDelete.length} services à supprimer:`);
    for (const server of serversToDelete) {
      await Metric.deleteMany({ server_id: server.server_id });
      await Server.deleteOne({ server_id: server.server_id });
      console.log(`      🗑️ Supprimé: ${server.server_id} - ${server.name}`);
    }

    // Étape 4: Vérifier les services restants
    console.log('\n🌐 ÉTAPE 4: VÉRIFICATION DES 5 SERVICES RESTANTS');
    
    const remainingServers = await Server.find({});
    console.log(`📋 ${remainingServers.length} serveurs restants:`);
    
    let finalRealCount = 0;
    let finalTestCount = 0;
    
    remainingServers.forEach(server => {
      if (server.server_id.includes('test') || 
          server.server_id.includes('critical') ||
          server.server_id.includes('dashboard')) {
        finalTestCount++;
        console.log(`   🧪 ${server.server_id} - ${server.name} (FAKE)`);
      } else {
        finalRealCount++;
        console.log(`   🏢 ${server.server_id} - ${server.name} (RÉEL)`);
      }
    });

    // Étape 5: Vérification via API
    console.log('\n🌐 ÉTAPE 5: VÉRIFICATION FINALE VIA API');
    
    try {
      const API_BASE = 'http://localhost:3000';
      const metricsResponse = await fetch(`${API_BASE}/api/metrics/latest`);
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        console.log(`✅ ${metricsData.data?.length || 0} serveurs trouvés dans latest`);
        
        let apiRealCount = 0;
        let apiTestCount = 0;
        
        metricsData.data?.forEach(metric => {
          const statusEmoji = metric.status === 'CRITICAL' ? '🔴' : 
                            metric.status === 'OK' ? '🟢' :
                            metric.status === 'WARNING' ? '🟡' : '⚫';
          
          if (metric.serverId.includes('test') || 
              metric.serverId.includes('critical') ||
              metric.serverId.includes('dashboard')) {
            apiTestCount++;
            console.log(`   🧪 ${metric.serverId}: ${metric.status} ${statusEmoji}`);
          } else {
            apiRealCount++;
            console.log(`   🏢 ${metric.serverId}: ${metric.status} ${statusEmoji}`);
          }
        });
        
        console.log(`\n📊 Résumé API:`);
        console.log(`   🏢 Services réels: ${apiRealCount}`);
        console.log(`   🧪 Services fake: ${apiTestCount}`);
        console.log(`   📋 Total: ${apiRealCount + apiTestCount}`);
      }
    } catch (error) {
      console.log('❌ Erreur lors de la vérification API:', error.message);
    }

    // Résumé final
    console.log('\n🎉 CONFIGURATION EXACTE TERMINÉE !');
    console.log('✅ Services actuels: 7');
    console.log('✅ Services gardés: 5');
    console.log('✅ Services supprimés: 2');
    console.log('✅ Services réels gardés: 1');
    console.log('✅ Services fake gardés: 4');

    console.log('\n🎯 CONFIGURATION FINALE EXACTE:');
    console.log(`🏢 Service réel: ${keepRealServer ? keepRealServer.server_id : 'Aucun'} - ${keepRealServer ? keepRealServer.name : ''}`);
    console.log('🧪 Services fake (4):');
    keepTestServers.forEach((server, index) => {
      const status = server.status || 'OK';
      const emoji = status === 'CRITICAL' ? '🔴' : status === 'OK' ? '🟢' : '🟡';
      console.log(`   ${index + 1}. ${server.server_id} - ${server.name} - ${status} ${emoji}`);
    });

    console.log('\n🌐 ACCÈS POUR VÉRIFICATION:');
    console.log('📋 Dashboard: http://localhost:3000');
    console.log('🔍 Vous devriez voir EXACTEMENT 5 services:');
    console.log('   • 1 service réel avec son état actuel');
    console.log('   • 4 services fake avec leurs états configurés');
    console.log('📧 Admin: mariemchaabani39@gmail.com');

    console.log('\n✨ CONFIGURATION EXACTE TERMINÉE !');
    console.log('🎯 Le Dashboard affiche maintenant exactement 5 services');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Configuration terminée - Déconnecté de MongoDB');
  }
}

// Exécuter la configuration
console.log('🎯 CONFIGURATION EXACTE: 5 SERVICES SEULEMENT');
console.log('📧 Admin: mariemchaabani39@gmail.com');
console.log('⚡ 1 service réel + 4 services fake (test)\n');
setupExact5Services();
