// 채팅 메시지 관리
let chatMessages = [];

// 저장된 메시지 불러오기
function loadChatMessages() {
    chrome.storage.local.get(['chatMessages'], (result) => {
        if (result.chatMessages) {
            chatMessages = result.chatMessages;
            renderChatMessages();
        }
    });
}

// 메시지 저장하기
function saveChatMessages() {
    chrome.storage.local.set({ chatMessages: chatMessages });
}

// 뒤로가기 함수
function goBackToCalendar() {
    chrome.runtime.sendMessage({ type: 'SWITCH_TO_CALENDAR' }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Message sending failed:', chrome.runtime.lastError);
            return;
        }
        if (response && response.success) {
            // 팝업 창 변경
                window.location.href = 'popup.html';
        }
    });
}

// 채팅 메시지 추가 함수
function addMessage(text, isUser = false) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const message = {
        text: text,
        isUser: isUser,
        time: timeString,
        id: Date.now() + Math.random()
    };
    
    chatMessages.push(message);
    saveChatMessages();
    renderChatMessages();
}

// 타이핑 인디케이터 표시
function showTypingIndicator() {
    const chatMessagesContainer = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="message-avatar">AI</div>
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    chatMessagesContainer.appendChild(typingDiv);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

// 타이핑 인디케이터 제거
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// 채팅 메시지 렌더링 함수
function renderChatMessages() {
    const chatMessagesContainer = document.getElementById('chatMessages');
    
    if (chatMessages.length === 0) {
        chatMessagesContainer.innerHTML = `
            <div class="empty-chat">
                <div class="empty-chat-icon">🤖</div>
                <div class="empty-chat-title">안녕하세요!</div>
                <div class="empty-chat-description">일정에 대해 궁금한 것이 있으면<br>언제든 물어보세요</div>
            </div>
        `;
        return;
    }
    
    chatMessagesContainer.innerHTML = chatMessages.map(message => `
        <div class="message ${message.isUser ? 'user' : ''}">
            <div class="message-avatar">${message.isUser ? 'U' : 'AI'}</div>
            <div class="message-content">
                <div class="message-text">${message.text}</div>
                <div class="message-time">${message.time}</div>
            </div>
        </div>
    `).join('');
    
    // 스크롤을 맨 아래로
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

// 일정 데이터 가져오기
function getScheduleData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['calendarEvents'], (result) => {
            resolve(result.calendarEvents || {});
        });
    });
}

