const API_URL = window.location.origin;

// Obtener UUID del turno de la URL
const urlParams = new URLSearchParams(window.location.search);
const uuid = urlParams.get('uuid');

if (!uuid) {
  alert('Codi del torn invàlid');
  window.location.href = '/';
}

let turnoData = null;

// Conectar Socket.io
const socket = io(API_URL);

socket.on('connect', () => {
  console.log('Connectat a Socket.io');
  // Notificar que se escaneó el QR
  socket.emit('qr-escaneado', { uuid: uuid });
});

// Escuchar cuando se llama este turno
socket.on('turno-llamado', (data) => {
  if (turnoData && data.codigo_turno === turnoData.codigo_turno) {
    mostrarLlamada(data);
  }
});

// Cargar información del turno
async function cargarTurno() {
  try {
    const response = await fetch(`${API_URL}/api/turno/${uuid}`);
    
    if (!response.ok) {
      throw new Error('Torn no trobat');
    }

    turnoData = await response.json();

    // Mostrar información
    document.getElementById('turno-value').textContent = turnoData.codigo_turno;
    document.getElementById('pin-value').textContent = turnoData.pin;
    document.getElementById('tramite-value').textContent = turnoData.tramite_nombre;

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

    // Descargar PDF automáticamente
    setTimeout(() => {
      descargarPDF();
    }, 500);

  } catch (error) {
    console.error('Error en carregar el torn:', error);
    alert('Error en carregar el torn');
  }
}

// Función para descargar PDF
function descargarPDF() {
  if (!turnoData) return;

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 100]
    });

    doc.setFont('helvetica');

    // Título
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('IES MARÍA ENRÍQUEZ', 40, 15, { align: 'center' });

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

    doc.line(10, 25, 70, 25);

    // TURNO
    doc.setFontSize(12);
    doc.text('TORN', 40, 35, { align: 'center' });
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(turnoData.codigo_turno, 40, 48, { align: 'center' });

    // PIN
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('PIN', 40, 58, { align: 'center' });
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(turnoData.pin, 40, 68, { align: 'center' });

    // Trámite
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Tràmit', 40, 78, { align: 'center' });
    doc.setFontSize(12);
    doc.text(turnoData.tramite_nombre, 40, 85, { align: 'center' });

    doc.line(10, 90, 70, 90);

    // Footer
    doc.setFontSize(8);
    doc.text('Presente aquest ticket quan el criden', 40, 96, { align: 'center' });

    doc.save(`turno-${turnoData.codigo_turno}.pdf`);
  } catch (error) {
    console.error('Error en generar PDF:', error);
    alert('Error en generar el PDF');
  }
}

// El botón permite volver a descargar si es necesario
document.getElementById('btn-descargar').addEventListener('click', descargarPDF);

// Mostrar cuando se llama el turno
function mostrarLlamada(data) {
  const estadoText = document.getElementById('estado-text');
  estadoText.innerHTML = `
    <strong style="color: #3d3d3dff; font-size: 1.2rem;">
      🔔 EL SEU TORN HA SIGUT CRIDAT
    </strong><br>
    Vaja a: <strong>${data.ventanilla_nombre}</strong>
  `;
  
  // Vibrar si está disponible
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200, 100, 200]);
  }

  // Notificación de navegador (si está permitida)
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('El seu torn ha sigut cridat', {
      body: `Vaja a ${data.ventanilla_nombre}`,
      icon: '/icon.png'
    });
  }
}

// Pedir permiso para notificaciones
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// Inicializar
document.addEventListener('DOMContentLoaded', cargarTurno);