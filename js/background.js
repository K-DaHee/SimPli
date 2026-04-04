/**
 * SimPli Background Module
 * 오프스크린 문서 생성 및 재생 명령 중계
 */

let currentSongId = null;
let isPlayingGlobal = false;
let currentSongInfo = null;

/**
 * 오프스크린 문서 생성 및 초기화
 */
async function setupOffscreen() {
    if (await chrome.offscreen.hasDocument()) return;

    await chrome.offscreen.createDocument({
        url: 'html/offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Background audio playback for YouTube playlists'
    });
}

// 재생 명령 및 상태 제어
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 노래 재생 명령 수신
    if (message.type === 'PLAY_SONG') {
        currentSongId = message.videoId;
        currentSongInfo = message;
        isPlayingGlobal = true;

        setupOffscreen().then(() => {
            // 오프스크린 엔진으로 실물 재생 명령 전달
            chrome.runtime.sendMessage({
                type: 'PLAY_YOUTUBE',
                target: 'offscreen',
                videoId: message.videoId,
                duration: message.duration
            });
        });

        // UI 상태 동기화용 알림
        chrome.runtime.sendMessage({
            type: 'SONG_CHANGED',
            song: message
        });
    }

    // 상태 정보 조회 요청
    else if (message.type === 'GET_CURRENT_STATE') {
        sendResponse({
            currentSong: currentSongInfo,
            isPlaying: isPlayingGlobal
        });
    }

    // 일시정지 및 재개 제어
    else if (message.type === 'PAUSE_SONG') {
        isPlayingGlobal = false;
        chrome.runtime.sendMessage({ type: 'PAUSE_YOUTUBE', target: 'offscreen' });
    }
    else if (message.type === 'RESUME_SONG') {
        isPlayingGlobal = true;
        chrome.runtime.sendMessage({ type: 'RESUME_YOUTUBE', target: 'offscreen' });
    }

    return true;
});
