const API_URL = window.location.origin;
const token = localStorage.getItem("admin_token");

// Verificar autenticación
if (!token) {
  window.location.href = "/admin/login.html";
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
};

// Socket.io
const socket = io(API_URL);

// ========== NAVEGACIÓN TABS ==========

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;

    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(`tab-${tab}`).classList.add("active");

    if (tab === "gestion") {
      cargarGestionColas();
    } else if (tab === "config") {
      cargarConfiguracion();
    }
  });
});

// ========== LOGOUT ==========

document.getElementById("btn-logout").addEventListener("click", () => {
  localStorage.removeItem("admin_token");
  window.location.href = "/admin/login.html";
});

// ========== GESTIÓN DE COLAS ==========

async function cargarGestionColas() {
  try {
    const response = await fetch(`${API_URL}/api/admin/colas`, { headers });
    const ventanillas = await response.json();

    const container = document.getElementById("ventanillas-gestion");

    if (ventanillas.length === 0) {
      container.innerHTML = '<p class="no-data">No hi ha finestres actives</p>';
      return;
    }

    container.innerHTML = ventanillas
      .map(
        (v) => `
      <div class="ventanilla-gestion-card">
        <div class="ventanilla-gestion-header">
          <h3>${v.nombre}</h3>
          <span class="badge ${v.activa ? "badge-success" : "badge-danger"}">
            ${v.activa ? "Activa" : "Inactiva"}
          </span>
        </div>
                
        <div class="ventanilla-gestion-body">
          <div class="tramites-info">
            <strong>Atén:</strong> ${v.tramites.map((t) => t.codigo).join(", ") || "Ninguno"}
          </div>
          
          <div class="turno-actual">
            ${v.turno_actual
            ? `
              <div class="turno-actual-info">
                <span class="label">Torn Actual:</span>
                <span class="turno">${v.turno_actual.codigo_turno}</span>
                <span class="pin">PIN: ${v.turno_actual.pin}</span>
              </div>
            `
            : `
              <p class="sin-turno">Sense torn en atenció</p>
            `
          }
          </div>
          
          <div class="cola-info">
            <strong>En espera:</strong>
            ${Object.entries(v.cola)
            .map(
              ([codigo, cant]) =>
                `<span class="cola-badge">${codigo}: ${cant}</span>`,
            )
            .join(" ")}
          </div>
          
          <div class="ventanilla-actions">
            <button class="btn-primary" onclick="llamarSiguiente(${v.id})">
              Següent torn
            </button>
            ${v.turno_actual
            ? `
              <button class="btn-secondary" onclick="rellamarTurno(${v.id})">
                Tornar a cridar
              </button>
            `
            : ""
          }
          </div>
          <!-- <div id="info-ventanilla-${v.id}" class="modal-info" style="display: block;">📢 La cua està buida</div> -->
        </div>
      </div>
    `,
      )
      .join("");
  } catch (error) {
    console.error("Error en carregar la gestió:", error);
    if (error.message.includes("401")) {
      localStorage.removeItem("admin_token");
      window.location.href = "/admin/login.html";
    }
  }
}

async function llamarSiguiente(ventanillaId) {
  try {
    const response = await fetch(`${API_URL}/api/admin/siguiente`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ventanilla_id: ventanillaId })
    });

    const data = await response.json();

    if (data.mensaje) {
      showToast(data.mensaje, 'info');
    } else {
      showToast('Turno llamado correctamente', 'success', 2000);
      cargarGestionColas();
    }
  } catch (error) {
    console.error('Error al llamar siguiente:', error);
    showToast('Error al llamar siguiente turno', 'error');
  }
}

async function rellamarTurno(ventanillaId) {
  try {
    await fetch(`${API_URL}/api/admin/rellamar`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ventanilla_id: ventanillaId })
    });

    showToast('Turno rellamado', 'success', 2000);
  } catch (error) {
    console.error('Error al rellamar:', error);
    showToast('Error al rellamar turno', 'error');
  }
}

// ========== CONFIGURACIÓN ==========

async function cargarConfiguracion() {
  await cargarTramites();
  await cargarVentanillas();
}

// TRÁMITES

