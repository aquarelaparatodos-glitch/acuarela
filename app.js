/* Lógica de login, progreso, coloreado y calendario - LocalStorage */
const APP = "acuarelaApp";

function setCurrentUser(user) {
  localStorage.setItem(`${APP}:currentUser`, user);
}
function getCurrentUser() {
  return localStorage.getItem(`${APP}:currentUser`);
}
function logout() {
  localStorage.removeItem(`${APP}:currentUser`);
  window.location.href = "index.html";
}
function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    const here = encodeURIComponent(window.location.pathname.split("/").pop());
    window.location.href = `index.html?redirect=${here}`;
  }
}
function setNavState(activePage) {
  const user = getCurrentUser();
  const userSpan = document.querySelector("#navUser");
  const logoutBtn = document.querySelector("#btnLogout");
  const gated = document.querySelectorAll(".gated");
  if (userSpan) userSpan.textContent = user ? `👋 ${user}` : "Invitado";
  if (logoutBtn) logoutBtn.style.display = user ? "inline-block" : "none";
  gated.forEach(el => el.style.display = user ? "" : "none");

  document.querySelectorAll(".nav a[data-page]").forEach(a => {
    a.classList.toggle("active", a.dataset.page === activePage);
  });
}

/* Utils de almacenamiento por usuario */
function userKey(key) {
  const u = getCurrentUser();
  return `${APP}:${u}:${key}`;
}

/* --- INDEX (login) --- */
function initIndex() {
  setNavState("home");
  const user = getCurrentUser();
  const params = new URLSearchParams(location.search);
  const redirect = params.get("redirect") || "curso.html";

  const loginForm = document.querySelector("#loginForm");
  const welcomeCard = document.querySelector("#welcomeCard");

  if (user && welcomeCard) {
    // ya logueado: muestra bienvenida y CTA
    document.querySelector("#goTo").href = redirect;
    document.querySelector("#who").textContent = user;
    document.querySelector("#loginSection").style.display = "none";
    welcomeCard.style.display = "";
  }

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = (document.querySelector("#username").value || "").trim();
      if (!username) {
        alert("Por favor ingresa un nombre de usuario.");
        return;
      }
      setCurrentUser(username);
      window.location.href = redirect;
    });
  }

  const btnLogout = document.querySelector("#btnLogout");
  if (btnLogout) btnLogout.addEventListener("click", logout);
}

/* --- CURSO (progreso) --- */
function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(userKey("progress")) || "{}");
  } catch {
    return {};
  }
}
function saveProgress(data) {
  localStorage.setItem(userKey("progress"), JSON.stringify(data));
}
function updateCourseUI() {
  const lessons = document.querySelectorAll(".lesson");
  const prog = loadProgress();
  let done = 0;
  lessons.forEach(card => {
    const id = card.dataset.id;
    const completed = !!prog[id];
    card.querySelector(".status").innerHTML = completed ? '<span class="done">Completado</span>' : 'Pendiente';
    if (completed) done++;
  });
  const percent = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
  const bar = document.querySelector(".progress-bar");
  const txt = document.querySelector("#progressText");
  if (bar) bar.style.width = percent + "%";
  if (txt) txt.textContent = `${percent}% completado (${done}/${lessons.length})`;
}
function initCurso() {
  requireAuth();
  setNavState("curso");

  document.querySelector("#btnLogout").addEventListener("click", logout);

  const lessons = document.querySelectorAll(".lesson");
  lessons.forEach(card => {
    const id = card.dataset.id;
    card.querySelector(".doComplete").addEventListener("click", () => {
      const prog = loadProgress();
      prog[id] = true;
      saveProgress(prog);
      updateCourseUI();
    });
    card.querySelector(".undoComplete").addEventListener("click", () => {
      const prog = loadProgress();
      delete prog[id];
      saveProgress(prog);
      updateCourseUI();
    });
  });

  updateCourseUI();
}

