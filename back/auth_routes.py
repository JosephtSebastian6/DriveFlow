# FastAPI and related imports
from Clever_MySQL_conn import get_db
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request, Body
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from jose import jwt
from datetime import timedelta, datetime
import uuid
from pydantic import EmailStr, BaseModel
from pydantic import EmailStr
import crud
import models
import schemas
from Clever_MySQL_conn import get_db


# Local imports


# Optional: Import your email service if needed
# from .services.email_service import send_verification_email

# JWT configuration (ideally from environment variables)
SECRET_KEY = "supersecretkey"  # Change to a secure key, ideally from .env
ALGORITHM = "HS256"
EXPIRATION_MINUTES = 60


authRouter = APIRouter()


# ENDPOINTS PARA OBTENER PERFIL Y VEHICULO POR USERNAME
@authRouter.get("/perfil/{username}")
async def get_perfil(username: str, db: Session = Depends(get_db)):
    user = db.query(models.Registro).filter(models.Registro.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {
        "username": user.username,
        "email": user.email,
        "numero_identificacion": user.numero_identificacion,
        "ciudad": user.ciudad,
        "rh": user.rh,
        "grupo_sanguineo": user.grupo_sanguineo,
        "nombres": user.nombres,
        "apellidos": user.apellidos,
        "ano_nacimiento": user.ano_nacimiento,
        "direccion": user.direccion,
        "telefono": user.telefono,
        "profile_image_url": user.profile_image_url
    }

@authRouter.get("/vehiculo/{username}")
async def get_vehiculo(username: str, db: Session = Depends(get_db)):
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.username == username).first()
    if not vehiculo:
        # Devuelve un objeto vacío si no existe el vehículo
        return {
            "marca": "",
            "modelo": "",
            "ano": "",
            "placa": "",
            "fecha_soat": "",
            "fecha_tecno": "",
            "color": "",
            "vehiculo_image_url": ""
        }
    return {
        "marca": vehiculo.marca,
        "modelo": vehiculo.modelo,
        "ano": vehiculo.ano,
        "placa": vehiculo.placa,
        "fecha_soat": vehiculo.fecha_soat,
        "fecha_tecno": vehiculo.fecha_tecno,
        "color": vehiculo.color,
        "vehiculo_image_url": vehiculo.vehiculo_image_url
    }



@authRouter.put("/vehiculo")
async def upsert_vehiculo(vehiculo: dict = Body(...), db: Session = Depends(get_db)):
    result = crud.upsert_vehiculo(db, vehiculo)
    return result

# Endpoint para actualizar el perfil del cliente
from fastapi import Body
@authRouter.put("/update-perfil")
async def update_perfil(perfil: dict = Body(...), db: Session = Depends(get_db)):
    updated_user = crud.update_perfil_cliente(db, perfil)
    if not updated_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return updated_user


