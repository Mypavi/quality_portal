# Troubleshooting Guide - Quality Management System

## 🔧 Fixed Issues

### ✅ Manifest.json Configuration
- **Issue**: Missing i18n dataSource causing component load failure
- **Fix**: Added proper i18n dataSource configuration
- **Status**: RESOLVED

### ✅ JSON Structure
- **Issue**: Invalid JSON syntax in manifest.json
- **Fix**: Corrected routing configuration placement and syntax
- **Status**: RESOLVED

## 🚀 Quick Start

### Prerequisites Check
```bash
# Run diagnostic tool
node diagnose.js

# Check Node.js version (should be 14+)
node --version

# Check if UI5 CLI is installed
ui5 --version

# If not installed:
npm install -g @ui5/cli
```

### Start Application (Multiple Options)
```bash
# Method 1: Fallback page (recommended)
npm start

# Method 2: Direct app launch
npm run start-app

# Method 3: Local development mode
npm run start-local

# Method 4: Test UI5 CDN connectivity
npm run test-ui5
```

### Login Credentials
- **SAP Backend**: `K901900` / `12345`
- **Demo Mode**: `demo` / `demo`
- **Admin**: `admin` / `admin`

## 🔍 Common Issues & Solutions

### 1. UI5 Resource Loading Errors
**Symptoms**: "failed to load 'sap/m/Icon.js'" or "script load error"
**Solution**: 
- Check internet connectivity: `npm run test-ui5`
- Use fallback page: `npm start` (opens fallback.html)
- Try local mode: `npm run start-local`
- Use specific UI5 version in index.html

### 2. Component Load Errors
**Symptoms**: "Failed to load component" or "dataSource not found"
**Solution**: 
- Check manifest.json syntax
- Verify all dataSources are properly defined
- Ensure i18n dataSource exists

### 2. Routing Issues
**Symptoms**: Views not loading, navigation errors
**Solution**:
- Verify routing configuration in manifest.json
- Check controller and view file names match routing targets
- Ensure App.view.xml has correct structure

### 3. SAP Backend Connection
**Symptoms**: Authentication failures, data not loading
**Solution**:
- Check if SAP backend is accessible: `http://172.17.19.24:8000`
- Verify proxy configuration in ui5-local.yaml
- Use demo mode as fallback: login with `demo`/`demo`

### 4. CORS Issues
**Symptoms**: Network errors, blocked requests
**Solution**:
- Ensure ui5-local.yaml proxy is configured
- Check SAP backend CORS settings
- Use mock data mode for development

### 5. Model Loading Issues
**Symptoms**: Data not displaying, model errors
**Solution**:
- Check OData service URLs
- Verify metadata.xml structure
- Use browser network tab to debug requests

## 🧪 Testing Modes

### 1. Real SAP Backend
```bash
npm start
# Login with: K901900 / 12345
```

### 2. Mock Data Mode
```bash
npm run start-mock
# Login with: demo / demo
```

### 3. Debug Mode
```bash
ui5 serve --config ui5-local.yaml --open "index.html?sap-ui-debug=true"
```

## 📊 Service Testing

### Built-in Testing
1. Login to Dashboard
2. Click "Test Services" button
3. View connectivity results

### Manual API Testing
```bash
# Test authentication
curl "http://172.17.19.24:8000/sap/opu/odata/sap/ZQM_LOG_PR_CDS/ZQM_LOG_PR(bname='K901900',password='12345')"

# Test inspection lots
curl "http://172.17.19.24:8000/sap/opu/odata/sap/ZQM_INSPECT_PR_CDS/ZQM_INSPECT_PR?$format=json"
```

## 🔧 Development Tools

### Browser Console
- Check for JavaScript errors
- Monitor network requests
- View model data

### UI5 Inspector
- Install UI5 Inspector browser extension
- Inspect controls and models
- Debug binding issues

### Network Tab
- Monitor OData requests
- Check response status codes
- Verify request/response data

## 📁 File Structure Verification

Ensure these files exist:
```
quality/
├── webapp/
│   ├── controller/
│   │   ├── App.controller.js ✅
│   │   ├── Login.controller.js ✅
│   │   ├── Dashboard.controller.js ✅
│   │   ├── ResultRecording.controller.js ✅
│   │   └── UsageDecision.controller.js ✅
│   ├── view/
│   │   ├── App.view.xml ✅
│   │   ├── Login.view.xml ✅
│   │   ├── Dashboard.view.xml ✅
│   │   ├── ResultRecording.view.xml ✅
│   │   └── UsageDecision.view.xml ✅
│   ├── model/
│   │   └── models.js ✅
│   ├── css/
│   │   └── style.css ✅
│   ├── i18n/
│   │   └── i18n.properties ✅
│   ├── localService/
│   │   ├── metadata.xml ✅
│   │   └── mockdata/ ✅
│   ├── manifest.json ✅
│   ├── Component.js ✅
│   └── index.html ✅
├── ui5-local.yaml ✅
├── ui5.yaml ✅
└── package.json ✅
```

## 🆘 Emergency Fallback

If all else fails, use the test.html file:
```bash
# Start a simple HTTP server
python -m http.server 8080
# or
npx http-server

# Open: http://localhost:8080/test.html
```

## 📞 Support Checklist

Before seeking help, verify:
- [ ] Node.js version 14+
- [ ] UI5 CLI installed
- [ ] All files present
- [ ] manifest.json valid JSON
- [ ] SAP backend accessible
- [ ] Browser console checked
- [ ] Network tab reviewed

---

**Status**: All major issues resolved ✅  
**Application**: Ready for use 🚀