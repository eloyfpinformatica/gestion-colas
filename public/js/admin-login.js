const API_URL = window.location.origin;

// Verificar si ya está autenticado
const token = localStorage.getItem('admin_token');
if (token) {
  window.location.href = '/admin/panel.html';
}

// Manejar login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const usuario = document.getElementById('usuario').value;
  const pin = document.getElementById('pin').value;
  const errorMsg = document.getElementById('error-msg');
  
  try {
    const response = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ usuario, pin })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      localStorage.setItem('admin_token', data.token);
      window.location.href = '/admin/panel.html';
    } else {
      errorMsg.textContent = data.error || 'Credencials incorrectes';
      errorMsg.style.display = 'block';
    }
  } catch (error) {
    console.error('Error en login:', error);
    errorMsg.textContent = 'Error al connectar amb el servidor';
    errorMsg.style.display = 'block';
  }
});