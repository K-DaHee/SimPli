/**
 * Background Service Worker
 * 오프스크린 문서 생명주기 관리 및 전역 재생 상태 유지
 */

const OFFSCREEN_DOCUMENT_PATH = '/html/offscreen.html';

// 팝업 재접속 시 UI 동기화용 전역 재생 상태
let currentSong = { videoId: null, title: '선택된 곡 없음', artist: '' };

// 기존 오프스크린 문서 존재 여부 확인 후 없을 때만 신규 생성
async function setupOffscreenDocument() {
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
    });

    if (existingContexts.length > 0) return;

    try {
        await chrome.offscreen.createDocument({
            url: OFFSCREEN_DOCUMENT_PATH,
            reasons: ['AUDIO_PLAYBACK'],
            justification: '플레이리스트 백그라운드 음악 재생'
        });
    } catch (e) {
        console.error('오프스크린 생성 에러:', e);
    }
}

// 팝업 메시지 수신 및 오프스크린 명령 라우팅
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'PLAY_SONG':
            currentSong = { videoId: message.videoId, title: message.title, artist: message.artist };
            setupOffscreenDocument().then(() => {
                chrome.runtime.sendMessage({
                    target: 'offscreen',
                    type: 'PLAY_YOUTUBE',
                    videoId: message.videoId
                });
            });
            sendResponse({ status: 'playing' });
            break;
        case 'PAUSE_SONG':
            chrome.runtime.sendMessage({ target: 'offscreen', type: 'PAUSE_YOUTUBE' });
            break;
        case 'RESUME_SONG':
            chrome.runtime.sendMessage({ target: 'offscreen', type: 'RESUME_YOUTUBE' });
            break;
        case 'GET_CURRENT_STATE':
            // 팝업 재오픈 시 현재 재생 곡 정보 반환
            sendResponse({ currentSong });
            break;
        case 'UPDATE_PROGRESS':
            // 오프스크린 → 팝업으로 진행률 데이터 포워딩
            chrome.runtime.sendMessage({
                type: 'UPDATE_PROGRESS',
                currentTime: message.currentTime,
                duration: message.duration
            });
            break;
    }
    return true;
});
