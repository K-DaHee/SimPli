/**
 * Background Module
 * 사이드 패널 재생 명령 중계 및 상태 관리
 */

let currentSongId = null;
let isPlayingGlobal = false;
let currentSongInfo = null;

// 메시지 라우팅 및 상태 제어
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 노래 재생 명령
    if (message.type === 'PLAY_SONG') {
        currentSongId = message.videoId;
        currentSongInfo = message;
        isPlayingGlobal = true;

        chrome.runtime.sendMessage({
            type: 'PLAY_YOUTUBE',
            target: 'player',
            videoId: message.videoId,
            title: message.title,
            artist: message.artist,
            duration: message.duration
        });
    }

    // 현재 상태 조회 요청
    else if (message.type === 'GET_CURRENT_STATE') {
        sendResponse({
            currentSong: currentSongInfo,
            isPlaying: isPlayingGlobal
        });
    }

    // 재생 및 일시정지 제어
    else if (message.type === 'PAUSE_SONG') {
        isPlayingGlobal = false;
        chrome.runtime.sendMessage({ type: 'PAUSE_YOUTUBE', target: 'player' });
    }
    else if (message.type === 'RESUME_SONG') {
        isPlayingGlobal = true;
        chrome.runtime.sendMessage({ type: 'RESUME_YOUTUBE', target: 'player' });
    }

    return true;
});
