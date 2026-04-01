/**
 * YouTube Data API v3 Module
 * 검색어 기반 YouTube 공식 음원/MV 데이터 조회
 */

const API = {
    /**
     * 가수명과 곡 제목을 기반으로 공식 음원 검색
     * @param {string} artist - 검색할 가수명
     * @param {string} title - 검색할 곡 제목
     * @returns {Promise<Object|null>} 파싱된 비디오 객체 (결과 없을 시 null)
     */
    async searchSong(artist, title) {
        const YOUTUBE_API_KEY = CONFIG.YOUTUBE_API_KEY;

        if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === '여기에_실제_API_키를_붙여넣으세요') {
            throw new Error('API 키 설정 오류. js/config.js 확인 요망.');
        }

        // 공식 오디오 검색 최적화 쿼리
        const searchQuery = encodeURIComponent(`${artist} ${title} official audio OR topic`);

        // 검색 API 엔드포인트 (Music 카테고리 한정)
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=1&q=${searchQuery}&key=${YOUTUBE_API_KEY}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            // 인증 및 할당량 에러 처리
            if (data.error) {
                console.error("YouTube API Error:", data.error);
                throw new Error("API 요청 실패 (할당량 초과 또는 권한 오류).");
            }

            if (data.items && data.items.length > 0) {
                const item = data.items[0];
                return {
                    videoId: item.id.videoId,
                    title: item.snippet.title,
                    // 'Topic' 자동 생성 채널명 정리
                    artist: item.snippet.channelTitle.replace(' - Topic', ''),
                    thumbnail: item.snippet.thumbnails.default.url
                };
            }
            return null; // 검색 결과 없음
        } catch (error) {
            console.error("API Call Failed:", error);
            throw error; // 상위 에러 전파
        }
    }
};
