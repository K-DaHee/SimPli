/**
 * Background Service Worker
 * 전역 재생 상태 관리 및 메시지 라우팅
 */

// 오프스크린 문서 경로
const OFFSCREEN_DOCUMENT_PATH = '/html/offscreen.html';

// 팝업 재접속 시 UI 동기화용 전역 재생 상태
let currentSong = { videoId: null, title: '선택된 곡 없음', artist: '', duration: 0 };
let lastActiveFolderId = null; // 마지막으로 보고 있던 폴더 ID

/**
 * 오프스크린 문서가 존재하지 않으면 생성
 */
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
            currentSong = {
                videoId: message.videoId,
                title: message.title,
                artist: message.artist,
                duration: message.duration || 0
            };
            setupOffscreenDocument().then(() => {
                chrome.runtime.sendMessage({
                    target: 'offscreen',
                    type: 'PLAY_YOUTUBE',
                    videoId: message.videoId,
                    duration: message.duration || 0
                });
            });
            // 재생 시작 명령은 즉시 확인 응답
            sendResponse({ status: 'playing' });
            break;

        case 'GET_CURRENT_STATE':
            // 팝업 재오픈 시 현재 재생 곡 정보 및 마지막 폴더 ID 반환
            sendResponse({ currentSong, lastActiveFolderId });
            break;

        case 'SET_ACTIVE_FOLDER':
            // 현재 보고 있는 폴더 ID 업데이트
            lastActiveFolderId = message.folderId;
            sendResponse({ status: 'ok' });
            break;

        case 'PAUSE_SONG':
            chrome.runtime.sendMessage({ target: 'offscreen', type: 'PAUSE_YOUTUBE' });
            sendResponse({ status: 'paused' }); // 응답 채널을 명시적으로 닫음
            break;

        case 'RESUME_SONG':
            chrome.runtime.sendMessage({ target: 'offscreen', type: 'RESUME_YOUTUBE' });
            sendResponse({ status: 'resumed' });
            break;

        case 'UPDATE_PROGRESS':
            // 오프스크린 → 팝업으로 진행률 데이터 포워딩 (응답 필요 없음)
            chrome.runtime.sendMessage({
                type: 'UPDATE_PROGRESS',
                currentTime: message.currentTime,
                duration: message.duration
            });
            break;
    }
    // 모든 sendResponse가 동기적으로 처리되므로 return true 제거 (에러 방지)
    return false;
});
