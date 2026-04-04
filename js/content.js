/**
 * SimPli God Mode Content Script
 * 유튜브 IFrame 내부 UI 은폐 및 자동 재생 수행
 */

(function () {
    // 확장프로그램에서 호출한 경우에만 동작 확인
    if (!document.referrer.includes(chrome.runtime.id)) return;

    // 불필요한 UI 요소 은폐
    const style = document.createElement('style');
    style.textContent = `
        #masthead-container, #secondary, #comments, .ytp-chrome-top, .ytp-pause-overlay { display: none !important; }
        video { width: 100% !important; height: 100% !important; }
    `;
    document.head.appendChild(style);

    /**
     * 비디오 자동 재생 시도
     */
    function tryPlay() {
        const video = document.querySelector('video');
        if (video) {
            video.play().catch(() => {
                const playBtn = document.querySelector('.ytp-play-button');
                if (playBtn) playBtn.click();
            });
        }
    }

    // 영상 로드 완료 시 자동 재생 실행
    const timer = setInterval(() => {
        const video = document.querySelector('video');
        if (video && video.readyState >= 2) {
            tryPlay();
            clearInterval(timer);
        }
    }, 1000);
})();
