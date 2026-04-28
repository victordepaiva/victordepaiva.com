// assets/js/custom.js
document.addEventListener('DOMContentLoaded', function () {
  // Always remove both font classes before applying the saved one
  document.body.classList.remove('global-font-family', 'open-dyslexic');
  var savedFont = localStorage.getItem('fontPreference');
  if (savedFont === 'open-dyslexic') {
    document.body.classList.add('open-dyslexic');
  } else if (savedFont === 'global-font-family') {
    document.body.classList.add('global-font-family');
  }

  let lastScrollTop = 0;
  const header = document.getElementById('site-header');
  const scrollPercentage = document.getElementById('scroll-percentage');
  const mobileMastheadQuery = window.matchMedia('(max-width: 767px)');

  // Adicione a classe 'fixed' ao header inicialmente
  header.classList.add('fixed');

  function resetDesktopSidebarPosition() {
    if (!mobileMastheadQuery.matches) {
      header.classList.add('fixed');
      header.style.top = '';
    }
  }

  window.addEventListener('scroll', function () {
    
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    let docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    let scrollPercent = (scrollTop / docHeight) * 100;
    scrollPercentage.textContent = Math.round(scrollPercent) + '%';

    if (!mobileMastheadQuery.matches) {
      resetDesktopSidebarPosition();
      lastScrollTop = scrollTop;
      return;
    }
    
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

  mobileMastheadQuery.addEventListener('change', resetDesktopSidebarPosition);

  // Função para atualizar o negrito na font-switcher
  function updateFontSwitcherBold() {
    document.querySelectorAll('[data-font-choice]').forEach(function(control) {
      control.style.fontWeight = document.body.classList.contains(control.dataset.fontChoice) ? 'bold' : 'normal';
    });
  }

  // Chama ao carregar
  updateFontSwitcherBold();

  // Função para remover hover forçado após clique
  function removeFontSwitcherHover() {
    document.querySelectorAll('[data-font-choice]').forEach(function(control) {
      control.blur();
    });
  }

  function scrollToBottomIfUserWasNearBottom() {
    var scrollBuffer = 200;
    var wasNearBottom = (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - scrollBuffer);
    if (wasNearBottom) {
      window.scrollTo(0, document.body.scrollHeight);
    }
  }

  function restoreScrollRelativeToBottom() {
    var prevBottom = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
    var tries = 0;
    var stableFrames = 0;
    var lastHeight = document.documentElement.scrollHeight;
    function tryRestore() {
      tries++;
      var newHeight = document.documentElement.scrollHeight;
      if (newHeight === lastHeight) {
        stableFrames++;
      } else {
        stableFrames = 0;
        lastHeight = newHeight;
      }
      if (stableFrames < 3 && tries < 40) {
        requestAnimationFrame(tryRestore);
      } else {
        var newScroll = document.documentElement.scrollHeight - prevBottom - window.innerHeight;
        window.scrollTo(0, newScroll);
      }
    }
    requestAnimationFrame(tryRestore);
    setTimeout(function() {
      var newScroll = document.documentElement.scrollHeight - prevBottom - window.innerHeight;
      window.scrollTo(0, newScroll);
    }, 2000);
  }

  let fontSwitcherClick = function(fontClass) {
    document.body.classList.remove('open-dyslexic', 'global-font-family');
    document.body.classList.add(fontClass);
    localStorage.setItem('fontPreference', fontClass);
    updateFontSwitcherBold();
    removeFontSwitcherHover();
    requestAnimationFrame(function() {
      window.scrollTo(0, document.body.scrollHeight);
    });
  };

  document.querySelectorAll('[data-font-choice]').forEach(function(control) {
    control.addEventListener('click', function(e) {
      e.preventDefault();
      fontSwitcherClick(control.dataset.fontChoice);
    });
  });
});
