# Project Structure

## Root Directory Organization

### Core Configuration

- `package.json` - Dependencies and scripts
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `jsconfig.json` - JavaScript/TypeScript configuration with path aliases
- `.env.local` - Environment variables (not committed)

### Application Structure

```
/pages              # Next.js pages and API routes
  /_app.js         # App wrapper with SessionProvider
  /index.js        # Dashboard/home page
  /api             # API routes
  /admin           # State admin pages
  /coordinator     # Coordinator pages
  /ward            # Ward Incharge pages
  /auth            # Authentication pages

/components         # Reusable React components
/models            # Mongoose database models
/lib               # Utility functions and configurations
/data              # Static data (districts, etc.)
/styles            # Global CSS styles
/public            # Static assets
/scripts           # Database and utility scripts
/types             # TypeScript definitions
```

## Key Architectural Patterns

### API Route Structure

- RESTful endpoints under `/pages/api/`
- Role-based access control in all routes
- Consistent error handling and response format
- Session validation using NextAuth.js

### Database Models

- `User.js` - User accounts with role-based validation
- `Ward.js` - Ward information and assignments
- `FormTemplate.js` - Dynamic form definitions
- `Response.js` - Form submission data
- `ActivityLog.js` - Audit trail logging

### Component Organization

- Reusable UI components in `/components/`
- Layout component provides navigation based on user role
- Form components use React Hook Form
- Modal components for user interactions

### Authentication Flow

- NextAuth.js configuration in `/pages/api/auth/[...nextauth].js`
- Role-based navigation in Layout component
- Session management across all protected routes

### File Naming Conventions

- Pages: kebab-case for URLs (`ward-reports.js`)
- Components: PascalCase (`UserWardsModal.js`)
- API routes: RESTful structure with dynamic routes (`[id].js`)
- Models: PascalCase matching database collections

### Data Flow Patterns

- SWR for client-side data fetching and caching
- Server-side session validation in API routes
- Activity logging for audit trails
- Excel export functionality for reports

### Role-Based Access

- State Admin: Full access to all routes
- Coordinator: District-scoped access
- Ward Incharge: Ward-scoped access
- Navigation and API endpoints filtered by role
