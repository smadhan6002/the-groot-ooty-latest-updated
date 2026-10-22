/* =========================================================
   THE GROOT OOTY — Admin Panel Controller
   Restricted: Room & Property Price Editing Only
   ========================================================= */
import { supabase } from './supabase.js';

window.handleAdminLogin = handleAdminLogin;
window.handleAdminLogout = handleAdminLogout;
window.switchTab = switchTab;
window.initAdminTabs = initAdminTabs;
window.initAdminAuth = initAdminAuth;
window.loadBookingNotes = loadBookingNotes;
window.setDefaultDates = setDefaultDates;
window.saveQuickPrice = saveQuickPrice;
window.saveCardPrice = saveCardPrice;
window.openRoomModal = openRoomModal;
window.closeRoomModal = closeRoomModal;
window.handleSaveRoomModal = handleSaveRoomModal;
window.handleSaveBookingNote = handleSaveBookingNote;
window.clearNotesForm = clearNotesForm;
window.editBookingNote = editBookingNote;
window.deleteBookingNote = deleteBookingNote;
window.viewBookingNote = viewBookingNote;
window.closeNoteViewModal = closeNoteViewModal;
window.filterBookingNotes = filterBookingNotes;
window.handleCheckinDateChange = handleCheckinDateChange;
window.openSqlModal = openSqlModal;
window.closeSqlModal = closeSqlModal;
window.copySqlCode = copySqlCode;

function bootAdmin() {
  initAdminAuth();
  initAdminTabs();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootAdmin);
} else {
  bootAdmin();
}

/* ---------------------------------------------------------
   1. AUTHENTICATION
   --------------------------------------------------------- */

async function initAdminAuth() {
  const authScreen = document.getElementById('admin-auth-screen');
  const dashScreen = document.getElementById('admin-dashboard-screen');

  // Check 1: Direct administrative session (sessionStorage)
  const isDirectAuth = sessionStorage.getItem('groot_admin_auth_v1') === 'authenticated';
  if (isDirectAuth) {
    if (authScreen) authScreen.style.display = 'none';
    if (dashScreen) dashScreen.classList.add('active');
    if (window.location.pathname === '/admin' || window.location.pathname === '/admin.html') {
      window.history.pushState(null, '', '/admin/dashboard');
    }
    loadDashboardData();
    return;
  }
  
  // Check 2: Supabase Auth Session
  const { data: { session }, error } = await supabase.auth.getSession();

  if (session && session.user) {
    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    
    let isAuthorized = false;
    if (!profileError && profile && profile.role && String(profile.role).trim().toLowerCase() === 'admin') {
      isAuthorized = true;
    }

    if (isAuthorized) {
      if (authScreen) authScreen.style.display = 'none';
      if (dashScreen) dashScreen.classList.add('active');
      if (window.location.pathname === '/admin' || window.location.pathname === '/admin.html') {
        window.history.pushState(null, '', '/admin/dashboard');
      }
      loadDashboardData();
    } else {
      await supabase.auth.signOut();
      if (authScreen) authScreen.style.display = 'flex';
      if (dashScreen) dashScreen.classList.remove('active');
      if (window.location.pathname === '/admin/dashboard') {
        window.location.href = '/admin';
      }
    }
  } else {
    if (authScreen) authScreen.style.display = 'flex';
    if (dashScreen) dashScreen.classList.remove('active');
    if (window.location.pathname === '/admin/dashboard') {
      window.location.href = '/admin';
    }
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('admin-email').value.trim();
  const passcode = document.getElementById('admin-passcode').value.trim();
  const errorEl = document.getElementById('admin-login-error');
  const btn = e.target.querySelector('button[type="submit"]');

  if (!email || !passcode) {
    if (errorEl) {
      errorEl.innerText = "Username/email and password are required.";
      errorEl.style.display = 'block';
    }
    return;
  }

  const originalBtnText = btn.innerHTML;
  btn.innerHTML = "Authenticating...";
  btn.disabled = true;

  const authEmail = (email.toLowerCase() === 'admin') ? 'admin@thegrootooty.com' : email;
  const isDirectMatch = (email.toLowerCase() === 'admin' || email.toLowerCase() === 'admin@thegrootooty.com') && passcode === 'groot2026';

  let supabaseAuthSuccess = false;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: passcode });
    if (!error && data && data.user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      if (profile && profile.role && String(profile.role).trim().toLowerCase() === 'admin') {
        supabaseAuthSuccess = true;
      }
    }
  } catch (err) {
    console.warn('Supabase Auth signIn attempt notice:', err);
  }

  if (supabaseAuthSuccess) {
    sessionStorage.setItem('groot_admin_auth_v1', 'authenticated');
    if (errorEl) errorEl.style.display = 'none';
    btn.innerHTML = originalBtnText;
    btn.disabled = false;
    showToast('Admin access granted (Supabase session active).');
    initAdminAuth();
    initAdminTabs();
    return;
  }

  // Fallback: Direct Administrative Passcode Check (Local / Direct Admin Access)
  if (isDirectMatch) {
    sessionStorage.setItem('groot_admin_auth_v1', 'authenticated');
    if (errorEl) errorEl.style.display = 'none';
    btn.innerHTML = originalBtnText;
    btn.disabled = false;
    showToast('Admin access granted.');
    initAdminAuth();
    initAdminTabs();
    return;
  }

  if (errorEl) {
    errorEl.innerText = "Invalid credentials. Please enter the correct admin email/passcode.";
    errorEl.style.display = 'block';
  }
  btn.innerHTML = originalBtnText;
  btn.disabled = false;
}

async function handleAdminLogout() {
  sessionStorage.removeItem('groot_admin_auth_v1');
  try {
    await supabase.auth.signOut();
  } catch (err) {}
  window.location.href = '/admin';
}

