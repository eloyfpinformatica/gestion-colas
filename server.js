require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./database');

// Inicializar base de datos
initDB();

// Crear app Express
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rutas
const turnosRoutes = require('./routes/turnos');
const adminRoutes = require('./routes/admin');
const pantallaRoutes = require('./routes/pantalla');

app.use('/api', turnosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pantalla', pantallaRoutes);

// Hacer io accesible en las rutas
app.set('io', io);

// Socket.io - Conexiones en tiempo real
io.on('connection', (socket) => {
  console.log('✓ Cliente conectado:', socket.id);

  // Evento: QR escaneado
  socket.on('qr-escaneado', (data) => {
    console.log('QR escaneado:', data.codigo);
    io.emit('qr-escaneado', data);
  });

  // Desconexión
  socket.on('disconnect', () => {
    console.log('✗ Cliente desconectado:', socket.id);
  });
});

// Puerto
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`📱 Pantalla táctil: http://localhost:${PORT}`);
  console.log(`👤 Admin: http://localhost:${PORT}/admin/login.html`);
  console.log(`📺 Display: http://localhost:${PORT}/pantalla.html`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

module.exports = { app, io };