(() => {
  const header = document.querySelector('.site-header');
  const menuBtn = document.querySelector('.menu-btn');
  const menu = document.getElementById('mobile-menu');

  const isOpen = () => menu.classList.contains('is-open');

  // Header goes solid once the page scrolls (or while the mobile menu is open).
  const syncHeader = () => header.classList.toggle('is-solid', window.scrollY > 12 || isOpen());
  window.addEventListener('scroll', syncHeader, { passive: true });

  // Mobile menu: drops down under the header over a dimmed page.
  const scrim = document.body.appendChild(document.createElement('div'));
  scrim.className = 'menu-scrim';
  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    scrim.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('menu-open', open);
    syncHeader();
  };
  menuBtn.addEventListener('click', () => setMenu(!isOpen()));
  scrim.addEventListener('click', () => setMenu(false));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) { setMenu(false); menuBtn.focus(); } });
  window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  syncHeader();

  const phone = window.matchMedia('(max-width: 699px)');

  // Rails scroll sideways on phones; a thin bar shows how far along you are.
  document.querySelectorAll('[data-rail]').forEach((rail) => {
    const bar = document.createElement('div');
    bar.className = 'rail-progress';
    bar.setAttribute('aria-hidden', 'true');
    const fill = bar.appendChild(document.createElement('span'));
    rail.after(bar);
    const sync = () => {
      const shown = rail.clientWidth / rail.scrollWidth;
      const max = rail.scrollWidth - rail.clientWidth;
      fill.style.width = shown * 100 + '%';
      fill.style.transform = `translateX(${max > 0 ? (rail.scrollLeft / max) * (1 / shown - 1) * 100 : 0}%)`;
    };
    rail.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  });

  // Services collapse into an accordion on phones (first one open).
  const plus = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>';
  const accItems = [...document.querySelectorAll('[data-accordion] > article')];
  const syncAccordions = () => {
    accItems.forEach((item, i) => {
      const h = item.querySelector('h2');
      const btn = h.querySelector('.acc-btn');
      if (phone.matches && !btn) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'acc-btn';
        b.appendChild(document.createElement('span')).textContent = h.textContent;
        b.insertAdjacentHTML('beforeend', plus);
        h.replaceChildren(b);
        const setOpen = (open) => {
          item.classList.toggle('is-collapsed', !open);
          b.setAttribute('aria-expanded', String(open));
        };
        setOpen(i === 0);
        b.addEventListener('click', () => setOpen(item.classList.contains('is-collapsed')));
      } else if (!phone.matches && btn) {
        h.textContent = btn.textContent;
        item.classList.remove('is-collapsed');
      }
    });
  };
  phone.addEventListener('change', syncAccordions);
  syncAccordions();

  // Scroll reveal + floating hero mockup, skipped for reduced motion.
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-reveal');
    const els = [...document.querySelectorAll('[data-reveal]')].filter((el) => el.getBoundingClientRect().top > window.innerHeight);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.remove('pending');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach((el) => {
      const sibs = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
      el.style.setProperty('--d', Math.max(0, sibs.indexOf(el)) * 80 + 'ms');
      el.classList.add('pending');
      io.observe(el);
    });

    document.querySelectorAll('[data-float]').forEach((el, i) => {
      if (!el.animate) return;
      el.animate([{ translate: '0 0' }, { translate: `0 ${[-10, -14, -8][i] ?? -10}px` }],
        { duration: [5200, 6400, 4600][i] ?? 5000, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out', delay: i * 400 });
    });
  }

  // Contact form. Set data-endpoint on the form (e.g. a Formspree URL) to post
  // enquiries; without one it falls back to opening a pre-filled email.
  const form = document.getElementById('enquiry');
  if (form) {
    const sent = document.getElementById('sent');
    const error = form.querySelector('.form-error');
    const submitBtn = form.querySelector('[type="submit"]');
    const showSent = (name, viaEmail) => {
      document.getElementById('sent-name').textContent = name ? ', ' + name : '';
      document.getElementById('sent-what').textContent = viaEmail ? 'your email is ready to send' : 'enquiry sent';
      document.getElementById('sent-note').textContent = viaEmail
        ? 'Your email app should have opened with your details filled in — just hit send. I’ll reply personally with next steps.'
        : 'I’ll read it properly and get back to you personally with next steps.';
      form.hidden = true;
      sent.hidden = false;
      sent.querySelector('h2').focus();
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      if (data.get('_gotcha')) return;
      const first = (data.get('name') || '').toString().trim().split(' ')[0];
      const endpoint = form.dataset.endpoint;
      error.hidden = true;

      if (!endpoint) {
        const body = `Name: ${data.get('name')}\nBusiness: ${data.get('business') || '-'}\nEmail: ${data.get('email')}\nNeed: ${data.get('need')}\n\n${data.get('message') || ''}`;
        location.href = `mailto:hello@jjwebsites.co.uk?subject=${encodeURIComponent('Website enquiry — ' + data.get('need'))}&body=${encodeURIComponent(body)}`;
        showSent(first, true);
        return;
      }

      submitBtn.disabled = true;
      try {
        const res = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(res.statusText);
        showSent(first);
      } catch {
        error.hidden = false;
      } finally {
        submitBtn.disabled = false;
      }
    });

    document.getElementById('send-another').addEventListener('click', () => {
      form.reset();
      sent.hidden = true;
      form.hidden = false;
      form.querySelector('input').focus();
    });
  }
})();
