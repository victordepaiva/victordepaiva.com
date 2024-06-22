// assets/js/custom.js
document.addEventListener('DOMContentLoaded', function () {
  let lastScrollTop = 0;
  const header = document.getElementById('site-header');

  // Adicione a classe 'fixed' ao header inicialmente
  header.classList.add('fixed');

  window.addEventListener('scroll', function () {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop > lastScrollTop) {
      // Rolando para baixo
      header.classList.remove('fixed');
      
    } else {
      // Rolando para cima
      header.classList.add('fixed');
      header.style.top = '0';
    }
    lastScrollTop = scrollTop;
  });
});
