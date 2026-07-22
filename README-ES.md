# ZiBooka - Sistema de Gestion de Libreria

## Descripcion General

ZiBooka es una aplicacion web fullstack disenada para la gestion integral de una libreria. El sistema permite a los usuarios explorar, comprar, reservar y solicitar prestamos de libros, mientras que los administradores cuentan con un panel completo para gestionar el inventario, pedidos, estantes, prestamos, generar reportes y aprovechar **predicciones de Machine Learning** para pronosticar demanda, detectar riesgo de retraso y analizar anomalias de inventario.

El proyecto implementa una arquitectura moderna de microservicios con tres servicios principales:

- **Frontend**: React SPA con TailwindCSS
- **Backend**: API REST desarrollada con NestJS
- **Microservicio ML**: Predicciones de IA/ML impulsadas por FastAPI y XGBoost

---

## Objetivo del Proyecto

Desarrollar un sistema de gestion de libreria que permita:

- Gestionar el catalogo de libros con soporte multilenguaje (Ingles/Espanol)
- Procesar compras mediante efectivo contra entrega y pagos con Stripe
- Administrar un sistema de prestamos de libros con **calculo de multas** y **scoring de riesgo**
- Implementar un sistema de reservaciones con **scoring de prioridad ponderado**
- Organizar el inventario fisico mediante gestion de estantes con **optimizacion algoritmica** (Backtracking, Fuerza Bruta)
- Generar reportes de inventario y prestamos en formatos PDF y Excel con **cache de 24 horas**
- Proporcionar **predicciones de Machine Learning** para demanda, riesgo de retraso, tiempos de espera y anomalias
- Enviar **notificaciones automaticas** via correo electronico (cron diario a las 9AM)
- Proporcionar una experiencia de usuario intuitiva y responsiva

---

## Tecnologias Utilizadas

### Frontend

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| React | 19.2.3 | Biblioteca principal para construccion de interfaces |
| Vite | 7.2.4 | Herramienta de construccion y servidor de desarrollo |
| TailwindCSS | 4.1.18 | Framework de estilos utilitarios |
| React Router DOM | 7.11.0 | Enrutamiento del lado del cliente |
| Axios | 1.13.2 | Cliente HTTP para comunicacion con la API |
| i18next | 25.8.0 | Internacionalizacion y soporte multilenguaje |
| Swiper | 12.0.3 | Componente de carrusel para presentacion de libros |

### Backend

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| NestJS | 11.0.1 | Framework de Node.js para construccion de APIs |
| MongoDB | 7 | Base de datos NoSQL |
| Mongoose | 9.1.1 | ODM para modelado de datos en MongoDB |
| Redis | 7 | Capa de cache con fallback a memoria |
| JWT | 9.0.3 | Autenticacion basada en tokens |
| Passport + Google OAuth | - | Autenticacion social |
| Stripe | 20.3.0 | Procesamiento de pagos en linea |
| Cloudinary | 2.8.0 | Almacenamiento y gestion de imagenes |
| PDFKit | 0.17.2 | Generacion de reportes en PDF |
| ExcelJS | 4.4.0 | Generacion de reportes en Excel |
| Nodemailer | 7.0.13 | Envio de correos electronicos |
| @nestjs/throttler | - | Rate limiting (100 req/60s por IP) |
| @nestjs/schedule | - | Programacion de tareas cron |

### Microservicio ML

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| FastAPI | 0.139.0 | Framework de API Python de alto rendimiento |
| scikit-learn | 1.9.0 | Algoritmos de machine learning |
| XGBoost | 3.3.0 | Gradient boosting para predicciones |
| Pandas | 3.0.3 | Manipulacion y analisis de datos |
| NumPy | 2.5.1 | Computacion numerica |
| Motor | 3.6.1 | Driver async de MongoDB para Python |
| Uvicorn | 0.50.0 | Servidor ASGI |

### Infraestructura

| Tecnologia | Proposito |
|------------|-----------|
| Docker + Docker Compose | Despliegue containerizado |
| MongoDB 7 | Base de datos principal |
| Redis 7 | Capa de cache |
| Render | Plataforma de despliegue en la nube |

---

## Arquitectura del Sistema

[DIAGRAMA GENERAL DE LA ARQUITECTURA](docs/images/diagrams/exports/architecture.png)

### Patron Arquitectonico

