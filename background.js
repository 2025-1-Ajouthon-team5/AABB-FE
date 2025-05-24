chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'LOGIN_SUCCESS') {
    chrome.action.setPopup({ popup: 'popup.html' }, () => {
      sendResponse({ success: true });
    });
    return true; // 비동기 응답을 위해 true 반환
  }
  
  if (msg.type === 'SWITCH_TO_CALENDAR') {
    chrome.action.setPopup({ popup: 'popup.html' }, () => {
      sendResponse({ success: true });
    });
    return true; // 비동기 응답을 위해 true 반환
  }
  
  if (msg.type === 'SWITCH_TO_CHAT') {
    chrome.action.setPopup({ popup: 'chatPopup.html' }, () => {
      sendResponse({ success: true });
    });
    return true; // 비동기 응답을 위해 true 반환
  }
});