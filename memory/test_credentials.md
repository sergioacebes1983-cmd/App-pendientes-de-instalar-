# Test credentials
- Admin: admin@telecom.es / Admin123!  (role admin)
- Worker: tecnico@telecom.es / Tecnico123!  (role trabajador)
Login at /login. Session = httpOnly cookie.
NOTE: the user has since changed the admin password and deactivated tecnico@telecom.es in the live DB — do NOT reset them.
For tests, insert a temporary user directly in Mongo (bcrypt hash via lib.auth.hash_password; use a real-looking domain, EmailStr rejects .local) and delete it afterwards.
