/**
 * Storage Module
 * chrome.storage.local 기반 폴더/곡 CRUD 관리
 */

const Storage = {
    /**
     * 전체 폴더 목록 조회
     * @returns {Promise<Array>} 저장된 폴더 배열
     */
    async getFolders() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['folders'], (result) => {
                resolve(result.folders || []);
            });
        });
    },

    /**
     * 변경된 폴더 목록 저장
     * @param {Array} folders - 저장할 폴더 배열 전체
     * @returns {Promise<void>}
     */
    async saveFolders(folders) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ folders }, () => resolve());
        });
    },

    /**
     * 신규 폴더 생성 및 저장
     * @param {string} name - 생성할 폴더 이름
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
     * ID로 단일 폴더 반환
     * @param {string} id - 조회할 폴더 고유 ID
     * @returns {Promise<Object|null>} 일치하는 폴더 객체, 없으면 null
     */
    async getFolder(id) {
        const folders = await this.getFolders();
        return folders.find(f => f.id === id) || null;
    },

    /**
     * 폴더에 곡 추가 (localId 자동 발급)
     * @param {string} folderId - 대상 폴더 고유 ID
     * @param {Object} songObj - 추가할 곡 정보 (videoId, title, artist 포함)
     * @returns {Promise<void>}
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
    },

    /**
     * localId 기준 곡 삭제
     * @param {string} folderId - 대상 폴더 고유 ID
     * @param {string} localId - 삭제할 곡의 로컬 고유 ID
     * @returns {Promise<void>}
     */
    async removeSongFromFolder(folderId, localId) {
        const folders = await this.getFolders();
        const folderIndex = folders.findIndex(f => f.id === folderId);

        if (folderIndex > -1) {
            folders[folderIndex].songs = folders[folderIndex].songs.filter(s => s.localId !== localId);
            await this.saveFolders(folders);
        }
    }
};
