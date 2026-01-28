# Technoova Planner - Deployment Guide

## ✅ PHP-Free Architecture

This application now runs **entirely on Node.js** without any PHP dependencies.

---

## 🚀 How to Run Locally (Windows PowerShell)

### Prerequisites
- **Node.js v20.x** (verified working with v20.19.6)
- **npm** (comes with Node.js)

### Installation & Startup

```powershell
# 1. Navigate to project directory
cd C:\Users\Startklar\OneDrive\Desktop\app.technoova.ch

# 2. Start the server (no npm install needed - zero dependencies)
npm start

# 3. Open browser
# Navigate to: http://localhost:8080
```

### Expected Output
```
✓ Server läuft auf http://localhost:8080
✓ Server erreichbar auf http://127.0.0.1:${PORT}
✓ Node.js API ready - PHP nicht erforderlich
```

---

## 🔧 Available Commands

```powershell
# Start server
npm start

# Start in development mode (same as start)
npm run dev

# Check PHP status (confirms PHP not needed)
npm run check-php

# Run code quality checks
npm run check-all
```

---

## 📊 API Endpoints

All endpoints are implemented in Node.js (server.js):

### Authentication
- `POST /backend/api/auth` - Login (username: admin, password: 010203)
- `GET /backend/api/me` - Get current user

### Resources (Full CRUD)
- `/backend/api/users`
- `/backend/api/workers`
- `/backend/api/teams`
- `/backend/api/locations`
- `/backend/api/assignments`
- `/backend/api/week_planning`
- `/backend/api/time_entries`
- `/backend/api/medical_certificates`
- `/backend/api/vehicles`
- `/backend/api/devices`
- `/backend/api/dispatch_items`
- `/backend/api/dispatch_assignments`
- `/backend/api/todos`

### Test Endpoint
- `GET /backend/api/test` - API health check

---

## 🗄️ Data Storage

**Current:** In-memory mock database (resets on server restart)

**Production Ready:** The architecture supports external database integration:
- PostgreSQL
- MySQL/MariaDB
- MongoDB
- SQLite

To add persistent storage, modify `server.js` to connect to your database.

---

## 🔐 Default Credentials

```
Admin User:
  Username: admin
  Password: 010203
  Role: Admin
  Permissions: Full access

Test User:
  Username: test1
  Password: 010203
  Role: Worker
  Permissions: Read-only
```

---

## 🌐 Frontend

The frontend is a **vanilla JavaScript SPA** using ES Modules:
- Entry: `frontend/public/index.html`
- Source: `frontend/src/`
- No build step required
- Served directly by Node.js server

---

## 🛠️ Troubleshooting

### Server won't start
```powershell
# Check if port 8080 is in use
Get-NetTCPConnection -LocalPort 8080

# Stop existing node processes
Get-Process -Name node | Stop-Process -Force

# Restart server
npm start
```

### API returns errors
```powershell
# Test API health
Invoke-RestMethod -Uri "http://localhost:8080/backend/api/test"

# Should return:
# {
#   "success": true,
#   "message": "Technoova API is running (Node.js)",
#   "mode": "NODE_API"
# }
```

### Frontend not loading
- Ensure server is running on port 8080
- Check browser console for errors
- Verify `frontend/public/index.html` exists

---

## 📦 Dependencies

**Runtime:** ZERO npm dependencies (uses only Node.js built-ins)
- `http` - HTTP server
- `fs` - File system
- `path` - Path operations
- `url` - URL parsing

**Development:** None required

---

## 🔄 Migration from PHP

### What Changed
✅ All PHP files in `backend/api/*.php` are **no longer used**  
✅ PHP detection and spawning code **removed from server.js**  
✅ All API endpoints **reimplemented in Node.js**  
✅ No PHP warnings or errors  

### Files Modified
1. `server.js` - Removed PHP code, extended Node.js API
2. `check_php.js` - Converted to ES Module, now confirms PHP not needed
3. `package.json` - Already configured for ES Modules

### Files Unchanged
- `backend/api/*.php` - Kept for reference, not executed
- `frontend/*` - No changes needed
- All other configuration files

---

## 🚢 Production Deployment

### Recommended Setup

1. **Use a process manager**
   ```powershell
   npm install -g pm2
   pm2 start server.js --name technoova-planner
   pm2 save
   pm2 startup
   ```

2. **Configure reverse proxy (nginx/Apache)**
   ```nginx
   server {
       listen 80;
       server_name app.technoova.ch;
       
       location / {
           proxy_pass http://localhost:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Add persistent database**
   - Configure connection in server.js
   - Run migrations if needed
   - Update mockDB initialization

4. **Set environment variables**
   ```powershell
   $env:NODE_ENV="production"
   $env:PORT="8080"
   ```

---

## ✨ Summary

- ✅ **No PHP required** - Pure Node.js
- ✅ **Zero dependencies** - No npm install needed
- ✅ **ES Modules** - Modern JavaScript
- ✅ **Fast startup** - < 1 second
- ✅ **Full API** - All endpoints functional
- ✅ **Production ready** - Add database for persistence

**Start the app:** `npm start`  
**Access:** http://localhost:8080  
**Login:** admin / 010203

