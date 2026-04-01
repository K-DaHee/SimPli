/**
 * Offscreen Document Controller
 * YouTube IFrame API 로드 및 재생/정지 제어 명령 수행
 */

let player;
let isPlayerReady = false;
let queuedVideoId = null;

// YouTube IFrame API 스크립트 동적 주입
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 전역 콜백: YouTube IFrame API 로드 완료 시 플레이어 객체 초기화
window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player('youtube-player', {
        height: '0',
        width: '0',
        videoId: '',
        playerVars: {
            'autoplay': 1,
            'controls': 0,
            'playsinline': 1
        },
        events: {
            'onReady': onPlayerReady
        }
    });
};

/**
 * 유튜브 플레이어 초기화 완료 시 호출
 */
function onPlayerReady(event) {
    isPlayerReady = true;
    // 플레이어 준비 전 수신된 예약 곡이 있을 경우 즉시 재생
    if (queuedVideoId) {
        player.loadVideoById(queuedVideoId);
        queuedVideoId = null;
    }
}

// background.js에서 전달하는 재생 제어 메시지 라우팅
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== 'offscreen') return;

    switch (message.type) {
        case 'PLAY_YOUTUBE':
            if (isPlayerReady && player && typeof player.loadVideoById === 'function') {
                player.loadVideoById(message.videoId);
            } else {
                queuedVideoId = message.videoId;
            }
            break;
        case 'PAUSE_YOUTUBE':
            if (isPlayerReady && player && typeof player.pauseVideo === 'function') {
                player.pauseVideo();
            }
            break;
        case 'RESUME_YOUTUBE':
            if (isPlayerReady && player && typeof player.playVideo === 'function') {
                player.playVideo();
            }
            break;
    }
});
