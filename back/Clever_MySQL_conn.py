import mysql  # Importa el módulo MySQL y su conector para conexión directa
import mysql.connector  # Importa el módulo MySQL y su conector para conexión directa
from sqlalchemy import create_engine  # Importa herramientas de SQLAlchemy para definir el ORM y la sesión
from sqlalchemy.ext.declarative import declarative_base  # Importa herramientas de SQLAlchemy para definir el ORM y la sesión
from sqlalchemy.orm import sessionmaker  # Importa herramientas de SQLAlchemy para definir el ORM y la sesión
#import os  # (Comentado) Podría usarse para acceder a variables de entorno


#Connect to the database

host = 'localhost'  # Define el host del servidor MySQL
user = 'root'  # Define el usuario de la base de datos
password = ''  # Define la contraseña del usuario (vacía por ahora)
database = 'Drive'  # Nombre de la base de datos a la que se conectará
port = 3306  # Puerto de conexión a MySQL

mysqlConn = mysql.connector.Connect(  # Establece la conexión con la base de datos usando mysql.connector
   host = 'localhost',  # Define el host del servidor MySQL
   user = 'root' ,  # Define el usuario de la base de datos
   #password = '',  # Define la contraseña del usuario (vacía por ahora)
   database = 'Drive',  # Nombre de la base de datos a la que se conectará
   port = 3306  # Puerto de conexión a MySQL
)


# URL de conexión a MySQL (ajusta si usas otro driver)
DATABASE_URL = f"mysql+mysqlconnector://{user}:{password}@{host}/{database}"  # Construye la URL de conexión compatible con SQLAlchemy

# Crear el motor de base de datos
engine = create_engine(DATABASE_URL, echo=True)  # `echo=True` muestra en consola las consultas SQL ejecutadas  # Crea el motor de base de datos para SQLAlchemy

# Crear una sesión para interactuar con la base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)  # Crea una sesión local para interactuar con la BD usando SQLAlchemy

# Base para definir los modelos
Base = declarative_base()  # Define la clase base para los modelos ORM

# Dependencia para obtener la sesión en los endpoints de FastAPI
def get_db():  # Define una dependencia para obtener la sesión de base de datos en FastAPI
    db = SessionLocal()  # Crea una nueva sesión de base de datos
    try:
        yield db  # Generador que devuelve la sesión  # Retorna la sesión para ser usada en los endpoints
    finally:
        db.close()  # Cerrar la sesión cuando termina el request  # Cierra la sesión de base de datos después del uso


#Create a cursor object
cleverCursor = mysqlConn.cursor()  # Crea un cursor para ejecutar sentencias SQL directamente





