/**
 * SimPli God Mode Content Script
 * 유튜브 IFrame 내부 UI 은폐, 자동 재생 및 광고 스킵 수행
 */

(function () {
    console.log("심플리 컨텐츠 스크립트 로드됨");

    // 확장프로그램에서 호출한 경우에만 동작 확인
    if (document.referrer && !document.referrer.includes(chrome.runtime.id)) {
        console.log("심플리: 확장프로그램 호출이 아닌 것으로 판단되어 중단합니다.");
        // return;
    }

    // 불필요한 UI 요소 은폐 (오직 재생 화면에만 집중)
    const style = document.createElement('style');
    style.textContent = `
        #masthead-container, #secondary, #comments, .ytp-chrome-top, .ytp-pause-overlay { display: none !important; }
        video { width: 100% !important; height: 100% !important; }
    `;
    document.head.appendChild(style);

    /**
     * 광고 탐지 및 즉시 건너뛰기
     */
    function skipAds() {
        // 스킵 버튼 탐지 시 즉시 클릭
        const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-slot');
        if (skipBtn) {
            console.log("심플리: 광고 건너뛰기 버튼 발견, 클릭을 시도합니다.");
            skipBtn.click();
        }

        // 광고 영상 재생 중일 경우 강제 이동 (시간 점프)
        const video = document.querySelector('video');
        const adShowing = document.querySelector('.ad-showing, .ad-interrupting');

        if (video && adShowing) {
            console.log("심플리: 광고 재생 중임을 감지했습니다. 끝으로 이동합니다.");
            if (isFinite(video.duration)) {
                video.currentTime = video.duration - 0.1;
                video.play().catch(() => { }); // 끊김 방지를 위한 즉시 재생 시도
            }
        }
    }

    /**
     * 비디오 자동 재생 시도
     */
    function tryPlay() {
        const video = document.querySelector('video');
        if (video && video.paused) {
            video.play().catch(() => {
                const playBtn = document.querySelector('.ytp-play-button');
                if (playBtn) playBtn.click();
            });
        }
    }

    // 주기적 모니터링 수행 (매우 빠른 주기로 체크하여 끊김 최소화)
    const timer = setInterval(() => {
        const video = document.querySelector('video');
        if (video) {
            tryPlay();
            skipAds();
        }
    }, 500);

    console.log("심플리: 광고 모니터링 활성화됨.");
})();
