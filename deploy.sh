#!/bin/bash

# CTG Trading Backend - Vercel Deployment Script
# This script helps deploy the backend to Vercel

echo "🚀 CTG Trading Backend - Vercel Deployment"
echo "=========================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel:"
    vercel login
fi

echo "📦 Installing dependencies..."
npm install

echo "🔍 Running linting..."
npm run lint

echo "🧪 Running tests..."
npm test

echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Set environment variables in Vercel dashboard"
echo "2. Test the health endpoint: https://your-domain.vercel.app/api/health"
echo "3. Verify cron jobs are scheduled"
echo "4. Update frontend CORS settings if needed"
echo ""
echo "📖 For detailed instructions, see VERCEL_DEPLOYMENT_GUIDE.md"