El sistema implementa una **arquitectura distribuida** con tres servicios principales:

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
                    │  (Puerto 4000)  │
                    │  - 14 modulos   │
                    │  - Swagger API  │
                    │  - Redis Cache  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │  MongoDB 7  │ │  Redis 7    │ │  FastAPI ML │
     │(Puerto 27017)│ │(Puerto 6379)│ │(Puerto 5000)│
     │  DB: Zibooka│ │  Cache      │ │  5 Modelos  │
     └─────────────┘ └─────────────┘ └──────┬──────┘
                                            │
                                     ┌──────┴──────┐
                                     │  MongoDB    │
                                     │  (misma DB) │
                                     └─────────────┘
```

### Estructura del Backend (NestJS - 14 Modulos)

```
server/src/
├── addresses/      # Modulo de direcciones de envio
├── admin/          # Modulo de administracion
├── carts/          # Modulo de carrito de compras
├── common/         # Guards, decoradores, utilidades, MaxHeap
├── config/         # Configuraciones (MongoDB, Redis, etc.)
├── email/          # Servicio de correo electronico (Nodemailer)
├── loans/          # Modulo de prestamos (con scoring de riesgo)
├── migration/      # Modulo de migracion MongoDB -> MySQL
├── notifications/  # Notificaciones automaticas (cron jobs)
├── orders/         # Modulo de pedidos (con cola de prioridad)
├── prediction/     # Cliente de predicciones ML (FastAPI)
├── products/       # Modulo de productos (con algoritmos de busqueda)
├── reports/        # Generacion de reportes (PDF/Excel con cache)
├── reservations/   # Modulo de reservaciones (con scoring ponderado)
├── shelves/        # Gestion de estantes (con algoritmos de optimizacion)
└── users/          # Modulo de usuarios (con Google OAuth)
```

### Estructura del Microservicio ML (FastAPI)

```
ms-ml/app/
├── main.py              # App FastAPI, CORS, middleware
├── config.py            # Configuraciones (Pydantic)
├── database.py          # Conexion async MongoDB (Motor)
├── models/
│   ├── base.py              # BasePredictor (ABC)
│   ├── wait_time_predictor.py   # Regresion XGBoost
│   ├── demand_predictor.py      # Clasificacion XGBoost
│   ├── overdue_predictor.py     # Clasificacion XGBoost
│   └── anomaly_detector.py      # Isolation Forest
├── routers/
│   ├── health.py        # GET /health
│   ├── predict.py       # POST /predict/*
│   └── train.py         # POST /train/*
├── schemas/             # Esquemas Pydantic request/response
└── utils/               # Preparacion de datos, metricas, serializacion
```

### Estructura del Frontend (React)

```
client/src/
├── assets/         # Recursos estaticos e imagenes
├── components/     # Componentes reutilizables
│   └── admin/      # Componentes del panel administrativo
├── context/        # Contexto global de la aplicacion (ShopContext)
├── i18n/           # Configuracion de internacionalizacion
│   └── locales/    # Archivos de traduccion (en.json, es.json)
└── pages/          # Paginas de la aplicacion
    └── admin/      # Paginas del panel administrativo
        ├── DemandPredictions.jsx    # Predicciones de demanda ML
        └── InventoryAnomalies.jsx   # Deteccion de anomalias ML
