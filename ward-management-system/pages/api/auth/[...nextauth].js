import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectToDatabase from '../../../lib/mongodb';
import User from '../../../models/User';
import LoginHistory from '../../../models/LoginHistory';
import { logActivity, ACTIONS } from '../../../lib/logger';
import { parseUserAgent, getClientIP } from '../../../lib/deviceDetector';

export const authOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        await connectToDatabase();
        
        const user = await User.findOne({ email: credentials.email });
        
        if (!user) {
          throw new Error('No user found with this email');
        }
        
        const isValid = await bcrypt.compare(credentials.password, user.password);
        
        if (!isValid) {
          throw new Error('Invalid password');
        }
        
        // For Ward Incharges, get district from their assigned ward
        let userDistrict = user.district;
        if (user.role === 'wardAdmin' && !userDistrict) {
          const Ward = require('../../../models/Ward').default;
          const userWard = await Ward.findOne({ wardAdmin: user._id });
          if (userWard) {
            userDistrict = userWard.district;
          }
        }
        
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          district: userDistrict || null,
          mobileNumber: user.mobileNumber || null,
        };
      }
    }),
    CredentialsProvider({
      id: 'mobile-pin',
      name: 'Mobile & PIN',
      credentials: {
        mobileNumber: { label: "Mobile Number", type: "text" },
        pinCode: { label: "4-Digit PIN", type: "password" }
      },
      async authorize(credentials) {
        await connectToDatabase();
        
        const user = await User.findOne({ 
          mobileNumber: credentials.mobileNumber,
          role: { $in: ['coordinator', 'wardAdmin'] }
        });
        
        if (!user) {
          throw new Error('No user found with this mobile number');
        }
        
        if (user.pinCode !== credentials.pinCode) {
          throw new Error('Invalid PIN code');
        }
        
        // For Ward Incharges, get district from their assigned ward
        let userDistrict = user.district;
        if (user.role === 'wardAdmin' && !userDistrict) {
          const Ward = require('../../../models/Ward').default;
          const userWard = await Ward.findOne({ wardAdmin: user._id });
          if (userWard) {
            userDistrict = userWard.district;
          }
        }
        
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          district: userDistrict || null,
          mobileNumber: user.mobileNumber,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.district = user.district;
        token.mobileNumber = user.mobileNumber;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.district = token.district;
      session.user.mobileNumber = token.mobileNumber;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Enhanced redirect handling to prevent localhost redirects in production
      console.log('NextAuth redirect callback - url:', url, 'baseUrl:', baseUrl);
      
      // Get the proper base URL for production environments
      const getProperBaseUrl = () => {
        // Priority 1: Use NEXTAUTH_URL if set and not localhost
        if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes('localhost')) {
          console.log('Using NEXTAUTH_URL for redirect:', process.env.NEXTAUTH_URL);
          return process.env.NEXTAUTH_URL;
        }
        
        // Priority 2: Use VERCEL_URL if available (for Vercel deployments)
        if (process.env.VERCEL_URL) {
          const vercelUrl = `https://${process.env.VERCEL_URL}`;
          console.log('Using VERCEL_URL for redirect:', vercelUrl);
          return vercelUrl;
        }
        
        // Priority 3: Hardcoded fallback for known production domain
        if (process.env.NODE_ENV === 'production' && baseUrl.includes('localhost')) {
          const productionUrl = 'https://model.myward.in';
          console.log('Production environment detected with localhost baseUrl, using hardcoded production URL:', productionUrl);
          console.error('WARNING: Production environment is using localhost baseUrl. Please set NEXTAUTH_URL=https://model.myward.in in your environment variables.');
          return productionUrl;
        }
        
        // Priority 4: Check if we can detect the production domain from request headers
        if (baseUrl.includes('localhost') && typeof window === 'undefined') {
          // We're on server-side and got localhost, but this might be wrong
          // Let's try to use the known production domain
          const productionUrl = 'https://model.myward.in';
          console.log('Server-side localhost detected, overriding with production URL:', productionUrl);
          return productionUrl;
        }
        
        console.log('Using NextAuth provided baseUrl:', baseUrl);
        return baseUrl;
      };
      
      const properBaseUrl = getProperBaseUrl();
      
      // If url is a relative path, prepend proper baseUrl
      if (url.startsWith('/')) {
        const finalUrl = `${properBaseUrl}${url}`;
        console.log('Redirecting to relative URL:', finalUrl);
        return finalUrl;
      }
      
      // If url is already absolute and matches our proper domain, allow it
      if (url.startsWith(properBaseUrl)) {
        console.log('Allowing absolute URL that matches domain:', url);
        return url;
      }
      
      // Check if the URL matches any of our valid domains (in case of multiple domains)
      const validDomains = [properBaseUrl];
      if (process.env.NEXTAUTH_URL) {
        validDomains.push(process.env.NEXTAUTH_URL);
      }
      
      for (const domain of validDomains) {
        if (url.startsWith(domain)) {
          console.log('Allowing URL that matches valid domain:', url);
          return url;
        }
      }
      
      // For any other case, redirect to proper baseUrl home page
      console.log('Redirecting to home page:', properBaseUrl);
      return properBaseUrl;
    },
    async signIn({ user, account, profile, email, credentials }) {
      // Log successful login and update last login
      try {
        await connectToDatabase();
        
        // Update user's last login and increment login count
        await User.findByIdAndUpdate(user.id, {
          lastLogin: new Date(),
          $inc: { loginCount: 1 }
        });
        
        // Create login history entry
        const loginMethod = credentials?.email ? 'email' : 'mobile';
        
        const loginHistory = new LoginHistory({
          user: user.id,
          loginTime: new Date(),
          district: user.district || 'Unknown',
          ward: user.ward || null,
          loginMethod: loginMethod,
          isActive: true
        });
        
        await loginHistory.save();
        
        await logActivity({
          userId: user.id,
          action: ACTIONS.LOGIN,
          description: `User logged in successfully via ${loginMethod}`,
          district: user.district || 'Unknown',
          ward: user.ward || null,
          entityType: 'User',
          entityId: user.id
        });
      } catch (error) {
        console.error('Failed to log login activity:', error);
      }
      return true;
    },
    async signOut({ token }) {
      // Log successful logout and end login session
      try {
        await connectToDatabase();
        
        // End active login sessions
        const activeSessions = await LoginHistory.find({
          user: token.sub,
          isActive: true
        });
        
        for (const session of activeSessions) {
          await session.endSession();
        }
        
        await logActivity({
          userId: token.sub,
          action: ACTIONS.LOGOUT,
          description: `User logged out successfully`,
          district: token.district || 'Unknown',
          ward: token.ward || null,
          entityType: 'User',
          entityId: token.sub
        });
      } catch (error) {
        console.error('Failed to log logout activity:', error);
      }
      return true;
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);