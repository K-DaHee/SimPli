/**
 * 🎵 SimPli - YouTube Data API v3 Module
 * API 호출하여 음원을 검색
 */

const API = {
    /**
     * 가수와 제목을 받아 가장 적합한 Official Audio 또는 topic을 검색합니다.
     */
    async searchSong(artist, title) {
        // config.js 에 선언된 변수를 사용합니다.
        const YOUTUBE_API_KEY = CONFIG.YOUTUBE_API_KEY;

        if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === '여기에_실제_API_키를_붙여넣으세요') {
            throw new Error('API 키가 설정되지 않았습니다! js/config.js 파일을 열고 API 키를 붙여넣어 주세요.');
        }

        // 정확도(공식 음원)를 높이기 위한 키워드 조합 마법
        const searchQuery = encodeURIComponent(`${artist} ${title} official audio OR topic`);

        // videoCategoryId=10 (Music 카테고리만 허용)
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=1&q=${searchQuery}&key=${YOUTUBE_API_KEY}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                console.error("YouTube API Error:", data.error);
                throw new Error("할당량 초과 또는 권한 인가 에러입니다. API 제한을 확인하세요.");
            }

            if (data.items && data.items.length > 0) {
                const item = data.items[0];
                return {
                    videoId: item.id.videoId,
                    title: item.snippet.title,
                    artist: item.snippet.channelTitle.replace(' - Topic', ''),
                    thumbnail: item.snippet.thumbnails.default.url
                };
            }
            return null;
        } catch (error) {
            console.error("API Call Failed:", error);
            throw error;
        }
    }
};
