console.log('🚀 Ajou Calendar Extension Background Script Started!');

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('📨 Background received message:', {
    type: msg.type,
    from: sender.tab?.url,
    timestamp: new Date().toISOString()
  });
  
  if (msg.type === "COURSE_LINKS") {
    console.log('📚 Processing course links:', {
      count: msg.payload.length,
      links: msg.payload
    });
    
    crawlAllCourses(msg.payload);
    sendResponse({ success: true, message: 'Course crawling started' });
  }

  if (msg.type === "COURSE_DATA") {
    console.log('📊 Received course data:', {
      courseId: msg.payload.courseId,
      courseName: msg.payload.courseName,
      notices: msg.payload.notices.length,
      assignments: msg.payload.assignments.length,
      lectureNotes: msg.payload.lectureNotes.length,
      timestamp: msg.payload.timestamp
    });

    // 상세 데이터 로깅
    console.log('📋 Course Details:', JSON.stringify(msg.payload, null, 2));

    // 서버로 데이터 전송 (선택사항)
    /*
    fetch("https://your-server.com/api/blackboard/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg.payload)
    }).then(response => {
      console.log('✅ Data sent to server successfully');
    }).catch(err => {
      console.log('❌ Server sync failed:', err);
    });
    */
    
    sendResponse({ success: true, message: 'Course data received' });
  }
  
  return true; // 비동기 응답을 위해 필요
});

async function crawlAllCourses(courseUrls) {
  console.log('🎯 Starting to crawl all courses:', {
    totalCourses: courseUrls.length,
    urls: courseUrls
  });
  
  for (const [index, url] of courseUrls.entries()) {
    try {
      console.log(`\n🔍 Crawling course ${index + 1}/${courseUrls.length}`);
      console.log(`📂 URL: ${url}`);
      
      // 새 탭 생성
      const tab = await new Promise((resolve, reject) => {
        chrome.tabs.create({ 
          url, 
          active: false  // 백그라운드에서 실행
        }, (tab) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(tab);
          }
        });
      });

      console.log(`✅ Created tab ${tab.id} for course ${index + 1}`);

      // 탭 로딩 대기 (Ultra는 로딩이 느릴 수 있음)
      console.log(`⏳ Waiting for tab ${tab.id} to load...`);
      await new Promise(resolve => setTimeout(resolve, 8000)); // 8초 대기

      // 탭 상태 확인
      try {
        const tabInfo = await chrome.tabs.get(tab.id);
        console.log(`📊 Tab ${tab.id} status:`, {
          status: tabInfo.status,
          url: tabInfo.url,
          title: tabInfo.title
        });
      } catch (e) {
        console.log(`⚠️ Could not get tab info for ${tab.id}:`, e.message);
      }

      // 크롤링 스크립트 실행
      console.log(`🤖 Executing crawling script on tab ${tab.id}...`);
      
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: crawlCourseData,
          args: [url] // URL을 인자로 전달
        });

        console.log(`📊 Crawling completed for tab ${tab.id}:`, {
          resultsCount: results.length,
          result: results[0]?.result
        });
        
      } catch (scriptError) {
        console.error(`❌ Script execution failed for tab ${tab.id}:`, scriptError);
      }

      // 탭 정리
      try {
        await chrome.tabs.remove(tab.id);
        console.log(`🗑️ Closed tab ${tab.id}`);
      } catch (e) {
        console.log(`⚠️ Could not close tab ${tab.id}:`, e.message);
      }
      
      // 탭 간 딜레이 (서버 부하 방지)
      if (index < courseUrls.length - 1) {
        console.log('⏸️ Waiting 3 seconds before next course...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.error(`❌ Error crawling course ${index + 1} (${url}):`, {
        error: error.message,
        stack: error.stack
      });
    }
  }
  
  console.log('🎉 Finished crawling all courses!');
}

