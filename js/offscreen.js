/**
 * SimPli Offscreen Engine
 * 실제 유튜브 시청 페이지를 IFrame으로 로드하여 보안 차단 우회
 */

const playerContainer = document.getElementById('youtube-player');

let iframe = null;
let currentVideoId = null;

/**
 * 유튜브 시청 페이지(Watch Page) IFrame 생성
 * @param {string} videoId 
 */
function createPlayer(videoId, seekTime = 0) {
    if (iframe) {
        playerContainer.removeChild(iframe);
        iframe = null;
    }

    iframe = document.createElement('iframe');
    iframe.id = 'offscreen-player';

    // [핵심] 실제 유튜브 사이트 로드 (DNR이 X-Frame-Options 제거)
    iframe.src = `https://www.youtube.com/watch?v=${videoId}&t=${seekTime}s`;

    iframe.width = "400px";
    iframe.height = "300px";
    iframe.allow = "autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

    playerContainer.appendChild(iframe);
}

// 백그라운드로부터 전달되는 재생 명령 처리
chrome.runtime.onMessage.addListener((message) => {
    if (message.target !== 'offscreen') return;

    if (message.type === 'PLAY_YOUTUBE') {
        currentVideoId = message.videoId;
        createPlayer(message.videoId);
    }
    else if (message.type === 'PAUSE_YOUTUBE') {
        if (iframe) iframe.src = "about:blank";
    }
    else if (message.type === 'RESUME_YOUTUBE') {
        // 오프스크린 재생성 시 videoId가 소실될 수 있으므로 메시지에서 복구
        if (message.videoId) currentVideoId = message.videoId;

        if (!currentVideoId) return;

        const seekTime = Math.floor(message.currentTime || 0);

        if (iframe) {
            // 기존 iframe이 살아있으면 URL만 교체
            iframe.src = `https://www.youtube.com/watch?v=${currentVideoId}&t=${seekTime}s`;
        } else {
            // 오프스크린 문서가 재생성되어 iframe이 없는 경우 새로 생성
            createPlayer(currentVideoId, seekTime);
        }
    }
});

// 오프스크린 준비 완료 알림
chrome.runtime.sendMessage({ type: 'OFFSCREEN_READY' });
