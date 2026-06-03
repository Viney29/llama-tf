/**
 * Tabbed Product Carousel custom element.
 *
 * Handles tab switching, carousel scroll navigation, scroll progress bar,
 * variant chip interaction, and guarantee dismiss.
 */
class TabbedProductCarousel extends HTMLElement {
  connectedCallback() {
    this.tabs = Array.from(this.querySelectorAll('.tpc__tab'));
    this.panels = Array.from(this.querySelectorAll('.tpc__panel'));
    this.ctaLink = this.querySelector('.tpc__cta');
    this.ctaText = this.querySelector('.tpc__cta-text');
    this.mobileGuarantee = this.querySelector('.tpc__mobile-guarantee');
    this.dismissBtn = this.querySelector('.tpc__mobile-guarantee-dismiss');

    this._rafIds = new Map();

    this._bindTabs();
    this._bindNavButtons();
    this._bindScrollProgress();
    this._bindVariantChips();
    this._bindGuaranteeDismiss();
  }

  disconnectedCallback() {
    for (const id of this._rafIds.values()) {
      cancelAnimationFrame(id);
    }
    this._rafIds.clear();
  }

  /* ---- Tab switching ---- */
  _bindTabs() {
    for (const tab of this.tabs) {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        this._activateTab(tab);
      });