async function cargarTramites() {
  try {
    const response = await fetch(`${API_URL}/api/admin/tramites`, { headers });
    const tramites = await response.json();

    const list = document.getElementById('tramites-list');

    if (tramites.length === 0) {
      list.innerHTML = '<p class="no-data">No hi ha tràmits configurats</p>';
      return;
    }

    list.innerHTML = tramites.map(t => `
      <div class="item-card">
        <div class="item-info">
          <span class="item-codigo">${t.codigo}</span>
          <span class="item-nombre">${t.nombre}</span>
          <span class="badge ${t.activo ? 'badge-success' : 'badge-danger'}">
            ${t.activo ? 'Actiu' : 'Inactiu'}
          </span>
        </div>
        <div class="item-actions">
          <label class="switch">
            <input type="checkbox" ${t.activo ? 'checked' : ''} 
              onchange="toggleTramite(${t.id}, this.checked)">
            <span class="slider"></span>
          </label>
          <button class="btn-edit" onclick="editarTramite(${t.id})">
            <i data-lucide="pencil"></i>
          </button>
          <button class="btn-delete" onclick="eliminarTramite(${t.id})">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `).join('');

    lucide.createIcons();
  } catch (error) {
    console.error('Error en carregar els tràmits:', error);
  }
}

document.getElementById("btn-add-tramite").addEventListener("click", () => {
  document.getElementById("modal-tramite-title").textContent = "Nou Tràmit";
  document.getElementById("form-tramite").reset();
  document.getElementById("tramite-id").value = "";
  document.getElementById("tramite-activo").checked = true;
  document.getElementById("error-tramite").style.display = "none";
  abrirModal("modal-tramite");
});

async function editarTramite(id) {
  try {
    const response = await fetch(`${API_URL}/api/admin/tramites`, { headers });
    const tramites = await response.json();
    const tramite = tramites.find((t) => t.id === id);

    if (!tramite) return;

    document.getElementById("modal-tramite-title").textContent =
      "Editar Tràmit";
    document.getElementById("tramite-id").value = tramite.id;
    document.getElementById("tramite-nombre").value = tramite.nombre;
    document.getElementById("tramite-codigo").value = tramite.codigo;
    document.getElementById("tramite-activo").checked = tramite.activo === 1;
    document.getElementById("error-tramite").style.display = "none"; // AÑADIR ESTA LÍNEA

    abrirModal("modal-tramite");
  } catch (error) {
    console.error("Error en carregar el tràmit:", error);
  }
}

async function eliminarTramite(id) {
  const confirmed = await showConfirm(
    'Eliminar trámite',
    '¿Está seguro de que desea eliminar este trámite?'
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`${API_URL}/api/admin/tramites/${id}`, {
      method: 'DELETE',
      headers
    });

    if (response.ok) {
      showToast('Trámite eliminado', 'success');
      cargarTramites();
    } else {
      const result = await response.json();
      showToast(result.error, 'error');
    }
  } catch (error) {
    console.error('Error al eliminar trámite:', error);
    showToast('Error al eliminar trámite', 'error');
  }
}

