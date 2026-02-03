# ZiBooka - Sistema de Gestion de Libreria

## Descripcion General

ZiBooka es una aplicacion web fullstack diseñada para la gestion integral de una libreria. El sistema permite a los usuarios explorar, comprar, reservar y solicitar prestamos de libros, mientras que los administradores cuentan con un panel completo para gestionar el inventario, pedidos, estantes, prestamos y generar reportes.

El proyecto implementa una arquitectura cliente-servidor moderna, utilizando React para el frontend y NestJS para el backend, con MongoDB como base de datos NoSQL.

---

## Objetivo del Proyecto

Desarrollar un sistema de gestion de libreria que permita:

- Gestionar el catalogo de libros con soporte multilenguaje
- Procesar compras mediante efectivo contra entrega y pagos con Stripe
- Administrar un sistema de prestamos de libros
- Implementar un sistema de reservaciones para libros agotados
- Organizar el inventario fisico mediante gestion de estantes
- Generar reportes de inventario y prestamos en formatos PDF y Excel
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
| MongoDB | - | Base de datos NoSQL |
| Mongoose | 9.1.1 | ODM para modelado de datos en MongoDB |
| JWT | 9.0.3 | Autenticacion basada en tokens |
| Stripe | 20.3.0 | Procesamiento de pagos en linea |
| Cloudinary | 2.8.0 | Almacenamiento y gestion de imagenes |
| PDFKit | 0.17.2 | Generacion de reportes en PDF |
| ExcelJS | 4.4.0 | Generacion de reportes en Excel |
| Nodemailer | 7.0.13 | Envio de correos electronicos |

---

## Arquitectura del Sistema

### Patron Arquitectonico

El sistema implementa una **Arquitectura de Capas (Layered Architecture)** combinada con el patron **MVC (Modelo-Vista-Controlador)** en el backend y una arquitectura basada en **Componentes** en el frontend.

[DIAGRAMA DE ARQUITECTURA GENERAL](docs/images/diagrams/architecture.png)

### Estructura del Backend (NestJS)

```
server/src/
├── addresses/      # Modulo de direcciones de envio
├── admin/          # Modulo de administracion
├── carts/          # Modulo de carrito de compras
├── common/         # Guards, decoradores y utilidades compartidas
├── config/         # Configuraciones (MongoDB, etc.)
├── email/          # Servicio de correo electronico
├── loans/          # Modulo de prestamos de libros
├── orders/         # Modulo de pedidos
├── products/       # Modulo de productos (libros)
├── reports/        # Modulo de generacion de reportes
├── reservations/   # Modulo de reservaciones
├── shelves/        # Modulo de gestion de estantes
└── users/          # Modulo de usuarios
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
```

---

## Diagramas

### Diagrama de Flujo - Proceso de Compra

[PROCESO DE COMPRA](docs/images/diagrams/flow-diagram.png)

### Diagrama de Flujo - Sistema de Prestamos

[SISTEMA DE PRESTAMOS](docs/images/diagrams/loan-diagram.png)

### Diagrama de Clases - Modelos Principales

```
[DIAGRAMA UML - MODELOS]

Insertar diagrama de clases que incluya:
- User (id, name, email, password, cartData, profileImage)
- Product (id, name, author, ISBN, price, stock, category, images)
- Order (id, userId, items, address, amount, status, paymentType)
- Loan (id, userId, bookId, loanDate, dueDate, status)
- Reservation (id, userId, bookId, priority, status, expiryDate)
- Shelf (id, code, location, maxWeight, books)
```

[MODELOS](docs/images/diagrams/models.png)
[RELACIONES](docs/images/diagrams/relations.png)

### Diagrama de Secuencia - Autenticacion

[AUTENTICACION](docs/images/diagrams/authentication.png)

---

## Requerimientos Funcionales

### Modulo de Usuario

| ID | Requerimiento | Descripcion |
|----|---------------|-------------|
| RF-01 | Registro de usuario | El sistema debe permitir el registro de nuevos usuarios con nombre, email y contraseña |
| RF-02 | Inicio de sesion | El sistema debe autenticar usuarios mediante email y contraseña |
| RF-03 | Recuperacion de contraseña | El sistema debe permitir restablecer la contraseña via correo electronico |
| RF-04 | Gestion de perfil | El usuario debe poder actualizar su informacion personal e imagen de perfil |
| RF-05 | Carrito de compras | El sistema debe mantener un carrito persistente por usuario |

### Modulo de Productos

| ID | Requerimiento | Descripcion |
|----|---------------|-------------|
| RF-06 | Catalogo de libros | El sistema debe mostrar el catalogo de libros disponibles |
| RF-07 | Busqueda de productos | El sistema debe permitir buscar libros por titulo, autor o ISBN |
| RF-08 | Filtrado por categoria | El sistema debe permitir filtrar libros por categoria |
| RF-09 | Ordenamiento | El sistema debe permitir ordenar libros por precio y titulo |
| RF-10 | Detalle de producto | El sistema debe mostrar informacion detallada de cada libro |

### Modulo de Pedidos

