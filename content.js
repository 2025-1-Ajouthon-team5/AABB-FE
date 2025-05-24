console.log('🚀 Ajou Calendar Extension Content Script Loaded!', {
  url: window.location.href,
  timestamp: new Date().toISOString()
});

// Create a log display container in the main page
function createLogDisplay() {
  if (document.getElementById('ajou-crawler-logs')) return;
  
  const logContainer = document.createElement('div');
  logContainer.id = 'ajou-crawler-logs';
  logContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 400px;
    max-height: 500px;
    background: rgba(0, 0, 0, 0.85);
    color: #fff;
    z-index: 10000;
    font-family: monospace;
    padding: 15px;
    border-radius: 8px;
    overflow-y: auto;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  `;
  
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    border-bottom: 1px solid #666;
    padding-bottom: 8px;
  `;
  
  const title = document.createElement('div');
  title.textContent = '📊 Ajou Calendar Crawler Logs';
  title.style.fontWeight = 'bold';
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'background: none; border: none; color: #fff; cursor: pointer;';
  closeBtn.onclick = () => logContainer.style.display = 'none';
  
  const logContent = document.createElement('div');
  logContent.id = 'ajou-crawler-log-content';
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  logContainer.appendChild(header);
  logContainer.appendChild(logContent);
  document.body.appendChild(logContainer);
  
  console.log('📋 Created log display panel');
}

// Add a log message to the display panel
function addLog(message, type = 'info') {
  const logContent = document.getElementById('ajou-crawler-log-content');
  if (!logContent) return;
  
  const log = document.createElement('div');
  log.style.cssText = `
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #444;
  `;
  
  let icon = '📌';
  switch(type) {
    case 'success': icon = '✅'; break;
    case 'error': icon = '❌'; break;
    case 'warning': icon = '⚠️'; break;
    case 'info': icon = 'ℹ️'; break;
    case 'crawl': icon = '🔍'; break;
  }
  
  const time = new Date().toLocaleTimeString();
  log.innerHTML = `<span style="color:#aaa;">[${time}]</span> ${icon} ${message}`;
  
  logContent.appendChild(log);
  logContent.scrollTop = logContent.scrollHeight;
}

