# ZiBooka - Library Management System

## General Description

ZiBooka is a fullstack web application designed for comprehensive library management. The system allows users to explore, purchase, reserve, and request book loans, while administrators have a complete panel to manage inventory, orders, shelves, loans, generate reports, and leverage **Machine Learning predictions** for demand forecasting, overdue risk detection, and inventory anomaly analysis.

The project implements a modern microservices-inspired architecture with three core services:

- **Frontend**: React SPA with TailwindCSS
- **Backend**: REST API built with NestJS
- **ML Microservice**: AI/ML predictions powered by FastAPI and XGBoost

---

## Project Objective

Develop a library management system that allows:

- Managing the book catalog with multilingual support (English/Spanish)
- Processing purchases through cash on delivery and Stripe payments
- Administering a book loan system with **late fee calculation** and **risk scoring**
- Implementing a reservation system with **weighted priority scoring**
- Organizing physical inventory through shelf management with **algorithmic optimization** (Backtracking, Brute Force)
- Generating inventory and loan reports in PDF and Excel formats with **24-hour caching**
- Providing **Machine Learning predictions** for demand, overdue risk, wait times, and anomalies
- Sending **automated notifications** via email (daily cron at 9AM)
- Providing an intuitive and responsive user experience

---

## Technologies Used

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.3 | Main library for interface construction |
| Vite | 7.2.4 | Build tool and development server |
| TailwindCSS | 4.1.18 | Utility-first CSS framework |
| React Router DOM | 7.11.0 | Client-side routing |
| Axios | 1.13.2 | HTTP client for API communication |
| i18next | 25.8.0 | Internationalization and multilingual support |
| Swiper | 12.0.3 | Carousel component for book presentation |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | 11.0.1 | Node.js framework for API construction |
| MongoDB | 7 | NoSQL database |
| Mongoose | 9.1.1 | ODM for MongoDB data modeling |
| Redis | 7 | Caching layer with fallback to in-memory |
| JWT | 9.0.3 | Token-based authentication |
| Passport + Google OAuth | - | Social authentication |
| Stripe | 20.3.0 | Online payment processing |
| Cloudinary | 2.8.0 | Image storage and management |
| PDFKit | 0.17.2 | PDF report generation |
| ExcelJS | 4.4.0 | Excel report generation |
| Nodemailer | 7.0.13 | Email sending |
| @nestjs/throttler | - | Rate limiting (100 req/60s per IP) |
| @nestjs/schedule | - | Cron job scheduling |

### ML Microservice

| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.139.0 | High-performance Python API framework |
| scikit-learn | 1.9.0 | Machine learning algorithms |
| XGBoost | 3.3.0 | Gradient boosting for predictions |
| Pandas | 3.0.3 | Data manipulation and analysis |
| NumPy | 2.5.1 | Numerical computing |
| Motor | 3.6.1 | Async MongoDB driver for Python |
| Uvicorn | 0.50.0 | ASGI server |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker + Docker Compose | Containerized deployment |
| MongoDB 7 | Primary database |
| Redis 7 | Caching layer |
| Render | Cloud deployment platform |

---

## System Architecture

[GENERAL ARCHITECTURE DIAGRAM](docs/images/diagrams/exports/architecture.png)

### Architectural Pattern

The system implements a **distributed architecture** with three core services:

```
                    ┌─────────────────┐
                    │  React Frontend │
                    │  (Vite + React  │
                    │   + TailwindCSS)│
                    └────────┬────────┘
                             │ Axios (JWT)
                             ▼
                    ┌─────────────────┐
                    │  NestJS Backend │
                    │  (Port 4000)    │
                    │  - 14 modules   │
                    │  - Swagger API  │
                    │  - Redis Cache  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │  MongoDB 7  │ │  Redis 7    │ │  FastAPI ML │
     │  (Port 27017)│ │ (Port 6379)│ │  (Port 5000)│
     │  DB: Zibooka│ │  Cache      │ │  5 ML Models│
     └─────────────┘ └─────────────┘ └──────┬──────┘
                                            │
                                     ┌──────┴──────┐
                                     │  MongoDB    │
                                     │  (same DB)  │
                                     └─────────────┘
```

