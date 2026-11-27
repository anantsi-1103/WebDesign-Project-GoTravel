

const BookingModule = {
  currentBookingItem: null,
  appliedPromo: null,
  pendingBookingItem: null,
  pendingAction: null,

  init() {
    this.modal = document.getElementById("booking-modal");
    this.closeBtn = document.getElementById("close-booking-modal");
    this.form = document.getElementById("booking-form");
    this.passengerContainer = document.getElementById("dynamic-passenger-fields");
    this.summaryContainer = document.getElementById("booking-summary-content");
    this.promoInput = document.getElementById("promo-code-input");
    this.promoBtn = document.getElementById("btn-apply-promo");
    this.promoMessageEl = document.getElementById("promo-message");

    this.myBookingsModal = document.getElementById("my-bookings-modal");
    this.myBookingsList = document.getElementById("my-bookings-list");
    this.myBookingsBtn = document.getElementById("nav-my-bookings-btn");
    this.closeMyBookingsBtn = document.getElementById("close-my-bookings-modal");

    this.ticketModal = document.getElementById("ticket-modal");
    this.closeTicketBtn = document.getElementById("close-ticket-modal");
    this.ticketContent = document.getElementById("ticket-content-body");
    this.printTicketBtn = document.getElementById("btn-print-ticket");

    // Edit & Reschedule Modal Elements
    this.editModal = document.getElementById("edit-booking-modal");
    this.closeEditBtn = document.getElementById("close-edit-modal");
    this.editForm = document.getElementById("edit-booking-form");
    this.editPaxContainer = document.getElementById("edit-dynamic-passengers");
    this.editDateInput = document.getElementById("edit-departure-date");
    this.editReturnDateInput = document.getElementById("edit-return-date");
    this.editHotelDatesGroup = document.getElementById("edit-hotel-dates-group");
    this.editFeeNoticeEl = document.getElementById("edit-reschedule-fee-notice");
    this.editFeeAmountEl = document.getElementById("edit-fee-amount");
    this.editWalletBalanceEl = document.getElementById("edit-wallet-balance-info");

    this.bindEvents();
    this.updateBookingsBadge();
  },

  bindEvents() {
    // Close booking modal
    this.closeBtn?.addEventListener("click", () => this.closeBookingModal());
    this.modal?.addEventListener("click", (e) => {
      if (e.target === this.modal) this.closeBookingModal();
    });

    // Booking submit
    this.form?.addEventListener("submit", (e) => this.handleBookingSubmit(e));

    // Promo code apply
    this.promoBtn?.addEventListener("click", () => this.applyPromoCode());

    // My Bookings modal
    this.myBookingsBtn?.addEventListener("click", () => this.openMyBookings());
    this.closeMyBookingsBtn?.addEventListener("click", () => this.closeMyBookings());
    this.myBookingsModal?.addEventListener("click", (e) => {
      if (e.target === this.myBookingsModal) this.closeMyBookings();
    });


    // My Bookings filter tabs
    document.querySelectorAll(".booking-filter-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".booking-filter-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        this.renderMyBookingsList(tab.dataset.filter);
      });
    });

    // My Bookings item actions (View Ticket / Cancel/ Edit)
    this.myBookingsList?.addEventListener("click", (e) => {
      const viewBtn = e.target.closest(".btn-view-ticket");
      if (viewBtn) this.viewTicket(viewBtn.dataset.id);

      const cancelBtn = e.target.closest(".btn-cancel-booking");
      if (cancelBtn) this.handleCancelBooking(cancelBtn.dataset.id);

      const editBtn = e.target.closest(".btn-edit-booking");
      if (editBtn) this.openEditModal(editBtn.dataset.id);


    });

    // Edit Modal
    this.closeEditBtn?.addEventListener("click", () => this.closeEditModal());
    this.editModal?.addEventListener("click", (e) => {
      if (e.target === this.editModal) this.closeEditModal();
    });

    this.editForm?.addEventListener("submit", (e) => this.handleEditSubmit(e));
    this.editDateInput?.addEventListener("change", () => this.updateEditFeePreview());
    this.editReturnDateInput?.addEventListener("change", () => this.updateEditFeePreview());



    // Ticket modal
    this.closeTicketBtn?.addEventListener("click", () => this.closeTicketModal());
    this.ticketModal?.addEventListener("click", (e) => {
      if (e.target === this.ticketModal) this.closeTicketModal();
    });

    // Print ticket
    this.printTicketBtn?.addEventListener("click", () => window.print());
  },

  // Open booking modal with selected travel item
  openBookingFlow(item) {
    const currentUser = StorageService.getCurrentUser();
    if (!currentUser) {
      this.pendingBookingItem = item;
      AuthModule.openModal("login", "Please sign in or create an account to book your trip.");
      App.showToast("Please sign in or register to book your trip.", "warning");
      return;
    }

    this.currentBookingItem = item;
    this.appliedPromo = null;

    if (this.promoInput) this.promoInput.value = "";
    if (this.promoMessageEl) this.promoMessageEl.textContent = "";

    this.renderDynamicPassengerFields();
    this.renderBookingSummary();

    this.modal?.classList.add("active");
    document.body.style.overflow = "hidden";
  },

  closeBookingModal() {
    this.modal?.classList.remove("active");
    document.body.style.overflow = "";
    this.form?.reset();
  },

  // Create passenger inputs based on passenger/guest count
  renderDynamicPassengerFields() {
    if (!this.passengerContainer || !this.currentBookingItem) return;

    const count = this.currentBookingItem.passengersCount || 1;
    const isHotel = this.currentBookingItem.type === "hotel";
    const labelTitle = isHotel ? "Guest" : "Passenger";

    let html = "";
    for (let i = 1; i <= count; i++) {
      html += `
        <fieldset class="passenger-card-fieldset">
          <legend class="passenger-legend">${labelTitle} ${i} ${i === 1 ? "(Primary Contact)" : ""}</legend>
          <div class="form-grid">
            <div class="form-group">
              <label for="pax-name-${i}">Full Name *</label>
              <input type="text" id="pax-name-${i}" class="form-control" placeholder="e.g. John Doe" required />
              <span class="field-error-msg" id="err-pax-name-${i}"></span>
            </div>
            <div class="form-group">
              <label for="pax-age-${i}">Age *</label>
              <input type="number" id="pax-age-${i}" class="form-control" placeholder="e.g. 25" min="1" max="120" required />
              <span class="field-error-msg" id="err-pax-age-${i}"></span>
            </div>
            <div class="form-group">
              <label for="pax-gender-${i}">Gender *</label>
              <select id="pax-gender-${i}" class="form-control">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </fieldset>
      `;
    }

    this.passengerContainer.innerHTML = html;

    // Prefill logged in user name and email on passenger 1
    const activeUser = StorageService.getCurrentUser();
    if (activeUser) {
      const firstPax = document.getElementById("pax-name-1");
      if (firstPax && !firstPax.value && activeUser.fullName) firstPax.value = activeUser.fullName;
      const contactEmail = document.getElementById("primary-contact-email");
      if (contactEmail && !contactEmail.value && activeUser.email) contactEmail.value = activeUser.email;
    }
  },

  // Calculate pricing breakdown
  calculatePricing() {
    const item = this.currentBookingItem;
    const baseFare = item.calculatedBaseTotal || item.basePricePerUnit * (item.totalUnits || 1);
    const taxesAndFees = Math.round(baseFare * 0.1); // 10% taxes
    const discount = this.appliedPromo ? Math.round(baseFare * this.appliedPromo.discountPercent) : 0;
    const grandTotal = Math.max(0, baseFare + taxesAndFees - discount);

    return {
      baseFare,
      taxesAndFees,
      discount,
      promoCode: this.appliedPromo ? this.appliedPromo.code : null,
      grandTotal
    };
  },

  // Render price summary sidebar
  renderBookingSummary() {
    if (!this.summaryContainer || !this.currentBookingItem) return;

    const item = this.currentBookingItem;
    const pricing = this.calculatePricing();
    this.currentBookingItem.pricing = pricing;

    const isHotel = item.type === "hotel";
    const isBus = item.type === "bus";

    let detailsHtml = "";
    if (isHotel) {
      detailsHtml = `
        <div class="summary-row">
          <span class="row-label">Check-in</span>
          <span class="row-value">${DateUtils.formatFriendlyDate(item.departureDate)}</span>
        </div>
        <div class="summary-row">
          <span class="row-label">Check-out</span>
          <span class="row-value">${DateUtils.formatFriendlyDate(item.returnDate)}</span>
        </div>
        <div class="summary-row">
          <span class="row-label">Rooms / Guests</span>
          <span class="row-value">${item.totalUnits || 1} Room(s), ${item.passengersCount} Guest(s)</span>
        </div>
      `;
    } else if (isBus) {
      detailsHtml = `
        <div class="summary-row">
          <span class="row-label">Travel Date</span>
          <span class="row-value">${DateUtils.formatFriendlyDate(item.departureDate)}</span>
        </div>
        <div class="summary-row">
          <span class="row-label">Seats</span>
          <span class="row-value">${item.totalUnits || 1} Seat(s)</span>
        </div>
      `;
    } else {
      detailsHtml = `
        <div class="summary-row">
          <span class="row-label">Travel Date</span>
          <span class="row-value">${DateUtils.formatFriendlyDate(item.departureDate)}</span>
        </div>
        <div class="summary-row">
          <span class="row-label">Travelers / Quantity</span>
          <span class="row-value">${item.passengersCount} traveler(s)</span>
        </div>
      `;
    }

    this.summaryContainer.innerHTML = `
      <div class="summary-item-header">
        <span class="item-badge type-${item.type}">${item.type.toUpperCase()}</span>
        <h3 class="summary-title">${item.title}</h3>
        <p class="summary-subtitle">${item.subtitle || ""}</p>
      </div>

      <div class="summary-details-list">
        ${detailsHtml}
      </div>

      <hr class="summary-divider" />

      <div class="price-breakdown">
        <div class="summary-row">
          <span class="row-label">Base Fare</span>
          <span class="row-value">₹${pricing.baseFare}</span>
        </div>
        <div class="summary-row">
          <span class="row-label">Taxes & Fees (10%)</span>
          <span class="row-value">₹${pricing.taxesAndFees}</span>
        </div>
        ${pricing.discount > 0
        ? `
          <div class="summary-row discount-row">
            <span class="row-label">Promo (${pricing.promoCode})</span>
            <span class="row-value text-success">-₹${pricing.discount}</span>
          </div>
        `
        : ""
      }
        <hr class="summary-divider" />
        <div class="summary-row total-row">
          <span class="row-label">Grand Total</span>
          <span class="row-value grand-total-val">₹${pricing.grandTotal}</span>
        </div>
      </div>
    `;
  },

  // Apply promo code (e.g. STUDENT10)
  applyPromoCode() {
    const code = this.promoInput?.value.trim().toUpperCase();
    const validCodes = {
      STUDENT10: { code: "STUDENT10", discountPercent: 0.1, desc: "10% Student Discount" },
      WANDER10: { code: "WANDER10", discountPercent: 0.1, desc: "10% Travel Discount" }
    };

    if (validCodes[code]) {
      this.appliedPromo = validCodes[code];
      if (this.promoMessageEl) {
        this.promoMessageEl.textContent = `✓ ${this.appliedPromo.desc} Applied!`;
        this.promoMessageEl.className = "promo-msg text-success";
      }
      this.renderBookingSummary();
      App.showToast(`Promo code '${code}' applied!`, "success");
    } else {
      if (this.promoMessageEl) {
        this.promoMessageEl.textContent = "Invalid code. Use 'STUDENT10' for 10% off.";
        this.promoMessageEl.className = "promo-msg text-danger";
      }
    }
  },

  // Validate form and save booking
  handleBookingSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    const currentUser = StorageService.getCurrentUser();
    if (!currentUser) {
      this.closeBookingModal();
      this.pendingBookingItem = this.currentBookingItem;
      AuthModule.openModal("login", "Please sign in or create an account to complete your booking.");
      App.showToast("Please sign in to complete your booking.", "warning");
      return;
    }

    const emailInput = document.getElementById("primary-contact-email");
    const phoneInput = document.getElementById("primary-contact-phone");
    const emailErr = document.getElementById("primary-contact-email-err");
    const phoneErr = document.getElementById("primary-contact-phone-err");

    if (emailErr) emailErr.textContent = "";
    if (phoneErr) phoneErr.textContent = "";

    const email = emailInput?.value.trim() || currentUser.email || "";
    const phone = phoneInput?.value.trim() || "";

    let isValid = true;

    if (!email || !email.includes("@") || !email.includes(".")) {
      if (emailErr) emailErr.textContent = "Please enter a valid email address";
      isValid = false;
    }

    if (!phone || phone.length < 6) {
      if (phoneErr) phoneErr.textContent = "Please enter a valid phone number";
      isValid = false;
    }

    // Collect passengers
    const paxCount = this.currentBookingItem.passengersCount || 1;
    const passengersList = [];

    for (let i = 1; i <= paxCount; i++) {
      const name = document.getElementById(`pax-name-${i}`)?.value.trim() || "";
      const age = parseInt(document.getElementById(`pax-age-${i}`)?.value || "0", 10);
      const gender = document.getElementById(`pax-gender-${i}`)?.value || "Other";

      if (!name) isValid = false;
      passengersList.push({ name: name || `Traveler ${i}`, age, gender });
    }

    if (!isValid) return;

    // Generate unique reference
    const prefixMap = { flight: "FL", hotel: "HT", bus: "BS", package: "PK" };
    const prefix = prefixMap[this.currentBookingItem.type] || "BK";
    const referenceId = DateUtils.generateBookingReference(prefix);

    const bookingRecord = {
      id: "BK-" + Date.now(),
      referenceId,
      status: "Confirmed",
      bookedAt: new Date().toISOString(),
      userEmail: currentUser.email,
      item: { ...this.currentBookingItem },
      primaryContact: {
        name: passengersList[0]?.name || currentUser.fullName || "Customer",
        email,
        phone
      },
      passengers: passengersList,
      pricing: { ...this.currentBookingItem.pricing }
    };

    StorageService.saveBooking(bookingRecord);
    this.updateBookingsBadge();
    this.closeBookingModal();

    App.showToast(`Booking Confirmed! Ref: ${referenceId}`, "success");
    this.viewTicket(bookingRecord.id);
  },

  // Update badge counter in navbar
  updateBookingsBadge() {
    const badge = document.getElementById("nav-bookings-count");
    if (!badge) return;

    const currentUser = StorageService.getCurrentUser();
    if (!currentUser) {
      badge.textContent = "0";
      return;
    }

    const bookings = StorageService.getBookings();
    const activeCount = bookings.filter(
      (b) => (!b.userEmail || b.userEmail.toLowerCase() === currentUser.email.toLowerCase()) && b.status === "Confirmed"
    ).length;
    badge.textContent = activeCount;
  },

  // Open "My Bookings" modal
  openMyBookings() {
    const currentUser = StorageService.getCurrentUser();
    if (!currentUser) {
      this.pendingAction = "my-bookings";
      AuthModule.openModal("login", "Please sign in or create an account to view your bookings.");
      App.showToast("Please sign in to view your bookings.", "info");
      return;
    }

    this.renderMyBookingsList("all");
    this.myBookingsModal?.classList.add("active");
    document.body.style.overflow = "hidden";
  },

  closeMyBookings() {
    this.myBookingsModal?.classList.remove("active");
    document.body.style.overflow = "";
  },

  renderMyBookingsList(filter = "all") {
    if (!this.myBookingsList) return;

    let bookings = StorageService.getBookings();
    const currentUser = StorageService.getCurrentUser();
    if (currentUser) {
      bookings = bookings.filter((b) => !b.userEmail || b.userEmail.toLowerCase() === currentUser.email.toLowerCase());
    }

    if (filter !== "all") {
      bookings = bookings.filter((b) => b.item && b.item.type === filter);
    }

    if (bookings.length === 0) {
      this.myBookingsList.innerHTML = `
        <div class="empty-bookings-state">
          <div class="empty-icon">🧳</div>
          <h3>No Bookings Found</h3>
          <p>You have no active reservations in this category.</p>
        </div>
      `;
      return;
    }

    this.myBookingsList.innerHTML = bookings
      .map((b) => {
        const isCancelled = b.status === "Cancelled";
        return `
        <article class="booking-history-card ${isCancelled ? "cancelled" : ""}">
          <div class="bcard-header">
            <div>
              <span class="badge-type badge-${b.item.type}">${b.item.type.toUpperCase()}</span>
              <strong>${b.referenceId}</strong>
            </div>
            <span class="bcard-status status-${b.status.toLowerCase()}">${b.status}</span>
          </div>

          <div class="bcard-body">
            <h4 class="bcard-title">${b.item.title}</h4>
            <p class="bcard-subtitle">${b.item.subtitle || ""}</p>
            <div class="bcard-meta">
              <span>📅 ${DateUtils.formatFriendlyDate(b.item.departureDate)}</span>
              <span>👥 ${b.passengers.length} Travelers</span>
              <span>💵 ₹${b.pricing.grandTotal}</span>
            </div>
          </div>

          <div class="bcard-actions">
            <button class="btn btn-sm btn-outline btn-view-ticket" data-id="${b.id}">
               View Ticket
            </button>
            ${!isCancelled
            ? `
             <button class="btn btn-sm btn-outline-primary btn-edit-booking" data-id="${b.id}">
                     Edit / Reschedule
                  </button>
            
            <button class="btn btn-sm btn-danger-outline btn-cancel-booking" data-id="${b.id}">Cancel Booking</button>`
            : `<span class="cancelled-note">Cancelled</span>`
          }
          </div>
        </article>
      `;
      })
      .join("");
  },

  handleCancelBooking(bookingId) {
    const currentUser = StorageService.getCurrentUser();
    if (!currentUser) {
      AuthModule.openModal("login", "Please sign in to manage your bookings.");
      App.showToast("Please sign in to manage your bookings.", "warning");
      return;
    }

    if (confirm("Are you sure you want to cancel this booking?")) {
      StorageService.cancelBooking(bookingId);
      this.updateBookingsBadge();
      this.renderMyBookingsList("all");
      App.showToast("Booking cancelled successfully.", "info");
    }
  },

  // Display e-ticket modal
  viewTicket(bookingId) {
    const currentUser = StorageService.getCurrentUser();
    if (!currentUser) {
      AuthModule.openModal("login", "Please sign in to view your ticket.");
      App.showToast("Please sign in to view your ticket.", "info");
      return;
    }

    const booking = StorageService.getBookings().find((b) => b.id === bookingId || b.referenceId === bookingId);
    if (!booking || !this.ticketModal || !this.ticketContent) return;

    const { item, pricing, passengers, primaryContact } = booking;

    const titleMap = {
      flight: "✈️ GoTravel Flight E-Ticket",
      hotel: "🏨 GoTravel Hotel Reservation Voucher",
      bus: "🚌 GoTravel Intercity Bus Ticket",
      package: "🌴 GoTravel Holiday Package Voucher"
    };
    const ticketTitle = titleMap[item.type] || "✈️ GoTravel Travel E-Ticket";

    let tripSpecificRows = "";
    if (item.type === "hotel") {
      tripSpecificRows = `
        <p><strong>Property:</strong> ${item.title}</p>
        <p><strong>Destination:</strong> ${item.subtitle || "N/A"}</p>
        <p><strong>Check-in:</strong> ${DateUtils.formatFriendlyDate(item.departureDate)}</p>
        <p><strong>Check-out:</strong> ${DateUtils.formatFriendlyDate(item.returnDate)}</p>
        <p><strong>Rooms:</strong> ${item.totalUnits || 1} Room(s) (${item.passengersCount} Guests)</p>
      `;
    } else if (item.type === "bus") {
      tripSpecificRows = `
        <p><strong>Operator:</strong> ${item.title}</p>
        <p><strong>Route:</strong> ${item.subtitle || "N/A"}</p>
        <p><strong>Travel Date:</strong> ${DateUtils.formatFriendlyDate(item.departureDate)}</p>
        <p><strong>Seats:</strong> ${item.totalUnits || 1} Reserved Seat(s)</p>
      `;
    } else {
      tripSpecificRows = `
        <p><strong>Item:</strong> ${item.title}</p>
        <p><strong>Route / Details:</strong> ${item.subtitle || "N/A"}</p>
        <p><strong>Date:</strong> ${DateUtils.formatFriendlyDate(item.departureDate)}</p>
        <p><strong>Travelers:</strong> ${item.passengersCount} Traveler(s)</p>
      `;
    }

    this.ticketContent.innerHTML = `
      <div class="ticket-header-band">
        <div class="ticket-brand">
          <h2>${ticketTitle}</h2>
          <span class="ticket-status-pill status-${booking.status.toLowerCase()}">${booking.status}</span>
        </div>
        <div class="ticket-ref-box">
          <span class="ticket-ref-label">Reference</span>
          <span class="ticket-ref-number">${booking.referenceId}</span>
        </div>
      </div>

      <div class="ticket-main-grid">
        <div class="ticket-col">
          <h4 class="ticket-section-title">Trip Details</h4>
          ${tripSpecificRows}
        </div>

        <div class="ticket-col">
          <h4 class="ticket-section-title">Primary Contact</h4>
          <p><strong>Name:</strong> ${primaryContact.name}</p>
          <p><strong>Email:</strong> ${primaryContact.email}</p>
          <p><strong>Phone:</strong> ${primaryContact.phone}</p>
        </div>
      </div>

      <div class="ticket-passengers-section">
        <h4 class="ticket-section-title">${item.type === "hotel" ? "Guests" : "Travelers"}</h4>
        <table class="ticket-pax-table">
          <thead>
            <tr><th>#</th><th>Name</th><th>Age</th><th>Gender</th></tr>
          </thead>
          <tbody>
            ${passengers.map((p, i) => `<tr><td>${i + 1}</td><td>${p.name}</td><td>${p.age}</td><td>${p.gender}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>

      <div class="ticket-payment-section">
        <h4 class="ticket-section-title">Payment Breakdown</h4>
        <div class="ticket-price-grid">
          <div>Base Fare: <strong>₹${pricing.baseFare}</strong></div>
          <div>Taxes & Fees: <strong>₹${pricing.taxesAndFees}</strong></div>
          <div>Discount: <strong>-₹${pricing.discount || 0}</strong></div>
            ${pricing.rescheduleFee ? `<div style="color: #b45309; font-weight: 700;">Reschedule Fee: <strong>+₹${pricing.rescheduleFee}</strong></div>` : ""}
          <div class="ticket-total">Grand Total: <strong>₹${pricing.grandTotal}</strong></div>
        </div>
      </div>
    `;

    this.ticketModal.classList.add("active");
    document.body.style.overflow = "hidden";
  },

  closeTicketModal() {
    this.ticketModal?.classList.remove("active");
    document.body.style.overflow = "";
  },



  // Calculate minimal rescheduling fee based on travel category
  calculateRescheduleFee(item) {
    if (!item) return 500;

    switch (item.type) {
      case "flight":
        return 500 * (Number(item.passengersCount) || 1);
      case "hotel":
        return 400 * (Number(item.totalUnits) || 1);
      case "bus":
        return 200 * (Number(item.passengersCount) || 1);
      case "package":
        return 800;
      default:
        return 500;
    }
  },

  openEditModal(bookingId) {
    const currentUser = StorageService.getCurrentUser();
    if (!currentUser) {
      AuthModule.openModal("login", "Please sign in to edit or reschedule your reservation.");
      App.showToast("Please sign in to edit your booking.", "warning");
      return;
    }

    const booking = StorageService.getBookings().find((b) => b.id === bookingId || b.referenceId === bookingId);
    if (!booking || !this.editModal) return;

    this.editingBooking = booking;

    const refBadge = document.getElementById("edit-modal-ref-badge");
    if (refBadge) refBadge.textContent = booking.referenceId;
    const itemTitle = document.getElementById("edit-modal-item-title");
    if (itemTitle) itemTitle.textContent = `${booking.item.title} (${booking.item.type.toUpperCase()})`;

    const nameInput = document.getElementById("edit-contact-name");
    const emailInput = document.getElementById("edit-contact-email");
    const phoneInput = document.getElementById("edit-contact-phone");

    if (nameInput) nameInput.value = booking.primaryContact?.name || "";
    if (emailInput) emailInput.value = booking.primaryContact?.email || currentUser.email;
    if (phoneInput) phoneInput.value = booking.primaryContact?.phone || "";

    if (this.editPaxContainer) {
      this.editPaxContainer.innerHTML = (booking.passengers || []).map((pax, i) => `
        <div class="edit-pax-card">
          <h5>${booking.item.type === "hotel" ? "Guest" : "Traveler"} #${i + 1}</h5>
          <div class="form-grid">
            <div class="form-group col-span-2">
              <label for="edit-pax-name-${i}">Full Name *</label>
              <input type="text" id="edit-pax-name-${i}" class="form-control" value="${pax.name || ""}" required />
            </div>
            <div class="form-group">
              <label for="edit-pax-age-${i}">Age *</label>
              <input type="number" id="edit-pax-age-${i}" class="form-control" min="1" max="120" value="${pax.age || ""}" required />
            </div>
            <div class="form-group">
              <label for="edit-pax-gender-${i}">Gender</label>
              <select id="edit-pax-gender-${i}" class="form-control">
                <option value="Male" ${pax.gender === "Male" ? "selected" : ""}>Male</option>
                <option value="Female" ${pax.gender === "Female" ? "selected" : ""}>Female</option>
                <option value="Other" ${pax.gender === "Other" ? "selected" : ""}>Other</option>
              </select>
            </div>
          </div>
        </div>
      `).join("");
    }

    const origDateDisplay = document.getElementById("edit-orig-date-display");
    if (origDateDisplay) origDateDisplay.textContent = DateUtils.formatFriendlyDate(booking.item.departureDate);

    const todayStr = DateUtils.getTodayString();
    if (this.editDateInput) {
      this.editDateInput.value = booking.item.departureDate || "";
      this.editDateInput.min = todayStr;
    }

    if (this.editHotelDatesGroup) {
      if (booking.item.type === "hotel") {
        this.editHotelDatesGroup.classList.remove("hidden");
        if (this.editReturnDateInput) {
          this.editReturnDateInput.value = booking.item.returnDate || "";
          this.editReturnDateInput.min = todayStr;
        }
      } else {
        this.editHotelDatesGroup.classList.add("hidden");
      }
    }

    this.updateEditFeePreview();

    this.editModal.classList.add("active");
    document.body.style.overflow = "hidden";
  },

  closeEditModal() {
    this.editModal?.classList.remove("active");
    document.body.style.overflow = "";
    this.editingBooking = null;
  },

  updateEditFeePreview() {
    if (!this.editingBooking) return;

    const origDate = this.editingBooking.item.departureDate;
    const newDate = this.editDateInput?.value;
    const origReturnDate = this.editingBooking.item.returnDate;
    const newReturnDate = this.editReturnDateInput?.value;

    const dateChanged = newDate && newDate !== origDate;
    const returnChanged = this.editingBooking.item.type === "hotel" && newReturnDate && newReturnDate !== origReturnDate;
    const isRescheduled = dateChanged || returnChanged;

    const fee = isRescheduled ? this.calculateRescheduleFee(this.editingBooking.item) : 0;

    if (this.editFeeAmountEl) {
      this.editFeeAmountEl.textContent = fee === 0 ? "₹0 (Free)" : `+₹${fee.toLocaleString("en-IN")}`;
      this.editFeeAmountEl.className = fee === 0 ? "fee-badge fee-free" : "fee-badge fee-paid";
    }

    if (this.editFeeNoticeEl) {
      if (fee === 0) {
        this.editFeeNoticeEl.innerHTML = `
          <div class="alert-info-box">
             <strong>Passenger & Contact Details Edit:</strong> 100% Free of charge.
          </div>
        `;
      } else {
        this.editFeeNoticeEl.innerHTML = `
          <div class="alert-warning-box">
             <strong>Travel Date Change:</strong> Rescheduling fee of <strong>₹${fee.toLocaleString("en-IN")}</strong> will be automatically charged to your authenticated wallet.
          </div>
        `;
      }
    }

    const currentUser = StorageService.getCurrentUser();
    if (currentUser && this.editWalletBalanceEl) {
      const wallet = StorageService.getWallet(currentUser.email);
      const hasEnough = wallet.balance >= fee;
      this.editWalletBalanceEl.innerHTML = `
        <div class="wallet-status-row">
          <span>💳 Email Wallet: <strong>${currentUser.email}</strong></span>
          <span>Balance: <strong class="${hasEnough ? "text-success" : "text-danger"}">₹${wallet.balance.toLocaleString("en-IN")}</strong></span>
        </div>
        ${!hasEnough ? `<div class="badge-insufficient">⚠️ Insufficient Balance for Date Change! Please top up your wallet.</div>` : ""}
      `;
    }
  },

  handleEditSubmit(e) {
    e.preventDefault();

    if (!this.editingBooking) return;

    const currentUser = StorageService.getCurrentUser();
    if (!currentUser) {
      AuthModule.openModal("login", "Please sign in to update your reservation.");
      return;
    }

    const contactName = document.getElementById("edit-contact-name")?.value.trim();
    const contactEmail = document.getElementById("edit-contact-email")?.value.trim();
    const contactPhone = document.getElementById("edit-contact-phone")?.value.trim();

    if (!contactName || contactName.length < 2) {
      App.showToast("Please enter a valid contact name.", "error");
      return;
    }
    if (!contactEmail || !contactEmail.includes("@")) {
      App.showToast("Please enter a valid email address.", "error");
      return;
    }
    if (!contactPhone || contactPhone.length < 7) {
      App.showToast("Please enter a valid phone number.", "error");
      return;
    }

    const updatePassengers = [];
    const paxCount = this.editingBooking.passengers?.length || 1;
    for (let i = 0; i < paxCount; i++) {
      const name = document.getElementById(`edit-pax-name-${i}`)?.value.trim();
      const age = Number(document.getElementById(`edit-pax-age-${i}`)?.value);
      const gender = document.getElementById(`edit-pax-gender-${i}`)?.value || "Other";

      if (!name || name.length < 2) {
        App.showToast(`Please enter a valid name for Traveler #${i + 1}`, "error");
        return;
      }
      if (!age || age < 1 || age > 120) {
        App.showToast(`Please enter a valid age for Traveler #${i + 1}`, "error");
        return;
      }

      updatePassengers.push({ name, age, gender });
    }

    // Check rescheduling the date
    const origDate = this.editingBooking.item.departureDate;
    const newDate = this.editDateInput?.value;
    const origReturnDate = this.editingBooking.item.returnDate;
    const newReturnDate = this.editReturnDateInput?.value;

    const dateChanged = newDate && newDate !== origDate;
    const returnChanged = this.editingBooking.item.type === "hotel" && newReturnDate && newReturnDate !== origReturnDate;
    const isRescheduled = dateChanged || returnChanged;

    let fee = 0;
    if (isRescheduled) {
      fee = this.calculateRescheduleFee(this.editingBooking.item);
      const wallet = StorageService.getWallet(currentUser.email);

      if (wallet.balance < fee) {
        App.showToast(`Insufficient wallet balance (₹${wallet.balance}) for rescheduling fee (₹${fee}). Please top up your wallet.`, "error");
        return;
      }

      // Deduct rescheduling fee
      StorageService.updateWallet(
        currentUser.email,
        fee,
        "Debit",
        `Rescheduling Fee for ${this.editingBooking.referenceId} (${origDate} ➔ ${newDate})`
      );
      if (typeof AuthModule !== "undefined") {
        AuthModule.updateWalletBadge();
      }
    }

    // Update booking object
    const updatedItem = { ...this.editingBooking.item };
    if (dateChanged) updatedItem.departureDate = newDate;
    if (returnChanged) updatedItem.returnDate = newReturnDate;

    const updatedPricing = { ...this.editingBooking.pricing };
    if (isRescheduled) {
      updatedPricing.rescheduleFee = (updatedPricing.rescheduleFee || 0) + fee;
      updatedPricing.grandTotal += fee;
    }

    const updatedBooking = StorageService.updateBooking(this.editingBooking.id, {
      primaryContact: {
        name: contactName,
        email: contactEmail,
        phone: contactPhone
      },
      passengers: updatePassengers,
      item: updatedItem,
      pricing: updatedPricing,
      status: isRescheduled ? "Rescheduled" : this.editingBooking.status,
      lastModifiedAt: new Date().toISOString()
    });

    const savedId = this.editingBooking.id;
    this.closeEditModal();
    this.renderMyBookingsList();

    if (isRescheduled) {
      App.showToast(`Trip rescheduled to ${newDate}! Reschedule fee of ₹${fee} charged to your wallet.`, "success");
    } else {
      App.showToast("Passenger details updated successfully (No extra charge)!", "success");
    }

    this.viewTicket(savedId);
  }
};
