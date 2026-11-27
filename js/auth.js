/**
 * auth.js - User Authentication (Login, Register & Session)
 * 
 * Handles user login, registration with client validation,
 * and maintains active user session state.
 */

const AuthModule = {
  init() {
    this.modal = document.getElementById("auth-modal");
    this.loginForm = document.getElementById("login-form");
    this.registerForm = document.getElementById("register-form");
    this.loginTabBtn = document.getElementById("tab-login-btn");
    this.registerTabBtn = document.getElementById("tab-register-btn");
    this.navAuthBtn = document.getElementById("nav-auth-btn");
    this.navProfile = document.getElementById("nav-user-profile");
    this.navUserName = document.getElementById("nav-user-name");
    this.navLogoutBtn = document.getElementById("nav-logout-btn");
    this.navUserWallet = document.getElementById("nav-user-wallet");
    this.navWalletAmount = document.getElementById("nav-wallet-amount");
    this.closeBtn = document.getElementById("close-auth-modal");

    // Wallet Modal Elements
    this.walletModal = document.getElementById("wallet-modal");
    this.closeWalletBtn = document.getElementById("close-wallet-modal");
    this.walletEmailEl = document.getElementById("wallet-user-email");
    this.walletBalanceEl = document.getElementById("wallet-balance-display");
    this.walletTxListEl = document.getElementById("wallet-tx-list");

    this.bindEvents();
    this.checkCurrentSession();
  },

  bindEvents() {
    // Open modal
    if (this.navAuthBtn) {
      this.navAuthBtn.addEventListener("click", () => this.openModal("login"));
    }

    // Close modal
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.closeModal());
    }

    // Close when clicking background
    if (this.modal) {
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) this.closeModal();
      });
    }

    // Tab buttons
    if (this.loginTabBtn) {
      this.loginTabBtn.addEventListener("click", () => this.switchTab("login"));
    }
    if (this.registerTabBtn) {
      this.registerTabBtn.addEventListener("click", () => this.switchTab("register"));
    }

    // Form submissions
    if (this.loginForm) {
      this.loginForm.addEventListener("submit", (e) => this.handleLogin(e));
    }
    if (this.registerForm) {
      this.registerForm.addEventListener("submit", (e) => this.handleRegister(e));
    }

    // Logout
    if (this.navLogoutBtn) {
      this.navLogoutBtn.addEventListener("click", () => this.handleLogout());
    }

    // Wallet modal toggle
    if (this.navUserWallet) {
      this.navUserWallet.addEventListener("click", () => this.openWalletModal());
    }

    if (this.closeWalletBtn) {
      this.closeWalletBtn.addEventListener("click", () => this.closeWalletModal());
    }

    if (this.walletModal) {
      this.walletModal.addEventListener("click", (e) => {
        if (e.target === this.walletModal) this.closeWalletModal();
      });
    }

    document.querySelectorAll(".btn-topup-quick").forEach((btn) => {
      btn.addEventListener("click", () => {
        const amt = Number(btn.dataset.amount);
        this.addWalletFunds(amt);
      });
    });


    const customTopupBtn = document.getElementById("btn-custom-topup");
    if (customTopupBtn) {
      customTopupBtn.addEventListener("click", () => {
        const input = document.getElementById("wallet-topup-custom-amount");
        const amt = Number(input?.value);
        if (amt && amt > 0) {
          this.addWalletFunds(amt);
          if (input) input.value = "";
        } else {
          App.showToast("Please enter a valid top-up amount", "warning");
        }
      });
    }
  },


  // Switch between Login and Register tabs
  switchTab(mode) {
    if (mode === "login") {
      this.loginTabBtn?.classList.add("active");
      this.registerTabBtn?.classList.remove("active");
      this.loginForm?.classList.remove("hidden");
      this.registerForm?.classList.add("hidden");
    } else {
      this.registerTabBtn?.classList.add("active");
      this.loginTabBtn?.classList.remove("active");
      this.registerForm?.classList.remove("hidden");
      this.loginForm?.classList.add("hidden");
    }
    this.clearErrors();
  },

  openModal(mode = "login", notice = "") {
    this.switchTab(mode);
    const noticeEl = document.getElementById("auth-notice-banner");
    if (noticeEl) {
      if (notice) {
        noticeEl.innerHTML = `🔒 <span>${notice}</span>`;
        noticeEl.classList.remove("hidden");
      } else {
        noticeEl.textContent = "";
        noticeEl.classList.add("hidden");
      }
    }
    this.modal?.classList.add("active");
    document.body.style.overflow = "hidden";
  },

  closeModal() {
    this.modal?.classList.remove("active");
    document.body.style.overflow = "";
    this.clearErrors();
    const noticeEl = document.getElementById("auth-notice-banner");
    if (noticeEl) {
      noticeEl.textContent = "";
      noticeEl.classList.add("hidden");
    }
  },

  clearErrors() {
    document.querySelectorAll(".form-error-msg").forEach((el) => {
      el.textContent = "";
      el.classList.add("hidden");
    });
  },

  showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = message;
      el.classList.remove("hidden");
    }
  },

  // Check if a user is currently logged in
  checkCurrentSession() {
    const user = StorageService.getSession(STORAGE_KEYS.CURRENT_USER);
    if (user && this.navProfile && this.navAuthBtn) {
      if (this.navUserName) this.navUserName.textContent = user.fullName.split(" ")[0];
      this.navProfile.classList.remove("hidden");
      this.navAuthBtn.classList.add("hidden");
      if (this.navUserWallet) {
        this.navUserWallet.classList.remove("hidden");
        this.updateWalletBadge();
      }
    } else if (this.navProfile && this.navAuthBtn) {
      this.navProfile.classList.add("hidden");
      this.navAuthBtn.classList.remove("hidden");
      if (this.navUserWallet) {
        this.navUserWallet.classList.add("hidden");
      }
    }
  },

  updateWalletBadge() {
    const user = StorageService.getCurrentUser();
    if (!user || !this.navWalletAmount) return;

    const wallet = StorageService.getWallet(user.email);
    this.navWalletAmount.textContent = `₹${wallet.balance.toLocaleString("en-IN")}`;
  },

  openWalletModal() {
    const user = StorageService.getCurrentUser();
    if (!user) {
      this.openModal("login", "Please sign in to view your travel wallet.");
      return;
    }

    const wallet = StorageService.getWallet(user.email);

    if (this.walletEmailEl) this.walletEmailEl.textContent = user.email;
    if (this.walletBalanceEl) this.walletBalanceEl.textContent = `₹${wallet.balance.toLocaleString("en-IN")}`;

    if (this.walletTxListEl) {
      if (!wallet.transactions || wallet.transactions.length === 0) {
        this.walletTxListEl.innerHTML = `<p class="text-muted">No transactions recorded yet.</p>`;
      } else {
        this.walletTxListEl.innerHTML = wallet.transactions
          .slice(0, 10)
          .map((tx) => {
            const isCredit = tx.type === "Credit";
            const dateStr = new Date(tx.date).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            });
            return `
              <div class="wallet-tx-item">
                <div class="tx-left">
                  <span class="tx-badge tx-${isCredit ? "credit" : "debit"}">${isCredit ? "+" : "-"}</span>
                  <div>
                    <div class="tx-desc">${tx.description}</div>
                    <div class="tx-date">${dateStr}</div>
                  </div>
                </div>
                <div class="tx-amount tx-${isCredit ? "credit" : "debit"}">
                  ${isCredit ? "+" : "-"}₹${tx.amount.toLocaleString("en-IN")}
                </div>
              </div>
            `;
          })
          .join("");
      }
    }

    this.walletModal?.classList.add("active");
    document.body.style.overflow = "hidden";
  },

  closeWalletModal() {
    this.walletModal?.classList.remove("active");
    document.body.style.overflow = "";
  },

  // Add funds to wallet
  addWalletFunds(amount) {
    const user = StorageService.getCurrentUser();
    if (!user) return;

    StorageService.updateWallet(user.email, amount, "Credit", "User Top-up Credit");
    this.updateWalletBadge();
    this.openWalletModal(); // Refresh modal view
    App.showToast(`₹${amount.toLocaleString("en-IN")} added to your wallet!`, "success");
  },
  // Handle Login form
  handleLogin(e) {
    e.preventDefault();
    this.clearErrors();

    const email = document.getElementById("login-email")?.value.trim().toLowerCase();
    const password = document.getElementById("login-password")?.value;

    const users = StorageService.getRegisteredUsers();
    const user = users.find((u) => u.email.toLowerCase() === email && u.password === password);

    if (user) {
      StorageService.setSession(STORAGE_KEYS.CURRENT_USER, user);
      this.checkCurrentSession();
      this.closeModal();
      App.showToast(`Welcome back, ${user.fullName}!`, "success");

      // Check if there was a pending booking item or action
      if (typeof BookingModule !== "undefined") {
        BookingModule.updateBookingsBadge();
        if (BookingModule.pendingBookingItem) {
          const pendingItem = BookingModule.pendingBookingItem;
          BookingModule.pendingBookingItem = null;
          BookingModule.openBookingFlow(pendingItem);
        } else if (BookingModule.pendingAction === "my-bookings") {
          BookingModule.pendingAction = null;
          BookingModule.openMyBookings();
        }
      }
    } else {
      this.showError("login-password-err", "Invalid email or password.");
    }
  },

  // Handle Register form
  handleRegister(e) {
    e.preventDefault();
    this.clearErrors();

    const name = document.getElementById("reg-name")?.value.trim();
    const email = document.getElementById("reg-email")?.value.trim().toLowerCase();
    const password = document.getElementById("reg-password")?.value;
    const confirmPassword = document.getElementById("reg-confirm-password")?.value;

    let hasError = false;

    if (!name || name.length < 2) {
      this.showError("reg-name-err", "Please enter your full name (at least 2 letters).");
      hasError = true;
    }

    if (!email || !email.includes("@") || !email.includes(".")) {
      this.showError("reg-email-err", "Please enter a valid email address.");
      hasError = true;
    }

    if (!password || password.length < 6) {
      this.showError("reg-password-err", "Password must be at least 6 characters.");
      hasError = true;
    }

    if (password !== confirmPassword) {
      this.showError("reg-confirm-password-err", "Passwords do not match.");
      hasError = true;
    }

    if (hasError) return;

    // Check if email already exists
    const users = StorageService.getRegisteredUsers();
    if (users.some((u) => u.email.toLowerCase() === email)) {
      this.showError("reg-email-err", "An account with this email already exists.");
      return;
    }

    const newUser = { fullName: name, email, password };
    StorageService.saveUser(newUser);
    StorageService.setSession(STORAGE_KEYS.CURRENT_USER, newUser);

    this.checkCurrentSession();
    this.closeModal();
    App.showToast(`Account created! Welcome to WanderGo, ${name}!`, "success");

    // Check if there was a pending booking item or action
    if (typeof BookingModule !== "undefined") {
      BookingModule.updateBookingsBadge();
      if (BookingModule.pendingBookingItem) {
        const pendingItem = BookingModule.pendingBookingItem;
        BookingModule.pendingBookingItem = null;
        BookingModule.openBookingFlow(pendingItem);
      } else if (BookingModule.pendingAction === "my-bookings") {
        BookingModule.pendingAction = null;
        BookingModule.openMyBookings();
      }
    }
  },

  // Handle Logout
  handleLogout() {
    sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    this.closeWalletModal();
    this.checkCurrentSession();
    if (typeof BookingModule !== "undefined") {
      BookingModule.pendingBookingItem = null;
      BookingModule.pendingAction = null;
      BookingModule.closeBookingModal();
      BookingModule.closeMyBookings();
      BookingModule.closeTicketModal();
      BookingModule.updateBookingsBadge();
    }
    App.showToast("You have been signed out.", "info");
  }
};
