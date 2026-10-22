/* =========================================================
   THE GROOT OOTY — WhatsApp Message Generator
   ========================================================= */

/* ---------------------------------------------------------
   GENERATE ENQUIRY ID
   --------------------------------------------------------- */

function generateEnquiryId() {
  const now = new Date();
  const day   = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year  = String(now.getFullYear()).slice(-2);
  const rand  = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `TG-${day}${month}${year}-${rand}`;
}

/* ---------------------------------------------------------
   FORMAT DATE FOR DISPLAY
   --------------------------------------------------------- */

function formatDateDisplay(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/* ---------------------------------------------------------
   BUILD WHATSAPP MESSAGE
   --------------------------------------------------------- */

function buildWhatsAppMessage(data) {
  const id = data.enquiryId || generateEnquiryId();

  const lines = [];

  // Header
  lines.push(`🏡 *THE GROOT OOTY — BOOKING ENQUIRY*`);
  lines.push(`Enquiry ID: *${id}*`);
  lines.push('');

  // Guest details
  lines.push(`👤 *GUEST DETAILS*`);
  if (data.name)  lines.push(`Name: ${data.name}`);
  if (data.mobile) lines.push(`Mobile: ${data.mobile}`);
  if (data.whatsappNum && data.whatsappNum !== data.mobile) {
    lines.push(`WhatsApp: ${data.whatsappNum}`);
  }
  if (data.email) lines.push(`Email: ${data.email}`);
  lines.push('');

  // Stay details
  lines.push(`📅 *STAY DETAILS*`);
  if (data.checkin)  lines.push(`Check-in: ${formatDateDisplay(data.checkin)}`);
  if (data.checkout) lines.push(`Check-out: ${formatDateDisplay(data.checkout)}`);

  const guests = [];
  if (data.adults > 0)   guests.push(`${data.adults} Adult${data.adults !== 1 ? 's' : ''}`);
  if (data.children > 0) guests.push(`${data.children} Child${data.children !== 1 ? 'ren' : ''}`);
  if (guests.length)     lines.push(`Guests: ${guests.join(', ')}`);
  lines.push('');

  // Room
  if (data.room && data.room !== 'not-sure') {
    const roomNames = {
      standard:   'Standard Room',
      aframe:     'A-Frame Room',
      suite:      'Luxurious Suite',
      glasshouse: 'Glass House',
    };
    lines.push(`🛏️ *PREFERRED ROOM*`);
    lines.push(roomNames[data.room] || data.room);
    lines.push('');
  } else if (data.room === 'not-sure') {
    lines.push(`🛏️ *ROOM PREFERENCE*`);
    lines.push('Open to recommendation');
    lines.push('');
  }

  // Campfire
  if (data.campfire && data.campfire !== 'no') {
    lines.push(`🔥 *CAMPFIRE*`);
    const campfireMap = {
      yes:  'Interested',
      more: 'Would like more information',
    };
    lines.push(campfireMap[data.campfire] || data.campfire);
    lines.push('');
  }

  // Meals
  if (data.meals && data.meals !== 'no') {
    lines.push(`🍽️ *MEALS*`);
    const mealMap = {
      yes:  'Interested',
      more: 'Would like more information',
    };
    lines.push(mealMap[data.meals] || data.meals);
    lines.push('');
  }

  // Special request
  if (data.specialRequest && data.specialRequest.trim()) {
    lines.push(`📝 *SPECIAL REQUEST*`);
    lines.push(data.specialRequest.trim());
    lines.push('');
  }

  // Closing
  lines.push('Could you please confirm availability and share the booking details and pricing?');
  lines.push('');
  lines.push('Thank you! 🙏');

  return lines.join('\n');
}

/* ---------------------------------------------------------
   OPEN WHATSAPP WITH MESSAGE
   --------------------------------------------------------- */

function openWhatsApp(data) {
  const msg = buildWhatsAppMessage(data);
  const url = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return { enquiryId: data.enquiryId, message: msg, url };
}

window.openWhatsApp = openWhatsApp;
window.buildWhatsAppMessage = buildWhatsAppMessage;

/* ---------------------------------------------------------
   QUICK WHATSAPP OPENERS
   --------------------------------------------------------- */

window.quickWhatsApp = function() {
  const msg = `Hi The Groot! I'd like to know more about your rooms and availability.`;
  window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
};

window.roomEnquiryWhatsApp = function(roomName) {
  const msg = `Hi The Groot! I'd like to enquire about the ${roomName} and its availability.`;
  window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
};

window.campfireWhatsApp = function() {
  const msg = `Hi The Groot! I'd like to know more about the campfire experience at The Groot.`;
  window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
};

window.foodWhatsApp = function() {
  const msg = `Hi The Groot! I'd like to ask about meals during my stay at The Groot.`;
  window.open(`https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
};
