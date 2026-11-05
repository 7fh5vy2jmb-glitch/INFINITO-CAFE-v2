(function () {
  'use strict';

  /* ---------- Utilidades de almacenamiento (pueden fallar en modo privado) ---------- */
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function write(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ---------- Intro: una vez por sesión, se puede saltar con un toque ---------- */
  var intro = document.getElementById('intro');
  function endIntro() {
    if (!intro) return;
    intro.classList.add('is-gone');
    try { sessionStorage.setItem('infinito-intro', '1'); } catch (e) {}
  }
  if (intro) {
    intro.addEventListener('click', endIntro);
    setTimeout(endIntro, 5500);
  }

  /* ---------- Moneda ----------
     Los precios del HTML están en MXN (data-p). Aquí se convierten para mostrarlos.
     Valores de respaldo: MXN por cada unidad. Si hay internet, se actualizan solos. */
  var CUR_KEY = 'infinito-cur', RATE_KEY = 'infinito-rates', TTL = 12 * 3600 * 1000;
  var rates = { MXN: 1, USD: 18.0, EUR: 20.75 };
  var live = false, rateDate = '';
  var FMT = {
    MXN: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }),
    USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    EUR: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
  };
  var NAMES = { USD: 'dólar', EUR: 'euro' };
  var prices = [].slice.call(document.querySelectorAll('[data-p]'));
  var buttons = [].slice.call(document.querySelectorAll('.cur__btn'));
  var note = document.getElementById('curNote');
  var base = note ? note.textContent : '';
  var current = read(CUR_KEY);
  if (!FMT[current]) current = 'MXN';

  function render() {
    prices.forEach(function (el) {
      el.textContent = FMT[current].format(parseFloat(el.getAttribute('data-p')) / rates[current]);
    });
    buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-cur') === current ? 'true' : 'false');
    });
    if (!note) return;
    if (current === 'MXN') {
      note.textContent = base;
    } else {
      note.textContent = 'Conversión de referencia: 1 ' + NAMES[current] + ' = ' +
        FMT.MXN.format(rates[current]).replace('$', '$') + ' MXN' +
        (live ? ' · actualizado ' + rateDate : ' · aproximado') +
        '. El cobro en caja es en pesos mexicanos.';
    }
  }
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      current = b.getAttribute('data-cur');
      write(CUR_KEY, current);
      render();
    });
  });

  function setRates(usd, eur, date) {
    if (!(usd > 0 && eur > 0)) return false;
    rates.USD = usd; rates.EUR = eur; live = true; rateDate = date || '';
    return true;
  }
  function loadRates() {
    var cached = null;
    try { cached = JSON.parse(read(RATE_KEY)); } catch (e) {}
    if (cached && Date.now() - cached.t < TTL && setRates(cached.usd, cached.eur, cached.d)) { render(); return; }
    if (!window.fetch || location.protocol.indexOf('http') !== 0) return;
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 4000);
    fetch('https://api.frankfurter.dev/v1/latest?base=MXN&symbols=USD,EUR', ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var usd = 1 / j.rates.USD, eur = 1 / j.rates.EUR;
        if (setRates(usd, eur, j.date)) {
          write(RATE_KEY, JSON.stringify({ t: Date.now(), usd: usd, eur: eur, d: j.date }));
          render();
        }
      })
      .catch(function () {})
      .then(function () { clearTimeout(timer); });
  }
  render();
  loadRates();

  /* ---------- Aparición suave al hacer scroll ---------- */
  var els = [].slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add('pre'); io.observe(el); }
    });

    /* Sección activa en la navegación */
    var links = [].slice.call(document.querySelectorAll('.nav__links a, .tabbar a'));
    var ids = ['bar', 'carta', 'espacio', 'horario'];
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ids.forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------- Barra superior translúcida al bajar ---------- */
  var nav = document.getElementById('nav');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      nav.classList.toggle('is-solid', window.scrollY > 60);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- App instalable y sin conexión ---------- */
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
