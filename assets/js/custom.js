// assets/js/custom.js
document.addEventListener('DOMContentLoaded', function () {
  let lastScrollTop = 0;
  const header = document.getElementById('site-header');
  const scrollPercentage = document.getElementById('scroll-percentage');

  // Adicione a classe 'fixed' ao header inicialmente
  header.classList.add('fixed');

  window.addEventListener('scroll', function () {
    
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    let docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    let scrollPercent = (scrollTop / docHeight) * 100;
    scrollPercentage.textContent = Math.round(scrollPercent) + '%';
    
    if (scrollTop > lastScrollTop) {
      // Rolando para baixo
      header.classList.remove('fixed');
      header.style.top = '-100px'; // Ajuste conforme a altura do seu header
    } else {
      // Rolando para cima
      header.classList.add('fixed');
      header.style.top = '0';
    }
    lastScrollTop = scrollTop;
  });

  // Adicionar event listeners para trocar a fonte do site
  document.getElementById('font1').addEventListener('click', function(e) {
    e.preventDefault();
    document.body.classList.remove('open-dyslexic');
    document.body.classList.add('global-font-family');

  });

  document.getElementById('font2').addEventListener('click', function(e) {
    e.preventDefault();
    document.body.classList.remove('global-font-family');
    document.body.classList.add('open-dyslexic');
  });
});