async function scrollToLoadMore() {
  addLog('스크롤하여 2025학년 1학기 과목들을 모두 로딩합니다...', 'info');
  
  // 현재 학기 헤더 찾기
  const currentSemesterHeaders = Array.from(document.querySelectorAll('.course-card-term-name h3'))
    .filter(header => header.textContent.includes('2025학년 1학기'));
  
  if (currentSemesterHeaders.length === 0) {
    addLog('2025학년 1학기 헤더를 찾을 수 없습니다.', 'error');
    return false;
  }
  
  const currentSemesterHeader = currentSemesterHeaders[0];
  const currentSemesterTerm = currentSemesterHeader.closest('.course-card-term-name');
  
  addLog(`2025학년 1학기 섹션을 찾았습니다: ${currentSemesterHeader.textContent}`, 'success');
  
  // 다음 학기 헤더 찾기 (있다면)
  let nextSemesterTerm = null;
  let currentElement = currentSemesterTerm.nextElementSibling;
  
  while (currentElement) {
    if (currentElement.classList.contains('course-card-term-name')) {
      nextSemesterTerm = currentElement;
      const nextHeader = currentElement.querySelector('h3');
      addLog(`다음 학기 섹션을 찾았습니다: ${nextHeader ? nextHeader.textContent : '제목 없음'}`, 'info');
      break;
    }
    currentElement = currentElement.nextElementSibling;
  }
  
  // 스크롤하여 모든 과목 로드
  let lastElementCount = 0;
  let sameCountIterations = 0;
  const maxSameCountIterations = 3; // 동일한 요소 수가 3번 연속 나타나면 더 이상 로드되지 않는 것으로 간주
  let scrollCount = 0;
  const maxScrolls = 20;
  
  while (scrollCount < maxScrolls) {
    // 현재 학기의 과목 카드 수 계산
    let courseElements = [];
    let countElement = currentSemesterTerm.nextElementSibling;
    
    while (countElement && (!nextSemesterTerm || countElement !== nextSemesterTerm)) {
      if (countElement.classList.contains('default-group')) {
        const courseCard = countElement.querySelector('.course-title');
        if (courseCard) {
          courseElements.push(courseCard);
        }
      }
      countElement = countElement.nextElementSibling;
    }
    
    const currentElementCount = courseElements.length;
    addLog(`현재 로드된 2025학년 1학기 과목 수: ${currentElementCount}`, 'info');
    
    // 마지막 과목이 화면에 보이는지 확인
    const lastCourseElement = courseElements[courseElements.length - 1];
    if (lastCourseElement) {
      const rect = lastCourseElement.getBoundingClientRect();
      const isLastElementVisible = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
      
      // 마지막 요소가 보이고, 다음 학기 요소가 있으면 로딩 완료로 간주
      if (isLastElementVisible && nextSemesterTerm) {
        addLog('2025학년 1학기의 모든 과목이 로드되었습니다.', 'success');
        break;
      }
    }
    
    // 요소 수가 변하지 않는 경우 확인
    if (currentElementCount === lastElementCount) {
      sameCountIterations++;
      if (sameCountIterations >= maxSameCountIterations) {
        addLog(`과목 수가 ${maxSameCountIterations}회 연속으로 변하지 않아 로딩을 종료합니다.`, 'info');
        break;
      }
    } else {
      sameCountIterations = 0;
      lastElementCount = currentElementCount;
    }
    
    // 스크롤 수행
    scrollCount++;
    
    // 다음 학기 헤더가 있다면, 그 바로 위까지만 스크롤
    if (nextSemesterTerm) {
      const nextTermRect = nextSemesterTerm.getBoundingClientRect();
      // 다음 학기 헤더가 화면에 보이기 시작하면 스크롤 중지
      if (nextTermRect.top <= window.innerHeight) {
        addLog('다음 학기 헤더가 보이기 시작하여 스크롤을 중지합니다.', 'success');
        break;
      }
    }
    
    // 스크롤 다운
    if (lastCourseElement) {
      lastCourseElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
      addLog(`스크롤 ${scrollCount}: 마지막 과목으로 스크롤합니다.`, 'info');
    } else {
      window.scrollBy(0, window.innerHeight * 0.8);
      addLog(`스크롤 ${scrollCount}: 페이지 아래로 스크롤합니다.`, 'info');
    }
    
    // 콘텐츠 로드 대기
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // 최종 과목 수 확인
  let finalCourseCount = 0;
  let finalElement = currentSemesterTerm.nextElementSibling;
  
  while (finalElement && (!nextSemesterTerm || finalElement !== nextSemesterTerm)) {
    if (finalElement.classList.contains('default-group')) {
      const courseCard = finalElement.querySelector('.course-title');
      if (courseCard) {
        finalCourseCount++;
      }
    }
    finalElement = finalElement.nextElementSibling;
  }
  
  addLog(`2025학년 1학기 과목 로딩 완료: 총 ${finalCourseCount}개 과목`, 'success');
  
  // 페이지 맨 위로 스크롤 (옵션)
  window.scrollTo(0, 0);
  
  return finalCourseCount > 0;
}

function extractCourseLinks() {
  console.log('🔍 Extracting course links from Blackboard Ultra...');
  addLog('2025학년 1학기 과목 링크 추출 중...', 'crawl');
  
  // 2025학년 1학기 헤더 찾기
  const semesterHeaders = Array.from(document.querySelectorAll('.course-card-term-name h3'));
  let currentSemesterHeader = null;
  let currentSemesterTerm = null;
  
  for (const header of semesterHeaders) {
    if (header.textContent.includes('2025학년 1학기')) {
      currentSemesterHeader = header;
      currentSemesterTerm = header.closest('.course-card-term-name');
      addLog(`현재 학기 찾음: ${header.textContent}`, 'success');
      break;
    }
  }
  
  if (!currentSemesterTerm) {
    addLog('2025학년 1학기 섹션을 찾을 수 없습니다', 'error');
    return [];
  }
  
  // 다음 학기 헤더 찾기 (있다면)
  let nextSemesterTerm = null;
  let checkElement = currentSemesterTerm.nextElementSibling;
  
  while (checkElement) {
    if (checkElement.classList.contains('course-card-term-name')) {
      nextSemesterTerm = checkElement;
      break;
    }
    checkElement = checkElement.nextElementSibling;
  }
  
  // 현재 학기의 모든 과목 카드 수집
  const courseLinks = [];
  let currentElement = currentSemesterTerm.nextElementSibling;
  
  while (currentElement && (!nextSemesterTerm || currentElement !== nextSemesterTerm)) {
    // 과목 카드 요소 확인
    if (currentElement.classList.contains('default-group')) {
      // 과목 제목 요소 찾기
      const titleEl = currentElement.querySelector('.course-title');
      if (titleEl) {
        const courseTitle = titleEl.textContent.trim();
        
        // 과목 ID 추출
        let courseId = null;
        
        // 방법 1: 요소 ID에서 추출
        if (titleEl.id && titleEl.id.startsWith('course-link-')) {
          courseId = titleEl.id.replace('course-link-', '');
        }
        
        // 방법 2: 코스 카드에서 추출
        if (!courseId || courseId === "") {
          const courseArticle = currentElement.querySelector('article[data-course-id]');
          if (courseArticle && courseArticle.dataset.courseId) {
            courseId = courseArticle.dataset.courseId;
          }
        }
        
        // 방법 3: 아티클 ID에서 추출
        if (!courseId || courseId === "") {
          const courseArticle = currentElement.querySelector('article[id^="course-list-course-"]');
          if (courseArticle && courseArticle.id) {
            courseId = courseArticle.id.replace('course-list-course-', '');
          }
        }
        
        // 과목 URL 생성
        if (courseId && courseId !== "") {
          const courseUrl = `https://eclass2.ajou.ac.kr/ultra/courses/${courseId}/outline`;
          courseLinks.push({
            title: courseTitle,
            url: courseUrl,
            id: courseId,
            semester: '2025학년 1학기'
          });
          
          addLog(`과목 찾음: ${courseTitle} (ID: ${courseId})`, 'success');
        } else {
          addLog(`과목 ID를 추출할 수 없음: ${courseTitle}`, 'warning');
        }
      }
    }
    
    currentElement = currentElement.nextElementSibling;
  }
  
  addLog(`총 ${courseLinks.length}개 과목 추출 완료`, 'success');
  return courseLinks;
}

function sendCourseLinks(courseLinks) {
  if (courseLinks.length === 0) {
    addLog('No courses to crawl', 'warning');
    return;
  }
  
  const urls = courseLinks.map(course => course.url);
  
  addLog(`Sending ${urls.length} courses for crawling`, 'info');
  console.log('📤 Sending course URLs to background script:', urls);
  
  chrome.runtime.sendMessage({
    type: "COURSE_LINKS",
    payload: urls
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Failed to send message to background:', chrome.runtime.lastError);
      addLog('Failed to start crawling process', 'error');
    } else {
      console.log('✅ Successfully sent course links to background script');
      addLog('Crawling process started in background', 'success');
    }
  });
}

