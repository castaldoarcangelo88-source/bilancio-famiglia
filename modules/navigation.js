const links = [...document.querySelectorAll(".sidebar-link")];
const pages = [...document.querySelectorAll(".app-page")];
const sidebar = document.querySelector(".app-sidebar");
const menuButton = document.getElementById("btnMenu");
const closeButton = document.getElementById("btnCloseMenu");
const overlay = document.getElementById("sidebarOverlay");

function closeSidebar() {
  sidebar?.classList.remove("open");
  document.body.classList.remove("menu-open");
}

function openSidebar() {
  sidebar?.classList.add("open");
  document.body.classList.add("menu-open");
}

function showPage(pageName) {
  links.forEach(link => {
    const active = link.dataset.page === pageName;
    link.classList.toggle("active", active);
    link.setAttribute("aria-current", active ? "page" : "false");
  });

  pages.forEach(page => {
    page.classList.toggle("active", page.dataset.pageView === pageName);
  });

  sessionStorage.setItem("bilancio_active_page", pageName);
  closeSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

links.forEach(link => {
  link.addEventListener("click", () => showPage(link.dataset.page));
});

menuButton?.addEventListener("click", openSidebar);
closeButton?.addEventListener("click", closeSidebar);
overlay?.addEventListener("click", closeSidebar);
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeSidebar();
});

const savedPage = sessionStorage.getItem("bilancio_active_page");
if (savedPage && pages.some(page => page.dataset.pageView === savedPage)) {
  showPage(savedPage);
}
