/*
 * Helper functions for formatting dates and calculating hotel night stays.
 */

const DateUtils = {
  // Returns today's date in "YYYY-MM-DD" format
  getTodayString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  // Adds days to a "YYYY-MM-DD" date string
  addDays(dateStr, days = 1) {
    if (!dateStr) return this.getTodayString();
    const date = new Date(dateStr + "T00:00:00");
    date.setDate(date.getDate() + days);
    return this.getTodayString(date);
  },

  // Calculates number of nights between check-in and check-out
  calculateNights(checkInStr, checkOutStr) {
    if (!checkInStr || !checkOutStr) return 1;
    const checkIn = new Date(checkInStr + "T00:00:00");
    const checkOut = new Date(checkOutStr + "T00:00:00");
    const nights = Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  },

  // Formats date nicely (e.g., "Fri, Nov 20, 2026")
  formatFriendlyDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  },

  // Alias for backward compatibility
  formatFriendly(dateStr) {
    return this.formatFriendlyDate(dateStr);
  },

  // Generates unique booking reference e.g. "FL-202611-4821"
  generateBookingReference(prefix = "BK") {
    const d = new Date();
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${ym}-${rand}`;
  }
};
