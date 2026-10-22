/**
 * =========================================================
 * THE GROOT OOTY — Auto-Scrolling Property Gallery & Lightbox
 * Premium, continuously auto-scrolling gallery with
 * pause-on-hover, touch friendliness, and full keyboard/touch
 * accessible fullscreen lightbox viewer.
 * =========================================================
 */

(function () {
  'use strict';

  // Master collection of 14 authentic property images
  const PROPERTY_IMAGES = [
    {
      src: 'assets/images/marquee/groot_property_01.jpeg',
      alt: 'Wooden cottage common lounge and relaxation area with plush sofas at The Groot Ooty',
      title: 'Cozy Cottage Lounge',
      desc: 'Warm timber interiors and welcoming social living area'
    },
    {
      src: 'assets/images/marquee/groot_property_02.jpeg',
      alt: 'Cozy wooden suite bedroom with king bed and mountain view at The Groot Ooty',
      title: 'Deluxe Suite Bedroom',
      desc: 'Comfortable king bed with panoramic mountain garden views'
    },
    {
      src: 'assets/images/marquee/groot_property_03.jpeg',
      alt: 'Warm wooden interior bedroom suite with nightstands at The Groot Ooty',
      title: 'Timber Paneled Bedroom',
      desc: 'Solid wood craftmanship and warm ambient lighting'
    },
    {
      src: 'assets/images/marquee/groot_property_04.jpeg',
      alt: 'Panoramic Glass House bedroom overlooking Nilgiri pine forest canopy at The Groot Ooty',
      title: 'Panoramic Glass House',
      desc: 'Floor-to-ceiling forest immersion in the quiet Nilgiris'
    },
    {
      src: 'assets/images/marquee/groot_property_05.jpeg',
      alt: 'Deluxe wooden bedroom with king size bed and warm ambient lighting at The Groot Ooty',
      title: 'Warm Mountain Suite',
      desc: 'Spacious cottage suite crafted for serene relaxation'
    },
    {
      src: 'assets/images/marquee/groot_property_06.jpeg',
      alt: 'Glass House suite overlooking mist and green Nilgiri forest canopy at The Groot Ooty',
      title: 'Forest Canopy Glass House',
      desc: 'Wake up surrounded by mountain greenery and morning clouds'
    },
    {
      src: 'assets/images/marquee/groot_property_07.jpeg',
      alt: 'Architectural Glass House exterior and viewing balcony deck amidst trees at The Groot Ooty',
      title: 'Glass House Balcony Deck',
      desc: 'Elevated wooden deck nestled deep in the hillside tree canopy'
    },
    {
      src: 'assets/images/marquee/groot_property_08.jpeg',
      alt: 'Spacious wooden hall and lounge in the main cottage at The Groot Ooty',
      title: 'Main Cottage Living Hall',
      desc: 'Expansive wooden ceilings and warm cottage hospitality'
    },
    {
      src: 'assets/images/marquee/groot_property_09.jpeg',
      alt: 'Unique architectural A-Frame cabin exterior with garden entry at The Groot Ooty',
      title: 'Architectural A-Frame Cabin',
      desc: 'Signature triangular pine cabin with private garden entry'
    },
    {
      src: 'assets/images/marquee/groot_property_10.jpeg',
      alt: 'Misty mountain cottage courtyard and outdoor picnic bench at The Groot Ooty',
      title: 'Misty Courtyard & Lawn',
      desc: 'Serene Pudumund outdoor seating enveloped in mountain clouds'
    },
    {
      src: 'assets/images/marquee/groot_property_11.jpeg',
      alt: 'Premium wooden paneled bedroom with bedside sconce lamps at The Groot Ooty',
      title: 'Cozy Timber Chalet Room',
      desc: 'Warm glowing sconces and peaceful mountain sanctuary'
    },
    {
      src: 'assets/images/marquee/groot_property_12.jpeg',
      alt: 'Indoor recreation lounge with carrom board table at The Groot Ooty',
      title: 'Indoor Games Lounge',
      desc: 'Carrom board and family recreation area for relaxed evenings'
    },
    {
      src: 'assets/images/marquee/groot_property_13.jpeg',
      alt: 'Outdoor stone campfire pit with log seating and barbecue grill at The Groot Ooty',
      title: 'Starry Campfire Pit',
      desc: 'Rustic stone campfire ring with log seating under open skies'
    },
    {
      src: 'assets/images/marquee/groot_property_14.jpeg',
      alt: 'Rustic timber cottage decor with warm glowing pendant light at The Groot Ooty',
      title: 'Cottage Chalet Details',
      desc: 'Rustic wood accents and warm golden lighting fixtures'
    }
  ];

  const totalImages = PROPERTY_IMAGES.length;
  let currentIndex = 0;
  let isLightboxOpen = false;
  let lastFocusedElement = null;

  // DOM Elements
  const modal = document.getElementById('galleryLightbox');
  const backdrop = document.getElementById('lightboxBackdrop');
  const closeBtn = document.getElementById('lightboxCloseBtn');
  const prevBtn = document.getElementById('lightboxPrevBtn');
  const nextBtn = document.getElementById('lightboxNextBtn');
  const mobilePrevBtn = document.getElementById('lightboxMobilePrev');
  const mobileNextBtn = document.getElementById('lightboxMobileNext');
  const imgElement = document.getElementById('lightboxImg');
  const counterText = document.getElementById('lightboxCounterText');
  const captionTitle = document.getElementById('lightboxCaptionTitle');
  const captionDesc = document.getElementById('lightboxCaptionDesc');
  const marqueeOuter = document.querySelector('.marquee-outer');
  const marqueeGroups = document.querySelectorAll('.marquee-group');

  if (!modal || !imgElement) {
    return;
  }

  /**
   * Pause / Resume helper for marquee
   */
  function setMarqueePaused(paused) {
    marqueeGroups.forEach(function (g) {
      if (paused) {
        g.classList.add('is-paused');
      } else {
        g.classList.remove('is-paused');
      }
    });
  }

  /**
   * Update modal content for specific index
   */
  function renderLightboxImage(index, animate) {
    if (index < 0) {
      index = totalImages - 1;
    } else if (index >= totalImages) {
      index = 0;
    }
    currentIndex = index;
    const item = PROPERTY_IMAGES[currentIndex];

    if (animate) {
      imgElement.classList.add('is-transitioning');
      setTimeout(function () {
        imgElement.src = item.src;
        imgElement.alt = item.alt;
        imgElement.classList.remove('is-transitioning');
      }, 120);
    } else {
      imgElement.src = item.src;
      imgElement.alt = item.alt;
    }

    if (counterText) {
      counterText.textContent = (currentIndex + 1) + ' / ' + totalImages;
    }
    if (captionTitle) {
      captionTitle.textContent = item.title;
    }
    if (captionDesc) {
      captionDesc.textContent = item.desc;
    }
  }

  /**
   * Open Lightbox
   */
  function openLightbox(index) {
    lastFocusedElement = document.activeElement;
    isLightboxOpen = true;

    renderLightboxImage(index, false);

    modal.hidden = false;
    modal.classList.add('is-active');
    modal.setAttribute('aria-hidden', 'false');

    // Lock page scroll
    document.body.style.overflow = 'hidden';

    // Pause background marquee
    setMarqueePaused(true);

    // Set focus to close button
    if (closeBtn) {
      closeBtn.focus();
    }
  }

  /**
   * Close Lightbox
   */
  function closeLightbox() {
    if (!isLightboxOpen) return;
    isLightboxOpen = false;

    modal.classList.remove('is-active');
    modal.setAttribute('aria-hidden', 'true');

    // Unlock page scroll
    document.body.style.overflow = '';

    // Resume background marquee
    setMarqueePaused(false);

    setTimeout(function () {
      if (!isLightboxOpen) {
        modal.hidden = true;
      }
    }, 280);

    // Restore focus
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function nextImage() {
    renderLightboxImage(currentIndex + 1, true);
  }

  function prevImage() {
    renderLightboxImage(currentIndex - 1, true);
  }

  // --- Attach Click Handlers to All Marquee Cards ---
  const allCards = document.querySelectorAll('.marquee-card');
  allCards.forEach(function (card) {
    card.addEventListener('click', function (e) {
      e.preventDefault();
      const idxAttr = card.getAttribute('data-index');
      const idx = parseInt(idxAttr, 10);
      if (!isNaN(idx)) {
        openLightbox(idx);
      }
    });
  });

  // --- Lightbox Control Listeners ---
  if (closeBtn) {
    closeBtn.addEventListener('click', closeLightbox);
  }
  if (backdrop) {
    backdrop.addEventListener('click', closeLightbox);
  }
  if (prevBtn) {
    prevBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      prevImage();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      nextImage();
    });
  }
  if (mobilePrevBtn) {
    mobilePrevBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      prevImage();
    });
  }
  if (mobileNextBtn) {
    mobileNextBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      nextImage();
    });
  }

  // Prevent click on image itself from closing modal
  if (imgElement) {
    imgElement.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  }

  // --- Keyboard Navigation ---
  window.addEventListener('keydown', function (e) {
    if (!isLightboxOpen) return;

    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevImage();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextImage();
    }
  });

  // --- Touch Swipe Navigation inside Lightbox ---
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  modal.addEventListener('touchstart', function (e) {
    if (!isLightboxOpen || e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  modal.addEventListener('touchend', function (e) {
    if (!isLightboxOpen || e.changedTouches.length !== 1) return;
    touchEndX = e.changedTouches[0].clientX;
    touchEndY = e.changedTouches[0].clientY;
    handleLightboxSwipe();
  }, { passive: true });

  function handleLightboxSwipe() {
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    // Horizontal swipe threshold 45px and predominantly horizontal
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        nextImage();
      } else {
        prevImage();
      }
    }
  }

  // --- Touch pause/resume on mobile track ---
  if (marqueeOuter) {
    let touchTimer = null;
    marqueeOuter.addEventListener('touchstart', function () {
      if (touchTimer) clearTimeout(touchTimer);
      setMarqueePaused(true);
    }, { passive: true });

    marqueeOuter.addEventListener('touchend', function () {
      if (isLightboxOpen) return;
      touchTimer = setTimeout(function () {
        setMarqueePaused(false);
      }, 1200);
    }, { passive: true });

    marqueeOuter.addEventListener('touchcancel', function () {
      if (isLightboxOpen) return;
      setMarqueePaused(false);
    }, { passive: true });
  }

  // Expose API if needed
  window.GrootGallery = {
    open: openLightbox,
    close: closeLightbox,
    next: nextImage,
    prev: prevImage
  };
})();
