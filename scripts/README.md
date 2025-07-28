# Secure Admin Key Creation

This directory contains scripts for secure server-side operations.

## Creating the First Admin API Key

The `create-first-admin.ts` script provides a secure way to create the first admin API key for the MentalMatters API. This script can only be run on the server and includes multiple security measures.

### Security Features

1. **Server-only execution**: Designed to be run directly on the server console
2. **Environment variable protection**: Requires a secret environment variable
3. **One-time use**: Can only create the first admin key, prevents multiple initial keys
4. **Production-focused**: Defaults to production-only execution
5. **Database validation**: Checks existing admin keys before creation

### Prerequisites

1. Database must be set up and migrated
2. Server must have access to the database file
3. Required environment variables must be set

### Environment Variables

Set these environment variables before running the script:

```bash
# Required: Secret key to enable admin creation
export ADMIN_CREATION_SECRET="your-secure-random-string-here"

# Optional: Custom label for the admin key
export ADMIN_KEY_LABEL="Production Admin Key"

# Optional: Override development restriction
export FORCE_CREATE_ADMIN=true  # Only needed in development
```

#### Generating a Secure Secret

Use the provided utility to generate a secure random secret:

```bash
bun run generate-secret
```

This will output a cryptographically secure random string that you can use as your `ADMIN_CREATION_SECRET`.

### Usage

#### Quick Setup (Recommended)

For the easiest setup experience, use the automated script:

```bash
bun run setup-admin
```

This script will:
1. Generate a secure secret automatically
2. Set the required environment variable
3. Create the first admin API key
4. Display the results

#### Manual Setup

If you prefer manual control:

```bash
# Generate a secure secret
bun run generate-secret

# Set the required environment variable (copy the output from above)
export ADMIN_CREATION_SECRET="your-generated-secret-here"

# Run the script
npm run create-admin
# or
bun run create-admin
```

#### Development (Override)

```bash
# Set environment variables
export ADMIN_CREATION_SECRET="dev-secret"
export FORCE_CREATE_ADMIN=true

# Run the script
bun run create-admin
```

### Output

The script will output:

- ✅ Success message with API key details
- 📋 Complete API key information (ID, key, label, role, creation date)
- ⚠️ Important security notes
- 🔗 Available admin endpoints

### Example Output

```
🔐 Creating first admin API key...
✅ First admin API key created successfully!

📋 API Key Details:
   ID: 1
   Key: 550e8400-e29b-41d4-a716-446655440000
   Label: Initial Admin Key
   Role: ADMIN
   Created: 2024-01-15T10:30:00.000Z

⚠️  IMPORTANT SECURITY NOTES:
   1. Store this API key securely - it cannot be retrieved again
   2. Use this key to access admin endpoints
   3. Consider creating additional admin keys for team members
   4. This script will not work again once an admin key exists

🔗 Admin endpoints available at:
   - POST /api-keys/admin (create new keys)
   - GET /api-keys/admin (list all keys)
   - PATCH /api-keys/admin/:id (update keys)
   - DELETE /api-keys/admin/:id (delete keys)
```

### Security Best Practices

1. **Generate a strong secret**: Use a cryptographically secure random string for `ADMIN_CREATION_SECRET`
2. **Run on server only**: Never run this script from a development machine
3. **Secure storage**: Store the generated API key in a secure password manager
4. **Limit access**: Only share the API key with trusted administrators
5. **Monitor usage**: Regularly check admin key usage through the API
6. **Create backups**: Consider creating additional admin keys for redundancy

### Troubleshooting

#### "Admin API keys already exist"
- This script can only create the first admin key
- Use the admin API endpoints to create additional admin keys

#### "ADMIN_CREATION_SECRET environment variable is required"
- Set the `ADMIN_CREATION_SECRET` environment variable before running

#### "This script is designed for production use only"
- Set `FORCE_CREATE_ADMIN=true` to override in development
- Only use this override in trusted development environments

#### Database connection errors
- Ensure the database file exists and is accessible
- Run database migrations first: `bun run db:migrate`

### Next Steps

After creating the first admin key:

1. Store the API key securely
2. Test admin access using the API endpoints
3. Create additional admin keys for team members if needed
4. Set up monitoring for admin key usage
5. Consider implementing additional security measures (IP restrictions, etc.) 