// AI 응답 생성 함수
/*
async function generateAIResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    const scheduleData = await getScheduleData();
    
    if (lowerMessage.includes('일정') || lowerMessage.includes('수업') || lowerMessage.includes('강의')) {
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const todayEvents = scheduleData[todayKey] || [];
        
        if (todayEvents.length > 0) {
            const eventsList = todayEvents.map(event => 
                `• ${event.time} ${event.title} (${event.type})`
            ).join('\n');
            return `오늘의 일정입니다:\n\n${eventsList}`;
        } else {
            return '오늘은 등록된 일정이 없습니다. 📅\n\n새로고침 버튼을 눌러 최신 일정을 불러와보세요!';
        }
    }
    
    if (lowerMessage.includes('안녕') || lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
        return '안녕하세요! 아주대 캘린더 어시스턴트입니다. 일정 관련해서 도움이 필요하시면 언제든 말씀해주세요! 😊';
    }
    
    if (lowerMessage.includes('도움') || lowerMessage.includes('help')) {
        return '다음과 같은 것들을 도와드릴 수 있어요:\n\n• 오늘의 일정 확인\n• 내일의 일정 조회\n• 특정 날짜 일정 검색\n• 수업 시간표 정보\n• 캘린더 사용법\n\n궁금한 것이 있으면 언제든 물어보세요! 🎓';
    }
    
    if (lowerMessage.includes('내일') || lowerMessage.includes('tomorrow')) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
        const tomorrowEvents = scheduleData[tomorrowKey] || [];
        
        if (tomorrowEvents.length > 0) {
            const eventsList = tomorrowEvents.map(event => 
                `• ${event.time} ${event.title} (${event.location})`
            ).join('\n');
            return `내일의 일정입니다:\n\n${eventsList}`;
        } else {
            return '내일은 등록된 일정이 없습니다. 🌟\n\n여유로운 하루가 될 것 같네요!';
        }
    }
    
    if (lowerMessage.includes('이번주') || lowerMessage.includes('주간')) {
        const today = new Date();
        const weekEvents = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const dayEvents = scheduleData[dateKey] || [];
            
            if (dayEvents.length > 0) {
                const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
                weekEvents.push(`${date.getMonth() + 1}/${date.getDate()}(${dayName}): ${dayEvents.length}개`);
            }
        }
        
        if (weekEvents.length > 0) {
            return `이번 주 일정 요약:\n\n${weekEvents.join('\n')}\n\n자세한 내용은 캘린더에서 확인해보세요! 📅`;
        } else {
            return '이번 주는 등록된 일정이 없습니다. 🌟';
        }
    }
    
    if (lowerMessage.includes('새로고침') || lowerMessage.includes('업데이트')) {
        return '캘린더 화면으로 돌아가서 우측 상단의 ⟳ 버튼을 눌러주세요!\n\n최신 일정 데이터를 불러올 수 있습니다. 🔄';
    }
    
    // 기본 응답
    const responses = [
        '죄송해요, 잘 이해하지 못했어요. 일정에 관한 질문을 해주시면 더 잘 도와드릴 수 있어요! 📅\n\n예: "오늘 일정", "내일 수업", "이번주 일정"',
        '일정 관련 질문이시라면 더 구체적으로 물어봐주세요. 😊\n\n• "오늘 일정 알려줘"\n• "내일 뭐 있어?"\n• "이번주 일정 요약"',
        '아주대 캘린더와 관련된 질문을 해주시면 최선을 다해 도와드리겠습니다! 🎓\n\n"도움"이라고 입력하시면 사용법을 알려드려요!'
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
}
*/

// 메시지 전송 함수
async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const userMessage = chatInput.value.trim();
    
    if (!userMessage) return;
    
    // 버튼 비활성화
    sendBtn.disabled = true;
    chatInput.disabled = true;
    
    // 사용자 메시지 추가
    addMessage(userMessage, true);
    chatInput.value = '';
    
    // 타이핑 인디케이터 표시
    showTypingIndicator();
    
    try {
        // API 호출
        const response = await fetch('http://172.21.46.69:8000/api/v1/chatbot/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: getAuthToken(), // 제공된 토큰 사용
                message: userMessage,
            }),
        });

        if (!response.ok) {
            // API 응답이 실패한 경우 에러 처리
            const errorData = await response.json().catch(() => ({ response: 'API 응답 처리 중 오류가 발생했습니다.' })); // JSON 파싱 실패 시 기본 에러 메시지
            throw new Error(errorData.response || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.response; // API 응답에서 실제 메시지 추출

        // 타이핑 인디케이터 제거 후 응답 추가
        hideTypingIndicator();
        addMessage(aiResponse, false);
        
    } catch (error) {
        console.error('API Error:', error);
        hideTypingIndicator();
        addMessage(`죄송합니다. 답변을 가져오는 중 오류가 발생했습니다: ${error.message} 😓`, false);
    } finally {
        // 버튼 재활성화
        sendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
    }
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', function() {
    // 뒤로가기 버튼
    document.getElementById('backBtn').addEventListener('click', goBackToCalendar);
    
    // 채팅 관련 이벤트
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    
    sendBtn.addEventListener('click', sendMessage);
    
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    chatInput.addEventListener('input', function() {
        sendBtn.disabled = !chatInput.value.trim();
    });
    
    // 초기 포커스
    chatInput.focus();
    
    // 저장된 채팅 메시지 로드
    loadChatMessages();
});