/**
 * Offscreen Document Controller
 * YouTube IFrame API를 통한 백그라운드 오디오 재생 제어
 */

let player = null;
let isPlayerReady = false;
let progressInterval = null;

// YouTube IFrame API 로드 완료 후 플레이어 객체 초기화
function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-player', {
        height: '0',
        width: '0',
        playerVars: { autoplay: 1 },
        events: {
            onReady: () => { isPlayerReady = true; },
            onStateChange: (event) => {
                // 재생 중일 때만 진행률 폴링 시작
                if (event.data === YT.PlayerState.PLAYING) {
                    startProgressPolling();
                } else {
                    stopProgressPolling();
                }
            }
        }
    });
}

/**
 * 1초 간격으로 현재 재생 위치를 팝업으로 브로드캐스트
 */
function startProgressPolling() {
    stopProgressPolling();
    progressInterval = setInterval(() => {
        if (!player || !isPlayerReady) return;
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        if (duration > 0) {
            chrome.runtime.sendMessage({
                type: 'UPDATE_PROGRESS',
                currentTime,
                duration
            });
        }
    }, 1000);
}

/**
 * 진행률 폴링 중단
 */
function stopProgressPolling() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

// 백그라운드로부터 재생/일시정지/재개 명령 수신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== 'offscreen') return;

    if (message.type === 'PLAY_YOUTUBE') {
        if (isPlayerReady && player) {
            player.loadVideoById(message.videoId);
        }
    }
    else if (message.type === 'PAUSE_YOUTUBE') {
        if (isPlayerReady && player) player.pauseVideo();
    }
    else if (message.type === 'RESUME_YOUTUBE') {
        if (isPlayerReady && player) player.playVideo();
    }
});