// 실제 크롤링을 수행하는 함수
function crawlCourseData(courseUrl) {
  console.log('🕷️ Starting to crawl course data on:', location.href);
  console.log('🎯 Target URL was:', courseUrl);
  
  // 페이지 로딩 확인
  if (document.readyState !== 'complete') {
    console.log('⏳ Page still loading, waiting...');
  }
  
  // 다양한 셀렉터로 데이터 찾기
  const selectors = {
    announcements: [
      '.content-item[data-content-type="resource/x-bb-announcement"]',
      '.announcement-item',
      '.bb-announcement',
      '[data-testid*="announcement"]',
      '.stream-item[data-stream-entry-type="Announcement"]',
      '.activity-item.announcement'
    ],
    assignments: [
      '.content-item[data-content-type="resource/x-bb-assignment"]',
      '.assignment-item',
      '.bb-assignment', 
      '[data-testid*="assignment"]',
      '.stream-item[data-stream-entry-type="Assignment"]',
      '.activity-item.assignment'
    ],
    content: [
      '.content-item[data-content-type="resource/x-bb-document"]',
      '.content-item[data-content-type="resource/x-bb-folder"]',
      '.lecture-note-item',
      '.content-list-item',
      '.bb-content',
      '.course-content'
    ]
  };

  function findElementsByCriteria(selectorArray, itemName) {
    for (const selector of selectorArray) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} ${itemName} with selector: ${selector}`);
        return Array.from(elements);
      }
    }
    console.log(`❌ No ${itemName} found with any selector`);
    return [];
  }
  
  function extractTextContent(element, selectors) {
    for (const selector of selectors) {
      const el = element.querySelector(selector);
      if (el && el.textContent.trim()) {
        return el.textContent.trim();
      }
    }
    return element.textContent.trim() || '내용 없음';
  }

  // 공지사항 크롤링
  const announcementElements = findElementsByCriteria(selectors.announcements, 'announcements');
  const notices = announcementElements.map(el => ({
    title: extractTextContent(el, ['.title', '.content-title', 'h1', 'h2', 'h3', 'a', '.item-title']),
    content: extractTextContent(el, ['.content', '.description', '.item-description', 'p'])
  }));

  // 과제 크롤링
  const assignmentElements = findElementsByCriteria(selectors.assignments, 'assignments');
  const assignments = assignmentElements.map(el => ({
    title: extractTextContent(el, ['.title', '.content-title', 'h1', 'h2', 'h3', 'a', '.item-title']),
    content: extractTextContent(el, ['.content', '.description', '.due-date', '.item-description'])
  }));

  // 강의 자료 크롤링
  const contentElements = findElementsByCriteria(selectors.content, 'lecture notes');
  const lectureNotes = contentElements.map(el => ({
    title: extractTextContent(el, ['.title', '.content-title', 'h1', 'h2', 'h3', 'a', '.item-title']),
    content: extractTextContent(el, ['.content', '.description', '.item-description'])
  }));

  // 코스 정보 추출
  const courseIdMatch = (courseUrl || location.href).match(/courses\/([^\/\?]+)/);
  const courseId = courseIdMatch ? courseIdMatch[1] : 'unknown';
  
  const courseName = document.title || 
                     document.querySelector('h1')?.textContent?.trim() || 
                     document.querySelector('.course-title')?.textContent?.trim() || 
                     document.querySelector('[data-testid="course-title"]')?.textContent?.trim() ||
                     '코스명 없음';

  const result = {
    courseId,
    courseName: courseName.trim(),
    notices,
    assignments,
    lectureNotes,
    url: location.href,
    originalUrl: courseUrl,
    timestamp: new Date().toISOString(),
    pageTitle: document.title,
    crawlStats: {
      totalElements: document.querySelectorAll('*').length,
      noticeCandidates: announcementElements.length,
      assignmentCandidates: assignmentElements.length,
      contentCandidates: contentElements.length
    }
  };

  console.log('📊 Crawling completed:', {
    courseId: result.courseId,
    courseName: result.courseName,
    notices: result.notices.length,
    assignments: result.assignments.length,
    lectureNotes: result.lectureNotes.length
  });

  // 결과를 background script로 전송
  chrome.runtime.sendMessage({
    type: "COURSE_DATA",
    payload: result
  });

  return result;
}

console.log('🔧 Background script setup complete!');