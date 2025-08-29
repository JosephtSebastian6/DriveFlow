import os
from pathlib import Path
# ELIMINA ESTA LÍNEA: from pydantic_settings import BaseSettings
from dotenv import load_dotenv
from fastapi_mail import ConnectionConfig # <-- IMPORTA ConnectionConfig DESDE fastapi_mail

load_dotenv()

# Obtiene la ruta absoluta al directorio donde reside config.py
# Y luego sube dos niveles para llegar a la carpeta 'Drive' (la raíz de tu proyecto)
BASE_DIR = Path(__file__).resolve().parent.parent

# ELIMINA COMPLETAMENTE LA CLASE ConnectionConfig QUE DEFINÍAS
# class ConnectionConfig(BaseSettings):
#     MAIL_USERNAME: str
# ... (todas las propiedades y la clase Config interna de tu definición) ...


# Configuración de FastMail para el envío de correos
# Ahora, 'conf' será una instancia de la ConnectionConfig de fastapi_mail
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME"),
    MAIL_STARTTLS=bool(os.getenv("MAIL_STARTTLS", 'True').lower() == 'true'),
    MAIL_SSL_TLS=bool(os.getenv("MAIL_SSL_TLS", 'False').lower() == 'true'),
    USE_CREDENTIALS=bool(os.getenv("USE_CREDENTIALS", 'True').lower() == 'true'),
    VALIDATE_CERTS=bool(os.getenv("VALIDATE_CERTS", 'True').lower() == 'true'),
    TEMPLATE_FOLDER=BASE_DIR / "templates" # Asegúrate de que esta ruta sea correcta
)