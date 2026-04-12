/**
 * Popup UI Controller
 * 뷰 전환, 곡 목록 렌더링, 재생 제어 메시지 송신, 편집 모드 관리
 */

document.addEventListener('DOMContentLoaded', async () => {

    // 뷰 레이아웃 DOM
    const viewFolderList = document.getElementById('view-folder-list');
    const viewPlaylistDetail = document.getElementById('view-playlist-detail');

    // 메인 홈 DOM
    const folderListContainer = document.getElementById('folder-list');
    const btnAddFolder = document.getElementById('btn-add-folder');
    const addFolderContainer = document.getElementById('add-folder-container');
    const inputFolderName = document.getElementById('input-folder-name');
    const btnSubmitFolder = document.getElementById('btn-submit-folder');
    const btnCancelFolder = document.getElementById('btn-cancel-folder');

    // 플레이리스트 상세 뷰 DOM
    const btnBack = document.getElementById('btn-back');
    const currentFolderName = document.querySelector('.current-folder-name');
    const songListContainer = document.getElementById('song-list');
    const inputArtist = document.getElementById('input-artist');
    const inputTitle = document.getElementById('input-title');
    const btnAddSong = document.getElementById('btn-add-song');
    const btnToggleAddSong = document.getElementById('btn-toggle-add-song');
    const addSongContainer = document.getElementById('add-song-container');
    const btnCancelSong = document.getElementById('btn-cancel-song');

    // 하단 플레이어 DOM
    const trackTitleUI = document.querySelector('.track-title');
    const trackTimeUI = document.getElementById('track-time');
    const progressBar = document.getElementById('progress-bar');
    const masterPlayBtn = document.querySelector('.play-pause span');
    const masterPlayBtnWrapper = document.querySelector('.play-pause');

    // 로컬 UI 상태
    let currentActiveFolderId = null;
    let isPlayingGlobal = false;
    let currentPlayingVideoId = null;
    let playingFolderId = null; // 재생 중인 곡이 속한 폴더 ID
    let isEditMode = false; // 편집 모드 (삭제 아이콘 표시 여부)
    let currentDuration = 0;

    // 팝업 재오픈 시 백그라운드에서 현재 재생 상태 동기화
    chrome.runtime.sendMessage({ type: 'GET_CURRENT_STATE' }, (res) => {
        if (res && res.currentSong && res.currentSong.videoId) {
            currentPlayingVideoId = res.currentSong.videoId;
            playingFolderId = res.currentSong.folderId || null;
            isPlayingGlobal = res.isPlaying;
            trackTitleUI.textContent = `${res.currentSong.title} - ${res.currentSong.artist}`;
            masterPlayBtn.textContent = isPlayingGlobal ? 'pause' : 'play_arrow';

            // 진행률 복구
            if (res.duration > 0) {
                progressBar.style.width = `${(res.currentTime / res.duration) * 100}%`;
                trackTimeUI.textContent = `${formatTime(res.currentTime)} / ${formatTime(res.duration)}`;
            }

            // 마지막으로 보던(재생 중인) 폴더가 있다면 즉시 해당 플레이리스트 뷰로 진입
            if (res.currentSong.folderId) {
                showPlaylistDetailView(res.currentSong.folderId);
            } else if (currentActiveFolderId) {
                renderSongs(currentActiveFolderId);
            }
        }
    });

    // 오프스크린으로부터 재생 진행률 수신 및 프로그레스 바 갱신
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'UPDATE_PROGRESS') {
            const time = msg.currentTime;
            const dur = msg.duration;
            if (dur > 0) {
                currentDuration = dur;
                progressBar.style.width = `${(time / dur) * 100}%`;
                trackTimeUI.textContent = `${formatTime(time)} / ${formatTime(dur)}`;
            }
        }

        // 자동 다음 곡 재생 시 UI 갱신
        if (msg.type === 'AUTO_NEXT_SONG' && msg.song) {
            currentPlayingVideoId = msg.song.videoId;
            playingFolderId = msg.song.folderId;
            isPlayingGlobal = true;
            trackTitleUI.textContent = `${msg.song.title} - ${msg.song.artist}`;
            masterPlayBtn.textContent = 'pause';
            progressBar.style.width = '0%';
            trackTimeUI.textContent = '0:00 / 0:00';

            if (currentActiveFolderId === playingFolderId) {
                renderSongs(currentActiveFolderId);
            }
        }
    });

    // 재생 진행률 바 이벤트 바인딩
    const progressContainer = document.getElementById('progress-container');
    progressContainer.addEventListener('click', (e) => {
        if (!currentPlayingVideoId || currentDuration <= 0) return;

        const rect = progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const percentage = Math.max(0, Math.min(1, clickX / width));
        const seekTime = currentDuration * percentage;

        chrome.runtime.sendMessage({ type: 'SEEK_SONG', time: seekTime });

        progressBar.style.transform = 'none';
        progressBar.style.width = `${percentage * 100}%`;
        trackTimeUI.textContent = `${formatTime(seekTime)} / ${formatTime(currentDuration)}`;
    });

    /**
     * 초 → m:ss 포맷 변환
     * @param {number} sec - 변환할 초 단위 시간
     * @returns {string} "m:ss" 형식 문자열
     */
    function formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    /**
     * 메인 폴더 목록 뷰로 전환
     */
    function showFolderListView() {
        currentActiveFolderId = null;
        viewPlaylistDetail.classList.remove('active');
        viewFolderList.classList.add('active');

        // 헤더 폴더 추가 버튼 복원
        btnAddFolder.style.display = 'flex';

        addFolderContainer.style.display = 'none';
        inputFolderName.value = '';

        renderFolders();
    }

    /**
     * 특정 폴더 상세 뷰로 전환
     * @param {string} folderId - 표시할 폴더 고유 ID
     */
    async function showPlaylistDetailView(folderId) {
        currentActiveFolderId = folderId;
        const folder = await Storage.getFolder(folderId);
        if (!folder) return;

        currentFolderName.textContent = folder.name;

        viewFolderList.classList.remove('active');
        viewPlaylistDetail.classList.add('active');

        // 헤더 폴더 추가 버튼 숨김
        btnAddFolder.style.display = 'none';

        // 편집 모드 초기화
        isEditMode = false;
        document.getElementById('btn-edit-mode').style.color = '#94a3b8';

        addSongContainer.style.display = 'none';
        inputArtist.value = '';
        inputTitle.value = '';

        renderSongs(folderId);
    }

    /**
     * 상세 뷰 곡 목록 렌더링
     * @param {string} folderId - 렌더링할 폴더 고유 ID
     */
    async function renderSongs(folderId) {
        const folder = await Storage.getFolder(folderId);
        songListContainer.innerHTML = '';

        if (!folder || !folder.songs || folder.songs.length === 0) {
            songListContainer.innerHTML = `
                <li style="text-align:center; padding: 24px 10px; color: var(--text-secondary); font-size: 13px;">
                    이 플레이리스트는 비어있습니다.
                </li>`;
            return;
        }

        folder.songs.forEach(song => {
            const li = document.createElement('li');
            li.className = 'song-item';

            // 현재 재생 곡에 활성 스타일 적용
            if (currentPlayingVideoId === song.videoId) {
                li.classList.add('playing');
            }

            // 재생 중 여부에 따른 아이콘 결정
            let icon = 'play_arrow';
            if (currentPlayingVideoId === song.videoId) {
                icon = isPlayingGlobal ? 'pause' : 'play_arrow';
            }

            // 편집 모드: 삭제 아이콘만 / 일반 모드: 재생 버튼만
            li.innerHTML = `
                <div class="song-info">
                    <span class="song-title">${song.title}</span>
                    <span class="song-artist">${song.artist}</span>
                </div>
                <div class="song-actions" style="display:flex; gap:6px; align-items:center;">
                    <button class="delete-song-btn" data-localid="${song.localId}" style="background:none; border:none; cursor:pointer; color:#ef4444; display:${isEditMode ? 'flex' : 'none'}; align-items:center;">
                        <span class="material-icons-round" style="font-size:20px;">delete</span>
                    </button>
                    <button class="play-song-btn" data-vid="${song.videoId}" data-title="${song.title}" data-artist="${song.artist}" data-duration="${song.duration || 0}" style="display:${isEditMode ? 'none' : 'flex'}; align-items:center;">
                        <span class="material-icons-round">${icon}</span>
                    </button>
                </div>
            `;
            songListContainer.appendChild(li);
        });

        // 삭제 버튼 이벤트 바인딩
        songListContainer.querySelectorAll('.delete-song-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm('해당 노래를 리스트에서 삭제하시겠습니까?')) return;
                await Storage.removeSongFromFolder(currentActiveFolderId, btn.getAttribute('data-localid'));
                renderSongs(currentActiveFolderId);
            });
        });

        // 재생 버튼 이벤트 바인딩
        songListContainer.querySelectorAll('.play-song-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const vid = btn.getAttribute('data-vid');
                const title = btn.getAttribute('data-title');
                const artist = btn.getAttribute('data-artist');
                const duration = parseInt(btn.getAttribute('data-duration'), 10) || 0;

                // 같은 곡 클릭 시 재생/일시정지 토글
                if (currentPlayingVideoId === vid) {
                    if (isPlayingGlobal) {
                        chrome.runtime.sendMessage({ type: 'PAUSE_SONG' });
                        masterPlayBtn.textContent = 'play_arrow';
                        isPlayingGlobal = false;
                    } else {
                        chrome.runtime.sendMessage({ type: 'RESUME_SONG' });
                        masterPlayBtn.textContent = 'pause';
                        isPlayingGlobal = true;
                    }
                    renderSongs(currentActiveFolderId);
                    return;
                }

                // 새 곡 재생 + 현재 폴더 ID 함께 전달
                chrome.runtime.sendMessage({
                    type: 'PLAY_SONG',
                    videoId: vid,
                    title,
                    artist,
                    duration,
                    folderId: currentActiveFolderId
                });
                playingFolderId = currentActiveFolderId;
                currentPlayingVideoId = vid;
                isPlayingGlobal = true;
                trackTitleUI.textContent = `${title} - ${artist}`;
                masterPlayBtn.textContent = 'pause';

                renderSongs(currentActiveFolderId);
            });
        });
    }

    /**
     * 폴더 목록 렌더링 (생성 오름차순)
     */
    async function renderFolders() {
        const folders = await Storage.getFolders();
        folderListContainer.innerHTML = '';

        if (folders.length === 0) {
            folderListContainer.innerHTML = `
                <li style="text-align:center; padding: 24px 10px; color: var(--text-secondary); font-size: 14px;">
                    우측 상단 + 아이콘을 눌러 새 플레이리스트를 생성하세요.
                </li>`;
            return;
        }

        folders.sort((a, b) => a.createdAt - b.createdAt).forEach(folder => {
            const li = document.createElement('li');
            li.className = 'folder-item';
            li.innerHTML = `
                <span class="material-icons-round folder-icon">folder</span>
                <span class="folder-name">${folder.name}</span>
            `;
            li.addEventListener('click', () => showPlaylistDetailView(folder.id));
            folderListContainer.appendChild(li);
        });
    }

    // 하단 마스터 재생/일시정지 버튼
    masterPlayBtnWrapper.addEventListener('click', () => {
        if (!currentPlayingVideoId) return;

        if (isPlayingGlobal) {
            chrome.runtime.sendMessage({ type: 'PAUSE_SONG' });
            masterPlayBtn.textContent = 'play_arrow';
            isPlayingGlobal = false;
        } else {
            chrome.runtime.sendMessage({ type: 'RESUME_SONG' });
            masterPlayBtn.textContent = 'pause';
            isPlayingGlobal = true;
        }

        if (currentActiveFolderId) renderSongs(currentActiveFolderId);
    });

    // 하단 이전/다음 곡 버튼
    document.getElementById('btn-prev').addEventListener('click', () => navigateTrack(-1));
    document.getElementById('btn-next').addEventListener('click', () => navigateTrack(1));

    /**
     * 이전/다음 곡 탐색 (방향에 따라 순환)
     */
    async function navigateTrack(direction) {
        if (!playingFolderId || !currentPlayingVideoId) return;

        const folder = await Storage.getFolder(playingFolderId);
        if (!folder || !folder.songs || folder.songs.length === 0) return;

        const currentIndex = folder.songs.findIndex(s => s.videoId === currentPlayingVideoId);
        if (currentIndex === -1) return;

        // 순환 로직 (마지막 곡 → 첫 곡, 첫 곡 → 마지막 곡)
        let nextIndex = currentIndex + direction;
        if (nextIndex < 0) nextIndex = folder.songs.length - 1;
        if (nextIndex >= folder.songs.length) nextIndex = 0;

        const nextSong = folder.songs[nextIndex];

        chrome.runtime.sendMessage({
            type: 'PLAY_SONG',
            videoId: nextSong.videoId,
            title: nextSong.title,
            artist: nextSong.artist,
            duration: nextSong.duration || 0,
            folderId: playingFolderId
        });

        currentPlayingVideoId = nextSong.videoId;
        isPlayingGlobal = true;
        trackTitleUI.textContent = `${nextSong.title} - ${nextSong.artist}`;
        masterPlayBtn.textContent = 'pause';

        if (currentActiveFolderId === playingFolderId) {
            renderSongs(currentActiveFolderId);
        }
    }

    // 곡 추가 폼 토글 (헤더 playlist_add 아이콘)
    btnToggleAddSong.addEventListener('click', () => {
        if (addSongContainer.style.display === 'none') {
            addSongContainer.style.display = 'flex';
            inputArtist.focus();
        } else {
            addSongContainer.style.display = 'none';
        }
    });

    btnCancelSong.addEventListener('click', () => {
        addSongContainer.style.display = 'none';
        inputArtist.value = '';
        inputTitle.value = '';
    });

    // 편집 모드 토글 (헤더 more_vert 아이콘)
    document.getElementById('btn-edit-mode').addEventListener('click', () => {
        isEditMode = !isEditMode;
        const btn = document.getElementById('btn-edit-mode');
        btn.style.color = isEditMode ? 'var(--primary-color)' : '#94a3b8';
        if (currentActiveFolderId) renderSongs(currentActiveFolderId);
    });

    // 폴더 추가 폼 토글
    btnAddFolder.addEventListener('click', () => {
        addFolderContainer.style.display = 'flex';
        inputFolderName.focus();
    });

    btnCancelFolder.addEventListener('click', () => {
        addFolderContainer.style.display = 'none';
        inputFolderName.value = '';
    });

    /**
     * 폴더 이름 입력 후 신규 폴더 생성
     */
    async function submitFolder() {
        const folderName = inputFolderName.value.trim();
        if (folderName !== '') {
            await Storage.createFolder(folderName);
            inputFolderName.value = '';
            addFolderContainer.style.display = 'none';
            renderFolders();
        }
    }

    btnSubmitFolder.addEventListener('click', submitFolder);
    inputFolderName.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitFolder();
    });

    btnBack.addEventListener('click', () => showFolderListView());

    /**
     * 곡 검색 및 스토리지 저장
     */
    async function submitSong() {
        const artist = inputArtist.value.trim();
        const title = inputTitle.value.trim();

        if (!artist || !title || !currentActiveFolderId) {
            alert('가수명과 노래 제목을 입력하세요.');
            return;
        }

        // 로딩 아이콘으로 일시 교체
        btnAddSong.innerHTML = '<span class="material-icons-round">hourglass_empty</span>';

        try {
            const songData = await API.searchSong(artist, title);

            if (songData) {
                await Storage.addSongToFolder(currentActiveFolderId, songData);
                inputArtist.value = '';
                inputTitle.value = '';
                renderSongs(currentActiveFolderId);
                addSongContainer.style.display = 'none';
            } else {
                alert('검색 결과가 없습니다.');
            }
        } catch (error) {
            alert(error.message);
        } finally {
            btnAddSong.innerHTML = '<span class="material-icons-round">search</span> 추가';
        }
    }

    // 곡 검색 버튼 및 엔터키 바인딩
    btnAddSong.addEventListener('click', submitSong);
    inputArtist.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitSong();
    });
    inputTitle.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitSong();
    });

    renderFolders();
});
