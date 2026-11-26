/**
 * hotel.js - Hotel Reservations Module
 * 
 * Handles searching, filtering, and booking hotels across various destination cities.
 */

const HotelModule = {
  allHotels: [],
  filteredHotels: [],
  currentSearchParams: {
    city: "Paris",
    checkIn: "",
    checkOut: "",
    rooms: 1,
    guests: 2,
    nights: 1
  },

  init() {
    this.form = document.getElementById("hotel-search-form");
    this.citySelect = document.getElementById("hotel-city");
    this.checkInInput = document.getElementById("hotel-checkin");
    this.checkOutInput = document.getElementById("hotel-checkout");
    this.roomsSelect = document.getElementById("hotel-rooms");
    this.guestsSelect = document.getElementById("hotel-guests");
    this.nightsBadge = document.getElementById("hotel-nights-badge");
    this.priceSlider = document.getElementById("hotel-price-range");
    this.priceValEl = document.getElementById("hotel-price-val");
    this.sortSelect = document.getElementById("hotel-sort-select");
    this.resetBtn = document.getElementById("hotel-reset-filters");
    this.resultsContainer = document.getElementById("hotel-results-list");
    this.resultsCountEl = document.getElementById("hotel-results-count");
    this.summaryEl = document.getElementById("hotel-search-summary");

    this.setupDateInputs();
    this.bindEvents();

    // Use initial data immediately, then update from JSON
    this.allHotels = [...initialData.hotels];
    this.executeSearch();

    apiService.getHotels().then((hotels) => {
      if (hotels && hotels.length) {
        this.allHotels = hotels;
        this.executeSearch();
      }
    });
  },

  setupDateInputs() {
    const today = DateUtils.getTodayString();
    const tomorrow = DateUtils.addDays(today, 1);

    if (this.checkInInput) {
      DateUtils.enforceMinToday(this.checkInInput);
      if (!this.checkInInput.value || this.checkInInput.value < today) this.checkInInput.value = today;
    }
    if (this.checkOutInput) {
      this.checkOutInput.min = tomorrow;
      if (!this.checkOutInput.value || this.checkOutInput.value < tomorrow) this.checkOutInput.value = tomorrow;
    }
    this.updateNightsBadge();
  },

  updateNightsBadge() {
    const checkIn = this.checkInInput?.value || DateUtils.getTodayString();
    const checkOut = this.checkOutInput?.value || DateUtils.addDays(checkIn, 1);
    const nights = DateUtils.calculateNights(checkIn, checkOut);
    if (this.nightsBadge) {
      this.nightsBadge.textContent = `${nights} night${nights > 1 ? "s" : ""}`;
    }
    return nights;
  },

  bindEvents() {
    // Search form submit
    this.form?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.executeSearch();
      App.switchTab("hotels");
      document.getElementById("section-view-hotels")?.scrollIntoView({ behavior: "smooth" });
    });

    // Date change listeners for dynamic recalculation
    this.checkInInput?.addEventListener("change", () => {
      const today = DateUtils.getTodayString();
      if (this.checkInInput.value < today) {
        this.checkInInput.value = today;
        App.showToast("Past dates are not allowed. Check-in set to today.", "warning");
      }
      const checkIn = this.checkInInput.value;
      if (checkIn) {
        const nextDay = DateUtils.addDays(checkIn, 1);
        if (this.checkOutInput) {
          this.checkOutInput.min = nextDay;
          if (!this.checkOutInput.value || this.checkOutInput.value <= checkIn) {
            this.checkOutInput.value = nextDay;
          }
        }
      }
      this.updateNightsBadge();
      this.executeSearch();
    });

    this.checkOutInput?.addEventListener("change", () => {
      const checkIn = this.checkInInput?.value || DateUtils.getTodayString();
      const minCheckOut = DateUtils.addDays(checkIn, 1);
      if (this.checkOutInput.value < minCheckOut) {
        this.checkOutInput.value = minCheckOut;
        App.showToast("Check-out must be at least 1 day after check-in.", "warning");
      }
      this.updateNightsBadge();
      this.executeSearch();
    });

    // Destination city change
    this.citySelect?.addEventListener("change", () => this.executeSearch());

    // Rooms & guests change
    this.roomsSelect?.addEventListener("change", () => this.executeSearch());
    this.guestsSelect?.addEventListener("change", () => this.executeSearch());

    // Price slider
    this.priceSlider?.addEventListener("input", (e) => {
      if (this.priceValEl) this.priceValEl.textContent = `₹${e.target.value}`;
      this.applyFiltersAndSort();
    });

    // Star filter radios
    document.querySelectorAll("input[name='hotel-star-filter']").forEach((radio) => {
      radio.addEventListener("change", () => this.applyFiltersAndSort());
    });

    // Sort select
    this.sortSelect?.addEventListener("change", () => this.applyFiltersAndSort());

    // Reset filters
    this.resetBtn?.addEventListener("click", () => this.resetFilters());

    // Book hotel click
    this.resultsContainer?.addEventListener("click", (e) => {
      const bookBtn = e.target.closest(".btn-book-hotel");
      if (bookBtn) this.handleBookHotel(bookBtn.dataset.id);
    });
  },

  executeSearch() {
    const city = this.citySelect?.value || document.getElementById("hotel-city")?.value || "Paris";
    const checkIn = this.checkInInput?.value || document.getElementById("hotel-checkin")?.value || DateUtils.getTodayString();
    const checkOut = this.checkOutInput?.value || document.getElementById("hotel-checkout")?.value || DateUtils.addDays(checkIn, 1);
    const rooms = parseInt(this.roomsSelect?.value || document.getElementById("hotel-rooms")?.value || "1", 10);
    const guests = parseInt(this.guestsSelect?.value || document.getElementById("hotel-guests")?.value || "2", 10);
    const nights = DateUtils.calculateNights(checkIn, checkOut);

    this.currentSearchParams = { city, checkIn, checkOut, rooms, guests, nights };
    this.updateNightsBadge();
    this.applyFiltersAndSort();
  },

  applyFiltersAndSort() {
    const { city, checkIn, checkOut, nights, rooms, guests } = this.currentSearchParams;

    // 1. Filter by city
    let results = this.allHotels;
    if (city && city !== "All Cities") {
      results = results.filter((h) => h.city.toLowerCase() === city.toLowerCase());
    }

    // 2. Filter by max price
    if (this.priceSlider) {
      const maxPrice = parseFloat(this.priceSlider.value);
      results = results.filter((h) => h.pricePerNight <= maxPrice);
    }

    // 3. Filter by stars
    const starRadio = document.querySelector("input[name='hotel-star-filter']:checked");
    if (starRadio && starRadio.value !== "all") {
      const starVal = parseInt(starRadio.value, 10);
      if (starVal === 5) {
        results = results.filter((h) => h.stars === 5);
      } else {
        results = results.filter((h) => h.stars >= starVal);
      }
    }

    // 4. Sort
    const sortMode = this.sortSelect?.value || "rating";
    results.sort((a, b) => {
      if (sortMode === "price-low" || sortMode === "cheapest") return a.pricePerNight - b.pricePerNight;
      if (sortMode === "price-high" || sortMode === "expensive") return b.pricePerNight - a.pricePerNight;
      const ratingA = a.rating || a.ratingScore || 0;
      const ratingB = b.rating || b.ratingScore || 0;
      if (sortMode === "rating") return ratingB - ratingA;
      return ratingB * (b.reviewCount || 1) - ratingA * (a.reviewCount || 1);
    });

    this.filteredHotels = results;

    // Update summary text
    if (this.summaryEl) {
      const cityName = city === "All Cities" ? "all top destinations" : city;
      this.summaryEl.textContent = `Showing stays in ${cityName} • ${DateUtils.formatFriendlyDate(checkIn)} to ${DateUtils.formatFriendlyDate(checkOut)} (${nights} night${nights > 1 ? "s" : ""}) • ${guests} guest${guests > 1 ? "s" : ""}, ${rooms} room${rooms > 1 ? "s" : ""}`;
    }

    this.renderHotelResults();
  },

  resetFilters() {
    if (this.priceSlider) {
      this.priceSlider.value = this.priceSlider.max;
      if (this.priceValEl) this.priceValEl.textContent = `₹${this.priceSlider.max}`;
    }
    const allRadio = document.querySelector("input[name='hotel-star-filter'][value='all']");
    if (allRadio) allRadio.checked = true;

    if (this.sortSelect) this.sortSelect.value = "rating";
    this.applyFiltersAndSort();
  },

  renderHotelResults() {
    if (!this.resultsContainer) return;

    if (this.resultsCountEl) {
      this.resultsCountEl.textContent = `${this.filteredHotels.length} hotel${this.filteredHotels.length === 1 ? "" : "s"} found`;
    }

    if (this.filteredHotels.length === 0) {
      this.resultsContainer.innerHTML = `
        <div class="no-results-card">
          <div class="empty-icon">🏨</div>
          <h3>No Hotels Match Your Selection</h3>
          <p>Try widening your price range or choosing another city.</p>
          <button class="btn btn-secondary btn-sm" id="btn-clear-hotel-filters">Reset All Filters</button>
        </div>
      `;
      document.getElementById("btn-clear-hotel-filters")?.addEventListener("click", () => this.resetFilters());
      return;
    }

    const { nights, rooms } = this.currentSearchParams;

    this.resultsContainer.innerHTML = this.filteredHotels
      .map((hotel) => {
        const total = hotel.pricePerNight * nights * rooms;
        const starIcons = "★".repeat(hotel.stars) + "☆".repeat(5 - hotel.stars);

        return `
        <article class="hotel-card" data-id="${hotel.id}">
          <div class="hotel-image-wrapper">
            <img 
              src="${hotel.image}" 
              alt="${hotel.name}" 
              class="hotel-img" 
              loading="lazy"
              onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?w=700&auto=format&fit=crop&q=80'"
            />
            ${hotel.badge ? `<span class="hotel-badge">${hotel.badge}</span>` : ""}
          </div>

          <div class="hotel-card-body">
            <div class="hotel-info-main">
              <div class="hotel-header">
                <div>
                  <div class="hotel-stars" title="${hotel.stars} Stars">${starIcons}</div>
                  <h3 class="hotel-name">${hotel.name}</h3>
                  <p class="hotel-address">📍 ${hotel.address}</p>
                </div>
              </div>

              <div class="hotel-rating-row">
                <span class="rating-badge">★ ${hotel.rating || hotel.ratingScore || 4.5}</span>
                <span class="rating-text">${(hotel.rating || hotel.ratingScore || 4.5) >= 4.5 ? "Excellent" : "Very Good"}</span>
                <span class="review-count">(${hotel.reviewCount} verified reviews)</span>
              </div>

              ${hotel.description ? `<p class="hotel-desc">${hotel.description}</p>` : ""}

              <div class="hotel-amenities-row">
                ${hotel.amenities.map((a) => `<span class="amenity-pill">✓ ${a}</span>`).join("")}
              </div>
            </div>

            <div class="hotel-pricing-column">
              <div class="hotel-price-box">
                <div class="price-night-wrap">
                  <span class="price-night-rate">₹${hotel.pricePerNight}</span>
                  <span class="price-night-label">/ night</span>
                </div>
                <div class="hotel-stay-total">
                  Total: <strong>₹${total}</strong> for ${nights} night${nights > 1 ? "s" : ""}, ${rooms} room${rooms > 1 ? "s" : ""}
                </div>
                <span class="taxes-hint">+ taxes & fees calculated at checkout</span>
              </div>

              <button class="btn btn-primary btn-book-hotel" data-id="${hotel.id}">
                Reserve Room
              </button>
            </div>
          </div>
        </article>`;
      })
      .join("");
  },

  handleBookHotel(hotelId) {
    const hotel = this.allHotels.find((h) => h.id === hotelId);
    if (!hotel) return;

    const { checkIn, checkOut, nights, rooms, guests } = this.currentSearchParams;
    const pricePerRoom = hotel.pricePerNight * nights;

    BookingModule.openBookingFlow({
      type: "hotel",
      itemId: hotel.id,
      title: hotel.name,
      subtitle: `${hotel.city}, ${hotel.country} • ${nights} Night Stay (${checkIn} to ${checkOut})`,
      departureDate: checkIn,
      returnDate: checkOut,
      passengersCount: guests,
      totalUnits: rooms,
      basePricePerUnit: pricePerRoom,
      unitLabel: "Room(s)"
    });
  }
};