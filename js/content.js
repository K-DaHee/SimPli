/**
 * 유튜브 UI 은폐 및 광고 자동 재생 제어 스크립트
 */

(function () {
    console.log("컨텐츠 스크립트 시작");

    // 불필요한 UI 요소 은폐
    const style = document.createElement('style');
    style.textContent = `
        #masthead-container, #secondary, #comments, .ytp-chrome-top, .ytp-pause-overlay, .ytp-ad-module { display: none !important; }
        video { width: 100% !important; height: 100% !important; }
    `;
    document.head.appendChild(style);

    /**
     * 광고 탐지 및 스킵
     */
    function skipAds() {
        const video = document.querySelector('video');
        const adShowing = document.querySelector('.ad-showing, .ad-interrupting');

        if (video && adShowing) {
            // 광고 중이면 음소거 및 끝으로 이동
            video.muted = true;
            if (isFinite(video.duration)) {
                video.currentTime = video.duration - 0.1;
            }

            // 스킵 버튼 클릭 시도
            const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-slot');
            if (skipBtn) skipBtn.click();

            video.play().catch(() => { });
        } else if (video && video.muted) {
            // 일반 영상 재생 시 음소거 해제
            video.muted = false;
        }
    }

    /**
     * 비디오 재생 시도
     */
    function playVideo() {
        const video = document.querySelector('video');
        if (video && video.paused && !document.querySelector('.ad-showing')) {
            video.play().catch(() => {
                const playBtn = document.querySelector('.ytp-play-button');
                if (playBtn) playBtn.click();
            });
        }
    }

    // 100ms 주기로 상태 확인
    setInterval(() => {
        skipAds();
        playVideo();
    }, 100);

    console.log("광고 감시 중");
})();
