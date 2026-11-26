/**
 * storage.js - Simple Local & Session Storage Manager
 * 
 * Manages saving and reading bookings and user accounts using browser storage.
 */

const STORAGE_KEYS = {
  BOOKINGS: "gotravel_bookings",
  USERS: "gotravel_users",
  CURRENT_USER: "gotravel_active_user"
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
