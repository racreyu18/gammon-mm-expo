# Vercel Deployment Guide

This guide will help you deploy your Gammon Material Management Expo web application to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Azure AD App Registration**: Update with web redirect URI

## Step 1: Prepare Your Application

✅ **Already Done:**
- ✅ Vercel configuration file (`vercel.json`) created
- ✅ Build script (`build:web`) added to `package.json`
- ✅ Environment variables documented in `.env.example`

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the configuration from `vercel.json`
5. Click "Deploy"

### Option B: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from your project directory
cd gammon-mm-expo
vercel

# Follow the prompts to configure your project
```

## Step 3: Configure Environment Variables

In your Vercel project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables:

### Required Variables:
```
AZURE_CLIENT_ID=your_azure_client_id
AZURE_TENANT_ID=your_azure_tenant_id
AZURE_REDIRECT_URI=https://your-vercel-domain.vercel.app/auth
AZURE_AUTHORITY=https://login.microsoftonline.com/your_tenant_id
API_BASE_URL=your_api_base_url
API_SCOPE=your_api_scope
EXPO_PUBLIC_AZURE_CLIENT_ID=your_azure_client_id
EXPO_PUBLIC_AZURE_TENANT_ID=your_azure_tenant_id
EXPO_PUBLIC_AZURE_AUTHORITY=https://login.microsoftonline.com/your_tenant_id
EXPO_PUBLIC_API_BASE_URL=your_api_base_url
EXPO_PUBLIC_API_SCOPE=your_api_scope
APP_ENV=PROD
```

### Optional Variables:
```
FEATURE_APPROVALS=true
FEATURE_ATTACHMENTS=true
FEATURE_OFFLINE_STAGING=false
ANALYTICS_PUBLIC_KEY=your_analytics_key
PERMISSIONS_TTL_MINUTES=10
PERF_P90_COLD_START=3200
PERF_P90_SEARCH=1500
PERF_P90_SCAN_SUBMIT=1100
```

## Step 4: Update Azure AD Configuration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Select your app registration
4. Go to **Authentication**
5. Add a new **Web** platform with redirect URI:
   ```
   https://your-vercel-domain.vercel.app/auth
   ```
6. Save the configuration

## Step 5: Test Your Deployment

1. Visit your Vercel deployment URL
2. Test the authentication flow
3. Verify all features work correctly
4. Check browser console for any errors

## Build Configuration

The application uses:
- **Build Command**: `npm run build:web`
- **Output Directory**: `dist`
- **Framework**: Expo (auto-detected)

## Troubleshooting

### Common Issues:

1. **Authentication Errors**
   - Verify Azure redirect URI matches your Vercel domain
   - Check environment variables are set correctly

2. **Build Failures**
   - Ensure all dependencies are in `package.json`
   - Check for TypeScript errors

3. **Runtime Errors**
   - Check browser console for client-side errors
   - Verify API endpoints are accessible

### Useful Commands:

```bash
# Test build locally
npm run build:web

# Start local development server
npm run web

# Check Vercel deployment logs
vercel logs your-deployment-url
```

## Security Notes

- Never commit real environment variables to your repository
- Use Vercel's environment variable system for sensitive data
- Regularly rotate API keys and secrets
- Enable security headers (already configured in `vercel.json`)

## Performance Optimization

The `vercel.json` configuration includes:
- Static asset caching
- Security headers
- SPA routing support
- Optimized build settings

Your application is now ready for production deployment on Vercel! 🚀