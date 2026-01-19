npm init -y
npm install express sqlite3 socket.io dotenv qrcode cors
npm install --save-dev nodemon

mkdir -p public/admin public/css public/js routes

npm run dev

- **Pantalla táctil (selección):** `http://localhost:3000`
- **Panel de administración:** `http://localhost:3000/admin/login.html`
- **Pantalla de sala de espera:** `http://localhost:3000/pantalla.html`

DELETE FROM turnos WHERE DATE(timestamp) < DATE('now');
cp database.sqlite database_backup_$(date +%Y%m%d).sqlite

```bash
# Si usas pm2
pm2 logs

# Si usas systemd
journalctl -u gestion-colas -f
```
## 🔌 Endpoints de la API

### **Público (turnos)**

```
GET  /api/tramites              # Lista trámites activos
POST /api/turno                 # Crear nuevo turno
GET  /api/turno/:codigo         # Obtener info de un turno
GET  /api/pantalla              # Estado actual de turnos (para display)
```

### **Admin (autenticado)**

```
POST /api/admin/login           # Login con usuario + PIN

# Configuración - Trámites
GET    /api/admin/tramites      # Listar todos
POST   /api/admin/tramites      # Crear
PUT    /api/admin/tramites/:id  # Actualizar
DELETE /api/admin/tramites/:id  # Eliminar

# Configuración - Ventanillas
GET    /api/admin/ventanillas   # Listar todas
POST   /api/admin/ventanillas   # Crear
PUT    /api/admin/ventanillas/:id  # Actualizar
DELETE /api/admin/ventanillas/:id  # Eliminar

# Gestión de colas
GET  /api/admin/colas           # Estado de todas las colas
POST /api/admin/siguiente       # Llamar siguiente turno
POST /api/admin/rellamar        # Rellamar turno actual
```

### **WebSocket (Socket.io)**

```
# Cliente escucha:
turno-creado          # Nuevo turno generado
turno-llamado         # Turno llamado a ventanilla
qr-escaneado          # QR fue escaneado (para pantalla táctil)
pantalla-actualizada  # Estado general actualizado

# Cliente emite:
escanear-qr           # Notifica que se escaneó un QR

# Eliminar la base de datos
rm database.sqlite

# Volver a iniciar
npm run dev