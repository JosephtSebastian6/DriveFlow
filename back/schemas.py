
# Pydantic imports (must be at the top)
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class VehiculoCreate(BaseModel):
    username: str
    marca: str = ""
    modelo: str = ""
    ano: str = ""
    placa: str = ""
    fecha_soat: str = ""
    fecha_tecno: str = ""
    color: str = ""
    vehiculo_image_url: str = ""


class PerfilUpdate(BaseModel):
    username: str
    email: EmailStr
    numero_identificacion: Optional[str] = None
    ciudad: Optional[str] = None
    rh: Optional[str] = None
    grupo_sanguineo: Optional[str] = None
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    ano_nacimiento: Optional[int] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    profile_image_url: Optional[str] = None

class RegistroCreate(BaseModel):
    username:str
    password:str
    nombres:str
    apellidos:str

    email: EmailStr 
    tipo_usuario: str  # cliente, funcionario, empresa

class LoginUsuario(BaseModel):
    username:str
    password:str

class UsuarioResponse(BaseModel):
    identificador: int 
    username: str
    nombres:str
    apellidos:str
    email: EmailStr
    email_verified: bool
    profile_image_url: Optional[str] = None

    class Config:
        from_attributes = True

# Esquema para el perfil de funcionario
class FuncionarioPerfil(BaseModel):
    username: str
    email: str
    numero_identificacion: str | None = None
    ciudad: str | None = None
    rh: str | None = None
    grupo_sanguineo: str | None = None
    nombres: str | None = None
    apellidos: str | None = None
    ano_nacimiento: int | None = None
    direccion: str | None = None
    telefono: str | None = None
    profile_image_url: str | None = None

# Esquema para el vehículo de funcionario
class VehiculoFuncionarioSchema(BaseModel):
    username: str
    marca: str | None = None
    modelo: str | None = None
    ano: str | None = None
    placa: str | None = None
    fecha_soat: str | None = None
    fecha_tecno: str | None = None
    color: str | None = None
    vehiculo_image_url: str | None = None




