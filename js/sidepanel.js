/**
 * Side Panel Engine
 * 사이드 패널 내 유튜브 IFrame 재생 및 진행률 추적
 */

const playerContainer = document.getElementById('player-container');
const infoBox = document.getElementById('current-info');
const titleEl = document.getElementById('song-title');
const artistEl = document.getElementById('song-artist');

let iframe = null;

/**
 * 유튜브 플레이어(IFrame) 생성
 * @param {string} videoId 
 */
function createPlayer(videoId) {
    if (iframe) {
        playerContainer.removeChild(iframe);
        iframe = null;
    }

    iframe = document.createElement('iframe');
    iframe.id = 'side-player';

    // 표준 임베드 방식 및 보안 파라미터 적용
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&rel=0&origin=https://www.youtube.com`;
    iframe.allow = "autoplay; encrypted-media";

    playerContainer.appendChild(iframe);
}

// 메시지 리스너 (백그라운드로부터 명령 수신)
chrome.runtime.onMessage.addListener((message) => {
    if (message.target && message.target !== 'player') return;

    if (message.type === 'PLAY_YOUTUBE') {
        createPlayer(message.videoId);
        infoBox.style.display = 'block';
        if (message.title) titleEl.textContent = message.title;
        if (message.artist) artistEl.textContent = message.artist;
    }
    else if (message.type === 'PAUSE_YOUTUBE') {
        if (iframe) iframe.src = "about:blank";
    }
    else if (message.type === 'RESUME_YOUTUBE') {
        // 일시정지 해제 및 재개 제어
    }
});
