const API_BASE = '/api'; // через proxy Vite

export function initSite() {
  // ===== Theme toggle =====
  const themeBtn = document.getElementById('themeToggle');
  const onTheme = () => document.documentElement.classList.toggle('light');
  themeBtn?.addEventListener('click', onTheme);

  // ===== Reveal on scroll =====
  let io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('show');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('show'));
  }

  // ===== Portfolio filter =====
  const tabs = document.querySelectorAll('.tab');
  const folio = document.getElementById('folio');
  const onTabClick = (t) => {
    tabs.forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    const cat = t.dataset.cat;
    folio?.querySelectorAll('.ph').forEach((ph) => {
      const ok = cat === 'all' || ph.dataset.cat === cat;
      ph.style.display = ok ? 'block' : 'none';
    });
  };
  tabs.forEach((t) => t.addEventListener('click', () => onTabClick(t)));

  // ===== Booking calendar (selectedDay) + time input (selectedSlot) =====
  const calDays = document.getElementById('calDays');
  const calLabel = document.getElementById('calLabel');
  const prevM = document.getElementById('prevM');
  const nextM = document.getElementById('nextM');

  const timeInput = document.getElementById('time'); // <- беремо час звідси
  const msg = document.getElementById('bookMsg');

  let calDate = new Date();
  calDate.setDate(1);
  let selectedDay = null;

  function buildCalendar() {
    if (!calDays || !calLabel) return;

    calDays.innerHTML = '';
    const y = calDate.getFullYear();
    const m = calDate.getMonth();
    const monthName = calDate.toLocaleString('uk-UA', { month: 'long' });
    calLabel.innerHTML = `<strong style="text-transform:capitalize">${monthName} ${y}</strong>`;

    const firstDay = (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) calDays.appendChild(document.createElement('div'));

    for (let d = 1; d <= daysInMonth; d++) {
      const btn = document.createElement('button');
      btn.textContent = d;

      btn.addEventListener('click', () => {
        selectedDay = new Date(y, m, d);

        // active class
        calDays.querySelectorAll('button').forEach((b) => b.classList.remove('sel'));
        btn.classList.add('sel');

        if (msg) msg.textContent = '';
      });

      calDays.appendChild(btn);
    }
  }

  prevM && (prevM.onclick = () => { calDate.setMonth(calDate.getMonth() - 1); buildCalendar(); });
  nextM && (nextM.onclick = () => { calDate.setMonth(calDate.getMonth() + 1); buildCalendar(); });

  buildCalendar();

  // ===== Price buttons quick-select =====
  document.querySelectorAll('[data-book]').forEach((b) =>
    b.addEventListener('click', () => {
      const name = b.getAttribute('data-book');
      const pkg = document.getElementById('package');
      if (!pkg) return;
      const idx = Array.from(pkg.options).findIndex((o) => o.textContent.includes(name));
      if (idx >= 0) pkg.selectedIndex = idx;
      window.location.hash = '#booking';
    })
  );

  // ===== Submit booking =====
  const submitBooking = document.getElementById('submitBooking');
  const onSubmit = async () => {
    const n = document.getElementById('name')?.value?.trim() || '';
    const c = document.getElementById('contact')?.value?.trim() || '';
    const pkg = document.getElementById('package')?.value || '';
    const time = timeInput?.value || ''; // <-- тут час

    if (!msg) return;

    if (!selectedDay) { msg.textContent = 'Оберіть дату.'; return; }
    if (!time) { msg.textContent = 'Оберіть час.'; return; }
    if (!n || !c) { msg.textContent = 'Вкажіть імʼя та контакт.'; return; }

    try {
      msg.textContent = 'Надсилаю заявку...';

      const body = {
        clientName: n,
        contact: c,
        packageName: pkg,
        date: selectedDay.toISOString().slice(0, 10),
        time
      };

      const r = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || 'Помилка бронювання');

      msg.textContent = 'Заявку прийнято ✅ Я звʼяжуся для підтвердження.';
    } catch (e) {
      msg.textContent = 'Помилка: ' + (e.message || 'невідомо');
    }
  };
  submitBooking?.addEventListener('click', onSubmit);

  // ===== Footer year =====
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // cleanup
  return () => {
    themeBtn?.removeEventListener('click', onTheme);
    tabs.forEach((t) => t.replaceWith(t.cloneNode(true))); // простий спосіб прибрати хендлери
    submitBooking?.removeEventListener('click', onSubmit);
    io?.disconnect?.();
  };
}
