chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "COURSE_LINKS") {
    crawlAllCourses(msg.payload);  // courseLinks 배열 순회
  }

  if (msg.type === "COURSE_DATA") {
    //log
    console.log(JSON.stringify(msg.payload, null, 2));

    fetch("https://your-server.com/api/blackboard/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg.payload)
    });
  }
});

async function crawlAllCourses(courseUrls) {
  for (const url of courseUrls) {
    const tab = await new Promise(resolve =>
      chrome.tabs.create({ url, active: false }, resolve)
    );

    // 탭 로드 기다리기
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 탭에서 데이터 크롤링 스크립트 실행
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const notices = [...document.querySelectorAll('.notice-item')].map(n => ({
          title: n.querySelector('.title')?.innerText || "",
          content: n.querySelector('.content')?.innerText || ""
        }));

        const assignments = [...document.querySelectorAll('.assignment-item')].map(a => ({
          title: a.querySelector('.title')?.innerText || "",
          content: ""
        }));

        const lectureNotes = [...document.querySelectorAll('.lecture-note-item')].map(l => ({
          title: l.querySelector('.title')?.innerText || "",
          content: ""
        }));

        const courseId = location.pathname.match(/courses\/([^/]+)/)?.[1] || "unknown";
        const courseName = document.title;

        chrome.runtime.sendMessage({
          type: "COURSE_DATA",
          payload: { courseId, courseName, notices, assignments, lectureNotes }
        });
      }
    });

    chrome.tabs.remove(tab.id); // 탭 닫기
    await new Promise(resolve => setTimeout(resolve, 1000)); // 딜레이
  }
}