### Backend Structure (NestJS - 14 Modules)

```
server/src/
├── addresses/      # Shipping addresses module
├── admin/          # Administration module
├── carts/          # Shopping cart module
├── common/         # Guards, decorators, shared utils, MaxHeap
├── config/         # Configurations (MongoDB, Redis, etc.)
├── email/          # Email service (Nodemailer)
├── loans/          # Book loans module (with risk scoring)
├── migration/      # MongoDB -> MySQL migration module
├── notifications/  # Automated notifications (cron jobs)
├── orders/         # Orders module (with priority queue)
├── prediction/     # ML prediction client (FastAPI integration)
├── products/       # Products module (with search algorithms)
├── reports/        # Report generation (PDF/Excel with cache)
├── reservations/   # Reservations module (with priority scoring)
├── shelves/        # Shelf management (with optimization algorithms)
└── users/          # Users module (with Google OAuth)
```

### ML Microservice Structure (FastAPI)

```
ms-ml/app/
├── main.py              # FastAPI app, CORS, middleware
├── config.py            # Settings (Pydantic)
├── database.py          # MongoDB async connection (Motor)
├── models/
│   ├── base.py              # BasePredictor (ABC)
│   ├── wait_time_predictor.py   # XGBoost regression
│   ├── demand_predictor.py      # XGBoost classification
│   ├── overdue_predictor.py     # XGBoost classification
│   └── anomaly_detector.py      # Isolation Forest
├── routers/
│   ├── health.py        # GET /health
│   ├── predict.py       # POST /predict/*
│   └── train.py         # POST /train/*
├── schemas/             # Pydantic request/response schemas
└── utils/               # Data preparation, metrics, serialization
```

### Frontend Structure (React)

```
client/src/
├── assets/         # Static resources and images
├── components/     # Reusable components
│   └── admin/      # Administrative panel components
├── context/        # Global application context (ShopContext)
├── i18n/           # Internationalization configuration
│   └── locales/    # Translation files (en.json, es.json)
└── pages/          # Application pages
    └── admin/      # Administrative panel pages
        ├── DemandPredictions.jsx    # ML demand predictions
        └── InventoryAnomalies.jsx   # ML anomaly detection
```

---

## Data Structures and Algorithms

The project implements several algorithmic techniques to optimize performance:

| Algorithm | Location | Purpose |
|-----------|----------|---------|
| **MaxHeap** | `common/utils/max-heap.ts` | Priority queue for order processing. Priority = paymentScore + historyScore + ageScore |
| **Binary Search** | `products/product.service.ts` | Fast product lookup by ISBN (O(log n)) |
| **Linear Search** | `products/product.service.ts` | Product search by title/author (O(n)) |
| **Merge Sort** | `products/product.service.ts` | Sort products by price (O(n log n)) |
| **Backtracking** | `shelves/shelf.service.ts` | Shelf optimization (Knapsack problem - maximize weight without exceeding capacity) |
| **Brute Force** | `shelves/shelf.service.ts` | Detect dangerous combinations on shelves |
| **Stack (LIFO)** | `loans/loan.service.ts` | User loan history tracking |
| **Weighted Scoring** | `reservations/reservation.service.ts` | Reservation priority: alpha*queuePosition + beta*punctuality + gamma*waitTime - delta*penalty |

---

## Machine Learning Models

The ML microservice provides 5 predictive models:

| Model | Type | Algorithm | Use Case |
|-------|------|-----------|----------|
| **WaitTimePredictor** | Regression | XGBoost | Predicts estimated wait days for reservations |
| **DemandPredictor** | Classification | XGBoost | Predicts high-demand books for inventory planning |
| **OverduePredictor** | Classification | XGBoost | Predicts overdue risk for active loans (6-13 features) |
| **AnomalyDetector** | Anomaly Detection | Isolation Forest | Detects unusual borrowing patterns |
| **ShelfAnomalyDetector** | Anomaly Detection | Isolation Forest | Detects anomalous shelf distributions |

