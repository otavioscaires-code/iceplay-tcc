(() => {
  // Compatibilidade com favoritos antigos: a navegação atual usa documentos reais.
  const legacy = { "#geladeiras": "/geladeiras", "#acesso-movel": "/acesso", "#base-tecnica": "/sobre#base-tecnica", "#proximas-etapas": "/sobre#proximas-etapas" };
  if (["/", "/index.html", "/dashboard"].includes(window.location.pathname) && legacy[window.location.hash]) {
    window.location.replace(legacy[window.location.hash]);
  }
  const button = document.getElementById("menu-toggle");
  const menu = document.getElementById("menu-lateral");
  if (!button || !menu) return;
  const mobile = window.matchMedia("(max-width: 700px)");
  document.documentElement.classList.add("navigation-ready");
  let open = false;
  function setOpen(value, focus = false) {
    open = mobile.matches && value;
    menu.classList.toggle("is-open", open);
    button.hidden = !mobile.matches;
    button.setAttribute("aria-expanded", String(open));
    button.textContent = open ? "Fechar menu" : "Menu";
    if (focus && open) menu.querySelector('a[aria-current="page"], .sidebar-nav a')?.focus();
  }
  button.addEventListener("click", () => setOpen(!open, true));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && open) { setOpen(false); button.focus(); }
  });
  document.addEventListener("click", event => {
    if (open && !menu.contains(event.target) && !button.contains(event.target)) setOpen(false);
  });
  mobile.addEventListener("change", () => setOpen(false));
  setOpen(false);
})();
