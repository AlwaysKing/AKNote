# MD Library Frontend

A Notion-style React frontend for the MD Knowledge Base system.

## Tech Stack

- **React 18** + TypeScript
- **Vite** - Build tool and dev server
- **React Router DOM** - Client-side routing
- **Zustand** - State management
- **Axios** - HTTP client with interceptors
- **Tailwind CSS** - Styling with Notion-like design
- **Lucide React** - Icon library
- **BlockNote** - Rich text editor (to be integrated)

## Project Structure

```
src/
├── api/              # API client modules
│   ├── client.ts     # Axios instance with JWT interceptors
│   ├── auth.ts       # Authentication API
│   ├── spaces.ts     # Space management API
│   ├── pages.ts      # Page CRUD API
│   ├── users.ts      # User management API
│   └── upload.ts     # File upload API
├── stores/           # Zustand state stores
│   ├── authStore.ts  # Authentication state
│   ├── spaceStore.ts # Space and page tree state
│   └── pageStore.ts  # Current page state
├── components/       # React components
│   ├── Auth/         # Authentication components
│   ├── Layout/       # App layout components
│   ├── Sidebar/      # Sidebar components
│   └── Editor/       # Page editor components
├── pages/            # Page-level components
├── hooks/            # Custom React hooks
├── styles/           # Global styles
└── utils/            # Utility functions
```

## Development

### Install Dependencies

```bash
npm install
```

### Start Dev Server

```bash
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies API requests to `http://localhost:8080`.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Features

- **Authentication**: Login/logout with JWT token management
- **Space Management**: Switch between different knowledge spaces
- **Page Tree**: Hierarchical page navigation with expand/collapse
- **Page Editing**: Markdown editor with auto-save (placeholder for BlockNote)
- **Cover Images**: Optional cover images for pages
- **Page Icons**: Optional emoji icons for pages
- **Admin Panel**: User management for admins
- **Notion-like UI**: Clean, minimal design with smooth transitions

## API Integration

All API requests go through `/api` and are proxied to the backend at `http://localhost:8080`.

### Authentication

- JWT tokens are stored in `localStorage`
- Axios interceptors automatically attach tokens to requests
- 401 responses automatically redirect to login

### Key Routes

- `/login` - Login page
- `/s/:slug` - Space view
- `/s/:slug/p/:id` - Page editor
- `/admin` - Admin panel (admin only)

## Next Steps

- Integrate BlockNote editor for rich text editing
- Implement drag-and-drop page reordering
- Add global search functionality
- Implement page version history
- Add real-time collaboration (optional)
