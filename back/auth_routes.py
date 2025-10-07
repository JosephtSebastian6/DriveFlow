# FastAPI and related imports
from Clever_MySQL_conn import get_db
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request, Body
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from jose import jwt
from datetime import timedelta, datetime
import uuid
from pydantic import EmailStr, BaseModel
import secrets
from pydantic import EmailStr
import crud
import models
import schemas
from Clever_MySQL_conn import get_db
from sqlalchemy import func, or_, and_
import os


# Local imports


# Optional: Import your email service if needed
# from .services.email_service import send_verification_email

# JWT configuration (ideally from environment variables)
SECRET_KEY = "supersecretkey"  # Change to a secure key, ideally from .env
ALGORITHM = "HS256"
EXPIRATION_MINUTES = 60


authRouter = APIRouter()

# =========================== Password Reset ===========================
class ResetRequestIn(BaseModel):
    email: EmailStr

class ResetConfirmIn(BaseModel):
    token: str
    new_password: str

@authRouter.post('/password-reset/request')
async def password_reset_request(body: ResetRequestIn, background_tasks: BackgroundTasks, request: Request, db: Session = Depends(get_db)):
    """Genera un token de reseteo e intenta enviar un correo con el enlace.
    Siempre responde 200 para no filtrar si el correo existe o no."""
    # Asegurar tabla (por si falta migración en entornos locales)
    try:
        from Clever_MySQL_conn import engine, Base
        Base.metadata.create_all(bind=engine, tables=[models.ResetToken.__table__])
    except Exception as e:
        print(f"WARN reset: no se pudo asegurar tabla reset_token: {e}")

    user = db.query(models.Registro).filter(func.lower(models.Registro.email) == func.lower(body.email)).first()
    if user:
        try:
            token = crud.create_reset_token(db, user)
            frontend_base = os.getenv('DF_FRONTEND_BASE', 'http://localhost:4200')
            reset_link = f"{frontend_base}/reset-password?token={token}"
            await crud.send_password_reset_email(user.email, reset_link, background_tasks)
        except Exception as e:
            # No romper el flujo; registrar y seguir
            print(f"WARN reset: fallo al enviar correo: {e}")
    return {"ok": True}

@authRouter.post('/password-reset/confirm')
async def password_reset_confirm(body: ResetConfirmIn, db: Session = Depends(get_db)):
    if not body.new_password or len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail='La contraseña es muy corta')
    ok = crud.confirm_password_reset(db, body.token, body.new_password)
    if not ok:
        raise HTTPException(status_code=400, detail='Token inválido, usado o expirado')
    return {"ok": True}


