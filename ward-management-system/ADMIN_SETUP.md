# Admin User Setup

This document provides instructions for setting up the initial admin user for the Ward Management System.

## Default Admin Credentials

The system comes with a script to create a default admin user with the following credentials:

- **Email**: admin@d4media.com
- **Password**: admin123

## Creating the Admin User

To create the admin user, follow these steps:

1. Make sure you have set up your `.env.local` file with the correct MongoDB connection string.

2. Install the project dependencies:

```bash
npm install
```

3. Run the admin creation script:

```bash
npm run create-admin
```

4. You should see a success message indicating that the admin user has been created.

5. You can now log in to the system using the admin credentials.

## User Authentication

The system supports two authentication methods:

1. **Email & Password**: Used primarily by state admins
   - Login with email and password
   - Access through the admin login page

2. **Mobile & PIN**: Used by coordinators and Ward Incharges
   - Login with mobile number and 4-digit PIN
   - Mobile-first interface for field use
   - PIN codes are managed by the state admin

## Creating Coordinators and Ward Incharges

When creating coordinators and Ward Incharges, you'll need to provide:

1. Basic information (name, email, etc.)
2. Mobile number (must be unique)
3. 4-digit PIN code for mobile login
4. District assignment

Coordinators and Ward Incharges can then log in using their mobile number and PIN code from any device, with a mobile-optimized interface.

## Security Note

For production environments, it is recommended to:

1. Change the admin password immediately after the first login
2. Use a strong, unique password for admin accounts
3. Regularly rotate PIN codes for coordinators and Ward Incharges
4. Consider enabling additional security measures like two-factor authentication

## Troubleshooting

If you encounter any issues while creating the admin user:

1. Make sure your MongoDB connection string in `.env.local` is correct
2. Check that MongoDB is running and accessible
3. Ensure all dependencies are installed correctly
4. Check the console output for specific error messages