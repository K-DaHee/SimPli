/**
 * 🎵 SimPli - Storage Module
 * chrome.storage.local 을 활용한 내부 데이터베이스 통신
 */

const Storage = {
    // 모든 플레이리스트(폴더) 가져오기
    async getFolders() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['folders'], (result) => {
                resolve(result.folders || []);
            });
        });
    },

    // 데이터를 스토리지에 덮어씌워서 저장하기
    async saveFolders(folders) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ folders }, () => resolve());
        });
    },

    // 새 플레이리스트(폴더) 생성
    async createFolder(name) {
        const folders = await this.getFolders();
        const newFolder = {
            id: 'folder_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7), // 고유 ID 부여
            name: name,
            createdAt: Date.now(),
            songs: [] // 추후 검색해서 담을 노래들
        };
        folders.push(newFolder);
        await this.saveFolders(folders);
        return newFolder;
    },

    // 특정 ID의 플레이리스트 정보 가져오기
    async getFolder(id) {
        const folders = await this.getFolders();
        return folders.find(f => f.id === id) || null;
    },

    // 특정 폴더에 음악 추가하기
    async addSongToFolder(folderId, songObj) {
        const folders = await this.getFolders();
        const folderIndex = folders.findIndex(f => f.id === folderId);

        if (folderIndex > -1) {
            // 고유 식별자 추가해서 리스트에 푸시
            folders[folderIndex].songs.push({
                ...songObj,
                localId: 'song_' + Date.now().toString()
            });
            await this.saveFolders(folders);
        }
    }
};
