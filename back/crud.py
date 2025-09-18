# Función para crear o actualizar vehículo
def upsert_vehiculo(db, vehiculo):
    obj = db.query(models.Vehiculo).filter(models.Vehiculo.username == vehiculo["username"]).first()
    if obj:
        obj.marca = vehiculo.get("marca", "")
        obj.modelo = vehiculo.get("modelo", "")
        obj.ano = vehiculo.get("ano", "")
        obj.placa = vehiculo.get("placa", "")
        obj.fecha_soat = vehiculo.get("fecha_soat", "")
        obj.fecha_tecno = vehiculo.get("fecha_tecno", "")
        obj.color = vehiculo.get("color", "")
        obj.vehiculo_image_url = vehiculo.get("vehiculo_image_url", "")
    else:
        obj = models.Vehiculo(
            username=vehiculo["username"],
            marca=vehiculo.get("marca", ""),
            modelo=vehiculo.get("modelo", ""),
            ano=vehiculo.get("ano", ""),
            placa=vehiculo.get("placa", ""),
            fecha_soat=vehiculo.get("fecha_soat", ""),
            fecha_tecno=vehiculo.get("fecha_tecno", ""),
            color=vehiculo.get("color", ""),
            vehiculo_image_url=vehiculo.get("vehiculo_image_url", "")
        )
        db.add(obj)
    db.commit()
    db.refresh(obj)
    # Promoción a PIME si aplica (para flujo legacy de un solo vehículo)
    _promote_cliente_to_pime_if_applicable(db, vehiculo["username"])
    return obj

def update_perfil_cliente(db, perfil):
    user = db.query(models.Registro).filter(models.Registro.username == perfil["username"]).first()
    if not user:
        return None
    user.nombres = perfil.get("nombres")
    user.apellidos = perfil.get("apellidos")
    user.email = perfil.get("email")
    user.numero_identificacion = perfil.get("numero_identificacion")
    user.ciudad = perfil.get("ciudad")
    user.rh = perfil.get("rh")
    user.grupo_sanguineo = perfil.get("grupo_sanguineo")
    user.ano_nacimiento = perfil.get("ano_nacimiento")
    user.direccion = perfil.get("direccion")
    user.telefono = perfil.get("telefono")
    if "profile_image_url" in perfil:
        user.profile_image_url = perfil.get("profile_image_url")
    # Campos PIME opcionales
    if "rut" in perfil:
        user.rut = perfil.get("rut")
    if "camara_comercio" in perfil:
        user.camara_comercio = perfil.get("camara_comercio")
    db.commit()
    db.refresh(user)
    return user

from sqlalchemy.orm import Session
from jinja2 import Environment, FileSystemLoader, select_autoescape # Asegúrate de que estas importaciones estén aquí
# from fastapi_mail import MessageSchema, FastMail, MessageType # <-- COMENTA O ELIMINA ESTA LÍNEA
from passlib.context import CryptContext
from fastapi import BackgroundTasks, Request, HTTPException
from pydantic import EmailStr
import uuid
from datetime import datetime, timedelta
from urllib.parse import urljoin # <-- AÑADE ESTA LÍNEA


# --- NUEVAS IMPORTACIONES PARA EL ENVÍO DIRECTO ---
from aiosmtplib import SMTP
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
# --------------------------------------------------

import models, schemas
from config import conf

bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ----------------- NUEVAS FUNCIONES VEHÍCULOS (multi-vehículo) -----------------
def get_vehiculos_by_username(db: Session, username: str):
    return db.query(models.Vehiculo).filter(models.Vehiculo.username == username).all()

def create_vehiculo(db: Session, username: str, data: dict):
    vehiculo = models.Vehiculo(
        username=username,
        marca=data.get('marca', ''),
        modelo=data.get('modelo', ''),
        ano=data.get('ano', ''),
        placa=data.get('placa', ''),
        fecha_soat=data.get('fecha_soat', ''),
        fecha_tecno=data.get('fecha_tecno', ''),
        color=data.get('color', ''),
        vehiculo_image_url=data.get('vehiculo_image_url', ''),
        gps_activo=data.get('gps_activo', False),
    )
    db.add(vehiculo)
    db.commit()
    db.refresh(vehiculo)
    _promote_cliente_to_pime_if_applicable(db, username)
    return vehiculo

def update_vehiculo_by_id(db: Session, vehiculo_id: int, data: dict):
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        return None
    for key in ['marca','modelo','ano','placa','fecha_soat','fecha_tecno','color','vehiculo_image_url','gps_activo']:
        if key in data:
            setattr(vehiculo, key, data[key])
    db.commit()
    db.refresh(vehiculo)
    # Promoción a PIME si aplica
    _promote_cliente_to_pime_if_applicable(db, vehiculo.username)
    return vehiculo

