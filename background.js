chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'LOGIN_SUCCESS') {
    chrome.action.setPopup({ popup: 'popup.html' });
  }
  
  if (msg.type === 'SWITCH_TO_CALENDAR') {
    chrome.action.setPopup({ popup: 'popup.html' });
  }
  
  if (msg.type === 'SWITCH_TO_CHAT') {
    chrome.action.setPopup({ popup: 'chatPopup.html' });
  }
});