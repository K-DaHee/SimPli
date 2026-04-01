/**
 * Popup UI Controller
 * UI 이벤트 바인딩, 화면 렌더링, 오프스크린 메시지 송신 로직 제어
 */

document.addEventListener('DOMContentLoaded', async () => {

    // 뷰 레이아웃 DOM 요소 정의
    const viewFolderList = document.getElementById('view-folder-list');
    const viewPlaylistDetail = document.getElementById('view-playlist-detail');

    // 메인 홈 화면 DOM 요의
    const folderListContainer = document.getElementById('folder-list');
    const btnAddFolder = document.getElementById('btn-add-folder');
    const addFolderContainer = document.getElementById('add-folder-container');
    const inputFolderName = document.getElementById('input-folder-name');
    const btnSubmitFolder = document.getElementById('btn-submit-folder');
    const btnCancelFolder = document.getElementById('btn-cancel-folder');

    // 플레이리스트 상세 뷰 DOM 요의
    const btnBack = document.getElementById('btn-back');
    const currentFolderName = document.querySelector('.current-folder-name');
    const songListContainer = document.getElementById('song-list');
    const inputArtist = document.getElementById('input-artist');
    const inputTitle = document.getElementById('input-title');
    const btnAddSong = document.getElementById('btn-add-song');

    // 하단 고정 재생 컨트롤러 DOM 
    const trackTitleUI = document.querySelector('.track-title');
    const masterPlayBtn = document.querySelector('.play-pause span');
    const masterPlayBtnWrapper = document.querySelector('.play-pause');

    // 클라이언트 UI 로컬 상태 관리 
    let currentActiveFolderId = null;
    let isPlayingGlobal = false;
    let currentPlayingVideoId = null;

    /**
     * 메인 화면(폴더 목록) 상태 전환
     */
    function showFolderListView() {
        currentActiveFolderId = null;
        viewPlaylistDetail.classList.remove('active');
        viewFolderList.classList.add('active');

        // 폼 닫기 초기화
        addFolderContainer.style.display = 'none';
        inputFolderName.value = '';

        renderFolders();
    }

    /**
     * 선택된 폴더 상세 뷰 상태 전환
     * @param {string} folderId - 대상 폴더 고유 ID
     */
    async function showPlaylistDetailView(folderId) {
        currentActiveFolderId = folderId;
        const folder = await Storage.getFolder(folderId);
        if (!folder) return;

        currentFolderName.textContent = folder.name;

        viewFolderList.classList.remove('active');
        viewPlaylistDetail.classList.add('active');

        renderSongs(folderId);
    }

    /**
     * 상세 뷰 내부 곡 목록 동적 렌더링
     * @param {string} folderId - 대상 폴더 고유 ID
     */
    async function renderSongs(folderId) {
        const folder = await Storage.getFolder(folderId);
        songListContainer.innerHTML = '';

        // 배열 공백 시 안내 UI 노출
        if (!folder || !folder.songs || folder.songs.length === 0) {
            songListContainer.innerHTML = `
                <li style="text-align:center; padding: 24px 10px; color: var(--text-secondary); font-size: 13px;">
                    이 플레이리스트는 비어있습니다.
                </li>`;
            return;
        }

        // 리스트 동적 렌더링
        folder.songs.forEach(song => {
            const li = document.createElement('li');
            li.className = 'song-item';

            // 재생 중인 곡 활성화 스타일 매핑
            if (currentPlayingVideoId === song.videoId) {
                li.classList.add('playing');
            }

            const isCurrentPlaying = (currentPlayingVideoId === song.videoId && isPlayingGlobal);

            li.innerHTML = `
                <div class="song-info">
                    <span class="song-title">${song.title}</span>
                    <span class="song-artist">${song.artist}</span>
                </div>
                <button class="play-song-btn" data-vid="${song.videoId}" data-title="${song.title}" data-artist="${song.artist}">
                    <span class="material-icons-round">${isCurrentPlaying ? 'equalizer' : 'play_arrow'}</span>
                </button>
            `;
            songListContainer.appendChild(li);
        });

        // 렌더링된 재생 버튼 노드에 메시지 송신 이벤트 바인딩
        const playBtns = songListContainer.querySelectorAll('.play-song-btn');
        playBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const vid = btn.getAttribute('data-vid');
                const title = btn.getAttribute('data-title');
                const artist = btn.getAttribute('data-artist');

                chrome.runtime.sendMessage({
                    type: 'PLAY_SONG',
                    videoId: vid
                });

                currentPlayingVideoId = vid;
                isPlayingGlobal = true;
                trackTitleUI.textContent = `${title} - ${artist}`;
                masterPlayBtn.textContent = 'pause';

                // UI 상태 갱신
                renderSongs(currentActiveFolderId);
            });
        });
    }

    /**
     * 메인 화면 내 최상위 폴더 목록 동적 렌더링
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

        // 폴더 생성 오름차순 기준으로 UI 배치
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

    // 마스터 컨트롤러 버튼 재생/일시정지 상태 제어
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

        if (currentActiveFolderId) {
            renderSongs(currentActiveFolderId);
        }
    });

    // 신규 폴더 생성 폼 속성 토글 
    btnAddFolder.addEventListener('click', () => {
        addFolderContainer.style.display = 'flex';
        inputFolderName.focus();
    });

    btnCancelFolder.addEventListener('click', () => {
        addFolderContainer.style.display = 'none';
        inputFolderName.value = '';
    });

    /**
     * 인풋 조회 및 데이터 추가 로직 처리 구역
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

    // 네비게이션 뒤로가기 버튼
    btnBack.addEventListener('click', () => {
        showFolderListView();
    });

    // 곡 검색, 데이터 반환 및 스토리지 저장 제어
    btnAddSong.addEventListener('click', async () => {
        const artist = inputArtist.value.trim();
        const title = inputTitle.value.trim();

        if (!artist || !title || !currentActiveFolderId) {
            alert('가수명과 노래 제목을 입력하세요.');
            return;
        }

        // 로딩 플래그 아이콘 치환
        btnAddSong.innerHTML = '<span class="material-icons-round">hourglass_empty</span>';

        try {
            const songData = await API.searchSong(artist, title);

            if (songData) {
                await Storage.addSongToFolder(currentActiveFolderId, songData);
                inputArtist.value = '';
                inputTitle.value = '';
                renderSongs(currentActiveFolderId);
            } else {
                alert('검색 결과가 없습니다.');
            }
        } catch (error) {
            alert(error.message);
        } finally {
            // 통신 완료 후 아이콘 복원
            btnAddSong.innerHTML = '<span class="material-icons-round">add</span>';
        }
    });

    // 초기 랜더링 트리거
    renderFolders();
});
