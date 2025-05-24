function observeUntilCourseListLoads() {
  const target = document.body;

  const observer = new MutationObserver(() => {
    const btns = document.querySelectorAll("button[data-course-id]");
    if (btns.length > 0) {
      observer.disconnect();

      const courseLinks = Array.from(btns).map(btn => {
        const id = btn.getAttribute("data-course-id");
        return `https://eclass2.ajou.ac.kr/ultra/courses/${id}/outline`;
      });

      console.log("🎯 자동 수집한 강의 링크 목록 (Observer):", courseLinks);
      chrome.runtime.sendMessage({ type: "COURSE_LINKS", payload: courseLinks });
    }
  });

  observer.observe(target, { childList: true, subtree: true });
}

if (window.location.pathname.includes("/ultra/course")) {
  console.log("🟡 content.js 실행됨");
  observeUntilCourseListLoads();
}
