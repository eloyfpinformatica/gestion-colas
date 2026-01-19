const API_URL = window.location.origin;

// Cargar trámites disponibles
async function cargarTramites() {
  try {
    const response = await fetch(`${API_URL}/api/tramites`);
    const tramites = await response.json();

    const container = document.getElementById('tramites-container');
    container.innerHTML = '';

    if (tramites.length === 0) {
      container.innerHTML = '<p class="no-tramites">No hay trámites disponibles en este momento</p>';
      return;
    }

    tramites.forEach(tramite => {
      const card = document.createElement('div');
      card.className = 'tramite-card';
      card.innerHTML = `
        <div class="tramite-nombre">${tramite.nombre}</div>
        <div class="tramite-codigo">${tramite.codigo}</div>
      `;
      
      card.addEventListener('click', () => seleccionarTramite(tramite));
      container.appendChild(card);
    });
  } catch (error) {
    console.error('Error al cargar trámites:', error);
    document.getElementById('tramites-container').innerHTML = 
      '<p class="error">Error al cargar trámites. Por favor, intente nuevamente.</p>';
  }
}

// Seleccionar trámite y generar turno
async function seleccionarTramite(tramite) {
  try {
    // Mostrar loading
    const container = document.getElementById('tramites-container');
    const originalContent = container.innerHTML;
    container.innerHTML = '<div class="loading">Generando su turno...</div>';

    const response = await fetch(`${API_URL}/api/turno`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tramite_id: tramite.id })
    });

    if (!response.ok) {
      throw new Error('Error al generar turno');
    }

    const turno = await response.json();

    // Redirigir a pantalla de QR con el código del turno
    window.location.href = `/qr.html?uuid=${turno.uuid}`;
  } catch (error) {
    console.error('Error al generar turno:', error);
    alert('Error al generar el turno. Por favor, intente nuevamente.');
    cargarTramites(); // Recargar trámites
  }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  cargarTramites();
});