```

---

## Estructuras de Datos y Algoritmos

El proyecto implementa varias tecnicas algoritmicas para optimizar el rendimiento:

| Algoritmo | Ubicacion | Proposito |
|-----------|-----------|-----------|
| **MaxHeap** | `common/utils/max-heap.ts` | Cola de prioridad para procesamiento de pedidos. Prioridad = paymentScore + historyScore + ageScore |
| **Busqueda Binaria** | `products/product.service.ts` | Busqueda rapida de productos por ISBN (O(log n)) |
| **Busqueda Lineal** | `products/product.service.ts` | Busqueda de productos por titulo/autor (O(n)) |
| **Merge Sort** | `products/product.service.ts` | Ordenamiento de productos por precio (O(n log n)) |
| **Backtracking** | `shelves/shelf.service.ts` | Optimizacion de estantes (problema de la Mochila - maximizar peso sin exceder capacidad) |
| **Fuerza Bruta** | `shelves/shelf.service.ts` | Deteccion de combinaciones peligrosas en estantes |
| **Pila (LIFO)** | `loans/loan.service.ts` | Historial de prestamos del usuario |
| **Score Ponderado** | `reservations/reservation.service.ts` | Prioridad de reservas: alpha*posicion_cola + beta*puntualidad + gamma*tiempo_espera - delta*penalizacion |

---

## Modelos de Machine Learning

El microservicio ML proporciona 5 modelos predictivos:

| Modelo | Tipo | Algoritmo | Caso de Uso |
|--------|------|-----------|-------------|
| **WaitTimePredictor** | Regresion | XGBoost | Predice dias de espera estimados para reservas |
| **DemandPredictor** | Clasificacion | XGBoost | Predice libros de alta demanda para planificacion de inventario |
| **OverduePredictor** | Clasificacion | XGBoost | Predice riesgo de retraso en prestamos activos (6-13 features) |
| **AnomalyDetector** | Deteccion de Anomalias | Isolation Forest | Detecta patrones de prestamo inusuales |
| **ShelfAnomalyDetector** | Deteccion de Anomalias | Isolation Forest | Detecta distribuciones anomalias en estantes |

### Endpoints del ML

**Predicciones:**
- `POST /predict/wait-time` - Tiempo de espera estimado para reservas
- `POST /predict/demand/list` - Prediccion de demanda para todos los libros
- `POST /predict/overdue` - Riesgo de retraso (6 features)
- `POST /predict/overdue-extended` - Riesgo de retraso (13 features)
- `POST /predict/anomaly` - Deteccion de anomalias de comportamiento
- `GET /predict/anomalies` - Deteccion de anomalias de estantes

**Entrenamiento:**
- `POST /train/from-database` - Entrenar todos los modelos desde MongoDB
- `POST /train/{wait-time|demand|overdue|anomaly}/from-database` - Entrenar modelos individuales

---

## Indices de MongoDB

La base de datos utiliza **26 indices optimizados** en 10 colecciones:

| Coleccion | Indices | Indices Destacados |
|-----------|---------|-------------------|
| **User** | 2 | `email` (unique), `googleId` (sparse+unique) |
| **Product** | 3 | `isbn` (sparse+unique), `author`, `category` |
| **Order** | 3 | `{userId, createdAt}`, `{status}`, `{createdAt}` |
| **Loan** | 4 | `userId`, `bookId`, `status`, `{bookId, loanDate}` |
| **Reservation** | 5 | `userId`, `bookId`, `status`, `{bookId, status, priority}`, `{userId, requestDate}` |
| **Shelf** | 1 | `code` (unique) |
| **Address** | 1 | `{userId, createdAt}` |
| **Notification** | 5 | `userId`, `type`, `relatedId`, `{userId, sentAt}`, `{relatedId, relatedModel, type}` |
| **ReportCache** | 3 | `cacheKey`, `{reportType, cacheKey}`, TTL 24h en `updatedAt` |
| **HighRiskLoan** | 2 | `loanId`, `userId` |

---

## Requerimientos Funcionales

### Modulo de Usuario

| ID | Requerimiento | Descripcion |
|----|---------------|-------------|
| RF-01 | Registro de usuario | El sistema debe permitir el registro de nuevos usuarios con nombre, email y contrasena |
| RF-02 | Inicio de sesion | El sistema debe autenticar usuarios mediante email y contrasena |
| RF-03 | Google OAuth | El sistema debe soportar autenticacion social con Google |
| RF-04 | Recuperacion de contrasena | El sistema debe permitir restablecer la contrasena via correo electronico |
| RF-05 | Gestion de perfil | El usuario debe poder actualizar su informacion personal e imagen de perfil |
| RF-06 | Carrito de compras | El sistema debe mantener un carrito persistente por usuario |

### Modulo de Productos

| ID | Requerimiento | Descripcion |
|----|---------------|-------------|
| RF-07 | Catalogo de libros | El sistema debe mostrar el catalogo de libros disponibles |
| RF-08 | Busqueda de productos | El sistema debe permitir buscar libros por titulo, autor o ISBN (busqueda lineal/binaria) |
| RF-09 | Filtrado por categoria | El sistema debe permitir filtrar libros por categoria |
| RF-10 | Ordenamiento | El sistema debe permitir ordenar libros por precio (Merge Sort) |
| RF-11 | Detalle de producto | El sistema debe mostrar informacion detallada de cada libro |
| RF-12 | Soporte multilenguaje | Los productos soportan traducciones en ingles y espanol |

### Modulo de Pedidos

| ID | Requerimiento | Descripcion |
|----|---------------|-------------|
| RF-13 | Proceso de checkout | El sistema debe permitir completar una compra |
| RF-14 | Pago contra entrega | El sistema debe soportar pago en efectivo contra entrega |
| RF-15 | Pago con Stripe | El sistema debe procesar pagos con tarjeta via Stripe |
| RF-16 | Historial de pedidos | El usuario debe poder ver su historial de compras |
| RF-17 | Seguimiento de estado | El usuario debe ver el estado actual de sus pedidos |
| RF-18 | Cola de prioridad | Los pedidos se procesan usando una cola de prioridad MaxHeap |

### Modulo de Prestamos

| ID | Requerimiento | Descripcion |
|----|---------------|-------------|
| RF-19 | Solicitar prestamo | El usuario debe poder solicitar el prestamo de un libro disponible |
| RF-20 | Devolucion de libro | El usuario debe poder registrar la devolucion de un libro |
| RF-21 | Historial de prestamos | El usuario debe ver su historial de prestamos (Pila/LIFO) |
| RF-22 | Control de vencimiento | El sistema debe calcular y mostrar fechas de vencimiento (14 dias) |
| RF-23 | Multas por retraso | El sistema debe calcular multas por retraso ($0.50/dia) |
| RF-24 | Scoring de riesgo | El sistema debe predecir riesgo de retraso usando ML |

### Modulo de Reservaciones

| ID | Requerimiento | Descripcion |
|----|---------------|-------------|
| RF-25 | Reservar libro agotado | El usuario debe poder reservar libros sin stock |
| RF-26 | Cola de prioridad ponderada | El sistema debe gestionar una cola de prioridad con scoring ponderado |
| RF-27 | Prediccion de tiempo de espera | El sistema debe predecir el tiempo de espera estimado usando ML |
| RF-28 | Notificacion de disponibilidad | El sistema debe notificar cuando un libro reservado este disponible |
| RF-29 | Cancelacion de reserva | El usuario debe poder cancelar sus reservaciones |

### Modulo de Estantes

| ID | Requerimiento | Descripcion |
|----|---------------|-------------|
| RF-30 | Gestion de estantes | El administrador debe organizar libros en estantes |
| RF-31 | Optimizacion | El sistema debe optimizar la asignacion de estantes usando Backtracking (Mochila) |
| RF-32 | Combinaciones peligrosas | El sistema debe detectar combinaciones peligrosas usando Fuerza Bruta |

### Modulo de Notificaciones

| ID | Requerimiento | Descripcion |
|----|---------------|-------------|
| RF-33 | Recordatorios automaticos | El sistema debe enviar recordatorios automaticos por correo a las 9AM diario |
| RF-34 | Notificaciones admin | Los administradores pueden enviar notificaciones manuales a usuarios |
| RF-35 | Historial de notificaciones | Los usuarios pueden ver su historial de notificaciones |

### Modulo de Predicciones ML

| ID | Requerimiento | Descripcion |
|----|---------------|-------------|
| RF-36 | Predicciones de demanda | Los administradores pueden ver predicciones de demanda para planificacion |
| RF-37 | Deteccion de anomalias | Los administradores pueden ver anomalias de estantes y comportamiento |
| RF-38 | Entrenamiento de modelos | Los administradores pueden reentrenar los modelos ML desde la base de datos |

### Modulo de Reportes

| ID | Requerimiento | Descripcion |
|----|---------------|-------------|
| RF-39 | Generacion de reportes | El administrador debe generar reportes en PDF y Excel |
| RF-40 | Cache de reportes | Los reportes se cachean por 24 horas usando TTL de MongoDB |

---

## Requerimientos No Funcionales

| ID | Categoria | Requerimiento |
|----|-----------|---------------|
| RNF-01 | Rendimiento | El tiempo de respuesta de la API no debe exceder 2 segundos |
| RNF-02 | Disponibilidad | El sistema debe estar disponible el 99% del tiempo |
| RNF-03 | Seguridad | Las contrasenas deben almacenarse encriptadas con bcrypt |
| RNF-04 | Seguridad | La comunicacion debe usar HTTPS en produccion |
| RNF-05 | Seguridad | Los tokens JWT deben expirar en 7 dias |
| RNF-06 | Seguridad | Rate limiting: 100 solicitudes por 60 segundos por IP |
| RNF-07 | Usabilidad | La interfaz debe ser responsiva (mobile-first) |
| RNF-08 | Usabilidad | El sistema debe soportar los idiomas ingles y espanol |
| RNF-09 | Escalabilidad | La arquitectura debe permitir escalamiento horizontal |
| RNF-10 | Escalabilidad | Cache Redis con fallback a memoria |
| RNF-11 | Mantenibilidad | El codigo debe seguir estandares de linting (ESLint) |
| RNF-12 | Compatibilidad | El frontend debe ser compatible con navegadores modernos |

---

## Instalacion y Ejecucion

### Requisitos Previos

- Node.js version 18 o superior
- Python 3.10+ (para el microservicio ML)
- MongoDB 7 (local o Atlas)
- Redis 7 (local o en la nube)
- Docker & Docker Compose (opcional, para despliegue containerizado)
- Cuenta de Cloudinary
- Cuenta de Stripe (opcional, para pagos)
- Cuenta de Google Cloud Console (opcional, para OAuth)

### Inicio Rapido con Docker

```bash
docker-compose up -d
```

Esto inicia todos los servicios:
- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- Microservicio ML: http://localhost:5000
- MongoDB: localhost:27017
- Redis: localhost:6379

### Configuracion del Backend

```bash
cd server
npm install
```

Crear archivo `.env` con las siguientes variables:

```env
# Base de datos
MONGODB_URI=mongodb://localhost:27017/zibooka

