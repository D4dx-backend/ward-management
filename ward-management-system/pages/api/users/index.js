// This file proxies /api/users to the base handler at /pages/api/users.js
// Ensures both /api/users and /api/users/ resolve correctly for POST/GET
import handler from '../users';

export default handler;


