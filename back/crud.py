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
