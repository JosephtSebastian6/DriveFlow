import asyncio
from aiosmtplib import SMTP
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape
import os

# --- Configuración de Correo (AJUSTA ESTO CON TUS DATOS REALES DE .env) ---
# Asegúrate de que estas variables estén en tu archivo .env
# o cárgalas directamente si no usas dotenv en este script de prueba
# Aquí usaré os.getenv para simular la carga desde .env si lo tienes configurado.
# Si no, reemplaza os.getenv("VARIABLE") por el valor directo (ej. "tu_correo@gmail.com")

MAIL_USERNAME = os.getenv("MAIL_USERNAME", "driveflow900@gmail.com") # Reemplaza con tu correo
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "ozxp vcnn towo yrem") # Reemplaza con tu contraseña de aplicación de Gmail
MAIL_FROM = os.getenv("MAIL_FROM", "driveflow900@gmail.com") # Reemplaza con tu correo
MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "Tu Nombre de App")
MAIL_STARTTLS = bool(os.getenv("MAIL_STARTTLS", True))
MAIL_SSL_TLS = bool(os.getenv("MAIL_SSL_TLS", False)) # Generalmente False si usas STARTTLS

# --- Configuración de Jinja2 para la plantilla (AJUSTA LA RUTA) ---
# Si 'templates' está en la misma carpeta que este script, usa Path(__file__).parent / "templates"
# Si 'templates' está en la carpeta 'back' y este script está en la raíz, ajusta la ruta.
# Por ejemplo, si tu estructura es DrivePrueba/back/templates, y este script está en DrivePrueba,
# TEMPLATE_FOLDER sería Path(__file__).parent / "back" / "templates"
# Basado en tu config.py, parece que tu conf.TEMPLATE_FOLDER apunta a `DrivePrueba/back/templates`
BASE_DIR = Path(__file__).resolve().parent # Asume que este script está en la raíz de DrivePrueba
TEMPLATE_FOLDER = BASE_DIR / "templates" # Ajusta esta ruta si es diferente

print(f"DEBUG: Carpeta de plantillas: {TEMPLATE_FOLDER}")
print(f"DEBUG: La carpeta de plantillas existe? {TEMPLATE_FOLDER.is_dir()}")

async def send_test_email():
    recipient_email = "driveflow900@gmail.com" # CAMBIA ESTO AL CORREO DESTINO
    username = "UsuarioDePrueba"
    verification_url = "http://localhost:3000/verify?token=TEST_TOKEN_123"

    # Crear el entorno Jinja2
    template_env = Environment(
        loader=FileSystemLoader(TEMPLATE_FOLDER),
        autoescape=select_autoescape(["html", "xml"])
    )

    # Cargar la plantilla
    try:
        template = template_env.get_template("verification.html")
    except Exception as e:
        print(f"ERROR: No se pudo cargar la plantilla 'verification.html'. Asegúrate de que existe en '{TEMPLATE_FOLDER}'. Error: {e}")
        return

    # Renderizar la plantilla
    rendered_html = template.render(
        username=username,
        verification_url=verification_url
    )
    print(f"DEBUG: Contenido HTML renderizado (primeros 200 caracteres): {rendered_html[:200]}")
    print(f"DEBUG: Longitud del HTML renderizado: {len(rendered_html)}")

    # Construir el mensaje MIME multipart
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{MAIL_FROM_NAME} <{MAIL_FROM}>"
    msg["To"] = recipient_email
    msg["Subject"] = "Verificación de Correo - Prueba Directa"

    # Añadir la parte HTML
    html_part = MIMEText(rendered_html, "html", "utf-8")
    msg.attach(html_part)

    # --- Enviar el correo usando aiosmtplib ---
    try:
        client = SMTP(
            hostname=MAIL_SERVER,
            port=MAIL_PORT,
            start_tls=MAIL_STARTTLS,
            tls_context=None, # Deja esto en None si start_tls es True
        )
        await client.connect()
        await client.login(MAIL_USERNAME, MAIL_PASSWORD)
        status_code, message_response = await client.send_message(msg)
        await client.quit()

        print(f"Correo enviado exitosamente con aiosmtplib directo. Estado: {status_code}, Mensaje: {message_response}")
        print(f"Revisa el correo de {recipient_email} y verifica el 'mensaje original' para ver el HTML.")

    except Exception as e:
        print(f"ERROR al enviar correo con aiosmtplib directo: {e}")

if __name__ == "__main__":
    # Para que os.getenv funcione en un script simple, necesitas cargar .env
    from dotenv import load_dotenv
    load_dotenv() # Asegúrate de que tu .env esté en el directorio correcto o ajusta la ruta aquí

    asyncio.run(send_test_email())