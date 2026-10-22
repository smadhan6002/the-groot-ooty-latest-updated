/* =========================================================
   THE GROOT OOTY — Booking Wizard JS
   Integrated with GrootStore for live dynamic room pricing & availability
   ========================================================= */
import { supabase } from './supabase.js';

/* ---------------------------------------------------------
   STATE
   --------------------------------------------------------- */

const bookingState = {
  step: 1,
  totalSteps: 5,
  checkin: null,
  checkout: null,
  adults: 1,
  children: 0,
  room: null,
  name: '',
  mobile: '',
  whatsappNum: '',
  whatsappSameAsMobile: false,
  email: '',
  campfire: null,
  meals: null,
  specialRequest: '',
  enquiryId: null,
};

/* ---------------------------------------------------------
   INIT
   --------------------------------------------------------- */

function initBookingWizard() {
  if (!document.getElementById('booking-wizard')) return;

  // Pre-fill room from URL param
  const params = new URLSearchParams(window.location.search);
  const preRoom = params.get('room');
  if (preRoom) {
    bookingState.room = preRoom;
  }

  // Pre-fill default dates (today & tomorrow) if none selected
  setDefaultBookingDates();

  // Init calendar
  initCalendar();

  // Init guest counters
  initGuestCounters();

  // Render & Init dynamic room selection from GrootStore
  renderRoomOptions();

  // Init guest details form
  initGuestDetailsForm();

  // Init preferences
  initPreferences();

  // Init nav buttons
  initNavButtons();

  // Render progress
  renderProgress();

  // Update sidebar
  updateSidebar();

  if (window.GrootStore) {
    window.GrootStore.subscribe(() => {
      renderRoomOptions();
      updateSidebar();
      if (bookingState.step === 5) renderReview();
    });
  } else {
    window.addEventListener('groot-store-ready', () => {
      renderRoomOptions();
      updateSidebar();
      if (bookingState.step === 5) renderReview();
      if (window.GrootStore) {
        window.GrootStore.subscribe(() => {
          renderRoomOptions();
          updateSidebar();
          if (bookingState.step === 5) renderReview();
        });
      }
    });
  }
}

function setDefaultBookingDates() {
  if (!bookingState.checkin) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pad = (n) => String(n).padStart(2, '0');
    bookingState.checkin = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    bookingState.checkout = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
  }
}

/* ---------------------------------------------------------
   CALENDAR
   --------------------------------------------------------- */

let calViewYear, calViewMonth;

function initCalendar() {
  const now = new Date();
  calViewYear = now.getFullYear();
  calViewMonth = now.getMonth();

  renderCalendar();

  const prevBtn = document.getElementById('cal-prev');
  const nextBtn = document.getElementById('cal-next');

  if (prevBtn) prevBtn.addEventListener('click', () => {
    calViewMonth--;
    if (calViewMonth < 0) { calViewMonth = 11; calViewYear--; }
    renderCalendar();
  });

  if (nextBtn) nextBtn.addEventListener('click', () => {
    calViewMonth++;
    if (calViewMonth > 11) { calViewMonth = 0; calViewYear++; }
    renderCalendar();
  });
}

