let currentDate = new Date();

const monthNames = [
    "1월", "2월", "3월", "4월", "5월", "6월",
    "7월", "8월", "9월", "10월", "11월", "12월"
];

const dayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 월/년 표시
    document.getElementById('currentMonth').textContent = `${year}년 ${monthNames[month]}`;
    
    // 이번 달 첫날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();
    
    // 이전 달 마지막 날들
    const prevLastDay = new Date(year, month, 0).getDate();
    
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';
    
    // 이전 달의 날짜들 (회색으로 표시)
    for (let i = startDay - 1; i >= 0; i--) {
        const dayElement = createDayElement(prevLastDay - i, 'other-month');
        calendarDays.appendChild(dayElement);
    }
    
    // 이번 달의 날짜들
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = today.getFullYear() === year && 
                       today.getMonth() === month && 
                       today.getDate() === day;
        
        const dayElement = createDayElement(day, isToday ? 'today' : '');
        calendarDays.appendChild(dayElement);
    }
    
    // 다음 달의 날짜들 (회색으로 표시)
    const remainingCells = 42 - (startDay + daysInMonth); // 6주 * 7일 = 42
    for (let day = 1; day <= remainingCells; day++) {
        const dayElement = createDayElement(day, 'other-month');
        calendarDays.appendChild(dayElement);
    }
    
    // 오늘 날짜 정보 표시
    updateTodayInfo();
}

function createDayElement(day, className) {
    const dayElement = document.createElement('div');
    dayElement.className = `day ${className}`;
    dayElement.textContent = day;
    
    dayElement.addEventListener('click', () => {
        if (!className.includes('other-month')) {
            // 선택된 날짜 처리 (원하는 기능 추가 가능)
            console.log(`선택된 날짜: ${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월 ${day}일`);
        }
    });
    
    return dayElement;
}

function updateTodayInfo() {
    const today = new Date();
    const todayString = `오늘은 ${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 ${dayNames[today.getDay()]}입니다`;
    document.getElementById('todayDate').textContent = todayString;
}

function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('prevMonth').addEventListener('click', previousMonth);
    document.getElementById('nextMonth').addEventListener('click', nextMonth);
    
    // 초기 캘린더 렌더링
    renderCalendar();
});