# MentalMatters API

An API designed to make mental health support accessible to everyone. Available at https://api-mentalmatters.tdanks.com/

## 🚀 Features

- **Mental Health Resources**: Access to affirmations, quotes, resources, and mood tracking
- **Multi-language Support**: Content available in multiple languages
- **Secure API Key Authentication**: Role-based access control
- **Comprehensive Rate Limiting**: Tiered rate limits for different endpoints
- **CORS Support**: Cross-origin resource sharing enabled
- **Health Monitoring**: Built-in health check endpoint
- **Automatic Documentation**: Swagger/OpenAPI documentation

## 🔒 Security Features

### Rate Limiting
The API implements sophisticated rate limiting with different tiers:

- **Public Read Endpoints** (affirmations, quotes, resources, moods, languages, tags): 200 requests/minute
- **Admin Endpoints**: 30 requests/minute  
- **API Key Management**: 10 requests/minute
- **Documentation**: 500 requests/minute
- **Default**: 100 requests/minute

**Algorithms**: Uses sliding-window algorithm for better burst protection

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (production only)

### API Key Management
- Automatic revocation of unused keys (30 days)
- Role-based access (USER/ADMIN)
- Secure key validation
- Usage tracking

### Input Validation
- Comprehensive input validation for all endpoints
- Request size limits (1MB)
- SQL injection protection via parameterized queries
- XSS protection

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/mentalmatters/mentalmatters-api.git
cd mentalmatters-api

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
bun run db:migrate

# Start development server
bun run dev
```

## 📚 API Documentation

Visit `/docs` for interactive API documentation powered by Swagger.

### Base URL
- Development: `http://localhost:5177`
- Production: `https://api-mentalmatters.tdanks.com`

### Authentication
Include your API key in the `x-api-key` header:
```bash
curl -H "x-api-key: your-api-key" https://api-mentalmatters.tdanks.com/affirmations
```

### Health Check
```bash
curl https://api-mentalmatters.tdanks.com/health
```

## 🔧 Environment Variables

```bash
# Server
PORT=5177
NODE_ENV=production

# Rate Limiting
RATE_LIMIT_HEADERS=true
RATE_LIMIT_VERBOSE=false

# Database
DATABASE_URL=your-database-url

# CORS (optional)
CORS_ORIGIN=https://yourdomain.com
```

## 📊 Rate Limiting Details

### Rate Limit Headers
When `RATE_LIMIT_HEADERS=true`, responses include:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when the window resets
- `Retry-After`: Seconds to wait before retrying (when rate limited)

### Rate Limit Response
```json
{
  "message": "Too many requests, please try again later.",
  "retryAfter": 45,
  "resetTime": "45 seconds"
}
```

## 🚨 Security Best Practices

### For API Consumers
1. **Keep API keys secure**: Never expose keys in client-side code
2. **Use HTTPS**: Always use HTTPS in production
3. **Implement retry logic**: Handle rate limiting gracefully
4. **Validate responses**: Always validate API responses
5. **Monitor usage**: Track your API usage to stay within limits

### For Developers
1. **Environment variables**: Never commit secrets to version control
2. **Input validation**: Always validate user input
3. **Error handling**: Don't expose internal errors in production
4. **Logging**: Implement proper logging for debugging
5. **Updates**: Keep dependencies updated

## 🔄 API Endpoints

### Public Endpoints (No API key required)
- `GET /` - Welcome message
- `GET /health` - Health check
- `GET /docs` - API documentation
- `GET /affirmations` - Get affirmations
- `GET /quotes` - Get quotes
- `GET /resources` - Get resources
- `GET /moods` - Get moods
- `GET /languages` - Get supported languages
- `GET /tags` - Get tags

### Protected Endpoints (API key required)
- `POST /affirmations` - Create affirmation (ADMIN only)
- `PUT /affirmations/:id` - Update affirmation (ADMIN only)
- `DELETE /affirmations/:id` - Delete affirmation (ADMIN only)
- `POST /quotes` - Create quote (ADMIN only)
- `PUT /quotes/:id` - Update quote (ADMIN only)
- `DELETE /quotes/:id` - Delete quote (ADMIN only)
- `POST /resources` - Create resource (ADMIN only)
- `PUT /resources/:id` - Update resource (ADMIN only)
- `DELETE /resources/:id` - Delete resource (ADMIN only)

### API Key Management
- `GET /api-keys` - List API keys (ADMIN only)
- `POST /api-keys` - Create API key (ADMIN only)
- `DELETE /api-keys/:id` - Revoke API key (ADMIN only)

## 🛡️ Error Handling

The API returns consistent error responses:

```json
{
  "message": "Human-readable error message",
  "requestId": "uuid-for-tracking",
  "error": "ERROR_CODE"
}
```

### Common Error Codes
- `MISSING_API_KEY` - API key required but not provided
- `INVALID_API_KEY` - API key is invalid or revoked
- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource not found
- `RATE_LIMITED` - Rate limit exceeded

## 🔍 Monitoring & Logging

### Health Check
Monitor API health with the `/health` endpoint:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

### Request Tracking
All errors include a `requestId` for tracking:
```json
{
  "message": "Error message",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you need help or have questions:
- Check the [API documentation](/docs)
- Open an issue on GitHub
- Contact the maintainers

## 🔗 Links

- [API Documentation](https://api-mentalmatters.tdanks.com/docs)
- [GitHub Repository](https://github.com/mentalmatters/mentalmatters-api)
- [Production API](https://api-mentalmatters.tdanks.com)

---

**Remember**: You matter, and support is always here for you. Take care. ❤️‍🩹
