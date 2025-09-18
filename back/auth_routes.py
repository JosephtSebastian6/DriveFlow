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
from sqlalchemy import func, or_, and_


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
        "profile_image_url": user.profile_image_url,
        "tipo_usuario": user.tipo_usuario,
        "rut": getattr(user, 'rut', None),
        "camara_comercio": getattr(user, 'camara_comercio', None),
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

# --- ENDPOINTS MULTI-VEHÍCULO (RUTAS SIN COLISIÓN) ---
@authRouter.get("/usuarios/{username}/vehiculos")
async def listar_vehiculos_usuario(username: str, db: Session = Depends(get_db)):
    return crud.get_vehiculos_by_username(db, username)

@authRouter.post("/usuarios/{username}/vehiculos")
async def crear_vehiculo_usuario(username: str, data: dict = Body(...), db: Session = Depends(get_db)):
    return crud.create_vehiculo(db, username, data)

@authRouter.put("/vehiculos/{vehiculo_id}")
async def actualizar_vehiculo_id(vehiculo_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    updated = crud.update_vehiculo_by_id(db, vehiculo_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return updated

@authRouter.delete("/vehiculos/{vehiculo_id}")
async def eliminar_vehiculo_id(vehiculo_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_vehiculo_by_id(db, vehiculo_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    return {"deleted": True}

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
    # Política: si 'bloqueado' es True, no permitimos login
    if getattr(usuario, 'bloqueado', False) is True:
        raise HTTPException(status_code=403, detail="Usuario bloqueado. Contacte al administrador.")
    # Exigir verificación de correo antes de permitir login
    if getattr(usuario, 'email_verified', False) is not True:
        raise HTTPException(status_code=403, detail="Correo no verificado. Revisa tu email para completar la verificación.")

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

# --- ADMIN: Gestión de usuarios ---
@authRouter.get("/admin/usuarios")
async def admin_list_usuarios(rol: str | None = None, db: Session = Depends(get_db)):
    """Lista usuarios. Si 'rol' se provee, filtra por tipo_usuario.
    Retorna un subconjunto seguro de campos.
    """
    q = db.query(models.Registro)
    if rol:
        q = q.filter(models.Registro.tipo_usuario == rol)
    usuarios = q.all()
    return [
        {
            "username": u.username,
            "nombres": u.nombres,
            "apellidos": u.apellidos,
            "email": u.email,
            "telefono": u.telefono,
            "tipo_usuario": u.tipo_usuario,
            "email_verified": u.email_verified,
            "bloqueado": getattr(u, 'bloqueado', False),
        }
        for u in usuarios
    ]

class CambiarRolRequest(BaseModel):
    rol: str

@authRouter.put("/admin/usuarios/{username}/rol")
async def admin_cambiar_rol(username: str, body: CambiarRolRequest, db: Session = Depends(get_db)):
    roles_validos = {"cliente", "funcionario", "empresa", "administrador", "pime"}
    if body.rol not in roles_validos:
        raise HTTPException(status_code=400, detail="Rol inválido")
    u = db.query(models.Registro).filter(models.Registro.username == username).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    u.tipo_usuario = body.rol
    db.commit()
    return {"message": f"Rol actualizado a '{body.rol}' para {username}"}

class BloqueoRequest(BaseModel):
    bloqueado: bool

@authRouter.put("/admin/usuarios/{username}/bloqueo")
async def admin_bloquear_usuario(username: str, body: BloqueoRequest, db: Session = Depends(get_db)):
    u = db.query(models.Registro).filter(models.Registro.username == username).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    # Usamos el campo dedicado 'bloqueado'
    setattr(u, 'bloqueado', bool(body.bloqueado))
    db.commit()
    estado = "bloqueado" if body.bloqueado else "desbloqueado"
    return {"message": f"Usuario {estado}: {username}"}

# ---------------- Utilidades de verificación ----------------
class VerifyByIdentifier(BaseModel):
    username: str | None = None
    email: EmailStr | None = None

@authRouter.post("/admin/mark-verified")
async def admin_mark_verified(body: VerifyByIdentifier, db: Session = Depends(get_db)):
    q = None
    if body.username:
        q = db.query(models.Registro).filter(models.Registro.username == body.username).first()
    elif body.email:
        q = db.query(models.Registro).filter(models.Registro.email == body.email).first()
    else:
        raise HTTPException(status_code=400, detail="Proporcione username o email")
    if not q:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    q.email_verified = True
    q.verification_token = None
    q.token_expires_at = None
    db.commit()
    db.refresh(q)
    return {"username": q.username, "email_verified": q.email_verified}

@authRouter.post("/resend-verification")
async def resend_verification(body: VerifyByIdentifier, background_tasks: BackgroundTasks, request: Request, db: Session = Depends(get_db)):
    user = None
    if body.username:
        user = db.query(models.Registro).filter(models.Registro.username == body.username).first()
    elif body.email:
        user = db.query(models.Registro).filter(models.Registro.email == body.email).first()
    else:
        raise HTTPException(status_code=400, detail="Proporcione username o email")
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    verification_token = str(uuid.uuid4())
    user.verification_token = verification_token
    user.token_expires_at = datetime.utcnow() + timedelta(hours=24)
    db.add(user)
    db.commit()
    base_url_str = str(request.base_url)
    verification_url = base_url_str + f"auth/verify-email?token={verification_token}"
    await crud.send_verification_email(user.email, user.username, verification_url, background_tasks, request)
    return {"message": "Correo de verificación reenviado", "username": user.username}

# ---------------- Empresa/PIME: Crear usuario y asignar vehículo ----------------
class CrearUsuarioVehiculoPayload(BaseModel):
    class UserPayload(BaseModel):
        tipo_usuario: str  # 'cliente' | 'funcionario'
        username: str
        email: EmailStr
        nombres: str | None = ""
        apellidos: str | None = ""
        telefono: str | None = None
    class VehiculoPayload(BaseModel):
        marca: str | None = ""
        modelo: str | None = ""
        ano: str | None = ""
        placa: str
        fecha_soat: str | None = ""
        fecha_tecno: str | None = ""
        color: str | None = ""
        vehiculo_image_url: str | None = ""
        gps_activo: bool | None = False
    user: UserPayload
    vehiculo: VehiculoPayload

@authRouter.post("/empresa/crear-usuario-vehiculo")
async def empresa_crear_usuario_vehiculo(payload: CrearUsuarioVehiculoPayload, background_tasks: BackgroundTasks, request: Request, db: Session = Depends(get_db)):
    # Crear usuario y asignar vehículo con helpers en crud
    user, vehiculo = crud.create_user_and_assign_vehicle(db, payload.dict())
    # Enviar correo con contraseña temporal y verificación de email
    try:
        # La función create_user_and_assign_vehicle genera la contraseña internamente, así que necesitamos replicar la creación del mensaje.
        # Para evitar tocar su retorno, generamos una nueva contraseña temporal y la reseteamos aquí, avisando al usuario por correo.
        temp_password = crud._generate_temp_password()  # función interna preparada
        # Actualizamos password del usuario a la nueva temp para que coincida con el correo enviado
        from passlib.context import CryptContext
        pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
        hashed = pwd_ctx.hash(temp_password)
        db_user = db.query(models.Registro).filter(models.Registro.username == user.username).first()
        if db_user:
            db_user.hashed_password = hashed
            db.commit()
        await crud.send_temp_password_email(recipient_email=user.email, username=user.username, temp_password=temp_password, background_tasks=background_tasks)

        # Generar y enviar correo de verificación
        verification_token = str(uuid.uuid4())
        db_user = db.query(models.Registro).filter(models.Registro.username == user.username).first()
        if db_user:
            db_user.verification_token = verification_token
            db_user.token_expires_at = datetime.utcnow() + timedelta(hours=24)
            db.add(db_user)
            db.commit()
            base_url_str = str(request.base_url)
            verification_url = base_url_str + f"auth/verify-email?token={verification_token}"
            await crud.send_verification_email(db_user.email, db_user.username, verification_url, background_tasks, request)
    except Exception as e:
        print(f"WARN: No se pudo enviar/establecer contraseña temporal por correo: {e}")
    return {"user": {"username": user.username, "email": user.email, "tipo_usuario": user.tipo_usuario}, "vehiculo": vehiculo, "temp_password": temp_password}

@authRouter.get("/vehiculos/debug")
async def vehiculos_debug(db: Session = Depends(get_db)):
    """Endpoint de diagnóstico: devuelve conteos y muestras sin filtros para verificar la conexión y datos reales."""
    total_cli = db.query(models.Vehiculo).count()
    total_fun = db.query(models.VehiculoFuncionario).count()
    sample_cli = db.query(models.Vehiculo.placa, models.Vehiculo.gps_activo).limit(5).all()
    sample_fun = db.query(models.VehiculoFuncionario.placa).limit(5).all()
    norm_cli = [
        {"placa": p or None, "placa_norm": (p or "").lower().replace(" ", "").replace("-", ""), "gps_activo": g}
        for (p, g) in sample_cli
    ]
    norm_fun = [
        {"placa": p or None, "placa_norm": (p or "").lower().replace(" ", "").replace("-", "")}
        for (p,) in sample_fun
    ]
    return {"clientes_total": total_cli, "funcionarios_total": total_fun, "clientes_sample": norm_cli, "funcionarios_sample": norm_fun}

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
    # Búsqueda robusta: insensible a mayúsculas/minúsculas, espacios y guiones
    raw = (placa or '').strip()
    term_norm = f"%{raw.replace(' ', '').replace('-', '')}%"
    # Clientes
    placa_norm_cli = func.replace(func.replace(func.lower(models.Vehiculo.placa), ' ', ''), '-', '')
    vehiculos_cli = db.query(models.Vehiculo).filter(placa_norm_cli.like(func.lower(term_norm))).all()
    # Funcionarios
    placa_norm_fun = func.replace(func.replace(func.lower(models.VehiculoFuncionario.placa), ' ', ''), '-', '')
    vehiculos_fun = db.query(models.VehiculoFuncionario).filter(placa_norm_fun.like(func.lower(term_norm))).all()

    resultado = []
    for v in vehiculos_cli:
        propietario = db.query(models.Registro).filter(models.Registro.username == v.username).first()
        if propietario:
            resultado.append({
                "placa": v.placa,
                "modelo": v.modelo,
                "color": v.color,
                "propietario_nombre": f"{propietario.nombres} {propietario.apellidos}",
                "propietario_tipo": propietario.tipo_usuario or 'cliente'
            })
    for v in vehiculos_fun:
        prop_f = db.query(models.Funcionario).filter(models.Funcionario.username == v.username).first()
        if prop_f:
            resultado.append({
                "placa": v.placa,
                "modelo": v.modelo,
                "color": v.color,
                "propietario_nombre": f"{prop_f.nombres} {prop_f.apellidos}",
                "propietario_tipo": 'funcionario'
            })

    return resultado

class PlacaRequest(BaseModel):
    placa: str

# Alias estables para evitar colisión con '/vehiculos/{username}'
@authRouter.post("/vehiculos/activar-gps")
@authRouter.post("/vehiculos/gps/activar")
async def activar_gps(request: PlacaRequest, db: Session = Depends(get_db)):
    # Comparación tolerante a mayúsculas/minúsculas y espacios
    placa_norm = (request.placa or "").strip()
    vehiculo = db.query(models.Vehiculo).filter(func.lower(models.Vehiculo.placa) == func.lower(placa_norm)).first()
    if vehiculo:
        vehiculo.gps_activo = True
        db.commit()
        return {"message": f"GPS activado para el vehículo con placa {vehiculo.placa}"}
    # Intentar en funcionarios
    vfun = db.query(models.VehiculoFuncionario).filter(func.lower(models.VehiculoFuncionario.placa) == func.lower(placa_norm)).first()
    if vfun is not None and hasattr(vfun, 'gps_activo'):
        setattr(vfun, 'gps_activo', True)
        db.commit()
        return {"message": f"GPS activado para el vehículo (funcionario) con placa {vfun.placa}"}
    raise HTTPException(status_code=404, detail="Vehículo no encontrado")

@authRouter.post("/vehiculos/desactivar-gps")
@authRouter.post("/vehiculos/gps/desactivar")
async def desactivar_gps(request: PlacaRequest, db: Session = Depends(get_db)):
    # Comparación tolerante a mayúsculas/minúsculas y espacios
    placa_norm = (request.placa or "").strip()
    vehiculo = db.query(models.Vehiculo).filter(func.lower(models.Vehiculo.placa) == func.lower(placa_norm)).first()
    if vehiculo:
        vehiculo.gps_activo = False
        db.commit()
        return {"message": f"GPS desactivado para el vehículo con placa {vehiculo.placa}"}
    # Intentar en funcionarios
    vfun = db.query(models.VehiculoFuncionario).filter(func.lower(models.VehiculoFuncionario.placa) == func.lower(placa_norm)).first()
    if vfun is not None and hasattr(vfun, 'gps_activo'):
        setattr(vfun, 'gps_activo', False)
        db.commit()
        return {"message": f"GPS desactivado para el vehículo (funcionario) con placa {vfun.placa}"}
    raise HTTPException(status_code=404, detail="Vehículo no encontrado")

@authRouter.get("/vehiculos/activos")
async def get_vehiculos_activos(db: Session = Depends(get_db)):
    resultado: list[dict] = []
    # Clientes activos
    cli = db.query(models.Vehiculo).filter(or_(models.Vehiculo.gps_activo == True, models.Vehiculo.gps_activo == 1)).all()
    for v in cli:
        propietario = db.query(models.Registro).filter(models.Registro.username == v.username).first()
        resultado.append({
            "username": v.username,
            "placa": v.placa,
            "modelo": v.modelo,
            "color": v.color,
            "propietario_nombre": f"{propietario.nombres} {propietario.apellidos}" if propietario else None,
            "propietario_tipo": propietario.tipo_usuario if propietario else 'cliente'
        })
    # Funcionarios activos
    if hasattr(models.VehiculoFuncionario, 'gps_activo'):
        fun = db.query(models.VehiculoFuncionario).filter(or_(models.VehiculoFuncionario.gps_activo == True, models.VehiculoFuncionario.gps_activo == 1)).all()
        for v in fun:
            propietario_f = db.query(models.Funcionario).filter(models.Funcionario.username == v.username).first()
            resultado.append({
                "username": v.username,
                "placa": v.placa,
                "modelo": v.modelo,
                "color": v.color,
                "propietario_nombre": f"{propietario_f.nombres} {propietario_f.apellidos}" if propietario_f else None,
                "propietario_tipo": 'funcionario'
            })
    return resultado

@authRouter.get("/vehiculos/inactivos")
async def get_vehiculos_inactivos(db: Session = Depends(get_db)):
    resultado: list[dict] = []
    # Clientes inactivos (False, 0 o NULL)
    cli = db.query(models.Vehiculo).filter(or_(models.Vehiculo.gps_activo == False, models.Vehiculo.gps_activo == 0, models.Vehiculo.gps_activo.is_(None))).all()
    for v in cli:
        propietario = db.query(models.Registro).filter(models.Registro.username == v.username).first()
        resultado.append({
            "username": v.username,
            "placa": v.placa,
            "modelo": v.modelo,
            "color": v.color,
            "propietario_nombre": f"{propietario.nombres} {propietario.apellidos}" if propietario else None,
            "propietario_tipo": propietario.tipo_usuario if propietario else 'cliente'
        })
    # Funcionarios inactivos (si existe la columna)
    if hasattr(models.VehiculoFuncionario, 'gps_activo'):
        fun = db.query(models.VehiculoFuncionario).filter(or_(models.VehiculoFuncionario.gps_activo == False, models.VehiculoFuncionario.gps_activo == 0, models.VehiculoFuncionario.gps_activo.is_(None))).all()
        for v in fun:
            propietario_f = db.query(models.Funcionario).filter(models.Funcionario.username == v.username).first()
            resultado.append({
                "username": v.username,
                "placa": v.placa,
                "modelo": v.modelo,
                "color": v.color,
                "propietario_nombre": f"{propietario_f.nombres} {propietario_f.apellidos}" if propietario_f else None,
                "propietario_tipo": 'funcionario'
            })
    return resultado