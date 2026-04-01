/**
 * 🎵 SimPli - Popup Controller
 * UI 화면 전환 및 데이터 렌더링
 */

document.addEventListener('DOMContentLoaded', async () => {

    // DOM 요소 가져오기
    const viewFolderList = document.getElementById('view-folder-list');
    const viewPlaylistDetail = document.getElementById('view-playlist-detail');

    const folderListContainer = document.getElementById('folder-list');
    const btnAddFolder = document.getElementById('btn-add-folder');

    // 폴더 생성 폼 요소
    const addFolderContainer = document.getElementById('add-folder-container');
    const inputFolderName = document.getElementById('input-folder-name');
    const btnSubmitFolder = document.getElementById('btn-submit-folder');
    const btnCancelFolder = document.getElementById('btn-cancel-folder');

    // 특정 폴더 상세 화면 컨트롤
    const btnBack = document.getElementById('btn-back');
    const currentFolderName = document.querySelector('.current-folder-name');
    const songListContainer = document.getElementById('song-list');

    // 상태 변수
    let currentActiveFolderId = null;

    // 뷰 전환 제어 함수
    function showFolderListView() {
        currentActiveFolderId = null;
        viewPlaylistDetail.classList.remove('active');
        viewFolderList.classList.add('active');

        // 입력 폼 숨기기 초기화
        addFolderContainer.style.display = 'none';
        inputFolderName.value = '';

        renderFolders(); // 메인 화면으로 나올 때 목록 갱신
    }

    async function showPlaylistDetailView(folderId) {
        currentActiveFolderId = folderId;
        const folder = await Storage.getFolder(folderId);
        if (!folder) return;

        // 선택한 폴더명으로 상단 타이틀 갱신
        currentFolderName.textContent = folder.name;

        // 뷰 교체
        viewFolderList.classList.remove('active');
        viewPlaylistDetail.classList.add('active');

        // 노래 리스트 초기화 (추후 추가)
        songListContainer.innerHTML = '';
    }

    // 렌더링 로직 (UI 그리기)
    async function renderFolders() {
        const folders = await Storage.getFolders();
        folderListContainer.innerHTML = '';

        // 저장된 폴더가 없을 경우 안내 문구 노출
        if (folders.length === 0) {
            folderListContainer.innerHTML = `
                <li style="text-align:center; padding: 24px 10px; color: var(--text-secondary); font-size: 14px;">
                    우측 상단 ➕ 폴더 아이콘을 눌러<br>새 플레이리스트를 만들어보세요!
                </li>`;
            return;
        }

        // 생성 시간 순(오름차순)으로 렌더링
        folders.sort((a, b) => a.createdAt - b.createdAt).forEach(folder => {
            const li = document.createElement('li');
            li.className = 'folder-item';
            li.innerHTML = `
                <span class="material-icons-round folder-icon">folder</span>
                <span class="folder-name">${folder.name}</span>
            `;
            // 폴더 요소에 클릭 이벤트 리스너 바인딩
            li.addEventListener('click', () => showPlaylistDetailView(folder.id));
            folderListContainer.appendChild(li);
        });
    }

    // 폴더 생성 UI 제어
    btnAddFolder.addEventListener('click', () => {
        addFolderContainer.style.display = 'flex';
        inputFolderName.focus();
    });

    // 폼 닫기
    btnCancelFolder.addEventListener('click', () => {
        addFolderContainer.style.display = 'none';
        inputFolderName.value = '';
    });

    // 폴더 저장 처리
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

    // 뒤로가기 버튼 (<) 클릭 시 폴더 목록으로 복귀
    btnBack.addEventListener('click', () => {
        showFolderListView();
    });

    // 초기 구동
    renderFolders();
});
