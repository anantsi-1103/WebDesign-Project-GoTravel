/**
 * storage.js - Simple Local & Session Storage Manager
 * 
 * Manages saving and reading bookings and user accounts using browser storage.
 */

const STORAGE_KEYS = {
  BOOKINGS: "gotravel_bookings",
  USERS: "gotravel_users",
  CURRENT_USER: "gotravel_active_user",
  WALLETS : "gotravel_wallets"
};

const StorageService = {
  // Read an item from localStorage
  get(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },

  // Save an item to localStorage
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("Storage save failed:", e);
    }
  },

  // Read session data (active login)
  getSession(key, defaultValue = null) {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },

  getCurrentUser() {
    return this.getSession(STORAGE_KEYS.CURRENT_USER);
  },

  // Save session data
  setSession(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("Session save failed:", e);
    }
  },

  // Get all confirmed bookings
  getBookings() {
    return this.get(STORAGE_KEYS.BOOKINGS, []);
  },

  // Save a new booking
  saveBooking(booking) {
    const list = this.getBookings();
    list.unshift(booking);
    this.set(STORAGE_KEYS.BOOKINGS, list);
    return booking;
  },

  // Cancel an existing booking
  cancelBooking(bookingId) {
    const list = this.getBookings().map((item) => {
      if (item.id === bookingId || item.referenceId === bookingId) {
        return { ...item, status: "Cancelled" };
      }
      return item;
    });
    this.set(STORAGE_KEYS.BOOKINGS, list);
    return true;
  },

  updateBooking(bookingId, updateFields){
    const list = this.getBookings()
    let updateRecord = null
    const updatedList = list.map((item)=>{
      if(item.id === bookingId || item.referenceId === bookingId){
        updateRecord = {...item, ...updateFields};
        return updateRecord
      }
      return item
    })

    this.set(STORAGE_KEYS.BOOKINGS, updatedList)
    return updateRecord
  },

  getWallets() {
    return this.get(STORAGE_KEYS.WALLETS, {});
  },

  getWallet(email) {
    if (!email) return { email: "", balance: 0, transactions: [] };
    const wallets = this.getWallets();
    const key = email.toLowerCase().trim();

    if (!wallets[key]) {
      wallets[key] = {
        email: key,
        balance: 5000,
        transactions: [
          {
            id: "TX-INIT-" + Date.now(),
            type: "Credit",
            amount: 5000,
            description: "Welcome Promotional Travel Credit",
            date: new Date().toISOString()
          }
        ]
      };
      this.set(STORAGE_KEYS.WALLETS, wallets);
    }
    return wallets[key];
  },

  updateWallet(email, amount, type = "Debit", description = "Transaction"){
    if(!email) return null

    const wallets = this.getWallets()
    const key = email.toLowerCase().trim()
    const wallet = this.getWallet(key)


    const numAmt = Math.max(0, Number(amount) || 0)
    if(type === "Debit"){
      wallet.balance = Math.max(0, wallet.balance - numAmt)
    }
    else{
      wallet.balance += numAmt
    }

    wallet.transactions.unshift({
      id: "TX-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      type,
      amount: numAmt,
      description,
      date: new Date().toISOString()
    })

    wallets[key] = wallet;
    this.set(STORAGE_KEYS.WALLETS, wallets)
    return wallet
  },



  // Get registered users with demo user default
  getRegisteredUsers() {
    const defaultUser = {
      fullName: "Alex Rivera",
      email: "alex@example.com",
      password: "Password123"
    };
    return this.get(STORAGE_KEYS.USERS, [defaultUser]);
  },

  // Register a new user
  saveUser(user) {
    const users = this.getRegisteredUsers();
    users.push(user);
    this.set(STORAGE_KEYS.USERS, users);
    return true;
  }
};