async function toggleTramite(id, activo) {
  try {
    const response = await fetch(`${API_URL}/api/admin/tramites`, { headers });
    const tramites = await response.json();
    const tramite = tramites.find(t => t.id === id);

    if (!tramite) return;

    const res = await fetch(`${API_URL}/api/admin/tramites/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        nombre: tramite.nombre,
        codigo: tramite.codigo,
        activo: activo
      })
    });

    if (res.ok) {
      showToast(`Trámite ${activo ? 'activado' : 'desactivado'}`, 'success', 2000);
      cargarTramites();
    } else {
      const result = await res.json();
      showToast(result.error, 'error');
      cargarTramites();
    }
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    showToast('Error al cambiar el estado del trámite', 'error');
    cargarTramites();
  }
}

document
  .getElementById("form-tramite")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    // Ocultar error previo
    const errorDiv = document.getElementById("error-tramite");
    errorDiv.style.display = "none";

    const id = document.getElementById("tramite-id").value;
    const data = {
      nombre: document.getElementById("tramite-nombre").value,
      codigo: document.getElementById("tramite-codigo").value.toUpperCase(),
      activo: document.getElementById("tramite-activo").checked,
    };

    try {
      const url = id
        ? `${API_URL}/api/admin/tramites/${id}`
        : `${API_URL}/api/admin/tramites`;
      const method = id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        errorDiv.textContent = result.error || "Error en guardar el tràmit";
        errorDiv.style.display = "block";
        return;
      }

      cerrarModal("modal-tramite");
      cargarTramites();
    } catch (error) {
      console.error("Error en guardar el tràmit:", error);
      errorDiv.textContent = "Error en connectar amb el servidor";
      errorDiv.style.display = "block";
    }
  });

// VENTANILLAS

async function cargarVentanillas() {
  try {
    const response = await fetch(`${API_URL}/api/admin/ventanillas`, { headers });
    const ventanillas = await response.json();

    const list = document.getElementById('ventanillas-list');

    if (ventanillas.length === 0) {
      list.innerHTML = '<p class="no-data">No hi ha finestres configurades</p>';
      return;
    }

    list.innerHTML = ventanillas.map(v => `
      <div class="item-card">
        <div class="item-info">
          <span class="item-nombre">${v.nombre}</span>
          <span class="item-detail">Atén: ${v.tramites.map(t => t.codigo).join(', ') || 'Cap'}</span>
          <span class="badge ${v.activa ? 'badge-success' : 'badge-danger'}">
            ${v.activa ? 'Activa' : 'Inactiva'}
          </span>
        </div>
        <div class="item-actions">
          <label class="switch">
            <input type="checkbox" ${v.activa ? 'checked' : ''} 
              onchange="toggleVentanilla(${v.id}, this.checked)">
            <span class="slider"></span>
          </label>
          <button class="btn-edit" onclick="editarVentanilla(${v.id})">
            <i data-lucide="pencil"></i>
          </button>
          <button class="btn-delete" onclick="eliminarVentanilla(${v.id})">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `).join('');

    lucide.createIcons();
  } catch (error) {
    console.error('Error en carregar les finestres', error);
  }
}

document
  .getElementById("btn-add-ventanilla")
  .addEventListener("click", async () => {
    document.getElementById("modal-ventanilla-title").textContent =
      "Nueva Ventanilla";
    document.getElementById("form-ventanilla").reset();
    document.getElementById("ventanilla-id").value = "";
    document.getElementById("ventanilla-activa").checked = true;
    document.getElementById("error-tramite").style.display = "none";

    await cargarTramitesCheckbox();
    abrirModal("modal-ventanilla");
  });

async function editarVentanilla(id) {
  try {
    const response = await fetch(`${API_URL}/api/admin/ventanillas`, {
      headers,
    });
    const ventanillas = await response.json();
    const ventanilla = ventanillas.find((v) => v.id === id);

    if (!ventanilla) return;

    document.getElementById("modal-ventanilla-title").textContent =
      "Editar Finestra";
    document.getElementById("ventanilla-id").value = ventanilla.id;
    document.getElementById("ventanilla-nombre").value = ventanilla.nombre;
    document.getElementById("ventanilla-activa").checked =
      ventanilla.activa === 1;
    document.getElementById("error-tramite").style.display = "none";

    await cargarTramitesCheckbox(ventanilla.tramites.map((t) => t.id));
    abrirModal("modal-ventanilla");
  } catch (error) {
    console.error("Error en carregar la finestra:", error);
  }
}

async function eliminarVentanilla(id) {
  const confirmed = await showConfirm(
    'Eliminar ventanilla',
    '¿Está seguro de que desea eliminar esta ventanilla?'
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`${API_URL}/api/admin/ventanillas/${id}`, {
      method: 'DELETE',
      headers
    });

    if (response.ok) {
      showToast('Ventanilla eliminada', 'success');
      cargarVentanillas();
    } else {
      const result = await response.json();
      showToast(result.error, 'error');
    }
  } catch (error) {
    console.error('Error al eliminar ventanilla:', error);
    showToast('Error al eliminar ventanilla', 'error');
  }
}

async function toggleVentanilla(id, activa) {
  try {
    const response = await fetch(`${API_URL}/api/admin/ventanillas`, { headers });
    const ventanillas = await response.json();
    const ventanilla = ventanillas.find(v => v.id === id);

    if (!ventanilla) return;

    await fetch(`${API_URL}/api/admin/ventanillas/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        nombre: ventanilla.nombre,
        activa: activa,
        tramite_ids: ventanilla.tramites.map(t => t.id)
      })
    });

    cargarVentanillas();

    // Si estamos en la pestaña de gestión, recargar también
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    if (activeTab === 'gestion') {
      cargarGestionColas();
    }
  } catch (error) {
    console.error('Error en canviar l\'estat:', error);
    alert('Error en canviar l\'estat de la finestra');
    cargarVentanillas(); // Recargar para revertir el cambio visual
  }
}

async function cargarTramitesCheckbox(selectedIds = []) {
  try {
    const response = await fetch(`${API_URL}/api/admin/tramites`, { headers });
    const tramites = await response.json();

    const container = document.getElementById("ventanilla-tramites");
    container.innerHTML = tramites
      .map(
        (t) => `
      <label class="checkbox-label">
        <input type="checkbox" name="tramites" value="${t.id}" 
          ${selectedIds.includes(t.id) ? "checked" : ""}>
        ${t.codigo} - ${t.nombre}
      </label>
    `,
      )
      .join("");
  } catch (error) {
    console.error("Error en carregar els tràmits:", error);
  }
}

