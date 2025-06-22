// 🔒 Disable Right-Click
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

// 🔒 Disable F12, Ctrl+U, Ctrl+Shift+I/J/C/S
document.addEventListener('keydown', (e) => {
  // F12
  if (e.key === "F12") {
    e.preventDefault();
  }

  // Ctrl+Shift+I/J/C, Ctrl+U/S
  if ((e.ctrlKey || e.metaKey) && (
      e.key.toLowerCase() === 'u' ||
      e.key.toLowerCase() === 's' ||
      e.key.toLowerCase() === 'i' && e.shiftKey ||
      e.key.toLowerCase() === 'j' && e.shiftKey ||
      e.key.toLowerCase() === 'c' && e.shiftKey)) {
    e.preventDefault();
  }
});

// 🔒 Block "view-source:"
if (window.location.href.startsWith("view-source:")) {
  window.close();
}

// 🔒 Prevent Back/Forward navigation
history.pushState(null, "", location.href);
window.addEventListener("popstate", function () {
  history.pushState(null, "", location.href);
  alert("Back/Forward navigation is disabled!");
});

// 🔒 Warn on reload/close
window.addEventListener("beforeunload", function (e) {
  e.preventDefault();
  e.returnValue = '';
});

// 🕵️ Optional: Detect if DevTools is open (based on window si
