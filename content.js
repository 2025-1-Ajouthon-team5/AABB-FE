if (window.location.pathname.includes("/ultra/course")) {
  const courseLinks = Array.from(document.querySelectorAll('a.course-link')).map(a => a.href);

  chrome.runtime.sendMessage({ type: "COURSE_LINKS", payload: courseLinks });
}
