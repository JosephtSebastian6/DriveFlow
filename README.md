# 🚀 DriveFlow - Full Stack Application

DriveFlow es una aplicación full-stack desarrollada con **Angular** (frontend) y **FastAPI** (backend) que proporciona un sistema completo de gestión con autenticación y dashboard.

## 📋 Tabla de Contenidos

- [Tecnologías](#-tecnologías)
- [Prerrequisitos](#-prerrequisitos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Ejecución](#-ejecución)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [API Endpoints](#-api-endpoints)
- [Contribución](#-contribución)

## 🛠️ Tecnologías

### Backend
- **FastAPI** - Framework web moderno y rápido para Python
- **SQLAlchemy** - ORM para base de datos
- **MySQL** - Base de datos relacional
- **Alembic** - Migraciones de base de datos
- **Pydantic** - Validación de datos
- **JWT** - Autenticación con tokens
- **bcrypt** - Encriptación de contraseñas
- **Redis** - Cache y sesiones
- **FastAPI Mail** - Envío de emails

### Frontend
- **Angular 20** - Framework de desarrollo web
- **Angular Material** - Componentes UI
- **TypeScript** - Lenguaje de programación
- **RxJS** - Programación reactiva
- **Angular CDK** - Kit de desarrollo de componentes

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- **Python 3.12.0** o superior
- **Node.js 18+** y **npm**
- **MySQL** (local o remoto)
- **Redis** (opcional, para cache)
- **Git**

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/driveflow.git
cd driveflow
```

### 2. Configurar Backend (Python/FastAPI)

#### Crear entorno virtual
```bash
python -m venv .venv

# En macOS/Linux:
source .venv/bin/activate


.venv\Scripts\activate
```

#### Instalar dependencias del backend
```bash
pip install -r requirements.txt
```

#### Dependencias principales del backend:
- `fastapi==0.116.1` - Framework web
- `uvicorn==0.35.0` - Servidor ASGI
- `sqlalchemy==2.0.41` - ORM
- `mysql-connector-python==9.4.0` - Conector MySQL
- `pydantic==2.11.7` - Validación de datos
- `python-jose==3.5.0` - JWT tokens
- `bcrypt==4.3.0` - Encriptación
- `fastapi-mail` - Envío de emails
- `redis==6.2.0` - Cache
- `python-dotenv==1.1.1` - Variables de entorno

### 3. Configurar Frontend (Angular)

#### Navegar a la carpeta del frontend
```bash
cd driveflow-frontend
```

#### Instalar dependencias del frontend
```bash
npm install
```

#### Dependencias principales del frontend:
- `@angular/core@^20.1.0` - Framework Angular
- `@angular/material@^20.1.3` - Componentes Material
- `@angular/router@^20.1.0` - Enrutamiento
- `@angular/forms@^20.1.0` - Formularios reactivos
- `rxjs@~7.8.0` - Programación reactiva
- `typescript@~5.8.2` - Lenguaje TypeScript

## ⚙️ Configuración

### 1. Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Base de datos
DATABASE_URL=mysql://usuario:contraseña@localhost:3306/driveflow_db
DB_HOST=localhost
DB_PORT=3306
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=driveflow_db

# JWT
SECRET_KEY=tu_clave_secreta_muy_segura
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email (opcional)
MAIL_USERNAME=tu_email@gmail.com
MAIL_PASSWORD=tu_contraseña_app
MAIL_FROM=tu_email@gmail.com
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com

# Redis (opcional)
REDIS_URL=redis://localhost:6379
```

### 2. Base de datos

#### Crear base de datos MySQL
```sql
CREATE DATABASE driveflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### Ejecutar migraciones
```bash
cd back
alembic upgrade head
```

## 🚀 Ejecución

### 1. Ejecutar Backend

```bash
# Desde la raíz del proyecto
cd back
uvicorn main:driveFlowApp --reload --host 0.0.0.0 --port 8000
```

El backend estará disponible en: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 2. Ejecutar Frontend

```bash
# En otra terminal, desde la raíz del proyecto
cd driveflow-frontend
ng serve
```

El frontend estará disponible en: `http://localhost:4200`

### 3. Ejecutar ambos simultáneamente

Puedes usar dos terminales o crear scripts para ejecutar ambos servicios:

**Terminal 1 (Backend):**
```bash
cd back && uvicorn main:driveFlowApp --reload --port 8000
```

**Terminal 2 (Frontend):**
```bash
cd driveflow-frontend && ng serve
```

## 📁 Estructura del Proyecto

```
driveflow/
├── back/                          # Backend FastAPI
│   ├── alembic/                   # Migraciones de BD
│   ├── __pycache__/              # Cache Python
│   ├── main.py                   # Aplicación principal
│   ├── auth_routes.py            # Rutas de autenticación
│   ├── models.py                 # Modelos SQLAlchemy
│   ├── schemas.py                # Esquemas Pydantic
│   ├── crud.py                   # Operaciones CRUD
│   ├── config.py                 # Configuración
│   ├── Clever_MySQL_conn.py      # Conexión MySQL
│   └── requirements.txt          # Dependencias Python
├── driveflow-frontend/           # Frontend Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/            # Módulo de autenticación
│   │   │   ├── dashboard/       # Dashboard principal
│   │   │   └── dashboard-cliente/ # Dashboard cliente
│   │   ├── assets/              # Recursos estáticos
│   │   └── custom-theme.scss    # Tema personalizado
│   ├── package.json             # Dependencias Node.js
│   └── angular.json             # Configuración Angular
├── templates/                    # Plantillas HTML
├── .venv/                       # Entorno virtual Python
├── .env                         # Variables de entorno
├── .gitignore                   # Archivos ignorados por Git
├── requirements.txt             # Dependencias globales
└── README.md                    # Este archivo
```

## 🔌 API Endpoints

### Autenticación
- `POST /auth/register` - Registro de usuario
- `POST /auth/login` - Inicio de sesión
- `GET /auth/me` - Perfil del usuario actual

### General
- `GET /` - Endpoint de prueba
- `GET /items/` - Obtener items con query params
- `GET /items/{item_id}` - Obtener item por ID
- `DELETE /items_del/{item_id}` - Eliminar item por ID

## 🧪 Testing

### Backend
```bash
cd back
pytest
```

### Frontend
```bash
cd driveflow-frontend
ng test
```

## 📦 Build para Producción

### Backend
```bash
cd back
pip install -r requirements.txt
uvicorn main:driveFlowApp --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd driveflow-frontend
ng build --configuration production
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Notas Adicionales

- El backend usa **CORS** configurado para permitir peticiones desde `localhost:4200`
- Las contraseñas se encriptan usando **bcrypt**
- Los tokens JWT tienen una expiración configurable
- El proyecto incluye migraciones de base de datos con **Alembic**
- El frontend usa **Angular Material** para la UI

## 🐛 Troubleshooting

### Problemas comunes:

1. **Error de conexión a MySQL**: Verifica que MySQL esté ejecutándose y las credenciales en `.env` sean correctas
2. **Error de CORS**: Asegúrate de que el frontend esté ejecutándose en `localhost:4200`
3. **Error de dependencias**: Ejecuta `pip install -r requirements.txt` y `npm install`
4. **Error de migraciones**: Ejecuta `alembic upgrade head` desde la carpeta `back/`

---

**Desarrollado con ❤️ usando FastAPI y Angular**
