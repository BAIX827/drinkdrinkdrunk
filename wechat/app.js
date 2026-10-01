const store = require('./shared/store');
App({
  onLaunch() {
    try { store.load(); } catch (error) {
      this.storageError = error.message;
    }
  },
  onHide() { require('./shared/media').pauseAll(); }
});
