# ZiBooka - Library Management System

## General Description

ZiBooka is a fullstack web application designed for comprehensive library management. The system allows users to explore, purchase, reserve, and request book loans, while administrators have a complete panel to manage inventory, orders, shelves, loans, and generate reports.

The project implements a modern client-server architecture, using React for the frontend and NestJS for the backend, with MongoDB as the NoSQL database.

---

## Project Objective

Develop a library management system that allows:

- Managing the book catalog with multilingual support
- Processing purchases through cash on delivery and Stripe payments
- Administering a book loan system
- Implementing a reservation system for out-of-stock books
- Organizing physical inventory through shelf management
- Generating inventory and loan reports in PDF and Excel formats
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
| MongoDB | - | NoSQL database |
| Mongoose | 9.1.1 | ODM for MongoDB data modeling |
| JWT | 9.0.3 | Token-based authentication |
| Stripe | 20.3.0 | Online payment processing |
| Cloudinary | 2.8.0 | Image storage and management |
| PDFKit | 0.17.2 | PDF report generation |
| ExcelJS | 4.4.0 | Excel report generation |
| Nodemailer | 7.0.13 | Email sending |

---

## System Architecture

### Architectural Pattern

The system implements a **Layered Architecture** combined with the **MVC (Model-View-Controller)** pattern on the backend and a **Component-based** architecture on the frontend.

[GENERAL ARCHITECTURE DIAGRAM](docs/images/diagrams/architecture.png)

### Backend Structure (NestJS)

```
server/src/
├── addresses/      # Shipping addresses module
├── admin/          # Administration module
├── carts/          # Shopping cart module
├── common/         # Guards, decorators, and shared utilities
├── config/         # Configurations (MongoDB, etc.)
├── email/          # Email service
├── loans/          # Book loans module
├── orders/         # Orders module
├── products/       # Products (books) module
├── reports/        # Report generation module
├── reservations/   # Reservations module
├── shelves/        # Shelf management module
└── users/          # Users module
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
```

---

## Diagrams

### Flow Diagram - Purchase Process

[PURCHASE PROCESS](docs/images/diagrams/flow-diagram.png)

### Flow Diagram - Loan System

[LOAN SYSTEM](docs/images/diagrams/loan-diagram.png)

### Class Diagram - Main Models

[MODELS](docs/images/diagrams/models.png)
[RELATIONS](docs/images/diagrams/relations.png)

### Sequence Diagram - Authentication

[AUTHENTICATION](docs/images/diagrams/authentication.png)

---

## Functional Requirements

### User Module

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-01 | User registration | The system must allow registration of new users with name, email, and password |
| FR-02 | Login | The system must authenticate users via email and password |
| FR-03 | Password recovery | The system must allow password reset via email |
| FR-04 | Profile management | The user must be able to update personal information and profile image |
| FR-05 | Shopping cart | The system must maintain a persistent cart per user |

### Product Module

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-06 | Book catalog | The system must display the available book catalog |
| FR-07 | Product search | The system must allow searching books by title, author, or ISBN |
| FR-08 | Category filtering | The system must allow filtering books by category |
| FR-09 | Sorting | The system must allow sorting books by price and title |
| FR-10 | Product detail | The system must display detailed information for each book |

### Order Module

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-11 | Checkout process | The system must allow completing a purchase |
| FR-12 | Cash on delivery | The system must support cash on delivery payment |
| FR-13 | Stripe payment | The system must process card payments via Stripe |
| FR-14 | Order history | The user must be able to view their purchase history |
| FR-15 | Status tracking | The user must see the current status of their orders |

### Loan Module

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-16 | Request loan | The user must be able to request a loan for an available book |
| FR-17 | Book return | The user must be able to register the return of a book |
| FR-18 | Loan history | The user must see their loan history |
| FR-19 | Due date control | The system must calculate and display due dates |

### Reservation Module

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-20 | Reserve out-of-stock book | The user must be able to reserve books without stock |
| FR-21 | Waiting queue | The system must manage a waiting queue per book |
| FR-22 | Availability notification | The system must notify when a reserved book is available |
| FR-23 | Reservation cancellation | The user must be able to cancel their reservations |

### Administrative Module

| ID | Requirement | Description |
|----|-------------|-------------|
| FR-24 | Product management | The administrator must be able to create, edit, and delete books |
| FR-25 | Order management | The administrator must be able to view and update order statuses |
| FR-26 | Shelf management | The administrator must be able to organize books on shelves |
| FR-27 | Loan management | The administrator must view all system loans |
| FR-28 | Report generation | The administrator must generate reports in PDF and Excel |

---

## Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Performance | API response time must not exceed 2 seconds |
| NFR-02 | Availability | The system must be available 99% of the time |
| NFR-03 | Security | Passwords must be stored encrypted with bcrypt |
| NFR-04 | Security | Communication must use HTTPS in production |
| NFR-05 | Security | JWT tokens must expire in 7 days |
| NFR-06 | Usability | The interface must be responsive (mobile-first) |
| NFR-07 | Usability | The system must support English and Spanish languages |
| NFR-08 | Scalability | The architecture must allow horizontal scaling |
| NFR-09 | Maintainability | Code must follow linting standards (ESLint) |
| NFR-10 | Compatibility | The frontend must be compatible with modern browsers |

---

## Installation and Execution

### Prerequisites

- Node.js version 18 or higher
- MongoDB (local or Atlas)
- Cloudinary account
- Stripe account (optional, for payments)

### Backend Configuration

```bash
cd server
npm install
```

Create `.env` file with the following variables:

```
MONGODB_URI=mongodb://localhost:27017/zibooka
JWT_SECRET=your_secret_key
ADMIN_EMAIL=admin@example.com
ADMIN_PASS=admin_password
ADMIN_PHONE=+1234567890
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
STRIPE_SECRET_KEY=sk_test_xxx
SMTP_HOST=smtp.example.com
SMTP_USER=user@example.com
SMTP_PASS=smtp_password
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

```
VITE_BACKEND_URL=http://localhost:4000
VITE_CURRENCY=$
```

Run the application:

```bash
npm run dev
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/user/register | User registration |
| POST | /api/user/login | Login |
| POST | /api/user/logout | Logout |
| GET | /api/user/is-auth | Verify authentication |

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/product/list | List all products |
| GET | /api/product/:id | Get product by ID |
| POST | /api/product/add | Add product (Admin) |
| PUT | /api/product/update | Update product (Admin) |
| DELETE | /api/product/delete/:id | Delete product (Admin) |

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/order/cod | Create order (cash) |
| POST | /api/order/stripe | Create order (Stripe) |
| POST | /api/order/user-orders | Get user orders |
| POST | /api/order/list | List all orders (Admin) |
| POST | /api/order/status | Update order status (Admin) |

---

## Deployment

The project is configured for deployment on Render via the `render.yaml` file:

- **Frontend**: Static service
- **Backend**: Node.js web service

---

## License

This project is for private and educational use.

---

## Author

Sebastian Salazar Guiza

Junior Systems Engineer

Developed as an academic library management project.