| ID | Requerimiento | Descripcion |
|----|---------------|-------------|
| RF-11 | Proceso de checkout | El sistema debe permitir completar una compra |
| RF-12 | Pago contra entrega | El sistema debe soportar pago en efectivo contra entrega |
| RF-13 | Pago con Stripe | El sistema debe procesar pagos con tarjeta via Stripe |
| RF-14 | Historial de pedidos | El usuario debe poder ver su historial de compras |
| RF-15 | Seguimiento de estado | El usuario debe ver el estado actual de sus pedidos |

### Modulo de Prestamos

| ID | Requerimiento | Descripcion |
|----|---------------|-------------|
| RF-16 | Solicitar prestamo | El usuario debe poder solicitar el prestamo de un libro disponible |
| RF-17 | Devolucion de libro | El usuario debe poder registrar la devolucion de un libro |
| RF-18 | Historial de prestamos | El usuario debe ver su historial de prestamos |
| RF-19 | Control de vencimiento | El sistema debe calcular y mostrar fechas de vencimiento |

### Modulo de Reservaciones

| ID | Requerimiento | Descripcion |
|----|---------------|-------------|
| RF-20 | Reservar libro agotado | El usuario debe poder reservar libros sin stock |
| RF-21 | Cola de espera | El sistema debe gestionar una cola de espera por libro |
| RF-22 | Notificacion de disponibilidad | El sistema debe notificar cuando un libro reservado este disponible |
| RF-23 | Cancelacion de reserva | El usuario debe poder cancelar sus reservaciones |

### Modulo Administrativo

| ID | Requerimiento | Descripcion |
|----|---------------|-------------|
| RF-24 | Gestion de productos | El administrador debe poder crear, editar y eliminar libros |
| RF-25 | Gestion de pedidos | El administrador debe poder ver y actualizar estados de pedidos |
| RF-26 | Gestion de estantes | El administrador debe poder organizar libros en estantes |
| RF-27 | Gestion de prestamos | El administrador debe ver todos los prestamos del sistema |
| RF-28 | Generacion de reportes | El administrador debe generar reportes en PDF y Excel |

---

## Requerimientos No Funcionales

| ID | Categoria | Requerimiento |
|----|-----------|---------------|
| RNF-01 | Rendimiento | El tiempo de respuesta de la API no debe exceder 2 segundos |
| RNF-02 | Disponibilidad | El sistema debe estar disponible el 99% del tiempo |
| RNF-03 | Seguridad | Las contraseñas deben almacenarse encriptadas con bcrypt |
| RNF-04 | Seguridad | La comunicacion debe usar HTTPS en produccion |
| RNF-05 | Seguridad | Los tokens JWT deben expirar en 7 dias |
| RNF-06 | Usabilidad | La interfaz debe ser responsiva (mobile-first) |
| RNF-07 | Usabilidad | El sistema debe soportar los idiomas ingles y español |
| RNF-08 | Escalabilidad | La arquitectura debe permitir escalamiento horizontal |
| RNF-09 | Mantenibilidad | El codigo debe seguir estandares de linting (ESLint) |
| RNF-10 | Compatibilidad | El frontend debe ser compatible con navegadores modernos |

---

## Instalacion y Ejecucion

### Requisitos Previos

- Node.js version 18 o superior
- MongoDB (local o Atlas)
- Cuenta de Cloudinary
- Cuenta de Stripe (opcional, para pagos)

### Configuracion del Backend

```bash
cd server
npm install
```

Crear archivo `.env` con las siguientes variables:

```
MONGODB_URI=mongodb://localhost:27017/zibooka
JWT_SECRET=tu_clave_secreta
ADMIN_EMAIL=admin@ejemplo.com
ADMIN_PASS=contraseña_admin
ADMIN_PHONE=+1234567890
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
STRIPE_SECRET_KEY=sk_test_xxx
SMTP_HOST=smtp.ejemplo.com
SMTP_USER=usuario@ejemplo.com
SMTP_PASS=contraseña_smtp
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

```
VITE_BACKEND_URL=http://localhost:4000
VITE_CURRENCY=$
```

Ejecutar la aplicacion:

```bash
npm run dev
```

---

## Endpoints de la API

### Autenticacion

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | /api/user/register | Registro de usuario |
| POST | /api/user/login | Inicio de sesion |
| POST | /api/user/logout | Cierre de sesion |
| GET | /api/user/is-auth | Verificar autenticacion |

### Productos

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | /api/product/list | Listar todos los productos |
| GET | /api/product/:id | Obtener producto por ID |
| POST | /api/product/add | Agregar producto (Admin) |
| PUT | /api/product/update | Actualizar producto (Admin) |
| DELETE | /api/product/delete/:id | Eliminar producto (Admin) |

### Pedidos

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | /api/order/cod | Crear pedido (efectivo) |
| POST | /api/order/stripe | Crear pedido (Stripe) |
| POST | /api/order/user-orders | Obtener pedidos del usuario |
| POST | /api/order/list | Listar todos los pedidos (Admin) |
| POST | /api/order/status | Actualizar estado de pedido (Admin) |

---

## Despliegue

El proyecto esta configurado para desplegarse en Render mediante el archivo `render.yaml`:

- **Frontend**: Servicio estatico
- **Backend**: Servicio web Node.js

---

## Licencia

Este proyecto es de uso privado y educativo.

---

## Autor

Sebastián Salazar Güiza

Ingeniero de Sistemas Junior

Desarrollado como proyecto academico de gestion de librerias.
