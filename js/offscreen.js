/**
 * SimPli Offscreen Engine
 * 서비스 워커의 생명 주기 연장 및 CSP 대응 테스트용
 */

console.log("SimPli Offscreen CSP Engine Started");

// 메시지 수신 테스트
chrome.runtime.onMessage.addListener((message) => {
    if (message.target !== 'offscreen') return;

    if (message.type === 'CHECK_ALIVE') {
        chrome.runtime.sendMessage({ type: 'OFFSCREEN_ALIVE' });
    }
});
