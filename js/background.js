/**
 * Background Module
 * 사이드 패널 재생 명령 중계 및 상태 관리
 */

let currentSongId = null;
let isPlayingGlobal = false;
let currentSongInfo = null;

let playingTimer = null;
let currentTime = 0;
let currentDuration = 0;

let creating; // 오프스크린 생성 Promise 캐싱
async function setupOffscreenDocument(path) {
    const offscreenUrl = chrome.runtime.getURL(path);
    // 기존 오프스크린 문서가 열려있는지 확인
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [offscreenUrl]
    });

    if (existingContexts.length > 0) {
        return;
    }

    if (creating) {
        await creating;
    } else {
        creating = chrome.offscreen.createDocument({
            url: path,
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'background music playback'
        });
        await creating;
        creating = null;
    }
}

function startTimer() {
    if (playingTimer !== null) {
        clearInterval(playingTimer);
        playingTimer = null;
    }
    playingTimer = setInterval(() => {
        if (currentTime < currentDuration) {
            currentTime++;
        } else {
            // 끝까지 도달하면 자동 정지
            clearInterval(playingTimer);
            playingTimer = null;
            isPlayingGlobal = false;
        }
    }, 1000);
}

// 메시지 라우팅 및 상태 제어
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 노래 재생 명령
    if (message.type === 'PLAY_SONG') {
        currentSongId = message.videoId;
        currentSongInfo = message;
        isPlayingGlobal = true;

        currentTime = 0;
        currentDuration = message.duration || 0;
        startTimer();

        // 오프스크린 준비 후 재생 명령 발송
        setupOffscreenDocument('html/offscreen.html').then(() => {
            chrome.runtime.sendMessage({
                type: 'PLAY_YOUTUBE',
                target: 'offscreen',
                videoId: message.videoId,
                title: message.title,
                artist: message.artist,
                duration: message.duration
            });
        });
    }

    // 현재 상태 조회 요청
    else if (message.type === 'GET_CURRENT_STATE') {
        sendResponse({
            currentSong: currentSongInfo,
            isPlaying: isPlayingGlobal,
            currentTime: currentTime,
            duration: currentDuration
        });
        return true;
    }

    // 재생 및 일시정지 제어
    else if (message.type === 'PAUSE_SONG') {
        isPlayingGlobal = false;
        if (playingTimer !== null) {
            clearInterval(playingTimer);
            playingTimer = null;
        }
        chrome.runtime.sendMessage({ type: 'PAUSE_YOUTUBE', target: 'offscreen' });
    }
    else if (message.type === 'RESUME_SONG') {
        isPlayingGlobal = true;
        startTimer();
        setupOffscreenDocument('html/offscreen.html').then(() => {
            chrome.runtime.sendMessage({ type: 'RESUME_YOUTUBE', target: 'offscreen' });
        });
    }
    // 재생 위치 탐색 제어
    else if (message.type === 'SEEK_SONG') {
        currentTime = message.time;
        if (currentTime < 0) currentTime = 0;
        if (currentTime > currentDuration) currentTime = currentDuration;

        chrome.tabs.query({ url: "https://www.youtube.com/watch*" }, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { type: 'SEEK_YOUTUBE', time: message.time }).catch(() => { });
            });
        });
        chrome.runtime.sendMessage({ type: 'SEEK_YOUTUBE', time: message.time }).catch(() => { });
    }
});
