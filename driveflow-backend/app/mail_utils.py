import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

SMTP_HOST = os.getenv('DF_SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('DF_SMTP_PORT', '587'))
SMTP_USER = os.getenv('DF_SMTP_USER', '')
SMTP_PASS = os.getenv('DF_SMTP_PASS', '')
SENDER = os.getenv('DF_MAIL_SENDER', SMTP_USER)


def send_reset_email(to_email: str, reset_link: str):
  if not (SMTP_USER and SMTP_PASS and SENDER):
    raise RuntimeError('SMTP no configurado. Define DF_SMTP_USER, DF_SMTP_PASS y DF_MAIL_SENDER')

  msg = MIMEMultipart('alternative')
  msg['Subject'] = 'Recupera tu contraseña - DriveFlow'
  msg['From'] = SENDER
  msg['To'] = to_email

  html = f"""
  <html>
    <body>
      <p>Hola,<br/>
         Recibimos una solicitud para restablecer tu contraseña.<br/>
         Haz clic en el siguiente enlace (válido por 30 minutos):<br/>
         <a href='{reset_link}'>{reset_link}</a>
      </p>
      <p>Si no fuiste tú, ignora este correo.</p>
    </body>
  </html>
  """
  msg.attach(MIMEText(html, 'html', 'utf-8'))

  with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
    server.starttls()
    server.login(SMTP_USER, SMTP_PASS)
    server.sendmail(SENDER, [to_email], msg.as_string())
