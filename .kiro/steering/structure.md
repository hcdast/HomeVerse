# Project Structure

## Repository Layout

```
HomeVerse/
├── backend/           # NestJS backend service
├── frontend/          # React frontend application
├── deploy.sh          # Deployment script
├── nginx.conf         # Nginx reverse proxy configuration
└── README.md          # Main documentation
```

## Backend Structure (`backend/src/`)

### Module Organization

Each feature follows NestJS module pattern with:
- `*.module.ts` - Module definition with imports/exports
- `*.controller.ts` - HTTP endpoints and route handlers
- `*.service.ts` - Business logic and data operations
- `schemas/*.schema.ts` - Mongoose schemas for MongoDB
- `dto/*.dto.ts` - Data Transfer Objects for validation

### Key Directories

- `auth/` - Authentication (JWT, login, register)
- `users/` - User management
- `families/` - Family management with member roles/permissions
- `common/` - Shared utilities
  - `decorators/` - Custom decorators (roles, permissions)
  - `guards/` - Route guards (JWT, roles, permissions, family)
  - `filters/` - Exception filters for error handling
  - `interceptors/` - Response transformation
  - `enums/` - Shared enumerations
- `database/` - Database utilities, seeding, statistics
- `storage/` - MinIO object storage service
- `mail/` - Email service
- `ai/` - AI integration
  - `providers/` - AI provider implementations (OpenAI, Claude, Gemini, Qwen)
  - `tools/` - AI tools (text-to-image, image-to-video, etc.)
  - `interfaces/` - Provider interfaces
- Feature modules: `albums/`, `files/`, `articles/`, `calendar/`, `finance/`, `recipes/`, `todos/`, `health/`, `growth/`, `wiki/`, `passwords/`, `shopping/`, `chores/`, `contacts/`, etc.

### Common Patterns

**Service Pattern**: Services use `@InjectModel()` to inject Mongoose models
```typescript
constructor(@InjectModel(Album.name) private albumModel: Model<AlbumDocument>) {}
```

**Schema Pattern**: Schemas use decorators from `@nestjs/mongoose`
```typescript
@Schema({ timestamps: true })
export class Album {
  @Prop({ required: true })
  title: string;
}
```

**Guard Pattern**: Guards implement `CanActivate` interface
- `JwtAuthGuard` - Validates JWT tokens
- `FamilyGuard` - Ensures user belongs to a family
- `RolesGuard` - Checks user roles
- `PermissionsGuard` - Checks fine-grained permissions

## Frontend Structure (`frontend/src/`)

### Directory Organization

- `components/` - Reusable UI components
  - Layout components (Layout, Sidebar)
  - Form components (FileUploader, RichTextEditor)
  - UI components (Toast, Loading, ConfirmDialog, NotificationBell)
  - Feature components (Charts, BaiduMap, SearchBar)
- `pages/` - Page components (one per route)
  - Each page typically has `.tsx` and `.css` files
  - Examples: Dashboard, Albums, Files, Articles, Calendar, Finance, etc.
- `services/` - API service layer
  - `api.ts` - Axios instance with interceptors
  - Feature services (aiService, familyService, notificationService, searchService)
- `store/` - Zustand state management
  - `authStore.ts` - Authentication state with localStorage persistence
- `hooks/` - Custom React hooks
  - `useChat.ts`, `useConfirm.tsx`, `usePermissions.ts`, `useToast.ts`, `useWebSocket.ts`
- `utils/` - Utility functions and constants
- `styles/` - Global styles and CSS variables
- `config/` - Configuration files

### Routing

React Router handles navigation with protected routes requiring authentication. Layout component wraps authenticated pages with sidebar navigation.

### API Communication

- Axios instance configured with base URL and auth token interceptors
- Development proxy: `/api` → `http://localhost:3001`
- WebSocket connections for real-time features (notifications, chat)

## Configuration Files

- `backend/tsconfig.json` - TypeScript config with decorators enabled
- `frontend/tsconfig.json` - TypeScript config for React
- `frontend/vite.config.ts` - Vite config with PWA plugin, proxy, and aliases
- `backend/nest-cli.json` - NestJS CLI configuration

## Static Assets

- `backend/uploads/` - User-uploaded files (photos, documents)
- `backend/public/` - Static assets served by backend
- `frontend/public/` - Static assets for frontend (icons, images)
