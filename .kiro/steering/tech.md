# Technology Stack

## Backend

**Framework**: NestJS 10.x with TypeScript 5.x
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js with JWT strategy
- **File Upload**: Multer
- **Object Storage**: MinIO
- **Real-time**: Socket.IO for WebSockets
- **Email**: Nodemailer with Handlebars templates
- **AI SDKs**: OpenAI, Anthropic (Claude), Google Generative AI (Gemini)
- **Validation**: class-validator and class-transformer

## Frontend

**Framework**: React 18.x with TypeScript 5.x
- **Build Tool**: Vite 4.x
- **Routing**: React Router 6.x
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Rich Text**: Quill/React-Quill
- **Charts**: Recharts
- **Maps**: Leaflet/React-Leaflet
- **Flow Diagrams**: ReactFlow
- **PWA**: vite-plugin-pwa
- **Real-time**: socket.io-client

## Development Environment

- Node.js >= 16.0.0
- MongoDB >= 4.4
- MinIO (optional for object storage)

## Common Commands

### Backend
```bash
cd backend
npm install              # Install dependencies
npm run start:dev        # Development mode with hot reload
npm run build            # Production build
npm run start:prod       # Run production build
npm run init-demo        # Initialize demo data
npm run format           # Format code with Prettier
npm run lint             # Lint code with ESLint
```

### Frontend
```bash
cd frontend
npm install              # Install dependencies
npm run dev              # Development mode (port 3000)
npm run build            # Production build
npm run preview          # Preview production build
npm run lint             # Lint code
```

## Environment Configuration

### Backend (.env)
- `PORT`: Server port (default 3001)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `MINIO_*`: MinIO configuration for object storage
- `*_API_KEY`: AI provider API keys (OpenAI, Claude, Gemini, Qwen, Wavespeed)
- `MAIL_*`: Email service configuration

### Frontend (.env)
- `VITE_API_BASE_URL`: Backend API URL (default http://localhost:3001)
- `VITE_BAIDU_MAP_AK`: Baidu Maps API key for location features

## Build System

- Backend uses NestJS CLI for building and development
- Frontend uses Vite for fast HMR and optimized production builds
- TypeScript compilation with strict mode disabled for flexibility
- Path aliases configured: `@/*` maps to `src/*`
