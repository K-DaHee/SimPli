/**
 * Offscreen Document Controller (Ultimate Audio Fix)
 * YouTube IFrame + AudioContext Kickstart + PostMessage Loop
 */

const playerContainer = document.getElementById('youtube-player');
let iframe = null;

// 진행률 계산용 타이머 상태
let progressInterval = null;
let playStartTime = null;
let elapsedSeconds = 0;
let currentDuration = 0;
let currentVideoId = null;

// SimPli 오디오 엔진 시작 로그
console.log("SimPli 오디오 엔진(Offscreen) 시작됨");

/**
 * 🔊 오디오 컨텍스트 '킥스타트' (브라우저 승인 유도)
 */
function kickstartAudio() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        // 아주 짧은 무음 생성
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 0.001;
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
        console.log("오디오 컨텍스트 킥스타트 완료");
    } catch (e) {
        console.error("킥스타트 에러:", e);
    }
}

/**
 * IFrame 초기화
 */
function initializeIframe() {
    if (iframe) return;

    iframe = document.createElement('iframe');
    iframe.id = 'simpli-player-frame';
    // 0x0은 브라우저에서 '비가시적'으로 판단하여 차단할 수 있으므로 최소 크기 지정
    iframe.width = "1";
    iframe.height = "1";
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.opacity = "0.01"; // 거의 투명하게 하여 사용자 방해 최소화
    iframe.allow = "autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

    const origin = encodeURIComponent(location.origin);
    iframe.src = `https://www.youtube.com/embed?enablejsapi=1&origin=${origin}&autoplay=1&mute=0`;

    playerContainer.appendChild(iframe);
}

// 시작 즉시 실행
initializeIframe();
kickstartAudio();

/**
 * YouTube IFrame에 명령 발송
 */
function sendPlayerCommand(func, args = []) {
    if (!iframe || !iframe.contentWindow) return;
    const message = JSON.stringify({ event: 'command', func: func, args: args });
    iframe.contentWindow.postMessage(message, '*');
}

// 백그라운드로부터 명령 수신
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target !== 'offscreen') return;

    if (message.type === 'PLAY_YOUTUBE') {
        currentVideoId = message.videoId;
        currentDuration = message.duration || 0;
        elapsedSeconds = 0;

        kickstartAudio(); // 재생 시마다 오디오 엔진 재활성화

        const origin = encodeURIComponent(location.origin);
        iframe.src = `https://www.youtube.com/embed/${message.videoId}?enablejsapi=1&origin=${origin}&autoplay=1&mute=0&rel=0&playsinline=1`;

        // 3초 동안 0.5초 간격으로 반복적으로 언뮤트 및 재생 명령 송신 (차단 우회)
        let retryCount = 0;
        const retryInterval = setInterval(() => {
            sendPlayerCommand('unMute');
            sendPlayerCommand('setVolume', [100]);
            sendPlayerCommand('playVideo');
            retryCount++;
            if (retryCount > 6) clearInterval(retryInterval);
        }, 500);

        startProgressTimer();
    }
    else if (message.type === 'PAUSE_YOUTUBE') {
        sendPlayerCommand('pauseVideo');
        if (playStartTime) {
            elapsedSeconds += (Date.now() - playStartTime) / 1000;
            playStartTime = null;
        }
        stopProgressTimer();
    }
    else if (message.type === 'RESUME_YOUTUBE') {
        sendPlayerCommand('playVideo');
        startProgressTimer();
    }
});

// 유튜브 플레이어 이벤트 수신
window.addEventListener('message', (event) => {
    if (event.origin !== 'https://www.youtube.com') return;
    try {
        const data = JSON.parse(event.data);
        if (data.event === 'onReady' || data.event === 'onStateChange') {
            sendPlayerCommand('unMute');
            sendPlayerCommand('playVideo');
        }
    } catch (e) { }
});

function startProgressTimer() {
    stopProgressTimer();
    playStartTime = Date.now();

    progressInterval = setInterval(() => {
        const now = elapsedSeconds + (Date.now() - playStartTime) / 1000;
        chrome.runtime.sendMessage({
            type: 'UPDATE_PROGRESS',
            currentTime: now,
            duration: currentDuration
        });

        if (currentDuration > 0 && now >= currentDuration) {
            stopProgressTimer();
        }
    }, 1000);
}

function stopProgressTimer() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}