document
  .getElementById("form-ventanilla")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    // Ocultar error previo
    const errorDiv = document.getElementById("error-ventanilla");
    errorDiv.style.display = "none";

    const id = document.getElementById("ventanilla-id").value;
    const checkboxes = document.querySelectorAll(
      'input[name="tramites"]:checked',
    );
    const tramiteIds = Array.from(checkboxes).map((cb) => parseInt(cb.value));

    const data = {
      nombre: document.getElementById("ventanilla-nombre").value,
      activa: document.getElementById("ventanilla-activa").checked,
      tramite_ids: tramiteIds,
    };

    try {
      const url = id
        ? `${API_URL}/api/admin/ventanillas/${id}`
        : `${API_URL}/api/admin/ventanillas`;
      const method = id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        errorDiv.textContent = result.error || "Error en guardar la finestra";
        errorDiv.style.display = "block";
        return;
      }

      cerrarModal("modal-ventanilla");
      cargarVentanillas();
    } catch (error) {
      console.error("Error en guardar la finestra:", error);
      errorDiv.textContent = "Error en connectar amb el servidor";
      errorDiv.style.display = "block";
    }
  });

// ========== MODALES ==========

function abrirModal(modalId) {
  document.getElementById(modalId).style.display = "block";
}

function cerrarModal(modalId) {
  document.getElementById(modalId).style.display = "none";
}

document.querySelectorAll(".modal-close").forEach((btn) => {
  btn.addEventListener("click", function () {
    this.closest(".modal").style.display = "none";
  });
});

window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) {
    e.target.style.display = "none";
  }
});

// ========== SOCKET.IO ==========

socket.on("turno-llamado", () => {
  const activeTab = document.querySelector(".tab-btn.active").dataset.tab;
  if (activeTab === "gestion") {
    cargarGestionColas();
  }
});

socket.on("turno-creado", () => {
  const activeTab = document.querySelector(".tab-btn.active").dataset.tab;
  if (activeTab === "gestion") {
    cargarGestionColas();
  }
});

// ========== RESET TURNOS ==========

document.getElementById('btn-reset-turnos').addEventListener('click', async () => {
  const confirmed = await showConfirm(
    'Resetear turnos',
    'Esto eliminará TODOS los turnos del sistema. Esta acción NO se puede deshacer. ¿Está seguro?'
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`${API_URL}/api/admin/reset-turnos`, {
      method: 'POST',
      headers
    });

    const result = await response.json();

    if (response.ok) {
      showToast(result.mensaje, 'success');

      const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
      if (activeTab === 'gestion') {
        cargarGestionColas();
      }
    } else {
      showToast(result.error, 'error');
    }
  } catch (error) {
    console.error('Error al resetear turnos:', error);
    showToast('Error al resetear turnos', 'error');
  }
});


// ========== SISTEMA DE NOTIFICACIONES ==========

function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  };

  const titles = {
    success: 'Éxito',
    error: 'Error',
    warning: 'Advertencia',
    info: 'Información'
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <div class="toast-content">
      <div class="toast-title">${titles[type]}</div>
      <div class="toast-message">${message}</div>
    </div>
    <div class="toast-close">×</div>
  `;

  container.appendChild(toast);

  // Cerrar al hacer click en X
  toast.querySelector('.toast-close').addEventListener('click', () => {
    closeToast(toast);
  });

  // Auto-cerrar
  if (duration > 0) {
    setTimeout(() => {
      closeToast(toast);
    }, duration);
  }
}

function closeToast(toast) {
  toast.classList.add('removing');
  setTimeout(() => {
    toast.remove();
  }, 300);
}

function showConfirm(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const messageEl = document.getElementById('confirm-modal-message');
    const cancelBtn = document.getElementById('confirm-cancel');
    const okBtn = document.getElementById('confirm-ok');

    titleEl.textContent = title;
    messageEl.textContent = message;
    modal.style.display = 'block';

    function cleanup() {
      modal.style.display = 'none';
      cancelBtn.removeEventListener('click', onCancel);
      okBtn.removeEventListener('click', onOk);
    }

    function onCancel() {
      cleanup();
      resolve(false);
    }

    function onOk() {
      cleanup();
      resolve(true);
    }

    cancelBtn.addEventListener('click', onCancel);
    okBtn.addEventListener('click', onOk);
  });
}

// ========== INICIALIZAR ==========

document.addEventListener("DOMContentLoaded", () => {
  cargarGestionColas();
  lucide.createIcons();
});
