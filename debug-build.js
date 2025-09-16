#!/usr/bin/env node

/**
 * Debug Build Script for Gammon MM Expo
 * This script helps test different build configurations locally
 * to identify and fix Gradle issues before EAS deployment.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Gammon MM Expo - Debug Build Script');
console.log('=====================================\n');

// Check environment
function checkEnvironment() {
  console.log('📋 Checking build environment...');
  
  try {
    // Check Java
    const javaVersion = execSync('java -version', { encoding: 'utf8', stdio: 'pipe' });
    console.log('✅ Java installed');
    
    // Check Android SDK
    const androidHome = process.env.ANDROID_HOME;
    if (androidHome && fs.existsSync(androidHome)) {
      console.log('✅ Android SDK found:', androidHome);
    } else {
      console.log('❌ Android SDK not found');
      return false;
    }
    
    // Check Expo CLI
    execSync('npx expo --version', { encoding: 'utf8', stdio: 'pipe' });
    console.log('✅ Expo CLI available');
    
    return true;
  } catch (error) {
    console.log('❌ Environment check failed:', error.message);
    return false;
  }
}

// Clean build artifacts
function cleanBuild() {
  console.log('\n🧹 Cleaning build artifacts...');
  
  try {
    // Clean Gradle cache
    if (fs.existsSync('./android')) {
      execSync('cd android && .\\gradlew clean', { stdio: 'inherit' });
      console.log('✅ Gradle clean completed');
    }
    
    // Clean node modules cache
    execSync('npm cache clean --force', { stdio: 'inherit' });
    console.log('✅ NPM cache cleaned');
    
    // Clean Expo cache
    execSync('npx expo install --fix', { stdio: 'inherit' });
    console.log('✅ Expo dependencies fixed');
    
  } catch (error) {
    console.log('⚠️ Clean build warning:', error.message);
  }
}

// Test build configurations
function testBuildConfigs() {
  console.log('\n🧪 Testing build configurations...');
  
  const configs = [
    {
      name: 'Basic Development Build',
      command: 'npx expo run:android --variant debug'
    },
    {
      name: 'Release Build (Local)',
      command: 'npx expo run:android --variant release'
    }
  ];
  
  for (const config of configs) {
    console.log(`\n📱 Testing: ${config.name}`);
    console.log(`Command: ${config.command}`);
    console.log('Press Ctrl+C to skip this test\n');
    
    try {
      execSync(config.command, { stdio: 'inherit', timeout: 300000 }); // 5 min timeout
      console.log(`✅ ${config.name} - SUCCESS`);
      return true;
    } catch (error) {
      console.log(`❌ ${config.name} - FAILED`);
      console.log('Error:', error.message);
      continue;
    }
  }
  
  return false;
}

// Main execution
async function main() {
  if (!checkEnvironment()) {
    console.log('\n❌ Environment setup incomplete. Please install missing dependencies.');
    process.exit(1);
  }
  
  cleanBuild();
  
  const success = testBuildConfigs();
  
  if (success) {
    console.log('\n🎉 Local build successful! You can now deploy to EAS with confidence.');
  } else {
    console.log('\n🔍 Local build issues detected. Check the errors above for debugging.');
  }
}

// Handle script execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkEnvironment, cleanBuild, testBuildConfigs };