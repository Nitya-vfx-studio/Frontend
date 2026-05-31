# Nitya VFX Studio — Frontend

Welcome to the frontend application for **Nitya VFX Studio**, a comprehensive web portal designed to streamline project management, shot tracking, artist workflows, invoicing, and financial management for high-end Visual Effects (VFX) production.

Built on a modern React + Vite architecture, this application provides an immersive, premium, and fully responsive user interface featuring glassmorphic designs, subtle transitions, and high-productivity workflows.

---

## 🚀 Key Features

*   **🎬 Comprehensive Project & Shot Dashboard**: Track active projects, manage shot pipelines (3D, Animation, Lighting, Compositing, etc.), view real-time statuses, and assign multi-user responsibilities.
*   **👥 Artist Portal**: A dedicated workspace for artists to check their assigned tasks, log active work time, view supervisors' precise frame annotations/feedback, and track salaries.
*   **💼 Financial & Invoice Management**: Create, customize, export, and track status for client invoices, outsource payments, and artist payrolls with inline editing and Excel spreadsheet outputs.
*   **🛠️ Outsource Pipelines**: Assign shots, entire sequences, or tasks to external studios and track delivery status, costs, and quality feedback loops.
*   **📊 Batches & Timelogs**: Track delivery batches, manage daily work duration logging, and review comprehensive historic work records.

---

## 🛠️ Tech Stack & Architecture

*   **Core Framework**: [React (v18.3)](https://react.dev/) — Interactive UI components with context-driven state management.
*   **Build Tool**: [Vite (v5.3)](https://vitejs.dev/) — Fast, hot-reloading bundler.
*   **Routing**: [React Router DOM (v6.24)](https://reactrouter.com/) — Declarative client-side routing.
*   **HTTP Client**: [Axios](https://axios-http.com/) — Modern API calling with automatic interceptors for authorization headers and authentication token expirations.
*   **Data Exports**: [XLSX (SheetJS)](https://sheetjs.com/) — Native Excel generation for financials and project status reports.

---

## 📂 Directory Structure

```bash
frontend/
├── dist/                  # Compiled production-ready bundle
├── public/                # Static assets (favicons, logos)
├── src/
│   ├── components/        # Reusable UI components (Layout, Status Badges, Modals)
│   ├── config/            # Application constants and static configurations
│   ├── contexts/          # React Context providers (Auth contexts)
│   ├── hooks/             # Custom state and effect hooks
│   ├── pages/             # Layout pages (Login, Projects, Artist Portal, Invoices, etc.)
│   ├── services/          # API services wrapper & Axios apiClient interceptor
│   ├── utils/             # Helper functions (date formatting, calculation utils)
│   ├── App.jsx            # Main app entry, routes definition
│   ├── index.css          # Core design system and global typography/styles
│   └── main.jsx           # App mounting point
├── vite.config.js         # Dev server proxies, ports, & bundler settings
├── .gitignore             # Git ignored files & directories config
└── README.md              # Application documentation
```

---

## ⚙️ Installation & Getting Started

### 📋 Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18+ recommended) and `npm` installed on your machine.

### 📥 Setup Instructions

1.  **Navigate into the directory**:
    ```bash
    cd "frontend"
    ```

2.  **Install project dependencies**:
    ```bash
    npm install
    ```

3.  **Start the local development server**:
    ```bash
    npm run dev
    ```
    The app will start on **`http://localhost:3000`**.

4.  **Connect to Backend**:
    The server uses a proxy rule defined in `vite.config.js` to automatically redirect `/api` requests to your local backend server at **`http://localhost:8000`**. Make sure the backend server is running synchronously.

---

## 📦 Production Deployment

To package the application for high-performance production distribution:

1.  **Build the static assets**:
    ```bash
    npm run build
    ```
    This compiles code, optimizes bundle sizes, and outputs static resources to the `dist/` directory.

2.  **Preview the production build locally**:
    ```bash
    npm run preview
    ```

---

## 🔒 Environment & Configuration

*   **API Client Config**: Handled inside `src/services/apiClient.js`. Automatically attaches `Bearer <token>` to the HTTP Authorization headers if an authenticated user session is active.
*   **Auto-Logout Handlers**: Features automatic JWT expiration checks. If a request returns a `401 Unauthorized` status, the browser automatically purges the expired state and routes the user back to `/login`.
