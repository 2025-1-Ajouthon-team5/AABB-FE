console.log('🥷 Stealth Crawling Mode Started!');

let isCurrentlyCrawling = false;
let crawlQueue = [];
let collectedData = [];

// Send logs to the main tab for display
function sendLogToMainPage(message, logType = 'info') {
  chrome.tabs.query({
    url: "*://eclass2.ajou.ac.kr/ultra/course"
  }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: "CRAWL_LOG",
        message: message,
        logType: logType,
        timestamp: new Date().toISOString()
      }).catch(err => {
        console.error('Failed to send log to main page:', err);
      });
    }
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('📨 Message received:', msg.type);
  
  if (msg.type === "COURSE_LINKS") {
    console.log('🎯 Starting stealth crawling for', msg.payload.length, 'courses');
    sendLogToMainPage(`Starting stealth crawling for ${msg.payload.length} courses`, 'info');
    
    if (isCurrentlyCrawling) {
      console.log('⏳ Already crawling, adding to queue...');
      sendLogToMainPage('Already crawling, adding to queue...', 'warning');
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
  sendLogToMainPage('Created hidden window for crawling', 'info');
  
  try {
    for (let i = 0; i < courseUrls.length; i++) {
      const url = courseUrls[i];
      console.log(`\n🔍 Stealth crawling ${i + 1}/${courseUrls.length}: ${url}`);
      sendLogToMainPage(`Crawling course ${i + 1}/${courseUrls.length}`, 'crawl');
      
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
      sendLogToMainPage('Hidden window cleaned up', 'info');
    } catch (e) {
      console.log('ℹ️ Window already closed');
    }
    
    isCurrentlyCrawling = false;
    
    // 큐에 대기 중인 작업이 있으면 처리
    if (crawlQueue.length > 0) {
      const nextBatch = crawlQueue.splice(0);
      sendLogToMainPage(`Processing ${nextBatch.length} queued courses`, 'info');
      setTimeout(() => startStealthCrawling(nextBatch), 1000);
    } else {
      sendLogToMainPage('Crawling completed! See summary below.', 'success');
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
    sendLogToMainPage(`Failed to crawl: ${courseUrl} - ${error.message}`, 'error');
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
  
  sendLogToMainPage(`Collected data from: ${courseData.courseName}`, 'success');
  sendLogToMainPage(`Found: ${courseData.notices?.length || 0} notices, ${courseData.assignments?.length || 0} assignments`, 'info');
  
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
  
  const summaryMsg = `Crawling completed: ${collectedData.length} courses processed`;
  sendLogToMainPage(summaryMsg, 'success');
  
  collectedData.forEach((course, index) => {
    console.log(`${index + 1}. ${course.courseName}`);
    console.log(`   📋 Notices: ${course.notices?.length || 0}`);
    console.log(`   📝 Assignments: ${course.assignments?.length || 0}`);
    console.log(`   📚 Lecture Notes: ${course.lectureNotes?.length || 0}`);
    
    const courseMsg = `${course.courseName}: ${course.notices?.length || 0} notices, ${course.assignments?.length || 0} assignments, ${course.lectureNotes?.length || 0} lecture notes`;
    sendLogToMainPage(courseMsg, 'info');
  });
  
  const totalNotices = collectedData.reduce((sum, c) => sum + (c.notices?.length || 0), 0);
  const totalAssignments = collectedData.reduce((sum, c) => sum + (c.assignments?.length || 0), 0);
  const totalLectureNotes = collectedData.reduce((sum, c) => sum + (c.lectureNotes?.length || 0), 0);
  
  console.log(`\n📈 Total items collected:`);
  console.log(`   📋 Total notices: ${totalNotices}`);
  console.log(`   📝 Total assignments: ${totalAssignments}`);
  console.log(`   📚 Total lecture notes: ${totalLectureNotes}`);
  
  const totalMsg = `Total collected: ${totalNotices} notices, ${totalAssignments} assignments, ${totalLectureNotes} lecture notes`;
  sendLogToMainPage(totalMsg, 'success');
  
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
      '[class*="announcement"]',
      // Add more specific selectors
      '.base-content-grid .content-item[data-content-id]', 
      '.content-list-item',
      '.stream-content .stream-item'
    ],
    assignments: [
      '.content-item[data-content-type="resource/x-bb-assignment"]', 
      '.assignment-item',
      '.bb-assignment',
      '.stream-item[data-stream-entry-type="Assignment"]',
      '.activity-item.assignment',
      '[class*="assignment"]',
      '.base-content-grid .content-item[data-content-id]',
      '.content-list-item[data-content-type*="assignment"]'
    ],
    content: [
      '.content-item[data-content-type="resource/x-bb-document"]',
      '.content-item[data-content-type="resource/x-bb-folder"]',
      '.content-item',
      '.course-content',
      '.lecture-note',
      '.document-list .document-item',
      '.content-list .content-item',
      '.content-list-item[data-content-type*="document"]'
    ]
  };
  
  // Load more content by scrolling
  async function scrollToLoadAll() {
    console.log('📜 Scrolling to load all content...');
    
    const maxScrolls = 10;
    let lastHeight = 0;
    
    for (let i = 0; i < maxScrolls; i++) {
      const currentHeight = document.documentElement.scrollHeight;
      if (currentHeight === lastHeight) {
        console.log(`No more content to load after ${i} scrolls`);
        break;
      }
      
      lastHeight = currentHeight;
      window.scrollTo(0, currentHeight);
      console.log(`Scroll ${i+1}/${maxScrolls}: height ${currentHeight}`);
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Return to top
    window.scrollTo(0, 0);
  }
  
  function findItems(selectorArray, type) {
    let items = [];
    
    for (const selector of selectorArray) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} ${type} with: ${selector}`);
        
        const extracted = Array.from(elements).map(el => ({
          title: extractText(el, ['.title', '.content-title', 'h1', 'h2', 'h3', 'a', '.item-title']) || 'No title',
          content: extractText(el, ['.content', '.description', 'p', '.body', '.text']) || 'No content',
          date: extractText(el, ['.date', '.created-date', '.due-date', 'time', '[datetime]']) || '',
          url: extractUrl(el) || '',
          selector: selector
        }));
        
        items = items.concat(extracted);
      }
    }
    
    return items.filter(item => 
      item.title !== 'No title' && 
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
  
  function extractUrl(element) {
    const link = element.querySelector('a[href]');
    if (link && link.href) return link.href;
    
    // Try data attributes
    if (element.dataset.href) return element.dataset.href;
    if (element.dataset.url) return element.dataset.url;
    
    return '';
  }
  
  // Execute scrolling and data collection
  return new Promise(async (resolve) => {
    try {
      // Scroll to load more content
      await scrollToLoadAll();
      
      // Collect data
      const notices = findItems(selectors.notices, 'notices');
      const assignments = findItems(selectors.assignments, 'assignments');
      const lectureNotes = findItems(selectors.content, 'content');
      
      // Course info
      const courseIdMatch = (courseUrl || location.href).match(/courses\/([^\/\?]+)/);
      const courseId = courseIdMatch ? courseIdMatch[1] : 'unknown';
      const courseName = document.title || 'Unknown Course';
      
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
      
      // Send result to background
      chrome.runtime.sendMessage({
        type: "COURSE_DATA",
        payload: result
      });
      
      resolve(result);
    } catch (error) {
      console.error('Error during crawling:', error);
      resolve({
        courseId: 'error',
        courseName: 'Error',
        notices: [],
        assignments: [],
        lectureNotes: [],
        error: error.message
      });
    }
  });
}

console.log('🥷 Stealth mode ready!');