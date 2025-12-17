#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Quality Management System...\n');

try {
    // Check if UI5 CLI is installed
    execSync('ui5 --version', { stdio: 'pipe' });
    console.log('✅ UI5 CLI found');
} catch (error) {
    console.log('❌ UI5 CLI not found. Installing...');
    execSync('npm install -g @ui5/cli', { stdio: 'inherit' });
}

try {
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    
    console.log('\n🌐 Starting development server...');
    console.log('📍 Application will be available at: http://localhost:8080');
    console.log('🔑 Login credentials:');
    console.log('   • SAP Backend: K901900 / 12345');
    console.log('   • Demo Mode: demo / demo');
    console.log('   • Admin: admin / admin\n');
    
    // Start the UI5 server
    execSync('ui5 serve --config ui5-local.yaml --open index.html', { stdio: 'inherit' });
    
} catch (error) {
    console.error('❌ Error starting application:', error.message);
    process.exit(1);
}