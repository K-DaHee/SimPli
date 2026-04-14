/**
 * Background Module
 * 사이드 패널 재생 명령 중계 및 상태 관리
 * MV3 서비스 워커 일시 중단에 대비하여 재생 상태를 chrome.storage.local에 영속화
 */

let currentSongId = null;
let isPlayingGlobal = false;
let currentSongInfo = null;

let playingTimer = null;
let currentTime = 0;
let currentDuration = 0;
let autoNextTriggered = false; // 자동 다음 곡 중복 방지 플래그

/**
 * 재생 상태를 스토리지에 영속화
 */
function savePlaybackState() {
    chrome.storage.local.set({
        playbackState: {
            currentSongId,
            isPlayingGlobal,
            currentSongInfo,
            currentTime,
            currentDuration
        }
    });
}

/**
 * 서비스 워커 재기동 시 스토리지에서 상태 복원
 */
async function restorePlaybackState() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['playbackState'], (result) => {
            if (result.playbackState) {
                const s = result.playbackState;
                currentSongId = s.currentSongId;
                isPlayingGlobal = s.isPlayingGlobal;
                currentSongInfo = s.currentSongInfo;
                currentTime = s.currentTime;
                currentDuration = s.currentDuration;
            }
            resolve();
        });
    });
}

// 서비스 워커 시작 시 상태 복원
restorePlaybackState();

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
        autoNextTriggered = false; // 수동 재생 시 플래그 즉시 초기화
        startTimer();
        savePlaybackState();

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

    // 현재 상태 조회 요청 (서비스 워커 재기동 대비 스토리지에서 복원 후 응답)
    else if (message.type === 'GET_CURRENT_STATE') {
        restorePlaybackState().then(() => {
            sendResponse({
                currentSong: currentSongInfo,
                isPlaying: isPlayingGlobal,
                currentTime: currentTime,
                duration: currentDuration
            });
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
        savePlaybackState();
        chrome.runtime.sendMessage({ type: 'PAUSE_YOUTUBE', target: 'offscreen' });
    }
    else if (message.type === 'RESUME_SONG') {
        // 서비스 워커 재기동 시 메모리 상태가 소실될 수 있으므로 복원
        restorePlaybackState().then(() => {
            isPlayingGlobal = true;
            startTimer();
            savePlaybackState();
            setupOffscreenDocument('html/offscreen.html').then(() => {
                chrome.runtime.sendMessage({
                    type: 'RESUME_YOUTUBE',
                    target: 'offscreen',
                    videoId: currentSongId,
                    currentTime: currentTime
                });
            });
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

    // content.js로부터 실시간 진행률 수신 및 곡 종료 감지
    else if (message.type === 'UPDATE_PROGRESS') {
        currentTime = message.currentTime;
        if (message.duration > 0) currentDuration = message.duration;

        // 새 곡이 재생되기 시작하면 중복 방지 플래그 해제
        if (currentTime > 0 && currentTime < 2) {
            autoNextTriggered = false;
        }

        // 곡 종료 감지: 남은 시간 1초 미만
        if (currentDuration > 0 && currentDuration - currentTime < 1 && !autoNextTriggered) {
            autoNextTriggered = true;
            playNextSong();
        }
    }
});

/**
 * 다음 곡 자동 재생
 */
function playNextSong() {
    if (!currentSongInfo || !currentSongInfo.folderId) return;

    chrome.storage.local.get(['folders'], (result) => {
        const folders = result.folders || [];
        const folder = folders.find(f => f.id === currentSongInfo.folderId);
        if (!folder || !folder.songs || folder.songs.length === 0) return;

        const currentIndex = folder.songs.findIndex(s => s.videoId === currentSongId);
        if (currentIndex === -1) return;

        const nextIndex = (currentIndex + 1) % folder.songs.length;
        const nextSong = folder.songs[nextIndex];

        // 자동 재생
        currentSongId = nextSong.videoId;
        currentSongInfo = {
            videoId: nextSong.videoId,
            title: nextSong.title,
            artist: nextSong.artist,
            duration: nextSong.duration || 0,
            folderId: currentSongInfo.folderId
        };
        isPlayingGlobal = true;
        currentTime = 0;
        currentDuration = nextSong.duration || 0;
        // autoNextTriggered는 새로운 영상이 0~2초 사이로 돌아왔을 때 해제됨 (UPDATE_PROGRESS에서)
        startTimer();
        savePlaybackState();

        setupOffscreenDocument('html/offscreen.html').then(() => {
            chrome.runtime.sendMessage({
                type: 'PLAY_YOUTUBE',
                target: 'offscreen',
                videoId: nextSong.videoId,
                title: nextSong.title,
                artist: nextSong.artist,
                duration: nextSong.duration
            });
        });

        // 팝업 UI 갱신
        chrome.runtime.sendMessage({
            type: 'AUTO_NEXT_SONG',
            song: currentSongInfo
        }).catch(() => { });
    });
}