### ML Endpoints

**Predictions:**
- `POST /predict/wait-time` - Estimated wait time for reservations
- `POST /predict/demand/list` - Demand prediction for all books
- `POST /predict/overdue` - Overdue risk (6 features)
- `POST /predict/overdue-extended` - Overdue risk (13 features)
- `POST /predict/anomaly` - Behavioral anomaly detection
- `GET /predict/anomalies` - Shelf anomaly detection

**Training:**
- `POST /train/from-database` - Train all models from MongoDB
- `POST /train/{wait-time|demand|overdue|anomaly}/from-database` - Train individual models

---

## MongoDB Indexes

The database uses **26 optimized indexes** across 10 collections:

| Collection | Indexes | Notable Indexes |
|------------|---------|-----------------|
| **User** | 2 | `email` (unique), `googleId` (sparse+unique) |
| **Product** | 3 | `isbn` (sparse+unique), `author`, `category` |
| **Order** | 3 | `{userId, createdAt}`, `{status}`, `{createdAt}` |
| **Loan** | 4 | `userId`, `bookId`, `status`, `{bookId, loanDate}` |
| **Reservation** | 5 | `userId`, `bookId`, `status`, `{bookId, status, priority}`, `{userId, requestDate}` |
| **Shelf** | 1 | `code` (unique) |
| **Address** | 1 | `{userId, createdAt}` |
| **Notification** | 5 | `userId`, `type`, `relatedId`, `{userId, sentAt}`, `{relatedId, relatedModel, type}` |
| **ReportCache** | 3 | `cacheKey`, `{reportType, cacheKey}`, TTL 24h on `updatedAt` |
| **HighRiskLoan** | 2 | `loanId`, `userId` |

---

## Functional Requirements

### User Module

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-01 | User registration | The system must allow registration of new users with name, email, and password |
| FR-02 | Login | The system must authenticate users via email and password |
| FR-03 | Google OAuth | The system must support Google social authentication |
| FR-04 | Password recovery | The system must allow password reset via email |
| FR-05 | Profile management | The user must be able to update personal information and profile image |
| FR-06 | Shopping cart | The system must maintain a persistent cart per user |

### Product Module

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-07 | Book catalog | The system must display the available book catalog |
| FR-08 | Product search | The system must allow searching books by title, author, or ISBN (linear/binary search) |
| FR-09 | Category filtering | The system must allow filtering books by category |
| FR-10 | Sorting | The system must allow sorting books by price (Merge Sort) |
| FR-11 | Product detail | The system must display detailed information for each book |
| FR-12 | Multilingual support | Products support translations in English and Spanish |

### Order Module

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-13 | Checkout process | The system must allow completing a purchase |
| FR-14 | Cash on delivery | The system must support cash on delivery payment |
| FR-15 | Stripe payment | The system must process card payments via Stripe |
| FR-16 | Order history | The user must be able to view their purchase history |
| FR-17 | Status tracking | The user must see the current status of their orders |
| FR-18 | Priority queue | Orders are processed using a MaxHeap priority queue |

### Loan Module

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-19 | Request loan | The user must be able to request a loan for an available book |
| FR-20 | Book return | The user must be able to register the return of a book |
| FR-21 | Loan history | The user must see their loan history (Stack/LIFO) |
| FR-22 | Due date control | The system must calculate and display due dates (14 days) |
| FR-23 | Late fees | The system must calculate late fees ($0.50/day) |
| FR-24 | Risk scoring | The system must predict overdue risk using ML |

### Reservation Module

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-25 | Reserve out-of-stock book | The user must be able to reserve books without stock |
| FR-26 | Weighted priority queue | The system must manage a priority queue with weighted scoring |
| FR-27 | Wait time prediction | The system must predict estimated wait time using ML |
| FR-28 | Availability notification | The system must notify when a reserved book is available |
| FR-29 | Reservation cancellation | The user must be able to cancel their reservations |

