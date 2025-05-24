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

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('prevMonth').addEventListener('click', previousMonth);
    document.getElementById('nextMonth').addEventListener('click', nextMonth);
    
    // 초기 렌더링
    renderCalendar();
});