# Seguridad
JWT_SECRET=tu_clave_secreta

# Administrador
ADMIN_EMAIL=admin@ejemplo.com
ADMIN_PASS=contrasena_admin
ADMIN_PHONE=+1234567890

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=usuario@gmail.com
SMTP_PASS=contrasena_app

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Servicio ML
ML_SERVICE_URL=http://localhost:5000

# Google OAuth
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Pesos de Scoring de Reservaciones
RESERVATION_SCORE_ALPHA=0.5
RESERVATION_SCORE_BETA=0.3
RESERVATION_SCORE_GAMMA=0.15
RESERVATION_SCORE_DELTA=0.05

# URL del Frontend
VITE_FRONTEND_URL=http://localhost:5173
```

Ejecutar el servidor:

```bash
npm run start:dev
```

### Configuracion del Frontend

```bash
cd client
npm install
```

Crear archivo `.env` con:

```env
VITE_BACKEND_URL=http://localhost:4000
VITE_CURRENCY=$
```

Ejecutar la aplicacion:

```bash
npm run dev
```

### Configuracion del Microservicio ML

```bash
cd ms-ml
pip install -r requirements.txt
```

Crear archivo `.env` con:

```env
MONGODB_URI=mongodb://localhost:27017/zibooka
MONGODB_DB_NAME=zibooka
LOG_LEVEL=INFO
```

Ejecutar el microservicio:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```