/* --- IMÁGENES PARA COLOREAR --- */
let currentColor = "#7a5cff";
function loadPainting(id) {
  try {
    return JSON.parse(localStorage.getItem(userKey(`paint:${id}`)) || "{}");
  } catch { return {}; }
}
function savePainting(id, map) {
  localStorage.setItem(userKey(`paint:${id}`), JSON.stringify(map));
}
function initImagenes() {
  requireAuth();
  setNavState("imagenes");
  document.querySelector("#btnLogout").addEventListener("click", logout);

  // Paleta
  const swatches = document.querySelectorAll(".swatch");
  swatches.forEach(s => {
    s.addEventListener("click", () => {
      swatches.forEach(x => x.classList.remove("active"));
      s.classList.add("active");
      currentColor = s.dataset.color;
    });
  });
  // activa la primera
  const first = document.querySelector(".swatch");
  if (first) first.classList.add("active");

  // Listeners para regiones colorables
  document.querySelectorAll("svg[data-paint-id]").forEach(svg => {
    const paintId = svg.dataset.paintId;
    const saved = loadPainting(paintId);
    svg.querySelectorAll(".paint").forEach((shape, i) => {
      const rid = shape.id || `r${i}`;
      // aplicar color guardado si existe
      if (saved[rid]) shape.setAttribute("fill", saved[rid]);
      shape.style.cursor = "pointer";
      shape.addEventListener("click", () => {
        const color = currentColor;
        shape.setAttribute("fill", color);
        const m = loadPainting(paintId);
        m[rid] = color;
        savePainting(paintId, m);
      });
    });

    // Descargar como PNG
    const btn = svg.parentElement.querySelector(".btnDownload");
    if (btn) {
      btn.addEventListener("click", async () => {
        const serializer = new XMLSerializer();
        const str = serializer.serializeToString(svg);
        const svgBlob = new Blob([str], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function() {
          const canvas = document.createElement("canvas");
          const scale = 2;
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${paintId}.png`;
            link.click();
            URL.revokeObjectURL(link.href);
          }, "image/png");
          URL.revokeObjectURL(url);
        };
        img.src = url;
      });
    }
  });
}

/* --- CALENDARIO --- */
function loadEvents() {
  try {
    return JSON.parse(localStorage.getItem(userKey("events")) || "{}");
  } catch { return {}; }
}
function saveEvents(obj) {
  localStorage.setItem(userKey("events"), JSON.stringify(obj));
}
function formatDateKey(y, m, d) {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}
function renderCalendar(state) {
  const { year, month } = state;
  const events = loadEvents();

  const title = document.querySelector("#calTitle");
  const grid = document.querySelector("#calGrid");
  title.textContent = new Date(year, month, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  grid.innerHTML = "";
  const firstDow = new Date(year, month, 1).getDay(); // 0 dom - 6 sab
  const start = (firstDow + 6) % 7; // convertir a lunes=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // cabeceras
  const week = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
  week.forEach(w => {
    const h = document.createElement("div");
    h.className = "cal-cell";
    h.style.background = "linear-gradient(135deg,#f7f7f7,#ffffff)";
    h.style.fontWeight = "700";
    h.textContent = w;
    grid.appendChild(h);
  });

  // celdas en blanco
  for (let i = 0; i < start; i++) {
    const c = document.createElement("div");
    c.className = "cal-cell";
    grid.appendChild(c);
  }

  // días
  for (let d = 1; d <= daysInMonth; d++) {
    const c = document.createElement("div");
    c.className = "cal-cell";
    const k = formatDateKey(year, month, d);
    const list = events[k] || [];

    const date = document.createElement("div");
    date.className = "date";
    date.textContent = d;

    const evs = document.createElement("div");
    evs.className = "events";
    list.forEach(t => {
      const pill = document.createElement("div");
      pill.className = "event-pill";
      pill.textContent = t;
      evs.appendChild(pill);
    });

    c.appendChild(date);
    c.appendChild(evs);

    c.addEventListener("click", () => {
      const txt = prompt(`Añadir actividad para ${k}:`, "");
      if (txt && txt.trim()) {
        const e = loadEvents();
        e[k] = e[k] || [];
        e[k].push(txt.trim());
        saveEvents(e);
        renderCalendar(state);
      }
    });

    grid.appendChild(c);
  }
}
function initCalendario() {
  requireAuth();
  setNavState("calendario");
  document.querySelector("#btnLogout").addEventListener("click", logout);

  const today = new Date();
  const state = { year: today.getFullYear(), month: today.getMonth() };

  document.querySelector("#calPrev").addEventListener("click", () => {
    state.month--;
    if (state.month < 0) { state.month = 11; state.year--; }
    renderCalendar(state);
  });
  document.querySelector("#calNext").addEventListener("click", () => {
    state.month++;
    if (state.month > 11) { state.month = 0; state.year++; }
    renderCalendar(state);
  });

  renderCalendar(state);
}

/* --- bootstrap por página --- */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  setNavState(page);

  switch(page) {
    case "home": initIndex(); break;
    case "curso": initCurso(); break;
    case "imagenes": initImagenes(); break;
    case "calendario": initCalendario(); break;
  }
});