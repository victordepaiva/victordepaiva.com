// assets/js/custom.js
document.addEventListener('DOMContentLoaded', function () {
  let lastScrollTop = 0;
  const header = document.getElementById('site-header');

  window.addEventListener('scroll', function () {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop > lastScrollTop) {
      // Rolando para baixo
      header.style.top = '-100px'; // Ajuste conforme a altura do seu header
    } else {
      // Rolando para cima
      header.style.top = '0';
    }
    lastScrollTop = scrollTop;
  });
});
