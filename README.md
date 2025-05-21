# Mental Matters API

A RESTful API service built with Elysia.js providing standardized mood definitions and inspirational quotes that developers can integrate into their applications.

## Features

- 🔑 API Key Authentication
- 👥 Role-based Access Control (User/Admin)
- 💭 Standardized Quotes Collection
- 😊 Predefined Mood Definitions
- 🌐 Multi-language Support

## API Documentation

### Authentication

All API endpoints require an API key for authentication. Include your API key in the request headers:

```http
X-API-Key: your-api-key-here
```

### API Keys

#### Create API Key
```http
POST /api-key
Content-Type: application/json

{
  "label": "My API Key"
}
```

#### Get Current API Key Info
```http
GET /api-key/me
```

### Quotes

#### Get Quotes
```http
GET /quotes
```

Query Parameters:
- `language`: Filter by language code
- `category`: Filter by category
- `author`: Filter by author name (partial match)

#### Get Quote by ID
```http
GET /quotes/:id
```

### Admin Endpoints

Requires an admin API key.

#### Create Quote
```http
POST /quotes/admin
Content-Type: application/json

{
  "quoteText": "Your quote text",
  "author": "Author Name",
  "category": "Category",
  "language": "en"
}
```

#### Update Quote
```http
PUT /quotes/admin/:id
Content-Type: application/json

{
  "quoteText": "Updated quote text",
  "author": "Updated Author Name",
  "category": "Updated Category",
  "language": "en"
}
```

#### Delete Quote
```http
DELETE /quotes/admin/:id
```

### Moods

#### Create Mood (Admin)
```http
POST /moods/admin
Content-Type: application/json

{
  "name": "Happy",
  "description": "Feeling joyful and content",
  "emoji": "😊",
  "language": "en"
}
```

#### Update Mood (Admin)
```http
PUT /moods/admin/:id
Content-Type: application/json

{
  "name": "Very Happy",
  "description": "Feeling extremely joyful",
  "emoji": "😊",
  "language": "en"
}
```

#### Delete Mood (Admin)
```http
DELETE /moods/admin/:id
```

## Response Format

All API responses follow a consistent format:

```json
{
  "message": "Operation status message",
  "data": {}, // Optional response data
  "status": 200 // HTTP status code
}
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400` Bad Request - Invalid input
- `401` Unauthorized - Invalid or missing API key
- `403` Forbidden - Insufficient permissions
- `404` Not Found - Resource not found
- `500` Internal Server Error - Server error

## Development

This API is built with:
- [Elysia.js](https://elysiajs.com/) - Fast Node.js web framework
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- UUID for API key generation
