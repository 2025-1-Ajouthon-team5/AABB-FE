// popup.js
let currentDate = new Date("2025-05-01");
let selectedDate = new Date("2025-05-25");
let dynamicEvents = {}; // IndexedDB에서 가져온 일정 저장용

const monthNames = [
    "1월", "2월", "3월", "4월", "5월", "6월",
    "7월", "8월", "9월", "10월", "11월", "12월"
];

const dayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("ScheduleDB", 2);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("schedules")) {
                const store = db.createObjectStore("schedules", { keyPath: "id" });
                store.createIndex("date", "date", { unique: false });
            } else {
                const store = event.target.transaction.objectStore("schedules");
                if (!store.indexNames.contains("date")) {
                    store.createIndex("date", "date", { unique: false });
                }
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getMonthlySchedules(year, month) {
    const db = await initDB();
    const tx = db.transaction("schedules", "readonly");
    const store = tx.objectStore("schedules");
    const index = store.index("date");
    return new Promise((resolve, reject) => {
        const request = index.getAll();
        const result = {};
        request.onsuccess = () => {
            request.result.forEach(event => {
                const [y, m] = event.date.split('-');
                if (parseInt(y) === year && parseInt(m) === month) {
                    if (!result[event.date]) result[event.date] = [];
                    result[event.date].push(event);
                }
            });
            resolve(result);
        };
        request.onerror = () => reject(request.error);
    });
}

async function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    dynamicEvents = await getMonthlySchedules(year, month + 1);

    document.getElementById('currentMonth').textContent = `${year}년 ${monthNames[month]}`;
    const today = new Date();
    document.getElementById('currentDate').textContent = `오늘 · ${today.getMonth() + 1}월 ${today.getDate()}일 ${dayNames[today.getDay()]}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const prevLastDay = new Date(year, month, 0).getDate();
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';

    for (let i = startDay - 1; i >= 0; i--) {
        const dayElement = createDayElement(prevLastDay - i, 'other-month', year, month - 1);
        calendarDays.appendChild(dayElement);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
        const isSelected = selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === day;
        let className = '';
        if (isToday) className += ' today';
        if (isSelected) className += ' selected';
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (dynamicEvents[dateKey]) className += ' has-events';
        const dayElement = createDayElement(day, className.trim(), year, month);
        calendarDays.appendChild(dayElement);
    }

    const totalRendered = startDay + daysInMonth;
    const remainingCells = 42 - totalRendered;
    for (let day = 1; day <= remainingCells; day++) {
        const dayElement = createDayElement(day, 'other-month', year, month + 1);
        calendarDays.appendChild(dayElement);
    }

    updateTodoList();
}

function createDayElement(day, className, year, month) {
    const dayElement = document.createElement('div');
    dayElement.className = `day ${className}`;
    dayElement.textContent = day;
    dayElement.addEventListener('click', () => {
        if (!className.includes('other-month')) {
            selectedDate = new Date(year, month, day);
            renderCalendar();
        }
    });
    return dayElement;
}

function updateTodoList() {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;
    const day = selectedDate.getDate();
    const dayOfWeek = dayNames[selectedDate.getDay()];
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const events = dynamicEvents[dateKey] || [];
    document.getElementById('selectedDate').textContent = `${month}월 ${day}일 ${dayOfWeek}`;
    document.getElementById('eventCount').textContent = events.length > 0 ? `일정 ${events.length}개` : '일정 없음';
    const todoList = document.getElementById('todoList');
    if (events.length === 0) {
        todoList.innerHTML = `<div class="no-events"><div class="no-events-icon">📅</div><div>이날은 일정이 없습니다</div></div>`;
    } else {
        todoList.innerHTML = events.map(event => `
      <div class="todo-item">
        <div class="todo-time">${event.time}</div>
        <div class="todo-title">${event.title}</div>
        <div class="todo-location">${event.location}</div>
        <button class="delete-btn" data-id="${event.id}">🗑</button>
      </div>
    `).join('');

        todoList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = btn.dataset.id;
                const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const event = (dynamicEvents[dateKey] || []).find(ev => ev.id == id);

                if (!event) return;

                if (event.BB_id !== null && event.BB_id !== undefined) {
                    // 외부 일정이면 서버에도 삭제 요청
                    try {
                        await fetch('https://example.com/api/schedule/delete', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ bbId: event.BB_id })
                        });
                        console.log(`🛰 외부 일정 BB_id ${event.BB_id} 서버에 전송 완료`);
                    } catch (err) {
                        console.error('❗ 서버에 BB_id 삭제 요청 실패:', err);
                    }
                }

                // DB에서도 삭제
                const db = await initDB();
                const tx = db.transaction("schedules", "readwrite");
                tx.objectStore("schedules").delete(id);
                await tx.done;
                await renderCalendar();
            });
        });
    }
}

async function updateEvents(newEvents, isExternal = false) {
    const db = await initDB();
    const tx = db.transaction("schedules", "readwrite");
    const store = tx.objectStore("schedules");

    for (const [date, events] of Object.entries(newEvents)) {
        for (const event of events) {
            const id = `${date}_${event.title}_${event.time}`; // 로컬은 생성

            const BB_id = isExternal ? event.id : null;

            await store.put({ id, date, BB_id, ...event });
        }
    }

    await tx.done;
    await renderCalendar();
}

function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

window.updateCalendarEvents = updateEvents;

// ➕ 일정 추가 버튼 이벤트 리스너 등록
async function handleAddEventClick() {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;
    const day = selectedDate.getDate();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const title = prompt("일정 제목을 입력하세요:");
    if (title) {
        const time = prompt("시간 (예: 14:00)", "00:00");
        const location = prompt("장소", "");
        await updateCalendarEvents({
            [dateStr]: [{ title, time, location }]
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("📌 DOM fully loaded");
    initDB().then(() => {
        chrome.storage.local.get('authToken', async (result) => {
            if (result.authToken) {
                await renderCalendar();
            } else {
                window.location.href = 'login.html';
            }
        });

        document.getElementById('prevMonth')?.addEventListener('click', previousMonth);
        document.getElementById('nextMonth')?.addEventListener('click', nextMonth);
        document.getElementById('addEventBtn')?.addEventListener('click', handleAddEventClick);

        // FAB 버튼 이벤트
        document.getElementById('chatFab').addEventListener('click', openChatScreen);
    });
});

// 채팅 화면으로 전환
function openChatScreen() {
    // 현재 일정 데이터를 storage에 저장
    chrome.storage.local.set({ calendarEvents: dynamicEvents }, () => {
        // background script를 통해 팝업 변경
        chrome.runtime.sendMessage({ type: 'SWITCH_TO_CHAT' }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('🔴 lastError:', JSON.stringify(chrome.runtime.lastError, null, 2));
                return;
            }
            if (response && response.success) {
                // 팝업 창 변경
                window.location.href = 'chatPopup.html';
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

    switch (type) {
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