# ENDPOINTS PARA OBTENER PERFIL Y VEHICULO POR USERNAME
@authRouter.get("/perfil/{username}")
async def get_perfil(username: str, db: Session = Depends(get_db)):
    user = db.query(models.Registro).filter(models.Registro.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    # Buscar asociación a empresa (si existe)
    empresa_id_asociada = None
    empresa_nombre_asociada = None
    try:
        link = db.query(models.EmpresaUsuario).filter(models.EmpresaUsuario.usuario_id == user.identificador).first()
        if link:
            empresa_id_asociada = link.empresa_id
            emp = db.query(models.Registro).filter(models.Registro.identificador == link.empresa_id).first()
            if emp:
                empresa_nombre_asociada = f"{getattr(emp,'nombres','') or ''} {getattr(emp,'apellidos','') or ''}".strip() or (getattr(emp,'username','') or None)
    except Exception as e:
        print(f"WARN perfil: no se pudo resolver empresa asociada: {e}")
    return {
        "identificador": user.identificador,
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
        "empresa_id_asociada": empresa_id_asociada,
        "empresa_nombre_asociada": empresa_nombre_asociada,
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

class ReubicarVehiculoIn(BaseModel):
    username: str
    placa: str
    empresa_id: int | None = None

@authRouter.post('/vehiculos/reubicar-a-cliente')
async def reubicar_vehiculo_a_cliente(body: ReubicarVehiculoIn, db: Session = Depends(get_db)):
    """Normaliza un vehículo para un cliente:
    - Si existe en VehiculoFuncionario con esa placa, lo mueve a Vehiculo con el username destino.
    - Si existe en Vehiculo (placa) con otro username, reasigna ese registro al username destino.
    - Valida que el username destino exista y sea cliente o pime.
    - Si se envía empresa_id, verifica que el usuario esté asociado a esa empresa.
    """
    user = db.query(models.Registro).filter(func.lower(models.Registro.username) == func.lower(body.username)).first()
    if not user:
        raise HTTPException(status_code=404, detail='Usuario destino no encontrado')
    tipo = (getattr(user, 'tipo_usuario', '') or '').lower()
    if tipo not in {'cliente', 'pime'}:
        raise HTTPException(status_code=400, detail='Solo se puede reubicar a usuarios tipo cliente/pime')
    # Validación de pertenencia a empresa si aplica
    if body.empresa_id is not None:
        link = db.query(models.EmpresaUsuario).filter(
            models.EmpresaUsuario.empresa_id == body.empresa_id,
            models.EmpresaUsuario.usuario_id == user.identificador
        ).first()
        if not link:
            raise HTTPException(status_code=400, detail='El usuario no pertenece a la empresa indicada')

    placa_norm = (body.placa or '').strip()
    # 1) ¿Existe en funcionarios?
    vfun = db.query(models.VehiculoFuncionario).filter(func.lower(models.VehiculoFuncionario.placa) == func.lower(placa_norm)).first()
    if vfun:
        # Crear en clientes con mismo contenido pero username destino
        nuevo = models.Vehiculo(
            username=user.username,
            marca=getattr(vfun, 'marca', ''), modelo=getattr(vfun, 'modelo', ''), ano=getattr(vfun, 'ano', ''),
            placa=getattr(vfun, 'placa', ''), fecha_soat=getattr(vfun, 'fecha_soat', ''), fecha_tecno=getattr(vfun, 'fecha_tecno', ''),
            color=getattr(vfun, 'color', ''), vehiculo_image_url=getattr(vfun, 'vehiculo_image_url', ''),
            gps_activo=getattr(vfun, 'gps_activo', False) if hasattr(vfun, 'gps_activo') else False
        )
        db.add(nuevo)
        db.delete(vfun)
        db.commit()
        db.refresh(nuevo)
        return {'moved_from': 'funcionario', 'to': 'cliente', 'placa': nuevo.placa, 'username': user.username}

    # 2) ¿Existe en clientes con otro username? Reasignar
    vcli = db.query(models.Vehiculo).filter(func.lower(models.Vehiculo.placa) == func.lower(placa_norm)).first()
    if vcli:
        setattr(vcli, 'username', user.username)
        db.commit()
        db.refresh(vcli)
        return {'reassigned': True, 'placa': vcli.placa, 'username': user.username}

    raise HTTPException(status_code=404, detail='No se encontró el vehículo por placa en funcionarios o clientes')

 

# ========================= Empresa: resolver empresa_id por username =========================
@authRouter.get('/empresa/id-por-username')
async def empresa_id_por_username(username: str, db: Session = Depends(get_db)):
    """Devuelve el primer empresa_id asociado al username dado, usando la tabla de enlace EmpresaUsuario.
    Si no hay vínculo, retorna { empresa_id: None }.
    """
    user = db.query(models.Registro).filter(models.Registro.username == username).first()
    if not user:
        return { 'empresa_id': None }
    link = db.query(models.EmpresaUsuario).filter(models.EmpresaUsuario.usuario_id == getattr(user, 'identificador', None)).first()
    if not link:
        return { 'empresa_id': None }
    return { 'empresa_id': getattr(link, 'empresa_id', None) }

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

    # Forzar rol 'cliente' en servidor ignorando lo que llegue del cliente
    try:
        object.__setattr__(user, 'tipo_usuario', 'cliente')
    except Exception:
        # Si Pydantic impide asignación directa, reconstruimos el modelo
        user = schemas.RegistroCreate(
            username=user.username,
            password=user.password,
            nombres=user.nombres,
            apellidos=user.apellidos,
            email=user.email,
            tipo_usuario='cliente',
            empresa_code=getattr(user, 'empresa_code', None)
        )

    # Llama a la función CRUD para registrar al usuario, pasando las dependencias necesarias
    new_user = await crud.registro_user(db, user, background_tasks, request)
    # Asociación por empresa_code si viene en el payload
    try:
        code = getattr(user, 'empresa_code', None)
        if code:
            row = db.query(models.EmpresaCodigo).filter(models.EmpresaCodigo.codigo == code).first()
            if not row or bool(row.revocado) or (row.expira_en and row.expira_en < datetime.utcnow()):
                raise HTTPException(status_code=400, detail='Código de empresa inválido o expirado')
            # Crear vínculo en empresa_usuario
            link = models.EmpresaUsuario(empresa_id=row.empresa_id, usuario_id=new_user.identificador)
            db.add(link)
            db.commit()
    except HTTPException:
        raise
    except Exception as e:
        print(f"WARN: No se pudo asociar empresa_code: {e}")
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

# DEPRECATED: usar '/empresa/clientes' (ver versión con incluir_funcionarios, origen y tipo_usuario)
@authRouter.get("/empresa/clientes-legacy")
async def get_clientes(empresa_id: int | None = None, db: Session = Depends(get_db)):
    """Lista clientes asociados a una empresa vía tabla empresa_usuario.
    Requiere empresa_id. Si no se envía, devuelve 400 para evitar exponer datos globales.
    """
    if not empresa_id:
        raise HTTPException(status_code=400, detail="Debe proporcionar empresa_id")

    # Usuarios clientes asociados a esa empresa por EmpresaUsuario
    links = db.query(models.EmpresaUsuario).filter(models.EmpresaUsuario.empresa_id == empresa_id).all()
    if not links:
        return []
    usuario_ids = [l.usuario_id for l in links]

    clientes = db.query(models.Registro).filter(
        models.Registro.identificador.in_(usuario_ids),
        models.Registro.tipo_usuario == "cliente"
    ).all()

    resultado = []
    for cliente in clientes:
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
    # Esquema genérico para reenvío de verificación: acepta uno u otro
    username: str | None = None
    email: EmailStr | None = None

class AdminMarkVerifiedIn(BaseModel):
    # Opción C: requerir ambos campos
    username: str
    email: EmailStr

@authRouter.post("/admin/mark-verified")
async def admin_mark_verified(body: AdminMarkVerifiedIn, db: Session = Depends(get_db)):
    # Buscar por username y validar email coincidente
    q = db.query(models.Registro).filter(models.Registro.username == body.username).first()
    if not q:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    stored_email = (getattr(q, 'email', None) or '').strip().lower()
    if stored_email and stored_email != body.email.strip().lower():
        raise HTTPException(status_code=400, detail="El email no coincide con el registrado")
    # Marcar como verificado
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

# ---------------------- Empresa: Código de invitación ----------------------
class RotarCodigoIn(BaseModel):
    expires_in_days: int | None = 30

class CodigoOut(BaseModel):
    codigo: str | None = None
    expira_en: datetime | None = None
    revocado: bool = False

class ValidarCodigoOut(BaseModel):
    empresa_id: int
    nombre: str

def _gen_codigo(longitud: int = 12) -> str:
    return secrets.token_urlsafe(12)[:longitud]

@authRouter.get('/empresas/{empresa_id}/codigo', response_model=CodigoOut)
async def empresa_get_codigo(empresa_id: int, db: Session = Depends(get_db)):
    # Obtiene el último código no revocado; si no hay, responde vacío
    code = db.query(models.EmpresaCodigo).filter(models.EmpresaCodigo.empresa_id == empresa_id).order_by(models.EmpresaCodigo.id.desc()).first()
    if not code:
        return CodigoOut(codigo=None, expira_en=None, revocado=False)
    return CodigoOut(codigo=code.codigo, expira_en=code.expira_en, revocado=bool(code.revocado))

@authRouter.post('/empresas/{empresa_id}/codigo', response_model=CodigoOut, status_code=status.HTTP_201_CREATED)
async def empresa_rotar_codigo(empresa_id: int, body: RotarCodigoIn, db: Session = Depends(get_db)):
    # Genera un nuevo código para la empresa
    expira_en = None
    if body.expires_in_days:
        expira_en = datetime.utcnow() + timedelta(days=body.expires_in_days)
    nuevo = models.EmpresaCodigo(
        empresa_id=empresa_id,
        codigo=_gen_codigo(12),
        expira_en=expira_en,
        revocado=False,
        generado_en=datetime.utcnow(),
        generado_por=None
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return CodigoOut(codigo=nuevo.codigo, expira_en=nuevo.expira_en, revocado=False)

@authRouter.delete('/empresas/{empresa_id}/codigo', status_code=status.HTTP_204_NO_CONTENT)
async def empresa_revocar_codigo(empresa_id: int, db: Session = Depends(get_db)):
    code = db.query(models.EmpresaCodigo).filter(models.EmpresaCodigo.empresa_id == empresa_id).order_by(models.EmpresaCodigo.id.desc()).first()
    if not code:
        raise HTTPException(status_code=404, detail='No hay código para esta empresa')
    code.revocado = True
    db.add(code)
    db.commit()
    return

@authRouter.get('/empresas/validar-codigo', response_model=ValidarCodigoOut)
async def empresa_validar_codigo(code: str, db: Session = Depends(get_db)):
    row = db.query(models.EmpresaCodigo).filter(models.EmpresaCodigo.codigo == code).first()
    if not row or bool(row.revocado):
        raise HTTPException(status_code=404, detail='Código inválido')
    if row.expira_en and row.expira_en < datetime.utcnow():
        raise HTTPException(status_code=404, detail='Código expirado')
    # Obtenemos nombre referencial desde registro
    empresa_reg = db.query(models.Registro).filter(models.Registro.identificador == row.empresa_id).first()
    nombre = f"{getattr(empresa_reg,'nombres','') or ''} {getattr(empresa_reg,'apellidos','') or ''}".strip() or (getattr(empresa_reg,'username', '') or 'Empresa')
    return ValidarCodigoOut(empresa_id=row.empresa_id, nombre=nombre)

# Asociar usuario a empresa con empresa_code post-registro
class AsociarEmpresaIn(BaseModel):
    username: str
    empresa_code: str

@authRouter.post('/empresas/asociar')
async def asociar_usuario_a_empresa(body: AsociarEmpresaIn, db: Session = Depends(get_db)):
    # Validar usuario
    user = db.query(models.Registro).filter(models.Registro.username == body.username).first()
    if not user:
        raise HTTPException(status_code=404, detail='Usuario no encontrado')
    if (user.tipo_usuario or '').lower() not in {'cliente', 'funcionario'}:
        raise HTTPException(status_code=400, detail='Solo clientes o funcionarios pueden asociarse a una empresa')

    # Validar código
    row = db.query(models.EmpresaCodigo).filter(models.EmpresaCodigo.codigo == body.empresa_code).first()
    if not row or bool(row.revocado) or (row.expira_en and row.expira_en < datetime.utcnow()):
        raise HTTPException(status_code=400, detail='Código de empresa inválido o expirado')

    # Verificar si ya existe asociación
    existing = db.query(models.EmpresaUsuario).filter(
        models.EmpresaUsuario.empresa_id == row.empresa_id,
        models.EmpresaUsuario.usuario_id == user.identificador
    ).first()
    if existing:
        return {"message": "Ya estás asociado a esta empresa", "empresa_id": row.empresa_id}

    link = models.EmpresaUsuario(empresa_id=row.empresa_id, usuario_id=user.identificador)
    db.add(link)
    db.commit()
    return {"message": "Asociación exitosa", "empresa_id": row.empresa_id}

# Listar usuarios asociados a una empresa (clientes y funcionarios)
class UsuarioEmpresaResumen(BaseModel):
    username: str
    nombres: str | None = None
    apellidos: str | None = None
    email: EmailStr | None = None
    tipo_usuario: str

@authRouter.get('/empresas/{empresa_id}/usuarios')
async def listar_usuarios_de_empresa(empresa_id: int, db: Session = Depends(get_db)):
    links = db.query(models.EmpresaUsuario).filter(models.EmpresaUsuario.empresa_id == empresa_id).all()
    if not links:
        return []
    usuario_ids = [l.usuario_id for l in links]
    usuarios = db.query(models.Registro).filter(models.Registro.identificador.in_(usuario_ids)).all()
    resp = []
    for u in usuarios:
        resp.append({
            'username': u.username,
            'nombres': getattr(u, 'nombres', None),
            'apellidos': getattr(u, 'apellidos', None),
            'email': getattr(u, 'email', None),
            'tipo_usuario': (u.tipo_usuario or '').lower()
        })
    return resp

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
async def search_vehiculos(placa: str, empresa_id: int | None = None, db: Session = Depends(get_db)):
    if not placa:
        return []
    # Búsqueda robusta: insensible a mayúsculas/minúsculas, espacios y guiones
    raw = (placa or '').strip()
    term_norm = f"%{raw.replace(' ', '').replace('-', '')}%"
    # Clientes
    placa_norm_cli = func.replace(func.replace(func.lower(models.Vehiculo.placa), ' ', ''), '-', '')
    cli_q = db.query(models.Vehiculo).filter(placa_norm_cli.like(func.lower(term_norm)))
    # Funcionarios
    placa_norm_fun = func.replace(func.replace(func.lower(models.VehiculoFuncionario.placa), ' ', ''), '-', '')
    fun_q = db.query(models.VehiculoFuncionario).filter(placa_norm_fun.like(func.lower(term_norm)))

    # Si se provee empresa_id, limitar por usuarios asociados a esa empresa
    if empresa_id is not None:
        links = db.query(models.EmpresaUsuario).filter(models.EmpresaUsuario.empresa_id == empresa_id).all()
        usuario_ids = [l.usuario_id for l in links]
        users = db.query(models.Registro).filter(models.Registro.identificador.in_(usuario_ids)).all()
        usernames = [u.username for u in users if getattr(u, 'username', None)]
        if usernames:
            cli_q = cli_q.filter(models.Vehiculo.username.in_(usernames))
            fun_q = fun_q.filter(models.VehiculoFuncionario.username.in_(usernames))
        else:
            cli_q = cli_q.filter(models.Vehiculo.username.in_(["__none__"]))
            fun_q = fun_q.filter(models.VehiculoFuncionario.username.in_(["__none__"]))

    vehiculos_cli = cli_q.all()
    vehiculos_fun = fun_q.all()

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
    empresa_id: int | None = None

# Alias estables para evitar colisión con '/vehiculos/{username}'
# Alias semánticos de 'power' para mayor claridad en el front
@authRouter.post("/vehiculos/activar-gps")
@authRouter.post("/vehiculos/gps/activar")
@authRouter.post("/vehiculos/power/encender")
async def activar_gps(request: PlacaRequest, db: Session = Depends(get_db)):
    # Requerimos empresa_id para asegurar la pertenencia
    if request.empresa_id is None:
        raise HTTPException(status_code=400, detail="Debe proporcionar empresa_id")
    placa_norm = (request.placa or "").strip()
    # Construir conjunto de usernames asociados a la empresa
    links = db.query(models.EmpresaUsuario).filter(models.EmpresaUsuario.empresa_id == request.empresa_id).all()
    usuario_ids = [l.usuario_id for l in links]
    users = db.query(models.Registro).filter(models.Registro.identificador.in_(usuario_ids)).all()
    usernames = {u.username for u in users if getattr(u, 'username', None)}
    # Buscar en clientes
    vehiculo = db.query(models.Vehiculo).filter(func.lower(models.Vehiculo.placa) == func.lower(placa_norm)).first()
    if vehiculo and vehiculo.username in usernames:
        vehiculo.gps_activo = True
        db.commit()
        return {"message": f"GPS activado para {vehiculo.placa}"}
    # Intentar en funcionarios
    vfun = db.query(models.VehiculoFuncionario).filter(func.lower(models.VehiculoFuncionario.placa) == func.lower(placa_norm)).first()
    if vfun is not None and hasattr(vfun, 'username') and vfun.username in usernames:
        if hasattr(vfun, 'gps_activo'):
            setattr(vfun, 'gps_activo', True)
            db.commit()
            return {"message": f"GPS activado para (funcionario) {vfun.placa}"}
    raise HTTPException(status_code=404, detail="Vehículo no pertenece a la empresa")

@authRouter.post("/vehiculos/desactivar-gps")
@authRouter.post("/vehiculos/gps/desactivar")
@authRouter.post("/vehiculos/power/apagar")
async def desactivar_gps(request: PlacaRequest, db: Session = Depends(get_db)):
    if request.empresa_id is None:
        raise HTTPException(status_code=400, detail="Debe proporcionar empresa_id")
    placa_norm = (request.placa or "").strip()
    links = db.query(models.EmpresaUsuario).filter(models.EmpresaUsuario.empresa_id == request.empresa_id).all()
    usuario_ids = [l.usuario_id for l in links]
    users = db.query(models.Registro).filter(models.Registro.identificador.in_(usuario_ids)).all()
    usernames = {u.username for u in users if getattr(u, 'username', None)}
    vehiculo = db.query(models.Vehiculo).filter(func.lower(models.Vehiculo.placa) == func.lower(placa_norm)).first()
    if vehiculo and vehiculo.username in usernames:
        vehiculo.gps_activo = False
        db.commit()
        return {"message": f"GPS desactivado para {vehiculo.placa}"}
    vfun = db.query(models.VehiculoFuncionario).filter(func.lower(models.VehiculoFuncionario.placa) == func.lower(placa_norm)).first()
    if vfun is not None and hasattr(vfun, 'username') and vfun.username in usernames:
        if hasattr(vfun, 'gps_activo'):
            setattr(vfun, 'gps_activo', False)
            db.commit()
            return {"message": f"GPS desactivado para (funcionario) {vfun.placa}"}
    raise HTTPException(status_code=404, detail="Vehículo no pertenece a la empresa")

@authRouter.get("/vehiculos/activos")
async def get_vehiculos_activos(empresa_id: int | None = None, db: Session = Depends(get_db)):
    resultado: list[dict] = []
    # Clientes activos
    cli_q = db.query(models.Vehiculo).filter(or_(models.Vehiculo.gps_activo == True, models.Vehiculo.gps_activo == 1))
    if empresa_id is not None:
        # limitar por usuarios asociados a la empresa
        links = db.query(models.EmpresaUsuario).filter(models.EmpresaUsuario.empresa_id == empresa_id).all()
        usuario_ids = [l.usuario_id for l in links]
        users = db.query(models.Registro).filter(models.Registro.identificador.in_(usuario_ids)).all()
        usernames = [u.username for u in users if getattr(u, 'username', None)]
        if usernames:
            cli_q = cli_q.filter(models.Vehiculo.username.in_(usernames))
        else:
            cli_q = cli_q.filter(models.Vehiculo.username.in_(["__none__"]))
    cli = cli_q.all()
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
        fun_q = db.query(models.VehiculoFuncionario).filter(or_(models.VehiculoFuncionario.gps_activo == True, models.VehiculoFuncionario.gps_activo == 1))
        if empresa_id is not None:
            links = db.query(models.EmpresaUsuario).filter(models.EmpresaUsuario.empresa_id == empresa_id).all()
            usuario_ids = [l.usuario_id for l in links]
            users = db.query(models.Registro).filter(models.Registro.identificador.in_(usuario_ids)).all()
            usernames = [u.username for u in users if getattr(u, 'username', None)]
            if usernames:
                fun_q = fun_q.filter(models.VehiculoFuncionario.username.in_(usernames))
            else:
                fun_q = fun_q.filter(models.VehiculoFuncionario.username.in_(["__none__"]))
        fun = fun_q.all()
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
async def get_vehiculos_inactivos(empresa_id: int | None = None, db: Session = Depends(get_db)):
    resultado: list[dict] = []
    # Clientes inactivos (False, 0 o NULL)
    cli_q = db.query(models.Vehiculo).filter(or_(models.Vehiculo.gps_activo == False, models.Vehiculo.gps_activo == 0, models.Vehiculo.gps_activo.is_(None)))
    if empresa_id is not None:
        links = db.query(models.EmpresaUsuario).filter(models.EmpresaUsuario.empresa_id == empresa_id).all()
        usuario_ids = [l.usuario_id for l in links]
        users = db.query(models.Registro).filter(models.Registro.identificador.in_(usuario_ids)).all()
        usernames = [u.username for u in users if getattr(u, 'username', None)]
        if usernames:
            cli_q = cli_q.filter(models.Vehiculo.username.in_(usernames))
        else:
            cli_q = cli_q.filter(models.Vehiculo.username.in_(["__none__"]))
    cli = cli_q.all()
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
        fun_q = db.query(models.VehiculoFuncionario).filter(or_(models.VehiculoFuncionario.gps_activo == False, models.VehiculoFuncionario.gps_activo == 0, models.VehiculoFuncionario.gps_activo.is_(None)))
        if empresa_id is not None:
            links = db.query(models.EmpresaUsuario).filter(models.EmpresaUsuario.empresa_id == empresa_id).all()
            usuario_ids = [l.usuario_id for l in links]
            users = db.query(models.Registro).filter(models.Registro.identificador.in_(usuario_ids)).all()
            usernames = [u.username for u in users if getattr(u, 'username', None)]
            if usernames:
                fun_q = fun_q.filter(models.VehiculoFuncionario.username.in_(usernames))
            else:
                fun_q = fun_q.filter(models.VehiculoFuncionario.username.in_(["__none__"]))
        fun = fun_q.all()
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

# ========================= In-app Alerts: Línea de Reacción =========================
# Almacenamiento en memoria para desarrollo
ALERTS_MEM: list[dict] = []  # { 'ts_ms': int, 'origin': str|None, 'message': str|None }

class AlertIn(BaseModel):
    origin: str | None = None
    message: str | None = None

@authRouter.post('/alertas/linea-reaccion')
async def crear_alerta_linea_reaccion(body: AlertIn | None = None):
    now_ms = int(datetime.utcnow().timestamp() * 1000)
    item = {
        'ts_ms': now_ms,
        'origin': (body.origin if body else None),
        'message': (body.message if body else 'Línea de Reacción activada')
    }
    ALERTS_MEM.append(item)
    # Mantener últimos 100
    if len(ALERTS_MEM) > 100:
        del ALERTS_MEM[:-100]
    return {'created': True, 'ts_ms': now_ms}

@authRouter.get('/alertas/ultimas')
async def obtener_alertas(since_ms: int | None = None, window_minutes: int = 10):
    """Devuelve alertas recientes. Si since_ms se provee, devuelve las posteriores.
    Si no, devuelve las alertas de los últimos 'window_minutes' minutos."""
    now_ms = int(datetime.utcnow().timestamp() * 1000)
    if since_ms is not None:
        filtered = [a for a in ALERTS_MEM if a.get('ts_ms', 0) > since_ms]
    else:
        cutoff = now_ms - window_minutes * 60 * 1000
        filtered = [a for a in ALERTS_MEM if a.get('ts_ms', 0) >= cutoff]
    return {'now_ms': now_ms, 'items': filtered}

# ========================= Empresa: listado de clientes con vehículos =========================
@authRouter.get('/empresa/clientes')
async def empresa_clientes(empresa_id: int | None = None, incluir_funcionarios: bool = False, db: Session = Depends(get_db)):
    """Lista los usuarios asociados a la empresa y sus vehículos.
    - Devuelve una fila por vehículo (incluye los asignados por la empresa porque se filtra por username).
    - Si un usuario no tiene vehículo, no se incluye.
    """
    if not empresa_id:
        return []
    # Usuarios vinculados a la empresa
    links = db.query(models.EmpresaUsuario).filter(models.EmpresaUsuario.empresa_id == empresa_id).all()
    if not links:
        return []
    usuario_ids = [l.usuario_id for l in links]
    if not usuario_ids:
        return []
    usuarios = db.query(models.Registro).filter(models.Registro.identificador.in_(usuario_ids)).all()
    if not usuarios:
        return []
    # Filtrar por tipo de usuario
    result = []
    for u in usuarios:
        tipo = (getattr(u, 'tipo_usuario', '') or '').lower()
        # incluir clientes y pime siempre; funcionarios sólo si se solicita
        if not incluir_funcionarios and tipo == 'funcionario':
            continue
        if tipo not in ('cliente', 'funcionario', 'pime'):
            continue
        # 1) Vehículos en tabla general (creados manualmente por el usuario)
        vehiculos_general = (
            db.query(models.Vehiculo)
            .filter(func.lower(models.Vehiculo.username) == func.lower(u.username))
            .all()
        )
        for v in vehiculos_general:
            result.append({
                'nombre': f"{getattr(u, 'nombres', '') or ''} {getattr(u, 'apellidos', '') or ''}".strip(),
                'identificacion': getattr(u, 'numero_identificacion', None),
                'celular': getattr(u, 'telefono', None),
                'placa': getattr(v, 'placa', None),
                'modelo': getattr(v, 'modelo', None),
                'color': getattr(v, 'color', None),
                'fecha_soat': getattr(v, 'fecha_soat', None),
                'fecha_tecno': getattr(v, 'fecha_tecno', None),
                # Propio para clientes y pime; asignado para funcionarios
                'origen': 'propio' if tipo in ('cliente', 'pime') else 'asignado',
                'tipo_usuario': tipo,
            })

        # 2) Vehículos en tabla de funcionarios (asignados por empresa)
        try:
            veh_fun = (
                db.query(models.VehiculoFuncionario)
                .filter(func.lower(models.VehiculoFuncionario.username) == func.lower(u.username))
                .all()
            )
        except Exception:
            veh_fun = []
        for v in veh_fun:
            result.append({
                'nombre': f"{getattr(u, 'nombres', '') or ''} {getattr(u, 'apellidos', '') or ''}".strip(),
                'identificacion': getattr(u, 'numero_identificacion', None),
                'celular': getattr(u, 'telefono', None),
                'placa': getattr(v, 'placa', None),
                'modelo': getattr(v, 'modelo', None),
                'color': getattr(v, 'color', None),
                'fecha_soat': getattr(v, 'fecha_soat', None) if hasattr(v,'fecha_soat') else None,
                'fecha_tecno': getattr(v, 'fecha_tecno', None) if hasattr(v,'fecha_tecno') else None,
                'origen': 'asignado',
                'tipo_usuario': 'funcionario',
            })
    return result