PASOS RAPIDOS
1. Sube este proyecto a Railway.
2. En Variables agrega DATABASE_URL con la cadena de Neon.
3. Railway instalará dependencias y al primer acceso la app creará tablas y cargará datos demo automáticamente.
4. Usuarios demo:
   admin@ventamx.com / admin123
   supervisor@ventamx.com / supervisor123
   cajero@ventamx.com / cajero123


Ajustes: la raíz redirige a /login, el arranque usa standalone en Railway y SEED_DEMO está desactivado por defecto. Si quieres demo data, agrega SEED_DEMO=true.
