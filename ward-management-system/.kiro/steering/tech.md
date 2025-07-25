# Technology Stack

## Framework & Runtime

- **Next.js 14**: Full-stack React framework with API routes
- **React 18**: Frontend UI library
- **Node.js**: JavaScript runtime

## Database & ODM

- **MongoDB**: NoSQL database
- **Mongoose 7.5**: MongoDB object modeling for Node.js

## Authentication & Security

- **NextAuth.js 4.23**: Authentication library
- **bcryptjs**: Password hashing

## Styling & UI

- **Tailwind CSS 3.3**: Utility-first CSS framework
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixing

## Form Handling & Data

- **React Hook Form 7.45**: Form validation and handling
- **SWR 2.2**: Data fetching and caching
- **Axios 1.5**: HTTP client
- **XLSX 0.18**: Excel file generation

## File Handling

- **Formidable 3.5**: File upload handling

## Development Tools

- **ESLint**: Code linting
- **TypeScript definitions**: Type support for React
- **dotenv**: Environment variable management

## Common Commands

### Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database Setup

```bash
npm run create-admin # Create initial admin user
```

### Environment Setup

Required environment variables in `.env.local`:

- `MONGODB_URI`: MongoDB connection string
- `NEXTAUTH_SECRET`: NextAuth.js secret key
- `NEXTAUTH_URL`: Application URL (http://localhost:3000 for dev)

## Build Configuration

- **SWC**: Fast TypeScript/JavaScript compiler (enabled)
- **React Strict Mode**: Enabled for development checks
- **Path aliases**: `@/*` maps to project root
