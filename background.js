console.log('🥷 Stealth Crawling Mode Started!');

let isCurrentlyCrawling = false;
let crawlQueue = [];
let collectedData = [];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('📨 Message received:', msg.type);
  
  if (msg.type === "COURSE_LINKS") {
    console.log('🎯 Starting stealth crawling for', msg.payload.length, 'courses');
    
    if (isCurrentlyCrawling) {
      console.log('⏳ Already crawling, adding to queue...');
      crawlQueue = crawlQueue.concat(msg.payload);
    } else {
      startStealthCrawling(msg.payload);
    }
    
    sendResponse({ success: true, message: 'Stealth crawling initiated' });
  }

  if (msg.type === "COURSE_DATA") {
    handleCourseData(msg.payload);
    sendResponse({ success: true });
  }
  
  return true;
});

async function startStealthCrawling(courseUrls) {
  if (isCurrentlyCrawling) return;
  
  isCurrentlyCrawling = true;
  console.log('🥷 Starting stealth crawling sequence...');
  
  // 첫 번째로 숨겨진 윈도우 생성
  const hiddenWindow = await createHiddenWindow();
  console.log('👻 Created hidden window:', hiddenWindow.id);
  
  try {
    for (let i = 0; i < courseUrls.length; i++) {
      const url = courseUrls[i];
      console.log(`\n🔍 Stealth crawling ${i + 1}/${courseUrls.length}: ${url}`);
      
      await crawlCourseInHiddenWindow(hiddenWindow.id, url);
      
      // 과정 간 딜레이 (더 짧게)
      if (i < courseUrls.length - 1) {
        console.log('⏸️ Brief pause...');
        await sleep(2000);
      }
    }
  } finally {
    // 숨겨진 윈도우 정리
    try {
      await chrome.windows.remove(hiddenWindow.id);
      console.log('🗑️ Hidden window cleaned up');
    } catch (e) {
      console.log('ℹ️ Window already closed');
    }
    
    isCurrentlyCrawling = false;
    
    // 큐에 대기 중인 작업이 있으면 처리
    if (crawlQueue.length > 0) {
      const nextBatch = crawlQueue.splice(0);
      setTimeout(() => startStealthCrawling(nextBatch), 1000);
    }
  }
  
  console.log('🎉 Stealth crawling completed!');
  printCollectedSummary();
}

async function createHiddenWindow() {
  return new Promise((resolve, reject) => {
    chrome.windows.create({
      url: 'about:blank',
      type: 'popup',
      width: 1,
      height: 1,
      left: -2000,  // 화면 밖으로
      top: -2000,   // 화면 밖으로
      focused: false
    }, (window) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(window);
      }
    });
  });
}

async function crawlCourseInHiddenWindow(windowId, courseUrl) {
  let tabId = null;
  
  try {
    // 숨겨진 윈도우에서 탭 생성
    const tab = await new Promise((resolve, reject) => {
      chrome.tabs.create({
        windowId: windowId,
        url: courseUrl,
        active: false
      }, (tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(tab);
        }
      });
    });
    
    tabId = tab.id;
    console.log(`👻 Created hidden tab ${tabId}`);
    
    // 탭 로딩 완료 대기 (더 확실한 방법)
    await waitForTabComplete(tabId);
    
    // 추가 안정화 대기
    await sleep(3000);
    
    // 스크립트 실행
    console.log(`🕷️ Executing stealth script on tab ${tabId}`);
    
    await chrome.scripting.executeScript({
      target: { tabId },
      func: stealthCrawlFunction,
      args: [courseUrl]
    });
    
    console.log(`✅ Stealth crawling completed for tab ${tabId}`);
    
  } catch (error) {
    console.error(`❌ Stealth crawling failed for ${courseUrl}:`, error.message);
  } finally {
    // 탭 정리 (더 안전하게)
    if (tabId) {
      try {
        await chrome.tabs.remove(tabId);
        console.log(`🗑️ Hidden tab ${tabId} removed`);
      } catch (e) {
        console.log(`ℹ️ Tab ${tabId} already closed`);
      }
    }
  }
}

