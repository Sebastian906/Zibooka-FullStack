# Technical Manual - ZiBooka

## Introduction

This document describes the technical aspects of the ZiBooka system, including architecture, technologies, libraries used, development environment configuration, and deployment considerations.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Base Technologies](#2-base-technologies)
3. [Backend - Dependencies and Libraries](#3-backend---dependencies-and-libraries)
4. [Frontend - Dependencies and Libraries](#4-frontend---dependencies-and-libraries)
5. [Project Structure](#5-project-structure)
6. [Data Models](#6-data-models)
7. [Authentication System](#7-authentication-system)
8. [API Endpoints](#8-api-endpoints)
9. [Environment Configuration](#9-environment-configuration)
10. [Testing](#10-testing)
11. [Deployment](#11-deployment)
12. [Security Considerations](#12-security-considerations)

---

## 1. System Architecture

### 1.1 Architectural Pattern

The system implements a three-tier architecture:

- **Presentation Layer**: React SPA (Single Page Application)
- **Business Layer**: REST API developed with NestJS
- **Data Layer**: MongoDB database

### 1.2 Inter-Layer Communication

```
Client (React)
      |
      | HTTP/HTTPS (REST API)
      | JSON
      v
Server (NestJS)
      |
      | Mongoose ODM
      v
Database (MongoDB)
```

### 1.3 External Services

| Service | Purpose | Integration |
|---------|---------|-------------|
| MongoDB Atlas | Cloud database | Mongoose ODM |
| Cloudinary | Image storage | Cloudinary SDK |
| Stripe | Payment processing | Stripe API |
| SMTP Server | Email sending | Nodemailer |

### 1.4 Backend Design Patterns

NestJS implements the following patterns:

- **Modules**: Code organization in independent modules
- **Dependency Injection**: Automatic instance management
- **Decorators**: Metaprogramming for routes, validation, and authorization
- **Guards**: Route protection through authorization middleware
- **DTOs**: Data Transfer Objects for input validation

---

## 2. Base Technologies

### 2.1 Backend

| Technology | Version | Description |
|------------|---------|-------------|
| Node.js | 18+ | JavaScript runtime environment |
| NestJS | 11.0.1 | Progressive Node.js framework |
| TypeScript | 5.7.3 | Typed JavaScript superset |
| MongoDB | 6+ | Document-oriented NoSQL database |

### 2.2 Frontend

| Technology | Version | Description |
|------------|---------|-------------|
| React | 19.2.3 | User interface library |
| Vite | 7.2.4 | Modern build tool |
| JavaScript (ES6+) | - | Programming language |
| TailwindCSS | 4.1.18 | Utility CSS framework |

---

## 3. Backend - Dependencies and Libraries

### 3.1 Production Dependencies

#### Framework and Core

| Library | Version | Purpose |
|---------|---------|---------|
| @nestjs/common | 11.0.1 | Common NestJS decorators and utilities |
| @nestjs/core | 11.0.1 | NestJS framework core |
| @nestjs/platform-express | 11.0.1 | Express adapter for NestJS |
| @nestjs/config | 4.0.2 | Configuration and environment variable management |
| reflect-metadata | 0.2.2 | Decorator metadata polyfill |
| rxjs | 7.8.1 | Reactive programming with observables |

#### Database

| Library | Version | Purpose |
|---------|---------|---------|
| @nestjs/mongoose | 11.0.4 | Mongoose integration with NestJS |
| mongoose | 9.1.1 | MongoDB ODM, data modeling |

#### Authentication and Security

| Library | Version | Purpose |
|---------|---------|---------|
| jsonwebtoken | 9.0.3 | JWT token generation and verification |
| bcryptjs | 3.0.3 | Password encryption via hashing |
| cookie-parser | 1.4.7 | Cookie parsing in HTTP requests |

#### Validation

| Library | Version | Purpose |
|---------|---------|---------|
| class-validator | 0.14.3 | DTO validation via decorators |
| class-transformer | 0.5.1 | Plain object to class instance transformation |
| validator | 13.15.26 | String validation functions |

#### Documentation

| Library | Version | Purpose |
|---------|---------|---------|
| @nestjs/swagger | 11.2.5 | Automatic OpenAPI documentation generation |

#### External Services

| Library | Version | Purpose |
|---------|---------|---------|
| cloudinary | 2.8.0 | SDK for image upload and management in Cloudinary |
| stripe | 20.3.0 | SDK for payment processing with Stripe |
| nodemailer | 7.0.13 | Email sending via SMTP |

#### Report Generation

| Library | Version | Purpose |
|---------|---------|---------|
| pdfkit | 0.17.2 | PDF document generation |
| exceljs | 4.4.0 | Excel spreadsheet generation (XLSX) |

#### Utilities

| Library | Version | Purpose |
|---------|---------|---------|
| multer | 2.0.2 | Middleware for multipart/form-data handling (uploads) |
| cors | 2.8.5 | Middleware for enabling CORS |

### 3.2 Development Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| @nestjs/cli | 11.0.0 | CLI for NestJS code generation |
| @nestjs/testing | 11.0.1 | Unit testing utilities |
| jest | 30.0.0 | Testing framework |
| ts-jest | 29.2.5 | TypeScript support for Jest |
| supertest | 7.0.0 | HTTP integration testing |
| eslint | 9.18.0 | JavaScript/TypeScript linter |
| prettier | 3.4.2 | Code formatter |
| typescript | 5.7.3 | TypeScript compiler |

---

## 4. Frontend - Dependencies and Libraries

### 4.1 Production Dependencies

#### Core and Rendering

| Library | Version | Purpose |
|---------|---------|---------|
| react | 19.2.3 | Main library for UI construction |
| react-dom | 19.2.0 | React rendering in browser DOM |

#### Routing

| Library | Version | Purpose |
|---------|---------|---------|
| react-router-dom | 7.11.0 | Declarative routing for React SPA applications |

#### HTTP Communication

| Library | Version | Purpose |
|---------|---------|---------|
| axios | 1.13.2 | Promise-based HTTP client for API requests |

#### Styles

| Library | Version | Purpose |
|---------|---------|---------|
| tailwindcss | 4.1.18 | Utility CSS framework for responsive styles |
| @tailwindcss/vite | 4.1.18 | Tailwind plugin for Vite integration |

#### Internationalization

| Library | Version | Purpose |
|---------|---------|---------|
| i18next | 25.8.0 | Internationalization framework |
| react-i18next | 16.5.4 | i18next integration with React |
| i18next-browser-languagedetector | 8.2.0 | Automatic browser language detection |

#### UI Components

| Library | Version | Purpose |
|---------|---------|---------|
| swiper | 12.0.3 | Touch carousel/slider component |
| react-icons | 5.5.0 | Icon collection as React components |
| react-hot-toast | 2.6.0 | Elegant and customizable toast notifications |

### 4.2 Development Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| vite | 7.2.4 | Build tool and development server |
| @vitejs/plugin-react | 5.1.1 | Vite plugin for React support |
| eslint | 9.39.1 | JavaScript linter |
| eslint-plugin-react-hooks | 7.0.1 | ESLint rules for React hooks |
| eslint-plugin-react-refresh | 0.4.24 | Fast Refresh support for ESLint |

---

## 5. Project Structure

### 5.1 General Structure

```
Book-Store-App/
├── client/                 # Frontend Application (React)
├── server/                 # Backend API (NestJS)
├── render.yaml             # Render deployment configuration
├── README.md               # General documentation
├── USER_MANUAL.md          # User guide
└── TECHNICAL_MANUAL.md     # This document
```

### 5.2 Backend Structure

```
server/
├── src/
│   ├── addresses/
│   │   ├── address.controller.ts
│   │   ├── address.module.ts
│   │   ├── address.service.ts
│   │   ├── dto/
│   │   │   └── create-address.dto.ts
│   │   └── schemas/
│   │       └── address.schema.ts
│   │
│   ├── admin/
│   │   ├── admin.controller.ts
│   │   ├── admin.module.ts
│   │   ├── admin.service.ts
│   │   └── dto/
│   │       └── admin-login.dto.ts
│   │
│   ├── carts/
│   │   └── cart.controller.ts
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── admin/
│   │   │   │   └── admin-email.decorator.ts
│   │   │   └── users/
│   │   │       └── user-id.decorator.ts
│   │   └── guards/
│   │       ├── admin-auth/
│   │       │   └── admin-auth.guard.ts
│   │       └── auth/
│   │           └── auth.guard.ts
│   │
│   ├── config/
│   │   └── mongodb.config.ts
│   │
│   ├── email/
│   │   ├── email.module.ts
│   │   └── email.service.ts
│   │
│   ├── loans/
│   │   ├── loan.controller.ts
│   │   ├── loan.module.ts
│   │   ├── loan.service.ts
│   │   ├── dto/
│   │   └── schemas/
│   │       └── loan.schema.ts
│   │
│   ├── orders/
│   │   ├── order.controller.ts
│   │   ├── order.module.ts
│   │   ├── order.service.ts
│   │   ├── dto/
│   │   ├── schemas/
│   │   └── stripe-webhook/
│   │
│   ├── products/
│   │   ├── product.controller.ts
│   │   ├── product.module.ts
│   │   ├── product.service.ts
│   │   ├── dto/
│   │   └── schemas/
│   │       └── product.schema.ts
│   │
│   ├── reports/
│   │   ├── report.controller.ts
│   │   ├── report.module.ts
│   │   └── report.service.ts
│   │
│   ├── reservations/
│   │   ├── reservation.controller.ts
│   │   ├── reservation.module.ts
│   │   ├── reservation.service.ts
│   │   ├── dto/
│   │   └── schemas/
│   │       └── reservation.schema.ts
│   │
│   ├── shelves/
│   │   ├── shelf.controller.ts
│   │   ├── shelf.module.ts
│   │   ├── shelf.service.ts
│   │   ├── dtos/
│   │   └── schemas/
│   │       └── shelf.schema.ts
│   │
│   ├── users/
│   │   ├── user.controller.ts
│   │   ├── user.module.ts
│   │   ├── user.service.ts
│   │   ├── dto/
│   │   └── schemas/
│   │       └── user.schema.ts
│   │
│   ├── app.controller.ts
│   ├── app.module.ts
│   ├── app.service.ts
│   └── main.ts
│
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
│
├── package.json
├── tsconfig.json
└── nest-cli.json
```

### 5.3 Frontend Structure

```
client/
├── src/
│   ├── assets/
│   │   ├── logo.png
│   │   ├── data.jsx
│   │   ├── blogs/
│   │   └── categories/
│   │
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   ├── Navbar.jsx
│   │   ├── Hero.jsx
│   │   ├── Categories.jsx
│   │   ├── FeaturedBooks.jsx
│   │   ├── PopularBooks.jsx
│   │   ├── NewArrivals.jsx
│   │   ├── Item.jsx
│   │   ├── Title.jsx
│   │   ├── CartTotal.jsx
│   │   ├── NewsLetter.jsx
│   │   ├── Achievements.jsx
│   │   ├── ProductDescription.jsx
│   │   ├── ProductFeatures.jsx
│   │   ├── RelatedBooks.jsx
│   │   ├── LanguageToggle.jsx
│   │   └── admin/
│   │       ├── Sidebar.jsx
│   │       └── AdminLogin.jsx
│   │
│   ├── context/
│   │   └── ShopContext.jsx
│   │
│   ├── i18n/
│   │   ├── index.js
│   │   └── locales/
│   │       ├── en.json
│   │       └── es.json
│   │
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Shop.jsx
│   │   ├── CategoryShop.jsx
│   │   ├── ProductDetails.jsx
│   │   ├── Cart.jsx
│   │   ├── AddressForm.jsx
│   │   ├── MyOrders.jsx
│   │   ├── MyLoans.jsx
│   │   ├── MyReservations.jsx
│   │   ├── Profile.jsx
│   │   ├── Login.jsx
│   │   ├── ForgotPassword.jsx
│   │   ├── ResetPassword.jsx
│   │   ├── Blog.jsx
│   │   ├── Contact.jsx
│   │   ├── Loading.jsx
│   │   └── admin/
│   │       ├── AddProduct.jsx
│   │       ├── ProductList.jsx
│   │       ├── Orders.jsx
│   │       ├── Shelves.jsx
│   │       ├── AdminLoans.jsx
│   │       └── Reports.jsx
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── public/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── eslint.config.js
```

---

## 6. Data Models

### 6.1 User

```typescript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  phone: String,
  profileImage: String,
  cartData: Object,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 6.2 Product

```typescript
{
  _id: ObjectId,
  name: String (required),
  description: String,
  author: String,
  ISBN: String (unique),
  price: Number (required),
  offerPrice: Number,
  category: String (required),
  images: [String],
  popular: Boolean,
  stock: Number (default: 0),
  loanStock: Number (default: 0),
  weight: Number,
  pages: Number,
  language: String,
  publisher: String,
  translations: {
    es: { name, description },
    // other languages
  },
  shelfId: ObjectId (ref: Shelf),
  createdAt: Date,
  updatedAt: Date
}
```

### 6.3 Order

```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, required),
  items: [{
    product: ObjectId (ref: Product),
    quantity: Number
  }],
  amount: Number (required),
  address: {
    firstName: String,
    lastName: String,
    email: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    phone: String
  },
  status: String (enum: ['Pending', 'Processing', 'Shipped', 'Delivered']),
  paymentType: String (enum: ['COD', 'Stripe']),
  isPaid: Boolean,
  stripeSessionId: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 6.4 Loan

```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, required),
  bookId: ObjectId (ref: Product, required),
  loanDate: Date (default: now),
  dueDate: Date (required, loanDate + 14 days),
  returnDate: Date,
  status: String (enum: ['active', 'completed', 'overdue']),
  createdAt: Date,
  updatedAt: Date
}
```

### 6.5 Reservation

```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, required),
  bookId: ObjectId (ref: Product, required),
  reservationDate: Date (default: now),
  expiryDate: Date (reservationDate + 30 days),
  priority: Number (position in queue),
  status: String (enum: ['pending', 'fulfilled', 'expired', 'cancelled']),
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 6.6 Shelf

```typescript
{
  _id: ObjectId,
  code: String (required, unique),
  location: String,
  maxWeight: Number (default: 50),
  currentWeight: Number (default: 0),
  books: [ObjectId] (ref: Product),
  description: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 7. Authentication System

### 7.1 User Authentication Flow

1. User sends credentials (email/password) to `/api/user/login` endpoint
2. Server validates credentials against the database
3. If valid, a JWT is generated with the user ID
4. Token is sent as an HTTP-only cookie
5. Client also stores the token in localStorage
6. Subsequent requests include the token in Authorization header or cookie

### 7.2 Administrator Authentication Flow

1. Administrator sends credentials to `/api/admin/login` endpoint
2. Server validates against environment variables (ADMIN_EMAIL, ADMIN_PASS, ADMIN_PHONE)
3. If valid, a JWT is generated with the administrator's email
4. Token is sent as `adminToken` cookie
5. Protected routes verify this token via `AdminAuthGuard`

### 7.3 Authentication Guards

**AuthGuard** (Regular users):
- Verifies token in `token` cookie or `Authorization` header
- Decodes JWT and extracts `userId`
- Injects `userId` into the request

**AdminAuthGuard** (Administrators):
- Verifies token in `adminToken` cookie or `Authorization` header
- Decodes JWT and extracts `email`
- Validates that email matches configured administrator

### 7.4 JWT Token Structure

```json
{
  "id": "userId_or_email",
  "session": "optional_session_id",
  "iat": 1234567890,
  "exp": 1235172690
}
```

Expiration: 7 days

---

## 8. API Endpoints

### 8.1 Authentication (/api/user)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /register | User registration | No |
| POST | /login | Login | No |
| POST | /logout | Logout | Yes |
| GET | /is-auth | Verify authentication | Yes |
| GET | /profile | Get profile | Yes |
| PUT | /update-profile | Update profile | Yes |
| POST | /forgot-password | Request recovery | No |
| POST | /reset-password | Reset password | No |

### 8.2 Administration (/api/admin)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /login | Admin login | No |
| POST | /logout | Admin logout | Admin |
| GET | /is-admin | Verify admin role | Admin |

### 8.3 Products (/api/product)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /list | List all products | No |
| GET | /list/:lang | List with translations | No |
| GET | /:id | Get product by ID | No |
| POST | /add | Add product | Admin |
| PUT | /update | Update product | Admin |
| DELETE | /delete/:id | Delete product | Admin |
| POST | /search/linear | Linear search | No |
| POST | /search/binary | Binary search by ISBN | No |
| GET | /sort-by-price | Sort by price | No |

### 8.4 Cart (/api/cart)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /add | Add to cart | Yes |
| POST | /update | Update quantity | Yes |

### 8.5 Addresses (/api/address)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /add | Add address | Yes |
| GET | /list | List addresses | Yes |

### 8.6 Orders (/api/order)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /cod | Create order (cash) | Yes |
| POST | /stripe | Create order (Stripe) | Yes |
| POST | /user-orders | User orders | Yes |
| POST | /list | List all (Admin) | Admin |
| POST | /status | Update status | Admin |

### 8.7 Loans (/api/loan)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /history | User history | Yes |
| POST | /create | Create loan | Yes |
| GET | /last-active | Last active loan | Yes |
| POST | /return/:loanId | Return book | Yes |
| GET | /stats | User statistics | Yes |
| GET | /admin/all | All loans | Admin |

### 8.8 Reservations (/api/reservation)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /my-reservations | User reservations | Yes |
| POST | /create | Create reservation | Yes |
| POST | /cancel/:id | Cancel reservation | Yes |
| GET | /waiting-list/:bookId | Waiting list | No |
| GET | /stats | User statistics | Yes |

### 8.9 Shelves (/api/shelf)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /create | Create shelf | Admin |
| GET | /list | List shelves | Admin |
| POST | /assign-book | Assign book | Admin |
| DELETE | /remove-book/:shelfId/:bookId | Remove book | Admin |
| GET | /dangerous-combinations/:id | Combination analysis | Admin |
| GET | /optimize/:id | Optimize shelf | Admin |

### 8.10 Reports (/api/report)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /inventory/pdf | Inventory in PDF | Admin |
| GET | /inventory/xlsx | Inventory in Excel | Admin |
| GET | /loans/pdf | Loans in PDF | Admin |
| GET | /loans/xlsx | Loans in Excel | Admin |
| GET | /recursion-preview | Recursion calculation preview | Admin |

---

## 9. Environment Configuration

### 9.1 Backend Environment Variables

Create `.env` file in the `server/` folder:

```env
# Database
MONGODB_URI=URL_given_by_MongoDB_Atlas

# Security
JWT_SECRET=very_long_and_secure_jwt_secret_key

# Administrator
ADMIN_EMAIL=admin@zibooka.com
ADMIN_PASS=secure_admin_password
ADMIN_PHONE=+1234567890

# Cloudinary
CLOUDINARY_CLOUD_NAME=cloud_name
CLOUDINARY_API_KEY=cloudinary_api_key
CLOUDINARY_API_SECRET=cloudinary_api_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=app_password

# Environment
APP_ENV=development
VITE_FRONTEND_URL=http://localhost:5173
```

### 9.2 Frontend Environment Variables

Create `.env` file in the `client/` folder:

```env
VITE_BACKEND_URL=http://localhost:4000
VITE_CURRENCY=$
```

### 9.3 CORS Configuration

The backend is configured to accept requests from:

- `http://localhost:5173` (local development)
- `https://zibooka.onrender.com` (production)
- URLs defined in `VITE_FRONTEND_URL`

Configuration includes:
- Credentials enabled (`credentials: true`)
- Allowed methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
- Allowed headers: Content-Type, Authorization, Accept, X-Requested-With

---

## 10. Testing

### 10.1 Test Structure

```
server/
├── src/
│   ├── **/*.spec.ts      # Unit tests
└── test/
    ├── app.e2e-spec.ts   # End-to-end tests
    ├── admin.e2e-spec.ts
    ├── user.e2e-spec.ts
    └── jest-e2e.json
```

### 10.2 Running Tests

```bash
# Unit tests
npm run test

# Tests with coverage
npm run test:cov

# End-to-end tests
npm run test:e2e

# Watch mode
npm run test:watch
```

### 10.3 Jest Configuration

The project uses Jest with the following configurations:

- Module extensions: js, json, ts
- Test regex: `.*\.spec\.ts$`
- Transformer: ts-jest
- Environment: node

---

## 11. Deployment

### 11.1 Render Configuration

The `render.yaml` file defines the services:

```yaml
services:
  # Backend
  - type: web
    name: zibooka-backend
    env: node
    buildCommand: cd server && npm install && npm run build
    startCommand: cd server && npm run start:prod

  # Frontend
  - type: static
    name: zibooka-frontend
    buildCommand: cd client && npm install && npm run build
    staticPublishPath: client/dist
```

### 11.2 Deployment Process

1. Push changes to the `main` branch
2. Render automatically detects changes
3. Executes build commands
4. Deploys updated services

### 11.3 Production Considerations

- Configure environment variables in Render dashboard
- Use MongoDB Atlas for the database
- Configure custom domain if needed
- Enable HTTPS (automatic on Render)

---

## 12. Security Considerations

### 12.1 Authentication

- Passwords encrypted with bcrypt (salt rounds: 10)
- JWT tokens with 7-day expiration
- HTTP-only cookies for sensitive tokens
- Token validation on each protected request

### 12.2 Data Validation

- DTOs with class-validator for input validation
- Data sanitization before storage
- Type validation with TypeScript

### 12.3 Route Protection

- Guards for authentication verification
- Role separation (user/admin)
- Custom decorators for token data extraction

### 12.4 CORS

- Whitelist of allowed origins
- Credentials enabled only for trusted origins

### 12.5 Error Handling

- Standardized HTTP exceptions from NestJS
- Generic error messages in production
- Server-side error logging

### 12.6 Payments

- Stripe handles all card data
- Server never stores payment information
- Webhooks verified with Stripe signature

---

## Technical Glossary

| Term | Definition |
|------|------------|
| REST API | Programming interface that uses HTTP for communication |
| DTO | Data Transfer Object, object for validating input data |
| Guard | Middleware that protects routes based on conditions |
| JWT | JSON Web Token, standard for authentication tokens |
| ODM | Object Document Mapper, maps objects to database documents |
| SPA | Single Page Application, single-page application |
| Webhook | HTTP callback that notifies events in real-time |

---

## References

- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Stripe Documentation](https://stripe.com/docs)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
