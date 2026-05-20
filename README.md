# GastosAhorro 💸🌱

GastosAhorro es una aplicación web responsiva diseñada para que parejas registren y controlen sus **gastos hormiga** cotidianos (cafés, antojos, transportes, comida rápida). Cuenta con un diseño premium y minimalista inspirado en iOS (colores neutros y limpios, esquinas redondeadas, transiciones suaves y controles táctiles) y está optimizada para ser agregada a la pantalla de inicio de tu teléfono móvil.

El sistema se conecta a **Supabase** para almacenar los datos y a **Brevo** para notificar automáticamente por correo electrónico a ambos miembros de la pareja en cuanto se registra un nuevo gasto.

---

## 🚀 Características principales

1. **Diseño iOS Responsivo**: Diseñado específicamente para parecer una app nativa en dispositivos móviles. Cuenta con controles segmentados, menús descolgables y un modal deslizante (*bottom sheet*) para registrar gastos.
2. **Login por Perfil**: Cuentas personalizadas para la pareja. Un selector rápido te permite iniciar sesión simplemente eligiendo tu nombre y escribiendo tu contraseña.
3. **Notificación en Tiempo Real**: Envío automático de correos con formato HTML iOS premium a ambos correos utilizando **Brevo** cada vez que se agregue un gasto.
4. **Dashboard de Resumen**:
   - Barra de progreso mensual frente a un presupuesto límite.
   - División de gastos comparativos ("¿Quién gasta qué?").
   - Desglose detallado por categoría con emojis.
5. **Historial Interactivo**: Buscador integrado, filtros rápidos por miembro de la pareja, filtros horizontales por categoría y opción para eliminar gastos.

---

## 🛠️ Configuración e Instalación

### 1. Inicialización en Supabase
1. Crea un proyecto nuevo en [Supabase](https://supabase.com/).
2. En el menú lateral de Supabase, ve al **SQL Editor**.
3. Haz clic en **New query**, pega el contenido del archivo [`schema.sql`](./schema.sql) y haz clic en **Run**.
   *Esto creará las tablas `users` y `expenses`, creará los índices y registrará sus dos usuarios con una contraseña temporal.*

### 2. Configuración de Variables de Entorno
Abre el archivo [`backend/.env`](./backend/.env) (que ya ha sido preconfigurado con tus datos de Brevo) y añade tus credenciales de Supabase:
- `SUPABASE_URL`: Tu URL del proyecto Supabase (la encuentras en Project Settings > API).
- `SUPABASE_KEY`: Tu clave `anon` o `service_role` de Supabase.

*Nota: La API Key de Brevo, el correo remitente y los correos de envío ya están cargados según tus requerimientos.*

### 3. Instalación de Dependencias
En la carpeta raíz del proyecto (`GastosAhorro/`), ejecuta en tu terminal:
```bash
npm run install:all
```
*Este comando automatizado instalará de manera recursiva todas las dependencias en la raíz, en la carpeta `backend/` y en `frontend/`.*

### 4. Ejecución en Desarrollo
Para iniciar la aplicación localmente en modo desarrollo, corre:
```bash
npm run dev
```
*Esto levantará el backend (Express) en el puerto `5000` y el frontend (Vite) en el puerto `3000` de forma paralela.*
Abre en tu navegador: **`http://localhost:3000`**

---

## 🔑 Credenciales por Defecto

Al ejecutar el script `schema.sql`, se crearán las siguientes cuentas por defecto:

* **Christopher Lara**
  * Correo: `chris20022105@gmail.com`
  * Contraseña Temporal: `Gastos2026!`
* **Solansh Muñoz**
  * Correo: `solanhsjudethmu@gmail.com`
  * Contraseña Temporal: `Gastos2026!`

### 🔒 Cómo Cambiar tus Contraseñas
Para cambiar la contraseña por defecto de cualquiera de los usuarios por una contraseña segura y personalizada:
1. En tu terminal, ingresa a la carpeta `backend/` y ejecuta el script utilitario:
   ```bash
   node hash-helper.js
   ```
2. Sigue las instrucciones en pantalla: introduce el correo del usuario y la nueva contraseña.
3. El script generará un bloque de código SQL. Cópialo y ejecútalo en el **SQL Editor** de Supabase. ¡Listo!

---

## ☁️ Despliegue en Render (Backend y Frontend integrados)

La aplicación está diseñada para ser desplegada en un **único servicio web de Render** (ahorrando recursos de tu cuenta gratuita y unificando el dominio). El backend de Express servirá de manera estática el frontend compilado en producción.

### Pasos para desplegar en Render:
1. Sube este repositorio a tu cuenta de GitHub.
2. Crea un nuevo **Web Service** en Render y conéctalo a tu repositorio de GitHub.
3. Configura los siguientes parámetros en Render:
    - **Environment**: `Node`
    - **Build Command**: `npm install && npm run build --prefix frontend && npm install --prefix backend`
    - **Start Command**: `npm start`
4. En la sección **Environment Variables**, añade todas las variables requeridas (puedes copiarlas del archivo `backend/.env`):
   - `PORT`: `5000`
   - `NODE_ENV`: `production` (Crucial para que Express sirva el frontend compilado)
   - `SUPABASE_URL`: *(Tu URL de Supabase)*
   - `SUPABASE_KEY`: *(Tu clave de Supabase)*
   - `JWT_SECRET`: *(Un string aleatorio y seguro para firmar sesiones)*
   - `BREVO_API_KEY`: `xkeysib-a9c774...`
   - `EMAIL_FROM`: `chris20022105@gmail.com`
   - `EMAIL_FROM_NAME`: `GastosAhorro`
   - `PARTNER_EMAIL_1`: `chris20022105@gmail.com`
   - `PARTNER_NAME_1`: `Christopher Lara`
   - `PARTNER_EMAIL_2`: `solanhsjudethmu@gmail.com`
   - `PARTNER_NAME_2`: `Solansh Muñoz`

¡Y listo! Render compilará tu cliente React, lo depositará dentro del servidor Express y levantará la API lista para usarse de forma pública.