function renderCalendar() {
  const grid = document.getElementById('cal-grid');
  const monthLabel = document.getElementById('cal-month');
  if (!grid) return;

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  if (monthLabel) monthLabel.textContent = `${MONTHS[calViewMonth]} ${calViewYear}`;

  const today = new Date();
  today.setHours(0,0,0,0);

  const firstDay = new Date(calViewYear, calViewMonth, 1).getDay();
  const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();

  let html = DAYS.map(d => `<span class="calendar-day-label">${d}</span>`).join('');

  for (let i = 0; i < firstDay; i++) {
    html += `<button class="calendar-day empty" disabled></button>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(calViewYear, calViewMonth, d);
    date.setHours(0,0,0,0);

    const dateStr = `${calViewYear}-${String(calViewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isPast = date < today;
    const isToday = date.getTime() === today.getTime();

    const checkin  = bookingState.checkin  ? new Date(bookingState.checkin)  : null;
    const checkout = bookingState.checkout ? new Date(bookingState.checkout) : null;

    let cls = 'calendar-day';
    if (isPast) cls += ' disabled';
    if (isToday) cls += ' today';
    if (checkin  && date.getTime() === checkin.getTime())  cls += ' selected';
    if (checkout && date.getTime() === checkout.getTime()) cls += ' selected';
    if (checkin && checkout && date > checkin && date < checkout) cls += ' in-range';

    html += `<button class="${cls}" data-date="${dateStr}" ${isPast ? 'disabled' : ''}>${d}</button>`;
  }

  grid.innerHTML = html;

  grid.querySelectorAll('.calendar-day:not(.disabled):not(.empty)').forEach(btn => {
    btn.addEventListener('click', () => handleDateClick(btn.dataset.date));
  });

  updateDateSummary();
}

function handleDateClick(dateStr) {
  const clicked = new Date(dateStr);
  clicked.setHours(0,0,0,0);

  if (!bookingState.checkin || (bookingState.checkin && bookingState.checkout)) {
    bookingState.checkin = dateStr;
    bookingState.checkout = null;
  } else {
    const checkin = new Date(bookingState.checkin);
    if (clicked <= checkin) {
      bookingState.checkin = dateStr;
      bookingState.checkout = null;
    } else {
      bookingState.checkout = dateStr;
    }
  }

  renderCalendar();
  updateSidebar();
}

function updateDateSummary() {
  const checkinEl  = document.getElementById('summary-checkin');
  const checkoutEl = document.getElementById('summary-checkout');
  const nightsEl   = document.getElementById('summary-nights');

  if (checkinEl)  checkinEl.textContent = bookingState.checkin  ? formatDateShort(bookingState.checkin)  : '—';
  if (checkoutEl) checkoutEl.textContent = bookingState.checkout ? formatDateShort(bookingState.checkout) : '—';

  if (nightsEl && bookingState.checkin && bookingState.checkout) {
    const nights = Math.round((new Date(bookingState.checkout) - new Date(bookingState.checkin)) / 86400000);
    nightsEl.textContent = `${nights} night${nights !== 1 ? 's' : ''}`;
  } else if (nightsEl) {
    nightsEl.textContent = '';
  }
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ---------------------------------------------------------
   GUEST COUNTERS
   --------------------------------------------------------- */

function initGuestCounters() {
  setupCounter('adults-count',   'adults-minus',   'adults-plus',   'adults',   1, 20);
  setupCounter('children-count', 'children-minus', 'children-plus', 'children', 0, 15);
}

function setupCounter(countId, minusId, plusId, field, min, max) {
  const countEl = document.getElementById(countId);
  const minusEl = document.getElementById(minusId);
  const plusEl  = document.getElementById(plusId);
  if (!countEl) return;

  const update = () => {
    countEl.textContent = bookingState[field];
    if (minusEl) minusEl.disabled = bookingState[field] <= min;
    if (plusEl)  plusEl.disabled  = bookingState[field] >= max;
    updateSidebar();
  };

  if (minusEl) minusEl.addEventListener('click', () => {
    if (bookingState[field] > min) { bookingState[field]--; update(); }
  });

  if (plusEl) plusEl.addEventListener('click', () => {
    if (bookingState[field] < max) { bookingState[field]++; update(); }
  });

  update();
}

/* ---------------------------------------------------------
   ROOM SELECTION (DYNAMIC FROM GROOT STORE)
   --------------------------------------------------------- */

function renderRoomOptions() {
  const container = document.querySelector('.room-options');
  if (!container) return;

  const rooms = (window.GrootStore ? window.GrootStore.getRooms() : null) || getRoomsData();
  container.innerHTML = '';

  rooms.forEach(r => {
    const isSelected = bookingState.room === r.id;
    const isAvail = r.status !== 'unavailable';

    const card = document.createElement('div');
    card.className = `room-option ${isSelected ? 'selected' : ''}`;
    card.dataset.room = r.id;
    card.setAttribute('role', 'radio');
    card.setAttribute('tabindex', '0');

    card.innerHTML = `
      <div class="room-option-body">
        <div class="room-option-header">
          <div class="room-option-name">${r.name}</div>
          <div class="room-option-price">₹${r.price.toLocaleString()} <span class="room-option-per-night">/ night</span></div>
        </div>
        <div>
          <span class="room-avail-badge ${isAvail ? 'available' : 'unavailable'}">
            ● ${isAvail ? 'Available' : 'Sold Out / Unavailable'}
          </span>
        </div>
        <div class="room-option-desc">${r.shortDescription || r.description}</div>
        <div class="room-option-check">
          <div class="room-option-check-circle">${isSelected ? '✓' : ''}</div>
          <span>${isSelected ? 'Selected' : 'Select Room'}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      container.querySelectorAll('.room-option').forEach(o => {
        o.classList.remove('selected');
        const check = o.querySelector('.room-option-check-circle');
        const txt = o.querySelector('.room-option-check span');
        if (check) check.textContent = '';
        if (txt) txt.textContent = 'Select Room';
      });

      card.classList.add('selected');
      const check = card.querySelector('.room-option-check-circle');
      const txt = card.querySelector('.room-option-check span');
      if (check) check.textContent = '✓';
      if (txt) txt.textContent = 'Selected';

      bookingState.room = r.id;
      updateSidebar();
    });

    container.appendChild(card);
  });

  // Not sure option
  const notSureSelected = bookingState.room === 'not-sure';
  const notSureCard = document.createElement('div');
  notSureCard.className = `room-option ${notSureSelected ? 'selected' : ''}`;
  notSureCard.dataset.room = 'not-sure';
  notSureCard.style.gridColumn = '1 / -1';
  notSureCard.style.display = 'flex';
  notSureCard.style.alignItems = 'center';
  notSureCard.style.gap = '1rem';
  notSureCard.style.padding = '1.25rem';
  notSureCard.innerHTML = `
    <div style="font-size:2rem;">🌲</div>
    <div>
      <div class="room-option-name">Not Sure — Recommend a Room</div>
      <div class="room-option-desc" style="margin-bottom:0.25rem;">Tell us your group size and preferences, and our caretakers will recommend the best fit.</div>
      <div class="room-option-check">
        <div class="room-option-check-circle">${notSureSelected ? '✓' : ''}</div>
        <span>${notSureSelected ? 'Selected' : 'Select Recommendation'}</span>
      </div>
    </div>
  `;

  notSureCard.addEventListener('click', () => {
    container.querySelectorAll('.room-option').forEach(o => {
      o.classList.remove('selected');
      const check = o.querySelector('.room-option-check-circle');
      const txt = o.querySelector('.room-option-check span');
      if (check) check.textContent = '';
      if (txt) txt.textContent = 'Select Room';
    });

    notSureCard.classList.add('selected');
    const check = notSureCard.querySelector('.room-option-check-circle');
    const txt = notSureCard.querySelector('.room-option-check span');
    if (check) check.textContent = '✓';
    if (txt) txt.textContent = 'Selected';

    bookingState.room = 'not-sure';
    updateSidebar();
  });

  container.appendChild(notSureCard);
}

/* ---------------------------------------------------------
   GUEST DETAILS FORM
   --------------------------------------------------------- */

function initGuestDetailsForm() {
  const nameEl    = document.getElementById('guest-name');
  const mobileEl  = document.getElementById('guest-mobile');
  const waEl      = document.getElementById('guest-whatsapp');
  const emailEl   = document.getElementById('guest-email');
  const waSameEl  = document.getElementById('wa-same-as-mobile');

  if (nameEl)   nameEl.addEventListener('input',   () => { bookingState.name   = nameEl.value;   updateSidebar(); });
  if (mobileEl) mobileEl.addEventListener('input', () => {
    bookingState.mobile = mobileEl.value;
    if (bookingState.whatsappSameAsMobile && waEl) {
      waEl.value = mobileEl.value;
      bookingState.whatsappNum = mobileEl.value;
    }
    updateSidebar();
  });
  if (waEl)     waEl.addEventListener('input',     () => { bookingState.whatsappNum = waEl.value; });
  if (emailEl)  emailEl.addEventListener('input',  () => { bookingState.email  = emailEl.value; });

  if (waSameEl) {
    waSameEl.addEventListener('change', () => {
      bookingState.whatsappSameAsMobile = waSameEl.checked;
      if (waEl) {
        if (waSameEl.checked) {
          waEl.value = bookingState.mobile;
          bookingState.whatsappNum = bookingState.mobile;
          waEl.disabled = true;
        } else {
          waEl.disabled = false;
        }
      }
    });
  }
}

/* ---------------------------------------------------------
   PREFERENCES
   --------------------------------------------------------- */

function initPreferences() {
  document.querySelectorAll('[data-pref-group]').forEach(btn => {
    btn.addEventListener('click', () => {
      const grp = btn.dataset.prefGroup;
      const val = btn.dataset.prefVal;
      document.querySelectorAll(`[data-pref-group="${grp}"]`).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      bookingState[grp] = val;
    });
  });

  const specialEl = document.getElementById('special-request');
  if (specialEl) {
    specialEl.addEventListener('input', () => {
      bookingState.specialRequest = specialEl.value;
    });
  }
}

/* ---------------------------------------------------------
   NAV BUTTONS
   --------------------------------------------------------- */

function initNavButtons() {
  document.querySelectorAll('[data-booking-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateStep(bookingState.step)) {
        goToStep(bookingState.step + 1);
      }
    });
  });

  document.querySelectorAll('[data-booking-prev]').forEach(btn => {
    btn.addEventListener('click', () => {
      goToStep(bookingState.step - 1);
    });
  });

  const submitBtn = document.getElementById('booking-submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitBooking);
  }
}

function goToStep(step) {
  if (step < 1 || step > bookingState.totalSteps) return;

  document.querySelectorAll('.booking-step').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`step-${step}`);
  if (target) target.classList.add('active');

  bookingState.step = step;
  renderProgress();

  if (step === 5) renderReview();

  window.scrollTo({ top: document.getElementById('booking-wizard').offsetTop - 80, behavior: 'smooth' });
}

/* ---------------------------------------------------------
   VALIDATION
   --------------------------------------------------------- */

function validateStep(step) {
  if (step === 1) {
    const err = document.getElementById('cal-error');
    if (!bookingState.checkin) {
      if (err) err.textContent = 'Please select a check-in date.';
      return false;
    }
    if (!bookingState.checkout) {
      if (err) err.textContent = 'Please select a check-out date.';
      return false;
    }
    if (new Date(bookingState.checkout) <= new Date(bookingState.checkin)) {
      if (err) err.textContent = 'Check-out date must be after check-in date.';
      return false;
    }
    if (err) err.textContent = '';
    return true;
  }

  if (step === 2) {
    const err = document.getElementById('guests-error');
    if (bookingState.adults < 1) {
      if (err) err.textContent = 'At least 1 adult is required.';
      return false;
    }
    if (err) err.textContent = '';
    return true;
  }

  if (step === 3) {
    if (!bookingState.room) {
      alert('Please select a preferred room (or select "Not Sure" to get a recommendation).');
      return false;
    }
    return true;
  }

  if (step === 4) {
    const nameEl = document.getElementById('guest-name');
    const mobEl  = document.getElementById('guest-mobile');
    if (!nameEl.value.trim()) {
      alert('Please enter your full name.');
      nameEl.focus();
      return false;
    }
    if (!mobEl.value.trim()) {
      alert('Please enter your mobile number.');
      mobEl.focus();
      return false;
    }
    return true;
  }

  return true;
}

/* ---------------------------------------------------------
   REVIEW SCREEN
   --------------------------------------------------------- */

function generateEnquiryId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'GROOT-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function renderReview() {
  if (!bookingState.enquiryId) {
    bookingState.enquiryId = generateEnquiryId();
  }

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val) el.textContent = val;
  };

  set('review-enquiry-id', bookingState.enquiryId);
  set('review-id-display', bookingState.enquiryId);
  set('review-checkin',  formatDateShort(bookingState.checkin));
  set('review-checkout', formatDateShort(bookingState.checkout));

  const nights = bookingState.checkin && bookingState.checkout
    ? Math.round((new Date(bookingState.checkout) - new Date(bookingState.checkin)) / 86400000) : 0;

  set('review-nights', `${nights} night${nights !== 1 ? 's' : ''}`);

  const guests = [
    bookingState.adults > 0   ? `${bookingState.adults} Adult${bookingState.adults !== 1 ? 's' : ''}` : null,
    bookingState.children > 0 ? `${bookingState.children} Child${bookingState.children !== 1 ? 'ren' : ''}` : null,
  ].filter(Boolean).join(', ');

  set('review-guests', guests || '1 Adult');

  const rooms = (window.GrootStore ? window.GrootStore.getRooms() : null) || getRoomsData();
  const selectedRoomObj = rooms.find(r => r.id === bookingState.room);
  const roomDisplay = selectedRoomObj ? `${selectedRoomObj.name} (₹${selectedRoomObj.price.toLocaleString()}/night)` : (bookingState.room === 'not-sure' ? 'Open to recommendation' : 'Not selected');

  set('review-room', roomDisplay);
  set('review-name',   bookingState.name   || '—');
  set('review-mobile', bookingState.mobile || '—');
  set('review-email',  bookingState.email  || '—');

  const campfireMap = { yes: 'Interested', no: 'Not interested', more: 'Would like info' };
  const mealMap     = { yes: 'Interested', no: 'Not interested', more: 'Would like info' };

  set('review-campfire', bookingState.campfire ? (campfireMap[bookingState.campfire] || bookingState.campfire) : '—');
  set('review-meals',    bookingState.meals    ? (mealMap[bookingState.meals]       || bookingState.meals)    : '—');
  set('review-request',  bookingState.specialRequest || 'None');
}

/* ---------------------------------------------------------
   SUBMIT — OPEN WHATSAPP
   --------------------------------------------------------- */

async function submitBooking(e) {
  if (e && e.preventDefault) {
    e.preventDefault();
  }

  // Strict final validation before insert
  if (!bookingState.name || !bookingState.mobile || !bookingState.checkin || !bookingState.checkout) {
    alert('Please ensure Name, Phone, Check-in, and Check-out fields are filled.');
    return;
  }
  if (new Date(bookingState.checkout) <= new Date(bookingState.checkin)) {
    alert('Check-out date must be after check-in date.');
    return;
  }
  if ((bookingState.adults || 0) < 1) {
    alert('At least 1 adult is required.');
    return;
  }

  const rooms = (window.GrootStore ? window.GrootStore.getRooms() : null) || getRoomsData();
  const selectedRoomObj = rooms.find(r => r.id === bookingState.room);
  const roomNameFormatted = selectedRoomObj ? `${selectedRoomObj.name} (₹${selectedRoomObj.price.toLocaleString()}/night)` : (bookingState.room === 'not-sure' ? 'Open to recommendation' : bookingState.room);

  const enquiryId = bookingState.enquiryId || generateEnquiryId();

  // Show a loading state on the button
  const submitBtn = document.getElementById('booking-submit') || document.getElementById('wizard-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loader-spinner"></span> Saving...';
  }

  try {
    const payload = {
      booking_reference: enquiryId,
      guest_name: bookingState.name,
      guest_phone: bookingState.mobile,
      guest_email: bookingState.email || null,
      check_in: bookingState.checkin,
      check_out: bookingState.checkout,
      guests: (bookingState.adults || 0) + (bookingState.children || 0),
      campfire: bookingState.campfire || null,
      meals: bookingState.meals || null,
      special_requests: bookingState.specialRequest || 'None',
      status: 'pending',
      room_id: null
    };

    if (supabase && typeof supabase.from === 'function') {
      const { data, error } = await supabase.from('bookings').insert([payload]);
      if (error) {
        console.warn('Supabase booking insert warning:', error);
      }
    }

    try {
      const localBookings = JSON.parse(localStorage.getItem('groot_guest_bookings_v1') || '[]');
      localBookings.unshift(payload);
      localStorage.setItem('groot_guest_bookings_v1', JSON.stringify(localBookings));
    } catch (e) {}
  } catch (err) {
    console.warn('Booking sync warning (proceeding to WhatsApp):', err);
  }

  // Restore button state
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Complete Booking via WhatsApp';
  }

  // Database insert successful! Show success state.
  const panel = document.querySelector('.booking-form-panel');
  const success = document.getElementById('booking-success');

  if (panel && success) {
    panel.style.display = 'none';
    success.classList.add('show');
    
    // Update text to strictly match "Booking Submitted Successfully"
    const successTitle = success.querySelector('h2');
    if (successTitle) successTitle.textContent = 'Booking Submitted Successfully!';

    const progressEl = document.querySelector('.booking-progress');
    if (progressEl) progressEl.style.display = 'none';
  }

  // Redirect to WhatsApp only after the DB insert and UI updates
  openWhatsApp({
    enquiryId: enquiryId,
    name:          bookingState.name,
    mobile:        bookingState.mobile,
    whatsappNum:   bookingState.whatsappSameAsMobile ? bookingState.mobile : bookingState.whatsappNum,
    email:         bookingState.email,
    checkin:       bookingState.checkin,
    checkout:      bookingState.checkout,
    adults:        bookingState.adults,
    children:      bookingState.children,
    room:          roomNameFormatted,
    campfire:      bookingState.campfire,
    meals:         bookingState.meals,
    specialRequest: bookingState.specialRequest,
  });
}

/* ---------------------------------------------------------
   PROGRESS INDICATOR
   --------------------------------------------------------- */

function renderProgress() {
  document.querySelectorAll('.progress-step').forEach((step, i) => {
    const n = i + 1;
    step.classList.remove('active', 'completed');
    if (n < bookingState.step)  step.classList.add('completed');
    if (n === bookingState.step) step.classList.add('active');
  });
}

/* ---------------------------------------------------------
   SIDEBAR SUMMARY
   --------------------------------------------------------- */

function updateSidebar() {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '—';
  };

  set('sb-checkin',  bookingState.checkin  ? formatDateShort(bookingState.checkin)  : null);
  set('sb-checkout', bookingState.checkout ? formatDateShort(bookingState.checkout) : null);

  const nights = bookingState.checkin && bookingState.checkout
    ? Math.round((new Date(bookingState.checkout) - new Date(bookingState.checkin)) / 86400000) : 0;
  set('sb-nights', nights > 0 ? `${nights} night${nights !== 1 ? 's' : ''}` : null);

  const guests = [
    bookingState.adults > 0   ? `${bookingState.adults} Adult${bookingState.adults !== 1 ? 's' : ''}` : null,
    bookingState.children > 0 ? `${bookingState.children} Child${bookingState.children !== 1 ? 'ren' : ''}` : null,
  ].filter(Boolean).join(', ');
  set('sb-guests', guests || '1 Adult');

  const rooms = (window.GrootStore ? window.GrootStore.getRooms() : null) || getRoomsData();
  const selectedRoomObj = rooms.find(r => r.id === bookingState.room);
  const roomDisplay = selectedRoomObj ? `${selectedRoomObj.name} — ₹${selectedRoomObj.price.toLocaleString()}` : (bookingState.room === 'not-sure' ? 'Recommendation' : null);

  set('sb-room', roomDisplay);
  set('sb-name', bookingState.name || null);
}

/* ---------------------------------------------------------
   BOOT
   --------------------------------------------------------- */

function bootBookingWizard() {
  initBookingWizard();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootBookingWizard);
} else {
  bootBookingWizard();
}
