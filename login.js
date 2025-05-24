document.getElementById('login-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const userId = document.getElementById('userId').value.trim();
  const password = document.getElementById('password').value.trim();

  const statusEl = document.getElementById('login-status');
  statusEl.textContent = '로그인 중...';

  try {
    // const res = await fetch('http://localhost:8000/api/login', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ userId, password })
    // });
    
    // Response 객체를 시뮬레이션
    const res = { ok: true };
    const result = { token: 'fake-token' };

    if (res.ok) {
      statusEl.style.color = 'green';
      statusEl.textContent = '로그인 성공!';

      window.location.href = 'popup.html';
      // const token = result.token;

      // ✅ 토큰 저장
      chrome.storage.local.set({ authToken: token }, () => {
        console.log('🔐 토큰 저장됨:', token);
        window.location.href = 'popup.html';
        // 팝업 창 변경
        // chrome.runtime.sendMessage({ type: 'LOGIN_SUCCESS' });
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