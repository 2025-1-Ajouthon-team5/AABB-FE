let currentDate = new Date();
let selectedDate = new Date();

const monthNames = [
    "1월", "2월", "3월", "4월", "5월", "6월",
    "7월", "8월", "9월", "10월", "11월", "12월"
];

const dayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

// 샘플 이벤트 데이터 (나중에 크롤링 데이터로 교체)
const sampleEvents = {
    '2024-05-24': [
        { time: '09:00', title: '소프트웨어공학 강의', location: '팔달관 203호' },
        { time: '14:00', title: '해커톤 팀 미팅', location: '중앙도서관 스터디룸' }
    ],
    '2024-05-25': [
        { time: '10:30', title: '데이터베이스 강의', location: '신공학관 405호' },
        { time: '16:00', title: '프로젝트 발표', location: '다산관 102호' }
    ],
    '2024-05-27': [
        { time: '13:00', title: '알고리즘 강의', location: '팔달관 301호' }
    ]
};

// 채팅 화면으로 전환
function openChatScreen() {
    // 현재 일정 데이터를 storage에 저장
    chrome.storage.local.set({ calendarEvents: sampleEvents }, () => {
        // background script를 통해 팝업 변경
        chrome.runtime.sendMessage({ type: 'SWITCH_TO_CHAT' }, () => {
            window.close();
        });
    });
}

// 캘린더 관련 함수들 (기존 코드 유지)
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 월/년 표시
    document.getElementById('currentMonth').textContent = `${year}년 ${monthNames[month]}`;
    
    // 현재 날짜 표시
    const today = new Date();
    document.getElementById('currentDate').textContent = 
        `오늘 · ${today.getMonth() + 1}월 ${today.getDate()}일 ${dayNames[today.getDay()]}`;
    
    // 캘린더 렌더링
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();
    
    const prevLastDay = new Date(year, month, 0).getDate();
    
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';
    
    // 이전 달의 날짜들
    for (let i = startDay - 1; i >= 0; i--) {
        const dayElement = createDayElement(prevLastDay - i, 'other-month', year, month - 1);
        calendarDays.appendChild(dayElement);
    }
    
    // 이번 달의 날짜들
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = today.getFullYear() === year && 
                       today.getMonth() === month && 
                       today.getDate() === day;
        
        const isSelected = selectedDate.getFullYear() === year && 
                         selectedDate.getMonth() === month && 
                         selectedDate.getDate() === day;
        
        let className = '';
        if (isToday) className += ' today';
        if (isSelected) className += ' selected';
        
        // 이벤트가 있는 날짜 체크
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (sampleEvents[dateKey]) {
            className += ' has-events';
        }
        
        const dayElement = createDayElement(day, className.trim(), year, month);
        calendarDays.appendChild(dayElement);
    }
    
    // 다음 달의 날짜들
    const remainingCells = 42 - (startDay + daysInMonth);
    for (let day = 1; day <= remainingCells; day++) {
        const dayElement = createDayElement(day, 'other-month', year, month + 1);
        calendarDays.appendChild(dayElement);
    }
    
    // 선택된 날짜의 할 일 목록 업데이트
    updateTodoList();
}

function createDayElement(day, className, year, month) {
    const dayElement = document.createElement('div');
    dayElement.className = `day ${className}`;
    dayElement.textContent = day;
    
    dayElement.addEventListener('click', () => {
        if (!className.includes('other-month')) {
            selectedDate = new Date(year, month, day);
            renderCalendar(); // 다시 렌더링해서 선택 상태 업데이트
        }
    });
    
    return dayElement;
}

function updateTodoList() {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;
    const day = selectedDate.getDate();
    const dayOfWeek = dayNames[selectedDate.getDay()];
    
    document.getElementById('selectedDate').textContent = `${month}월 ${day}일 ${dayOfWeek}`;
    
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const events = sampleEvents[dateKey] || [];
    
    document.getElementById('eventCount').textContent = 
        events.length > 0 ? `일정 ${events.length}개` : '일정 없음';
    
    const todoList = document.getElementById('todoList');
    
    if (events.length === 0) {
        todoList.innerHTML = `
            <div class="no-events">
                <div class="no-events-icon">📅</div>
                <div>이날은 일정이 없습니다</div>
            </div>
        `;
    } else {
        todoList.innerHTML = events.map(event => `
            <div class="todo-item">
                <div class="todo-time">${event.time}</div>
                <div class="todo-title">${event.title}</div>
                <div class="todo-location">${event.location}</div>
            </div>
        `).join('');
    }
}

function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

// 크롤링 데이터를 받아서 업데이트하는 함수 (개발자 B가 사용할 함수)
function updateEvents(newEvents) {
    // newEvents 형태: { '2024-05-24': [{ time: '09:00', title: '강의', location: '장소' }] }
    Object.assign(sampleEvents, newEvents);
    renderCalendar();
}