def delete_vehiculo_by_id(db: Session, vehiculo_id: int):
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.id == vehiculo_id).first()
    if not vehiculo:
        return False
    db.delete(vehiculo)
    db.commit()
    return True

# --- Helper interno: promoción a PIME ---
def _promote_cliente_to_pime_if_applicable(db: Session, username: str):
    try:
        count = db.query(models.Vehiculo).filter(models.Vehiculo.username == username).count()
        user = db.query(models.Registro).filter(models.Registro.username == username).first()
        if user and (user.tipo_usuario or '').lower() == 'cliente':
            if 4 <= count <= 9:
                user.tipo_usuario = 'pime'
                db.commit()
                db.refresh(user)
    except Exception:
        db.rollback()
        # No propagamos el error para no romper el flujo del guardado de vehículo
        pass

# Función para registrar un nuevo usuario (sin cambios aquí)
async def registro_user(db: Session, user: schemas.RegistroCreate, background_tasks: BackgroundTasks, request: Request):
    print(f"DEBUG CRUD: Iniciando registro para usuario: {user.username}, email: {user.email}") # <-- Nuevo log
    print(f"DEBUG CRUD: Datos completos recibidos: {user.dict()}") # <-- Nuevo log

    # Verificar si el email ya existe (esto ya lo tienes en auth_routes, pero un doble chequeo no hace daño)
    existing_user_email = db.query(models.Registro).filter(models.Registro.email == user.email).first()
    if existing_user_email:
        print(f"DEBUG CRUD: ERROR - Email {user.email} ya registrado.") # <-- Nuevo log
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")

    # Verificar si el username ya existe
    existing_user_username = db.query(models.Registro).filter(models.Registro.username == user.username).first()
    if existing_user_username:
        print(f"DEBUG CRUD: ERROR - Nombre de usuario {user.username} ya registrado.") # <-- Nuevo log
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado.")

    verification_token = str(uuid.uuid4())
    token_expires_at = datetime.utcnow() + timedelta(hours=24)

    hashed_pw = bcrypt_context.hash(user.password)
    nuevo_registro = models.Registro(
        username=user.username,
        hashed_password=hashed_pw,
        nombres=user.nombres,
        apellidos=user.apellidos,
        email=user.email,
        email_verified=False,
        verification_token=verification_token,
        tipo_usuario=user.tipo_usuario or 'cliente',  # <-- Asigna el tipo de usuario recibido
        token_expires_at=token_expires_at
    )

    try:
        db.add(nuevo_registro)
        print("DEBUG CRUD: Objeto de usuario añadido a la sesión de DB.") # <-- Nuevo log
        db.commit()
        print("DEBUG CRUD: Commit a la base de datos realizado.") # <-- Nuevo log
        db.refresh(nuevo_registro)
        print(f"DEBUG CRUD: Usuario refrescado desde DB: {nuevo_registro.username}, ID: {nuevo_registro.identificador}") # <-- Nuevo log
    except Exception as e:
        db.rollback() # Revertir la transacción si hay un error
        print(f"DEBUG CRUD: ERROR FATAL en la base de datos durante el commit: {e}") # <-- Nuevo log
        raise HTTPException(status_code=500, detail=f"Error interno del servidor al guardar usuario: {e}")

    base_url_str = str(request.base_url) 
    #verification_url = f"{request.base_url}auth/verify-email?token={verification_token}"
    path_to_verify = f"auth/verify-email?token={verification_token}" # SIN la barra inicial aquí
    verification_url = urljoin(base_url_str, path_to_verify) # <-- CAMBIO CLAVE AQUÍ
    print(f"DEBUG CRUD: URL de verificación generada: {verification_url}") # <-- Añade este log para verificar

    await send_verification_email(
        recipient_email=nuevo_registro.email,
        username=nuevo_registro.username,
        verification_url=verification_url,
        background_tasks=background_tasks,
        request=request
    )
    print("DEBUG CRUD: Correo de verificación programado para envío.") # <-- Nuevo log

    return nuevo_registro

# Función para autenticar un usuario (sin cambios aquí)
def autenticar_usuario(db: Session, username: str, password: str):
    user = db.query(models.Registro).filter(models.Registro.username == username).first()
    if user and bcrypt_context.verify(password, user.hashed_password):
        return user
    return None

