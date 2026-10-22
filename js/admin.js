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

  // 1. Direct Administrative Passcode Check (Local / Offline Admin Access)
  const isDirectMatch = (email.toLowerCase() === 'admin' || email.toLowerCase() === 'admin@thegrootooty.com') && passcode === 'groot2026';
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

  // 2. Supabase Auth Check
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: passcode });

  if (error) {
    if (errorEl) {
      errorEl.innerText = error.message;
      errorEl.style.display = 'block';
    }
    btn.innerHTML = originalBtnText;
    btn.disabled = false;
    return;
  }

  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();

  let isAuthorized = false;
  if (!profileError && profile && profile.role && String(profile.role).trim().toLowerCase() === 'admin') {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    await supabase.auth.signOut();
    if (errorEl) {
      if (profileError) {
        console.error("Profile check error:", profileError);
        errorEl.innerText = "Authorization failed: Could not read profile. Please ensure RLS policies allow SELECT for authenticated users on public.profiles.";
      } else if (!profile) {
        errorEl.innerText = "Authorization failed: Profile record not found for this user in public.profiles.";
      } else {
        errorEl.innerText = `Authorization failed: Your role is '${profile.role}', but 'admin' is required.`;
      }
      errorEl.style.display = 'block';
    }
    btn.innerHTML = originalBtnText;
    btn.disabled = false;
    return;
  }

  if (errorEl) errorEl.style.display = 'none';
  btn.innerHTML = originalBtnText;
  btn.disabled = false;
  
  showToast('Admin access granted.');
  initAdminAuth();
  initAdminTabs();
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
let hasCloudNotesTable = null;

