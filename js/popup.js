/**
 * SimPli Popup Controller
 * 팝업 UI 제어 및 재생 명령 전달
 */

document.addEventListener('DOMContentLoaded', async () => {
    // UI 요소 매핑
    const folderListContainer = document.getElementById('folder-list');
    const songListContainer = document.getElementById('song-list');
    const btnBack = document.getElementById('btn-back');
    const currentFolderNameEl = document.querySelector('.current-folder-name');
    const viewFolderList = document.getElementById('view-folder-list');
    const viewPlaylistDetail = document.getElementById('view-playlist-detail');
    const trackTitleUI = document.querySelector('.track-title');
    const progressBar = document.getElementById('progress-bar');
    const trackTimeUI = document.getElementById('track-time');
    const btnMasterPlay = document.getElementById('btn-master-play');

    // 기능 버튼 및 컨테이너
    const btnAddFolder = document.getElementById('btn-add-folder');
    const addFolderContainer = document.getElementById('add-folder-container');
    const inputFolderName = document.getElementById('input-folder-name');
    const btnSubmitFolder = document.getElementById('btn-submit-folder');
    const btnCancelFolder = document.getElementById('btn-cancel-folder');

    const btnToggleAddSong = document.getElementById('btn-toggle-add-song');
    const addSongContainer = document.getElementById('add-song-container');
    const inputArtist = document.getElementById('input-artist');
    const inputTitle = document.getElementById('input-title');
    const btnAddSong = document.getElementById('btn-add-song');
    const btnCancelSong = document.getElementById('btn-cancel-song');
    const btnEditMode = document.getElementById('btn-edit-mode');

    let currentActiveFolderId = null;
    let currentPlayingVideoId = null;
    let isPlayingGlobal = false;
    let isEditMode = false;

    // 초기 재생 상태 동기화
    chrome.runtime.sendMessage({ type: 'GET_CURRENT_STATE' }, (response) => {
        if (response && response.currentSong && response.currentSong.videoId) {
            currentPlayingVideoId = response.currentSong.videoId;
            trackTitleUI.innerHTML = response.currentSong.title; // 엔티티 디코딩
            isPlayingGlobal = response.isPlaying || false;
            updateMasterPlayIcon();

            // 재생 정보에 폴더 ID가 있다면 자동으로 해당 폴더 뷰 진입
            if (response.currentSong.folderId) {
                currentActiveFolderId = response.currentSong.folderId;
                Storage.getFolder(currentActiveFolderId).then(folder => {
                    if (folder) openFolder(folder);
                });
            }
        }
    });

    /**
     * 폴더 목록 렌더링
     */
    async function renderFolders() {
        const playlists = await Storage.getFolders();
        folderListContainer.innerHTML = '';
        playlists.forEach(folder => {
            const li = document.createElement('li');
            li.className = 'folder-item';
            li.style.cursor = 'pointer';
            li.innerHTML = `
                <span class="material-icons-round">folder</span>
                <span class="folder-name">${folder.name}</span>
                <span class="song-count">${folder.songs.length}곡</span>
            `;
            li.addEventListener('click', () => openFolder(folder));
            folderListContainer.appendChild(li);
        });
    }

    /**
     * 폴더 상세 보기 전환
     */
    function openFolder(folder) {
        currentActiveFolderId = folder.id;
        currentFolderNameEl.textContent = folder.name;
        viewFolderList.style.display = 'none';
        viewPlaylistDetail.style.display = 'block';
        renderSongs(folder.id);
        chrome.runtime.sendMessage({ type: 'SET_ACTIVE_FOLDER', folderId: folder.id });
    }

    /**
     * 노래 목록 렌더링
     */
    async function renderSongs(folderId) {
        const folder = await Storage.getFolder(folderId);
        songListContainer.innerHTML = '';
        if (!folder || folder.songs.length === 0) {
            songListContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#94a3b8; font-size:13px;">추가된 노래가 없습니다.</div>';
            return;
        }

        folder.songs.forEach(song => {
            const li = document.createElement('li');
            li.className = 'song-item';
            if (currentPlayingVideoId === song.videoId) li.classList.add('playing');

            let icon = (currentPlayingVideoId === song.videoId && isPlayingGlobal) ? 'pause' : 'play_arrow';

            li.innerHTML = `
                <div class="song-info">
                    <span class="song-title">${song.title}</span>
                    <span class="song-artist">${song.artist}</span>
                </div>
                <div class="song-actions" style="display:flex; gap:8px;">
                    <button class="delete-btn" style="display:${isEditMode ? 'block' : 'none'}; background:none; border:none; color:#ef4444; cursor:pointer;">
                        <span class="material-icons-round" style="font-size:20px;">delete</span>
                    </button>
                    <button class="play-song-btn" style="display:${isEditMode ? 'none' : 'block'}; background:none; border:none; color:inherit; cursor:pointer;">
                        <span class="material-icons-round">${icon}</span>
                    </button>
                </div>
            `;

            li.querySelector('.play-song-btn').addEventListener('click', () => handlePlayClick(song));
            li.querySelector('.delete-btn').addEventListener('click', async () => {
                if (confirm('이 곡을 삭제할까요?')) {
                    await Storage.removeSongFromFolder(currentActiveFolderId, song.localId);
                    renderSongs(currentActiveFolderId);
                }
            });

            songListContainer.appendChild(li);
        });
    }

    /**
     * 노래 재생 버튼 클릭 핸들러
     */
    function handlePlayClick(song) {
        if (currentPlayingVideoId === song.videoId) {
            if (isPlayingGlobal) {
                chrome.runtime.sendMessage({ type: 'PAUSE_SONG' });
                isPlayingGlobal = false;
            } else {
                chrome.runtime.sendMessage({ type: 'RESUME_SONG' });
                isPlayingGlobal = true;
            }
            updateMasterPlayIcon();
            renderSongs(currentActiveFolderId);
            return;
        }

        currentPlayingVideoId = song.videoId;
        isPlayingGlobal = true;
        trackTitleUI.innerHTML = song.title; // 엔티티 디코딩
        updateMasterPlayIcon();

        const playMsg = {
            type: 'PLAY_SONG',
            videoId: song.videoId,
            title: song.title,
            artist: song.artist,
            duration: song.duration,
            folderId: currentActiveFolderId // [복구] 폴더 정보 전송
        };

        setTimeout(() => chrome.runtime.sendMessage(playMsg), 400);
        renderSongs(currentActiveFolderId);
    }

    /**
     * 마스터 재생 버튼 아이콘 업데이트
     */
    function updateMasterPlayIcon() {
        btnMasterPlay.querySelector('.material-icons-round').textContent = isPlayingGlobal ? 'pause' : 'play_arrow';
    }

    // 뒤로 가기
    btnBack.addEventListener('click', () => {
        viewPlaylistDetail.style.display = 'none';
        viewFolderList.style.display = 'block';
        isEditMode = false;
        renderFolders();
    });

    // 폴더 추가 섹션 토글
    btnAddFolder.addEventListener('click', () => {
        addFolderContainer.style.display = addFolderContainer.style.display === 'none' ? 'flex' : 'none';
        if (addFolderContainer.style.display === 'flex') inputFolderName.focus();
    });

    btnCancelFolder.addEventListener('click', () => addFolderContainer.style.display = 'none');

    // 새 폴더 만들기
    btnSubmitFolder.addEventListener('click', async () => {
        const name = inputFolderName.value.trim();
        if (!name) return;
        await Storage.createFolder(name);
        inputFolderName.value = '';
        addFolderContainer.style.display = 'none';
        renderFolders();
    });

    // 노래 추가 섹션 토글
    btnToggleAddSong.addEventListener('click', () => {
        addSongContainer.style.display = addSongContainer.style.display === 'none' ? 'flex' : 'none';
    });

    btnCancelSong.addEventListener('click', () => addSongContainer.style.display = 'none');

    // 노래 검색 및 추가
    btnAddSong.addEventListener('click', async () => {
        const artist = inputArtist.value.trim();
        const title = inputTitle.value.trim();
        if (!artist || !title) return;

        btnAddSong.disabled = true;
        btnAddSong.textContent = '검색 중...';

        try {
            const video = await API.searchSong(artist, title);
            if (video) {
                await Storage.addSongToFolder(currentActiveFolderId, video);
                inputArtist.value = '';
                inputTitle.value = '';
                addSongContainer.style.display = 'none';
                renderSongs(currentActiveFolderId);
            } else {
                alert('영상을 찾을 수 없습니다.');
            }
        } finally {
            btnAddSong.disabled = false;
            btnAddSong.textContent = '추가';
        }
    });

    // 편집 모드 토글
    btnEditMode.addEventListener('click', () => {
        isEditMode = !isEditMode;
        renderSongs(currentActiveFolderId);
    });

    /**
     * 재생 시간을 mm:ss 형식으로 포맷팅
     * @param {number} seconds 
     */
    function formatTime(seconds) {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // 메시지 수신 핸들러 (진행률 및 곡 변경)
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'UPDATE_PROGRESS') {
            const percent = (message.currentTime / message.duration) * 100;
            progressBar.style.width = `${percent}%`;
            trackTimeUI.textContent = `${formatTime(message.currentTime)} / ${formatTime(message.duration)}`;
        } else if (message.type === 'SONG_CHANGED') {
            currentPlayingVideoId = message.song.videoId;
            trackTitleUI.innerHTML = message.song.title; // 엔티티 디코딩
            renderSongs(currentActiveFolderId);
        }
    });

    // 마스터 플레이 버튼 제어
    btnMasterPlay.addEventListener('click', () => {
        if (!currentPlayingVideoId) return;
        if (isPlayingGlobal) {
            chrome.runtime.sendMessage({ type: 'PAUSE_SONG' });
            isPlayingGlobal = false;
        } else {
            chrome.runtime.sendMessage({ type: 'RESUME_SONG' });
            isPlayingGlobal = true;
        }
        updateMasterPlayIcon();
        renderSongs(currentActiveFolderId);
    });

    // 초기 목록 렌더링
    renderFolders();
});
