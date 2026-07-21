# Technical Manual - ZiBooka

## Introduction

This document describes the technical aspects of the ZiBooka system, including architecture, technologies, libraries used, data structures and algorithms, machine learning models, MongoDB indexing strategy, development environment configuration, and deployment considerations.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Base Technologies](#2-base-technologies)
3. [Backend - Dependencies and Libraries](#3-backend---dependencies-and-libraries)
4. [Frontend - Dependencies and Libraries](#4-frontend---dependencies-and-libraries)
5. [ML Microservice - Dependencies and Libraries](#5-ml-microservice---dependencies-and-libraries)
6. [Project Structure](#6-project-structure)
7. [Data Models](#7-data-models)
8. [MongoDB Indexes](#8-mongodb-indexes)
9. [Data Structures and Algorithms](#9-data-structures-and-algorithms)
10. [Machine Learning Models](#10-machine-learning-models)
11. [Authentication System](#11-authentication-system)
12. [API Endpoints](#12-api-endpoints)
13. [Environment Configuration](#13-environment-configuration)
14. [Caching Strategy](#14-caching-strategy)
15. [Testing](#15-testing)
16. [Deployment](#16-deployment)
17. [Security Considerations](#17-security-considerations)

---

## 1. System Architecture

### 1.1 Architectural Pattern

The system implements a distributed architecture with three core services:

- **Presentation Layer**: React SPA (Single Page Application) with TailwindCSS
- **Business Layer**: REST API developed with NestJS (14 modules)
- **ML Layer**: FastAPI microservice with 5 predictive models
- **Data Layer**: MongoDB 7 database with 26 optimized indexes + Redis 7 cache

### 1.2 Inter-Layer Communication

```
Client (React)
      |
      | HTTP/HTTPS (REST API)
      | JSON + JWT (cookie + Bearer header)
      v
Server (NestJS)
      |
      ├── Mongoose ODM ──> Database (MongoDB)
      ├── Redis Cache ──> Cache Layer (Redis / in-memory fallback)
      ├── HTTP Client ──> ML Microservice (FastAPI)
      └── Nodemailer ──> SMTP Server (Email)
```

### 1.3 External Services

| Service | Purpose | Integration |
|---------|---------|-------------|
| MongoDB 7 | Primary database | Mongoose ODM (async) |
| Redis 7 | Caching layer | cache-manager-ioredis-yet |
| Cloudinary | Image storage | Cloudinary SDK |
| Stripe | Payment processing | Stripe API + Webhooks |
| SMTP Server | Email sending | Nodemailer |
| FastAPI ML | Machine Learning predictions | HTTP Client (axios) |
| Google OAuth | Social authentication | Passport.js |

### 1.4 Backend Design Patterns

NestJS implements the following patterns:

- **Modules**: Code organization in 14 independent modules
- **Dependency Injection**: Automatic instance management
- **Decorators**: Metaprogramming for routes, validation, and authorization
- **Guards**: Route protection (AuthGuard, AdminAuthGuard)
- **DTOs**: Data Transfer Objects for input validation
- **Interceptors**: Response transformation and caching
- **Filters**: Global exception handling
- **Pipes**: Data validation and transformation

---

## 2. Base Technologies

### 2.1 Backend

| Technology | Version | Description |
|------------|---------|-------------|
| Node.js | 18+ | JavaScript runtime environment |
| NestJS | 11.0.1 | Progressive Node.js framework |
| TypeScript | 5.7.3 | Typed JavaScript superset |
| MongoDB | 7 | Document-oriented NoSQL database |
| Redis | 7 | In-memory data store for caching |

### 2.2 Frontend

| Technology | Version | Description |
|------------|---------|-------------|
| React | 19.2.3 | User interface library |
| Vite | 7.2.4 | Modern build tool |
| JavaScript (ES6+) | - | Programming language |
| TailwindCSS | 4.1.18 | Utility CSS framework |

### 2.3 ML Microservice

| Technology | Version | Description |
|------------|---------|-------------|
| Python | 3.10+ | Programming language |
| FastAPI | 0.139.0 | High-performance async API framework |
| scikit-learn | 1.9.0 | Machine learning library |
| XGBoost | 3.3.0 | Gradient boosting framework |
| Pandas | 3.0.3 | Data manipulation library |
| NumPy | 2.5.1 | Numerical computing library |
| Motor | 3.6.1 | Async MongoDB driver for Python |

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

#### Caching

| Library | Version | Purpose |
|---------|---------|---------|
| @nestjs/cache-manager | 3.0.0 | Cache management integration |
| cache-manager-ioredis-yet | 4.0.0 | Redis cache store with ioredis |

#### Authentication and Security

| Library | Version | Purpose |
|---------|---------|---------|
| jsonwebtoken | 9.0.3 | JWT token generation and verification |
| bcryptjs | 3.0.3 | Password encryption via hashing |
| cookie-parser | 1.4.7 | Cookie parsing in HTTP requests |
| @nestjs/passport | 11.0.0 | Passport integration for NestJS |
| passport | 0.7.0 | Authentication middleware |
| passport-jwt | 4.0.1 | JWT strategy for Passport |
| passport-google-oauth20 | 2.0.0 | Google OAuth 2.0 strategy |

#### Rate Limiting

| Library | Version | Purpose |
|---------|---------|---------|
| @nestjs/throttler | 6.0.0 | Rate limiting (100 req/60s per IP) |

#### Scheduling

| Library | Version | Purpose |
|---------|---------|---------|
| @nestjs/schedule | 5.0.0 | Cron job scheduling (daily notifications at 9AM) |

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
| axios | 1.13.2 | HTTP client for ML microservice communication |

#### Report Generation

| Library | Version | Purpose |
|---------|---------|---------|
| pdfkit | 0.17.2 | PDF document generation |
| exceljs | 4.4.0 | Excel spreadsheet generation (XLSX) |

#### Migration

| Library | Version | Purpose |
|---------|---------|---------|
| mysql2 | 3.11.0 | MySQL driver for MongoDB -> MySQL migration |

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

## 5. ML Microservice - Dependencies and Libraries

### 5.1 Production Dependencies

#### Framework

| Library | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.139.0 | High-performance async API framework |
| uvicorn | 0.50.0 | ASGI server for FastAPI |

#### Machine Learning

| Library | Version | Purpose |
|---------|---------|---------|
| scikit-learn | 1.9.0 | Machine learning algorithms (Isolation Forest, metrics) |
| xgboost | 3.3.0 | Gradient boosting for classification/regression |
| pandas | 3.0.3 | Data manipulation and analysis |
| numpy | 2.5.1 | Numerical computing |
| joblib | 1.4.2 | Model serialization and persistence |

#### Database

| Library | Version | Purpose |
|---------|---------|---------|
| motor | 3.6.1 | Async MongoDB driver for Python |
| pymongo | 4.12.1 | MongoDB driver (Motor dependency) |

#### Validation

| Library | Version | Purpose |
|---------|---------|---------|
| pydantic | 2.11.0 | Data validation and settings management |

### 5.2 Development Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| pytest | 9.1.1 | Testing framework |
| httpx | 0.28.1 | HTTP client for testing FastAPI endpoints |

---

## 6. Project Structure

### 6.1 General Structure

```
Book-Store-App/
├── client/                 # Frontend Application (React)
├── server/                 # Backend API (NestJS)
├── ms-ml/                  # ML Microservice (FastAPI)
├── docs/                   # Documentation
│   ├── images/             # Screenshots and diagrams
│   ├── TECHNICAL_MANUAL.md
│   ├── USER_MANUAL.md
│   ├── MANUAL_TECNICO.md
│   └── MANUAL_DE_USUARIO.md
├── docker-compose.yaml     # Docker orchestration
├── render.yaml             # Render deployment configuration
├── README.md               # General documentation (English)
├── README-ES.md            # General documentation (Spanish)
└── SECURITY.md             # Security policy
```

### 6.2 Backend Structure

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
│   │   ├── guards/
│   │   │   ├── admin-auth/
│   │   │   │   └── admin-auth.guard.ts
│   │   │   └── auth/
│   │   │       └── auth.guard.ts
│   │   ├── services/
│   │   │   └── translation.service.ts
│   │   └── utils/
│   │       ├── max-heap.ts
│   │       └── max-heap.test.ts
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
│   │       ├── loan.schema.ts
│   │       └── high-risk-loan.schema.ts
│   │
│   ├── migration/
│   │   ├── migration.controller.ts
│   │   ├── migration.module.ts
│   │   └── migration.service.ts
│   │
│   ├── notifications/
│   │   ├── notification.controller.ts
│   │   ├── notification.module.ts
│   │   ├── notification.service.ts
│   │   ├── notification.scheduler.ts
│   │   └── schemas/
│   │       └── notification.schema.ts
│   │
│   ├── orders/
│   │   ├── order.controller.ts
│   │   ├── order.module.ts
│   │   ├── order.service.ts
│   │   ├── order-scheduler.service.ts
│   │   ├── dto/
│   │   ├── schemas/
│   │   └── stripe-webhook/
│   │
│   ├── prediction/
│   │   ├── prediction.controller.ts
│   │   ├── prediction.module.ts
│   │   └── prediction-client.service.ts
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
│   │   ├── report.service.ts
│   │   └── schemas/
│   │       └── report-cache.schema.ts
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
│   ├── admin.e2e-spec.ts
│   ├── user.e2e-spec.ts
│   ├── cart-optimization.e2e-spec.ts
│   └── jest-e2e.json
│
├── package.json
├── tsconfig.json
└── nest-cli.json
```

### 6.3 Frontend Structure

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
│   │   ├── CartPanel.jsx
│   │   ├── NewsLetter.jsx
│   │   ├── Achievements.jsx
│   │   ├── ProductDescription.jsx
│   │   ├── ProductFeatures.jsx
│   │   ├── RelatedBooks.jsx
│   │   ├── LanguageToggle.jsx
│   │   └── admin/
│   │       ├── Sidebar.jsx
│   │       ├── AdminLogin.jsx
│   │       └── TranslationModal.jsx
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
│   │   ├── OAuthCallback.jsx
│   │   ├── Blog.jsx
│   │   ├── Contact.jsx
│   │   ├── Loading.jsx
│   │   └── admin/
│   │       ├── AddProduct.jsx
│   │       ├── ProductList.jsx
│   │       ├── Orders.jsx
│   │       ├── Shelves.jsx
│   │       ├── AdminLoans.jsx
│   │       ├── Reports.jsx
│   │       ├── DemandPredictions.jsx
│   │       ├── InventoryAnomalies.jsx
│   │       └── Notifications.jsx
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

### 6.4 ML Microservice Structure

```
ms-ml/
├── app/
│   ├── main.py              # FastAPI app, CORS, middleware, lifespan
│   ├── config.py            # Settings (Pydantic): MongoDB, thresholds, models
│   ├── database.py          # MongoDB async connection (Motor)
│   │
│   ├── models/
│   │   ├── base.py              # BasePredictor (ABC): train, predict, save, load
│   │   ├── wait_time_predictor.py   # XGBoost regression (6 features)
│   │   ├── demand_predictor.py      # XGBoost classification (temporal features)
│   │   ├── overdue_predictor.py     # XGBoost classification (6-13 features)
│   │   └── anomaly_detector.py      # Isolation Forest (behavioral + shelf anomalies)
│   │
│   ├── routers/
│   │   ├── health.py        # GET /health
│   │   ├── predict.py       # POST /predict/* (wait-time, demand, overdue, anomaly)
│   │   └── train.py         # POST /train/* (from-database, individual models)
│   │
│   ├── schemas/
│   │   ├── wait_time.py     # WaitTimeRequest/Response
│   │   ├── demand.py        # DemandListRequest/Response
│   │   ├── overdue.py       # OverdueRequest/Response
│   │   └── anomaly.py       # AnomalyRequest/Response, ShelfAnomaliesResponse
│   │
│   └── utils/
│       ├── data_preparation.py  # Feature engineering and data preparation
│       ├── metrics.py           # Model evaluation metrics
│       └── serialization.py     # Model save/load utilities
│
├── models/                 # Persisted ML models (joblib)
├── tests/                  # Pytest test files
├── requirements.txt        # Python dependencies
├── Dockerfile              # Docker build configuration
└── .env                    # Environment variables
```

---

## 7. Data Models

### 7.1 User

```typescript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique),
  password: String (nullable, hashed with bcrypt),
  phone: String (nullable),
  profileImage: String (nullable),
  googleId: String (unique, sparse, nullable),
  cartData: Object (default: {}),
  lastLogin: Date (nullable),
  lastLogout: Date (nullable),
  lastActivity: Date (nullable),
  sessionToken: String (nullable),
  notificationPreferences: {
    emailReminders: Boolean (default: true)
  },
  completedOrders: Number (default: 0, min: 0),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

### 7.2 Product

```typescript
{
  _id: ObjectId,
  isbn: String (unique, sparse, indexed),
  name: String (required),
  description: String (required),
  author: String (indexed, default: 'Unknown Author'),
  price: Number (required),
  offerPrice: Number (required),
  pageCount: Number (min: 1, max: 5000, nullable),
  publisher: String (nullable),
  publicationYear: Number (min: 1800, max: current year, nullable),
  images: [String] (required),
  category: String (required, indexed),
  popular: Boolean (default: false),
  inStock: Boolean (default: true),
  loanStock: Number (default: 0, min: 0, max: 1),
  loanFee: Number (default: 5.00, min: 0),
  shelfLocation: ObjectId (ref: 'Shelf', nullable),
  translations: {
    [lang: string]: {
      name: String,
      description: String,
      category: String,
      translatedAt: Date,
      translatedBy: String ('automatic' | 'manual' | email)
    }
  },
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

### 7.3 Order

```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', required),
  items: [{
    product: ObjectId (ref: 'Product', required),
    quantity: Number (required)
  }],
  amount: Number (required),
  address: ObjectId (ref: 'Address', required),
  status: String (default: 'Order Placed'),
  paymentMethod: String (required), // 'COD' | 'Stripe'
  isPaid: Boolean (default: false),
  priority: Number (nullable), // MaxHeap priority score
  createdAt: Date (default: Date.now),
  updatedAt: Date (default: Date.now)
}
```

### 7.4 Loan

```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', required, indexed),
  bookId: ObjectId (ref: 'Product', required, indexed),
  loanDate: Date (default: Date.now),
  dueDate: Date (required), // loanDate + 14 days
  returnDate: Date (nullable),
  status: String (default: 'active', indexed),
    // enum: ['active', 'returned', 'overdue']
  lateFee: Number (default: 0), // $0.50/day
  notes: String,
  riskScore: Number (default: 0.5, min: 0, max: 1),
    // ML-predicted overdue probability
  notifiedAt: Date (nullable),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

### 7.5 HighRiskLoan

```typescript
{
  _id: ObjectId,
  loanId: ObjectId (ref: 'Loan', required, indexed),
  userId: ObjectId (ref: 'User', required, indexed),
  riskScore: Number (required, min: 0, max: 1),
  reviewed: Boolean (default: false),
  reviewedAt: Date,
  adminNotes: String,
  notified: Boolean (default: false),
  notifiedAt: Date,
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

### 7.6 Reservation

```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', required, indexed),
  bookId: ObjectId (ref: 'Product', required, indexed),
  requestDate: Date (default: Date.now),
  status: String (default: 'pending', indexed),
    // enum: ['pending', 'fulfilled', 'cancelled', 'expired']
  priority: Number (required), // Weighted scoring position
  estimatedWaitDays: Number (nullable), // ML prediction
  notifiedAt: Date (nullable),
  fulfilledAt: Date (nullable),
  expiresAt: Date (required),
  notes: String,
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

### 7.7 Shelf

```typescript
{
  _id: ObjectId,
  code: String (required, unique, uppercase),
  maxWeight: Number (default: 8),
  currentWeight: Number (default: 0),
  currentValue: Number (default: 0),
  books: [ObjectId] (ref: 'Product', default: []),
  location: String (required),
  status: String (default: 'safe'),
    // enum: ['safe', 'at-risk', 'overloaded']
  description: String,
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

### 7.8 Address

```typescript
{
  _id: ObjectId,
  userId: String (required), // Note: String, not ObjectId
  firstName: String (required),
  lastName: String (required),
  email: String (required),
  street: String (required),
  city: String (required),
  state: String (required),
  country: String (required),
  zipcode: String (required),
  phone: String (required),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

### 7.9 Notification

```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', required, indexed),
  type: String (required, indexed),
    // enum: ['loan_reminder', 'reservation_reminder', 'manual']
  subject: String (required),
  message: String (default: ''),
  relatedId: ObjectId (indexed), // Generic reference
  relatedModel: String, // enum: ['Loan', 'Reservation']
  sentAt: Date (default: Date.now),
  status: String (default: 'pending'),
    // enum: ['sent', 'failed', 'pending']
  error: String (nullable),
  sentBy: String (required), // enum: ['system', 'admin']
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

### 7.10 ReportCache

```typescript
{
  _id: ObjectId,
  cacheKey: String (required, indexed),
  reportType: String (required),
    // enum: ['inventory', 'loans', 'inventory-optimized']
  filters: Object (default: {}),
  data: Object (required), // Serialized report data
  recordCount: Number (required),
  generationTimeMs: Number (required),
  expiresAt: Date (default: Date.now),
  createdAt: Date (default: Date.now),
  updatedAt: Date (default: Date.now) // TTL index target (24h)
}
```

---

## 8. MongoDB Indexes

The database uses **26 optimized indexes** across 10 collections to ensure query performance.

### 8.1 Index Summary

| Collection | Total Indexes | Unique | Sparse | Compound | TTL |
|------------|---------------|--------|--------|----------|-----|
| User | 2 | 2 | 1 | 0 | 0 |
| Product | 3 | 1 | 1 | 1 | 0 |
| Order | 3 | 0 | 0 | 3 | 0 |
| Loan | 4 | 0 | 0 | 1 | 0 |
| Reservation | 5 | 0 | 0 | 2 | 0 |
| Shelf | 1 | 1 | 0 | 0 | 0 |
| Address | 1 | 0 | 0 | 1 | 0 |
| Notification | 5 | 0 | 0 | 2 | 0 |
| ReportCache | 3 | 0 | 0 | 1 | 1 |
| HighRiskLoan | 2 | 0 | 0 | 0 | 0 |
| **TOTAL** | **29** | **4** | **2** | **11** | **1** |

### 8.2 Detailed Index Definitions

#### User Collection
```typescript
// Unique index on email (implicit from @Prop({ unique: true }))
{ email: 1 }

// Sparse unique index on googleId (allows multiple nulls)
{ googleId: 1 }, { sparse: true, unique: true }
```

#### Product Collection
```typescript
// Sparse unique index on isbn
{ isbn: 1 }, { sparse: true, unique: true }

// Single index on author
{ author: 1 }

// Single index on category
{ category: 1 }
```

#### Order Collection
```typescript
// Compound index: user orders sorted by date
{ userId: 1, createdAt: -1 }

// Single index: order status filtering
{ status: 1 }

// Single index: all orders sorted by date
{ createdAt: -1 }
```

#### Loan Collection
```typescript
// Single indexes
{ userId: 1 }
{ bookId: 1 }
{ status: 1 }

// Compound index: loan history per book
{ bookId: 1, loanDate: -1 }
```

#### Reservation Collection
```typescript
// Single indexes
{ userId: 1 }
{ bookId: 1 }
{ status: 1 }

// Compound index: waiting queue (book + status + priority)
{ bookId: 1, status: 1, priority: 1 }

// Compound index: user reservation history
{ userId: 1, requestDate: -1 }
```

#### Shelf Collection
```typescript
// Unique index on code
{ code: 1 }, { unique: true }
```

#### Address Collection
```typescript
// Compound index: user addresses sorted by date
{ userId: 1, createdAt: -1 }
```

#### Notification Collection
```typescript
// Single indexes
{ userId: 1 }
{ type: 1 }
{ relatedId: 1 }

// Compound index: admin history (user + date)
{ userId: 1, sentAt: -1 }

// Compound index: duplicate verification
{ relatedId: 1, relatedModel: 1, type: 1 }
```

#### ReportCache Collection
```typescript
// Single index on cacheKey
{ cacheKey: 1 }

// Compound index: report type + cache key
{ reportType: 1, cacheKey: 1 }

// TTL index: auto-delete after 24 hours
{ updatedAt: 1 }, { expireAfterSeconds: 86400 }
```

#### HighRiskLoan Collection
```typescript
// Single indexes
{ loanId: 1 }
{ userId: 1 }
```

---

## 9. Data Structures and Algorithms

### 9.1 MaxHeap (Priority Queue)

**Location**: `server/src/common/utils/max-heap.ts`

**Purpose**: Process orders by priority score instead of FIFO.

**Implementation**: Array-based binary max-heap with O(log n) insert and extractMax.

**Priority Calculation**:
```
priority = paymentScore + historyScore + ageScore
```
- `paymentScore`: 1.0 for Stripe, 0.5 for COD
- `historyScore`: based on user's completed orders
- `ageScore`: based on order age (older = higher priority)

**Operations**:
- `insert(item)`: O(log n)
- `extractMax()`: O(log n)
- `peek()`: O(1)
- `size()`: O(1)
- `buildHeap(array)`: O(n)

### 9.2 Binary Search

**Location**: `server/src/products/product.service.ts`

**Purpose**: Fast product lookup by ISBN (O(log n)).

**Prerequisite**: Products must be sorted by ISBN.

**Complexity**: O(log n) time, O(1) space.

### 9.3 Linear Search

**Location**: `server/src/products/product.service.ts`

**Purpose**: Product search by title or author (O(n)).

**Used when**: Search criteria is not ISBN.

**Complexity**: O(n) time, O(1) space.

### 9.4 Merge Sort

**Location**: `server/src/products/product.service.ts`

**Purpose**: Sort products by price (O(n log n)).

**Advantage**: Stable sort, consistent performance regardless of input order.

**Complexity**: O(n log n) time, O(n) space.

### 9.5 Backtracking (Knapsack Problem)

**Location**: `server/src/shelves/shelf.service.ts`

**Purpose**: Optimize shelf allocation by maximizing total weight without exceeding capacity.

**Problem**: Given N books with weights and a shelf with max capacity, find the optimal combination.

**Approach**: Recursive backtracking with pruning (try include/exclude each book).

**Complexity**: O(2^n) worst case, but pruned in practice.

### 9.6 Brute Force (Dangerous Combinations)

**Location**: `server/src/shelves/shelf.service.ts`

**Purpose**: Detect all dangerous book combinations on a shelf.

**Approach**: Generate all possible pairs/triples of books and check if any combination violates safety rules.

**Complexity**: O(C(n, k)) where k is the combination size.

### 9.7 Stack (LIFO) - Loan History

**Location**: `server/src/loans/loan.service.ts`

**Purpose**: Track user loan history with most recent loans first.

**Implementation**: MongoDB sort by `loanDate: -1` with limit, simulating LIFO behavior.

### 9.8 Weighted Scoring (Reservation Priority)

**Location**: `server/src/reservations/reservation.service.ts`

**Purpose**: Calculate reservation priority using multiple weighted factors.

**Formula**:
```
score = alpha * queuePosition + beta * punctuality + gamma * waitTime - delta * penalty
```

**Default Weights** (configurable via environment variables):
- `alpha = 0.5` (queue position weight)
- `beta = 0.3` (punctuality weight)
- `gamma = 0.15` (wait time weight)
- `delta = 0.05` (penalty weight)

---

## 10. Machine Learning Models

### 10.1 WaitTimePredictor

**Type**: Regression
**Algorithm**: XGBoost
**Purpose**: Predict estimated wait days for book reservations.

**Features (6)**:
1. `queue_position`: Position in the waiting queue
2. `category`: Book category (encoded)
3. `historical_avg_wait`: Historical average wait time for this book
4. `return_rate`: Book's return rate
5. `active_reservations`: Number of active reservations for this book
6. `stock_zero_days`: Days since stock became zero

**Output**: Estimated wait days (float)

### 10.2 DemandPredictor

**Type**: Binary Classification
**Algorithm**: XGBoost
**Purpose**: Predict whether a book will have high demand.

**Features**:
- Temporal features (month, day of week, season)
- Loan statistics (total loans, recent loans)
- Book metadata (category, popularity)

**Output**: Probability of high demand (0.0 - 1.0)

### 10.3 OverduePredictor

**Type**: Binary Classification
**Algorithm**: XGBoost
**Purpose**: Predict probability that a loan will be overdue.

**Features (6 basic / 13 extended)**:

Basic:
1. `loan_duration_days`: Days since loan started
2. `user_total_loans`: User's total loan history
3. `user_overdue_rate`: User's historical overdue rate
4. `book_overdue_rate`: Book's historical overdue rate
5. `days_until_due`: Days remaining until due date
6. `is_weekend_loan`: Whether loan started on weekend

Extended (13): All basic + user's recent activity patterns, book category, etc.

**Output**: Probability of overdue (0.0 - 1.0)

### 10.4 AnomalyDetector

**Type**: Anomaly Detection
**Algorithm**: Isolation Forest
**Purpose**: Detect unusual borrowing patterns per user.

**Features**: User loan frequency, overdue rate, loan duration patterns, etc.

**Output**: Anomaly score (-1 for anomaly, 1 for normal)

### 10.5 ShelfAnomalyDetector

**Type**: Anomaly Detection
**Algorithm**: Isolation Forest
**Purpose**: Detect anomalous shelf distributions.

**Features (13)**:
- Shelf weight distribution
- Book value distribution
- Category concentration
- Location patterns
- Capacity utilization

**Output**: List of anomalous shelves with scores

### 10.6 Model Persistence

Models are saved in two locations:
1. **MongoDB** (collection `ml_models`): Cloud persistence
2. **Local disk** (`/app/models/*.joblib`): Fallback

---

## 11. Authentication System

### 11.1 User Authentication Flow

1. User sends credentials (email/password) to `/api/user/login` endpoint
2. Server validates credentials against the database
3. If valid, a JWT is generated with the user ID
4. Token is sent as an HTTP-only cookie (`token`)
5. Client also stores the token in localStorage
6. Subsequent requests include the token in Authorization header or cookie

### 11.2 Google OAuth Flow

1. User clicks "Login with Google"
2. Redirect to Google OAuth consent screen
3. Google redirects back with authorization code
4. Server exchanges code for tokens
5. Server creates/updates user with Google profile
6. JWT is generated and sent as cookie

### 11.3 Administrator Authentication Flow

1. Administrator sends credentials to `/api/admin/login` endpoint
2. Server validates against environment variables (ADMIN_EMAIL, ADMIN_PASS, ADMIN_PHONE)
3. If valid, a JWT is generated with the administrator's email
4. Token is sent as `adminToken` cookie
5. Protected routes verify this token via `AdminAuthGuard`

### 11.4 Authentication Guards

**AuthGuard** (Regular users):
- Verifies token in `token` cookie or `Authorization` header
- Decodes JWT and extracts `userId`
- Injects `userId` into the request

**AdminAuthGuard** (Administrators):
- Verifies token in `adminToken` cookie or `Authorization` header
- Decodes JWT and extracts `email`
- Validates that email matches configured administrator

### 11.5 JWT Token Structure

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

## 12. API Endpoints

### 12.1 Authentication (/api/user)

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

### 12.2 Administration (/api/admin)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /login | Admin login | No |
| POST | /logout | Admin logout | Admin |
| GET | /is-admin | Verify admin role | Admin |

### 12.3 Products (/api/product)

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
| GET | /sort-by-price | Sort by price (Merge Sort) | No |

### 12.4 Cart (/api/cart)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /add | Add to cart | Yes |
| POST | /update | Update quantity | Yes |

### 12.5 Addresses (/api/address)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /add | Add address | Yes |
| GET | /list | List addresses | Yes |

### 12.6 Orders (/api/order)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /cod | Create order (cash) | Yes |
| POST | /stripe | Create order (Stripe) | Yes |
| POST | /user-orders | User orders | Yes |
| POST | /list | List all (Admin) | Admin |
| POST | /status | Update status | Admin |

### 12.7 Loans (/api/loan)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /history | User history | Yes |
| POST | /create | Create loan | Yes |
| GET | /last-active | Last active loan | Yes |
| POST | /return/:loanId | Return book | Yes |
| GET | /stats | User statistics | Yes |
| GET | /admin/all | All loans | Admin |

### 12.8 Reservations (/api/reservation)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /my-reservations | User reservations | Yes |
| POST | /create | Create reservation | Yes |
| POST | /cancel/:id | Cancel reservation | Yes |
| GET | /waiting-list/:bookId | Waiting list | No |
| GET | /stats | User statistics | Yes |

### 12.9 Shelves (/api/shelf)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /create | Create shelf | Admin |
| GET | /list | List shelves | Admin |
| POST | /assign-book | Assign book | Admin |
| DELETE | /remove-book/:shelfId/:bookId | Remove book | Admin |
| GET | /dangerous-combinations/:id | Combination analysis (Brute Force) | Admin |
| GET | /optimize/:id | Optimize shelf (Backtracking) | Admin |

### 12.10 Reports (/api/report)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /inventory/pdf | Inventory in PDF (cached 24h) | Admin |
| GET | /inventory/xlsx | Inventory in Excel (cached 24h) | Admin |
| GET | /loans/pdf | Loans in PDF (cached 24h) | Admin |
| GET | /loans/xlsx | Loans in Excel (cached 24h) | Admin |
| GET | /recursion-preview | Recursion calculation preview | Admin |

### 12.11 Notifications (/api/notification)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /my-notifications | User notifications | Yes |
| GET | /admin/all | All notifications (Admin) | Admin |
| POST | /admin/send | Send notification (Admin) | Admin |

### 12.12 ML Predictions (/api/prediction)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /wait-time | Predict wait time | Admin |
| POST | /demand | Predict demand | Admin |
| POST | /overdue | Predict overdue risk | Admin |
| POST | /anomaly | Detect anomaly | Admin |
| GET | /anomalies | Get shelf anomalies | Admin |
| POST | /train | Train all models | Admin |

### 12.13 Migration (/api/migration)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /start | Start migration (MongoDB -> MySQL) | Admin |

---

## 13. Environment Configuration

### 13.1 Backend Environment Variables

Create `.env` file in the `server/` folder:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/zibooka

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

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# ML Service
ML_SERVICE_URL=http://localhost:5000

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Reservation Scoring Weights
RESERVATION_SCORE_ALPHA=0.5
RESERVATION_SCORE_BETA=0.3
RESERVATION_SCORE_GAMMA=0.15
RESERVATION_SCORE_DELTA=0.05

# Environment
APP_ENV=development
VITE_FRONTEND_URL=http://localhost:5173
```

### 13.2 Frontend Environment Variables

Create `.env` file in the `client/` folder:

```env
VITE_BACKEND_URL=http://localhost:4000
VITE_CURRENCY=$
```

### 13.3 ML Microservice Environment Variables

Create `.env` file in the `ms-ml/` folder:

```env
MONGODB_URI=mongodb://localhost:27017/zibooka
MONGODB_DB_NAME=zibooka
LOG_LEVEL=INFO
```

### 13.4 CORS Configuration

The backend is configured to accept requests from:

- `http://localhost:5173` (local development)
- `https://zibooka.onrender.com` (production)
- URLs defined in `VITE_FRONTEND_URL`

Configuration includes:
- Credentials enabled (`credentials: true`)
- Allowed methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
- Allowed headers: Content-Type, Authorization, Accept, X-Requested-With

---

## 14. Caching Strategy

### 14.1 Redis Cache

The backend uses Redis as the primary cache store with in-memory fallback.

**Configuration**:
- Store: `ioredis` (Redis) with fallback to `memory`
- TTL: Configurable per cache key
- Key prefix: `zibooka:`

**Cached Data**:
- Product listings
- Report data (24-hour TTL via MongoDB TTL index)
- Session data

### 14.2 Report Cache (MongoDB TTL)

Reports are cached in the `ReportCache` collection with a 24-hour TTL index on `updatedAt`.

**Cache Key Format**: `{reportType}_{filters_hash}`

**Benefits**:
- Reduces computation time for expensive report generation
- Automatic cache invalidation via MongoDB TTL
- Consistent data across requests within the cache window

---

## 15. Testing

### 15.1 Test Structure

```
server/
├── src/
│   ├── **/*.spec.ts      # Unit tests
└── test/
    ├── app.e2e-spec.ts   # End-to-end tests
    ├── admin.e2e-spec.ts
    ├── user.e2e-spec.ts
    ├── cart-optimization.e2e-spec.ts
    └── jest-e2e.json

ms-ml/
├── tests/
│   ├── test_health.py
│   ├── test_predict.py
│   └── test_train.py
```

### 15.2 Running Tests

**Backend**:
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

**ML Microservice**:
```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_health.py
```

### 15.3 Jest Configuration

The project uses Jest with the following configurations:

- Module extensions: js, json, ts
- Test regex: `.*\.spec\.ts$`
- Transformer: ts-jest
- Environment: node

---

## 16. Deployment

### 16.1 Render Configuration

The `render.yaml` file defines the services:

```yaml
services:
  # Backend
  - type: web
    name: zibooka-backend
    env: node
    buildCommand: cd server && npm install && npm run build
    startCommand: cd server && npm run start:prod

  # ML Microservice
  - type: web
    name: zibooka-ml
    env: python
    buildCommand: cd ms-ml && pip install -r requirements.txt
    startCommand: cd ms-ml && uvicorn app.main:app --host 0.0.0.0 --port $PORT

  # Frontend
  - type: static
    name: zibooka-frontend
    buildCommand: cd client && npm install && npm run build
    staticPublishPath: client/dist
```

### 16.2 Docker Compose

```yaml
services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  zibooka-ml:
    build: ./ms-ml
    ports:
      - "5000:5000"
    depends_on:
      - mongodb
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/zibooka

  zibooka-backend:
    build: ./server
    ports:
      - "4000:4000"
    depends_on:
      - mongodb
      - redis
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/zibooka
      - REDIS_HOST=redis
      - ML_SERVICE_URL=http://zibooka-ml:5000

volumes:
  mongodb_data:
```

### 16.3 Deployment Process

1. Push changes to the `main` branch
2. Render automatically detects changes
3. Executes build commands
4. Deploys updated services

### 16.4 Production Considerations

- Configure environment variables in Render dashboard
- Use MongoDB Atlas for the database
- Use Redis Cloud or similar for caching
- Configure custom domain if needed
- Enable HTTPS (automatic on Render)
- Monitor ML model performance and retrain as needed

---

## 17. Security Considerations

### 17.1 Authentication

- Passwords encrypted with bcrypt (salt rounds: 10)
- JWT tokens with 7-day expiration
- HTTP-only cookies for sensitive tokens
- Token validation on each protected request
- Google OAuth 2.0 for social authentication

### 17.2 Data Validation

- DTOs with class-validator for input validation
- Data sanitization before storage
- Type validation with TypeScript
- Pydantic schemas for ML microservice input validation

### 17.3 Route Protection

- Guards for authentication verification (AuthGuard, AdminAuthGuard)
- Role separation (user/admin)
- Custom decorators for token data extraction

### 17.4 Rate Limiting

- @nestjs/throttler: 100 requests per 60 seconds per IP
- Prevents abuse and DDoS attacks

### 17.5 CORS

- Whitelist of allowed origins
- Credentials enabled only for trusted origins

### 17.6 Error Handling

- Standardized HTTP exceptions from NestJS
- Generic error messages in production
- Server-side error logging
- Global exception filters

### 17.7 Payments

- Stripe handles all card data
- Server never stores payment information
- Webhooks verified with Stripe signature

### 17.8 Secrets Management

- Environment variables for all sensitive configuration
- No hardcoded secrets in source code
- `.env` files excluded from version control

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
| TTL | Time To Live, automatic expiration of data |
| MaxHeap | Binary tree where parent >= children, used for priority queues |
| XGBoost | Extreme Gradient Boosting, ensemble machine learning algorithm |
| Isolation Forest | Anomaly detection algorithm based on random forests |
| Backtracking | Algorithmic technique for solving problems recursively by trying to build solutions incrementally |
| Knapsack Problem | Optimization problem: maximize value without exceeding weight capacity |
| CQRS | Command Query Responsibility Segregation, pattern for separating reads and writes |
| Rate Limiting | Technique to control the number of requests a client can make |

---

## References

- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Stripe Documentation](https://stripe.com/docs)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [XGBoost Documentation](https://xgboost.readthedocs.io/)
- [scikit-learn Documentation](https://scikit-learn.org/stable/)
- [Redis Documentation](https://redis.io/docs/)
