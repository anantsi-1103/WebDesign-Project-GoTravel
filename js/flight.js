/**
 * flight.js - Flight Booking Module
 * 
 * Handles searching, sorting, filtering flights, airport swapping,
 * cabin travel class calculations (Economy, Premium Economy, Business, First Class),
 * and initiating flight bookings.
 */

const FlightModule = {
  allFlights: [],
  filteredFlights: [],
  currentSearchParams: {
    origin: "DEL",
    destination: "BOM",
    departureDate: "",
    passengers: 1,
    travelClass: "Economy"
  },

  async init() {
    this.form = document.getElementById("flight-search-form");
    this.originSelect = document.getElementById("flight-origin");
    this.destSelect = document.getElementById("flight-destination");
    this.dateInput = document.getElementById("flight-departure-date") || document.getElementById("flight-depart-date");
    this.paxSelect = document.getElementById("flight-passengers");
    this.classSelect = document.getElementById("flight-class");
    this.swapBtn = document.getElementById("swap-flight-airports") || document.getElementById("btn-swap-airports");
    this.resultsContainer = document.getElementById("flight-results-list");
    this.resultsCountEl = document.getElementById("flight-results-count");
    this.routeHeaderEl = document.getElementById("flight-route-header");
    this.priceSlider = document.getElementById("flight-price-range");
    this.priceValEl = document.getElementById("flight-price-val");
    this.sortSelect = document.getElementById("flight-sort-select");
    this.resetBtn = document.getElementById("flight-reset-filters");

    // Populate dropdowns & dates
    this.setupDateInput();
    this.populateAirports();
    this.bindEvents();

    // Use initial data immediately, then update from JSON
    this.allFlights = typeof initialData !== "undefined" && initialData.flights ? [...initialData.flights] : [];
    this.executeSearch();

    if (typeof apiService !== "undefined" && apiService.getFlights) {
      apiService.getFlights().then((flights) => {
        if (flights && flights.length) {
          this.allFlights = flights;
          this.executeSearch();
        }
      });
    }
  },

  // Lock date input to today and future dates (no past selection allowed)
  setupDateInput() {
    if (this.dateInput) {
      if (typeof DateUtils !== "undefined" && DateUtils.enforceMinToday) {
        DateUtils.enforceMinToday(this.dateInput);
      } else {
        const today = new Date().toISOString().split("T")[0];
        this.dateInput.min = today;
        if (!this.dateInput.value) this.dateInput.value = today;
      }
    }
  },

  populateAirports() {
    const airports = typeof initialData !== "undefined" && initialData.airports ? initialData.airports : [];
    if (!airports.length) return;

    const makeOptions = (selectedCode) =>
      airports
        .map((a) => `<option value="${a.code}" ${a.code === selectedCode ? "selected" : ""}>${a.city} (${a.code}) - ${a.name}</option>`)
        .join("");

    if (this.originSelect && this.originSelect.children.length <= 1) {
      this.originSelect.innerHTML = makeOptions("DEL");
    }
    if (this.destSelect && this.destSelect.children.length <= 1) {
      this.destSelect.innerHTML = makeOptions("BOM");
    }
  },

  // Travel class configurations (multipliers, badges, perks)
  getClassConfig(className = "Economy") {
    const configs = {
      Economy: {
        multiplier: 1.0,
        badgeClass: "class-economy",
        label: "Economy",
        amenities: ["Standard Seat", "Cabin Baggage 7kg", "Free Snack", "USB Charging"]
      },
      "Premium Economy": {
        multiplier: 1.6,
        badgeClass: "class-premium",
        label: "Premium Economy",
        amenities: ["Extra Legroom (38\")", "Priority Boarding", "Baggage 20kg", "Premium Meal"]
      },
      Business: {
        multiplier: 2.6,
        badgeClass: "class-business",
        label: "Business Class",
        amenities: ["180° Lie-flat Bed", "VIP Lounge Access", "Gourmet Dining", "Baggage 35kg", "Priority Check-in"]
      },
      "First Class": {
        multiplier: 4.0,
        badgeClass: "class-first",
        label: "First Class",
        amenities: ["Private Suite", "VIP Chauffeur", "Champagne & Caviar", "Baggage 45kg", "Exclusive Lounge"]
      }
    };
    return configs[className] || configs["Economy"];
  },

  bindEvents() {
    // Airport swap button (works seamlessly both directions)
    if (this.swapBtn) {
      this.swapBtn.addEventListener("click", () => this.swapAirports());
    }

    // Form search submit
    if (this.form) {
      this.form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.executeSearch();
        App.switchTab("flights");
        document.getElementById("section-view-flights")?.scrollIntoView({ behavior: "smooth" });
      });
    }

    // Departure date change listener (past date restriction & live search)
    if (this.dateInput) {
      this.dateInput.addEventListener("change", () => {
        const today = typeof DateUtils !== "undefined" ? DateUtils.getTodayString() : new Date().toISOString().split("T")[0];
        if (this.dateInput.value < today) {
          this.dateInput.value = today;
          if (typeof App !== "undefined" && App.showToast) {
            App.showToast("Past dates are not allowed. Date set to today.", "warning");
          }
        }
        this.executeSearch();
      });
    }

    // Travel class change from Hero form
    if (this.classSelect) {
      this.classSelect.addEventListener("change", () => {
        const newClass = this.classSelect.value;
        // Sync with sidebar radio if present
        const sidebarRadio = document.querySelector(`input[name='flight-sidebar-class'][value='${newClass}']`);
        if (sidebarRadio) sidebarRadio.checked = true;
        this.executeSearch();
      });
    }

    // Travel class change from Sidebar filter
    document.querySelectorAll("input[name='flight-sidebar-class']").forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (e.target.checked) {
          if (this.classSelect) this.classSelect.value = e.target.value;
          this.executeSearch();
        }
      });
    });

    // Price slider
    if (this.priceSlider) {
      this.priceSlider.addEventListener("input", (e) => {
        if (this.priceValEl) this.priceValEl.textContent = `₹${e.target.value}`;
        this.applyFiltersAndSort();
      });
    }

    // Time filter radios
    document.querySelectorAll("input[name='flight-time-filter']").forEach((radio) => {
      radio.addEventListener("change", () => this.applyFiltersAndSort());
    });

    // Stops filter checkboxes
    document.querySelectorAll("input[name='flight-stops-filter']").forEach((cb) => {
      cb.addEventListener("change", () => this.applyFiltersAndSort());
    });

    // Sort dropdown
    if (this.sortSelect) {
      this.sortSelect.addEventListener("change", () => this.applyFiltersAndSort());
    }

    // Reset filters
    if (this.resetBtn) {
      this.resetBtn.addEventListener("click", () => this.resetFilters());
    }

    // Book flight click (delegated)
    if (this.resultsContainer) {
      this.resultsContainer.addEventListener("click", (e) => {
        const bookBtn = e.target.closest(".btn-book-flight");
        if (bookBtn) {
          const flightId = bookBtn.dataset.id;
          this.handleBookFlight(flightId);
        }
      });
    }
  },

  // Swap origin and destination
  swapAirports() {
    if (!this.originSelect || !this.destSelect) return;
    const temp = this.originSelect.value;
    this.originSelect.value = this.destSelect.value;
    this.destSelect.value = temp;

    // Trigger visual rotation on button
    if (this.swapBtn) {
      this.swapBtn.classList.add("rotated");
      setTimeout(() => this.swapBtn.classList.remove("rotated"), 300);
    }

    this.executeSearch();
    if (typeof App !== "undefined" && App.showToast) {
      App.showToast(`Swapped route to ${this.originSelect.value} ➔ ${this.destSelect.value}`, "info");
    }
  },

  // Dynamic scheduled flight generator for any route not explicitly hardcoded in mock data
  generateDynamicFlightsForRoute(origin, destination) {
    const airports = typeof initialData !== "undefined" && initialData.airports ? initialData.airports : [];
    const origAirport = airports.find((a) => a.code === origin) || { code: origin, city: origin, name: `${origin} Airport` };
    const destAirport = airports.find((a) => a.code === destination) || { code: destination, city: destination, name: `${destination} Airport` };

    const isDomestic = (origin === "DEL" && destination === "BOM") || (origin === "BOM" && destination === "DEL");
    const baseDur = isDomestic ? 135 : 390;
    const baseP = isDomestic ? 5200 : 28500;

    return [
      {
        id: `FL-${origin}${destination}-01`,
        airline: "SkyWings Airlines",
        airlineCode: "SW",
        flightNumber: `SW-${Math.floor(200 + Math.random() * 700)}`,
        origin: origin,
        originCity: origAirport.city,
        destination: destination,
        destinationCity: destAirport.city,
        departureTime: "06:30",
        arrivalTime: "08:50",
        durationMinutes: baseDur,
        durationFormatted: `${Math.floor(baseDur / 60)}h ${baseDur % 60}m`,
        stops: 0,
        stopsText: "Non-stop",
        price: baseP,
        seatsAvailable: 14,
        timeCategory: "morning",
        aircraft: "Airbus A321neo",
        amenities: ["Free Snack", "USB Charging", "Cabin Baggage 7kg"]
      },
      {
        id: `FL-${origin}${destination}-02`,
        airline: "AeroGlobal",
        airlineCode: "AG",
        flightNumber: `AG-${Math.floor(200 + Math.random() * 700)}`,
        origin: origin,
        originCity: origAirport.city,
        destination: destination,
        destinationCity: destAirport.city,
        departureTime: "10:15",
        arrivalTime: "12:40",
        durationMinutes: baseDur + 10,
        durationFormatted: `${Math.floor((baseDur + 10) / 60)}h ${(baseDur + 10) % 60}m`,
        stops: 0,
        stopsText: "Non-stop",
        price: Math.round(baseP * 1.15),
        seatsAvailable: 9,
        timeCategory: "morning",
        aircraft: "Boeing 737 MAX",
        amenities: ["Hot Meal", "Wi-Fi Available", "Baggage 15kg"]
      },
      {
        id: `FL-${origin}${destination}-03`,
        airline: "Pacific Express",
        airlineCode: "PE",
        flightNumber: `PE-${Math.floor(200 + Math.random() * 700)}`,
        origin: origin,
        originCity: origAirport.city,
        destination: destination,
        destinationCity: destAirport.city,
        departureTime: "14:45",
        arrivalTime: "17:15",
        durationMinutes: baseDur + 15,
        durationFormatted: `${Math.floor((baseDur + 15) / 60)}h ${(baseDur + 15) % 60}m`,
        stops: 0,
        stopsText: "Non-stop",
        price: Math.round(baseP * 0.9),
        seatsAvailable: 22,
        timeCategory: "afternoon",
        aircraft: "Airbus A320",
        amenities: ["Beverages", "USB Port", "Cabin Baggage 7kg"]
      },
      {
        id: `FL-${origin}${destination}-04`,
        airline: "Royal Airways",
        airlineCode: "RA",
        flightNumber: `RA-${Math.floor(200 + Math.random() * 700)}`,
        origin: origin,
        originCity: origAirport.city,
        destination: destination,
        destinationCity: destAirport.city,
        departureTime: "19:30",
        arrivalTime: "22:00",
        durationMinutes: baseDur,
        durationFormatted: `${Math.floor(baseDur / 60)}h ${baseDur % 60}m`,
        stops: 0,
        stopsText: "Non-stop",
        price: Math.round(baseP * 1.25),
        seatsAvailable: 6,
        timeCategory: "evening",
        aircraft: "Boeing 787 Dreamliner",
        amenities: ["Gourmet Dinner", "In-flight Screen", "Baggage 25kg", "Fast Wi-Fi"]
      },
      {
        id: `FL-${origin}${destination}-05`,
        airline: "ConnectAir",
        airlineCode: "CA",
        flightNumber: `CA-${Math.floor(200 + Math.random() * 700)}`,
        origin: origin,
        originCity: origAirport.city,
        destination: destination,
        destinationCity: destAirport.city,
        departureTime: "21:15",
        arrivalTime: "02:45",
        durationMinutes: baseDur + 160,
        durationFormatted: `${Math.floor((baseDur + 160) / 60)}h ${(baseDur + 160) % 60}m`,
        stops: 1,
        stopsText: "1 Stop (Connecting)",
        price: Math.round(baseP * 0.75),
        seatsAvailable: 18,
        timeCategory: "evening",
        aircraft: "ATR 72",
        amenities: ["Snack Pack", "Cabin Baggage 7kg"]
      }
    ];
  },

  // Execute search based on form inputs
  executeSearch() {
    const origin = this.originSelect?.value || "DEL";
    const destination = this.destSelect?.value || "BOM";
    let departureDate = this.dateInput?.value || (typeof DateUtils !== "undefined" ? DateUtils.getTodayString() : "");

    // Enforce min today validation
    const today = typeof DateUtils !== "undefined" ? DateUtils.getTodayString() : new Date().toISOString().split("T")[0];
    if (!departureDate || departureDate < today) {
      departureDate = today;
      if (this.dateInput) this.dateInput.value = today;
    }

    const passengers = parseInt(this.paxSelect?.value || "1", 10);
    const travelClass = this.classSelect?.value || "Economy";

    this.currentSearchParams = { origin, destination, departureDate, passengers, travelClass };

    if (this.routeHeaderEl) {
      const dateText = typeof DateUtils !== "undefined" && DateUtils.formatFriendlyDate ? DateUtils.formatFriendlyDate(departureDate) : departureDate;
      this.routeHeaderEl.textContent = `${origin} ➔ ${destination} (${dateText}) • ${travelClass}`;
    }

    this.applyFiltersAndSort();
  },

  // Apply filters and sorting with class multiplier
  applyFiltersAndSort() {
    const { origin, destination, travelClass } = this.currentSearchParams;
    const classCfg = this.getClassConfig(travelClass);

    // If origin and destination are identical
    if (origin === destination) {
      this.filteredFlights = [];
      this.renderSameCityError();
      return;
    }

    // 1. Match route from loaded flights
    let matched = this.allFlights.filter((f) => f.origin === origin && f.destination === destination);

    // If no direct flights in database for this pair, dynamically generate realistic scheduled flights
    if (matched.length === 0) {
      matched = this.generateDynamicFlightsForRoute(origin, destination);
    }

    // 2. Apply class pricing multiplier and perks to each flight
    let results = matched.map((f) => {
      const calculatedPrice = Math.round(f.price * classCfg.multiplier);
      return {
        ...f,
        calculatedPrice,
        price: calculatedPrice, // ensure price property reflects class price for backwards compatibility
        travelClass,
        classBadgeClass: classCfg.badgeClass,
        classAmenities: classCfg.amenities
      };
    });

    // 3. Price filter
    if (this.priceSlider) {
      const maxPrice = parseFloat(this.priceSlider.value);
      results = results.filter((f) => f.calculatedPrice <= maxPrice);
    }

    // 4. Time filter
    const selectedTime = document.querySelector("input[name='flight-time-filter']:checked")?.value;
    if (selectedTime && selectedTime !== "all") {
      results = results.filter((f) => f.timeCategory === selectedTime);
    }

    // 5. Stops filter
    const checkedStops = Array.from(document.querySelectorAll("input[name='flight-stops-filter']:checked")).map((cb) =>
      parseInt(cb.value, 10)
    );
    if (checkedStops.length > 0) {
      results = results.filter((f) => checkedStops.includes(f.stops));
    }

    // 6. Sorting
    const sortMode = this.sortSelect?.value || "cheapest";
    results.sort((a, b) => {
      if (sortMode === "cheapest") return a.calculatedPrice - b.calculatedPrice;
      if (sortMode === "fastest") return a.durationMinutes - b.durationMinutes;
      if (sortMode === "earliest") return a.departureTime.localeCompare(b.departureTime);
      return 0;
    });

    this.filteredFlights = results;
    this.renderFlightResults();
  },

  renderSameCityError() {
    if (!this.resultsContainer) return;
    if (this.resultsCountEl) this.resultsCountEl.textContent = "0 flights found";
    this.resultsContainer.innerHTML = `
      <div class="no-results-card">
        <div class="empty-icon">⚠️</div>
        <h3>Origin and Destination Cannot Be the Same</h3>
        <p>Please select two different cities to search for flights.</p>
        <button class="btn btn-secondary btn-sm" id="btn-fix-airports">Select Mumbai (BOM)</button>
      </div>
    `;
    document.getElementById("btn-fix-airports")?.addEventListener("click", () => {
      if (this.destSelect) this.destSelect.value = "BOM";
      this.executeSearch();
    });
  },

  resetFilters() {
    if (this.priceSlider) {
      this.priceSlider.value = this.priceSlider.max;
      if (this.priceValEl) this.priceValEl.textContent = `₹${this.priceSlider.max}`;
    }
    const allTimeRadio = document.querySelector("input[name='flight-time-filter'][value='all']");
    if (allTimeRadio) allTimeRadio.checked = true;

    document.querySelectorAll("input[name='flight-stops-filter']").forEach((cb) => (cb.checked = false));
    if (this.sortSelect) this.sortSelect.value = "cheapest";

    this.applyFiltersAndSort();
  },

  // Render cards into DOM
  renderFlightResults() {
    if (!this.resultsContainer) return;

    if (this.resultsCountEl) {
      this.resultsCountEl.textContent = `${this.filteredFlights.length} flight${this.filteredFlights.length === 1 ? "" : "s"} found`;
    }

    if (this.filteredFlights.length === 0) {
      this.resultsContainer.innerHTML = `
        <div class="no-results-card">
          <div class="empty-icon">✈️</div>
          <h3>No Flights Match Your Filters</h3>
          <p>Try widening your price range or clearing departure time filters.</p>
          <button class="btn btn-secondary btn-sm" id="btn-clear-flight-filters">Reset All Filters</button>
        </div>
      `;
      document.getElementById("btn-clear-flight-filters")?.addEventListener("click", () => this.resetFilters());
      return;
    }

    const { passengers, travelClass } = this.currentSearchParams;

    this.resultsContainer.innerHTML = this.filteredFlights
      .map((flight) => {
        const calculatedPrice = flight.calculatedPrice || flight.price;
        const totalPrice = calculatedPrice * passengers;
        const amenitiesToDisplay = flight.classAmenities || flight.amenities;

        return `
        <article class="flight-card" data-id="${flight.id}">
          <div class="flight-card-main">
            <div class="flight-airline">
              <div class="airline-badge">${flight.airlineCode}</div>
              <div>
                <h4 class="airline-name">${flight.airline}</h4>
                <span class="flight-num">${flight.flightNumber} • ${flight.aircraft}</span>
                <span class="flight-class-pill ${flight.classBadgeClass || 'class-economy'}">💺 ${flight.travelClass || travelClass}</span>
              </div>
            </div>

            <div class="flight-schedule">
              <div class="schedule-point">
                <span class="flight-time">${flight.departureTime}</span>
                <span class="flight-city">${flight.originCity} (${flight.origin})</span>
              </div>

              <div class="flight-duration-track">
                <span class="duration-text">${flight.durationFormatted}</span>
                <div class="track-line"><span class="plane-icon">✈</span></div>
                <span class="stops-text ${flight.stops === 0 ? "nonstop" : "has-stop"}">${flight.stopsText}</span>
              </div>

              <div class="schedule-point">
                <span class="flight-time">${flight.arrivalTime}</span>
                <span class="flight-city">${flight.destinationCity} (${flight.destination})</span>
              </div>
            </div>

            <div class="flight-pricing">
              <div class="price-box">
                <span class="price-label">Per passenger (${flight.travelClass || travelClass})</span>
                <span class="price-amount">₹${calculatedPrice}</span>
                ${passengers > 1 ? `<span class="total-multi-pass">Total: <strong>₹${totalPrice}</strong> (${passengers} pax)</span>` : ""}
              </div>
              <button class="btn btn-primary btn-book-flight" data-id="${flight.id}">
                Book Flight
              </button>
            </div>
          </div>

          <div class="flight-card-footer">
            <span class="flight-seats-left">🔥 Only ${flight.seatsAvailable} seats remaining</span>
            <span class="flight-amenities-tags">
              ${amenitiesToDisplay.map((a) => `<span class="amenity-tag">${a}</span>`).join("")}
            </span>
          </div>
        </article>`;
      })
      .join("");
  },

  // Open booking flow for chosen flight
  handleBookFlight(flightId) {
    const flight = this.filteredFlights.find((f) => f.id === flightId) || this.allFlights.find((f) => f.id === flightId);
    if (!flight) return;

    const { passengers, departureDate, travelClass } = this.currentSearchParams;
    const classCfg = this.getClassConfig(travelClass);
    const calculatedPrice = flight.calculatedPrice || Math.round(flight.price * classCfg.multiplier);

    BookingModule.openBookingFlow({
      type: "flight",
      itemId: flight.id,
      title: `${flight.airline} (${flight.flightNumber}) • ${travelClass}`,
      subtitle: `${flight.originCity} (${flight.origin}) to ${flight.destinationCity} (${flight.destination}) • ${travelClass}`,
      departureDate: departureDate || (typeof DateUtils !== "undefined" ? DateUtils.getTodayString() : ""),
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      duration: flight.durationFormatted,
      passengersCount: passengers,
      travelClass: travelClass || "Economy",
      basePricePerUnit: calculatedPrice,
      totalUnits: passengers,
      calculatedBaseTotal: calculatedPrice * passengers,
      unitLabel: "Passenger(s)"
    });
  }
};