# --- FUNCIÓN send_verification_email MODIFICADA ---
# Reemplaza completamente tu actual send_verification_email con esto:
async def send_verification_email(recipient_email: EmailStr, username: str, verification_url: str, background_tasks: BackgroundTasks, request: Request):
    print(f"DEBUG EMAIL: Preparando el envío de correo a {recipient_email}") # <-- Nuevo log

    template_env = Environment(
        loader=FileSystemLoader(conf.TEMPLATE_FOLDER),
        autoescape=select_autoescape(["html", "xml"])
    )

    try:
        template = template_env.get_template("verification.html")
        print("DEBUG EMAIL: Plantilla 'verification.html' cargada exitosamente.") # <-- Nuevo log
    except Exception as e:
        print(f"ERROR EMAIL: No se pudo cargar la plantilla 'verification.html'. Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error al cargar la plantilla de correo: {e}")

    rendered_html = template.render(
        username=username,
        verification_url=verification_url,
        request=request
    )
    print("DEBUG EMAIL: Plantilla HTML renderizada.") # <-- Nuevo log

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{conf.MAIL_FROM_NAME} <{conf.MAIL_FROM}>"
    msg["To"] = recipient_email
    msg["Subject"] = "Verifica tu Correo Electrónico"

    html_part = MIMEText(rendered_html, "html", "utf-8")
    msg.attach(html_part)
    print("DEBUG EMAIL: Mensaje MIME construido.") # <-- Nuevo log

    # --- Función interna para enviar el mensaje en segundo plano ---
    async def _send_email_task():
        print(f"DEBUG EMAIL TASK: Iniciando tarea de envío de correo para {recipient_email}") # <-- Nuevo log
        try:
            client = SMTP(
                hostname=conf.MAIL_SERVER,
                port=conf.MAIL_PORT,
                start_tls=conf.MAIL_STARTTLS,
                tls_context=None # Ya lo tienes
            )
            print("DEBUG EMAIL TASK: Cliente SMTP creado.") # <-- Nuevo log
            await client.connect()
            print("DEBUG EMAIL TASK: Conexión SMTP establecida.") # <-- Nuevo log
            await client.login(conf.MAIL_USERNAME, conf.MAIL_PASSWORD.get_secret_value())
            print("DEBUG EMAIL TASK: Login SMTP exitoso.") # <-- Nuevo log
            status_code, message_response = await client.send_message(msg)
            await client.quit()
            print("DEBUG EMAIL TASK: Desconexión SMTP realizada.") # <-- Nuevo log

            print(f"DEBUG EMAIL TASK: Correo enviado exitosamente en segundo plano. Estado: {status_code}, Mensaje: {message_response}")

        except Exception as e:
            print(f"ERROR EMAIL TASK: EXCEPCIÓN al enviar correo en segundo plano: {e}") # <-- ¡Crucial!
            # Si esto ocurre, la tarea en segundo plano falla, y la petición principal puede hacer rollback.
            # Aquí puedes añadir re-lanzar la excepción para que FastAPI la capture,
            # o loggearla de manera más robusta. Por ahora, el print nos ayudará.
            # raise # No re-lanzar todavía para no romper el flujo, solo depurar.

    # Añadir la tarea de envío al BackgroundTasks
    background_tasks.add_task(_send_email_task)
    print("DEBUG EMAIL: Tarea de envío de correo añadida a BackgroundTasks.") # <-- Nuevo log


# -------------------- NUEVAS UTILIDADES EMPRESA/PIME --------------------
def _generate_temp_password(length: int = 10) -> str:
    import secrets, string
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


