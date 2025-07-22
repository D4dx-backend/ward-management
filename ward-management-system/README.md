# Ward Management System

A Next.js application for managing coordinators and wards across a state, with report collection and analysis capabilities.

## Features

- User management with three roles: State Admin, Coordinator, and Ward Admin
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
3. Create ward admins and assign them to wards.
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
- Assign ward admins to wards
- Submit weekly coordinator reports
- View ward reports from their district

### Ward Admin
- Submit weekly ward reports
- View their own previous reports

## License

This project is licensed under the MIT License.