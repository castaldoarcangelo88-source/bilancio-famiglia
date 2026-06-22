const links = [...document.querySelectorAll(".sidebar-link")];
const pages = [...document.querySelectorAll(".app-page")];

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
  window.scrollTo({ top: 0, behavior: "smooth" });
}

links.forEach(link => {
  link.addEventListener("click", () => showPage(link.dataset.page));
});

const savedPage = sessionStorage.getItem("bilancio_active_page");
if (savedPage && pages.some(page => page.dataset.pageView === savedPage)) {
  showPage(savedPage);
}
