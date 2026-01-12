# 🚀 Quick Start Guide - Testing Authentication

Follow these steps to test your frontend-backend authentication integration.

## Prerequisites

✅ Node.js installed  
✅ MongoDB running  
✅ All dependencies installed (`npm install`)  
✅ `.env` file configured

## Step 1: Start the Backend Server

```bash
# Navigate to project root
cd d:\Projects\PMS

# Start the server
npm run dev
# or
npm start
```

You should see:

```
MongoDB Master DB connected
Server is running on port 5000
```

## Step 2: Test Backend Connection

Open your browser and visit:

```
http://localhost:5000/health
```

You should see:

```json
{
  "success": true,
  "message": "PMS Backend is running",
  "timestamp": "2026-01-12T..."
}
```

## Step 3: Open the Test Page

Open `Frontend/test-auth.html` in your browser:

```
d:\Projects\PMS\Frontend\test-auth.html
```

### Test Sequence:

1. **Test Backend Connection**

   - Click "Test Backend Connection"
   - Should show success with server health status

2. **Test Registration**

   - Click "Test Registration"
   - Creates a new test user automatically
   - Token should be saved automatically

3. **Test Get Profile**

   - Click "Test Get Profile (Protected)"
   - Should show user profile data
   - Proves token authentication is working

4. **Check Auth Status**
   - Click "Check Auth Status"
   - Shows current authentication state

## Step 4: Test Login Page

1. Open `Frontend/comp/Login.html`
2. Use these test credentials (or register new ones):
   ```
   Email: test@example.com
   Password: Test1234!
   ```
3. Click "Sign In"
4. Should see success message and redirect

## Step 5: Test Signup Page

1. Open `Frontend/comp/Signup.html`
2. Fill in the form:
   ```
   Full Name: Test Clinic
   Email: newuser@example.com
   Password: SecurePass123
   ✓ Check terms agreement
   ```
3. Click "Create Account"
4. Should see success and either redirect or token saved

## Step 6: Test Protected Routes

If you have a dashboard page:

1. Make sure you're logged in (have a token)
2. Open your dashboard page
3. Should load user profile automatically
4. Try clicking logout

## Verification Checklist

Use this checklist to verify everything works:

- [ ] Backend server starts without errors
- [ ] Health endpoint returns success
- [ ] CORS allows requests from frontend
- [ ] Registration creates new user
- [ ] Registration returns JWT token
- [ ] Login with valid credentials works
- [ ] Login with invalid credentials fails properly
- [ ] Token is saved in localStorage
- [ ] Protected routes require authentication
- [ ] Profile endpoint returns user data
- [ ] Logout clears token and redirects
- [ ] Toast notifications display correctly
- [ ] Form validation works (email, password length, etc.)
- [ ] Loading states show during API calls
- [ ] Error messages display for API failures

## Common Issues & Solutions

### Issue: CORS Error

```
Access to fetch at 'http://localhost:5000/api/auth/login' has been blocked by CORS policy
```

**Solution:** Check `src/server.js` has:

```javascript
app.use(cors());
```

### Issue: 404 on API calls

```
Cannot POST /api/auth/login
```

**Solution:**

- Verify backend server is running
- Check API_BASE_URL in `Frontend/js/auth.js`
- Ensure routes are properly mounted in server.js

### Issue: Token not saving

```
Token received but not in localStorage
```

**Solution:**

- Check browser console for errors
- Verify `saveAuthToken()` is called
- Check if response includes `token` field

### Issue: Registration fails with "User already exists"

```
User with this email already exists
```

**Solution:**

- Use a different email
- Or delete existing user from database
- Or use the login form instead

### Issue: Backend can't connect to MongoDB

```
MongoDB connection error
```

**Solution:**

- Ensure MongoDB is running
- Check `.env` file has correct MONGO_URI
- Verify MongoDB connection string format

## Testing with Different Browsers

Test in multiple browsers to ensure compatibility:

- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (if on Mac)

## Testing Edge Cases

1. **Invalid Email Format**

   - Try: "notanemail"
   - Should show error

2. **Short Password**

   - Try: "123"
   - Should show "min 8 characters" error

3. **Expired/Invalid Token**

   - Manually edit token in localStorage
   - Protected routes should redirect to login

4. **Network Error**

   - Stop backend server
   - Try to login
   - Should show connection error

5. **Duplicate Registration**
   - Register same email twice
   - Should show "user already exists"

## Next Steps After Testing

Once everything works:

1. ✅ Update `API_BASE_URL` for production
2. ✅ Replace test-auth.html with real dashboard
3. ✅ Add password reset functionality
4. ✅ Implement remember me feature
5. ✅ Add email verification
6. ✅ Set up proper error logging
7. ✅ Add rate limiting to prevent abuse
8. ✅ Implement token refresh mechanism

## Production Deployment Checklist

Before deploying to production:

- [ ] Change API_BASE_URL to production URL
- [ ] Enable HTTPS
- [ ] Configure CORS for production domain
- [ ] Set secure environment variables
- [ ] Implement httpOnly cookies (instead of localStorage)
- [ ] Add CSRF protection
- [ ] Enable rate limiting
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Add analytics tracking
- [ ] Test on production database
- [ ] Set up automated backups

## Support

If you encounter issues:

1. Check browser console for errors
2. Check backend server logs
3. Review `AUTH_INTEGRATION.md` for detailed docs
4. Test with the test-auth.html page
5. Verify all files are in correct locations

## File Locations Reference

```
Frontend/
├── comp/
│   ├── Login.html              ← Login page
│   └── Signup.html             ← Registration page
├── css/
│   └── notifications.css       ← Toast styles
├── js/
│   ├── auth.js                 ← Core utilities
│   ├── login.js                ← Login handler
│   ├── signup.js               ← Signup handler
│   └── dashboard.js            ← Dashboard example
├── test-auth.html              ← Test page
└── AUTH_INTEGRATION.md         ← Full documentation

Backend/
├── src/
│   ├── server.js               ← Main server
│   ├── routes/auth.js          ← Auth routes
│   └── controllers/authController.js  ← Auth logic
```

---

**Happy Testing! 🎉**