---

## Endpoints de la API

### Autenticacion (/api/user)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /api/user/register | Registro de usuario | No |
| POST | /api/user/login | Inicio de sesion | No |
| POST | /api/user/logout | Cierre de sesion | Si |
| GET | /api/user/is-auth | Verificar autenticacion | Si |
| GET | /api/user/profile | Obtener perfil | Si |
| PUT | /api/user/update-profile | Actualizar perfil | Si |
| POST | /api/user/forgot-password | Solicitar recuperacion | No |
| POST | /api/user/reset-password | Restablecer contrasena | No |

### Administracion (/api/admin)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /api/admin/login | Login de administrador | No |
| POST | /api/admin/logout | Logout de administrador | Admin |
| GET | /api/admin/is-admin | Verificar rol admin | Admin |

### Productos (/api/product)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | /api/product/list | Listar todos los productos | No |
| GET | /api/product/list/:lang | Listar con traducciones | No |
| GET | /api/product/:id | Obtener producto por ID | No |
| POST | /api/product/add | Agregar producto | Admin |
| PUT | /api/product/update | Actualizar producto | Admin |
| DELETE | /api/product/delete/:id | Eliminar producto | Admin |
| POST | /api/product/search/linear | Busqueda lineal | No |
| POST | /api/product/search/binary | Busqueda binaria por ISBN | No |
| GET | /api/product/sort-by-price | Ordenar por precio (Merge Sort) | No |