@authRouter.post("/register", response_model=schemas.UsuarioResponse)  # Importa los esquemas Pydantic definidos para validación de datos
async def register(
    user: schemas.RegistroCreate, # No tiene default, va primero
    background_tasks: BackgroundTasks, # No tiene default, va después de user
    request: Request, # No tiene default, va después de background_tasks
    db: Session = Depends(get_db), # Este tiene default, va al final
    
):
    # Aquí puedes añadir una verificación si el email ya existe
    existing_user = db.query(models.Registro).filter(models.Registro.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")

    # Llama a la función CRUD para registrar al usuario, pasando las dependencias necesarias
    new_user = await crud.registro_user(db, user, background_tasks, request)
    return new_user


@authRouter.post("/login")  # Ruta para iniciar sesión y generar token JWT
def login(user: schemas.LoginUsuario, db: Session = Depends(get_db)):  # Importa los esquemas Pydantic definidos para validación de datos
    usuario = crud.autenticar_usuario(db, user.username, user.password)
    print(f"DEBUG LOGIN: usuario={usuario}")
    if not usuario:
        print("DEBUG LOGIN: Credenciales incorrectas")
        raise HTTPException(status_code=400, detail="Credenciales incorrectas")

    print(f"DEBUG LOGIN: tipo_usuario={getattr(usuario, 'tipo_usuario', None)}")
    expire = datetime.utcnow() + timedelta(minutes=EXPIRATION_MINUTES)
    to_encode = {"sub": usuario.username, "exp": expire}
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    response = {
        "access_token": token,
        "token_type": "bearer",
        "tipo_usuario": getattr(usuario, "tipo_usuario", None)
    }
    print(f"DEBUG LOGIN: response={response}")
    return response


@authRouter.get("/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(models.Registro).filter(
        models.Registro.verification_token == token
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Token de verificación inválido o expirado.")

    if user.email_verified:
        # Ya verificado, redirigir a una página de "ya verificado" en el frontend
        return RedirectResponse(url="http://localhost:3000/email-already-verified", status_code=status.HTTP_302_FOUND)

    if user.token_expires_at < datetime.utcnow():
        # Token expirado, lanzar error o redirigir a una página para reenviar el email
        raise HTTPException(status_code=400, detail="El token de verificación ha expirado. Por favor, solicita uno nuevo.")

    user.email_verified = True
    user.verification_token = None # Invalida el token después de usarlo
    user.token_expires_at = None
    db.add(user)
    db.commit()
    db.refresh(user)

    # Redirigir al usuario a una página de éxito en tu frontend
    # Por ejemplo, una página que dice "Correo verificado exitosamente"
    return RedirectResponse(url="http://localhost:4200/email-verified-success", status_code=status.HTTP_302_FOUND)

# Ruta para reenviar el correo de verificación
@authRouter.post("/resend-verification-email")
async def resend_verification_email(
    email: EmailStr, # No tiene default, va primero
    background_tasks: BackgroundTasks, # No tiene default
    #request: Request, # No tiene default
    db: Session = Depends(get_db) # Este tiene default, va al final
):
    user = db.query(models.Registro).filter(models.Registro.email == email).first()

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if user.email_verified:
    
      
        raise HTTPException(status_code=400, detail="El correo electrónico ya ha sido verificado.")
    
    if user.token_expires_at and user.token_expires_at.date() < datetime.utcnow().date():
        raise HTTPException(status_code=400, detail="El token de verificación ha expirado. Por favor, solicita uno nuevo.")


    # Generar nuevo token y fecha de expiración
    new_token = str(uuid.uuid4())
    new_token_expires_at = datetime.utcnow() + timedelta(hours=24)

    user.verification_token = new_token
    user.token_expires_at = new_token_expires_at
    db.add(user)
    db.commit()
    db.refresh(user)

    verification_url = f"{request.base_url}auth/verify-email?token={new_token}"
    # Asegúrate de que send_verification_email esté importada o definida en crud.py
    await crud.send_verification_email(email, user.username, verification_url, background_tasks)

    return {"message": "Correo de verificación reenviado."}


# ENDPOINTS PARA FUNCIONARIO
@authRouter.get("/funcionario/perfil/{username}")
async def get_funcionario_perfil(username: str, db: Session = Depends(get_db)):
    funcionario = db.query(models.Funcionario).filter(models.Funcionario.username == username).first()
    if not funcionario:
        raise HTTPException(status_code=404, detail="Funcionario no encontrado")
    return {
        "username": funcionario.username,
        "email": funcionario.email,
        "numero_identificacion": funcionario.numero_identificacion,
        "ciudad": funcionario.ciudad,
        "rh": funcionario.rh,
        "grupo_sanguineo": funcionario.grupo_sanguineo,
        "nombres": funcionario.nombres,
        "apellidos": funcionario.apellidos,
        "ano_nacimiento": funcionario.ano_nacimiento,
        "direccion": funcionario.direccion,
        "telefono": funcionario.telefono,
        "profile_image_url": funcionario.profile_image_url
    }

@authRouter.get("/funcionario/vehiculo/{username}")
async def get_funcionario_vehiculo(username: str, db: Session = Depends(get_db)):
    vehiculo = db.query(models.VehiculoFuncionario).filter(models.VehiculoFuncionario.username == username).first()
    if not vehiculo:
        return {
            "marca": "",
            "modelo": "",
            "ano": "",
            "placa": "",
            "fecha_soat": "",
            "fecha_tecno": "",
            "color": "",
            "vehiculo_image_url": ""
        }
    return {
        "marca": vehiculo.marca,
        "modelo": vehiculo.modelo,
        "ano": vehiculo.ano,
        "placa": vehiculo.placa,
        "fecha_soat": vehiculo.fecha_soat,
        "fecha_tecno": vehiculo.fecha_tecno,
        "color": vehiculo.color,
        "vehiculo_image_url": vehiculo.vehiculo_image_url
    }

@authRouter.put("/funcionario/vehiculo")
async def upsert_funcionario_vehiculo(vehiculo: dict = Body(...), db: Session = Depends(get_db)):
    result = crud.upsert_funcionario_vehiculo(db, vehiculo)
    return result

@authRouter.put("/funcionario/update-perfil")
async def update_funcionario_perfil(perfil: dict = Body(...), db: Session = Depends(get_db)):
    updated_funcionario = crud.update_funcionario_perfil(db, perfil)
    if not updated_funcionario:
        raise HTTPException(status_code=404, detail="Funcionario no encontrado")
    return updated_funcionario

@authRouter.get("/empresa/clientes")
async def get_clientes(db: Session = Depends(get_db)):
    # Obtiene todos los usuarios tipo 'cliente'
    clientes = db.query(models.Registro).filter(models.Registro.tipo_usuario == "cliente").all()
    resultado = []
    for cliente in clientes:
        # Busca el vehículo asociado por username
        vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.username == cliente.username).first()
        resultado.append({
            "nombre": f"{cliente.nombres} {cliente.apellidos}",
            "identificacion": cliente.numero_identificacion,
            "celular": cliente.telefono,
            "placa": vehiculo.placa if vehiculo else None,
            "modelo": vehiculo.modelo if vehiculo else None,
            "color": vehiculo.color if vehiculo else None,
            "fecha_soat": vehiculo.fecha_soat if vehiculo else None,
            "fecha_tecno": vehiculo.fecha_tecno if vehiculo else None
        })
    return resultado

@authRouter.get("/empresa/agentes")
async def get_agentes(db: Session = Depends(get_db)):
    agentes = db.query(models.Registro).filter(models.Registro.tipo_usuario == "funcionario").all()
    resultado = []
    for agente in agentes:
        vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.username == agente.username).first()
        resultado.append({
            "nombre": f"{agente.nombres} {agente.apellidos}",
            "identificacion": agente.numero_identificacion,
            "celular": agente.telefono,
            "placa": vehiculo.placa if vehiculo else None,
            "modelo": vehiculo.modelo if vehiculo else None,
            "color": vehiculo.color if vehiculo else None,
            "fecha_soat": vehiculo.fecha_soat if vehiculo else None,
            "fecha_tecno": vehiculo.fecha_tecno if vehiculo else None
        })
    return resultado

