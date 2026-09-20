// assets/js/custom.js
document.addEventListener('DOMContentLoaded', function () {
  function removeGameHeadingAnchors() {
    document.querySelectorAll('.game-section__heading > .header-link').forEach(function(anchor) {
      anchor.remove();
    });
  }

  removeGameHeadingAnchors();
  window.setTimeout(removeGameHeadingAnchors, 0);

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

  document.querySelectorAll('[data-locale-choice]').forEach(function(control) {
    control.addEventListener('click', function() {
      localStorage.setItem('localePreference', control.dataset.localeChoice);
    });
    if (localStorage.getItem('localePreference') === control.dataset.localeChoice) {
      control.style.fontWeight = 'bold';
    }
  });

  function copyTextFallback(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand('copy');
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    } finally {
      document.body.removeChild(textarea);
    }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function() {
        return copyTextFallback(text);
      });
    }

    return copyTextFallback(text);
  }

  function showCopyToast(button) {
    var card = button.closest('.email-link-card');
    if (!card) return;

    var oldToast = card.querySelector('.email-copy-toast');
    if (oldToast) {
      oldToast.remove();
    }

    var toast = document.createElement('span');
    toast.className = 'email-copy-toast';
    toast.setAttribute('role', 'status');
    toast.textContent = button.dataset.copySuccess || 'address copied';
    card.appendChild(toast);

    window.setTimeout(function() {
      toast.remove();
    }, 1800);
  }

  document.querySelectorAll('[data-copy-email]').forEach(function(button) {
    button.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();

      copyText(button.dataset.copyEmail).then(function() {
        showCopyToast(button);
      });
    });
  });

  function pauseYouTubeIframe(iframe) {
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
  }

  function initGameMediaCarousels() {
    document.querySelectorAll('[data-game-media-carousel]').forEach(function(carousel) {
      var track = carousel.querySelector('[data-carousel-track]');
      var slides = carousel.querySelectorAll('[data-carousel-slide]');
      var prev = carousel.querySelector('[data-carousel-prev]');
      var next = carousel.querySelector('[data-carousel-next]');
      var dots = carousel.querySelectorAll('[data-carousel-dots] [data-carousel-index]');
      if (!track || slides.length === 0) return;

      var current = 0;

      function slideWidth() {
        return track.clientWidth;
      }

      function pauseVideosExcept(keepIndex) {
        slides.forEach(function(slide, index) {
          var nativeVideo = slide.querySelector('video');
          if (index === keepIndex) {
            if (nativeVideo) {
              nativeVideo.play().catch(function() {});
            }
            return;
          }
          pauseYouTubeIframe(slide.querySelector('iframe'));
          if (nativeVideo) {
            nativeVideo.pause();
          }
        });
      }

      function updateUI() {
        slides.forEach(function(slide, index) {
          slide.classList.toggle('is-current', index === current);
        });
        if (prev) prev.disabled = current === 0;
        if (next) next.disabled = current === slides.length - 1;
        dots.forEach(function(dot, index) {
          var selected = index === current;
          dot.classList.toggle('is-active', selected);
          if (selected) {
            dot.setAttribute('aria-current', 'true');
          } else {
            dot.removeAttribute('aria-current');
          }
        });
        pauseVideosExcept(current);
      }

      function goTo(index, smooth) {
        index = Math.max(0, Math.min(slides.length - 1, index));
        current = index;
        track.scrollTo({
          left: slideWidth() * index,
          behavior: smooth === false ? 'auto' : 'smooth'
        });
        updateUI();
      }

      function syncFromScroll() {
        var width = slideWidth();
        if (!width) return;
        var index = Math.round(track.scrollLeft / width);
        index = Math.max(0, Math.min(slides.length - 1, index));
        if (index !== current) {
          current = index;
          updateUI();
        }
      }

      track.addEventListener('scroll', syncFromScroll, { passive: true });
      track.addEventListener('scrollend', syncFromScroll);

      if (prev) {
        prev.addEventListener('click', function() {
          goTo(current - 1);
        });
      }
      if (next) {
        next.addEventListener('click', function() {
          goTo(current + 1);
        });
      }
      dots.forEach(function(dot) {
        dot.addEventListener('click', function() {
          goTo(Number(dot.getAttribute('data-carousel-index')));
        });
      });

      track.addEventListener('keydown', function(event) {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          goTo(current - 1);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          goTo(current + 1);
        }
      });

      window.addEventListener('resize', function() {
        goTo(current, false);
      });

      slides.forEach(function(slide, index) {
        var nativeVideo = slide.querySelector('video');
        if (!nativeVideo) return;
        nativeVideo.addEventListener('play', function() {
          if (index !== current) {
            nativeVideo.pause();
          }
        });
      });

      goTo(0, false);
    });
  }

  initGameMediaCarousels();
});
