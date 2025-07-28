#!/bin/bash

# Secure Admin Setup Script for MentalMatters API
# This script helps set up the first admin API key securely

set -e  # Exit on any error

echo "🔐 MentalMatters API - Secure Admin Setup"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: This script must be run from the project root directory"
    exit 1
fi

# Check if bun is available
if ! command -v bun &> /dev/null; then
    echo "❌ Error: Bun is required but not installed"
    echo "   Install Bun from: https://bun.sh/"
    exit 1
fi

# Check if database exists
if [ ! -f "sqlite.db" ]; then
    echo "⚠️  Warning: Database file not found. Running migrations..."
    bun run db:migrate
fi

echo "📋 Step 1: Generate secure secret"
echo "--------------------------------"
SECRET=$(bun run generate-secret | tail -n +3 | head -n 1)
echo "✅ Secret generated successfully"
echo ""

echo "📋 Step 2: Set environment variable"
echo "----------------------------------"
export ADMIN_CREATION_SECRET="$SECRET"
echo "✅ Environment variable set"
echo ""

echo "📋 Step 3: Create admin API key"
echo "-------------------------------"
if bun run create-admin; then
    echo ""
    echo "🎉 Admin setup completed successfully!"
    echo ""
    echo "⚠️  IMPORTANT: Save the API key shown above securely."
    echo "   You will not be able to retrieve it again."
    echo ""
    echo "🔗 Next steps:"
    echo "   1. Store the API key in a secure password manager"
    echo "   2. Test admin access using the API endpoints"
    echo "   3. Consider creating additional admin keys for team members"
else
    echo ""
    echo "❌ Admin setup failed. Please check the error messages above."
    exit 1
fi 
