const API_URL = window.location.origin;

// Obtener código del turno de la URL
const urlParams = new URLSearchParams(window.location.search);
const codigoTurno = urlParams.get('codigo');

if (!codigoTurno) {
  alert('Código de turno no válido');
  window.location.href = '/';
}

let turnoData = null;

// Conectar Socket.io
const socket = io(API_URL);

socket.on('connect', () => {
  console.log('Conectado a Socket.io');
  // Notificar que se escaneó el QR
  socket.emit('qr-escaneado', { codigo: codigoTurno });
});

// Escuchar cuando se llama este turno
socket.on('turno-llamado', (data) => {
  if (data.codigo_turno === codigoTurno) {
    mostrarLlamada(data);
  }
});

// Cargar información del turno
async function cargarTurno() {
  try {
    const response = await fetch(`${API_URL}/api/turno/${codigoTurno}`);
    
    if (!response.ok) {
      throw new Error('Turno no encontrado');
    }

    turnoData = await response.json();

    // Mostrar información
    document.getElementById('turno-value').textContent = turnoData.codigo_turno;
    document.getElementById('pin-value').textContent = turnoData.pin;
    document.getElementById('tramite-value').textContent = turnoData.tramite_nombre;
    document.getElementById('cola-count').textContent = turnoData.posicion_cola;

    // Fecha y hora
    const fecha = new Date(turnoData.timestamp);
    document.getElementById('fecha').textContent = 
      fecha.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

    // Generar QR pequeño para el ticket
    const qrURL = `${API_URL}/turno.html?codigo=${turnoData.codigo_turno}`;
    new QRCode(document.getElementById('ticket-qrcode'), {
      text: qrURL,
      width: 150,
      height: 150,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });

  } catch (error) {
    console.error('Error al cargar turno:', error);
    alert('Error al cargar el turno');
  }
}

// Mostrar cuando se llama el turno
function mostrarLlamada(data) {
  const estadoText = document.getElementById('estado-text');
  estadoText.innerHTML = `
    <strong style="color: #e74c3c; font-size: 1.5rem;">
      🔔 SU TURNO HA SIDO LLAMADO
    </strong><br>
    Diríjase a: <strong>${data.ventanilla_nombre}</strong>
  `;
  
  // Vibrar si está disponible
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200, 100, 200]);
  }

  // Notificación de navegador (si está permitida)
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Su turno ha sido llamado', {
      body: `Diríjase a ${data.ventanilla_nombre}`,
      icon: '/icon.png'
    });
  }
}

// Descargar PDF
document.getElementById('btn-descargar').addEventListener('click', async () => {
  if (!turnoData) return;

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 120] // Tamaño ticket
    });

    // Configurar fuente
    doc.setFont('helvetica');

    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('OFICINA', 40, 15, { align: 'center' });

    // Fecha
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const fecha = new Date(turnoData.timestamp);
    const fechaStr = fecha.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(fechaStr, 40, 22, { align: 'center' });

    // Línea separadora
    doc.line(10, 25, 70, 25);

    // TURNO
    doc.setFontSize(12);
    doc.text('TURNO', 40, 32, { align: 'center' });
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(turnoData.codigo_turno, 40, 42, { align: 'center' });

    // PIN
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('PIN', 40, 50, { align: 'center' });
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(turnoData.pin, 40, 58, { align: 'center' });

    // Trámite
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Trámite', 40, 66, { align: 'center' });
    doc.setFontSize(12);
    doc.text(turnoData.tramite_nombre, 40, 72, { align: 'center' });

    // QR Code (obtener imagen del canvas)
    const qrCanvas = document.querySelector('#ticket-qrcode canvas');
    if (qrCanvas) {
      const qrImage = qrCanvas.toDataURL('image/png');
      doc.addImage(qrImage, 'PNG', 20, 78, 40, 40);
    }

    // Línea separadora
    doc.line(10, 95, 70, 95);

    // Footer
    doc.setFontSize(8);
    doc.text('Presente este ticket', 40, 102, { align: 'center' });
    doc.text('cuando sea llamado', 40, 107, { align: 'center' });

    // Guardar
    doc.save(`turno-${turnoData.codigo_turno}.pdf`);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    alert('Error al generar el PDF');
  }
});

// Pedir permiso para notificaciones
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// Inicializar
document.addEventListener('DOMContentLoaded', cargarTurno);