@authRouter.get("/vehiculos/search")
async def search_vehiculos(placa: str, db: Session = Depends(get_db)):
    if not placa:
        return []
    
    vehiculos = db.query(models.Vehiculo).filter(models.Vehiculo.placa.ilike(f"%{placa}%")).all()
    
    if not vehiculos:
        return []

    resultado = []
    for vehiculo in vehiculos:
        propietario = db.query(models.Registro).filter(models.Registro.username == vehiculo.username).first()
        if propietario:
            resultado.append({
                "placa": vehiculo.placa,
                "modelo": vehiculo.modelo,
                "color": vehiculo.color,
                "propietario_nombre": f"{propietario.nombres} {propietario.apellidos}",
                "propietario_tipo": propietario.tipo_usuario
            })
            
    return resultado

class PlacaRequest(BaseModel):
    placa: str

@authRouter.post("/vehiculos/activar-gps")
async def activar_gps(request: PlacaRequest, db: Session = Depends(get_db)):
    vehiculo = db.query(models.Vehiculo).filter(models.Vehiculo.placa == request.placa).first()
    if not vehiculo:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    vehiculo.gps_activo = True
    db.commit()
    
    return {"message": f"GPS activado para el vehículo con placa {vehiculo.placa}"}

@authRouter.get("/vehiculos/activos")
async def get_vehiculos_activos(db: Session = Depends(get_db)):
    vehiculos = db.query(models.Vehiculo).filter(models.Vehiculo.gps_activo == True).all()
    resultado = []
    for vehiculo in vehiculos:
        propietario = db.query(models.Registro).filter(models.Registro.username == vehiculo.username).first()
        if propietario:
            resultado.append({
                "placa": vehiculo.placa,
                "modelo": vehiculo.modelo,
                "color": vehiculo.color,
                "propietario_nombre": f"{propietario.nombres} {propietario.apellidos}",
                "propietario_tipo": propietario.tipo_usuario
            })
    return resultado

@authRouter.get("/vehiculos/inactivos")
async def get_vehiculos_inactivos(db: Session = Depends(get_db)):
    vehiculos = db.query(models.Vehiculo).filter(models.Vehiculo.gps_activo.is_(False) | (models.Vehiculo.gps_activo == None)).all()
    resultado = []
    for vehiculo in vehiculos:
        propietario = db.query(models.Registro).filter(models.Registro.username == vehiculo.username).first()
        if propietario:
            resultado.append({
                "placa": vehiculo.placa,
                "modelo": vehiculo.modelo,
                "color": vehiculo.color,
                "propietario_nombre": f"{propietario.nombres} {propietario.apellidos}",
                "propietario_tipo": propietario.tipo_usuario
            })
    return resultado