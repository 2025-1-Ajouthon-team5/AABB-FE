console.log("📦 courseDetailCrawler.js loaded:", window.location.href);

// 크롤링 함수
function extractCourseData() {
  const notices = Array.from(document.querySelectorAll('.announcement, .notice')).map(n => ({
    title: n.querySelector('h3, h2, .title')?.textContent.trim() ?? '',
    content: n.querySelector('p, .content')?.textContent.trim() ?? ''
  }));

  const assignments = Array.from(document.querySelectorAll('.assignment')).map(a => ({
    title: a.querySelector('h3, h2, .title')?.textContent.trim() ?? '',
    content: ''
  }));

  const notes = Array.from(document.querySelectorAll('.content-item, .lecture-note')).map(l => ({
    title: l.querySelector('h3, h2, .title')?.textContent.trim() ?? '',
    content: ''
  }));

  const courseId = window.location.pathname.split('/')[3] ?? 'unknown';
  const courseName = document.title;

  return {
    courseId,
    courseName,
    notices,
    assignments,
    lectureNotes: notes,
    timestamp: new Date().toISOString()
  };
}

// 크롤링 후 메시지 전송
const data = extractCourseData();
console.log(data);
chrome.runtime.sendMessage({
  type: "COURSE_DATA",
  payload: data
}, (res) => {
  if (chrome.runtime.lastError) {
    console.error("❌ 전송 실패:", chrome.runtime.lastError.message);
  } else {
    console.log("✅ COURSE_DATA 전송 성공:", res);
  }
});
