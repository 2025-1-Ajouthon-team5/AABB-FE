document.getElementById('login-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const username = document.getElementById('userId').value.trim();
  const password = document.getElementById('password').value.trim();

  const statusEl = document.getElementById('login-status');
  statusEl.textContent = '로그인 중...';

  try {
    const res = await fetch('http://172.21.46.69:8000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const result = await res.json();

    if (res.ok) {
      statusEl.style.color = 'green';
      statusEl.textContent = '로그인 성공!';

      const token = result.token;

      // ✅ 토큰 저장
      chrome.storage.local.set({ authToken: token }, () => {
        console.log('🔐 토큰 저장됨:', token);
        window.location.href = 'popup.html';
        // 팝업 창 변경
        chrome.runtime.sendMessage({ type: 'LOGIN_SUCCESS' });
      });
    } else {
      statusEl.style.color = 'red';
      statusEl.textContent = result.message || '로그인 실패';
    }
  } catch (err) {
    statusEl.style.color = 'red';
    statusEl.textContent = '서버 연결 오류';
  }
});