### Shelf Module

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-30 | Shelf management | The administrator must organize books on shelves |
| FR-31 | Optimization | The system must optimize shelf allocation using Backtracking (Knapsack) |
| FR-32 | Dangerous combinations | The system must detect dangerous combinations using Brute Force |

### Notification Module

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-33 | Automated reminders | The system must send daily email reminders at 9AM for due loans/reservations |
| FR-34 | Admin notifications | Administrators can send manual notifications to users |
| FR-35 | Notification history | Users can view their notification history |

### ML Prediction Module

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-36 | Demand predictions | Administrators can view demand predictions for inventory planning |
| FR-37 | Anomaly detection | Administrators can view shelf and behavioral anomalies |
| FR-38 | Model training | Administrators can retrain ML models from the database |

### Report Module

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-39 | Report generation | The administrator must generate reports in PDF and Excel |
| FR-40 | Report caching | Reports are cached for 24 hours using MongoDB TTL |

---

## Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | API response time must not exceed 2 seconds |
| NFR-02 | Availability | The system must be available 99% of the time |
| NFR-03 | Security | Passwords must be stored encrypted with bcrypt |
| NFR-04 | Security | Communication must use HTTPS in production |
| NFR-05 | Security | JWT tokens must expire in 7 days |
| NFR-06 | Security | Rate limiting: 100 requests per 60 seconds per IP |
| NFR-07 | Usability | The interface must be responsive (mobile-first) |
| NFR-08 | Usability | The system must support English and Spanish languages |
| NFR-09 | Scalability | The architecture must allow horizontal scaling |
| NFR-10 | Scalability | Redis caching with in-memory fallback |
| NFR-11 | Maintainability | Code must follow linting standards (ESLint) |
| NFR-12 | Compatibility | The frontend must be compatible with modern browsers |

---

## Installation and Execution

### Prerequisites

- Node.js version 18 or higher
- Python 3.10+ (for ML microservice)
- MongoDB 7 (local or Atlas)
- Redis 7 (local or cloud)
- Docker & Docker Compose (optional, for containerized deployment)
- Cloudinary account
- Stripe account (optional, for payments)
- Google Cloud Console account (optional, for OAuth)

### Quick Start with Docker

```bash
docker-compose up -d
```

This starts all services:
- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- ML Microservice: http://localhost:5000
- MongoDB: localhost:27017
- Redis: localhost:6379

### Backend Configuration

```bash
cd server
npm install
```

Create `.env` file with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/zibooka

# Security
JWT_SECRET=your_secret_key

# Administrator
ADMIN_EMAIL=admin@example.com
ADMIN_PASS=admin_password
ADMIN_PHONE=+1234567890

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=user@gmail.com
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

# Frontend URL
VITE_FRONTEND_URL=http://localhost:5173
```

Run the server:

```bash
npm run start:dev
```

### Frontend Configuration

```bash
cd client
npm install
```

Create `.env` file with:

```env
VITE_BACKEND_URL=http://localhost:4000
VITE_CURRENCY=$
```

Run the application:

```bash
npm run dev
```

### ML Microservice Configuration

```bash
cd ms-ml
pip install -r requirements.txt
```

Create `.env` file with:

```env
MONGODB_URI=mongodb://localhost:27017/zibooka
MONGODB_DB_NAME=zibooka
LOG_LEVEL=INFO
```

Run the microservice:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```

---

## API Endpoints

### Authentication (/api/user)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/user/register | User registration | No |
| POST | /api/user/login | Login | No |
| POST | /api/user/logout | Logout | Yes |
| GET | /api/user/is-auth | Verify authentication | Yes |
| GET | /api/user/profile | Get profile | Yes |
| PUT | /api/user/update-profile | Update profile | Yes |
| POST | /api/user/forgot-password | Request recovery | No |
| POST | /api/user/reset-password | Reset password | No |

### Administration (/api/admin)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/admin/login | Admin login | No |
| POST | /api/admin/logout | Admin logout | Admin |
| GET | /api/admin/is-admin | Verify admin role | Admin |