async def send_temp_password_email(recipient_email: EmailStr, username: str, temp_password: str, background_tasks: BackgroundTasks):
    template_html = f"""
    <!DOCTYPE html>
    <html lang=\"es\">
    <head>
      <meta charset=\"UTF-8\" />
      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
      <title>Tu cuenta en DriveFlow</title>
      <style>
        body {{ background:#f6f7fb; margin:0; padding:24px; font-family: Arial, Helvetica, sans-serif; color:#222; }}
        .card {{ max-width:560px; margin:0 auto; background:#fff; border-radius:12px; padding:24px; box-shadow:0 8px 24px rgba(0,0,0,.06); }}
        h1 {{ font-size:20px; margin:0 0 12px; color:#d32f2f; }}
        h2 {{ font-size:16px; margin:0 0 16px; color:#444; font-weight:600; }}
        .row {{ margin:6px 0; }}
        .label {{ color:#555; font-weight:600; display:inline-block; min-width:140px; }}
        .code {{ display:inline-block; background:#111; color:#fff; padding:8px 12px; border-radius:8px; letter-spacing:.5px; font-weight:700; }}
        .note {{ margin-top:16px; background:#fff4e5; border:1px solid #ffd699; color:#7a4a00; padding:10px 12px; border-radius:8px; font-size:13px; }}
        .footer {{ margin-top:20px; font-size:12px; color:#777; }}
      </style>
    </head>
    <body>
      <div class=\"card\">
        <h1>Bienvenido a DriveFlow</h1>
        <h2>Se ha creado una cuenta para ti</h2>
        <div class=\"row\"><span class=\"label\">Usuario:</span> <span>{username}</span></div>
        <div class=\"row\"><span class=\"label\">Contraseña temporal:</span> <span class=\"code\">{temp_password}</span></div>
        <div class=\"note\">
          Debes <strong>verificar tu correo</strong> con el enlace enviado en un email aparte <strong>antes de poder iniciar sesión</strong>.
          Por seguridad, cambia tu contraseña una vez ingreses a la plataforma.
        </div>
        <div class=\"footer\">
          Si tú no solicitaste esta cuenta, puedes ignorar este mensaje.
        </div>
      </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{conf.MAIL_FROM_NAME} <{conf.MAIL_FROM}>"
    msg["To"] = recipient_email
    msg["Subject"] = "Tu cuenta en DriveFlow"
    msg.attach(MIMEText(template_html, "html", "utf-8"))

    async def _task():
        try:
            client = SMTP(hostname=conf.MAIL_SERVER, port=conf.MAIL_PORT, start_tls=conf.MAIL_STARTTLS, tls_context=None)
            await client.connect()
            await client.login(conf.MAIL_USERNAME, conf.MAIL_PASSWORD.get_secret_value())
            await client.send_message(msg)
            await client.quit()
        except Exception as e:
            print(f"ERROR enviar temp password: {e}")

    background_tasks.add_task(_task)


def _create_user_core(db: Session, username: str, email: str, nombres: str, apellidos: str, telefono: str | None, tipo_usuario: str, temp_password: str):
    hashed_pw = bcrypt_context.hash(temp_password)
    user = models.Registro(
        username=username,
        hashed_password=hashed_pw,
        nombres=nombres,
        apellidos=apellidos,
        email=email,
        email_verified=False,
        tipo_usuario=tipo_usuario,
        telefono=telefono or ''
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _create_vehicle_for_user(db: Session, tipo_usuario: str, username: str, veh: dict):
    if (tipo_usuario or '').lower() == 'funcionario':
        v = models.VehiculoFuncionario(
            username=username,
            marca=veh.get('marca',''), modelo=veh.get('modelo',''), ano=veh.get('ano',''),
            placa=veh.get('placa',''), fecha_soat=veh.get('fecha_soat',''), fecha_tecno=veh.get('fecha_tecno',''),
            color=veh.get('color',''), vehiculo_image_url=veh.get('vehiculo_image_url',''),
            gps_activo=veh.get('gps_activo', False) if hasattr(models.VehiculoFuncionario, 'gps_activo') else None
        )
    else:
        v = models.Vehiculo(
            username=username,
            marca=veh.get('marca',''), modelo=veh.get('modelo',''), ano=veh.get('ano',''),
            placa=veh.get('placa',''), fecha_soat=veh.get('fecha_soat',''), fecha_tecno=veh.get('fecha_tecno',''),
            color=veh.get('color',''), vehiculo_image_url=veh.get('vehiculo_image_url',''),
            gps_activo=veh.get('gps_activo', False)
        )
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


def create_user_and_assign_vehicle(db: Session, payload: dict) -> tuple[models.Registro, dict]:
    """Crea un usuario (cliente o funcionario) con contraseña temporal y asigna un vehículo.
    Retorna (user, vehiculo_dict). Levanta HTTPException en conflictos.
    """
    from fastapi import HTTPException
    username = payload['user']['username']
    email = payload['user']['email']
    nombres = payload['user'].get('nombres','')
    apellidos = payload['user'].get('apellidos','')
    telefono = payload['user'].get('telefono')
    tipo_usuario = (payload['user'].get('tipo_usuario') or 'funcionario').lower()
    if tipo_usuario not in {'cliente','funcionario'}:
        raise HTTPException(status_code=400, detail='tipo_usuario inválido, use cliente|funcionario')

    # Conflictos
    if db.query(models.Registro).filter(models.Registro.username == username).first():
        raise HTTPException(status_code=400, detail='username ya existe')
    if db.query(models.Registro).filter(models.Registro.email == email).first():
        raise HTTPException(status_code=400, detail='email ya existe')

    temp_password = _generate_temp_password()
    user = _create_user_core(db, username, email, nombres, apellidos, telefono, tipo_usuario, temp_password)
    vehiculo_creado = _create_vehicle_for_user(db, tipo_usuario, username, payload['vehiculo'])
    return user, {"id": getattr(vehiculo_creado, 'id', None), "placa": getattr(vehiculo_creado, 'placa', None)}
