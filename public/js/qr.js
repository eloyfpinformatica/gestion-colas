const API_URL = window.location.origin;
let countdownTimer;
let timeRemaining = 60;

// Obtener UUID del turno de la URL
const urlParams = new URLSearchParams(window.location.search);
const uuid = urlParams.get('uuid');

if (!uuid) {
  window.location.href = '/';
}

// Conectar Socket.io
const socket = io(API_URL);

socket.on('connect', () => {
  console.log('Conectado a Socket.io');
});

// Cargar información del turno
async function cargarTurno() {
  try {
    const response = await fetch(`${API_URL}/api/turno/${uuid}`);
    
    if (!response.ok) {
      throw new Error('Turno no encontrado');
    }

    const turno = await response.json();

    // Mostrar número y PIN
    document.getElementById('turno-numero').textContent = turno.codigo_turno;
    document.getElementById('pin-numero').textContent = turno.pin;

    // Generar QR con URL al turno usando UUID
    const qrURL = `${API_URL}/turno.html?uuid=${uuid}`;
    new QRCode(document.getElementById('qrcode'), {
      text: qrURL,
      width: 220,
      height: 220,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });

    // Iniciar countdown
    iniciarCountdown();

  } catch (error) {
    console.error('Error al cargar turno:', error);
    alert('Error al cargar el turno');
    window.location.href = '/';
  }
}

// Countdown timer
function iniciarCountdown() {
  const countdownElement = document.getElementById('countdown');
  
  countdownTimer = setInterval(() => {
    timeRemaining--;
    countdownElement.textContent = timeRemaining;

    if (timeRemaining <= 0) {
      volverAlInicio();
    }
  }, 1000);
}

// Reducir countdown cuando se escanea el QR
socket.on('qr-escaneado', (data) => {
  if (data.uuid === uuid) {
    if (timeRemaining > 5) {
      timeRemaining = 5;
      document.getElementById('timer-text').innerHTML = 
        '✓ QR escaneado. Volviendo al inicio en <span id="countdown">5</span> segundos';
      document.getElementById('countdown').textContent = timeRemaining;
    }
  }
});

// Volver al inicio
function volverAlInicio() {
  clearInterval(countdownTimer);
  window.location.href = '/';
}

// Botón "Ya tengo mi turno"
document.getElementById('btn-listo').addEventListener('click', volverAlInicio);

// Inicializar
document.addEventListener('DOMContentLoaded', cargarTurno);