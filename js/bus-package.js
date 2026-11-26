/**
 * bus-package.js - Bus & Holiday Packages Booking Module
 * 
 * Handles searching, sorting, filtering, and initiating bookings for intercity buses and vacation packages.
 */

const BusPackageModule = {
  allBuses: [],
  filteredBuses: [],
  allPackages: [],
  currentBusCategory: "all",
  currentBusSort: "cheapest",
  rawBusResults: [],

  async init() {
    this.busForm = document.getElementById("bus-search-form");
    this.busFromInput = document.getElementById("bus-from");
    this.busToInput = document.getElementById("bus-to");
    this.busDateInput = document.getElementById("bus-departure-date");
    this.busResultsContainer = document.getElementById("bus-results-list");
    this.busResultsCountEl = document.getElementById("bus-results-count");
    this.busSortSelect = document.getElementById("bus-sort-select");
    this.busSummaryEl = document.getElementById("bus-route-summary");

    this.packageForm = document.getElementById("package-search-form");
    this.packageDestInput = document.getElementById("package-dest");
    this.packageCatSelect = document.getElementById("package-cat");
    this.packageResultsContainer = document.getElementById("package-results-list");

    this.setupDates();
    this.bindEvents();

    this.allBuses = [...initialData.buses];
    this.allPackages = [...initialData.packages];

    this.searchBuses();
    this.searchPackages();

    apiService.getBuses().then((buses) => {
      if (buses && buses.length) {
        this.allBuses = buses;
        this.searchBuses();
      }
    });

    apiService.getPackages().then((pkgs) => {
      if (pkgs && pkgs.length) {
        this.allPackages = pkgs;
        this.searchPackages();
      }
    });
  },

  setupDates() {
    if (this.busDateInput) {
      DateUtils.enforceMinToday(this.busDateInput);
      this.busDateInput.addEventListener("change", () => {
        const today = DateUtils.getTodayString();
        if (this.busDateInput.value < today) {
          this.busDateInput.value = today;
          App.showToast("Past dates are not allowed. Date set to today.", "warning");
        }
        this.searchBuses();
      });
    }
  },

  bindEvents() {
    // Bus search form submit
    this.busForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.searchBuses();
      App.switchTab("buses");
      document.getElementById("section-view-buses")?.scrollIntoView({ behavior: "smooth" });
    });

    // Bus results list click (booking & clear search)
    this.busResultsContainer?.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-book-bus");
      if (btn) this.handleBookBus(btn.dataset.id);

      const resetBtn = e.target.closest("#btn-clear-bus-search");
      if (resetBtn) {
        if (this.busFromInput) this.busFromInput.value = "";
        if (this.busToInput) this.busToInput.value = "";
        this.currentBusCategory = "all";
        document.querySelectorAll(".bus-filter-pill").forEach((b) => {
          b.classList.toggle("active", b.dataset.type === "all");
        });
        this.searchBuses();
      }
    });

    // Bus sort select
    this.busSortSelect?.addEventListener("change", () => {
      this.currentBusSort = this.busSortSelect.value;
      this.applyBusFiltersAndSort();
    });

    // Bus category filter pills (All, AC Sleeper, AC Seater)
    document.querySelectorAll(".bus-filter-pill")?.forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".bus-filter-pill").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentBusCategory = btn.dataset.type || "all";
        this.applyBusFiltersAndSort();
      });
    });

    // Package search form submit
    this.packageForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.searchPackages();
      App.switchTab("packages");
      document.getElementById("section-view-packages")?.scrollIntoView({ behavior: "smooth" });
    });

    // Package results list click (booking)
    this.packageResultsContainer?.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-book-package");
      if (btn) this.handleBookPackage(btn.dataset.id);
    });
  },

  searchBuses() {
    const fromCity = (this.busFromInput?.value || document.getElementById("bus-from")?.value || "").trim().toLowerCase();
    const toCity = (this.busToInput?.value || document.getElementById("bus-to")?.value || "").trim().toLowerCase();

    let matched = this.allBuses;
    if (fromCity || toCity) {
      matched = this.allBuses.filter((b) => {
        const matchFrom = !fromCity || b.from.toLowerCase().includes(fromCity);
        const matchTo = !toCity || b.to.toLowerCase().includes(toCity);
        return matchFrom && matchTo;
      });
    }

    this.rawBusResults = matched;
    this.applyBusFiltersAndSort();
  },

  applyBusFiltersAndSort() {
    let results = [...(this.rawBusResults || this.allBuses)];

    // Category filter
    if (this.currentBusCategory && this.currentBusCategory !== "all") {
      results = results.filter(
        (b) =>
          (b.category || "").toLowerCase() === this.currentBusCategory.toLowerCase() ||
          (b.busType || "").toLowerCase().includes(this.currentBusCategory.toLowerCase())
      );
    }

    // Sort
    const sort = this.currentBusSort || "cheapest";
    results.sort((a, b) => {
      if (sort === "cheapest") return a.price - b.price;
      if (sort === "expensive") return b.price - a.price;
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "earliest") return (a.departureTime || "").localeCompare(b.departureTime || "");
      return 0;
    });

    this.filteredBuses = results;

    // Update count & summary
    if (this.busResultsCountEl) {
      this.busResultsCountEl.textContent = `${results.length} bus${results.length === 1 ? "" : "es"} available`;
    }

    const fromVal = (this.busFromInput?.value || "").trim();
    const toVal = (this.busToInput?.value || "").trim();
    const dateVal = this.busDateInput?.value || DateUtils.getTodayString();
    if (this.busSummaryEl) {
      if (fromVal || toVal) {
        this.busSummaryEl.textContent = `Showing buses from ${fromVal || "Any City"} to ${toVal || "Any City"} • ${DateUtils.formatFriendlyDate(dateVal)}`;
      } else {
        this.busSummaryEl.textContent = `All intercity routes • Comfortable AC Sleepers, Seaters, and Luxury Coaches`;
      }
    }

    this.renderBuses(results);
  },

  renderBuses(buses) {
    if (!this.busResultsContainer) return;

    if (buses.length === 0) {
      this.busResultsContainer.innerHTML = `
        <div class="no-results-card">
          <div class="empty-icon">🚌</div>
          <h3>No Buses Found for this Route</h3>
          <p>We currently operate on routes between Delhi, Jaipur, Manali, Chandigarh, Mumbai, Goa, Pune, Bengaluru, Chennai, and Hyderabad.</p>
          <button class="btn btn-secondary btn-sm" id="btn-clear-bus-search">View All Buses</button>
        </div>
      `;
      return;
    }

    this.busResultsContainer.innerHTML = buses
      .map(
        (bus) => `
        <article class="bus-card" data-id="${bus.id}">
          <div class="bus-main-info">
            <div class="bus-operator-box">
              <h4 class="bus-operator">${bus.operator}</h4>
              <span class="bus-type-badge">${bus.busType}</span>
              <span class="bus-rating">★ ${bus.rating} / 5.0</span>
            </div>
            <div class="bus-time-schedule">
              <div>
                <strong>${bus.departureTime}</strong>
                <span>${bus.from}</span>
              </div>
              <div class="bus-duration-line">
                <span>${bus.duration}</span>
                <div class="dash-line"></div>
              </div>
              <div>
                <strong>${bus.arrivalTime}</strong>
                <span>${bus.to}</span>
              </div>
            </div>
            <div class="bus-price-action">
              <div class="price-val">₹${bus.price}</div>
              <span class="seats-left-badge">${bus.seatsAvailable} seats available</span>
              <button class="btn btn-primary btn-sm btn-book-bus" data-id="${bus.id}">
                Book Seat
              </button>
            </div>
          </div>
          <div class="bus-amenities">
            ${bus.amenities.map((a) => `<span>✓ ${a}</span>`).join(" • ")}
          </div>
        </article>
      `
      )
      .join("");
  },

  handleBookBus(busId) {
    const bus = this.allBuses.find((b) => b.id === busId);
    if (!bus) return;

    const departureDate = this.busDateInput?.value || DateUtils.getTodayString();

    BookingModule.openBookingFlow({
      type: "bus",
      itemId: bus.id,
      title: `${bus.operator} - ${bus.busType}`,
      subtitle: `${bus.from} ➔ ${bus.to} (${bus.departureTime} - ${bus.arrivalTime})`,
      departureDate,
      passengersCount: 1,
      basePricePerUnit: bus.price,
      totalUnits: 1,
      unitLabel: "Seat(s)"
    });
  },

  searchPackages() {
    const dest = (this.packageDestInput?.value || document.getElementById("package-dest")?.value || "").trim().toLowerCase();
    const cat = this.packageCatSelect?.value || document.getElementById("package-cat")?.value || "all";

    let results = this.allPackages.filter((p) => {
      const matchDest = !dest || p.destination.toLowerCase().includes(dest) || p.title.toLowerCase().includes(dest);
      const matchCat = cat === "all" || p.category.toLowerCase().includes(cat.toLowerCase());
      return matchDest && matchCat;
    });

    if (results.length === 0) results = this.allPackages;
    this.renderPackages(results);
  },

  renderPackages(packages) {
    if (!this.packageResultsContainer) return;

    if (packages.length === 0) {
      this.packageResultsContainer.innerHTML = `
        <div class="no-results-card col-span-3">
          <div class="empty-icon">🌴</div>
          <h3>No Packages Match Your Search</h3>
          <p>Try searching for Paris, Dubai, Tokyo, or Goa.</p>
        </div>
      `;
      return;
    }

    this.packageResultsContainer.innerHTML = packages
      .map(
        (pkg) => `
        <article class="package-card" data-id="${pkg.id}">
          <div class="pkg-img-wrap">
            <img src="${pkg.image}" alt="${pkg.title}" class="pkg-img" loading="lazy" />
            <span class="pkg-badge">${pkg.badge}</span>
            <span class="pkg-duration">${pkg.duration}</span>
          </div>
          <div class="pkg-content">
            <div class="pkg-meta">
              <span class="pkg-category">🏷️ ${pkg.category}</span>
              <span class="pkg-rating">★ ${pkg.rating}</span>
            </div>
            <h3 class="pkg-title">${pkg.title}</h3>
            <div class="pkg-inclusions">
              ${pkg.inclusions.map((inc) => `<li>✓ ${inc}</li>`).join("")}
            </div>
            <div class="pkg-footer">
              <div class="pkg-price-box">
                <span class="pkg-price-label">All-inclusive per person</span>
                <span class="pkg-price">₹${pkg.price}</span>
              </div>
              <button class="btn btn-primary btn-book-package" data-id="${pkg.id}">
                Book Package
              </button>
            </div>
          </div>
        </article>
      `
      )
      .join("");
  },

  handleBookPackage(pkgId) {
    const pkg = this.allPackages.find((p) => p.id === pkgId);
    if (!pkg) return;

    BookingModule.openBookingFlow({
      type: "package",
      itemId: pkg.id,
      title: pkg.title,
      subtitle: `${pkg.duration} • ${pkg.category}`,
      departureDate: DateUtils.addDays(DateUtils.getTodayString(), 7),
      passengersCount: 2,
      basePricePerUnit: pkg.price,
      totalUnits: 2,
      calculatedBaseTotal: pkg.price * 2,
      unitLabel: "Traveler(s)"
    });
  }
};