### Carrito (/api/cart)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /api/cart/add | Agregar al carrito | Si |
| POST | /api/cart/update | Actualizar cantidad | Si |

### Direcciones (/api/address)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /api/address/add | Agregar direccion | Si |
| GET | /api/address/list | Listar direcciones | Si |

### Pedidos (/api/order)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /api/order/cod | Crear pedido (efectivo) | Si |
| POST | /api/order/stripe | Crear pedido (Stripe) | Si |
| POST | /api/order/user-orders | Pedidos del usuario | Si |
| POST | /api/order/list | Listar todos (Admin) | Admin |
| POST | /api/order/status | Actualizar estado | Admin |

### Prestamos (/api/loan)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | /api/loan/history | Historial del usuario | Si |
| POST | /api/loan/create | Crear prestamo | Si |
| GET | /api/loan/last-active | Ultimo prestamo activo | Si |
| POST | /api/loan/return/:loanId | Devolver libro | Si |
| GET | /api/loan/stats | Estadisticas del usuario | Si |
| GET | /api/loan/admin/all | Todos los prestamos | Admin |

### Reservaciones (/api/reservation)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | /api/reservation/my-reservations | Reservaciones del usuario | Si |
| POST | /api/reservation/create | Crear reservacion | Si |
| POST | /api/reservation/cancel/:id | Cancelar reservacion | Si |
| GET | /api/reservation/waiting-list/:bookId | Lista de espera | No |
| GET | /api/reservation/stats | Estadisticas del usuario | Si |

### Estantes (/api/shelf)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /api/shelf/create | Crear estante | Admin |
| GET | /api/shelf/list | Listar estantes | Admin |
| POST | /api/shelf/assign-book | Asignar libro | Admin |
| DELETE | /api/shelf/remove-book/:shelfId/:bookId | Remover libro | Admin |
| GET | /api/shelf/dangerous-combinations/:id | Analisis de combinaciones (Fuerza Bruta) | Admin |
| GET | /api/shelf/optimize/:id | Optimizar estante (Backtracking) | Admin |

### Reportes (/api/report)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | /api/report/inventory/pdf | Inventario en PDF (cache 24h) | Admin |
| GET | /api/report/inventory/xlsx | Inventario en Excel (cache 24h) | Admin |
| GET | /api/report/loans/pdf | Prestamos en PDF (cache 24h) | Admin |
| GET | /api/report/loans/xlsx | Prestamos en Excel (cache 24h) | Admin |
| GET | /api/report/recursion-preview | Vista previa de calculo recursivo | Admin |

### Notificaciones (/api/notification)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| GET | /api/notification/my-notifications | Notificaciones del usuario | Si |
| GET | /api/notification/admin/all | Todas las notificaciones (Admin) | Admin |
| POST | /api/notification/admin/send | Enviar notificacion (Admin) | Admin |

### Predicciones ML (/api/prediction)

| Metodo | Endpoint | Descripcion | Auth |
|--------|----------|-------------|------|
| POST | /api/prediction/wait-time | Predecir tiempo de espera | Admin |
| POST | /api/prediction/demand | Predecir demanda | Admin |
| POST | /api/prediction/overdue | Predecir riesgo de retraso | Admin |
| POST | /api/prediction/anomaly | Detectar anomalia | Admin |
| GET | /api/prediction/anomalies | Obtener anomalias de estantes | Admin |
| POST | /api/prediction/train | Entrenar todos los modelos | Admin |

---

## Despliegue

El proyecto esta configurado para desplegarse en Render mediante el archivo `render.yaml`:

- **Frontend**: Servicio estatico
- **Backend**: Servicio web Node.js
- **Microservicio ML**: Servicio web Python

### Docker Compose

```yaml
services:
  mongodb:      # MongoDB 7 (Puerto 27017)
  redis:        # Redis 7 (Puerto 6379)
  zibooka-ml:   # FastAPI ML (Puerto 5000)
  zibooka-backend: # NestJS Backend (Puerto 4000)
```

---

## Licencia

Este proyecto es de uso privado y educativo.

---

## Autor

Sebastian Salazar Guiza

Ingeniero de Sistemas Junior

Desarrollado como proyecto academico de gestion de librerias.
