console.log('🚀 Ajou Calendar Extension Content Script Loaded!', {
  url: window.location.href,
  timestamp: new Date().toISOString()
});

const scrollTarget = document.querySelector('#main-content-inner') || document.querySelector('div[role="main"]');
console.log(scrollTarget, scrollTarget?.scrollHeight, scrollTarget?.scrollTop);

function scrollUntilTargetText(targetText, maxScrolls = 20) {
  return new Promise((resolve) => {
    let scrollCount = 0;

    const interval = setInterval(() => {
      const found = Array.from(document.querySelectorAll('*'))
        .some(el => el.textContent.includes(targetText));

      if (found) {
        console.log(`🛑 Found target text: "${targetText}". Stopping scroll.`);
        clearInterval(interval);
        resolve();
      } else if (scrollCount >= maxScrolls) {
        console.log(`⚠️ Max scroll attempts reached (${maxScrolls}). Stopping scroll.`);
        clearInterval(interval);
        resolve();
      } else {
        window.scrollBy(0, 300);
        scrollCount++;
        console.log(`🔄 Scrolling attempt ${scrollCount}...`);
      }
    }, 1000); // 1초 간격으로 스크롤
  });
}

function extractCourseLinks() {
  console.log('🔍 Extracting course links from Blackboard Ultra...');
  const courseTitleElements = document.querySelectorAll('.course-title');
  console.log(`Found ${courseTitleElements.length} course title elements`);

  const courseLinks = [];

  courseTitleElements.forEach((titleEl, index) => {
    const courseTitle = titleEl.textContent.trim();
    if (!courseTitle) return;

    let courseId = null;
    if (titleEl.id?.startsWith('course-link-')) {
      courseId = titleEl.id.replace('course-link-', '');
    }

    if (!courseId) {
      let parent = titleEl.parentElement;
      let depth = 0;
      while (parent && depth < 5) {
        if (parent.id?.includes('course-list-course-')) {
          courseId = parent.id.replace('course-list-course-', '');
          break;
        }
        parent = parent.parentElement;
        depth++;
      }
    }

    if (courseId) {
      const courseUrl = `https://eclass2.ajou.ac.kr/ultra/courses/${courseId}/outline`;
      courseLinks.push({ title: courseTitle, url: courseUrl, id: courseId });
    }
  });

  return courseLinks;
}

function sendCourseLinks(courseLinks) {
  const urls = courseLinks.map(course => course.url);
  console.log('📤 Sending course URLs to background script:', { count: urls.length, urls });

  chrome.runtime.sendMessage({
    type: "COURSE_LINKS",
    payload: urls
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Failed to send message to background:', chrome.runtime.lastError);
    } else {
      console.log('✅ Successfully sent course links to background script');
    }
  });
}

async function initCrawler() {
  console.log('🎯 Initializing course crawler...');

  if (window.location.pathname.includes("/ultra/course")) {
    console.log('📋 Detected course list page');

    await scrollUntilTargetText('2024학년');

    const courseLinks = extractCourseLinks();

    if (courseLinks.length > 0) {
      console.log(`🎉 Extracted ${courseLinks.length} course links.`);
      sendCourseLinks(courseLinks);
    } else {
      console.log('❌ No course links found.');
    }
  } else {
    console.log('ℹ️ Not a course list page:', window.location.pathname);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCrawler);
} else {
  initCrawler();
}

let currentUrl = location.href;
new MutationObserver(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    console.log('🔄 SPA navigation detected. Re-running crawler...');
    setTimeout(initCrawler, 2000);
  }
}).observe(document.body, { childList: true, subtree: true });