### Products (/api/product)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/product/list | List all products | No |
| GET | /api/product/list/:lang | List with translations | No |
| GET | /api/product/:id | Get product by ID | No |
| POST | /api/product/add | Add product | Admin |
| PUT | /api/product/update | Update product | Admin |
| DELETE | /api/product/delete/:id | Delete product | Admin |
| POST | /api/product/search/linear | Linear search | No |
| POST | /api/product/search/binary | Binary search by ISBN | No |
| GET | /api/product/sort-by-price | Sort by price (Merge Sort) | No |

### Cart (/api/cart)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/cart/add | Add to cart | Yes |
| POST | /api/cart/update | Update quantity | Yes |

### Addresses (/api/address)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/address/add | Add address | Yes |
| GET | /api/address/list | List addresses | Yes |

### Orders (/api/order)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/order/cod | Create order (cash) | Yes |
| POST | /api/order/stripe | Create order (Stripe) | Yes |
| POST | /api/order/user-orders | User orders | Yes |
| POST | /api/order/list | List all (Admin) | Admin |
| POST | /api/order/status | Update status | Admin |

### Loans (/api/loan)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/loan/history | User history | Yes |
| POST | /api/loan/create | Create loan | Yes |
| GET | /api/loan/last-active | Last active loan | Yes |
| POST | /api/loan/return/:loanId | Return book | Yes |
| GET | /api/loan/stats | User statistics | Yes |
| GET | /api/loan/admin/all | All loans | Admin |

### Reservations (/api/reservation)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/reservation/my-reservations | User reservations | Yes |
| POST | /api/reservation/create | Create reservation | Yes |
| POST | /api/reservation/cancel/:id | Cancel reservation | Yes |
| GET | /api/reservation/waiting-list/:bookId | Waiting list | No |
| GET | /api/reservation/stats | User statistics | Yes |

### Shelves (/api/shelf)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/shelf/create | Create shelf | Admin |
| GET | /api/shelf/list | List shelves | Admin |
| POST | /api/shelf/assign-book | Assign book | Admin |
| DELETE | /api/shelf/remove-book/:shelfId/:bookId | Remove book | Admin |
| GET | /api/shelf/dangerous-combinations/:id | Combination analysis (Brute Force) | Admin |
| GET | /api/shelf/optimize/:id | Optimize shelf (Backtracking) | Admin |

### Reports (/api/report)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/report/inventory/pdf | Inventory in PDF (cached 24h) | Admin |
| GET | /api/report/inventory/xlsx | Inventory in Excel (cached 24h) | Admin |
| GET | /api/report/loans/pdf | Loans in PDF (cached 24h) | Admin |
| GET | /api/report/loans/xlsx | Loans in Excel (cached 24h) | Admin |
| GET | /api/report/recursion-preview | Recursion calculation preview | Admin |

### Notifications (/api/notification)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/notification/my-notifications | User notifications | Yes |
| GET | /api/notification/admin/all | All notifications (Admin) | Admin |
| POST | /api/notification/admin/send | Send notification (Admin) | Admin |

### ML Predictions (/api/prediction)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/prediction/wait-time | Predict wait time | Admin |
| POST | /api/prediction/demand | Predict demand | Admin |
| POST | /api/prediction/overdue | Predict overdue risk | Admin |
| POST | /api/prediction/anomaly | Detect anomaly | Admin |
| GET | /api/prediction/anomalies | Get shelf anomalies | Admin |
| POST | /api/prediction/train | Train all models | Admin |

---

## Deployment

The project is configured for deployment on Render via the `render.yaml` file:

- **Frontend**: Static service
- **Backend**: Node.js web service
- **ML Microservice**: Python web service

### Docker Compose

```yaml
services:
  mongodb:      # MongoDB 7 (Port 27017)
  redis:        # Redis 7 (Port 6379)
  zibooka-ml:   # FastAPI ML (Port 5000)
  zibooka-backend: # NestJS Backend (Port 4000)
```

---

## License

This project is for private and educational use.

---

## Author

Sebastian Salazar Guiza

Junior Systems Engineer

Developed as an academic library management project.
