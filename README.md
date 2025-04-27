# Design Inspiration Platform API

A robust backend system for a SaaS design inspiration platform that allows admins to collect and manage design inspirations from websites. The system automatically extracts website information, captures screenshots, and provides a comprehensive API for managing design inspirations.

## 🚀 Features

- **Website Analysis**

  - Extract internal links from any website
  - Capture desktop and mobile screenshots
  - Detect color schemes and fonts
  - Identify technology stack

- **Inspiration Management**

  - Create and store design inspirations
  - Categorize by niche and type
  - Track page views
  - Manage meta information

- **Advanced Features**
  - JWT-based authentication for admin routes
  - Cloud storage for screenshots (AWS S3)
  - Request logging and monitoring
  - Input validation and error handling
  - Pagination support
  - Comprehensive API documentation

## 🛠️ Tech Stack

- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Prisma ORM
- **Web Scraping**: Puppeteer
- **Object Storage**: Cloudflare R2
- **Authentication**: JWT
- **Validation**: Zod
- **Logging**: Simple-Logmate (My Own Package)

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB

## 🔧 Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd atozdebug-assignment
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:

   ```env
   PORT=3000
   DATABASE_URL="your_mongodb_connection_string"
   NODE_ENV="development"
   JWT_SECRET="your_jwt_secret"
   CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
   CLOUDFLARE_ACCESS_KEY_ID=your_cloudflare_access_key_id
   CLOUDFLARE_SECRET_ACCESS_KEY=your_cloudflare_secret_access_key
   CLOUDFLARE_BUCKET_NAME=your_bucket_name
   CLOUDFLARE_ENDPOINT=your_cloudflare_endpoint
   CLOUDFLARE_PUBLIC_URL=your_cloudflare_public_url
   ```

4. Generate Prisma client:

   ```bash
   npx prisma generate
   ```

5. Build and run the project:

   ```bash
   # Development
   npm run dev

   # Production
   npm run build
   npm start
   ```

## 📚 API Documentation

### Extract Links

```http
POST /api/extract-links
```

Extract all internal links from a given URL.

**Request Body:**

```json
{
  "url": "https://example.com"
}
```

### Add Inspirations

```http
POST /api/inspirations
```

Add new inspirations from selected URLs.

**Request Body:**

```json
{
  "urls": ["https://example.com/page1", "https://example.com/page2"]
}
```

### Get All Inspirations

```http
GET /api/inspirations?page=1&limit=10
```

Retrieve paginated list of inspirations.

### Get Single Inspiration

```http
GET /api/inspirations/:slug
```

Get detailed information about a specific inspiration.

For complete API documentation, visit:
[Postman Documentation](https://www.postman.com/dark-shuttle-293138/workspace/assignments/collection/32059509-57fcc8e9-d1b1-405e-801a-5b9f30d63538?action=share&creator=32059509)

## 📊 Database Schema

### Inspiration Model

- `title` (required)
- `description` (required, max 300 characters)
- `websiteLink` (required)
- `desktopScreenshotUrl`
- `mobileScreenshotUrl`
- `colorScheme` (array)
- `fonts` (array)
- `technologyStack` (array)
- `categories` (array)
- `niche`
- `slug` (unique)
- `metaTitle`
- `metaDescription`
- `pageViews`
- `createdAt`
- `updatedAt`

## 🔐 Security

- JWT-based authentication for admin routes
- Input validation using Zod
- Secure password hashing using bcrypt
- Environment variables for sensitive data
- CORS enabled
- Request logging and monitoring
