/**
 * app.js - Main Application Orchestrator
 * 
 * Boots the application on DOM ready, handles tab switching across services,
 * mobile navigation, and toast notifications.
 */

const App = {
  activeTab: "flights",

  init() {
    this.bindTabNavigation();
    this.bindMobileNav();

    // Initialize all modules
    AuthModule.init();
    FlightModule.init();
    HotelModule.init();
    BusPackageModule.init();
    BookingModule.init();

    // Lock all date inputs across platforms to today and future dates (no past selection allowed)
    if (typeof DateUtils !== "undefined" && DateUtils.enforceMinToday) {
      document.querySelectorAll('input[type="date"]').forEach((input) => {
        DateUtils.enforceMinToday(input);
      });
    }

    // Open initial tab from URL hash if present (#hotels, #buses, #packages)
    const hash = window.location.hash.replace("#", "");
    if (["flights", "hotels", "buses", "packages"].includes(hash)) {
      this.switchTab(hash);
    }
  },

  // Tab switching (Flights, Hotels, Buses, Holiday Packages)
  bindTabNavigation() {
    // Search tab buttons inside Hero
    document.querySelectorAll(".portal-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.switchTab(btn.dataset.tab));
    });

    // Header nav links
    document.querySelectorAll(".nav-link[data-nav-tab]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const tab = link.dataset.navTab;
        this.switchTab(tab);
        document.getElementById("hero-search-container")?.scrollIntoView({ behavior: "smooth" });
      });
    });

    // Destination showcase cards click
    document.querySelectorAll(".destination-card[data-city]").forEach((card) => {
      card.addEventListener("click", () => {
        const city = card.dataset.city;
        const hotelCitySelect = document.getElementById("hotel-city");
        if (hotelCitySelect) {
          hotelCitySelect.value = city;
          HotelModule.executeSearch();
        }
        this.switchTab("hotels");
        document.getElementById("section-view-hotels")?.scrollIntoView({ behavior: "smooth" });
      });
    });
  },

  // Mobile menu toggle
  bindMobileNav() {
    const toggle = document.getElementById("mobile-nav-toggle");
    const menu = document.getElementById("main-nav-menu");

    if (toggle && menu) {
      toggle.addEventListener("click", () => {
        menu.classList.toggle("active");
        toggle.setAttribute("aria-expanded", menu.classList.contains("active"));
      });

      // Close menu when a link is clicked
      menu.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", () => menu.classList.remove("active"));
      });
    }
  },

  // Switch between tabs
  switchTab(targetTab) {
    if (!targetTab) return;
    this.activeTab = targetTab;

    // 1. Update search hero tabs
    document.querySelectorAll(".portal-tab-btn").forEach((btn) => {
      const isActive = btn.dataset.tab === targetTab;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive);
    });

    // 2. Update search form panels
    document.querySelectorAll(".tab-search-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `tab-panel-${targetTab}`);
    });

    // 3. Update results sections
    document.querySelectorAll(".module-view-section").forEach((sec) => {
      sec.classList.toggle("active", sec.id === `section-view-${targetTab}`);
    });

    // 4. Update navbar active state
    document.querySelectorAll(".nav-link[data-nav-tab]").forEach((link) => {
      link.classList.toggle("active", link.dataset.navTab === targetTab);
    });
  },

  // Universal toast notification
  showToast(message, type = "info", duration = 3000) {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast-banner toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// Start application when DOM is ready
document.addEventListener("DOMContentLoaded", () => App.init());
