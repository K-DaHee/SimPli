/**
 * Background Service Worker
 * 오프스크린 문서 생명주기 관리 및 UI/오프스크린 간 메시지 브릿지 역할
 */

const OFFSCREEN_DOCUMENT_PATH = '/html/offscreen.html';

/**
 * 오프스크린 문서(백그라운드 미디어 플레이어) 생성
 */
async function setupOffscreenDocument() {
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
    });

    // 이미 활성화된 경우 중단
    if (existingContexts.length > 0) {
        return;
    }

    try {
        await chrome.offscreen.createDocument({
            url: OFFSCREEN_DOCUMENT_PATH,
            reasons: ['AUDIO_PLAYBACK'],
            justification: '플레이리스트 음악의 백그라운드 재생 및 제어'
        });
    } catch (e) {
        console.error('오프스크린 문서 생성 실패:', e);
    }
}

// popup.js 재생/정지 이벤트 라우팅
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'PLAY_SONG':
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
    }

    // 비동기 응답(sendResponse) 처리를 위한 true 반환
    return true;
});
