

# Imports
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from Clever_MySQL_conn import Base
from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base

Base = declarative_base()


# Vehiculo model
class Vehiculo(Base):
    __tablename__ = "vehiculo"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), ForeignKey("registro.username"), nullable=False)
    marca = Column(String(50), nullable=True)
    modelo = Column(String(50), nullable=True)
    ano = Column(String(10), nullable=True)
    placa = Column(String(20), nullable=True)
    fecha_soat = Column(String(20), nullable=True)
    fecha_tecno = Column(String(20), nullable=True)
    color = Column(String(30), nullable=True)
    vehiculo_image_url = Column(String(300), nullable=True)
    gps_activo = Column(Boolean, default=False)

class Registro(Base):
    __tablename__ = "registro"

    identificador = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(100), nullable=False)
    numero_identificacion = Column(String(50), nullable=True)
    ciudad = Column(String(100), nullable=True)
    rh = Column(String(10), nullable=True)
    grupo_sanguineo = Column(String(10), nullable=True)
    nombres = Column(String(100), nullable = False)
    apellidos = Column(String(100), nullable=False)
    ano_nacimiento = Column(Integer, nullable=True)
    direccion = Column(String(150), nullable=True)
    telefono = Column(String(50), nullable=True)
    email= Column(String(150), nullable=True)

    email_verified = Column(Boolean, default=False)
    verification_token = Column(String(255), nullable=True)
    tipo_usuario = Column(String(20), nullable=False)  # cliente, funcionario, empresa
    token_expires_at = Column(DateTime, nullable=True)
    profile_image_url = Column(String(300), nullable=True)

class Funcionario(Base):
    __tablename__ = "funcionario"
    identificador = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    hashed_password = Column(String(100), nullable=False)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False)
    email_verified = Column(Boolean, nullable=False)
    verification_token = Column(String(255))
    token_expires_at = Column(DateTime)
    numero_identificacion = Column(String(50))
    ciudad = Column(String(100))
    rh = Column(String(10))
    grupo_sanguineo = Column(String(10))
    ano_nacimiento = Column(Integer)
    direccion = Column(String(150))
    telefono = Column(String(50))
    profile_image_url = Column(String(300))

# Modelo para vehiculo_funcionario
class VehiculoFuncionario(Base):
    __tablename__ = "vehiculo_funcionario"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), ForeignKey("funcionario.username"), nullable=False)
    marca = Column(String(50))
    modelo = Column(String(50))
    ano = Column(String(10))
    placa = Column(String(20))
    fecha_soat = Column(String(20))
    fecha_tecno = Column(String(20))
    color = Column(String(30))
    vehiculo_image_url = Column(String(300))

