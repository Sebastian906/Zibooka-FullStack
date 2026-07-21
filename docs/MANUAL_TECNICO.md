# Manual Técnico - ZiBooka

## Introducción

Este documento describe los aspectos técnicos del sistema ZiBooka, incluyendo arquitectura, tecnologías, bibliotecas utilizadas, estructuras de datos y algoritmos, modelos de aprendizaje automático, estrategia de indexación de MongoDB, configuración del entorno de desarrollo y consideraciones de despliegue.

---

## Tabla de Contenidos

1. [Arquitectura del Sistema](#1-arquitectura-del-sistema)
2. [Tecnologías Base](#2-tecnologías-base)
3. [Backend - Dependencias y Bibliotecas](#3-backend---dependencias-y-bibliotecas)
4. [Frontend - Dependencias y Bibliotecas](#4-frontend---dependencias-y-bibliotecas)
5. [Microservicio ML - Dependencias y Bibliotecas](#5-microservicio-ml---dependencias-y-bibliotecas)
6. [Estructura del Proyecto](#6-estructura-del-proyecto)
7. [Modelos de Datos](#7-modelos-de-datos)
8. [Índices de MongoDB](#8-índices-de-mongodb)
9. [Estructuras de Datos y Algoritmos](#9-estructuras-de-datos-y-algoritmos)
10. [Modelos de Aprendizaje Automático](#10-modelos-de-aprendizaje-automático)
11. [Sistema de Autenticación](#11-sistema-de-autenticación)
12. [Endpoints de la API](#12-endpoints-de-la-api)
13. [Configuración del Entorno](#13-configuración-del-entorno)
14. [Estrategia de Caché](#14-estrategia-de-caché)
15. [Pruebas](#15-pruebas)
16. [Despliegue](#16-despliegue)
17. [Consideraciones de Seguridad](#17-consideraciones-de-seguridad)

---

## 1. Arquitectura del Sistema

### 1.1 Patrón Arquitectónico

El sistema implementa una arquitectura distribuida con tres servicios principales:

- **Capa de Presentación**: React SPA (Single Page Application) con TailwindCSS
- **Capa de Negocio**: REST API desarrollada con NestJS (14 módulos)
- **Capa de ML**: Microservicio FastAPI con 5 modelos predictivos
- **Capa de Datos**: MongoDB 7 con 26 índices optimizados + Redis 7 caché

### 1.2 Comunicación entre Capas

```
Cliente (React)
      |
      | HTTP/HTTPS (REST API)
      | JSON + JWT (cookie + Bearer header)
      v
Servidor (NestJS)
      |
      ├── Mongoose ODM ──> Base de Datos (MongoDB)
      ├── Redis Cache ──> Capa de Caché (Redis / fallback en memoria)
      ├── HTTP Client ──> Microservicio ML (FastAPI)
      └── Nodemailer ──> Servidor SMTP (Correo)
```

### 1.3 Servicios Externos

| Servicio | Propósito | Integración |
|----------|-----------|-------------|
| MongoDB 7 | Base de datos principal | Mongoose ODM (async) |
| Redis 7 | Capa de caché | cache-manager-ioredis-yet |
| Cloudinary | Almacenamiento de imágenes | Cloudinary SDK |
| Stripe | Procesamiento de pagos | Stripe API + Webhooks |
| SMTP Server | Envío de correos | Nodemailer |
| FastAPI ML | Predicciones de aprendizaje automático | HTTP Client (axios) |
| Google OAuth | Autenticación social | Passport.js |

### 1.4 Patrones de Diseño del Backend

NestJS implementa los siguientes patrones:

- **Módulos**: Organización del código en 14 módulos independientes
- **Inyección de Dependencias**: Gestión automática de instancias
- **Decoradores**: Metaprogramación para rutas, validación y autorización
- **Guards**: Protección de rutas (AuthGuard, AdminAuthGuard)
- **DTOs**: Data Transfer Objects para validación de entrada
- **Interceptors**: Transformación de respuestas y caché
- **Filters**: Manejo global de excepciones
- **Pipes**: Validación y transformación de datos

---

## 2. Tecnologías Base

### 2.1 Backend

| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| Node.js | 18+ | Entorno de ejecución de JavaScript |
| NestJS | 11.0.1 | Framework progresivo de Node.js |
| TypeScript | 5.7.3 | Conjunto tipado de JavaScript |
| MongoDB | 7 | Base de datos NoSQL orientada a documentos |
| Redis | 7 | Almacenamiento de datos en memoria para caché |

### 2.2 Frontend

| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| React | 19.2.3 | Biblioteca de interfaz de usuario |
| Vite | 7.2.4 | Herramienta de construcción moderna |
| JavaScript (ES6+) | - | Lenguaje de programación |
| TailwindCSS | 4.1.18 | Framework CSS de utilidades |

### 2.3 Microservicio ML

| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| Python | 3.10+ | Lenguaje de programación |
| FastAPI | 0.139.0 | Framework de API asíncrono de alto rendimiento |
| scikit-learn | 1.9.0 | Biblioteca de aprendizaje automático |
| XGBoost | 3.3.0 | Framework de gradient boosting |
| Pandas | 3.0.3 | Biblioteca de manipulación de datos |
| NumPy | 2.5.1 | Biblioteca de computación numérica |
| Motor | 3.6.1 | Driver asíncrono de MongoDB para Python |

---

## 3. Backend - Dependencias y Bibliotecas

### 3.1 Dependencias de Producción

#### Framework y Núcleo

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| @nestjs/common | 11.0.1 | Decoradores y utilidades comunes de NestJS |
| @nestjs/core | 11.0.1 | Núcleo del framework NestJS |
| @nestjs/platform-express | 11.0.1 | Adaptador Express para NestJS |
| @nestjs/config | 4.0.2 | Gestión de configuración y variables de entorno |
| reflect-metadata | 0.2.2 | Polyfill de metadatos de decoradores |
| rxjs | 7.8.1 | Programación reactiva con observables |

#### Base de Datos

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| @nestjs/mongoose | 11.0.4 | Integración de Mongoose con NestJS |
| mongoose | 9.1.1 | ODM de MongoDB, modelado de datos |

#### Caché

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| @nestjs/cache-manager | 3.0.0 | Integración de gestión de caché |
| cache-manager-ioredis-yet | 4.0.0 | Almacén de caché Redis con ioredis |

#### Autenticación y Seguridad

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| jsonwebtoken | 9.0.3 | Generación y verificación de tokens JWT |
| bcryptjs | 3.0.3 | Encriptación de contraseñas mediante hashing |
| cookie-parser | 1.4.7 | Análisis de cookies en solicitudes HTTP |
| @nestjs/passport | 11.0.0 | Integración de Passport para NestJS |
| passport | 0.7.0 | Middleware de autenticación |
| passport-jwt | 4.0.1 | Estrategia JWT para Passport |
| passport-google-oauth20 | 2.0.0 | Estrategia Google OAuth 2.0 |

#### Limitación de Tasa

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| @nestjs/throttler | 6.0.0 | Limitación de tasa (100 req/60s por IP) |

#### Programación

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| @nestjs/schedule | 5.0.0 | Programación de trabajos cron (notificaciones diarias a las 9AM) |

#### Validación

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| class-validator | 0.14.3 | Validación de DTOs mediante decoradores |
| class-transformer | 0.5.1 | Transformación de objetos planos a instancias de clase |
| validator | 13.15.26 | Funciones de validación de cadenas |

#### Documentación

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| @nestjs/swagger | 11.2.5 | Generación automática de documentación OpenAPI |

#### Servicios Externos

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| cloudinary | 2.8.0 | SDK para carga y gestión de imágenes en Cloudinary |
| stripe | 20.3.0 | SDK para procesamiento de pagos con Stripe |
| nodemailer | 7.0.13 | Envío de correos vía SMTP |
| axios | 1.13.2 | Cliente HTTP para comunicación con microservicio ML |

#### Generación de Reportes

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| pdfkit | 0.17.2 | Generación de documentos PDF |
| exceljs | 4.4.0 | Generación de hojas de cálculo Excel (XLSX) |

#### Migración

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| mysql2 | 3.11.0 | Driver MySQL para migración MongoDB -> MySQL |

#### Utilidades

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| multer | 2.0.2 | Middleware para manejo de multipart/form-data (cargas) |
| cors | 2.8.5 | Middleware para habilitar CORS |

### 3.2 Dependencias de Desarrollo

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| @nestjs/cli | 11.0.0 | CLI para generación de código NestJS |
| @nestjs/testing | 11.0.1 | Utilidades de pruebas unitarias |
| jest | 30.0.0 | Framework de pruebas |
| ts-jest | 29.2.5 | Soporte de TypeScript para Jest |
| supertest | 7.0.0 | Pruebas de integración HTTP |
| eslint | 9.18.0 | Linter de JavaScript/TypeScript |
| prettier | 3.4.2 | Formateador de código |
| typescript | 5.7.3 | Compilador de TypeScript |

---

## 4. Frontend - Dependencias y Bibliotecas

### 4.1 Dependencias de Producción

#### Núcleo y Renderizado

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| react | 19.2.3 | Biblioteca principal para construcción de UI |
| react-dom | 19.2.0 | Renderizado de React en el DOM del navegador |

#### Enrutamiento

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| react-router-dom | 7.11.0 | Enrutamiento declarativo para aplicaciones React SPA |

#### Comunicación HTTP

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| axios | 1.13.2 | Cliente HTTP basado en promesas para solicitudes API |

#### Estilos

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| tailwindcss | 4.1.18 | Framework CSS de utilidades para estilos responsivos |
| @tailwindcss/vite | 4.1.18 | Plugin de Tailwind para integración con Vite |

#### Internacionalización

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| i18next | 25.8.0 | Framework de internacionalización |
| react-i18next | 16.5.4 | Integración de i18next con React |
| i18next-browser-languagedetector | 8.2.0 | Detección automática del idioma del navegador |

#### Componentes de UI

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| swiper | 12.0.3 | Componente de carrusel/deslizador táctil |
| react-icons | 5.5.0 | Colección de iconos como componentes React |
| react-hot-toast | 2.6.0 | Notificaciones toast elegantes y personalizables |

### 4.2 Dependencias de Desarrollo

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| vite | 7.2.4 | Herramienta de construcción y servidor de desarrollo |
| @vitejs/plugin-react | 5.1.1 | Plugin de Vite para soporte de React |
| eslint | 9.39.1 | Linter de JavaScript |
| eslint-plugin-react-hooks | 7.0.1 | Reglas ESLint para React hooks |
| eslint-plugin-react-refresh | 0.4.24 | Soporte de Fast Refresh para ESLint |

---

## 5. Microservicio ML - Dependencias y Bibliotecas

### 5.1 Dependencias de Producción

#### Framework

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| fastapi | 0.139.0 | Framework de API asíncrono de alto rendimiento |
| uvicorn | 0.50.0 | Servidor ASGI para FastAPI |

#### Aprendizaje Automático

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| scikit-learn | 1.9.0 | Algoritmos de aprendizaje automático (Isolation Forest, métricas) |
| xgboost | 3.3.0 | Gradient boosting para clasificación/regresión |
| pandas | 3.0.3 | Manipulación y análisis de datos |
| numpy | 2.5.1 | Computación numérica |
| joblib | 1.4.2 | Serialización y persistencia de modelos |

#### Base de Datos

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| motor | 3.6.1 | Driver asíncrono de MongoDB para Python |
| pymongo | 4.12.1 | Driver de MongoDB (dependencia de Motor) |

#### Validación

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| pydantic | 2.11.0 | Validación de datos y gestión de configuración |

### 5.2 Dependencias de Desarrollo

| Biblioteca | Versión | Propósito |
|------------|---------|-----------|
| pytest | 9.1.1 | Framework de pruebas |
| httpx | 0.28.1 | Cliente HTTP para pruebas de endpoints FastAPI |

---

## 6. Estructura del Proyecto

### 6.1 Estructura General

```
Book-Store-App/
├── client/                 # Aplicación Frontend (React)
├── server/                 # API Backend (NestJS)
├── ms-ml/                  # Microservicio ML (FastAPI)
├── docs/                   # Documentación
│   ├── images/             # Capturas de pantalla y diagramas
│   ├── TECHNICAL_MANUAL.md
│   ├── USER_MANUAL.md
│   ├── MANUAL_TECNICO.md
│   └── MANUAL_DE_USUARIO.md
├── docker-compose.yaml     # Orquestación Docker
├── render.yaml             # Configuración de despliegue en Render
├── README.md               # Documentación general (Inglés)
├── README-ES.md            # Documentación general (Español)
└── SECURITY.md             # Política de seguridad
```

### 6.2 Estructura del Backend

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

### 6.3 Estructura del Frontend

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

### 6.4 Estructura del Microservicio ML

```
ms-ml/
├── app/
│   ├── main.py              # App FastAPI, CORS, middleware, lifespan
│   ├── config.py            # Configuración (Pydantic): MongoDB, umbrales, modelos
│   ├── database.py          # Conexión asíncrona a MongoDB (Motor)
│   │
│   ├── models/
│   │   ├── base.py              # BasePredictor (ABC): train, predict, save, load
│   │   ├── wait_time_predictor.py   # Regresión XGBoost (6 características)
│   │   ├── demand_predictor.py      # Clasificación XGBoost (características temporales)
│   │   ├── overdue_predictor.py     # Clasificación XGBoost (6-13 características)
│   │   └── anomaly_detector.py      # Isolation Forest (anomalías conductuales + estantería)
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
│       ├── data_preparation.py  # Ingeniería de características y preparación de datos
│       ├── metrics.py           # Métricas de evaluación de modelos
│       └── serialization.py     # Utilidades de guardado/carga de modelos
│
├── models/                 # Modelos ML persistidos (joblib)
├── tests/                  # Archivos de prueba Pytest
├── requirements.txt        # Dependencias de Python
├── Dockerfile              # Configuración de construcción Docker
└── .env                    # Variables de entorno
```

---

## 7. Modelos de Datos

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
  priority: Number (nullable), // Puntuación de prioridad MaxHeap
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
  dueDate: Date (required), // loanDate + 14 días
  returnDate: Date (nullable),
  status: String (default: 'active', indexed),
    // enum: ['active', 'returned', 'overdue']
  lateFee: Number (default: 0), // $0.50/día
  notes: String,
  riskScore: Number (default: 0.5, min: 0, max: 1),
    // Probabilidad de retraso predicha por ML
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
  priority: Number (required), // Posición de puntuación ponderada
  estimatedWaitDays: Number (nullable), // Predicción ML
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
  userId: String (required), // Nota: String, no ObjectId
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
  relatedId: ObjectId (indexed), // Referencia genérica
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
  data: Object (required), // Datos del reporte serializados
  recordCount: Number (required),
  generationTimeMs: Number (required),
  expiresAt: Date (default: Date.now),
  createdAt: Date (default: Date.now),
  updatedAt: Date (default: Date.now) // Objetivo del índice TTL (24h)
}
```

---

## 8. Índices de MongoDB

La base de datos utiliza **26 índices optimizados** en 10 colecciones para garantizar el rendimiento de las consultas.

### 8.1 Resumen de Índices

| Colección | Total Índices | Únicos | Dispersiones | Compuestos | TTL |
|-----------|---------------|--------|--------------|------------|-----|
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

### 8.2 Definiciones Detalladas de Índices

#### Colección User
```typescript
// Índice único en email (implícito desde @Prop({ unique: true }))
{ email: 1 }

// Índice único disperso en googleId (permite múltiples nulos)
{ googleId: 1 }, { sparse: true, unique: true }
```

#### Colección Product
```typescript
// Índice único disperso en isbn
{ isbn: 1 }, { sparse: true, unique: true }

// Índice simple en author
{ author: 1 }

// Índice simple en category
{ category: 1 }
```

#### Colección Order
```typescript
// Índice compuesto: pedidos de usuario ordenados por fecha
{ userId: 1, createdAt: -1 }

// Índice simple: filtrado por estado de pedido
{ status: 1 }

// Índice simple: todos los pedidos ordenados por fecha
{ createdAt: -1 }
```

#### Colección Loan
```typescript
// Índices simples
{ userId: 1 }
{ bookId: 1 }
{ status: 1 }

// Índice compuesto: historial de préstamos por libro
{ bookId: 1, loanDate: -1 }
```

#### Colección Reservation
```typescript
// Índices simples
{ userId: 1 }
{ bookId: 1 }
{ status: 1 }

// Índice compuesto: cola de espera (libro + estado + prioridad)
{ bookId: 1, status: 1, priority: 1 }

// Índice compuesto: historial de reservas del usuario
{ userId: 1, requestDate: -1 }
```

#### Colección Shelf
```typescript
// Índice único en code
{ code: 1 }, { unique: true }
```

#### Colección Address
```typescript
// Índice compuesto: direcciones de usuario ordenadas por fecha
{ userId: 1, createdAt: -1 }
```

#### Colección Notification
```typescript
// Índices simples
{ userId: 1 }
{ type: 1 }
{ relatedId: 1 }

// Índice compuesto: historial de administrador (usuario + fecha)
{ userId: 1, sentAt: -1 }

// Índice compuesto: verificación de duplicados
{ relatedId: 1, relatedModel: 1, type: 1 }
```

#### Colección ReportCache
```typescript
// Índice simple en cacheKey
{ cacheKey: 1 }

// Índice compuesto: tipo de reporte + clave de caché
{ reportType: 1, cacheKey: 1 }

// Índice TTL: eliminación automática después de 24 horas
{ updatedAt: 1 }, { expireAfterSeconds: 86400 }
```

#### Colección HighRiskLoan
```typescript
// Índices simples
{ loanId: 1 }
{ userId: 1 }
```

---

## 9. Estructuras de Datos y Algoritmos

### 9.1 MaxHeap (Cola de Prioridad)

**Ubicación**: `server/src/common/utils/max-heap.ts`

**Propósito**: Procesar pedidos por puntuación de prioridad en lugar de FIFO.

**Implementación**: Montículo binario máximo basado en arreglo con inserción y extractMax en O(log n).

**Cálculo de Prioridad**:
```
priority = paymentScore + historyScore + ageScore
```
- `paymentScore`: 1.0 para Stripe, 0.5 para COD
- `historyScore`: basado en pedidos completados del usuario
- `ageScore`: basado en antigüedad del pedido (más antiguo = mayor prioridad)

**Operaciones**:
- `insert(item)`: O(log n)
- `extractMax()`: O(log n)
- `peek()`: O(1)
- `size()`: O(1)
- `buildHeap(array)`: O(n)

### 9.2 Búsqueda Binaria

**Ubicación**: `server/src/products/product.service.ts`

**Propósito**: Búsqueda rápida de productos por ISBN (O(log n)).

**Prerequisito**: Los productos deben estar ordenados por ISBN.

**Complejidad**: O(log n) tiempo, O(1) espacio.

### 9.3 Búsqueda Lineal

**Ubicación**: `server/src/products/product.service.ts`

**Propósito**: Búsqueda de productos por título o autor (O(n)).

**Se usa cuando**: El criterio de búsqueda no es ISBN.

**Complejidad**: O(n) tiempo, O(1) espacio.

### 9.4 Merge Sort

**Ubicación**: `server/src/products/product.service.ts`

**Propósito**: Ordenar productos por precio (O(n log n)).

**Ventaja**: Ordenamiento estable, rendimiento consistente independientemente del orden de entrada.

**Complejidad**: O(n log n) tiempo, O(n) espacio.

### 9.5 Backtracking (Problema de la Mochila)

**Ubicación**: `server/src/shelves/shelf.service.ts`

**Propósito**: Optimizar la asignación de estanterías maximizando el peso total sin exceder la capacidad.

**Problema**: Dados N libros con pesos y una estantería con capacidad máxima, encontrar la combinación óptima.

**Enfoque**: Backtracking recursivo con poda (intentar incluir/excluir cada libro).

**Complejidad**: O(2^n) peor caso, pero podado en la práctica.

### 9.6 Fuerza Bruta (Combinaciones Peligrosas)

**Ubicación**: `server/src/shelves/shelf.service.ts`

**Propósito**: Detectar todas las combinaciones de libros peligrosas en una estantería.

**Enfoque**: Generar todos los pares/tripletes posibles de libros y verificar si alguna combinación viola las reglas de seguridad.

**Complejidad**: O(C(n, k)) donde k es el tamaño de la combinación.

### 9.7 Stack (LIFO) - Historial de Préstamos

**Ubicación**: `server/src/loans/loan.service.ts`

**Propósito**: Rastrear el historial de préstamos del usuario con los préstamos más recientes primero.

**Implementación**: Orden de MongoDB por `loanDate: -1` con límite, simulando comportamiento LIFO.

### 9.8 Puntuación Ponderada (Prioridad de Reserva)

**Ubicación**: `server/src/reservations/reservation.service.ts`

**Propósito**: Calcular la prioridad de reserva utilizando múltiples factores ponderados.

**Fórmula**:
```
score = alpha * queuePosition + beta * punctuality + gamma * waitTime - delta * penalty
```

**Pesos por Defecto** (configurables mediante variables de entorno):
- `alpha = 0.5` (peso de posición en cola)
- `beta = 0.3` (peso de puntualidad)
- `gamma = 0.15` (peso de tiempo de espera)
- `delta = 0.05` (peso de penalización)

---

## 10. Modelos de Aprendizaje Automático

### 10.1 WaitTimePredictor

**Tipo**: Regresión
**Algoritmo**: XGBoost
**Propósito**: Predecir los días estimados de espera para reservas de libros.

**Características (6)**:
1. `queue_position`: Posición en la cola de espera
2. `category`: Categoría del libro (codificada)
3. `historical_avg_wait`: Tiempo promedio de espera histórico para este libro
4. `return_rate`: Tasa de devolución del libro
5. `active_reservations`: Número de reservas activas para este libro
6. `stock_zero_days`: Días desde que el stock se hizo cero

**Salida**: Días de espera estimados (float)

### 10.2 DemandPredictor

**Tipo**: Clasificación Binaria
**Algoritmo**: XGBoost
**Propósito**: Predecir si un libro tendrá alta demanda.

**Características**:
- Características temporales (mes, día de la semana, estación)
- Estadísticas de préstamos (total de préstamos, préstamos recientes)
- Metadatos del libro (categoría, popularidad)

**Salida**: Probabilidad de alta demanda (0.0 - 1.0)

### 10.3 OverduePredictor

**Tipo**: Clasificación Binaria
**Algoritmo**: XGBoost
**Propósito**: Predecir la probabilidad de que un préstamo esté atrasado.

**Características (6 básicas / 13 extendidas)**:

Básicas:
1. `loan_duration_days`: Días desde que comenzó el préstamo
2. `user_total_loans`: Historial total de préstamos del usuario
3. `user_overdue_rate`: Tasa histórica de atrasos del usuario
4. `book_overdue_rate`: Tasa histórica de atrasos del libro
5. `days_until_due`: Días restantes hasta la fecha de vencimiento
6. `is_weekend_loan`: Si el préstamo comenzó en fin de semana

Extendidas (13): Todas las básicas + patrones de actividad reciente del usuario, categoría del libro, etc.

**Salida**: Probabilidad de atraso (0.0 - 1.0)

### 10.4 AnomalyDetector

**Tipo**: Detección de Anomalías
**Algoritmo**: Isolation Forest
**Propósito**: Detectar patrones de préstamo inusuales por usuario.

**Características**: Frecuencia de préstamos del usuario, tasa de atrasos, patrones de duración de préstamos, etc.

**Salida**: Puntuación de anomalía (-1 para anomalía, 1 para normal)

### 10.5 ShelfAnomalyDetector

**Tipo**: Detección de Anomalías
**Algoritmo**: Isolation Forest
**Propósito**: Detectar distribuciones anómalas de estanterías.

**Características (13)**:
- Distribución de peso de estantería
- Distribución de valor de libros
- Concentración de categorías
- Patrones de ubicación
- Utilización de capacidad

**Salida**: Lista de estanterías anómalas con puntuaciones

### 10.6 Persistencia de Modelos

Los modelos se guardan en dos ubicaciones:
1. **MongoDB** (colección `ml_models`): Persistencia en la nube
2. **Disco local** (`/app/models/*.joblib`): Respaldo

---

## 11. Sistema de Autenticación

### 11.1 Flujo de Autenticación de Usuario

1. El usuario envía credenciales (email/contraseña) al endpoint `/api/user/login`
2. El servidor valida las credenciales contra la base de datos
3. Si son válidas, se genera un JWT con el ID del usuario
4. El token se envía como cookie HTTP-only (`token`)
5. El cliente también almacena el token en localStorage
6. Las solicitudes posteriores incluyen el token en el header Authorization o en la cookie

### 11.2 Flujo de Google OAuth

1. El usuario hace clic en "Iniciar sesión con Google"
2. Redirección a la pantalla de consentimiento de Google OAuth
3. Google redirige de vuelta con el código de autorización
4. El servidor intercambia el código por tokens
5. El servidor crea/actualiza el usuario con el perfil de Google
6. Se genera el JWT y se envía como cookie

### 11.3 Flujo de Autenticación de Administrador

1. El administrador envía credenciales al endpoint `/api/admin/login`
2. El servidor valida contra las variables de entorno (ADMIN_EMAIL, ADMIN_PASS, ADMIN_PHONE)
3. Si son válidas, se genera un JWT con el email del administrador
4. El token se envía como cookie `adminToken`
5. Las rutas protegidas verifican este token mediante `AdminAuthGuard`

### 11.4 Guards de Autenticación

**AuthGuard** (Usuarios regulares):
- Verifica el token en la cookie `token` o el header `Authorization`
- Decodifica el JWT y extrae `userId`
- Inyecta `userId` en la solicitud

**AdminAuthGuard** (Administradores):
- Verifica el token en la cookie `adminToken` o el header `Authorization`
- Decodifica el JWT y extrae `email`
- Valida que el email coincida con el administrador configurado

### 11.5 Estructura del Token JWT

```json
{
  "id": "userId_or_email",
  "session": "optional_session_id",
  "iat": 1234567890,
  "exp": 1235172690
}
```

Expiración: 7 días

---

## 12. Endpoints de la API

### 12.1 Autenticación (/api/user)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | /register | Registro de usuario | No |
| POST | /login | Inicio de sesión | No |
| POST | /logout | Cierre de sesión | Sí |
| GET | /is-auth | Verificar autenticación | Sí |
| GET | /profile | Obtener perfil | Sí |
| PUT | /update-profile | Actualizar perfil | Sí |
| POST | /forgot-password | Solicitar recuperación | No |
| POST | /reset-password | Restablecer contraseña | No |

### 12.2 Administración (/api/admin)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | /login | Inicio de sesión admin | No |
| POST | /logout | Cierre de sesión admin | Admin |
| GET | /is-admin | Verificar rol admin | Admin |

### 12.3 Productos (/api/product)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | /list | Listar todos los productos | No |
| GET | /list/:lang | Listar con traducciones | No |
| GET | /:id | Obtener producto por ID | No |
| POST | /add | Agregar producto | Admin |
| PUT | /update | Actualizar producto | Admin |
| DELETE | /delete/:id | Eliminar producto | Admin |
| POST | /search/linear | Búsqueda lineal | No |
| POST | /search/binary | Búsqueda binaria por ISBN | No |
| GET | /sort-by-price | Ordenar por precio (Merge Sort) | No |

### 12.4 Carrito (/api/cart)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | /add | Agregar al carrito | Sí |
| POST | /update | Actualizar cantidad | Sí |

### 12.5 Direcciones (/api/address)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | /add | Agregar dirección | Sí |
| GET | /list | Listar direcciones | Sí |

### 12.6 Pedidos (/api/order)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | /cod | Crear pedido (efectivo) | Sí |
| POST | /stripe | Crear pedido (Stripe) | Sí |
| POST | /user-orders | Pedidos del usuario | Sí |
| POST | /list | Listar todos (Admin) | Admin |
| POST | /status | Actualizar estado | Admin |

### 12.7 Préstamos (/api/loan)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | /history | Historial del usuario | Sí |
| POST | /create | Crear préstamo | Sí |
| GET | /last-active | Último préstamo activo | Sí |
| POST | /return/:loanId | Devolver libro | Sí |
| GET | /stats | Estadísticas del usuario | Sí |
| GET | /admin/all | Todos los préstamos | Admin |

### 12.8 Reservas (/api/reservation)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | /my-reservations | Reservas del usuario | Sí |
| POST | /create | Crear reserva | Sí |
| POST | /cancel/:id | Cancelar reserva | Sí |
| GET | /waiting-list/:bookId | Lista de espera | No |
| GET | /stats | Estadísticas del usuario | Sí |

### 12.9 Estanterías (/api/shelf)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | /create | Crear estantería | Admin |
| GET | /list | Listar estanterías | Admin |
| POST | /assign-book | Asignar libro | Admin |
| DELETE | /remove-book/:shelfId/:bookId | Remover libro | Admin |
| GET | /dangerous-combinations/:id | Análisis de combinaciones (Fuerza Bruta) | Admin |
| GET | /optimize/:id | Optimizar estantería (Backtracking) | Admin |

### 12.10 Reportes (/api/report)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | /inventory/pdf | Inventario en PDF (caché 24h) | Admin |
| GET | /inventory/xlsx | Inventario en Excel (caché 24h) | Admin |
| GET | /loans/pdf | Préstamos en PDF (caché 24h) | Admin |
| GET | /loans/xlsx | Préstamos en Excel (caché 24h) | Admin |
| GET | /recursion-preview | Vista previa de cálculo de recursión | Admin |

### 12.11 Notificaciones (/api/notification)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | /my-notifications | Notificaciones del usuario | Sí |
| GET | /admin/all | Todas las notificaciones (Admin) | Admin |
| POST | /admin/send | Enviar notificación (Admin) | Admin |

### 12.12 Predicciones ML (/api/prediction)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | /wait-time | Predecir tiempo de espera | Admin |
| POST | /demand | Predecir demanda | Admin |
| POST | /overdue | Predecir riesgo de atraso | Admin |
| POST | /anomaly | Detectar anomalía | Admin |
| GET | /anomalies | Obtener anomalías de estanterías | Admin |
| POST | /train | Entrenar todos los modelos | Admin |

### 12.13 Migración (/api/migration)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | /start | Iniciar migración (MongoDB -> MySQL) | Admin |

---

## 13. Configuración del Entorno

### 13.1 Variables de Entorno del Backend

Crear archivo `.env` en la carpeta `server/`:

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

### 13.2 Variables de Entorno del Frontend

Crear archivo `.env` en la carpeta `client/`:

```env
VITE_BACKEND_URL=http://localhost:4000
VITE_CURRENCY=$
```

### 13.3 Variables de Entorno del Microservicio ML

Crear archivo `.env` en la carpeta `ms-ml/`:

```env
MONGODB_URI=mongodb://localhost:27017/zibooka
MONGODB_DB_NAME=zibooka
LOG_LEVEL=INFO
```

### 13.4 Configuración CORS

El backend está configurado para aceptar solicitudes desde:

- `http://localhost:5173` (desarrollo local)
- `https://zibooka.onrender.com` (producción)
- URLs definidas en `VITE_FRONTEND_URL`

La configuración incluye:
- Credenciales habilitadas (`credentials: true`)
- Métodos permitidos: GET, POST, PUT, DELETE, PATCH, OPTIONS
- Headers permitidos: Content-Type, Authorization, Accept, X-Requested-With

---

## 14. Estrategia de Caché

### 14.1 Redis Cache

El backend utiliza Redis como almacén de caché principal con fallback en memoria.

**Configuración**:
- Almacenamiento: `ioredis` (Redis) con fallback a `memory`
- TTL: Configurable por clave de caché
- Prefijo de clave: `zibooka:`

**Datos en Caché**:
- Listados de productos
- Datos de reportes (TTL de 24 horas vía índice TTL de MongoDB)
- Datos de sesión

### 14.2 Caché de Reportes (TTL de MongoDB)

Los reportes se almacenan en caché en la colección `ReportCache` con un índice TTL de 24 horas en `updatedAt`.

**Formato de Clave de Caché**: `{reportType}_{filters_hash}`

**Beneficios**:
- Reduce el tiempo de cálculo para generación de reportes costosos
- Invalidación automática de caché vía TTL de MongoDB
- Datos consistentes entre solicitudes dentro de la ventana de caché

---

## 15. Pruebas

### 15.1 Estructura de Pruebas

```
server/
├── src/
│   ├── **/*.spec.ts      # Pruebas unitarias
└── test/
    ├── app.e2e-spec.ts   # Pruebas de extremo a extremo
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

### 15.2 Ejecución de Pruebas

**Backend**:
```bash
# Pruebas unitarias
npm run test

# Pruebas con cobertura
npm run test:cov

# Pruebas de extremo a extremo
npm run test:e2e

# Modo observador
npm run test:watch
```

**Microservicio ML**:
```bash
# Ejecutar todas las pruebas
pytest

# Ejecutar con salida detallada
pytest -v

# Ejecutar archivo de prueba específico
pytest tests/test_health.py
```

### 15.3 Configuración de Jest

El proyecto utiliza Jest con las siguientes configuraciones:

- Extensiones de módulo: js, json, ts
- Regex de pruebas: `.*\.spec\.ts$`
- Transformador: ts-jest
- Entorno: node

---

## 16. Despliegue

### 16.1 Configuración de Render

El archivo `render.yaml` define los servicios:

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

### 16.3 Proceso de Despliegue

1. Subir cambios a la rama `main`
2. Render detecta los cambios automáticamente
3. Ejecuta los comandos de construcción
4. Despliega los servicios actualizados

### 16.4 Consideraciones de Producción

- Configurar variables de entorno en el panel de Render
- Usar MongoDB Atlas para la base de datos
- Usar Redis Cloud o similar para caché
- Configurar dominio personalizado si es necesario
- Habilitar HTTPS (automático en Render)
- Monitorear el rendimiento de los modelos ML y reentrenar según sea necesario

---

## 17. Consideraciones de Seguridad

### 17.1 Autenticación

- Contraseñas encriptadas con bcrypt (rounds de sal: 10)
- Tokens JWT con expiración de 7 días
- Cookies HTTP-only para tokens sensibles
- Validación de token en cada solicitud protegida
- Google OAuth 2.0 para autenticación social

### 17.2 Validación de Datos

- DTOs con class-validator para validación de entrada
- Sanitización de datos antes del almacenamiento
- Validación de tipos con TypeScript
- Esquemas Pydantic para validación de entrada del microservicio ML

### 17.3 Protección de Rutas

- Guards para verificación de autenticación (AuthGuard, AdminAuthGuard)
- Separación de roles (usuario/administrador)
- Decoradores personalizados para extracción de datos del token

### 17.4 Limitación de Tasa

- @nestjs/throttler: 100 solicitudes por 60 segundos por IP
- Previene abuso y ataques DDoS

### 17.5 CORS

- Lista blanca de orígenes permitidos
- Credenciales habilitadas solo para orígenes de confianza

### 17.6 Manejo de Errores

- Excepciones HTTP estandarizadas de NestJS
- Mensajes de error genéricos en producción
- Registro de errores del lado del servidor
- Filtros de excepciones globales

### 17.7 Pagos

- Stripe maneja todos los datos de tarjetas
- El servidor nunca almacena información de pago
- Webhooks verificados con firma de Stripe

### 17.8 Gestión de Secretos

- Variables de entorno para toda la configuración sensible
- Sin secretos hardcodeados en el código fuente
- Archivos `.env` excluidos del control de versiones

---

## Glosario Técnico

| Término | Definición |
|---------|------------|
| REST API | Interfaz de programación que utiliza HTTP para comunicación |
| DTO | Data Transfer Object, objeto para validar datos de entrada |
| Guard | Middleware que protege rutas basado en condiciones |
| JWT | JSON Web Token, estándar para tokens de autenticación |
| ODM | Object Document Mapper, mapea objetos a documentos de base de datos |
| SPA | Single Page Application, aplicación de página única |
| Webhook | Callback HTTP que notifica eventos en tiempo real |
| TTL | Time To Live, expiración automática de datos |
| MaxHeap | Árbol binario donde padre >= hijos, usado para colas de prioridad |
| XGBoost | Extreme Gradient Boosting, algoritmo de aprendizaje automático ensemble |
| Isolation Forest | Algoritmo de detección de anomalías basado en bosques aleatorios |
| Backtracking | Técnica algorítmica para resolver problemas recursivamente intentando construir soluciones incrementalmente |
| Problema de la Mochila | Problema de optimización: maximizar valor sin exceder la capacidad de peso |
| CQRS | Command Query Responsibility Segregation, patrón para separar lecturas y escrituras |
| Rate Limiting | Técnica para controlar el número de solicitudes que un cliente puede hacer |

---

## Referencias

- [Documentación de NestJS](https://docs.nestjs.com/)
- [Documentación de React](https://react.dev/)
- [Documentación de MongoDB](https://docs.mongodb.com/)
- [Documentación de Mongoose](https://mongoosejs.com/docs/)
- [Documentación de Stripe](https://stripe.com/docs)
- [Documentación de Cloudinary](https://cloudinary.com/documentation)
- [Documentación de FastAPI](https://fastapi.tiangolo.com/)
- [Documentación de XGBoost](https://xgboost.readthedocs.io/)
- [Documentación de scikit-learn](https://scikit-learn.org/stable/)
- [Documentación de Redis](https://redis.io/docs/)
