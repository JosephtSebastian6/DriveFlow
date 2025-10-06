import os
import sqlite3
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from dotenv import load_dotenv

from .mail_utils import send_reset_email

DB_PATH = os.environ.get("DF_DB_PATH", os.path.join(os.path.dirname(__file__), "driveflow.db"))
PWD_CONTEXT = CryptContext(schemes=["bcrypt"], deprecated="auto")

load_dotenv()

app = FastAPI(title="DriveFlow Backend - Password Reset")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://127.0.0.1:4200",
    ],
    allow_credentials=True,
    allow_methods=["*"]
    ,
    allow_headers=["*"]
)


# ---------- DB helpers ----------

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user'
        );
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        """
    )
    # Seed admin if not exists (dev only)
    cur.execute("SELECT id FROM users WHERE email = ?", ("admin@example.com",))
    if not cur.fetchone():
        cur.execute(
            "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
            ("admin@example.com", PWD_CONTEXT.hash("admin123"), "admin"),
        )
    conn.commit()
    conn.close()


init_db()


# ---------- Schemas ----------

class ResetRequestIn(BaseModel):
    email: EmailStr


class ResetConfirmIn(BaseModel):
    token: str
    new_password: str


# ---------- Endpoints ----------

@app.post("/auth/password-reset/request")
async def request_password_reset(payload: ResetRequestIn):
    # Always return 200 to avoid user enumeration
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, email FROM users WHERE email = ?", (payload.email.lower(),))
    user = cur.fetchone()
    if user:
        token = secrets.token_urlsafe(32)
        expires_at = (datetime.utcnow() + timedelta(minutes=30)).isoformat()
        cur.execute(
            "INSERT INTO reset_tokens (user_id, token, expires_at, used) VALUES (?, ?, ?, 0)",
            (user["id"], token, expires_at),
        )
        conn.commit()
        try:
            frontend_base = os.getenv("DF_FRONTEND_BASE", "http://localhost:4200")
            reset_link = f"{frontend_base}/reset-password?token={token}"
            send_reset_email(to_email=user["email"], reset_link=reset_link)
        except Exception as e:
            # Fallback: log to console in dev
            print("[MailFallback] Reset link:", reset_link, "error:", e)
    conn.close()
    return {"ok": True}


@app.post("/auth/password-reset/confirm")
async def confirm_password_reset(payload: ResetConfirmIn):
    if not payload.new_password or len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña es muy corta")

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id, user_id, expires_at, used FROM reset_tokens WHERE token = ?", (payload.token,))
    row = cur.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=400, detail="Token inválido")

    if row["used"]:
        conn.close()
        raise HTTPException(status_code=400, detail="Token ya utilizado")

    if datetime.utcnow() > datetime.fromisoformat(row["expires_at"]):
        conn.close()
        raise HTTPException(status_code=400, detail="Token expirado")

    # Actualizar contraseña
    new_hash = PWD_CONTEXT.hash(payload.new_password)
    cur.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, row["user_id"]))
    cur.execute("UPDATE reset_tokens SET used = 1 WHERE id = ?", (row["id"],))
    conn.commit()
    conn.close()
    return {"ok": True}


@app.get("/")
async def root():
    return {"service": "DriveFlow password reset API", "status": "ok"}
