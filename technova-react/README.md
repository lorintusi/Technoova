# Technova React + TypeScript

Dies ist die **moderne React + TypeScript Implementation** von Technova.

## 🎯 Ziel

Parallele Entwicklung einer robusten, typsicheren Version der Technova-Plattform, die schrittweise die bestehende Vanilla JS Version ersetzen kann.

## 🏗️ Tech Stack

- **React 18** - Modern UI Library mit Hooks
- **TypeScript 5** - Vollständige Typsicherheit
- **Vite** - Schneller Build & Dev Server
- **@dnd-kit** - Moderne Drag & Drop Library
- **Zustand** - Lightweight State Management
- **React Query** - Server State Management
- **TailwindCSS** - Utility-First CSS Framework
- **Vitest** - Unit Testing
- **Playwright** - E2E Testing

## 📁 Projekt-Struktur

```
technova-react/
├── src/
│   ├── components/        # Reusable UI Components
│   │   ├── ui/           # Base UI Components (Button, Input, Badge, etc.)
│   │   ├── layout/       # Layout Components (Topbar, Sidebar, etc.)
│   │   └── features/     # Feature-specific Components
│   ├── features/          # Feature Modules
│   │   ├── assignments/  # Assignment Management
│   │   ├── locations/    # Location Management
│   │   ├── resources/    # Resource Management (Workers, Vehicles, Devices)
│   │   └── planning/     # Planning Board & Dispatch
│   ├── lib/              # Utilities & Helpers
│   │   ├── api/          # API Client
│   │   ├── hooks/        # Custom React Hooks
│   │   ├── utils/        # Helper Functions
│   │   └── types/        # TypeScript Types & Interfaces
│   ├── stores/           # Zustand Stores
│   ├── App.tsx           # Main App Component
│   └── main.tsx          # Entry Point
├── public/               # Static Assets
├── tests/                # Test Files
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## 📋 Migration Strategy

### Phase 1: Core Infrastructure ✅
- [x] Project Setup (Vite + React + TypeScript)
- [x] Folder Structure
- [x] TypeScript Types & Interfaces
- [ ] API Client Setup
- [ ] State Management (Zustand Stores)
- [ ] Router Setup

### Phase 2: UI Foundation
- [ ] Design System (Base Components)
- [ ] Layout Components
- [ ] Topbar & Navigation
- [ ] Sidebar Component
- [ ] Drawer System
- [ ] Toast/Notification System

### Phase 3: Core Features
- [ ] Planning Board (Weekly View)
- [ ] Dispatch Card Component
- [ ] Resource Sidebar
- [ ] Location Management
- [ ] Drag & Drop System (@dnd-kit)

### Phase 4: Business Logic
- [ ] Einsatzort-Pflicht-Regel
- [ ] Konflikt-Engine (Zeitüberschneidungen)
- [ ] Resource Assignment Logic
- [ ] Status Management

### Phase 5: Advanced Features
- [ ] Realtime Updates (WebSocket)
- [ ] Conflict Resolution
- [ ] Undo/Redo
- [ ] Offline Support

### Phase 6: Testing & Quality
- [ ] Unit Tests (Vitest)
- [ ] Integration Tests
- [ ] E2E Tests (Playwright)
- [ ] Accessibility Audit

### Phase 7: Deployment
- [ ] CI/CD Pipeline
- [ ] Production Build
- [ ] Performance Optimization
- [ ] Migration from Vanilla JS

## 🎨 Design Principles

1. **Type Safety First** - Alles ist typisiert
2. **Component Isolation** - Klare Verantwortlichkeiten
3. **Testability** - Einfach testbare Komponenten
4. **Performance** - Optimierte Rendering-Strategie
5. **Accessibility** - WCAG 2.1 AA Standard

## 🔑 Key Technical Decisions

### Warum @dnd-kit statt react-dnd?
- Modernere API
- Bessere TypeScript-Unterstützung
- Performanter
- Accessibility-fokussiert

### Warum Zustand statt Redux?
- Einfachere API
- Weniger Boilerplate
- Bessere TypeScript-Integration
- Kleinere Bundle Size

### Warum TailwindCSS?
- Consistency durch Utility Classes
- Schnellere Entwicklung
- Tree-Shaking für optimale Bundle Size
- Kein CSS-in-JS Overhead

## 📝 Notes

- Diese Version läuft **parallel** zur bestehenden Vanilla JS Version
- Backend-API bleibt unverändert (PHP)
- Schrittweise Migration möglich (Feature by Feature)
- Beide Versionen teilen sich das Backend

---

**Status:** 🚧 In Entwicklung  
**Letzte Aktualisierung:** 2026-01-28

