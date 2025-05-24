chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'LOGIN_SUCCESS') {
    chrome.action.setPopup({ popup: 'popup.html' });
  }
});
