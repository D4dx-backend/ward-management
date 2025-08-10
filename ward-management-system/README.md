# Ward Management System

A Next.js application for managing coordinators and wards across a state, with report collection and analysis capabilities.

## Features

- User management with three roles: State Admin, Coordinator, and Ward Incharge
- Ward management for coordinators
- Dynamic form creation for weekly reports
- Two types of reports: Coordinator Work Reports and Ward Work Progress Reports
- Report submission and viewing
- Export reports to Excel for analysis
- Authentication and authorization

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **Form Handling**: React Hook Form
- **Data Fetching**: SWR, Axios
- **Excel Export**: XLSX

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- MongoDB database

### Installation

1. Clone the repository
2. Install dependencies:

```bash
cd ward-management-system
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory with the following variables:

```
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Initial Setup

1. Create a state admin user in the database:

```javascript
// Example MongoDB document for state admin
{
  "name": "State Admin",
  "email": "admin@example.com",
  "password": "hashed_password", // Use bcrypt to hash the password
  "role": "stateAdmin",
  "createdAt": ISODate("2023-01-01T00:00:00Z")
}
```

2. Log in as the state admin and create coordinators for each district.
3. Create Ward Incharges and assign them to wards.
4. Create form templates for weekly reports.

## Project Structure

- `/pages`: Next.js pages and API routes
- `/models`: Mongoose models
- `/lib`: Utility functions
- `/styles`: CSS styles
- `/components`: React components

## User Roles

### State Admin

- Manage all users (create, update, delete)
- Create and manage form templates
- View and export all reports
- Manage all wards

### Coordinator

- Manage wards in their district
- Assign Ward Incharges to wards
- Submit weekly coordinator reports
- View ward reports from their district

### Ward Incharge

- Submit weekly ward reports
- View their own previous reports

## License

This project is licensed under the MIT License.

## Deployment to Cloudways & CI/CD

### Cloudways Deployment Requirements

- Node.js 18+ (recommended)
- MongoDB database (external or managed)
- PM2 process manager (for production)
- Git installed on server

### Environment Variables

Create a `.env.local` file in the project root with:

```
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-production-domain.com
```

### Production Build & Start

```bash
npm ci --production
npm run build
npm start
# Or use PM2 for process management:
pm2 start npm --name "nextjs-app" -- start
```

### CI/CD with GitHub Actions

- Workflow file: `.github/workflows/deploy.yaml`
- Triggers on push to `server_prod` branch
- Steps:
  1. Generate GitHub App token
  2. Checkout code
  3. Setup Node.js 18
  4. Install dependencies
  5. Build Next.js app
  6. SSH to Cloudways server and deploy:
     - Pull latest code
     - Install production dependencies
     - Build app
     - Restart (or start) with PM2

#### Required GitHub Secrets

- `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` (for token generation)
- `CLOUDWAYS_HOST`, `CLOUDWAYS_USER`, `CLOUDWAYS_PASSWORD`, `CLOUDWAYS_APP_PATH`

#### Example SSH Deploy Script (from workflow)

```bash
cd /home/master/applications/${CLOUDWAYS_APP_PATH}/public_html
git pull https://x-access-token:${GITHUB_TOKEN}@github.com/your-org/your-repo.git main
npm ci --production
npm run build
pm2 restart nextjs-app || pm2 start npm --name "nextjs-app" -- start
```

### Troubleshooting

- Check server logs: `pm2 logs`
- Test API endpoints directly
- Ensure all environment variables are set
- For more, see `PRODUCTION_TROUBLESHOOTING.md`
