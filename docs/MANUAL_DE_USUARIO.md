# Manual de Usuario - ZiBooka

## Introduccion

Bienvenido a ZiBooka, su plataforma en linea para la compra, prestamo y reservacion de libros. Este manual le guiara a traves de todas las funcionalidades disponibles en el sistema para que pueda aprovechar al maximo su experiencia.

---

## Tabla de Contenidos

1. [Acceso al Sistema](#1-acceso-al-sistema)
2. [Navegacion Principal](#2-navegacion-principal)
3. [Exploracion del Catalogo](#3-exploracion-del-catalogo)
4. [Carrito de Compras](#4-carrito-de-compras)
5. [Proceso de Compra](#5-proceso-de-compra)
6. [Prestamos de Libros](#6-prestamos-de-libros)
7. [Reservaciones](#7-reservaciones)
8. [Gestion del Perfil](#8-gestion-del-perfil)
9. [Seguimiento de Pedidos](#9-seguimiento-de-pedidos)
10. [Cambio de Idioma](#10-cambio-de-idioma)
11. [Preguntas Frecuentes](#11-preguntas-frecuentes)

---

## 1. Acceso al Sistema

Para acceder a ZiBooka, abra su navegador web y dirijase a la siguiente URL:

```
https://zibooka-frontend.onrender.com/
```

[Pantalla de Inicio](images/spanish/screenshot_01.png)

### 1.1 Registro de Nueva Cuenta

Para crear una cuenta en ZiBooka, siga estos pasos:

1. Haga clic en el icono de usuario ubicado en la esquina superior derecha de la pantalla
2. Seleccione la opcion "Registrarse"
3. Complete el formulario con sus datos:
   - Nombre completo
   - Correo electronico
   - Contraseña (minimo 8 caracteres)
4. Haga clic en "Crear Cuenta"

[Formulario de Registro](images/spanish/screenshot_02.png)

### 1.2 Inicio de Sesion

Si ya tiene una cuenta:

1. Haga clic en el icono de usuario
2. Ingrese su correo electronico y contraseña
3. Haga clic en "Iniciar Sesion"

[Formulario de Inicio de Sesion](images/spanish/screenshot_03.png)

### 1.3 Recuperacion de Contraseña

Si olvido su contraseña:

1. En la pantalla de inicio de sesion, haga clic en "Olvidaste tu contraseña"
2. Ingrese el correo electronico asociado a su cuenta
3. Revise su bandeja de entrada y siga el enlace enviado
4. Ingrese su nueva contraseña

[Formulario de Olvido su Contraseña](images/spanish/screenshot_04.png)

[Correo para cambiar Contraseña](images/spanish/screenshot_05.png)

[Formulario de Nueva Contraseña](images/spanish/screenshot_06.png)

---

## 2. Navegacion Principal

La barra de navegacion superior le permite acceder rapidamente a las secciones principales:

| Elemento | Funcion |
|----------|---------|
| Logo ZiBooka | Regresar a la pagina de inicio |
| Inicio | Pagina principal con destacados |
| Tienda | Catalogo completo de libros |
| Blog | Articulos y novedades |
| Contacto | Informacion de contacto |
| Icono de carrito | Acceder al carrito de compras |
| Icono de usuario | Acceder a su cuenta |

[Barra de Navegacion Principal](images/spanish/screenshot_08.png)

---

## 3. Exploracion del Catalogo

### 3.1 Pagina de Inicio

La pagina de inicio muestra:

- **Libros Destacados**: Seleccion de libros recomendados
- **Nuevos Lanzamientos**: Ultimas adiciones al catalogo
- **Libros Populares**: Los mas solicitados por otros usuarios
- **Categorias**: Acceso rapido a generos especificos

[Pagina de inicio con secciones](images/spanish/screenshot_07.png)

### 3.2 Tienda

En la seccion Tienda puede:

- Ver todos los libros disponibles
- Filtrar por categoria usando el menu lateral
- Ordenar por precio o titulo
- Buscar libros especificos

[Pagina de tienda con filtros](images/spanish/screenshot_09.png)

### 3.3 Busqueda de Libros

Para buscar un libro:

1. Utilice la barra de busqueda en la parte superior
2. Escriba el titulo, autor o palabra clave
3. Los resultados se mostraran automaticamente

[Resultados de busqueda](images/spanish/screenshot_10.png)

### 3.4 Detalle del Libro

Al hacer clic en un libro, vera:

- Imagenes del libro
- Titulo y autor
- Precio original y precio de oferta
- Descripcion detallada
- Caracteristicas (paginas, idioma, editorial)
- Disponibilidad en stock
- Opciones para agregar al carrito, solicitar prestamo o reservar

[Pagina de detalle de producto](images/spanish/screenshot_11.png)

---

## 4. Carrito de Compras

### 4.1 Agregar Productos

Para agregar un libro al carrito:

1. Navegue al libro deseado
2. Haga clic en el boton "Agregar al Carrito"
3. Un mensaje confirmara que el producto fue agregado

### 4.2 Ver el Carrito

Para revisar su carrito:

1. Haga clic en el icono del carrito en la barra de navegacion
2. Vera la lista de productos agregados con:
   - Imagen y nombre del libro
   - Precio unitario
   - Cantidad
   - Subtotal por producto

[Vista del carrito de compras](images/spanish/screenshot_12.png)

### 4.3 Modificar Cantidades

- Use los botones + y - para ajustar la cantidad
- Para eliminar un producto, reduzca la cantidad a cero o haga clic en eliminar

### 4.4 Resumen del Pedido

En el lado derecho vera:

- Subtotal de productos
- Costo de envio
- Total a pagar

---

## 5. Proceso de Compra

### 5.1 Iniciar Checkout

1. Desde el carrito, haga clic en "Proceder al Pago"
2. Si no ha iniciado sesion, se le solicitara hacerlo

### 5.2 Direccion de Envio

Complete el formulario de direccion:

- Nombre y apellido
- Correo electronico
- Calle y numero
- Ciudad
- Estado/Departamento
- Codigo postal
- Pais
- Telefono

[Formulario de direccion](images/spanish/screenshot_13.png)

### 5.3 Metodo de Pago

Seleccione su metodo de pago preferido:

**Pago Contra Entrega (COD)**
- Pague en efectivo cuando reciba su pedido
- Haga clic en "Pagar Contra Entrega"

**Pago con Tarjeta (Stripe)**
- Pague de forma segura con tarjeta de credito o debito
- Haga clic en "Pagar con Stripe"
- Sera redirigido a una pagina segura de pago
- Ingrese los datos de su tarjeta
- Confirme el pago

[Seleccion de metodo de pago](images/spanish/screenshot_14.png)

### 5.4 Confirmacion

Una vez completado el pago:

- Recibira un mensaje de confirmacion
- El pedido aparecera en su historial
- Recibira un correo electronico con los detalles

---

## 6. Prestamos de Libros

El sistema de prestamos le permite tomar libros prestados por un periodo de 14 dias.

### 6.1 Solicitar un Prestamo

1. Navegue al libro que desea tomar prestado
2. Verifique que el libro este disponible
3. Haga clic en "Solicitar Prestamo"
4. Confirme la solicitud

[Boton de solicitar prestamo](images/spanish/screenshot_15.png)

### 6.2 Ver Mis Prestamos

Para ver sus prestamos activos:

1. Haga clic en el icono de usuario
2. Seleccione "Mis Prestamos"
3. Vera la lista de libros prestados con:
   - Titulo del libro
   - Fecha del prestamo
   - Fecha de vencimiento
   - Estado (Activo, Completado, Vencido)
   - Dias restantes

[Lista de prestamos](images/spanish/screenshot_16.png)

### 6.3 Devolver un Libro

Para devolver un libro:

1. Acceda a "Mis Prestamos"
2. Localice el libro a devolver
3. Haga clic en "Devolver Libro"
4. Confirme la devolucion

El sistema actualizara automaticamente la disponibilidad del libro.

### 6.4 Informacion Importante

- Los prestamos tienen una duracion maxima de 14 dias
- Los libros vencidos pueden generar cargos por mora
- Sus prestamos mas recientes aparecen primero en la lista
- Devuelva los libros a tiempo para mantener su historial limpio

---

## 7. Reservaciones

Si un libro no esta disponible, puede reservarlo para ser notificado cuando este disponible.

### 7.1 Reservar un Libro

1. Navegue al libro agotado
2. Haga clic en "Reservar"
3. Se agregara a la lista de espera

[Boton de reservar libro agotado](images/spanish/screenshot_17.png)

### 7.2 Ver Mis Reservaciones

Para ver sus reservaciones:

1. Haga clic en el icono de usuario
2. Seleccione "Mis Reservaciones"
3. Vera la lista de reservaciones con:
   - Titulo del libro
   - Fecha de solicitud
   - Posicion en la lista de espera
   - Estado de la reservacion
   - Fecha de expiracion

[Lista de reservaciones](images/spanish/screenshot_18.png)

### 7.3 Cancelar una Reservacion

Si ya no desea esperar por un libro:

1. Acceda a "Mis Reservaciones"
2. Localice la reservacion
3. Haga clic en "Cancelar Reservacion"
4. Confirme la cancelacion

### 7.4 Como Funciona la Lista de Espera

- Las reservaciones se procesan por orden de llegada
- El primero en reservar sera el primero en recibir el libro
- Su numero de prioridad indica su posicion (1 significa que es el siguiente)
- Las reservaciones expiran automaticamente despues de 30 dias
- Cuando el libro este disponible, sera asignado automaticamente

---

## 8. Gestion del Perfil

### 8.1 Acceder al Perfil

1. Haga clic en el icono de usuario
2. Seleccione "Perfil"

### 8.2 Actualizar Informacion Personal

Puede modificar:

- Nombre
- Correo electronico
- Numero de telefono
- Imagen de perfil

[Pagina de perfil](images/spanish/screenshot_19.png)

### 8.3 Cambiar Contraseña

Para cambiar su contraseña:

1. Ingrese su contraseña actual
2. Ingrese la nueva contraseña
3. Confirme la nueva contraseña
4. Haga clic en "Guardar Cambios"

### 8.4 Cambiar Imagen de Perfil

1. Haga clic en el area de la imagen
2. Seleccione una imagen de su dispositivo
3. La imagen se actualizara automaticamente

---

## 9. Seguimiento de Pedidos

### 9.1 Ver Historial de Pedidos

1. Haga clic en el icono de usuario
2. Seleccione "Mis Pedidos"

### 9.2 Informacion del Pedido

Cada pedido muestra:

- Numero de orden
- Lista de libros comprados
- Cantidad de cada libro
- Monto total
- Estado del pedido
- Direccion de envio

[Historial de pedidos](images/spanish/screenshot_20.png)

### 9.3 Estados del Pedido

| Estado | Significado |
|--------|-------------|
| Procesando | El pedido esta siendo preparado |
| Enviado | El pedido esta en camino |
| En Transito | El pedido esta siendo transportado |
| Entregado | El pedido fue recibido |

---

## 10. Cambio de Idioma

ZiBooka esta disponible en Ingles y Español.

### 10.1 Cambiar el Idioma

1. Localice el selector de idioma en la barra de navegacion
2. Haga clic en el idioma deseado (EN/ES)
3. La pagina se actualizara automaticamente

[Selector de idioma](images/spanish/screenshot_21.png)

---

## 11. Preguntas Frecuentes

### Cuenta y Acceso

**P: Olvide mi contraseña, que hago?**
R: Haga clic en "Olvidaste tu contraseña" en la pantalla de inicio de sesion. Recibira un correo con instrucciones para restablecerla.

**P: Puedo cambiar mi correo electronico?**
R: Si, acceda a su perfil y actualice su correo electronico.

### Compras

**P: Cuales son los metodos de pago aceptados?**
R: Aceptamos pago contra entrega (efectivo) y tarjetas de credito/debito a traves de Stripe.

**P: Puedo cancelar un pedido?**
R: Contacte al servicio de atencion al cliente lo antes posible para solicitar la cancelacion.

**P: Cual es el costo de envio?**
R: El costo de envio se calcula segun su ubicacion. Pedidos mayores a $500 tienen envio gratis.

### Prestamos

**P: Cuanto tiempo puedo tener un libro prestado?**
R: El periodo de prestamo es de 14 dias a partir de la fecha de solicitud.

**P: Que pasa si no devuelvo un libro a tiempo?**
R: Los libros vencidos pueden generar cargos por mora. Le recomendamos devolverlos a tiempo.

**P: Cuantos libros puedo tener prestados a la vez?**
R: No hay limite en la cantidad de libros que puede tomar prestados, siempre que esten disponibles.

### Reservaciones

**P: Como se que mi reservacion esta activa?**
R: Puede verificar el estado en "Mis Reservaciones". Las reservaciones activas muestran su posicion en la lista de espera.

**P: Cuanto tiempo es valida una reservacion?**
R: Las reservaciones expiran automaticamente despues de 30 dias si el libro no esta disponible.

**P: Me notificaran cuando el libro este disponible?**
R: Si, el sistema asigna automaticamente el libro cuando esta disponible y actualiza su reservacion.

---

## Soporte Tecnico

Si tiene problemas tecnicos o preguntas adicionales:

- **Pagina de Contacto**: Acceda a la seccion "Contacto" en el menu principal
- **Correo Electronico**: Envie un mensaje a traves del formulario de contacto

---

## Consejos de Uso

1. **Mantenga su sesion activa**: Su carrito se guardara automaticamente mientras este logueado
2. **Revise las ofertas**: Los precios de oferta se muestran en rojo junto al precio original
3. **Explore las categorias**: Use los filtros para encontrar libros de su interes rapidamente
4. **Active las notificaciones**: Mantenga su correo actualizado para recibir avisos importantes

---

Gracias por utilizar ZiBooka. Esperamos que disfrute su experiencia de lectura.
