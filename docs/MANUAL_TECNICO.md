# Manual Tecnico - ZiBooka

## Introduccion

Este documento describe los aspectos tecnicos del sistema ZiBooka, incluyendo la arquitectura, tecnologias, librerias utilizadas, configuracion del entorno de desarrollo y consideraciones de despliegue.

---

## Tabla de Contenidos

1. [Arquitectura del Sistema](#1-arquitectura-del-sistema)
2. [Tecnologias Base](#2-tecnologias-base)
3. [Backend - Dependencias y Librerias](#3-backend---dependencias-y-librerias)
4. [Frontend - Dependencias y Librerias](#4-frontend---dependencias-y-librerias)
5. [Estructura del Proyecto](#5-estructura-del-proyecto)
6. [Modelos de Datos](#6-modelos-de-datos)
7. [Sistema de Autenticacion](#7-sistema-de-autenticacion)
8. [Endpoints de la API](#8-endpoints-de-la-api)
9. [Configuracion del Entorno](#9-configuracion-del-entorno)
10. [Pruebas](#10-pruebas)
11. [Despliegue](#11-despliegue)
12. [Consideraciones de Seguridad](#12-consideraciones-de-seguridad)

---

## 1. Arquitectura del Sistema

### 1.1 Patron Arquitectonico

El sistema implementa una arquitectura de tres capas:

- **Capa de Presentacion**: Aplicacion React SPA (Single Page Application)
- **Capa de Negocio**: API REST desarrollada con NestJS
- **Capa de Datos**: Base de datos MongoDB

### 1.2 Comunicacion entre Capas

```
Cliente (React)
      |
      | HTTP/HTTPS (REST API)
      | JSON
      v
Servidor (NestJS)
      |
      | Mongoose ODM
      v
Base de Datos (MongoDB)
```

### 1.3 Servicios Externos

| Servicio | Proposito | Integracion |
|----------|-----------|-------------|
| MongoDB Atlas | Base de datos en la nube | Mongoose ODM |
| Cloudinary | Almacenamiento de imagenes | SDK de Cloudinary |
| Stripe | Procesamiento de pagos | API de Stripe |
| SMTP Server | Envio de correos | Nodemailer |

### 1.4 Patron de Diseño en Backend

NestJS implementa los siguientes patrones:

- **Modulos**: Organizacion del codigo en modulos independientes
- **Inyeccion de Dependencias**: Gestion automatica de instancias
- **Decoradores**: Metaprogramacion para rutas, validacion y autorizacion
- **Guards**: Proteccion de rutas mediante middleware de autorizacion
- **DTOs**: Objetos de transferencia de datos para validacion de entrada

---

## 2. Tecnologias Base

### 2.1 Backend

| Tecnologia | Version | Descripcion |
|------------|---------|-------------|
| Node.js | 18+ | Entorno de ejecucion JavaScript |
| NestJS | 11.0.1 | Framework progresivo de Node.js |
| TypeScript | 5.7.3 | Superset tipado de JavaScript |
| MongoDB | 6+ | Base de datos NoSQL orientada a documentos |

### 2.2 Frontend

| Tecnologia | Version | Descripcion |
|------------|---------|-------------|
| React | 19.2.3 | Biblioteca para interfaces de usuario |
| Vite | 7.2.4 | Herramienta de construccion moderna |
| JavaScript (ES6+) | - | Lenguaje de programacion |
| TailwindCSS | 4.1.18 | Framework CSS utilitario |

---

## 3. Backend - Dependencias y Librerias

### 3.1 Dependencias de Produccion

#### Framework y Core

| Libreria | Version | Proposito |
|----------|---------|-----------|
| @nestjs/common | 11.0.1 | Decoradores y utilidades comunes de NestJS |
| @nestjs/core | 11.0.1 | Nucleo del framework NestJS |
| @nestjs/platform-express | 11.0.1 | Adaptador de Express para NestJS |
| @nestjs/config | 4.0.2 | Gestion de configuracion y variables de entorno |
| reflect-metadata | 0.2.2 | Polyfill para metadata de decoradores |
| rxjs | 7.8.1 | Programacion reactiva con observables |

#### Base de Datos

| Libreria | Version | Proposito |
|----------|---------|-----------|
| @nestjs/mongoose | 11.0.4 | Integracion de Mongoose con NestJS |
| mongoose | 9.1.1 | ODM para MongoDB, modelado de datos |

#### Autenticacion y Seguridad

| Libreria | Version | Proposito |
|----------|---------|-----------|
| jsonwebtoken | 9.0.3 | Generacion y verificacion de tokens JWT |
| bcryptjs | 3.0.3 | Encriptacion de contraseñas mediante hash |
| cookie-parser | 1.4.7 | Parsing de cookies en solicitudes HTTP |

#### Validacion

| Libreria | Version | Proposito |
|----------|---------|-----------|
| class-validator | 0.14.3 | Validacion de DTOs mediante decoradores |
| class-transformer | 0.5.1 | Transformacion de objetos planos a instancias de clase |
| validator | 13.15.26 | Funciones de validacion de strings |

#### Documentacion

| Libreria | Version | Proposito |
|----------|---------|-----------|
| @nestjs/swagger | 11.2.5 | Generacion automatica de documentacion OpenAPI |

#### Servicios Externos

| Libreria | Version | Proposito |
|----------|---------|-----------|
| cloudinary | 2.8.0 | SDK para subida y gestion de imagenes en Cloudinary |
| stripe | 20.3.0 | SDK para procesamiento de pagos con Stripe |
| nodemailer | 7.0.13 | Envio de correos electronicos via SMTP |

#### Generacion de Reportes

| Libreria | Version | Proposito |
|----------|---------|-----------|
| pdfkit | 0.17.2 | Generacion de documentos PDF |
| exceljs | 4.4.0 | Generacion de hojas de calculo Excel (XLSX) |

#### Utilidades

| Libreria | Version | Proposito |
|----------|---------|-----------|
| multer | 2.0.2 | Middleware para manejo de multipart/form-data (uploads) |
| cors | 2.8.5 | Middleware para habilitar CORS |

### 3.2 Dependencias de Desarrollo

| Libreria | Version | Proposito |
|----------|---------|-----------|
| @nestjs/cli | 11.0.0 | CLI para generacion de codigo NestJS |
| @nestjs/testing | 11.0.1 | Utilidades para pruebas unitarias |
| jest | 30.0.0 | Framework de pruebas |
| ts-jest | 29.2.5 | Soporte de TypeScript para Jest |
| supertest | 7.0.0 | Pruebas de integracion HTTP |
| eslint | 9.18.0 | Linter para JavaScript/TypeScript |
| prettier | 3.4.2 | Formateador de codigo |
| typescript | 5.7.3 | Compilador de TypeScript |

---

## 4. Frontend - Dependencias y Librerias

### 4.1 Dependencias de Produccion

#### Core y Renderizado

| Libreria | Version | Proposito |
|----------|---------|-----------|
| react | 19.2.3 | Biblioteca principal para construccion de UI |
| react-dom | 19.2.0 | Renderizado de React en el DOM del navegador |

#### Enrutamiento

| Libreria | Version | Proposito |
|----------|---------|-----------|
| react-router-dom | 7.11.0 | Enrutamiento declarativo para aplicaciones React SPA |

#### Comunicacion HTTP

| Libreria | Version | Proposito |
|----------|---------|-----------|
| axios | 1.13.2 | Cliente HTTP basado en promesas para peticiones a la API |

#### Estilos

| Libreria | Version | Proposito |
|----------|---------|-----------|
| tailwindcss | 4.1.18 | Framework CSS utilitario para estilos responsivos |
| @tailwindcss/vite | 4.1.18 | Plugin de Tailwind para integracion con Vite |

#### Internacionalizacion

| Libreria | Version | Proposito |
|----------|---------|-----------|
| i18next | 25.8.0 | Framework de internacionalizacion |
| react-i18next | 16.5.4 | Integracion de i18next con React |
| i18next-browser-languagedetector | 8.2.0 | Deteccion automatica del idioma del navegador |

#### Componentes UI

| Libreria | Version | Proposito |
|----------|---------|-----------|
| swiper | 12.0.3 | Componente de carrusel/slider tactil |
| react-icons | 5.5.0 | Coleccion de iconos como componentes React |
| react-hot-toast | 2.6.0 | Notificaciones toast elegantes y personalizables |

### 4.2 Dependencias de Desarrollo

| Libreria | Version | Proposito |
|----------|---------|-----------|
| vite | 7.2.4 | Herramienta de construccion y servidor de desarrollo |
| @vitejs/plugin-react | 5.1.1 | Plugin de Vite para soporte de React |
| eslint | 9.39.1 | Linter para JavaScript |
| eslint-plugin-react-hooks | 7.0.1 | Reglas de ESLint para hooks de React |
| eslint-plugin-react-refresh | 0.4.24 | Soporte de Fast Refresh para ESLint |

---

## 5. Estructura del Proyecto

### 5.1 Estructura General

```
Book-Store-App/
├── client/                 # Aplicacion Frontend (React)
├── server/                 # API Backend (NestJS)
├── render.yaml             # Configuracion de despliegue en Render
├── README.md               # Documentacion general
├── MANUAL_DE_USUARIO.md    # Guia de usuario
└── MANUAL_TECNICO.md       # Este documento
```

### 5.2 Estructura del Backend

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

### 5.3 Estructura del Frontend

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

## 6. Modelos de Datos

### 6.1 Usuario (User)

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

### 6.2 Producto (Product)

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
    // otros idiomas
  },
  shelfId: ObjectId (ref: Shelf),
  createdAt: Date,
  updatedAt: Date
}
```

### 6.3 Pedido (Order)

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

### 6.4 Prestamo (Loan)

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

### 6.5 Reservacion (Reservation)

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

### 6.6 Estante (Shelf)

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

## 7. Sistema de Autenticacion

### 7.1 Flujo de Autenticacion de Usuario

1. El usuario envia credenciales (email/password) al endpoint `/api/user/login`
2. El servidor valida las credenciales contra la base de datos
3. Si son validas, se genera un JWT con el ID del usuario
4. El token se envia como cookie HTTP-only
5. El cliente almacena el token tambien en localStorage
6. Las peticiones subsecuentes incluyen el token en el header Authorization o cookie

### 7.2 Flujo de Autenticacion de Administrador

1. El administrador envia credenciales al endpoint `/api/admin/login`
2. El servidor valida contra variables de entorno (ADMIN_EMAIL, ADMIN_PASS, ADMIN_PHONE)
3. Si son validas, se genera un JWT con el email del administrador
4. El token se envia como cookie `adminToken`
5. Las rutas protegidas verifican este token mediante `AdminAuthGuard`

### 7.3 Guards de Autenticacion

**AuthGuard** (Usuarios normales):
- Verifica token en cookie `token` o header `Authorization`
- Decodifica el JWT y extrae el `userId`
- Inyecta el `userId` en la solicitud

**AdminAuthGuard** (Administradores):
- Verifica token en cookie `adminToken` o header `Authorization`
- Decodifica el JWT y extrae el `email`
- Valida que el email corresponda al administrador configurado

### 7.4 Estructura del Token JWT

```json
{
  "id": "userId_o_email",
  "session": "session_id_opcional",
  "iat": 1234567890,
  "exp": 1235172690
}
```

Expiracion: 7 dias

---

## 8. Endpoints de la API

### 8.1 Autenticacion (/api/user)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /register | Registro de usuario | No |
| POST | /login | Inicio de sesion | No |
| POST | /logout | Cierre de sesion | Si |
| GET | /is-auth | Verificar autenticacion | Si |
| GET | /profile | Obtener perfil | Si |
| PUT | /update-profile | Actualizar perfil | Si |
| POST | /forgot-password | Solicitar recuperacion | No |
| POST | /reset-password | Restablecer contraseña | No |

### 8.2 Administracion (/api/admin)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /login | Login de administrador | No |
| POST | /logout | Logout de administrador | Admin |
| GET | /is-admin | Verificar rol admin | Admin |

### 8.3 Productos (/api/product)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | /list | Listar todos los productos | No |
| GET | /list/:lang | Listar con traducciones | No |
| GET | /:id | Obtener producto por ID | No |
| POST | /add | Agregar producto | Admin |
| PUT | /update | Actualizar producto | Admin |
| DELETE | /delete/:id | Eliminar producto | Admin |
| POST | /search/linear | Busqueda lineal | No |
| POST | /search/binary | Busqueda binaria por ISBN | No |
| GET | /sort-by-price | Ordenar por precio | No |

### 8.4 Carrito (/api/cart)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /add | Agregar al carrito | Si |
| POST | /update | Actualizar cantidad | Si |

### 8.5 Direcciones (/api/address)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /add | Agregar direccion | Si |
| GET | /list | Listar direcciones | Si |

### 8.6 Pedidos (/api/order)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /cod | Crear pedido (efectivo) | Si |
| POST | /stripe | Crear pedido (Stripe) | Si |
| POST | /user-orders | Pedidos del usuario | Si |
| POST | /list | Listar todos (Admin) | Admin |
| POST | /status | Actualizar estado | Admin |

### 8.7 Prestamos (/api/loan)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | /history | Historial del usuario | Si |
| POST | /create | Crear prestamo | Si |
| GET | /last-active | Ultimo prestamo activo | Si |
| POST | /return/:loanId | Devolver libro | Si |
| GET | /stats | Estadisticas del usuario | Si |
| GET | /admin/all | Todos los prestamos | Admin |

### 8.8 Reservaciones (/api/reservation)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | /my-reservations | Reservaciones del usuario | Si |
| POST | /create | Crear reservacion | Si |
| POST | /cancel/:id | Cancelar reservacion | Si |
| GET | /waiting-list/:bookId | Lista de espera | No |
| GET | /stats | Estadisticas del usuario | Si |

### 8.9 Estantes (/api/shelf)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /create | Crear estante | Admin |
| GET | /list | Listar estantes | Admin |
| POST | /assign-book | Asignar libro | Admin |
| DELETE | /remove-book/:shelfId/:bookId | Remover libro | Admin |
| GET | /dangerous-combinations/:id | Analisis de combinaciones | Admin |
| GET | /optimize/:id | Optimizar estante | Admin |

### 8.10 Reportes (/api/report)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | /inventory/pdf | Inventario en PDF | Admin |
| GET | /inventory/xlsx | Inventario en Excel | Admin |
| GET | /loans/pdf | Prestamos en PDF | Admin |
| GET | /loans/xlsx | Prestamos en Excel | Admin |
| GET | /recursion-preview | Vista previa de calculo recursivo | Admin |

---

## 9. Configuracion del Entorno

### 9.1 Variables de Entorno del Backend

Crear archivo `.env` en la carpeta `server/`:

```env
# Base de datos
MONGODB_URI=enlace_proporcionado_por_mongodb_atlas

# Seguridad
JWT_SECRET=clave_secreta_jwt_muy_larga_y_segura

# Administrador
ADMIN_EMAIL=admin@zibooka.com
ADMIN_PASS=contraseña_segura_admin
ADMIN_PHONE=+1234567890

# Cloudinary
CLOUDINARY_CLOUD_NAME=nombre_del_cloud
CLOUDINARY_API_KEY=api_key_cloudinary
CLOUDINARY_API_SECRET=api_secret_cloudinary

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=correo@gmail.com
SMTP_PASS=contraseña_app

# Entorno
APP_ENV=development
VITE_FRONTEND_URL=http://localhost:5173
```

### 9.2 Variables de Entorno del Frontend

Crear archivo `.env` en la carpeta `client/`:

```env
VITE_BACKEND_URL=http://localhost:4000
VITE_CURRENCY=$
```

### 9.3 Configuracion de CORS

El backend esta configurado para aceptar solicitudes de:

- `http://localhost:5173` (desarrollo local)
- `https://zibooka.onrender.com` (produccion)
- URLs definidas en `VITE_FRONTEND_URL`

La configuracion incluye:
- Credenciales habilitadas (`credentials: true`)
- Metodos permitidos: GET, POST, PUT, DELETE, PATCH, OPTIONS
- Headers permitidos: Content-Type, Authorization, Accept, X-Requested-With

---

## 10. Pruebas

### 10.1 Estructura de Pruebas

```
server/
├── src/
│   ├── **/*.spec.ts      # Pruebas unitarias
└── test/
    ├── app.e2e-spec.ts   # Pruebas end-to-end
    ├── admin.e2e-spec.ts
    ├── user.e2e-spec.ts
    └── jest-e2e.json
```

### 10.2 Ejecucion de Pruebas

```bash
# Pruebas unitarias
npm run test

# Pruebas con cobertura
npm run test:cov

# Pruebas end-to-end
npm run test:e2e

# Modo watch
npm run test:watch
```

### 10.3 Configuracion de Jest

El proyecto utiliza Jest con las siguientes configuraciones:

- Extensiones de modulos: js, json, ts
- Regex de pruebas: `.*\.spec\.ts$`
- Transformador: ts-jest
- Entorno: node

---

## 11. Despliegue

### 11.1 Configuracion de Render

El archivo `render.yaml` define los servicios:

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

### 11.2 Proceso de Despliegue

1. Push de cambios a la rama `main`
2. Render detecta los cambios automaticamente
3. Ejecuta los comandos de build
4. Despliega los servicios actualizados

### 11.3 Consideraciones de Produccion

- Configurar variables de entorno en el dashboard de Render
- Usar MongoDB Atlas para la base de datos
- Configurar dominio personalizado si es necesario
- Habilitar HTTPS (automatico en Render)

---

## 12. Consideraciones de Seguridad

### 12.1 Autenticacion

- Contraseñas encriptadas con bcrypt (salt rounds: 10)
- Tokens JWT con expiracion de 7 dias
- Cookies HTTP-only para tokens sensibles
- Validacion de tokens en cada solicitud protegida

### 12.2 Validacion de Datos

- DTOs con class-validator para validacion de entrada
- Sanitizacion de datos antes de almacenar
- Validacion de tipos con TypeScript

### 12.3 Proteccion de Rutas

- Guards para verificar autenticacion
- Separacion de roles (usuario/admin)
- Decoradores personalizados para extraer datos del token

### 12.4 CORS

- Lista blanca de origenes permitidos
- Credenciales habilitadas solo para origenes confiables

### 12.5 Manejo de Errores

- Excepciones HTTP estandarizadas de NestJS
- Mensajes de error genericos en produccion
- Logging de errores en el servidor

### 12.6 Pagos

- Stripe maneja todos los datos de tarjetas
- El servidor nunca almacena informacion de pago
- Webhooks verificados con firma de Stripe

---

## Glosario Tecnico

| Termino | Definicion |
|---------|------------|
| API REST | Interfaz de programacion que usa HTTP para comunicacion |
| DTO | Data Transfer Object, objeto para validar datos de entrada |
| Guard | Middleware que protege rutas basado en condiciones |
| JWT | JSON Web Token, estandar para tokens de autenticacion |
| ODM | Object Document Mapper, mapea objetos a documentos de base de datos |
| SPA | Single Page Application, aplicacion de una sola pagina |
| Webhook | Callback HTTP que notifica eventos en tiempo real |

---

## Referencias

- [Documentacion de NestJS](https://docs.nestjs.com/)
- [Documentacion de React](https://react.dev/)
- [Documentacion de MongoDB](https://docs.mongodb.com/)
- [Documentacion de Mongoose](https://mongoosejs.com/docs/)
- [Documentacion de Stripe](https://stripe.com/docs)
- [Documentacion de Cloudinary](https://cloudinary.com/documentation)