const SAMPLE_NOTES = [
  {
    id: 'sample_note_1',
    customer_name: 'Anand Kumar',
    contact_number: '+91 98401 23456',
    room_name: 'A-frame',
    check_in: '2026-10-24',
    check_out: '2026-10-26',
    guests: 2,
    advance_amount: 3000,
    total_amount: 9000,
    status: 'Confirmed',
    notes: 'Campfire setup requested. Arriving around 5 PM.',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'sample_note_2',
    customer_name: 'Priya Sharma',
    contact_number: '+91 97890 65432',
    room_name: 'Glass House',
    check_in: '2026-10-22',
    check_out: '2026-10-24',
    guests: 2,
    advance_amount: 5000,
    total_amount: 10000,
    status: 'Checked In',
    notes: 'Anniversary couple. Honeymoon decor arranged. 50% advance paid via UPI.',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  }
];

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
-- THE GROOT OOTY — Admin Manual Booking Notes Table & RLS Setup
-- Run this in your Supabase Dashboard -> SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.admin_booking_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    room_name TEXT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    guests INTEGER NOT NULL DEFAULT 1,
    advance_amount NUMERIC(10, 2) DEFAULT 0,
    total_amount NUMERIC(10, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Confirmed',
    notes TEXT DEFAULT '',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for fast sorting and filtering
CREATE INDEX IF NOT EXISTS idx_admin_booking_notes_checkin ON public.admin_booking_notes(check_in);
CREATE INDEX IF NOT EXISTS idx_admin_booking_notes_status ON public.admin_booking_notes(status);
CREATE INDEX IF NOT EXISTS idx_admin_booking_notes_created_at ON public.admin_booking_notes(created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.admin_booking_notes ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Only authenticated users with role = 'admin' in profiles table have access
DROP POLICY IF EXISTS "Admins can view and manage booking notes" ON public.admin_booking_notes;

CREATE POLICY "Admins can view and manage booking notes"
ON public.admin_booking_notes
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
      .from('admin_booking_notes')
      .select('*')
      .order('check_in', { ascending: false });

    if (!error && Array.isArray(data)) {
      hasCloudNotesTable = true;
      bookingNotesState = data;
      try {
        localStorage.setItem(STORAGE_KEY_ADMIN_NOTES, JSON.stringify(data));
      } catch (e) {}
      if (syncBanner) syncBanner.style.display = 'none';
    } else {
      hasCloudNotesTable = false;
      const cached = localStorage.getItem(STORAGE_KEY_ADMIN_NOTES);
      if (cached !== null) {
        try {
          bookingNotesState = JSON.parse(cached);
        } catch (e) {
          bookingNotesState = [...SAMPLE_NOTES];
        }
      } else {
        bookingNotesState = [...SAMPLE_NOTES];
        try {
          localStorage.setItem(STORAGE_KEY_ADMIN_NOTES, JSON.stringify(bookingNotesState));
        } catch (e) {}
      }
      if (syncBanner) syncBanner.style.display = 'flex';
    }
  } catch (err) {
    hasCloudNotesTable = false;
    const cached = localStorage.getItem(STORAGE_KEY_ADMIN_NOTES);
    if (cached !== null) {
      try {
        bookingNotesState = JSON.parse(cached);
      } catch (e) {
        bookingNotesState = [...SAMPLE_NOTES];
      }
    } else {
      bookingNotesState = [...SAMPLE_NOTES];
      try {
        localStorage.setItem(STORAGE_KEY_ADMIN_NOTES, JSON.stringify(bookingNotesState));
      } catch (e) {}
    }
    if (syncBanner) syncBanner.style.display = 'flex';
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

  const checkinVal = checkinInput.value;
  const checkoutVal = checkoutInput.value;

  // Validation: Check-out cannot be earlier than check-in
  if (new Date(checkoutVal) < new Date(checkinVal)) {
    alert('Check-out date cannot be earlier than check-in date.');
    checkoutInput.focus();
    return;
  }

  const isEditing = Boolean(idInput.value);
  const noteId = idInput.value || (crypto.randomUUID ? crypto.randomUUID() : 'note_' + Date.now());

  const noteData = {
    customer_name: nameInput.value.trim(),
    contact_number: contactInput.value.trim(),
    room_name: roomInput.value,
    check_in: checkinVal,
    check_out: checkoutVal,
    guests: parseInt(guestsInput.value, 10) || 1,
    advance_amount: advanceInput.value ? parseFloat(advanceInput.value) : 0,
    total_amount: totalInput.value ? parseFloat(totalInput.value) : 0,
    status: statusInput.value,
    notes: notesInput.value ? notesInput.value.trim() : '',
    updated_at: new Date().toISOString()
  };

  const origBtnText = submitBtn.innerHTML;
  submitBtn.innerHTML = 'Saving...';
  submitBtn.disabled = true;

  try {
    let cloudSaved = false;
    if (hasCloudNotesTable) {
      if (isEditing) {
        const { error } = await supabase
          .from('admin_booking_notes')
          .update(noteData)
          .eq('id', noteId);
        if (!error) cloudSaved = true;
      } else {
        const { error } = await supabase
          .from('admin_booking_notes')
          .insert([noteData]);
        if (!error) cloudSaved = true;
      }
    }

    // Always maintain local mirror
    if (isEditing) {
      bookingNotesState = bookingNotesState.map(n => String(n.id) === String(noteId) ? { ...n, ...noteData, id: noteId } : n);
    } else {
      bookingNotesState.unshift({
        id: noteId,
        ...noteData,
        created_at: new Date().toISOString()
      });
    }
    localStorage.setItem(STORAGE_KEY_ADMIN_NOTES, JSON.stringify(bookingNotesState));

    showToast(isEditing ? 'Booking note updated successfully.' : 'Booking note saved successfully.');
    clearNotesForm();
    if (hasCloudNotesTable) {
      await loadBookingNotes();
    } else {
      filterBookingNotes();
    }
  } catch (err) {
    console.error('Error saving note:', err);
    if (isEditing) {
      bookingNotesState = bookingNotesState.map(n => String(n.id) === String(noteId) ? { ...n, ...noteData, id: noteId } : n);
    } else {
      bookingNotesState.unshift({
        id: noteId,
        ...noteData,
        created_at: new Date().toISOString()
      });
    }
    localStorage.setItem(STORAGE_KEY_ADMIN_NOTES, JSON.stringify(bookingNotesState));
    showToast('Saved to local storage (Supabase cloud sync pending).');
    clearNotesForm();
    filterBookingNotes();
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
  const title = document.getElementById('form-section-title');
  if (title) title.textContent = 'New Booking Note';
  const submitBtn = document.getElementById('note-submit-btn');
  if (submitBtn) submitBtn.innerHTML = '💾 Save Booking';
  const cancelBtn = document.getElementById('note-cancel-edit-btn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  const badgeWrap = document.getElementById('edit-badge-wrap');
  if (badgeWrap) badgeWrap.style.display = 'none';
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
  document.getElementById('note-guests').value = note.guests || 1;
  document.getElementById('note-advance').value = note.advance_amount ? note.advance_amount : '';
  document.getElementById('note-total').value = note.total_amount ? note.total_amount : '';
  document.getElementById('note-status').value = note.status || 'Confirmed';
  document.getElementById('note-notes').value = note.notes || '';

  document.getElementById('form-section-title').textContent = `Edit Booking: ${note.customer_name}`;
  document.getElementById('note-submit-btn').innerHTML = '💾 Update Booking';
  document.getElementById('note-cancel-edit-btn').style.display = 'inline-flex';
  document.getElementById('edit-badge-wrap').style.display = 'block';

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
    if (hasCloudNotesTable) {
      await supabase
        .from('admin_booking_notes')
        .delete()
        .eq('id', id);
    }
  } catch (err) {
    console.warn('Supabase delete error:', err);
  }

  bookingNotesState = bookingNotesState.filter(n => String(n.id) !== String(id));
  localStorage.setItem(STORAGE_KEY_ADMIN_NOTES, JSON.stringify(bookingNotesState));
  showToast('Booking record deleted.');
  filterBookingNotes();
}

function viewBookingNote(id) {
  const note = bookingNotesState.find(n => String(n.id) === String(id));
  if (!note) return;

  const content = document.getElementById('admin-note-view-content');
  if (!content) return;

  const statusClass = (note.status || 'confirmed').toLowerCase().replace(/\s+/g, '-');
  const advance = note.advance_amount ? Number(note.advance_amount) : 0;
  const total = note.total_amount ? Number(note.total_amount) : 0;
  const balance = total > advance ? total - advance : 0;

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
        ● ${escapeHtml(note.status || 'Confirmed')}
      </span>
    </div>

    <div class="admin-details-grid">
      <div class="admin-detail-item">
        <span class="admin-detail-label">Room / Accommodation</span>
        <span class="admin-detail-value" style="color:var(--admin-accent-glow);">${escapeHtml(note.room_name)}</span>
      </div>
      <div class="admin-detail-item">
        <span class="admin-detail-label">Total Guests</span>
        <span class="admin-detail-value">👥 ${note.guests || 1} Person(s)</span>
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

    ${note.notes ? `
    <div style="margin-top:1.25rem;">
      <span class="admin-detail-label">Special Requests / Notes:</span>
      <div style="margin-top:6px; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px 14px; font-size:0.9rem; color:#FAF7F2; line-height:1.5; white-space:pre-wrap;">
        ${escapeHtml(note.notes)}
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
    const matchesStatus = selectedStatus === 'all' || (note.status || '').toLowerCase() === selectedStatus.toLowerCase();

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
    const statusClass = (note.status || 'confirmed').toLowerCase().replace(/\s+/g, '-');
    const advance = note.advance_amount ? Number(note.advance_amount) : 0;
    const total = note.total_amount ? Number(note.total_amount) : 0;

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
          <span style="font-size:0.85rem; color:#FFFFFF;">👥 ${note.guests || 1}</span>
        </td>
        <td>
          <span class="status-pill ${statusClass}">
            ● ${escapeHtml(note.status || 'Confirmed')}
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
    const statusClass = (note.status || 'confirmed').toLowerCase().replace(/\s+/g, '-');
    const advance = note.advance_amount ? Number(note.advance_amount) : 0;
    const total = note.total_amount ? Number(note.total_amount) : 0;

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
            ● ${escapeHtml(note.status || 'Confirmed')}
          </span>
        </div>

        <div class="admin-note-card-detail">
          <div>
            <div class="admin-note-card-label">Room</div>
            <div class="admin-note-card-value" style="color:var(--admin-accent-glow);">${escapeHtml(note.room_name)}</div>
          </div>
          <div>
            <div class="admin-note-card-label">Guests</div>
            <div class="admin-note-card-value">👥 ${note.guests || 1}</div>
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

        ${note.notes ? `
          <div style="font-size:0.8rem; color:var(--admin-text-muted); background:rgba(0,0,0,0.25); padding:6px 10px; border-radius:6px;">
            📝 ${escapeHtml(note.notes)}
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
