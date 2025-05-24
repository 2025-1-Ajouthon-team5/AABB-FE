document.getElementById('login-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const userId = document.getElementById('userId').value.trim();
  const password = document.getElementById('password').value.trim();

  const statusEl = document.getElementById('login-status');
  statusEl.textContent = '로그인 중...';

  try {
    const res = await fetch('https://your-backend.com/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password })
    });

    const result = true;//await res.json();

    if (res.ok) {
      statusEl.style.color = 'green';
      statusEl.textContent = '로그인 성공!';

      // 팝업 창 변경
      setTimeout(() => {
        window.location.href = 'popup.html';
      }, 500); // 0.5초 후 캘린더 화면으로 이동
    } else {
      statusEl.style.color = 'red';
      statusEl.textContent = result.message || '로그인 실패';
    }
  } catch (err) {
    statusEl.style.color = 'red';
    statusEl.textContent = '서버 연결 오류';
  }
});