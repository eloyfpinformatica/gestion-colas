const API_URL = window.location.origin;
const socket = io(API_URL);

let ultimaLlamada = null;

// Actualizar reloj
function actualizarReloj() {
  const ahora = new Date();
  const horas = String(ahora.getHours()).padStart(2, '0');
  const minutos = String(ahora.getMinutes()).padStart(2, '0');
  const segundos = String(ahora.getSeconds()).padStart(2, '0');
  
  document.getElementById('reloj').textContent = `${horas}:${minutos}:${segundos}`;
}

setInterval(actualizarReloj, 1000);
actualizarReloj();

// Cargar estado de la pantalla
async function cargarEstado() {
  try {
    const response = await fetch(`${API_URL}/api/pantalla`);
    const data = await response.json();

    mostrarVentanillas(data.turnos_llamados);
    mostrarContadores(data.contadores);
  } catch (error) {
    console.error('Error al cargar estado:', error);
  }
}

// Mostrar ventanillas con turnos actuales
function mostrarVentanillas(turnos) {
  const grid = document.getElementById('ventanillas-grid');
  
  if (turnos.length === 0) {
    grid.innerHTML = '<p class="sin-turnos">No hay turnos en atención</p>';
    return;
  }

  grid.innerHTML = turnos.map(turno => `
    <div class="ventanilla-card">
      <div class="ventanilla-nombre">${turno.ventanilla_nombre}</div>
      <div class="ventanilla-turno">${turno.codigo_turno}</div>
      <div class="ventanilla-tramite">${turno.tramite_nombre}</div>
    </div>
  `).join('');
}

// Mostrar contadores de cola
function mostrarContadores(contadores) {
  const grid = document.getElementById('contadores-grid');
  
  if (contadores.length === 0) {
    grid.innerHTML = '<p class="sin-cola">No hay turnos en espera</p>';
    return;
  }

  grid.innerHTML = contadores.map(contador => `
    <div class="contador-card">
      <div class="contador-codigo">${contador.codigo}</div>
      <div class="contador-nombre">${contador.nombre}</div>
      <div class="contador-cantidad">${contador.cantidad}</div>
    </div>
  `).join('');
}

// Mostrar última llamada destacada
function mostrarLlamada(turno) {
  ultimaLlamada = turno;
  
  const llamadaDiv = document.getElementById('ultima-llamada');
  document.getElementById('llamada-turno').textContent = turno.codigo_turno;
  document.getElementById('llamada-ventanilla-nombre').textContent = turno.ventanilla_nombre;
  
  // Mostrar con animación
  llamadaDiv.style.display = 'flex';
  llamadaDiv.classList.add('animate-in');
  
  // Reproducir sonido (opcional)
  reproducirSonido();
  
  // Ocultar después de 10 segundos
  setTimeout(() => {
    llamadaDiv.classList.remove('animate-in');
    llamadaDiv.classList.add('animate-out');
    
    setTimeout(() => {
      llamadaDiv.style.display = 'none';
      llamadaDiv.classList.remove('animate-out');
    }, 500);
  }, 10000);
}

// Reproducir sonido de notificación
function reproducirSonido() {
  // Crear un beep simple con Web Audio API
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.log('No se pudo reproducir el sonido');
  }
}

// Socket.io eventos
socket.on('connect', () => {
  console.log('Conectado a Socket.io');
  cargarEstado();
});

socket.on('turno-creado', () => {
  cargarEstado();
});

socket.on('turno-llamado', (turno) => {
  mostrarLlamada(turno);
  cargarEstado();
});

socket.on('pantalla-actualizada', () => {
  cargarEstado();
});

// Recargar estado cada 30 segundos (por si acaso)
setInterval(cargarEstado, 30000);

// Inicializar
document.addEventListener('DOMContentLoaded', cargarEstado);