      tab.addEventListener('keydown', (e) => {
        const idx = this.tabs.indexOf(tab);
        let targetIdx = -1;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          targetIdx = (idx + 1) % this.tabs.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          targetIdx = (idx - 1 + this.tabs.length) % this.tabs.length;
        } else if (e.key === 'Home') {
          e.preventDefault();
          targetIdx = 0;
        } else if (e.key === 'End') {
          e.preventDefault();
          targetIdx = this.tabs.length - 1;
        }

        if (targetIdx >= 0) {
          this.tabs[targetIdx].focus();
          this._activateTab(this.tabs[targetIdx]);
        }
      });
    }
  }

  _activateTab(tab) {
    const targetPanelId = tab.getAttribute('aria-controls');
    const targetPanel = this.querySelector(`#${targetPanelId}`);

    if (!targetPanel) return;

    for (const t of this.tabs) {
      t.classList.remove('tpc__tab--active');
      t.setAttribute('aria-selected', 'false');
      t.setAttribute('tabindex', '-1');
    }

    for (const p of this.panels) {
      p.classList.remove('tpc__panel--active');
      p.setAttribute('hidden', '');
    }

    tab.classList.add('tpc__tab--active');
    tab.setAttribute('aria-selected', 'true');
    tab.removeAttribute('tabindex');

    targetPanel.classList.add('tpc__panel--active');
    targetPanel.removeAttribute('hidden');

    /* Update CTA */
    const ctaUrl = targetPanel.dataset.ctaUrl || '';
    const ctaLabel = targetPanel.dataset.ctaText || '';

    if (this.ctaLink) {
      this.ctaLink.href = ctaUrl;
    }
    if (this.ctaText) {
      this.ctaText.textContent = ctaLabel;
    }

    /* Reset scroll & update nav for newly active panel */
    const track = targetPanel.querySelector('.tpc__track');
    if (track) {
      track.scrollLeft = 0;
    }
    this._updateNavState(targetPanel);
    this._updateProgress(targetPanel);
  }

  /* ---- Carousel navigation ---- */
  _bindNavButtons() {
    for (const panel of this.panels) {
      const prevBtn = panel.querySelector('.tpc__nav-btn--prev');
      const nextBtn = panel.querySelector('.tpc__nav-btn--next');
      const track = panel.querySelector('.tpc__track');

      if (!track) continue;

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          const scrollAmount = this._getCardWidth(track);
          track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          const scrollAmount = this._getCardWidth(track);
          track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
      }

      track.addEventListener('scroll', () => {
        this._throttledUpdate(panel);
      }, { passive: true });

      /* Initial nav state */
      this._updateNavState(panel);
    }
  }

  _getCardWidth(track) {
    const firstSlide = track.querySelector('.tpc__slide');
    if (!firstSlide) return 328;
    const gap = parseFloat(getComputedStyle(track).gap) || 32;
    return firstSlide.offsetWidth + gap;
  }

  _throttledUpdate(panel) {
    const key = panel.id;
    if (this._rafIds.has(key)) return;

    const rafId = requestAnimationFrame(() => {
      this._updateNavState(panel);
      this._updateProgress(panel);
      this._rafIds.delete(key);
    });
    this._rafIds.set(key, rafId);
  }

  _updateNavState(panel) {
    const track = panel.querySelector('.tpc__track');
    const prevBtn = panel.querySelector('.tpc__nav-btn--prev');
    const nextBtn = panel.querySelector('.tpc__nav-btn--next');

    if (!track) return;

    const scrollLeft = Math.round(track.scrollLeft);
    const maxScroll = track.scrollWidth - track.clientWidth;
    const threshold = 5;

    if (prevBtn) {
      const atStart = scrollLeft <= threshold;
      prevBtn.classList.toggle('tpc__nav-btn--disabled', atStart);
      prevBtn.disabled = atStart;
    }

    if (nextBtn) {
      const atEnd = scrollLeft >= maxScroll - threshold;
      nextBtn.classList.toggle('tpc__nav-btn--disabled', atEnd);
      nextBtn.disabled = atEnd;
    }
  }

  /* ---- Scroll progress bar ---- */
  _bindScrollProgress() {
    /* Progress is updated via the same scroll listener in _bindNavButtons */
  }

  _updateProgress(panel) {
    const track = panel.querySelector('.tpc__track');
    const progressBar = panel.querySelector('.tpc__progress-bar');

    if (!track || !progressBar) return;

    const maxScroll = track.scrollWidth - track.clientWidth;
    if (maxScroll <= 0) {
      progressBar.style.width = '100%';
      return;
    }

    const pct = (track.scrollLeft / maxScroll) * 100;
    progressBar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  }

  /* ---- Variant chip interaction ---- */
  _bindVariantChips() {
    this.addEventListener('click', (e) => {
      const chip = e.target.closest('.tpc__variant-chip');
      if (!chip) return;
      if (chip.classList.contains('tpc__variant-chip--active')) return;

      const card = chip.closest('.tpc__card');
      if (!card) return;

      /* Toggle active chip */
      const allChips = card.querySelectorAll('.tpc__variant-chip');
      for (const c of allChips) {
        c.classList.remove('tpc__variant-chip--active');
        c.setAttribute('aria-pressed', 'false');
      }
      chip.classList.add('tpc__variant-chip--active');
      chip.setAttribute('aria-pressed', 'true');

      /* Read data attributes */
      const productUrl = chip.dataset.productUrl || '';
      const productImage = chip.dataset.productImage || '';
      const productPrice = chip.dataset.productPrice || '';
      const productComparePrice = chip.dataset.productComparePrice || '';
      const productTitle = chip.dataset.productTitle || '';
      const variantId = chip.dataset.variantId || '';

      /* Update card elements */
      const imageLink = card.querySelector('.tpc__image-link');
      if (imageLink) {
        imageLink.href = productUrl;
        imageLink.setAttribute('aria-label', productTitle);
      }

      const img = card.querySelector('.tpc__image');
      if (img && productImage) {
        img.src = productImage;
        img.alt = productTitle;
      }

      const titleEl = card.querySelector('.tpc__title');
      if (titleEl) {
        titleEl.href = productUrl;
        titleEl.textContent = productTitle;
      }

      const priceEl = card.querySelector('.tpc__price');
      if (priceEl) {
        /* Preserve the visually-hidden span */
        const hiddenSpan = priceEl.querySelector('.visually-hidden');
        if (hiddenSpan) {
          priceEl.textContent = '';
          priceEl.appendChild(hiddenSpan);
          priceEl.append(productPrice);
        } else {
          priceEl.textContent = productPrice;
        }
      }

      const comparePriceEl = card.querySelector('.tpc__compare-price');
      if (comparePriceEl) {
        if (productComparePrice && productComparePrice !== productPrice) {
          const hiddenSpan = comparePriceEl.querySelector('.visually-hidden');
          comparePriceEl.textContent = '';
          if (hiddenSpan) {
            comparePriceEl.appendChild(hiddenSpan);
          }
          comparePriceEl.append(productComparePrice);
          comparePriceEl.style.display = '';
        } else {
          comparePriceEl.style.display = 'none';
        }
      }

      const addBtn = card.querySelector('.tpc__add-btn');
      if (addBtn) {
        addBtn.setAttribute('aria-label', `Add ${productTitle} to cart`);
      }

      const hiddenInput = card.querySelector('input[name="id"]');
      if (hiddenInput && variantId) {
        hiddenInput.value = variantId;
      }
    });
  }

  /* ---- Guarantee dismiss ---- */
  _bindGuaranteeDismiss() {
    if (this.dismissBtn && this.mobileGuarantee) {
      this.dismissBtn.addEventListener('click', () => {
        this.mobileGuarantee.classList.add('tpc__mobile-guarantee--hidden');
      });
    }
  }
}

if (!customElements.get('tabbed-product-carousel')) {
  customElements.define('tabbed-product-carousel', TabbedProductCarousel);
}