// 메인 크롤링 함수
async function startCrawling() {
  console.log('🎯 Starting course crawler...');
  
  // Create log display
  createLogDisplay();
  addLog('크롤링을 시작합니다...', 'info');
  
  // Check if current page is the course list page
  if (window.location.pathname.includes("/ultra/course")) {
    addLog('강의 목록 페이지 확인됨', 'info');
    
    // Scroll to load all courses
    const scrollResult = await scrollToLoadMore();
    
    // Extract course links
    const courseLinks = extractCourseLinks();
    
    if (courseLinks.length > 0) {
      addLog(`${courseLinks.length}개 강의 링크 추출 완료`, 'success');
      sendCourseLinks(courseLinks);
      return { success: true, message: '크롤링이 시작되었습니다.' };
    } else {
      addLog('강의 링크를 찾을 수 없습니다. 다시 시도합니다...', 'warning');
      
      // Retry after 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await scrollToLoadMore();
      const retryLinks = extractCourseLinks();
      if (retryLinks.length > 0) {
        sendCourseLinks(retryLinks);
        return { success: true, message: '재시도 후 크롤링이 시작되었습니다.' };
      } else {
        addLog('재시도 후에도 강의를 찾을 수 없습니다.', 'error');
        return { success: false, message: '강의를 찾을 수 없습니다.' };
      }
    }
  } else {
    addLog('강의 목록 페이지가 아닙니다. 이클래스 메인 페이지에 접속해주세요.', 'error');
    return { success: false, message: '강의 목록 페이지가 아닙니다.' };
  }
}

// Listen for log messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CRAWL_LOG") {
    addLog(message.message, message.logType || 'info');
    sendResponse({success: true});
    return true;
  }
  
  // 팝업에서 크롤링 시작 메시지를 받으면 크롤링 시작
  if (message.type === "START_CRAWLING") {
    console.log('📢 Received START_CRAWLING message from popup');
    
    // 크롤링 시작
    startCrawling().then(result => {
      sendResponse(result);
    }).catch(error => {
      console.error('Crawling error:', error);
      sendResponse({ success: false, message: error.message });
    });
    
    return true; // 비동기 응답을 위해 true 반환
  }
  
  return true;
});

// DOM ready check - 초기에는 자동으로 크롤링을 시작하지 않음
if (document.readyState === 'loading') {
  console.log('⏳ DOM is still loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM is ready, but not starting crawler automatically');
  });
} else {
  console.log('✅ DOM is ready, but not starting crawler automatically');
}

// SPA navigation detection
let currentUrl = location.href;
new MutationObserver(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    console.log('🔄 SPA navigation detected, new URL:', currentUrl);
  }
}).observe(document.body, { childList: true, subtree: true });

console.log('🔧 Content script setup complete!');