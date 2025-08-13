# PIN Reset Functionality Documentation

## Overview
The PIN reset functionality allows coordinators and Ward Incharges to reset their 4-digit PIN and receive the new PIN via WhatsApp using the DXing API.

## Features
- ✅ Secure PIN reset via mobile number verification
- ✅ Automatic PIN generation (4-digit random number)
- ✅ WhatsApp message delivery with new PIN
- ✅ Professional message template
- ✅ Database update with new PIN
- ✅ Error handling and rollback on failure

## API Endpoints

### POST /api/auth/reset-pin
Resets a user's PIN and sends the new PIN via WhatsApp.

**Request Body:**
```json
{
  "mobileNumber": "9876543210"
}
```

**Response (Success):**
```json
{
  "message": "PIN reset successful. New PIN sent to your WhatsApp.",
  "success": true
}
```

**Response (Error):**
```json
{
  "message": "No user found with this mobile number"
}
```

## Frontend Pages

### /auth/reset-pin
User-friendly PIN reset page with:
- Mobile number input validation
- Loading states
- Success/error messages
- Automatic redirect to login after success

### Updated /auth/signin
Added "Forgot your PIN?" link for easy access to PIN reset functionality.

## WhatsApp Message Template

The system sends a professional WhatsApp message with:
- Welcome message
- New PIN details
- Login URL
- Security instructions
- Contact information

Example message:
```
🎉 Welcome to Model Ward Management System!

🔐 PIN Reset Successful

Your Updated Login Details:
☎️ Phone Number: 9876543210
🔐 New PIN: 1234
👥 Role: Coordinator
🌐 Login URL: https://model.myward.in

⚠️ Important Security Notes:
• Keep your PIN secure
• Do not share your PIN with anyone
• Use this 4-digit PIN to login

Need help? Contact the State Admin
Ph: 8606016678

Best regards,
State Election Committee
Welfare Party Kerala
```

## Configuration

### Environment Variables
Make sure these are set in your `.env.local`:
```
DXING_API_SECRET=your_api_secret_here
DXING_ACCOUNT_ID=your_account_id_here
DXING_API_URL=https://app.dxing.in/api/send/whatsapp
```

## Testing

### 1. Manual Testing via Web Interface
1. Go to `/auth/signin`
2. Click "Forgot your PIN?"
3. Enter a valid mobile number
4. Check WhatsApp for the new PIN
5. Try logging in with the new PIN

### 2. API Testing
```bash
curl -X POST http://localhost:3000/api/auth/reset-pin \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "9876543210"}'
```

### 3. Command Line Testing
```bash
# Test WhatsApp API integration
node test-whatsapp-integration.js

# Test PIN reset endpoint
node test-pin-reset.js

# Manual PIN reset for a user
node scripts/reset-user-pin.js 9876543210
```

## Security Features

1. **Mobile Number Validation**: Only registered mobile numbers can reset PINs
2. **Role Restriction**: Only coordinators and Ward Incharges can use PIN reset
3. **Secure PIN Generation**: Random 4-digit PINs
4. **Transaction Safety**: PIN is reverted if WhatsApp delivery fails
5. **Activity Logging**: All PIN reset activities are logged

## Error Handling

- Invalid mobile number format
- User not found
- WhatsApp API failures
- Database connection issues
- Network timeouts

## User Experience

1. User clicks "Forgot your PIN?" on login page
2. Enters their registered mobile number
3. Receives immediate feedback
4. Gets new PIN via WhatsApp within seconds
5. Can immediately login with new PIN
6. Automatic redirect to login page

## Troubleshooting

### Common Issues:

1. **WhatsApp not received**
   - Check mobile number format (should be 10 digits)
   - Verify user exists in database
   - Check DXing API credentials
   - Check network connectivity

2. **PIN not working after reset**
   - Ensure WhatsApp message was received
   - Check if PIN was actually updated in database
   - Try resetting again

3. **API errors**
   - Check environment variables
   - Verify DXing account status
   - Check API rate limits

### Debug Commands:
```bash
# Check user exists
node scripts/check-users.js

# Manual PIN reset with detailed logging
node scripts/reset-user-pin.js 9876543210

# Test WhatsApp API directly
node test-whatsapp-integration.js
```

## Integration with User Creation

When creating new users, the system can also send welcome WhatsApp messages with initial PIN details by setting `sendWhatsApp: true` in the user creation request.

## Future Enhancements

- PIN reset rate limiting
- SMS fallback option
- PIN expiry functionality
- Multi-language support
- PIN strength requirements