async function waitForTabComplete(tabId, maxWait = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    try {
      const tab = await chrome.tabs.get(tabId);
      
      if (!tab) {
        throw new Error('Tab no longer exists');
      }
      
      if (tab.status === 'complete') {
        console.log(`✅ Tab ${tabId} loading complete`);
        return true;
      }
      
      // 로그인 페이지 체크
      if (tab.url && (tab.url.includes('/login') || tab.url.includes('/auth'))) {
        throw new Error('Redirected to login page');
      }
      
      await sleep(500);
      
    } catch (error) {
      console.error(`❌ Tab ${tabId} error:`, error.message);
      throw error;
    }
  }
  
  throw new Error(`Tab ${tabId} loading timeout`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function handleCourseData(courseData) {
  console.log('📚 Stealth data collected:', {
    courseId: courseData.courseId,
    courseName: courseData.courseName,
    notices: courseData.notices?.length || 0,
    assignments: courseData.assignments?.length || 0,
    lectureNotes: courseData.lectureNotes?.length || 0
  });
  
  // 기존 데이터 업데이트 또는 추가
  const existingIndex = collectedData.findIndex(
    course => course.courseId === courseData.courseId
  );
  
  if (existingIndex >= 0) {
    collectedData[existingIndex] = courseData;
  } else {
    collectedData.push(courseData);
  }
  
  console.log('📊 Total courses collected:', collectedData.length);
}

function printCollectedSummary() {
  console.log('\n🎉 === STEALTH CRAWLING SUMMARY ===');
  console.log('📊 Total courses:', collectedData.length);
  
  collectedData.forEach((course, index) => {
    console.log(`${index + 1}. ${course.courseName}`);
    console.log(`   📋 Notices: ${course.notices?.length || 0}`);
    console.log(`   📝 Assignments: ${course.assignments?.length || 0}`);
    console.log(`   📚 Lecture Notes: ${course.lectureNotes?.length || 0}`);
  });
  
  const totalNotices = collectedData.reduce((sum, c) => sum + (c.notices?.length || 0), 0);
  const totalAssignments = collectedData.reduce((sum, c) => sum + (c.assignments?.length || 0), 0);
  
  console.log(`\n📈 Total items collected:`);
  console.log(`   📋 Total notices: ${totalNotices}`);
  console.log(`   📝 Total assignments: ${totalAssignments}`);
  console.log('=================================\n');
}

// 숨김 크롤링 함수 (탭에서 실행)
function stealthCrawlFunction(courseUrl) {
  console.log('🥷 Stealth crawling started on:', location.href);
  
  // 로그인 페이지 체크
  if (location.href.includes('/login') || location.href.includes('/auth')) {
    console.log('🔐 Login required, cannot crawl');
    return;
  }
  
  // 다양한 데이터 선택자
  const selectors = {
    notices: [
      '.content-item[data-content-type="resource/x-bb-announcement"]',
      '.announcement-item',
      '.bb-announcement',
      '.stream-item[data-stream-entry-type="Announcement"]',
      '.activity-item.announcement',
      '[class*="announcement"]'
    ],
    assignments: [
      '.content-item[data-content-type="resource/x-bb-assignment"]', 
      '.assignment-item',
      '.bb-assignment',
      '.stream-item[data-stream-entry-type="Assignment"]',
      '.activity-item.assignment',
      '[class*="assignment"]'
    ],
    content: [
      '.content-item[data-content-type="resource/x-bb-document"]',
      '.content-item[data-content-type="resource/x-bb-folder"]',
      '.content-item',
      '.course-content',
      '.lecture-note'
    ]
  };
  
  function findItems(selectorArray, type) {
    let items = [];
    
    for (const selector of selectorArray) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} ${type} with: ${selector}`);
        
        const extracted = Array.from(elements).map(el => ({
          title: extractText(el, ['.title', '.content-title', 'h1', 'h2', 'h3', 'a']) || '제목 없음',
          content: extractText(el, ['.content', '.description', 'p']) || '내용 없음',
          selector: selector
        }));
        
        items = items.concat(extracted);
        break; // 첫 번째로 성공한 선택자만 사용
      }
    }
    
    return items.filter(item => 
      item.title !== '제목 없음' && 
      item.title.length > 0 &&
      !item.title.includes('undefined')
    );
  }
  
  function extractText(element, selectors) {
    for (const sel of selectors) {
      const el = element.querySelector(sel);
      if (el && el.textContent.trim()) {
        return el.textContent.trim();
      }
    }
    return element.textContent.trim();
  }
  
  // 데이터 수집
  const notices = findItems(selectors.notices, 'notices');
  const assignments = findItems(selectors.assignments, 'assignments');
  const lectureNotes = findItems(selectors.content, 'content');
  
  // 코스 정보
  const courseIdMatch = (courseUrl || location.href).match(/courses\/([^\/\?]+)/);
  const courseId = courseIdMatch ? courseIdMatch[1] : 'unknown';
  const courseName = document.title || '코스명 없음';
  
  const result = {
    courseId,
    courseName: courseName.trim(),
    notices,
    assignments,
    lectureNotes,
    url: location.href,
    timestamp: new Date().toISOString(),
    method: 'stealth'
  };
  
  console.log('🥷 Stealth crawling result:', {
    courseId: result.courseId,
    courseName: result.courseName,
    notices: result.notices.length,
    assignments: result.assignments.length,
    lectureNotes: result.lectureNotes.length
  });
  
  // 백그라운드로 결과 전송
  chrome.runtime.sendMessage({
    type: "COURSE_DATA",
    payload: result
  });
  
  return result;
}

console.log('🥷 Stealth mode ready!');