// 외부에서 접근 가능하도록 window 객체에 추가
window.updateCalendarEvents = updateEvents;

// 크롤링 시작 함수
function startCrawling() {
    const refreshBtn = document.getElementById('refreshBtn');
    
    // 이미 크롤링 중이면 중복 실행 방지
    if (refreshBtn.classList.contains('loading')) {
        return;
    }
    
    // 버튼 로딩 상태로 변경
    refreshBtn.classList.add('loading');
    
    // 상태 메시지 표시
    showStatusMessage('크롤링을 시작합니다...');
    
    // 모든 탭에서 e-class 페이지 찾기
    chrome.tabs.query({url: "*://eclass2.ajou.ac.kr/ultra/course*"}, (tabs) => {
        if (tabs.length === 0) {
            // e-class 페이지가 열려있지 않은 경우
            showStatusMessage('이클래스 페이지가 열려있지 않습니다. 이클래스에 접속 후 다시 시도해주세요.', 'error');
            refreshBtn.classList.remove('loading');
            
            // 새 탭으로 이클래스 페이지 열기 제안
            if (confirm('이클래스 페이지를 새 탭에서 열까요?')) {
                chrome.tabs.create({ url: 'https://eclass2.ajou.ac.kr/ultra/course' });
            }
            return;
        }
        
        // 이클래스 페이지가 있으면 크롤링 시작 메시지 전송
        chrome.tabs.sendMessage(tabs[0].id, { type: "START_CRAWLING" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Failed to send message:', chrome.runtime.lastError);
                showStatusMessage('크롤링 시작에 실패했습니다. 페이지를 새로고침하고 다시 시도해주세요.', 'error');
                refreshBtn.classList.remove('loading');
                return;
            }
            
            if (response && response.success) {
                showStatusMessage('크롤링이 시작되었습니다. 잠시만 기다려주세요...', 'success');
                
                // 30초 후 자동으로 로딩 상태 해제 (타임아웃 방지)
                setTimeout(() => {
                    if (refreshBtn.classList.contains('loading')) {
                        refreshBtn.classList.remove('loading');
                        showStatusMessage('크롤링이 백그라운드에서 계속 진행됩니다.', 'info');
                    }
                }, 30000);
            } else {
                showStatusMessage('크롤링 시작에 실패했습니다.', 'error');
                refreshBtn.classList.remove('loading');
            }
        });
    });
}

// 상태 메시지를 표시하는 함수
function showStatusMessage(message, type = 'info') {
    // 메시지 컨테이너가 없으면 생성
    let messageContainer = document.getElementById('status-message');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'status-message';
        messageContainer.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            right: 10px;
            padding: 10px 15px;
            border-radius: 4px;
            font-size: 13px;
            z-index: 1000;
            text-align: center;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(messageContainer);
    }
    
    // 메시지 타입에 따른 스타일 설정
    let backgroundColor = '#f8f9fa';
    let textColor = '#202124';
    let borderColor = '#dadce0';
    
    switch(type) {
        case 'success':
            backgroundColor = '#e6f4ea';
            textColor = '#1e8e3e';
            borderColor = '#ceead6';
            break;
        case 'error':
            backgroundColor = '#fce8e6';
            textColor = '#d93025';
            borderColor = '#f5c2bd';
            break;
        case 'warning':
            backgroundColor = '#fef7e0';
            textColor = '#ea8600';
            borderColor = '#fedcb1';
            break;
    }
    
    messageContainer.style.backgroundColor = backgroundColor;
    messageContainer.style.color = textColor;
    messageContainer.style.border = `1px solid ${borderColor}`;
    
    messageContainer.textContent = message;
    messageContainer.style.opacity = '1';
    
    // 5초 후 메시지 숨기기
    setTimeout(() => {
        messageContainer.style.opacity = '0';
    }, 5000);
}

// 크롤링 결과를 받는 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "CRAWL_COMPLETE") {
        // 크롤링 완료 메시지 처리
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.classList.remove('loading');
        
        showStatusMessage('크롤링이 완료되었습니다!', 'success');
        
        // 수집된 데이터로 캘린더 업데이트
        if (message.data && message.data.events) {
            updateEvents(message.data.events);
        }
    }
    
    return true;
});

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', function() {
    // 캘린더 관련 이벤트
    document.getElementById('prevMonth').addEventListener('click', previousMonth);
    document.getElementById('nextMonth').addEventListener('click', nextMonth);
    document.getElementById('refreshBtn').addEventListener('click', startCrawling);
    
    // FAB 버튼 이벤트
    document.getElementById('chatFab').addEventListener('click', openChatScreen);
    
    // 초기 렌더링
    renderCalendar();
});