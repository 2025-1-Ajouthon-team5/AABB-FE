console.log('🚀 Ajou Calendar Extension Content Script Loaded!', {
  url: window.location.href,
  timestamp: new Date().toISOString()
});

function extractCourseLinks() {
  console.log('🔍 Extracting course links from Blackboard Ultra...');
  
  // 코스 타이틀 요소들 찾기
  const courseTitleElements = document.querySelectorAll('.course-title');
  console.log(`Found ${courseTitleElements.length} course title elements`);
  
  const courseLinks = [];
  
  courseTitleElements.forEach((titleEl, index) => {
    const courseTitle = titleEl.textContent.trim();
    
    // 빈 코스 제목은 건너뛰기
    if (!courseTitle) {
      console.log(`Skipping empty course ${index + 1}`);
      return;
    }
    
    // 코스 ID 추출
    let courseId = null;
    
    // 방법 1: 요소 ID에서 추출 (course-link-_102664_1 → _102664_1)
    if (titleEl.id && titleEl.id.startsWith('course-link-')) {
      courseId = titleEl.id.replace('course-link-', '');
      console.log(`✅ Course ${index + 1}: "${courseTitle}" → ID: ${courseId}`);
    }
    
    // 방법 2: 부모 요소 ID에서 추출 (course-list-course-_102664_1 → _102664_1)
    if (!courseId) {
      let parent = titleEl.parentElement;
      let depth = 0;
      while (parent && depth < 5) {
        if (parent.id && parent.id.includes('course-list-course-')) {
          courseId = parent.id.replace('course-list-course-', '');
          console.log(`✅ Course ${index + 1}: "${courseTitle}" → ID from parent: ${courseId}`);
          break;
        }
        parent = parent.parentElement;
        depth++;
      }
    }
    
    // 코스 URL 생성
    if (courseId) {
      const courseUrl = `https://eclass2.ajou.ac.kr/ultra/courses/${courseId}/outline`;
      courseLinks.push({
        title: courseTitle,
        url: courseUrl,
        id: courseId
      });
      console.log(`📚 Added course: ${courseTitle} → ${courseUrl}`);
    } else {
      console.log(`❌ Could not extract course ID for: ${courseTitle}`);
    }
  });
  
  return courseLinks;
}

function sendCourseLinks(courseLinks) {
  const urls = courseLinks.map(course => course.url);
  
  console.log('📤 Sending course URLs to background script:', {
    count: urls.length,
    urls: urls
  });
  
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

function initCrawler() {
  console.log('🎯 Initializing course crawler...');
  
  // 현재 페이지가 코스 목록 페이지인지 확인
  if (window.location.pathname.includes("/ultra/course")) {
    console.log('📋 Detected course list page');
    
    // DOM이 완전히 로드될 때까지 대기
    setTimeout(() => {
      console.log('⏳ Starting course extraction...');
      
      const courseLinks = extractCourseLinks();
      
      if (courseLinks.length > 0) {
        console.log(`🎉 Successfully extracted ${courseLinks.length} course links!`);
        sendCourseLinks(courseLinks);
        
        // 추가 정보 로깅
        console.table(courseLinks.map(course => ({
          Title: course.title,
          ID: course.id,
          URL: course.url
        })));
      } else {
        console.log('❌ No course links found. Page might still be loading...');
        
        // 5초 후 재시도
        setTimeout(() => {
          console.log('🔄 Retrying course extraction...');
          const retryLinks = extractCourseLinks();
          if (retryLinks.length > 0) {
            sendCourseLinks(retryLinks);
          }
        }, 5000);
      }
    }, 3000); // 3초 대기
    
  } else {
    console.log('ℹ️ Not a course list page, current path:', window.location.pathname);
  }
}

// DOM 준비 상태 확인 후 실행
if (document.readyState === 'loading') {
  console.log('⏳ DOM is still loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', initCrawler);
} else {
  console.log('✅ DOM is ready, starting immediately');
  initCrawler();
}

// SPA 네비게이션 감지 (Blackboard Ultra는 SPA이므로)
let currentUrl = location.href;
new MutationObserver(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    console.log('🔄 SPA navigation detected, new URL:', currentUrl);
    
    // 페이지 변경 후 2초 대기하고 다시 크롤링 시도
    setTimeout(initCrawler, 2000);
  }
}).observe(document.body, { 
  childList: true, 
  subtree: true 
});

console.log('🔧 Content script setup complete!');