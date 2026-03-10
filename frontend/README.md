# Flowops Frontend

A modern React-based frontend for the Flowops system built with Tailwind CSS and shadcn/ui components.

## 📁 Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── layout/       # Layout components
│   │   └── common/       # Common components
│   ├── pages/            # Application pages organized by feature
│   │   ├── auth/         # Login, Register
│   │   ├── dashboard/    # Dashboard
│   │   ├── leads/        # Lead management
│   │   ├── products/     # Product management
│   │   ├── entities/     # Entity management
│   │   ├── sales/        # Sales operations (BOQ, Orders, Invoices, etc.)
│   │   └── documents/    # Document management
│   ├── context/          # React context providers
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and API configuration
│   ├── App.js            # Main application component
│   └── index.js          # Application entry point
├── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment:**

   - Set `REACT_APP_BACKEND_URL` to your backend URL

3. **Start development server:**
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000`

## 🎨 Design System

### Technology Stack

- **React 18** - UI framework
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality component library
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **React Hook Form** - Form handling

### Design Philosophy

- **Performance Pro Theme** - Professional B2B aesthetic
- **Typography:** Plus Jakarta Sans + Inter + JetBrains Mono
- **Colors:** Deep Obsidian primary with Royal Blue accents
- **Responsive Design** - Mobile-first approach

## 🏗️ Architecture

### Clean Component Organization

- **Feature-based page structure** for better maintainability
- **Centralized component exports** using index files
- **Separation of concerns** between UI, business logic, and data

### Key Features

- JWT-based authentication
- Multi-channel CRM functionality
- Real-time dashboard
- File upload capabilities
- Professional forms with validation
- Responsive design system

## 🔧 Development

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests

### Code Organization

- **Pages:** Feature-based organization in `/pages`
- **Components:** Reusable UI components in `/components`
- **Hooks:** Custom React hooks in `/hooks`
- **Utils:** Helper functions in `/lib`
- **Context:** React context providers in `/context`

### Import Structure

Clean imports using barrel exports:

```javascript
import { Login, Dashboard } from "./pages";
import { Layout, Button } from "./components";
```
