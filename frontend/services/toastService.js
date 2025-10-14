class ToastService {
  constructor() {
    this.showToastCallback = null;
  }

  // Set the callback to show toast (called by ToastProvider)
  setShowToast(callback) {
    this.showToastCallback = callback;
  }

  // Show toast notification
  show(message, type = 'info', duration = 3000) {
    if (this.showToastCallback) {
      this.showToastCallback(message, type, duration);
    } else {
      // Fallback to console if toast not initialized
      console.log(`[Toast ${type}]:`, message);
    }
  }

  // Convenience methods
  error(message, duration = 3000) {
    this.show(message, 'error', duration);
  }

  warning(message, duration = 3000) {
    this.show(message, 'warning', duration);
  }

  success(message, duration = 3000) {
    this.show(message, 'success', duration);
  }

  info(message, duration = 3000) {
    this.show(message, 'info', duration);
  }
}

export default new ToastService();
