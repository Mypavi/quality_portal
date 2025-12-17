#!/usr/bin/env node

const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

console.log('🔍 Quality Management System - Diagnostic Tool\n');

// Test 1: Node.js version
console.log('1. Node.js Version:');
try {
    const nodeVersion = process.version;
    console.log(`   ✅ Node.js: ${nodeVersion}`);
    
    if (parseInt(nodeVersion.slice(1)) < 14) {
        console.log('   ⚠️  Warning: Node.js 14+ recommended');
    }
} catch (error) {
    console.log('   ❌ Node.js check failed');
}

// Test 2: UI5 CLI
console.log('\n2. UI5 CLI:');
try {
    const ui5Version = execSync('ui5 --version', { encoding: 'utf8' }).trim();
    console.log(`   ✅ UI5 CLI: ${ui5Version}`);
} catch (error) {
    console.log('   ❌ UI5 CLI not found - run: npm install -g @ui5/cli');
}

// Test 3: Internet connectivity
console.log('\n3. Internet Connectivity:');
testUrl('https://ui5.sap.com/1.120.17/resources/sap-ui-core.js', 'UI5 CDN');
testUrl('https://google.com', 'General Internet');

// Test 4: SAP Backend connectivity
console.log('\n4. SAP Backend Connectivity:');
testUrl('http://172.17.19.24:8000/sap/opu/odata/sap/ZQM_LOG_PR_CDS/', 'SAP Authentication Service', false);
testUrl('http://172.17.19.24:8000/sap/opu/odata/sap/ZQM_INSPECT_PR_CDS/', 'SAP Inspection Service', false);

// Test 5: Local files
console.log('\n5. Local Files Check:');
const fs = require('fs');
const path = require('path');

const requiredFiles = [
    'webapp/manifest.json',
    'webapp/Component.js',
    'webapp/index.html',
    'webapp/view/App.view.xml',
    'webapp/controller/App.controller.js',
    'package.json'
];

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`   ✅ ${file}`);
    } else {
        console.log(`   ❌ ${file} - Missing!`);
    }
});

// Test 6: Package.json dependencies
console.log('\n6. Dependencies:');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const devDeps = packageJson.devDependencies || {};
    
    if (devDeps['@ui5/cli']) {
        console.log(`   ✅ @ui5/cli: ${devDeps['@ui5/cli']}`);
    } else {
        console.log('   ⚠️  @ui5/cli not in devDependencies');
    }
} catch (error) {
    console.log('   ❌ Error reading package.json');
}

// Test 7: Manifest.json validation
console.log('\n7. Manifest Validation:');
try {
    const manifest = JSON.parse(fs.readFileSync('webapp/manifest.json', 'utf8'));
    
    if (manifest['sap.app'] && manifest['sap.app'].id) {
        console.log(`   ✅ App ID: ${manifest['sap.app'].id}`);
    }
    
    if (manifest['sap.ui5'] && manifest['sap.ui5'].dependencies) {
        console.log('   ✅ UI5 dependencies defined');
    }
    
    if (manifest['sap.app'] && manifest['sap.app'].dataSources && manifest['sap.app'].dataSources.i18n) {
        console.log('   ✅ i18n dataSource configured');
    } else {
        console.log('   ❌ i18n dataSource missing');
    }
    
} catch (error) {
    console.log('   ❌ Manifest.json validation failed:', error.message);
}

console.log('\n🎯 Recommendations:');
console.log('1. If UI5 CDN fails, use: npm run start-local');
console.log('2. If SAP backend fails, use demo mode (demo/demo)');
console.log('3. For development, use: npm run start (opens fallback page)');
console.log('4. For direct app access, use: npm run start-app');

function testUrl(url, name, isHttps = true) {
    const client = isHttps ? https : http;
    
    client.get(url, (res) => {
        if (res.statusCode === 200) {
            console.log(`   ✅ ${name}: Available (${res.statusCode})`);
        } else {
            console.log(`   ⚠️  ${name}: Status ${res.statusCode}`);
        }
    }).on('error', (err) => {
        console.log(`   ❌ ${name}: ${err.message}`);
    });
}