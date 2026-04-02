/**
 * YouTube Data API v3 Module
 * 검색어 기반 YouTube 공식 음원/MV 데이터 조회
 */

const API = {
    /**
     * ISO 8601 기간 형식을 초 단위 숫자로 변환 (예: PT3M20S -> 200)
     * @param {string} duration - ISO 8601 기간 문자열
     * @returns {number} 초 단위 시간
     */
    parseDuration(duration) {
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        const hours = parseInt(match[1] || 0);
        const minutes = parseInt(match[2] || 0);
        const seconds = parseInt(match[3] || 0);
        return hours * 3600 + minutes * 60 + seconds;
    },

    /**
     * 비디오 ID를 기반으로 상세 정보(길이 등) 조회
     * @param {string} videoId - 유튜브 비디오 ID
     * @param {string} apiKey - API 키
     * @returns {Promise<number>} 초 단위 비디오 길이
     */
    async getVideoDuration(videoId, apiKey) {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${apiKey}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.items && data.items.length > 0) {
                return this.parseDuration(data.items[0].contentDetails.duration);
            }
            return 0;
        } catch (e) {
            console.error("데이터 조회 실패:", e);
            return 0;
        }
    },

    /**
     * 가수명과 곡 제목을 기반으로 공식 음원 검색
     * @param {string} artist - 검색할 가수명
     * @param {string} title - 검색할 곡 제목
     * @returns {Promise<Object|null>} 파싱된 비디오 객체 (결과 없을 시 null)
     */
    async searchSong(artist, title) {
        const YOUTUBE_API_KEY = CONFIG.YOUTUBE_API_KEY;

        if (!YOUTUBE_API_KEY) {
            throw new Error('API 키 설정 오류. js/config.js 확인 요망.');
        }

        // 검색어 단순화 (너무 제약이 심하면 결과가 안 나옴)
        const searchQuery = encodeURIComponent(`${artist} ${title}`);
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${searchQuery}&key=${YOUTUBE_API_KEY}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                console.error("YouTube API Error:", data.error);
                throw new Error("API 요청 실패 (할당량 초과 또는 권한 오류).");
            }

            if (data.items && data.items.length > 0) {
                const item = data.items[0];
                const videoId = item.id.videoId;

                // 검색 결과에서 얻은 ID로 영상 길이 추가 조회
                const duration = await this.getVideoDuration(videoId, YOUTUBE_API_KEY);

                return {
                    videoId: videoId,
                    title: item.snippet.title,
                    artist: item.snippet.channelTitle.replace(' - Topic', ''),
                    thumbnail: item.snippet.thumbnails.default.url,
                    duration: duration // 초 단위 길이 추가
                };
            }
            return null;
        } catch (error) {
            console.error("API 호출 실패:", error);
            throw error;
        }
    }
};
