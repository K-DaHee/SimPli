/**
 * Storage Module
 * chrome.storage.local API 기반 시스템 데이터 CRUD 관리 
 */

const Storage = {
    /**
     * 전체 폴더 목록 조회
     * @returns {Promise<Array>} 폴더 객체 배열
     */
    async getFolders() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['folders'], (result) => {
                resolve(result.folders || []);
            });
        });
    },

    /**
     * 폴더 데이터 상태 동기화 및 덮어쓰기 저장
     * @param {Array} folders - 전체 폴더 배열
     * @returns {Promise<void>}
     */
    async saveFolders(folders) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ folders }, () => resolve());
        });
    },

    /**
     * 신규 폴더 생성 및 저장
     * @param {string} name - 신규 폴더명
     * @returns {Promise<Object>} 생성된 폴더 객체 
     */
    async createFolder(name) {
        const folders = await this.getFolders();
        const newFolder = {
            id: 'folder_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
            name: name,
            createdAt: Date.now(),
            songs: []
        };
        folders.push(newFolder);
        await this.saveFolders(folders);
        return newFolder;
    },

    /**
     * 특정 폴더 객체 단일 조회
     * @param {string} id - 검색용 대상 폴더 ID
     * @returns {Promise<Object|null>} 검색된 폴더 객체 (없을 시 null)
     */
    async getFolder(id) {
        const folders = await this.getFolders();
        return folders.find(f => f.id === id) || null;
    },

    /**
     * 특정 폴더의 내부 리스트에 단일 곡 객체 추가
     * @param {string} folderId - 대상 폴더 ID
     * @param {Object} songObj - 추가할 대상 곡 데이터 객체
     */
    async addSongToFolder(folderId, songObj) {
        const folders = await this.getFolders();
        const folderIndex = folders.findIndex(f => f.id === folderId);

        if (folderIndex > -1) {
            folders[folderIndex].songs.push({
                ...songObj,
                localId: 'song_' + Date.now().toString()
            });
            await this.saveFolders(folders);
        }
    }
};