/* ---------------------------------------------------------
   2. TABS NAVIGATION
   --------------------------------------------------------- */

function initAdminTabs() {
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  tabBtns.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const tabId = btn.dataset.tab;
      switchTab(tabId);
    };
  });
}

function switchTab(tabId) {
  if (!tabId) return;

  document.querySelectorAll('.admin-tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });

  document.querySelectorAll('.admin-tab-content').forEach(c => {
    c.classList.toggle('active', c.id === `tab-${tabId}`);
  });

  if (tabId === 'dashboard') renderDashboardOverview();
  if (tabId === 'rooms') renderRoomsManagement();
  if (tabId === 'notes') {
    setDefaultDates();
    loadBookingNotes();
  }
  if (tabId === 'gallery') renderGalleryManagement();
  if (tabId === 'settings') renderSettingsForm();
}

/* ---------------------------------------------------------
   3. DATA LOADING & RENDERING
   --------------------------------------------------------- */

async function loadDashboardData() {
  if (window.GrootStore) {
    await window.GrootStore.fetchLiveRooms();
  }
  renderDashboardOverview();
  renderRoomsManagement();
  loadBookingNotes();
  renderGalleryManagement();
  renderSettingsForm();

  if (window.GrootStore) {
    window.GrootStore.subscribe(() => {
      renderDashboardOverview();
      renderRoomsManagement();
      renderGalleryManagement();
    });
  }
}

/* --- TAB 1: OVERVIEW DASHBOARD (PRICE EDITING TABLE) --- */
function renderDashboardOverview() {
  if (!window.GrootStore) return;

  const rooms = window.GrootStore.getRooms();
  const totalEl = document.getElementById('stat-total-rooms');
  if (totalEl) totalEl.textContent = rooms.length;

  const tableWrap = document.getElementById('dashboard-rooms-table-wrap');
  if (!tableWrap) return;

  let html = `
    <div style="overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse; text-align:left;">
        <thead>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.12); color:var(--admin-text-muted); font-size:0.75rem; text-transform:uppercase; letter-spacing:0.08em;">
            <th style="padding:12px 14px;">Accommodation (Read-Only)</th>
            <th style="padding:12px 14px;">Price / Night (Editable)</th>
            <th style="padding:12px 14px;">Status (Read-Only)</th>
            <th style="padding:12px 14px; text-align:right;">Action</th>
          </tr>
        </thead>
        <tbody>
  `;

  rooms.forEach(r => {
    html += `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.06); font-size:0.9rem;">
        <td style="padding:14px; display:flex; align-items:center; gap:12px;">
          <img src="${r.image}" alt="${r.name}" style="width:48px; height:36px; border-radius:6px; object-fit:cover;" />
          <div>
            <div style="font-weight:700; color:#FFFFFF;">${r.name}</div>
            <div style="font-size:0.75rem; color:var(--admin-text-muted);">${r.tagline || ''}</div>
          </div>
        </td>
        <td style="padding:14px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="color:var(--admin-accent-glow); font-weight:700;">₹</span>
            <input
              type="number"
              id="dash-price-${r.id}"
              value="${r.price}"
              step="100"
              min="0"
              style="width:95px; background:rgba(0,0,0,0.4); border:1px solid rgba(159,207,73,0.4); border-radius:6px; color:#FFFFFF; padding:6px 8px; font-weight:700; font-size:0.95rem;"
            />
            <button onclick="saveQuickPrice('${r.id}')" class="admin-btn admin-btn-primary" style="padding:5px 12px; font-size:0.75rem;">Save</button>
          </div>
        </td>
        <td style="padding:14px;">
          <span class="status-pill available" style="border:none;">
            ● Available
          </span>
        </td>
        <td style="padding:14px; text-align:right;">
          <button onclick="openRoomModal('${r.id}')" class="admin-btn admin-btn-outline" style="padding:6px 12px; font-size:0.8rem;">
            Edit Price &rarr;
          </button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  tableWrap.innerHTML = html;
}

/* --- TAB 2: ROOMS & PRICING MANAGEMENT --- */
function renderRoomsManagement() {
  if (!window.GrootStore) return;

  const container = document.getElementById('admin-rooms-list');
  if (!container) return;

  const rooms = window.GrootStore.getRooms();
  container.innerHTML = '';

  rooms.forEach(r => {
    const card = document.createElement('div');
    card.className = 'admin-room-card';

    card.innerHTML = `
      <div class="admin-room-img-wrap">
        <img src="${r.image}" alt="${r.name}" />
      </div>
      <div class="admin-room-body">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem; flex-wrap:gap:6px;">
          <h3 class="admin-room-name">${r.name}</h3>
          <span class="status-pill available">
            ● Available
          </span>
        </div>
        <p class="admin-room-desc">${r.shortDescription || r.description}</p>
        
        <div class="admin-price-row">
          <span style="font-size:0.85rem; color:var(--admin-text-muted);">Price / Night:</span>
          <span style="font-weight:700; color:var(--admin-accent-glow);">₹</span>
          <input type="number" id="room-card-price-${r.id}" class="admin-price-input" value="${r.price}" step="100" min="0" />
          <button onclick="saveCardPrice('${r.id}')" class="admin-btn admin-btn-primary" style="padding:6px 12px; font-size:0.8rem;">Save</button>
        </div>

        <div class="admin-room-actions" style="margin-top:auto; padding-top:0.75rem; border-top:1px solid rgba(255,255,255,0.08);">
          <button onclick="openRoomModal('${r.id}')" class="admin-btn admin-btn-outline" style="flex:1;">
            Edit Price
          </button>
          <a href="room-detail.html?room=${r.slug || r.id}" target="_blank" class="admin-btn admin-btn-outline" style="font-size:0.8rem;" title="View public live room page">
            ↗ Preview Live
          </a>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

async function saveQuickPrice(roomId) {
  const input = document.getElementById(`dash-price-${roomId}`);
  if (!input) return;
  const newPrice = parseInt(input.value, 10);
  if (isNaN(newPrice) || newPrice < 0) {
    alert('Please enter a valid price amount.');
    return;
  }
  
  const btn = input.nextElementSibling;
  const originalText = btn.innerHTML;
  btn.innerHTML = 'Saving...';
  btn.disabled = true;

  const result = await window.GrootStore.updateRoomPrice(roomId, newPrice);
  
  btn.innerHTML = originalText;
  btn.disabled = false;

  const currentRoom = result.room || window.GrootStore.getRoom(roomId);

  if (result && result.success) {
    showToast(`Updated price for ${currentRoom ? currentRoom.name : 'Room'} to ₹${newPrice.toLocaleString()}`);
  } else {
    alert(`Failed to update price: ${result ? result.error : 'Unknown error'}`);
    if (currentRoom) input.value = currentRoom.price; // Revert UI
  }
}

async function saveCardPrice(roomId) {
  const input = document.getElementById(`room-card-price-${roomId}`);
  if (!input) return;
  const newPrice = parseInt(input.value, 10);
  if (isNaN(newPrice) || newPrice < 0) {
    alert('Please enter a valid price amount.');
    return;
  }

  const btn = input.nextElementSibling;
  const originalText = btn.innerHTML;
  btn.innerHTML = 'Saving...';
  btn.disabled = true;

  const result = await window.GrootStore.updateRoomPrice(roomId, newPrice);
  
  btn.innerHTML = originalText;
  btn.disabled = false;

  const currentRoom = result.room || window.GrootStore.getRoom(roomId);

  if (result && result.success) {
    showToast(`Updated price for ${currentRoom ? currentRoom.name : 'Room'} to ₹${newPrice.toLocaleString()}`);
  } else {
    alert(`Failed to update price: ${result ? result.error : 'Unknown error'}`);
    if (currentRoom) input.value = currentRoom.price; // Revert UI
  }
}

/* --- ROOM PRICE EDIT MODAL --- */
function openRoomModal(roomId) {
  const room = window.GrootStore.getRoom(roomId);
  if (!room) return;

  document.getElementById('modal-room-id').value = room.id;
  document.getElementById('modal-room-name').value = room.name;
  document.getElementById('modal-room-price').value = room.price;

  document.getElementById('admin-room-modal').classList.add('active');
}

function closeRoomModal() {
  document.getElementById('admin-room-modal').classList.remove('active');
}

async function handleSaveRoomModal(e) {
  e.preventDefault();
  const id = document.getElementById('modal-room-id').value;
  const priceInput = document.getElementById('modal-room-price');
  const price = parseInt(priceInput.value, 10);

  if (isNaN(price) || price < 0) {
    alert('Please enter a valid price amount.');
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;
  btn.innerHTML = 'Saving...';
  btn.disabled = true;

  const result = await window.GrootStore.updateRoomPrice(id, price);
  
  btn.innerHTML = originalText;
  btn.disabled = false;

  if (result && result.success) {
    closeRoomModal();
    showToast(`Room price updated to ₹${price.toLocaleString()} successfully.`);
  } else {
    alert(`Failed to update price: ${result ? result.error : 'Unknown error'}`);
  }
}

/* --- TAB 3: GALLERY (READ-ONLY DISPLAY) --- */
function renderGalleryManagement() {
  if (!window.GrootStore) return;

  const container = document.getElementById('admin-gallery-list');
  if (!container) return;

  const gallery = window.GrootStore.getGallery(true);
  container.innerHTML = '';

  gallery.forEach(item => {
    const card = document.createElement('div');
    card.className = 'admin-gallery-card';

    card.innerHTML = `
      <img src="${item.url}" alt="${item.title}" class="admin-gallery-thumb" />
      <div class="admin-gallery-info">
        <div class="admin-gallery-title" title="${item.title}">${item.title}</div>
        <div style="font-size:0.75rem; color:var(--admin-text-muted);">
          Assigned: <span style="color:var(--admin-accent-glow); font-weight:600;">${(item.assignedRoom || 'property').toUpperCase()}</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:0.5rem; border-top:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:0.75rem; color:#25D366; font-weight:700;">
            ● Locked (System Photo)
          </span>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

/* --- TAB 4: SETTINGS (READ-ONLY DISPLAY) --- */
function renderSettingsForm() {
  if (!window.GrootStore) return;

  const settings = window.GrootStore.getSettings();
  const wEl = document.getElementById('set-whatsapp');
  const p1El = document.getElementById('set-phone1');
  const p2El = document.getElementById('set-phone2');
  const ciEl = document.getElementById('set-checkin');
  const coEl = document.getElementById('set-checkout');
  const noteEl = document.getElementById('set-note');

  if (wEl) wEl.value = settings.whatsapp || '';
  if (p1El) p1El.value = settings.phone1 || '';
  if (p2El) p2El.value = settings.phone2 || '';
  if (ciEl) ciEl.value = settings.checkInTime || '';
  if (coEl) coEl.value = settings.checkOutTime || '';
  if (noteEl) noteEl.value = settings.bookingNote || '';
}

/* ---------------------------------------------------------
   TOAST NOTIFICATION
   --------------------------------------------------------- */

function showToast(msg) {
  const toast = document.getElementById('admin-toast');
  const msgEl = document.getElementById('toast-msg');
  if (!toast || !msgEl) return;

  msgEl.textContent = msg;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

/* ---------------------------------------------------------
   5. MANUAL BOOKING NOTES CONTROLLER
   --------------------------------------------------------- */

const STORAGE_KEY_ADMIN_NOTES = 'groot_admin_booking_notes_v1';
let bookingNotesState = [];

function setDefaultDates() {
  const checkinInput = document.getElementById('note-checkin');
  const checkoutInput = document.getElementById('note-checkout');
  if (checkinInput && !checkinInput.value) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

    checkinInput.value = todayStr;
    checkinInput.min = todayStr;
    if (checkoutInput && !checkoutInput.value) {
      checkoutInput.value = tomorrowStr;
      checkoutInput.min = todayStr;
    }
  }
}

const SQL_MIGRATION_SCRIPT = `-- ==============================================================================
-- THE GROOT OOTY — Admin Manual Booking Notes Permissions & RLS Setup
-- Run this in your Supabase Dashboard -> SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Ensure table structure exists with exact required schema
CREATE TABLE IF NOT EXISTS public.booking_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    room_name TEXT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    number_of_guests INTEGER NOT NULL DEFAULT 1,
    advance_amount NUMERIC(10, 2) DEFAULT 0,
    total_booking_amount NUMERIC(10, 2) DEFAULT 0,
    booking_status TEXT NOT NULL DEFAULT 'Confirmed',
    additional_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for fast sorting and filtering
CREATE INDEX IF NOT EXISTS idx_booking_notes_checkin ON public.booking_notes(check_in);
CREATE INDEX IF NOT EXISTS idx_booking_notes_status ON public.booking_notes(booking_status);
CREATE INDEX IF NOT EXISTS idx_booking_notes_created_at ON public.booking_notes(created_at DESC);

-- 3. Grant table privileges to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.booking_notes TO authenticated;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.booking_notes ENABLE ROW LEVEL SECURITY;

-- 5. Verified Admin-Only Policy: Only authenticated users with role = 'admin' in profiles table have access
DROP POLICY IF EXISTS "Admins can view and manage booking notes" ON public.booking_notes;

CREATE POLICY "Admins can view and manage booking notes"
ON public.booking_notes
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND LOWER(TRIM(profiles.role)) = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND LOWER(TRIM(profiles.role)) = 'admin'
    )
);`;

async function loadBookingNotes() {
  const syncBanner = document.getElementById('notes-sync-banner');

  try {
    const { data, error } = await supabase
      .from('booking_notes')
      .select('*')
      .order('check_in', { ascending: false });

    if (error) {
      console.error('[Supabase loadBookingNotes Error]', error);
      if (syncBanner) {
        syncBanner.style.display = 'flex';
        const msgEl = document.getElementById('notes-sync-status-msg');
        if (msgEl) {
          msgEl.innerHTML = `Supabase query notification (${escapeHtml(error.code || 'RLS')}): ${escapeHtml(error.message)}. If RLS is enabled, please verify admin authorization policies in Supabase.`;
        }
      }
      // Offline fallback: load cached notes if available
      const cached = localStorage.getItem(STORAGE_KEY_ADMIN_NOTES);
      if (cached !== null) {
        try {
          bookingNotesState = JSON.parse(cached);
        } catch (e) {
          bookingNotesState = [];
        }
      } else {
        bookingNotesState = [];
      }
    } else {
      if (syncBanner) syncBanner.style.display = 'none';
      bookingNotesState = Array.isArray(data) ? data : [];
      try {
        localStorage.setItem(STORAGE_KEY_ADMIN_NOTES, JSON.stringify(bookingNotesState));
      } catch (e) {}
    }
  } catch (err) {
    console.error('[loadBookingNotes Exception]', err);
    if (syncBanner) syncBanner.style.display = 'flex';
    const cached = localStorage.getItem(STORAGE_KEY_ADMIN_NOTES);
    bookingNotesState = cached ? JSON.parse(cached) : [];
  }

  filterBookingNotes();
}

function handleCheckinDateChange() {
  const inEl = document.getElementById('note-checkin');
  const outEl = document.getElementById('note-checkout');
  if (inEl && outEl && inEl.value) {
    outEl.min = inEl.value;
    if (outEl.value && outEl.value < inEl.value) {
      outEl.value = inEl.value;
    }
  }
}

async function handleSaveBookingNote(e) {
  e.preventDefault();

  const idInput = document.getElementById('note-id');
  const nameInput = document.getElementById('note-customer-name');
  const contactInput = document.getElementById('note-contact');
  const roomInput = document.getElementById('note-room');
  const checkinInput = document.getElementById('note-checkin');
  const checkoutInput = document.getElementById('note-checkout');
  const guestsInput = document.getElementById('note-guests');
  const advanceInput = document.getElementById('note-advance');
  const totalInput = document.getElementById('note-total');
  const statusInput = document.getElementById('note-status');
  const notesInput = document.getElementById('note-notes');
  const submitBtn = document.getElementById('note-submit-btn');
  const errorEl = document.getElementById('note-form-error');
  const successEl = document.getElementById('note-form-success');

  const hideFormAlerts = () => {
    if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }
    if (successEl) { successEl.style.display = 'none'; successEl.textContent = ''; }
  };
  const showFormError = (msg) => {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
      errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  hideFormAlerts();

  const customerName = nameInput.value.trim();
  const contactNumber = contactInput.value.trim();
  const roomName = roomInput.value;
  const checkinVal = checkinInput.value;
  const checkoutVal = checkoutInput.value;

  if (!customerName) {
    showFormError('Customer Name is required.');
    nameInput.focus();
    return;
  }
  if (!contactNumber) {
    showFormError('Contact Number is required.');
    contactInput.focus();
    return;
  }
  if (!roomName) {
    showFormError('Please select a Room.');
    roomInput.focus();
    return;
  }
  if (!checkinVal) {
    showFormError('Check-in Date is required.');
    checkinInput.focus();
    return;
  }
  if (!checkoutVal) {
    showFormError('Check-out Date is required.');
    checkoutInput.focus();
    return;
  }
  if (new Date(checkoutVal) < new Date(checkinVal)) {
    showFormError('Check-out date cannot be earlier than check-in date.');
    checkoutInput.focus();
    return;
  }

  const isEditing = Boolean(idInput.value && idInput.value.trim());
  const noteId = idInput.value ? idInput.value.trim() : null;

  // Convert numeric inputs to valid numbers safely
  const guestsVal = parseInt(guestsInput.value, 10);
  const validGuests = (!isNaN(guestsVal) && guestsVal >= 1) ? guestsVal : 1;

  const rawAdvance = advanceInput.value ? advanceInput.value.trim() : '';
  const parsedAdvance = rawAdvance !== '' ? parseFloat(rawAdvance) : 0;
  const validAdvance = (!isNaN(parsedAdvance) && parsedAdvance >= 0) ? parsedAdvance : 0;

  const rawTotal = totalInput.value ? totalInput.value.trim() : '';
  const parsedTotal = rawTotal !== '' ? parseFloat(rawTotal) : 0;
  const validTotal = (!isNaN(parsedTotal) && parsedTotal >= 0) ? parsedTotal : 0;

  const statusVal = statusInput.value || 'Confirmed';
  const notesVal = notesInput.value ? notesInput.value.trim() : '';

  // Exact column mapping for public.booking_notes
  const payload = {
    customer_name: customerName,
    contact_number: contactNumber,
    room_name: roomName,
    check_in: checkinVal,
    check_out: checkoutVal,
    number_of_guests: validGuests,
    advance_amount: validAdvance,
    total_booking_amount: validTotal,
    booking_status: statusVal,
    additional_notes: notesVal,
    updated_at: new Date().toISOString()
  };

  // Prevent duplicate submissions
  const origBtnText = submitBtn.innerHTML;
  submitBtn.innerHTML = '⏳ Saving to Supabase...';
  submitBtn.disabled = true;

  try {
    let resultData = null;
    let queryError = null;

    if (isEditing) {
      const { data, error } = await supabase
        .from('booking_notes')
        .update(payload)
        .eq('id', noteId)
        .select();
      resultData = data;
      queryError = error;
    } else {
      const { data, error } = await supabase
        .from('booking_notes')
        .insert([payload])
        .select();
      resultData = data;
      queryError = error;
    }

    if (queryError) {
      console.error('[Supabase Save Error]', queryError);
      
      let readableMsg = queryError.message || 'Database error while saving booking note.';
      if (queryError.code === '42501') {
        readableMsg = `Supabase Authorization Error (42501): ${queryError.message}. The table public.booking_notes has Row Level Security (RLS) enabled. Please ensure you are logged in with verified admin privileges and the admin RLS policy is applied in your Supabase SQL Editor.`;
      }
      
      showFormError(readableMsg);
      // Do NOT show false success message
      return;
    }

    // Success confirmed by Supabase!
    const savedRecord = (Array.isArray(resultData) && resultData.length > 0) ? resultData[0] : null;
    const finalId = (savedRecord && savedRecord.id) ? savedRecord.id : (noteId || (crypto.randomUUID ? crypto.randomUUID() : 'note_' + Date.now()));

    // Update local state mirror
    if (isEditing) {
      bookingNotesState = bookingNotesState.map(n => String(n.id) === String(noteId) ? { ...n, ...payload, ...(savedRecord || {}), id: noteId } : n);
    } else {
      bookingNotesState.unshift({
        id: finalId,
        ...payload,
        ...(savedRecord || {}),
        created_at: (savedRecord && savedRecord.created_at) ? savedRecord.created_at : new Date().toISOString()
      });
    }
    try {
      localStorage.setItem(STORAGE_KEY_ADMIN_NOTES, JSON.stringify(bookingNotesState));
    } catch (e) {}

    showToast(isEditing ? 'Booking note updated in Supabase.' : 'Booking note saved to Supabase successfully.');
    clearNotesForm();
    await loadBookingNotes();
  } catch (err) {
    console.error('[Exception Saving Note]', err);
    showFormError(`Network or client error: ${err.message || 'Could not connect to Supabase.'}`);
  } finally {
    submitBtn.innerHTML = origBtnText;
    submitBtn.disabled = false;
  }
}

function clearNotesForm() {
  const form = document.getElementById('admin-booking-note-form');
  if (form) form.reset();
  const idInput = document.getElementById('note-id');
  if (idInput) idInput.value = '';
  const guestsInput = document.getElementById('note-guests');
  if (guestsInput) guestsInput.value = '1';
  const statusInput = document.getElementById('note-status');
  if (statusInput) statusInput.value = 'Confirmed';
  const title = document.getElementById('form-section-title');
  if (title) title.textContent = 'New Booking Note';
  const submitBtn = document.getElementById('note-submit-btn');
  if (submitBtn) submitBtn.innerHTML = '💾 Save Booking';
  const cancelBtn = document.getElementById('note-cancel-edit-btn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  const badgeWrap = document.getElementById('edit-badge-wrap');
  if (badgeWrap) badgeWrap.style.display = 'none';
  const errorEl = document.getElementById('note-form-error');
  if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }
  const successEl = document.getElementById('note-form-success');
  if (successEl) { successEl.style.display = 'none'; successEl.textContent = ''; }
  setDefaultDates();
}

function editBookingNote(id) {
  const note = bookingNotesState.find(n => String(n.id) === String(id));
  if (!note) return;

  document.getElementById('note-id').value = note.id;
  document.getElementById('note-customer-name').value = note.customer_name || '';
  document.getElementById('note-contact').value = note.contact_number || '';
  document.getElementById('note-room').value = note.room_name || '';
  document.getElementById('note-checkin').value = note.check_in || '';
  document.getElementById('note-checkout').value = note.check_out || '';
  document.getElementById('note-guests').value = note.number_of_guests || note.guests || 1;
  document.getElementById('note-advance').value = (note.advance_amount !== null && note.advance_amount !== undefined) ? note.advance_amount : '';
  document.getElementById('note-total').value = (note.total_booking_amount !== null && note.total_booking_amount !== undefined) 
    ? note.total_booking_amount 
    : ((note.total_amount !== null && note.total_amount !== undefined) ? note.total_amount : '');
  document.getElementById('note-status').value = note.booking_status || note.status || 'Confirmed';
  document.getElementById('note-notes').value = note.additional_notes || note.notes || '';

  document.getElementById('form-section-title').textContent = `Edit Booking: ${note.customer_name}`;
  document.getElementById('note-submit-btn').innerHTML = '💾 Update Booking';
  document.getElementById('note-cancel-edit-btn').style.display = 'inline-flex';
  document.getElementById('edit-badge-wrap').style.display = 'block';

  const errorEl = document.getElementById('note-form-error');
  if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }

  handleCheckinDateChange();

  const section = document.getElementById('booking-notes-form-section');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }
}

async function deleteBookingNote(id) {
  const note = bookingNotesState.find(n => String(n.id) === String(id));
  const guestName = note ? note.customer_name : 'this booking note';

  if (!confirm(`Are you sure you want to delete the booking record for "${guestName}"?\nThis cannot be undone.`)) {
    return;
  }

  try {
    const { error } = await supabase
      .from('booking_notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Supabase Delete Error]', error);
      alert(`Could not delete record from Supabase: ${error.message}`);
      return;
    }
  } catch (err) {
    console.error('[deleteBookingNote Exception]', err);
    alert(`Could not delete record: ${err.message}`);
    return;
  }

  bookingNotesState = bookingNotesState.filter(n => String(n.id) !== String(id));
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN_NOTES, JSON.stringify(bookingNotesState));
  } catch (e) {}
  showToast('Booking record deleted from Supabase.');
  filterBookingNotes();
}

function viewBookingNote(id) {
  const note = bookingNotesState.find(n => String(n.id) === String(id));
  if (!note) return;

  const content = document.getElementById('admin-note-view-content');
  if (!content) return;

  const statusVal = note.booking_status || note.status || 'Confirmed';
  const statusClass = statusVal.toLowerCase().replace(/\s+/g, '-');
  const advance = (note.advance_amount !== null && note.advance_amount !== undefined) ? Number(note.advance_amount) : 0;
  const total = (note.total_booking_amount !== null && note.total_booking_amount !== undefined) 
    ? Number(note.total_booking_amount) 
    : ((note.total_amount !== null && note.total_amount !== undefined) ? Number(note.total_amount) : 0);
  const balance = total > advance ? total - advance : 0;
  const guests = note.number_of_guests || note.guests || 1;
  const notesText = note.additional_notes || note.notes || '';

  let nightsText = '';
  if (note.check_in && note.check_out) {
    const d1 = new Date(note.check_in);
    const d2 = new Date(note.check_out);
    const nights = Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
    nightsText = ` (${nights} night${nights === 1 ? '' : 's'})`;
  }

  content.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
      <div>
        <h4 style="font-size:1.25rem; font-weight:700; color:#FFFFFF; margin:0;">${escapeHtml(note.customer_name)}</h4>
        <div style="font-size:0.85rem; color:var(--admin-text-muted); margin-top:2px;">
          📞 <a href="tel:${escapeHtml(note.contact_number)}" style="color:var(--admin-accent-glow); text-decoration:none;">${escapeHtml(note.contact_number)}</a>
        </div>
      </div>
      <span class="status-pill ${statusClass}">
        ● ${escapeHtml(statusVal)}
      </span>
    </div>

    <div class="admin-details-grid">
      <div class="admin-detail-item">
        <span class="admin-detail-label">Room / Accommodation</span>
        <span class="admin-detail-value" style="color:var(--admin-accent-glow);">${escapeHtml(note.room_name)}</span>
      </div>
      <div class="admin-detail-item">
        <span class="admin-detail-label">Total Guests</span>
        <span class="admin-detail-value">👥 ${guests} Person(s)</span>
      </div>
      <div class="admin-detail-item">
        <span class="admin-detail-label">Check-in Date</span>
        <span class="admin-detail-value">📅 ${formatDateDisplay(note.check_in) || note.check_in}</span>
      </div>
      <div class="admin-detail-item">
        <span class="admin-detail-label">Check-out Date</span>
        <span class="admin-detail-value">📅 ${formatDateDisplay(note.check_out) || note.check_out}${nightsText}</span>
      </div>
      <div class="admin-detail-item">
        <span class="admin-detail-label">Advance Paid</span>
        <span class="admin-detail-value" style="color:#25D366;">₹${advance.toLocaleString()}</span>
      </div>
      <div class="admin-detail-item">
        <span class="admin-detail-label">Total Booking Tariff</span>
        <span class="admin-detail-value">₹${total.toLocaleString()}</span>
      </div>
      ${total > 0 ? `
      <div class="admin-detail-item" style="grid-column: 1 / -1; background:rgba(0,0,0,0.3); padding:8px 12px; border-radius:6px;">
        <span class="admin-detail-label">Remaining Balance Due</span>
        <span class="admin-detail-value" style="color:${balance > 0 ? '#FFB74D' : '#25D366'};">
          ₹${balance.toLocaleString()} ${balance === 0 ? '(Fully Paid)' : ''}
        </span>
      </div>` : ''}
    </div>

    ${notesText ? `
    <div style="margin-top:1.25rem;">
      <span class="admin-detail-label">Special Requests / Notes:</span>
      <div style="margin-top:6px; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px 14px; font-size:0.9rem; color:#FAF7F2; line-height:1.5; white-space:pre-wrap;">
        ${escapeHtml(notesText)}
      </div>
    </div>` : ''}

    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.25rem; font-size:0.75rem; color:var(--admin-text-muted);">
      <span>Recorded: ${note.created_at ? new Date(note.created_at).toLocaleDateString() : 'Manual Note'}</span>
      <div style="display:flex; gap:8px;">
        <button onclick="closeNoteViewModal(); editBookingNote('${note.id}');" class="admin-btn admin-btn-outline" style="padding:4px 10px; font-size:0.75rem;">
          ✏️ Edit Note
        </button>
      </div>
    </div>
  `;

  document.getElementById('admin-note-view-modal').classList.add('active');
}

function closeNoteViewModal() {
  const modal = document.getElementById('admin-note-view-modal');
  if (modal) modal.classList.remove('active');
}

function filterBookingNotes() {
  const searchInput = document.getElementById('note-search-input');
  const roomFilter = document.getElementById('note-filter-room');
  const statusFilter = document.getElementById('note-filter-status');

  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const selectedRoom = roomFilter ? roomFilter.value : 'all';
  const selectedStatus = statusFilter ? statusFilter.value : 'all';

  const filtered = bookingNotesState.filter(note => {
    const nameMatch = (note.customer_name || '').toLowerCase().includes(query);
    const phoneMatch = (note.contact_number || '').toLowerCase().includes(query);
    const matchesSearch = !query || nameMatch || phoneMatch;

    const noteRoom = (note.room_name || '').toLowerCase();
    const selRoom = selectedRoom.toLowerCase();
    const matchesRoom = selectedRoom === 'all' || noteRoom.includes(selRoom) || selRoom.includes(noteRoom);
    
    const noteStatus = (note.booking_status || note.status || '').toLowerCase();
    const matchesStatus = selectedStatus === 'all' || noteStatus === selectedStatus.toLowerCase();

    return matchesSearch && matchesRoom && matchesStatus;
  });

  renderBookingNotes(filtered);
}

function renderBookingNotes(notes) {
  const container = document.getElementById('admin-notes-container');
  const countBadge = document.getElementById('notes-count-badge');
  if (!container) return;

  if (countBadge) {
    countBadge.textContent = `${notes.length} of ${bookingNotesState.length} Record${bookingNotesState.length === 1 ? '' : 's'}`;
  }

  if (notes.length === 0) {
    if (bookingNotesState.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:3rem 1.5rem; background:rgba(0,0,0,0.2); border:1px dashed rgba(255,255,255,0.12); border-radius:12px;">
          <div style="font-size:2rem; margin-bottom:0.5rem;">📝</div>
          <div style="font-size:1.1rem; font-weight:700; color:#FFFFFF; margin-bottom:0.25rem;">No Booking Notes Recorded Yet</div>
          <p style="font-size:0.85rem; color:var(--admin-text-muted); max-width:400px; margin:0 auto 1.5rem;">
            Use the form above to record room reservations, guest contact details, dates, and payment notes.
          </p>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="text-align:center; padding:3rem 1.5rem; background:rgba(0,0,0,0.2); border:1px dashed rgba(255,255,255,0.12); border-radius:12px;">
          <div style="font-size:2rem; margin-bottom:0.5rem;">🔍</div>
          <div style="font-size:1.1rem; font-weight:700; color:#FFFFFF; margin-bottom:0.25rem;">No Matching Records Found</div>
          <p style="font-size:0.85rem; color:var(--admin-text-muted); max-width:400px; margin:0 auto 1rem;">
            No booking notes match your current search and filter selections.
          </p>
          <button onclick="document.getElementById('note-search-input').value=''; document.getElementById('note-filter-room').value='all'; document.getElementById('note-filter-status').value='all'; filterBookingNotes();" class="admin-btn admin-btn-outline" style="font-size:0.8rem;">
            Reset Filters
          </button>
        </div>
      `;
    }
    return;
  }

  // 1. Desktop Table
  let tableHtml = `
    <div class="admin-notes-table-wrap" style="overflow-x:auto;">
      <table class="admin-notes-table">
        <thead>
          <tr>
            <th>Customer & Contact</th>
            <th>Room</th>
            <th>Check-in & Out</th>
            <th>Guests</th>
            <th>Status</th>
            <th>Financials</th>
            <th style="text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody>
  `;

  notes.forEach(note => {
    const statusVal = note.booking_status || note.status || 'Confirmed';
    const statusClass = statusVal.toLowerCase().replace(/\s+/g, '-');
    const advance = (note.advance_amount !== null && note.advance_amount !== undefined) ? Number(note.advance_amount) : 0;
    const total = (note.total_booking_amount !== null && note.total_booking_amount !== undefined) 
      ? Number(note.total_booking_amount) 
      : ((note.total_amount !== null && note.total_amount !== undefined) ? Number(note.total_amount) : 0);
    const guests = note.number_of_guests || note.guests || 1;

    tableHtml += `
      <tr>
        <td>
          <div style="font-weight:700; color:#FFFFFF;">${escapeHtml(note.customer_name)}</div>
          <div style="font-size:0.8rem; color:var(--admin-text-muted); display:flex; align-items:center; gap:4px; margin-top:2px;">
            📞 <a href="tel:${escapeHtml(note.contact_number)}" style="color:var(--admin-text-muted); text-decoration:none;">${escapeHtml(note.contact_number)}</a>
          </div>
        </td>
        <td>
          <span style="font-weight:600; color:var(--admin-accent-glow);">${escapeHtml(note.room_name)}</span>
        </td>
        <td>
          <div style="font-size:0.85rem; color:#FFFFFF;">${escapeHtml(note.check_in)}</div>
          <div style="font-size:0.75rem; color:var(--admin-text-muted);">to ${escapeHtml(note.check_out)}</div>
        </td>
        <td>
          <span style="font-size:0.85rem; color:#FFFFFF;">👥 ${guests}</span>
        </td>
        <td>
          <span class="status-pill ${statusClass}">
            ● ${escapeHtml(statusVal)}
          </span>
        </td>
        <td>
          ${total > 0 ? `
            <div style="font-weight:700; color:#FFFFFF;">₹${total.toLocaleString()}</div>
            <div style="font-size:0.75rem; color:#25D366;">Adv: ₹${advance.toLocaleString()}</div>
          ` : `
            <span style="font-size:0.8rem; color:var(--admin-text-muted);">—</span>
          `}
        </td>
        <td style="text-align:right;">
          <div style="display:flex; justify-content:flex-end; gap:6px;">
            <button onclick="viewBookingNote('${note.id}')" class="admin-btn admin-btn-outline" style="padding:5px 9px; font-size:0.75rem;" title="View Details">
              👁 View
            </button>
            <button onclick="editBookingNote('${note.id}')" class="admin-btn admin-btn-outline" style="padding:5px 9px; font-size:0.75rem;" title="Edit Note">
              ✏️ Edit
            </button>
            <button onclick="deleteBookingNote('${note.id}')" class="admin-btn admin-btn-danger" style="padding:5px 9px; font-size:0.75rem;" title="Delete Record">
              🗑
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tableHtml += `</tbody></table></div>`;

  // 2. Mobile Responsive Cards
  let cardsHtml = `<div class="admin-notes-cards-wrap">`;
  notes.forEach(note => {
    const statusVal = note.booking_status || note.status || 'Confirmed';
    const statusClass = statusVal.toLowerCase().replace(/\s+/g, '-');
    const advance = (note.advance_amount !== null && note.advance_amount !== undefined) ? Number(note.advance_amount) : 0;
    const total = (note.total_booking_amount !== null && note.total_booking_amount !== undefined) 
      ? Number(note.total_booking_amount) 
      : ((note.total_amount !== null && note.total_amount !== undefined) ? Number(note.total_amount) : 0);
    const guests = note.number_of_guests || note.guests || 1;
    const notesText = note.additional_notes || note.notes || '';

    cardsHtml += `
      <div class="admin-note-card">
        <div class="admin-note-card-header">
          <div>
            <div class="admin-note-card-title">${escapeHtml(note.customer_name)}</div>
            <div style="font-size:0.8rem; color:var(--admin-text-muted); margin-top:2px;">
              📞 <a href="tel:${escapeHtml(note.contact_number)}" style="color:var(--admin-accent-glow); text-decoration:none;">${escapeHtml(note.contact_number)}</a>
            </div>
          </div>
          <span class="status-pill ${statusClass}">
            ● ${escapeHtml(statusVal)}
          </span>
        </div>

        <div class="admin-note-card-detail">
          <div>
            <div class="admin-note-card-label">Room</div>
            <div class="admin-note-card-value" style="color:var(--admin-accent-glow);">${escapeHtml(note.room_name)}</div>
          </div>
          <div>
            <div class="admin-note-card-label">Guests</div>
            <div class="admin-note-card-value">👥 ${guests}</div>
          </div>
          <div>
            <div class="admin-note-card-label">Check-in</div>
            <div class="admin-note-card-value">${escapeHtml(note.check_in)}</div>
          </div>
          <div>
            <div class="admin-note-card-label">Check-out</div>
            <div class="admin-note-card-value">${escapeHtml(note.check_out)}</div>
          </div>
          ${total > 0 ? `
          <div>
            <div class="admin-note-card-label">Total / Adv</div>
            <div class="admin-note-card-value">₹${total.toLocaleString()} (Adv: ₹${advance.toLocaleString()})</div>
          </div>` : ''}
        </div>

        ${notesText ? `
          <div style="font-size:0.8rem; color:var(--admin-text-muted); background:rgba(0,0,0,0.25); padding:6px 10px; border-radius:6px;">
            📝 ${escapeHtml(notesText)}
          </div>
        ` : ''}

        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:0.25rem; padding-top:0.5rem; border-top:1px solid rgba(255,255,255,0.06);">
          <button onclick="viewBookingNote('${note.id}')" class="admin-btn admin-btn-outline" style="flex:1; padding:6px 10px; font-size:0.8rem;">
            👁 View
          </button>
          <button onclick="editBookingNote('${note.id}')" class="admin-btn admin-btn-outline" style="flex:1; padding:6px 10px; font-size:0.8rem;">
            ✏️ Edit
          </button>
          <button onclick="deleteBookingNote('${note.id}')" class="admin-btn admin-btn-danger" style="padding:6px 12px; font-size:0.8rem;">
            🗑
          </button>
        </div>
      </div>
    `;
  });
  cardsHtml += `</div>`;

  container.innerHTML = tableHtml + cardsHtml;
}

function openSqlModal() {
  const block = document.getElementById('sql-code-block');
  if (block) block.textContent = SQL_MIGRATION_SCRIPT;
  const modal = document.getElementById('admin-sql-modal');
  if (modal) modal.classList.add('active');
}

function closeSqlModal() {
  const modal = document.getElementById('admin-sql-modal');
  if (modal) modal.classList.remove('active');
}

function copySqlCode() {
  navigator.clipboard.writeText(SQL_MIGRATION_SCRIPT).then(() => {
    showToast('SQL script copied to clipboard.');
  }).catch(() => {
    alert('Please copy the SQL text manually from the code box.');
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
