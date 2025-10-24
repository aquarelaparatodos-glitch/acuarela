/* =========================
   Utilidades básicas
========================= */
let currentUser = null;

function requireAuth() {
  const u = localStorage.getItem("user");
  if (!u) {
    // Si no usas login, comenta la línea de redirección:
    // window.location.href = "index.html";
    return;
  }
  currentUser = JSON.parse(u);
}

function logout() {
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

function setNavState(activePage) {
  document.querySelectorAll("nav a").forEach(a => a.classList.remove("active"));
  const map = {
    "inicio": "index.html",
    "curso": "curso.html",
    "imagenes": "imagenes.html",
    "calendario": "calendario.html"
  };
  const href = map[activePage];
  if (!href) return;
  const link = Array.from(document.querySelectorAll("nav a")).find(a => a.getAttribute("href") === href);
  if (link) link.classList.add("active");
}

function getFileName(path) {
  return path.split("/").pop().replace(/\.[^/.]+$/, "");
}

/* =========================
   Inicializadores de páginas
========================= */

// Llamar desde index.html si usas login
function initInicio() {
  setNavState("inicio");
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.querySelector("[name='name']").value.trim();
    const email = form.querySelector("[name='email']").value.trim();
    if (!name || !email) {
      alert("Completa nombre y correo");
      return;
    }
    localStorage.setItem("user", JSON.stringify({ name, email }));
    window.location.href = "curso.html";
  });
}

function initCurso() {
  requireAuth();
  setNavState("curso");
  const btn = document.querySelector("#btnLogout");
  if (btn) btn.addEventListener("click", logout);
}

function initCalendario() {
  requireAuth();
  setNavState("calendario");
  const btn = document.querySelector("#btnLogout");
  if (btn) btn.addEventListener("click", logout);
}

/* =========================
   Galería de PNGs (solo descarga)
========================= */
async function initImagenes() {
  requireAuth();
  setNavState("imagenes");
  const btn = document.querySelector("#btnLogout");
  if (btn) btn.addEventListener("click", logout);

  const grid = document.getElementById("pngGrid");
  if (!grid) return;

  grid.innerHTML = "<div class='card'>Cargando imágenes...</div>";

  try {
    // Carga el manifiesto. Ajusta la ruta si lo pusiste en otro lugar.
    const res = await fetch(`assets/imagenes.json?_=${Date.now()}`);
    if (!res.ok) throw new Error("No se pudo cargar assets/imagenes.json");
    const items = await res.json();

    grid.innerHTML = "";

    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "coloring-card";

      // Header con título + botón descargar
      const header = document.createElement("div");
      header.style.cssText = "display:flex;justify-content:space-between;align-items:center; margin-bottom:6px;";

      const title = document.createElement("strong");
      title.textContent = item.title || getFileName(item.src);

      const btnDesc = document.createElement("a");
      btnDesc.className = "btn";
      btnDesc.textContent = "Descargar PNG";
      btnDesc.href = item.src;
      btnDesc.download = "";     // fuerza descarga en mismo origen (GitHub Pages)
      btnDesc.target = "_blank"; // respaldo si el navegador abre en pestaña
      btnDesc.rel = "noopener";

      header.appendChild(title);
      header.appendChild(btnDesc);

      // Miniatura clickeable (abre grande)
      const link = document.createElement("a");
      link.href = item.src;
      link.target = "_blank";
      link.rel = "noopener";

      const img = document.createElement("img");
      img.src = `${item.src}?_=${Date.now()}`; // evita caché viejo
      img.alt = title.textContent;
      img.loading = "lazy";
      img.style.cssText = "width:100%; display:block; background:#fff; border-radius:12px; border:1px solid #ddd;";

      link.appendChild(img);

      card.appendChild(header);
      card.appendChild(link);
      grid.appendChild(card);
    });

    if (!items.length) {
      grid.innerHTML = "<div class='card'>No hay imágenes listadas en assets/imagenes.json</div>";
    }
  } catch (e) {
    console.error(e);
    grid.innerHTML = "<div class='card' style='color:#a00;'>Error cargando imágenes. Revisa assets/imagenes.json y rutas.</div>";
  }
}

/* =========================
   Auto-inicialización según página
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const path = location.pathname;
  if (path.endsWith("index.html") || path.endsWith("/") || path === "/") initInicio();
  else if (path.endsWith("curso.html")) initCurso();
  else if (path.endsWith("imagenes.html")) initImagenes();
  else if (path.endsWith("calendario.html")) initCalendario();
});
