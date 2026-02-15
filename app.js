// xPlayer - Main Application Logic

const SEARCH_SOURCES = {
    tehran: 'tehran',
    melovaz: 'melovaz'
};

class MusicPlayer {
    constructor() {
        this.playlist = [];
        this.currentIndex = -1;
        this.isShuffle = false;
        this.repeatMode = 0; // 0 = no repeat, 1 = repeat one, 2 = repeat all
        this.shuffledIndices = [];
        this.searchResults = [];
        this.currentSearchQuery = '';
        this.currentSearchPage = 1;
        this.currentSearchSource = SEARCH_SOURCES.tehran;
        this.isLoadingMore = false;
        this.hasMoreResults = true;
        this.customPlaylists = {}; // Initialize customPlaylists
        this.currentPlaylistId = null;
        this.nextPlaylistId = 1;
        this.FAVORITE_PLAYLIST_ID = 'favorite'; // Special ID for favorite playlist
        this.previousPage = null; // Store previous page for player page navigation
        this.lyricsCache = this.loadLyricsCache();
        
        this.initializeElements();
        this.attachEventListeners();
        const hasPlayParam = !!new URLSearchParams(window.location.search).get('play');
        if (!hasPlayParam) {
            this.loadPlaylist();
        }
        this.loadCustomPlaylists();
        this.loadRecentData();
        this.setupInfiniteScroll();
        // Setup initial page (home) and display content
        // Use setTimeout to ensure DOM is fully ready and all data is loaded
        setTimeout(() => {
            this.setupNavigation();
            this.setupSettingsPage();
            this.setupOfflineIndicator();
            this.setupKeyboardShortcuts();
            this.setupMediaSession();
            // handlePlayFromUrl must run AFTER setup so player page and elements are ready
            this.handlePlayFromUrl();
        }, 100);
    }

    initializeElements() {
        // Navigation
        this.navItems = document.querySelectorAll('.nav-item');
        this.pages = {
            home: document.getElementById('homePage'),
            search: document.getElementById('searchPage'),
            explore: document.getElementById('explorePage'),
            playlists: document.getElementById('playlistsPage'),
            settings: document.getElementById('settingsPage'),
            player: document.getElementById('playerPage'),
            exploreDetail: document.getElementById('exploreDetailPage')
        };
        
        // Explore Page
        this.latestTracksList = document.getElementById('latestTracksList');
        this.topMonthlyList = document.getElementById('topMonthlyList');
        this.podcastsList = document.getElementById('podcastsList');
        this.exploreDetailContainer = document.getElementById('exploreDetailContainer');
        this.exploreDetailTitle = document.getElementById('exploreDetailTitle');
        this.exploreDetailInfiniteLoader = document.getElementById('exploreDetailInfiniteLoader');
        this.exploreDetailLoadingIndicator = document.getElementById('exploreDetailLoadingIndicator');
        this.exploreDetailScrollToTopBtn = document.getElementById('exploreDetailScrollToTopBtn');
        this.backFromExploreDetailBtn = document.getElementById('backFromExploreDetailBtn');
        
        // Setup scroll to top button for explore detail page
        if (this.exploreDetailScrollToTopBtn) {
            this.exploreDetailScrollToTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        this.currentExploreType = null;
        this.currentExplorePage = 1;
        this.exploreHasMore = false;
        this.exploreLoading = false;
        this.exploreCache = {};
        this.exploreDetailScrollHandler = null;
        this.isDirectoryPlaylist = false; // Flag to indicate if exploreDetail shows a directory playlist
        this.loadExploreCache();
        
        // Search
        this.searchInput = document.getElementById('searchInputMain');
        this.searchBtn = document.getElementById('searchBtnMain');
        
        // Player
        this.audioPlayer = document.getElementById('audioPlayer');
        this.playerSection = document.getElementById('playerSection');
        this.currentTrackEl = document.getElementById('currentTrack');
        this.currentArtistEl = document.getElementById('currentArtist');
        this.bottomPlayerBar = document.getElementById('bottomPlayerBar');
        this.playerBarImage = document.getElementById('playerBarImage');
        this.playerBarTitle = document.getElementById('playerBarTitle');
        this.playerBarArtist = document.getElementById('playerBarArtist');
        this.playerBarTrack = document.getElementById('playerBarTrack');
        this.backFromPlayerBtn = document.getElementById('backFromPlayerBtn');
        this.playerBarPlayPause = document.getElementById('playerBarPlayPause');
        this.playerBarPrev = document.getElementById('playerBarPrev');
        this.playerBarNext = document.getElementById('playerBarNext');
        this.playerBarRepeat = document.getElementById('playerBarRepeat');
        this.playerBarShuffle = document.getElementById('playerBarShuffle');
        this.playerBarPlayIcon = document.getElementById('playerBarPlayIcon');
        this.playerBarPauseIcon = document.getElementById('playerBarPauseIcon');
        this.playerBarRepeatOffIcon = document.getElementById('playerBarRepeatOffIcon');
        this.playerBarRepeatOneIcon = document.getElementById('playerBarRepeatOneIcon');
        this.playerBarRepeatAllIcon = document.getElementById('playerBarRepeatAllIcon');
        this.playerBarShuffleOffIcon = document.getElementById('playerBarShuffleOffIcon');
        this.playerBarShuffleOnIcon = document.getElementById('playerBarShuffleOnIcon');
        
        // Progress Bar
        this.playerBarProgressContainer = document.getElementById('playerBarProgressContainer');
        this.playerBarProgressTrack = document.getElementById('playerBarProgressTrack');
        this.playerBarProgressFill = document.getElementById('playerBarProgressFill');
        this.playerBarProgressHandle = document.getElementById('playerBarProgressHandle');
        this.playerPageProgressContainer = document.getElementById('playerPageProgressContainer');
        this.playerPageProgressTrack = document.getElementById('playerPageProgressTrack');
        this.playerPageProgressFill = document.getElementById('playerPageProgressFill');
        this.playerPageProgressHandle = document.getElementById('playerPageProgressHandle');
        this.playerPageLyricsBtn = document.getElementById('playerPageLyricsBtn');
        this.playerPageAddBtn = document.getElementById('playerPageAddBtn');
        this.playerPageFavoriteBtn = document.getElementById('playerPageFavoriteBtn');
        this.isDraggingProgress = false;
        this.draggingProgressTrack = null;
        
        // Controls
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.repeatBtn = document.getElementById('repeatBtn');
        
        // Home Page
        this.recentTracksContainer = document.getElementById('recentTracks');
        this.recentPlaylistsContainer = document.getElementById('recentPlaylists');
        // Search Page
        this.searchHistoryList = document.getElementById('searchHistoryList');
        this.searchResultsMain = document.getElementById('searchResultsMain');
        this.resultsContainerMain = document.getElementById('resultsContainerMain');
        this.searchLoadingIndicator = document.getElementById('searchLoadingIndicator');
        
        // Playlists Page
        this.playlistsListMain = document.getElementById('playlistsListMain');
        this.createPlaylistBtnMain = document.getElementById('createPlaylistBtnMain');
        this.playlistDetailPage = document.getElementById('playlistDetailPage');
        this.playlistTracksContainer = document.getElementById('playlistTracksContainer');
        this.backToPlaylistsBtn = document.getElementById('backToPlaylistsBtn');
        
        // UI
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.errorMessage = document.getElementById('errorMessage');
        this.errorMessageText = document.getElementById('errorMessageText');
        this.errorRetryBtn = document.getElementById('errorRetryBtn');
        this.offlineIndicator = document.getElementById('offlineIndicator');
        this.toastContainer = document.getElementById('toastContainer');
    }

    attachEventListeners() {
        // Audio events
        this.audioPlayer.addEventListener('ended', () => {
            if (this.repeatMode === 1) {
                // Repeat one: play the same track again
                this.audioPlayer.currentTime = 0;
                this.audioPlayer.play();
            } else {
                // Play next track
                this.playNext();
            }
        });
        this.audioPlayer.addEventListener('error', (e) => {
            this.showError('خطا در پخش موزیک. لطفا موزیک دیگری انتخاب کنید.');
            this.playNext();
        });
        this.audioPlayer.addEventListener('timeupdate', () => {
            this.updateProgressBar();
        });
        this.audioPlayer.addEventListener('loadedmetadata', () => {
            this.updateProgressBar();
        });

        // Player controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevBtn.addEventListener('click', () => this.playPrevious());
        this.nextBtn.addEventListener('click', () => this.playNext());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());

        // Playlist controls
        if (this.clearPlaylistBtn) {
            this.clearPlaylistBtn.addEventListener('click', () => this.clearPlaylist());
        }
        
        // Custom Playlists (old - keep for compatibility)
        if (this.createPlaylistBtn) {
            this.createPlaylistBtn.addEventListener('click', () => this.createNewPlaylist());
        }
        
        // Navigation - Bottom Nav
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) {
                    // Hide playlist detail page if showing
                    if (this.playlistDetailPage) {
                        this.playlistDetailPage.style.display = 'none';
                        this.playlistDetailPage.style.visibility = 'hidden';
                        this.playlistDetailPage.classList.remove('active');
                    }
                    this.navigateToPage(page);
                }
            });
        });
        
        // Back to playlists button
        if (this.backToPlaylistsBtn) {
            this.backToPlaylistsBtn.addEventListener('click', () => {
                if (this.playlistDetailPage) {
                    this.playlistDetailPage.style.display = 'none';
                    this.playlistDetailPage.style.visibility = 'hidden';
                    this.playlistDetailPage.classList.remove('active');
                }
                this.navigateToPage('playlists');
            });
        }
        
        // Player page navigation - click on player bar track info
        if (this.playerBarTrack) {
            this.playerBarTrack.addEventListener('click', (e) => {
                // Prevent event from bubbling if clicking on controls
                if (e.target.closest('button')) {
                    return;
                }
                // Navigate if there's a track playing or if we have a current track
                if ((this.currentIndex >= 0 && this.playlist.length > 0) || 
                    (this.currentTrackEl && this.currentTrackEl.textContent !== '-')) {
                    // Save current page before navigating to player page
                    this.previousPage = this.currentPage || 'home';
                    this.navigateToPage('player');
                }
            });
        }
        
        // Also add click listener to player-bar-info directly (in case event doesn't bubble)
        const playerBarInfo = document.querySelector('.player-bar-info');
        if (playerBarInfo) {
            playerBarInfo.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent double-trigger
                // Navigate if there's a track playing or if we have a current track
                if ((this.currentIndex >= 0 && this.playlist.length > 0) || 
                    (this.currentTrackEl && this.currentTrackEl.textContent !== '-')) {
                    // Save current page before navigating to player page
                    this.previousPage = this.currentPage || 'home';
                    this.navigateToPage('player');
                }
            });
        }
        
        // Back from player page button
        if (this.backFromPlayerBtn) {
            this.backFromPlayerBtn.addEventListener('click', () => {
                // Go back to previous page or home
                const previousPage = this.previousPage || this.currentPage || 'home';
                if (previousPage !== 'player') {
                    this.navigateToPage(previousPage);
                } else {
                    this.navigateToPage('home');
                }
            });
        }

        // Back from explore detail page button
        if (this.backFromExploreDetailBtn) {
            this.backFromExploreDetailBtn.addEventListener('click', () => {
                this.navigateToPage('explore');
            });
        }
        
        // Search (Main)
        if (this.searchBtn) {
            this.searchBtn.addEventListener('click', () => this.searchMain());
        }
        if (this.searchInput) {
            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchMain();
            });
        }
        const clearSearchHistoryBtn = document.getElementById('clearSearchHistoryBtn');
        if (clearSearchHistoryBtn) {
            clearSearchHistoryBtn.addEventListener('click', () => this.clearSearchHistory());
        }
        document.querySelectorAll('.search-source-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const source = tab.dataset.source;
                if (source !== SEARCH_SOURCES.tehran && source !== SEARCH_SOURCES.melovaz) return;
                this.currentSearchSource = source;
                document.querySelectorAll('.search-source-tab').forEach(t => {
                    t.classList.toggle('active', t.dataset.source === source);
                    t.setAttribute('aria-selected', t.dataset.source === source ? 'true' : 'false');
                });
                this.searchResults = [];
                this.displaySearchResultsMain(this.searchResults, true);
            });
        });

        // Playlists Page
        if (this.createPlaylistBtnMain) {
            this.createPlaylistBtnMain.addEventListener('click', () => this.createNewPlaylist());
        }
        
        // Reset All Button
        
        // Bottom Player Bar
        if (this.playerBarPlayPause) {
            this.playerBarPlayPause.addEventListener('click', () => this.togglePlayPause());
        }
        if (this.playerBarPrev) {
            this.playerBarPrev.addEventListener('click', () => this.playPrevious());
        }
        if (this.playerBarNext) {
            this.playerBarNext.addEventListener('click', () => this.playNext());
        }
        if (this.playerBarRepeat) {
            this.playerBarRepeat.addEventListener('click', () => this.toggleRepeat());
        }
        if (this.playerBarShuffle) {
            this.playerBarShuffle.addEventListener('click', () => this.toggleShuffle());
        }
        const shareTrackBtn = document.getElementById('shareTrackBtn');
        if (shareTrackBtn) {
            shareTrackBtn.addEventListener('click', () => this.shareCurrentTrack());
        }
        const shareStoryBtn = document.getElementById('shareStoryBtn');
        if (shareStoryBtn) {
            shareStoryBtn.addEventListener('click', () => this.shareAsStory());
        }
        const playerBarFavoriteBtn = document.getElementById('playerBarFavoriteBtn');
        if (playerBarFavoriteBtn) {
            playerBarFavoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const track = this.currentTrackData || (this.currentIndex >= 0 && this.playlist && this.playlist[this.currentIndex] ? this.playlist[this.currentIndex] : null);
                if (track) {
                    this.toggleFavoriteByTrack(track);
                    this.updateFavoriteButtons();
                } else {
                    this.showToast('آهنگی برای علاقه‌مندی نیست', 'info');
                }
            });
        }
        // Progress Bar Events
        if (this.playerBarProgressContainer) {
            this.setupProgressBar();
        }
        if (this.playerPageProgressContainer) {
            this.setupPlayerPageProgressBar();
        }
        this.setupPlayerPageActionButtons();
    }
    
    setupProgressBar() {
        if (!this.playerBarProgressContainer || !this.playerBarProgressTrack) return;
        
        // Click to seek
        this.playerBarProgressContainer.addEventListener('click', (e) => {
            if (this.isDraggingProgress) return;
            this.seekToPosition(e, this.playerBarProgressTrack);
        });
        
        // Drag to seek
        let isMouseDown = false;
        
        this.playerBarProgressTrack.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            this.isDraggingProgress = true;
            this.draggingProgressTrack = this.playerBarProgressTrack;
            this.playerBarProgressContainer.classList.add('dragging');
            this.seekToPosition(e, this.playerBarProgressTrack);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isMouseDown && this.isDraggingProgress && this.draggingProgressTrack === this.playerBarProgressTrack) {
                this.seekToPosition(e, this.playerBarProgressTrack);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isMouseDown) {
                isMouseDown = false;
                this.isDraggingProgress = false;
                this.draggingProgressTrack = null;
                this.playerBarProgressContainer.classList.remove('dragging');
            }
        });
        
        // Touch events for mobile
        this.playerBarProgressTrack.addEventListener('touchstart', (e) => {
            isMouseDown = true;
            this.isDraggingProgress = true;
            this.draggingProgressTrack = this.playerBarProgressTrack;
            this.playerBarProgressContainer.classList.add('dragging');
            this.seekToPosition(e.touches[0], this.playerBarProgressTrack);
        });
        
        document.addEventListener('touchmove', (e) => {
            if (isMouseDown && this.isDraggingProgress && this.draggingProgressTrack === this.playerBarProgressTrack) {
                e.preventDefault();
                this.seekToPosition(e.touches[0], this.playerBarProgressTrack);
            }
        });
        
        document.addEventListener('touchend', () => {
            if (isMouseDown) {
                isMouseDown = false;
                this.isDraggingProgress = false;
                this.draggingProgressTrack = null;
                this.playerBarProgressContainer.classList.remove('dragging');
            }
        });
    }
    
    seekToPosition(e, trackEl = null) {
        const track = trackEl || this.draggingProgressTrack || this.playerBarProgressTrack;
        if (!track || !this.audioPlayer) return;
        
        const rect = track.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        
        if (this.audioPlayer.duration) {
            this.audioPlayer.currentTime = percentage * this.audioPlayer.duration;
            const pct = percentage * 100;
            if (this.playerBarProgressFill && this.playerBarProgressHandle) {
                this.playerBarProgressFill.style.width = pct + '%';
                this.playerBarProgressHandle.style.left = pct + '%';
            }
            if (this.playerPageProgressFill && this.playerPageProgressHandle) {
                this.playerPageProgressFill.style.width = pct + '%';
                this.playerPageProgressHandle.style.left = pct + '%';
            }
        }
    }
    
    updateProgressBar() {
        if (!this.audioPlayer) return;
        
        // Don't update if user is dragging
        if (this.isDraggingProgress) return;
        
        const percentage = (this.audioPlayer.duration && this.audioPlayer.duration > 0)
            ? (this.audioPlayer.currentTime / this.audioPlayer.duration) * 100
            : 0;
        
        if (this.playerBarProgressFill && this.playerBarProgressHandle) {
            this.playerBarProgressFill.style.width = percentage + '%';
            this.playerBarProgressHandle.style.left = percentage + '%';
        }
        if (this.playerPageProgressFill && this.playerPageProgressHandle) {
            this.playerPageProgressFill.style.width = percentage + '%';
            this.playerPageProgressHandle.style.left = percentage + '%';
        }
    }

    setupPlayerPageProgressBar() {
        if (!this.playerPageProgressContainer || !this.playerPageProgressTrack) return;
        
        this.playerPageProgressContainer.addEventListener('click', (e) => {
            if (this.isDraggingProgress) return;
            this.seekToPosition(e, this.playerPageProgressTrack);
        });
        
        let isMouseDown = false;
        this.playerPageProgressTrack.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            this.isDraggingProgress = true;
            this.draggingProgressTrack = this.playerPageProgressTrack;
            this.playerPageProgressContainer.classList.add('dragging');
            this.seekToPosition(e, this.playerPageProgressTrack);
        });
        
        const upHandler = () => {
            if (isMouseDown) {
                isMouseDown = false;
                this.isDraggingProgress = false;
                this.draggingProgressTrack = null;
                this.playerPageProgressContainer.classList.remove('dragging');
            }
        };
        
        document.addEventListener('mousemove', (e) => {
            if (isMouseDown && this.isDraggingProgress && this.draggingProgressTrack === this.playerPageProgressTrack) {
                this.seekToPosition(e, this.playerPageProgressTrack);
            }
        });
        document.addEventListener('mouseup', upHandler);
        
        this.playerPageProgressTrack.addEventListener('touchstart', (e) => {
            isMouseDown = true;
            this.isDraggingProgress = true;
            this.draggingProgressTrack = this.playerPageProgressTrack;
            this.playerPageProgressContainer.classList.add('dragging');
            this.seekToPosition(e.touches[0], this.playerPageProgressTrack);
        });
        document.addEventListener('touchmove', (e) => {
            if (isMouseDown && this.isDraggingProgress && this.draggingProgressTrack === this.playerPageProgressTrack) {
                e.preventDefault();
                this.seekToPosition(e.touches[0], this.playerPageProgressTrack);
            }
        });
        document.addEventListener('touchend', upHandler);
    }

    setupPlayerPageActionButtons() {
        if (this.playerPageLyricsBtn) {
            this.playerPageLyricsBtn.addEventListener('click', () => this.showLyricsForCurrentTrack());
        }
        if (this.playerPageAddBtn) {
            this.playerPageAddBtn.addEventListener('click', () => {
                const track = this.currentTrackData || (this.currentIndex >= 0 && this.playlist[this.currentIndex] ? this.playlist[this.currentIndex] : null);
                if (track) this.showAddToPlaylistDialog(null, track);
                else this.showToast('آهنگی برای اضافه کردن نیست', 'info');
            });
        }
        if (this.playerPageFavoriteBtn) {
            this.playerPageFavoriteBtn.addEventListener('click', () => {
                const track = this.currentTrackData || (this.currentIndex >= 0 && this.playlist[this.currentIndex] ? this.playlist[this.currentIndex] : null);
                if (track) {
                    this.toggleFavoriteByTrack(track);
                    this.updateFavoriteButtons();
                } else {
                    this.showToast('آهنگی برای علاقه‌مندی نیست', 'info');
                }
            });
        }
    }

    updatePlayerPageFavoriteBtn() {
        this.updateFavoriteButtons();
    }

    updateFavoriteButtons(trackToggled) {
        const currentTrack = this.currentTrackData || (this.currentIndex >= 0 && this.playlist && this.playlist[this.currentIndex] ? this.playlist[this.currentIndex] : null);
        const track = trackToggled || currentTrack;
        const isFavorite = track && this.isTrackInFavoritesByUrl(track);
        const isCurrentTrack = currentTrack && track && (
            this.normalizeUrl(currentTrack.url || currentTrack.pageUrl || '') === this.normalizeUrl(track.url || track.pageUrl || '')
        );
        if (isCurrentTrack) {
            if (this.playerPageFavoriteBtn) {
                this.playerPageFavoriteBtn.classList.toggle('favorite-active', !!isFavorite);
                this.playerPageFavoriteBtn.title = isFavorite ? 'حذف از علاقه‌مندی‌ها' : 'اضافه به علاقه‌مندی‌ها';
            }
            const playerBarFavoriteBtn = document.getElementById('playerBarFavoriteBtn');
            if (playerBarFavoriteBtn) {
                playerBarFavoriteBtn.classList.toggle('favorite-active', !!isFavorite);
                playerBarFavoriteBtn.title = isFavorite ? 'حذف از علاقه‌مندی‌ها' : 'اضافه به علاقه‌مندی‌ها';
            }
        }
        this.updateFavoriteButtonsOnTrackCards(track, isFavorite);
    }

    updateFavoriteButtonsOnTrackCards(track, isFavorite) {
        if (!track) return;
        const trackUrl = this.normalizeUrl(track.url || track.pageUrl || '');
        const trackPageUrl = track.pageUrl ? this.normalizeUrl(track.pageUrl) : '';
        if (!trackUrl && !trackPageUrl) return;
        document.querySelectorAll('.track-item[data-track-url]').forEach(el => {
            const elUrl = el.dataset.trackUrl || '';
            if (elUrl && (elUrl === trackUrl || elUrl === trackPageUrl)) {
                const heartBtn = el.querySelector('.btn-favorite');
                const heartIcon = el.querySelector('.heart-icon');
                if (heartBtn && heartIcon) {
                    heartBtn.classList.toggle('favorite-active', !!isFavorite);
                    heartBtn.title = isFavorite ? 'حذف از علاقه‌مندی‌ها' : 'اضافه به علاقه‌مندی‌ها';
                    heartIcon.setAttribute('fill', isFavorite ? 'currentColor' : 'none');
                }
            }
        });
    }

    getLyricsPageUrl(track) {
        if (!track) return null;
        const u = track.pageUrl || track.url;
        if (!u || (!u.includes('mytehranmusic.com') && !u.startsWith('http'))) return null;
        if (/\.(mp3|m4a|ogg|wav)(\?|#|$)/i.test(u)) return null;
        return u;
    }

    closeLyricsModal() {
        const modal = document.getElementById('lyricsModal');
        if (modal) modal.remove();
    }

    showLyricsForCurrentTrack() {
        const track = this.currentTrackData || (this.currentIndex >= 0 && this.playlist[this.currentIndex] ? this.playlist[this.currentIndex] : null);
        if (!track) {
            this.showToast('آهنگی برای نمایش متن نیست', 'info');
            return;
        }
        const pageUrl = this.getLyricsPageUrl(track);
        if (!pageUrl) {
            this.showToast('متن این آهنگ در دسترس نیست', 'info');
            return;
        }
        this.showLyricsModal(track);
    }

    loadLyricsCache() {
        try {
            const saved = localStorage.getItem('mytehranLyricsCache');
            if (saved) {
                const data = JSON.parse(saved);
                return data && typeof data === 'object' ? data : {};
            }
        } catch (e) {
            console.warn('Could not load lyrics cache:', e);
        }
        return {};
    }

    saveLyricsCache() {
        try {
            const MAX_ENTRIES = 100;
            const keys = Object.keys(this.lyricsCache);
            if (keys.length > MAX_ENTRIES) {
                const toRemove = keys.slice(0, keys.length - MAX_ENTRIES);
                toRemove.forEach(k => delete this.lyricsCache[k]);
            }
            localStorage.setItem('mytehranLyricsCache', JSON.stringify(this.lyricsCache));
        } catch (e) {
            console.warn('Could not save lyrics cache:', e);
        }
    }

    showLyricsModal(track) {
        const existing = document.getElementById('lyricsModal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.id = 'lyricsModal';
        modal.className = 'lyrics-modal-overlay';
        modal.innerHTML = `
            <div class="lyrics-modal">
                <div class="lyrics-modal-header">
                    <h3>متن آهنگ</h3>
                    <div class="lyrics-modal-header-actions">
                        <button class="btn btn-icon btn-lyrics-story" title="استوری متن آهنگ">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                        </button>
                        <button class="btn btn-icon btn-close-lyrics" title="بستن">&times;</button>
                    </div>
                </div>
                <div class="lyrics-modal-body">
                    <div class="lyrics-loading">
                        <div class="spinner spinner-small"></div>
                        <p>در حال بارگذاری متن آهنگ...</p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.querySelector('.btn-close-lyrics').addEventListener('click', () => modal.remove());
        modal.querySelector('.btn-lyrics-story')?.addEventListener('click', () => {
            const body = modal.querySelector('.lyrics-modal-body');
            const selected = body ? this.getSelectedLyricsText(body) : '';
            this.shareLyricsAsStory(selected);
        });
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        
        const pageUrl = this.getLyricsPageUrl(track);
        if (!pageUrl) {
            const body = modal.querySelector('.lyrics-modal-body');
            body.innerHTML = '<div class="lyrics-empty"><p>متن این آهنگ در دسترس نیست</p></div>';
            return;
        }
        const cacheKey = this.normalizeUrl(pageUrl);
        const cached = this.lyricsCache[cacheKey];
        const lyricsStoryHint = '<p class="lyrics-story-hint">یک کلیک: کلمه | دو کلیک: کل خط (پشت سر هم) | سه کلیک: لغو | حداکثر ۶ خط</p>';
        if (cached) {
            const body = modal.querySelector('.lyrics-modal-body');
            const toShow = cached.includes('lyrics-text') ? this.wrapLyricsInSelectableWords(cached) : cached;
            body.innerHTML = cached.includes('lyrics-text') ? lyricsStoryHint + toShow : cached;
            if (cached.includes('lyrics-text')) this.setupLyricsClickSelection(body.querySelector('.lyrics-selectable'));
            if (cached.includes('btn-retry-lyrics')) {
                body.querySelector('.btn-retry-lyrics')?.addEventListener('click', () => {
                    delete this.lyricsCache[cacheKey];
                    this.saveLyricsCache();
                    body.innerHTML = '<div class="lyrics-loading"><div class="spinner spinner-small"></div><p>در حال بارگذاری متن آهنگ...</p></div>';
                    this.fetchAndShowLyrics(track, modal, 0);
                });
            }
            return;
        }
        
        this.fetchAndShowLyrics(track, modal);
    }

    async fetchAndShowLyrics(track, modal, retryCount = 0) {
        const maxRetries = 3;
        const body = modal.querySelector('.lyrics-modal-body');
        const pageUrl = this.getLyricsPageUrl(track);
        if (!pageUrl) {
            body.innerHTML = '<div class="lyrics-empty"><p>متن این آهنگ در دسترس نیست</p></div>';
            return;
        }
        try {
            const proxyUrls = [
                `https://api.allorigins.win/raw?url=${encodeURIComponent(pageUrl)}`,
                `https://api.cors.lol/?url=${encodeURIComponent(pageUrl)}`,
                `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(pageUrl)}`
            ];
            let html = '';
            let lastErr = null;
            for (const proxyUrl of proxyUrls) {
                try {
                    const res = await fetch(proxyUrl);
                    if (res.ok) {
                        html = await res.text();
                        break;
                    }
                    lastErr = new Error('HTTP ' + res.status);
                } catch (e) {
                    lastErr = e;
                }
            }
            if (!html) throw lastErr || new Error('Failed to fetch');
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            let lyricsHtml = this.extractLyricsFromDoc(doc);
            const cacheKey = this.normalizeUrl(pageUrl);
            const lyricsStoryHint = '<p class="lyrics-story-hint">یک کلیک: کلمه | دو کلیک: کل خط (پشت سر هم) | سه کلیک: لغو | حداکثر ۶ خط</p>';
            if (lyricsHtml) {
                const wrapped = this.wrapLyricsInSelectableWords(lyricsHtml);
                body.innerHTML = lyricsStoryHint + wrapped;
                this.lyricsCache[cacheKey] = lyricsHtml;
                this.setupLyricsClickSelection(body.querySelector('.lyrics-selectable'));
                this.saveLyricsCache();
            } else {
                const emptyHtml = '<div class="lyrics-empty"><p>پیدا نشد</p><button class="btn btn-primary btn-retry-lyrics" style="margin-top:16px;">تلاش مجدد</button></div>';
                body.innerHTML = emptyHtml;
                this.lyricsCache[cacheKey] = emptyHtml;
                this.saveLyricsCache();
                body.querySelector('.btn-retry-lyrics').addEventListener('click', () => {
                    delete this.lyricsCache[cacheKey];
                    this.saveLyricsCache();
                    body.innerHTML = '<div class="lyrics-loading"><div class="spinner spinner-small"></div><p>در حال بارگذاری متن آهنگ...</p></div>';
                    this.fetchAndShowLyrics(track, modal, 0);
                });
            }
        } catch (e) {
            if (retryCount < maxRetries) {
                body.innerHTML = `<div class="lyrics-loading"><div class="spinner spinner-small"></div><p>تلاش مجدد... (${retryCount + 1}/${maxRetries})</p></div>`;
                await new Promise(r => setTimeout(r, 800));
                return this.fetchAndShowLyrics(track, modal, retryCount + 1);
            }
            body.innerHTML = `
                <div class="lyrics-error">
                    <p>خطا خورده</p>
                    <p class="lyrics-error-detail">${this.escapeHtml(e.message)}</p>
                    <button class="btn btn-primary btn-retry-lyrics" style="margin-top:16px;">تلاش مجدد</button>
                </div>
            `;
            body.querySelector('.btn-retry-lyrics').addEventListener('click', () => {
                body.innerHTML = '<div class="lyrics-loading"><div class="spinner spinner-small"></div><p>در حال بارگذاری متن آهنگ...</p></div>';
                this.fetchAndShowLyrics(track, modal, 0);
            });
        }
    }

    extractLyricsFromDoc(doc) {
        const contentp = doc.querySelector('div.contentp');
        if (!contentp) return null;

        const nodesToHtml = (nodes) => {
            const div = doc.createElement('div');
            nodes.forEach(n => div.appendChild(n.cloneNode(true)));
            return div.innerHTML.trim();
        };

        // الگوی اول: دقیقاً یک div داخلی + تگ‌های br، متن از بعد از اولین div
        const directDivs = [...contentp.children].filter(el => el.tagName === 'DIV');
        const hasBr = contentp.querySelector('br');
        if (directDivs.length === 1 && hasBr) {
            const firstDiv = directDivs[0];
            const afterNodes = [];
            let found = false;
            for (const node of contentp.childNodes) {
                if (node === firstDiv) { found = true; continue; }
                if (found) afterNodes.push(node);
            }
            const html = nodesToHtml(afterNodes);
            if (html.length > 20) return `<div class="lyrics-text">${html}</div>`;
        }

        // الگوی دوم: آخرین element غیر br و غیر text، متن از بعد از آن
        let lastNonBrText = null;
        for (const node of contentp.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) continue;
            if (node.nodeName === 'BR') continue;
            lastNonBrText = node;
        }
        if (lastNonBrText) {
            const afterNodes = [];
            let found = false;
            for (const node of contentp.childNodes) {
                if (node === lastNonBrText) { found = true; continue; }
                if (found) afterNodes.push(node);
            }
            const html = nodesToHtml(afterNodes);
            if (html.length > 20) return `<div class="lyrics-text">${html}</div>`;
        }

        return null;
    }

    async search() {
        const query = this.searchInput.value.trim();
        if (!query) {
            this.showError('لطفا نام موزیک را وارد کنید');
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            // Use the correct search URL format: https://mytehranmusic.com/?s=query
            const result = await this.fetchSearchResults(query, 1);
            const results = result.results || [];
            
            this.searchResults = results;
            this.displayResults(results);
            this.showLoading(false);
        } catch (error) {
            console.error('Search error:', error);
            this.showError('خطا در جستجو. لطفا دوباره تلاش کنید.', {
                retry: () => this.search()
            });
            this.showLoading(false);
        }
    }

    async fetchSearchResults(query, page = 1) {
        // Use the correct search URL format: https://mytehranmusic.com/?s=query&paged=page
        let searchUrl = `https://mytehranmusic.com/?s=${encodeURIComponent(query)}`;
        if (page > 1) {
            searchUrl += `&paged=${page}`;
        }
        
        // Use CORS proxy to bypass CORS restrictions
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;
        
        try {
            const response = await fetch(proxyUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const htmlContent = data.contents;
            
            return this.parseSearchResults(htmlContent, query, page);
        } catch (error) {
            console.warn('Error fetching search results:', error);
            // Try alternative proxy services
            return await this.fetchSearchResultsAlternative(query, page);
        }
    }

    async fetchSearchResultsAlternative(query, page = 1) {
        let searchUrl = `https://mytehranmusic.com/?s=${encodeURIComponent(query)}`;
        if (page > 1) {
            searchUrl += `&paged=${page}`;
        }
        
        // Try alternative CORS proxy
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(searchUrl)}`;
        
        try {
            const response = await fetch(proxyUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const htmlContent = await response.text();
            return this.parseSearchResults(htmlContent, query, page);
        } catch (error) {
            console.warn('Alternative proxy also failed:', error);
            const fallback = this.fallbackSearchResults(query);
            return {
                results: fallback,
                hasMore: false,
                page: page
            };
        }
    }

    async fetchSearchResultsMelovaz(query, page = 1) {
        const searchUrl = `https://melovaz.ir/?s=${encodeURIComponent(query)}${page > 1 ? `&paged=${page}` : ''}`;
        let htmlContent = '';
        const enc = encodeURIComponent(searchUrl);
        const proxies = [
            async () => {
                const res = await fetch(`https://corsproxy.io/?${enc}`, { mode: 'cors' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.text();
            },
            async () => {
                const res = await fetch(`https://api.allorigins.win/raw?url=${enc}`, { mode: 'cors' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.text();
            },
            async () => {
                const res = await fetch(`https://api.allorigins.win/get?url=${enc}`, { mode: 'cors' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                return (data && data.contents) ? data.contents : '';
            },
            async () => {
                const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${enc}`, { mode: 'cors' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.text();
            }
        ];
        for (const fn of proxies) {
            try {
                htmlContent = await fn();
                if (htmlContent && htmlContent.length > 500) break;
            } catch (e) {
                console.warn('Melovaz proxy attempt failed:', e);
            }
        }
        if (!htmlContent) throw new Error('نتوانستیم صفحه جستجوی ملواز را بارگذاری کنیم.');
        return this.parseSearchResultsMelovaz(htmlContent, query, page);
    }

    parseSearchResultsMelovaz(html, query, page = 1) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const results = [];
        const baseUrl = 'https://melovaz.ir';
        const blockedPathParts = ['about', 'contact', 'darbare', 'tamas', 'raahnaamaa', 'raahnamaa', 'guide', 'faq', 'privacy', 'terms', 'قوانین', 'حریم', 'تماس', 'درباره', 'راهنما', 'ورود', 'ثبت', 'login', 'register'];
        const blockedTitles = ['درباره ملواز', 'تماس با ما', 'راهنما و آموزش ها', 'راهنما', 'درباره ما', 'ورود', 'ثبت نام', 'خانه', 'صفحه اصلی', 'about', 'contact'];
        const isBlockedTitle = (title) => {
            if (!title) return true;
            const t = title.trim();
            return blockedTitles.some(b => t === b || t.includes(b));
        };
        const isContentUrl = (href) => {
            if (!href || href === baseUrl || href === baseUrl + '/') return false;
            if (href.includes('/?s=') || href.includes('/category/') || href.includes('/tag/') ||
                href.includes('/author/') || href.includes('/page/') || href.includes('/wp-')) return false;
            try {
                const u = new URL(href.startsWith('http') ? href : baseUrl + (href.startsWith('/') ? href : '/' + href));
                const path = (u.pathname || '').replace(/^\/|\/$/g, '').toLowerCase();
                if (path.length < 5) return false;
                if (path.startsWith('category') || path.startsWith('tag')) return false;
                if (blockedPathParts.some(part => path.includes(part))) return false;
                return true;
            } catch (_) { return false; }
        };
        const normalizeUrl = (href) => {
            const h = (href || '').trim().replace(/#.*$/, '');
            return h.startsWith('http') ? h : (h.startsWith('/') ? baseUrl + h : baseUrl + '/' + h);
        };
        const toFullUrl = (href) => {
            const h = (href || '').trim();
            return h.startsWith('http') ? h : (h.startsWith('/') ? baseUrl + h : baseUrl + '/' + h);
        };

        const genericTitlePattern = /^(تک\s*آهنگ|آلبوم|پلی\s*لیست|single|album|playlist)$/i;
        const isGenericTitle = (t) => !t || genericTitlePattern.test(t.trim());

        // ساختار ملواز: article.postbox-i > post-img-hover > a, و section.postinfo > ul > li.index-al (عنوان), li.index-ar (خواننده)
        const articles = doc.querySelectorAll('article.postbox-i, .postbox-i, section.box-i article, section.box-i .postbox-i');
        const seenUrls = new Set();
        (articles.length ? articles : doc.querySelectorAll('article')).forEach((articleEl, index) => {
            const container = articleEl;
            const a = container.querySelector('a[href*="melovaz.ir"]');
            if (!a) return;
            const href = a.getAttribute('href') || a.href;
            if (!isContentUrl(href)) return;
            const fullUrl = toFullUrl(href);
            const norm = fullUrl.replace(/#.*$/, '');
            if (seenUrls.has(norm)) return;
            seenUrls.add(norm);

            const liAl = container.querySelector('li.index-al');
            const liAr = container.querySelector('li.index-ar');
            let title = liAl ? (liAl.textContent || '').trim().replace(/\s+/g, ' ') : '';
            let artist = liAr ? (liAr.textContent || '').trim().replace(/\s+/g, ' ') : '';
            if (isGenericTitle(title)) {
                const img = container.querySelector('img');
                if (img && img.alt) title = (img.alt || '').trim().replace(/\s+/g, ' ').slice(0, 200);
            }
            if (!title && container.querySelector('img')?.alt) title = (container.querySelector('img').alt || '').trim().slice(0, 200);
            if (!title || title.length < 2 || isBlockedTitle(title)) return;
            if (!artist) artist = 'ملواز';

            const tsaleEl = container.querySelector('span.TSale');
            const tsaleText = tsaleEl ? (tsaleEl.textContent || '').trim() : '';
            const isAlbumOrPlaylist = /آلبوم|پلی\s*لیست|album|playlist/i.test(tsaleText);
            const isAlbum = /آلبوم|album/i.test(tsaleText);
            let displayTitle = title.slice(0, 200);
            if (isAlbum && displayTitle && !displayTitle.startsWith('آلبوم:')) displayTitle = 'آلبوم: ' + displayTitle;

            const img = container.querySelector('img');
            let image = img ? (img.src || img.getAttribute('src') || '') : '';
            if (image && !image.startsWith('http')) image = image.startsWith('/') ? baseUrl + image : baseUrl + '/' + image;

            results.push({
                id: 'melovaz-' + (page - 1) * 100 + index,
                title: displayTitle,
                artist: artist,
                url: fullUrl,
                pageUrl: fullUrl,
                image: image || '',
                source: 'melovaz',
                isAlbumOrPlaylist: isAlbumOrPlaylist
            });
        });

        if (results.length === 0) {
            const main = doc.querySelector('main, #main, .site-main, #content, .content, .page-content, .search-results') || doc.body;
            const itemSelectors = 'article, .post, .hentry, .search-result, .type-post, .type-album, .type-playlist, [class*="type-"]';
            const items = main ? main.querySelectorAll(itemSelectors) : doc.querySelectorAll(itemSelectors);
            items.forEach((el, index) => {
                const linkEl = el.querySelector('.entry-title a, h2 a, h3 a, h1 a, .post-title a, a[rel="bookmark"], .title a');
                const a = linkEl || el.querySelector('a[href*="melovaz.ir"]');
                if (!a) return;
                const href = a.getAttribute('href') || a.href;
                if (!isContentUrl(href)) return;
                const fullUrl = toFullUrl(href);
                const norm = fullUrl.replace(/#.*$/, '');
                if (seenUrls.has(norm)) return;
                seenUrls.add(norm);
                let title = (a.textContent || '').trim().replace(/\s+/g, ' ');
                const titleNode = el.querySelector('.entry-title, h2, h3, .post-title, .title');
                if ((!title || title === 'پلی لیست' || title === 'آلبوم') && titleNode) title = (titleNode.textContent || '').trim().replace(/\s+/g, ' ');
                if (!title) title = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
                if (!title || title.length < 2 || isBlockedTitle(title)) return;
                const img = el.querySelector('img');
                let image = img ? (img.src || img.getAttribute('src') || '') : '';
                if (image && !image.startsWith('http')) image = image.startsWith('/') ? baseUrl + image : baseUrl + '/' + image;
                const artistEl = el.querySelector('.artist a, .byline a, [rel="author"], .entry-meta a');
                const artist = artistEl ? (artistEl.textContent || '').trim() : 'ملواز';
                results.push({
                    id: 'melovaz-f-' + index + '-' + (page - 1) * 500,
                    title: title.slice(0, 200),
                    artist: artist || 'ملواز',
                    url: fullUrl,
                    pageUrl: fullUrl,
                    image: image || '',
                    source: 'melovaz',
                    isAlbumOrPlaylist: true
                });
            });
        }

        if (results.length === 0) {
            const main = doc.querySelector('main, #main, .site-main, #content, .content, .page-content, .search-results') || doc.body;
            const allLinks = main ? main.querySelectorAll('a[href*="melovaz.ir"]') : doc.querySelectorAll('a[href*="melovaz.ir"]');
            allLinks.forEach((a, i) => {
                const href = a.getAttribute('href') || a.href;
                if (!isContentUrl(href)) return;
                const fullUrl = toFullUrl(href);
                const norm = fullUrl.replace(/#.*$/, '');
                if (seenUrls.has(norm)) return;
                seenUrls.add(norm);
                let title = (a.textContent || '').trim().replace(/\s+/g, ' ');
                const parent = a.closest('article, .post, .hentry, .entry, li');
                if ((!title || title.length < 3 || title === 'پلی لیست' || title === 'آلبوم') && parent) {
                    const t = parent.querySelector('.entry-title, h2, h3, .title');
                    if (t) title = (t.textContent || '').trim().replace(/\s+/g, ' ');
                }
                if (!title || title.length < 2) title = 'نتیجه ' + (results.length + 1);
                if (isBlockedTitle(title)) return;
                results.push({
                    id: 'melovaz-f-' + i + '-' + (page - 1) * 500,
                    title: title.slice(0, 200),
                    artist: 'ملواز',
                    url: fullUrl,
                    pageUrl: fullUrl,
                    image: '',
                    source: 'melovaz',
                    isAlbumOrPlaylist: true
                });
            });
        }

        let hasMore = doc.querySelector('a.next.page-numbers, .nav-links a.next, a[rel="next"], .pagination a.next, .pagination .next, .page-nav a[rel="next"], link[rel="next"]') !== null;
        if (!hasMore) {
            const nextLink = doc.querySelector('a[href*="paged=2"], a[href*="page/2"], .page-numbers li:not(.current) a');
            if (nextLink) hasMore = true;
        }
        if (!hasMore && results.length >= 6) {
            hasMore = true;
        }
        return { results, hasMore, page };
    }

    async loadMelovazAlbumAndPlay(albumTrack) {
        const pageUrl = albumTrack.url || albumTrack.pageUrl;
        if (!pageUrl || !pageUrl.includes('melovaz.ir')) return;
        this.showLoading(true);
        try {
            const encoded = encodeURIComponent(pageUrl);
            const proxyFetchers = [
                () => fetch(`https://corsproxy.io/?${encoded}`, { mode: 'cors' }).then(r => r.ok ? r.text() : Promise.reject(new Error(r.status))),
                () => fetch(`https://api.allorigins.win/raw?url=${encoded}`, { mode: 'cors' }).then(r => r.ok ? r.text() : Promise.reject(new Error(r.status))),
                () => fetch(`https://api.allorigins.win/get?url=${encoded}`, { mode: 'cors' }).then(r => r.ok ? r.json() : Promise.reject(new Error(r.status))).then(d => (d && d.contents) || ''),
                () => fetch(`https://api.codetabs.com/v1/proxy?quest=${encoded}`, { mode: 'cors' }).then(r => r.ok ? r.text() : Promise.reject(new Error(r.status))),
                () => fetch(`https://api.cors.lol/?url=${encoded}`, { mode: 'cors' }).then(r => r.ok ? r.json() : Promise.reject(new Error(r.status))).then(d => (d && d.contents) || (typeof d === 'string' ? d : ''))
            ];
            let html = '';
            for (let i = 0; i < proxyFetchers.length; i++) {
                try {
                    html = await proxyFetchers[i]();
                    if (html && html.length > 500) break;
                } catch (e) {
                    console.warn('loadMelovazAlbumAndPlay proxy', i + 1, 'failed:', e.message);
                }
            }
            if (!html || html.length < 200) throw new Error('نتوانستیم صفحه را بارگذاری کنیم');
            const tracks = this.parseMelovazAlbumPage(html, pageUrl, albumTrack);
            if (tracks.length > 0) {
                this.playlist = tracks;
                this.currentIndex = 0;
                this.shuffledIndices = [];
                this.updatePlaylistDisplay();
                this.loadAndPlay(tracks[0]);
            } else {
                const single = { id: 'melovaz-single', title: albumTrack.title, artist: albumTrack.artist, url: pageUrl, pageUrl, image: albumTrack.image || '', source: 'melovaz' };
                this.playlist = [single];
                this.currentIndex = 0;
                this.updatePlaylistDisplay();
                this.loadAndPlay(single);
            }
        } catch (e) {
            console.error('loadMelovazAlbumAndPlay error:', e);
            this.showError('خطا در بارگذاری آلبوم ملواز.', { retry: () => this.loadMelovazAlbumAndPlay(albumTrack) });
        } finally {
            this.showLoading(false);
        }
    }

    async openMelovazAlbumDetail(albumTrack) {
        const pageUrl = albumTrack.url || albumTrack.pageUrl;
        if (!pageUrl || !pageUrl.includes('melovaz.ir')) return;
        this.navigateToPage('exploreDetail');
        if (this.exploreDetailTitle) this.exploreDetailTitle.textContent = albumTrack.title || 'آلبوم ملواز';
        if (this.exploreDetailLoadingIndicator) this.exploreDetailLoadingIndicator.style.display = 'flex';
        if (this.exploreDetailContainer) this.exploreDetailContainer.innerHTML = '';
        if (this.exploreDetailInfiniteLoader) this.exploreDetailInfiniteLoader.style.display = 'none';
        this.isDirectoryPlaylist = true;
        const encoded = encodeURIComponent(pageUrl);
        const proxyFetchers = [
            () => fetch(`https://corsproxy.io/?${encoded}`, { mode: 'cors' }).then(r => r.ok ? r.text() : Promise.reject(new Error(r.status))),
            () => fetch(`https://api.allorigins.win/raw?url=${encoded}`, { mode: 'cors' }).then(r => r.ok ? r.text() : Promise.reject(new Error(r.status))),
            () => fetch(`https://api.allorigins.win/get?url=${encoded}`, { mode: 'cors' }).then(r => r.ok ? r.json() : Promise.reject(new Error(r.status))).then(d => (d && d.contents) || ''),
            () => fetch(`https://api.codetabs.com/v1/proxy?quest=${encoded}`, { mode: 'cors' }).then(r => r.ok ? r.text() : Promise.reject(new Error(r.status))),
            () => fetch(`https://api.cors.lol/?url=${encoded}`, { mode: 'cors' }).then(r => r.ok ? r.json() : Promise.reject(new Error(r.status))).then(d => (d && d.contents) || (typeof d === 'string' ? d : ''))
        ];
        let html = '';
        for (let i = 0; i < proxyFetchers.length; i++) {
            try {
                html = await proxyFetchers[i]();
                if (html && html.length > 500) break;
            } catch (e) {
                console.warn('openMelovazAlbumDetail proxy', i + 1, 'failed:', e.message);
            }
        }
        if (this.exploreDetailLoadingIndicator) this.exploreDetailLoadingIndicator.style.display = 'none';
        if (!html || html.length < 200) {
            this.showError('خطا در بارگذاری آلبوم ملواز.', { retry: () => this.openMelovazAlbumDetail(albumTrack) });
            if (this.exploreDetailContainer) this.exploreDetailContainer.innerHTML = '<div class="explore-loading"><p>خطا در بارگذاری. لطفاً دوباره تلاش کنید.</p></div>';
            return;
        }
        const tracks = this.parseMelovazAlbumPage(html, pageUrl, albumTrack);
        if (tracks.length > 0) {
            this.playlist = tracks;
            this.currentIndex = -1;
            this.currentPlaylistId = null;
            this.savePlaylist();
            if (this.exploreDetailContainer) {
                this.exploreDetailContainer.innerHTML = '';
                tracks.forEach(track => {
                    const trackEl = this.createTrackElement(track, 'explore');
                    this.exploreDetailContainer.appendChild(trackEl);
                });
            }
            this.showToast(`آلبوم با ${tracks.length} آهنگ بارگذاری شد. برای پخش روی آهنگ مورد نظر کلیک کنید.`, 'success');
        } else {
            const single = { id: 'melovaz-single', title: albumTrack.title, artist: albumTrack.artist, url: pageUrl, pageUrl, image: albumTrack.image || '', source: 'melovaz' };
            this.playlist = [single];
            this.currentIndex = -1;
            this.savePlaylist();
            if (this.exploreDetailContainer) {
                this.exploreDetailContainer.innerHTML = '';
                const trackEl = this.createTrackElement(single, 'explore');
                this.exploreDetailContainer.appendChild(trackEl);
            }
            this.showToast('یک آهنگ یافت شد. برای پخش کلیک کنید.', 'success');
        }
    }

    parseMelovazAlbumPage(html, pageUrl, albumTrack) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const baseUrl = 'https://melovaz.ir';
        const tracks = [];
        const seen = new Set();
        const blockedPathParts = ['about', 'contact', 'darbare', 'tamas', 'raahnaamaa', 'raahnamaa', 'guide', 'faq', 'privacy', 'terms', 'قوانین', 'حریم', 'تماس', 'درباره', 'راهنما', 'ورود', 'ثبت', 'login', 'register'];
        const blockedTitles = ['درباره ملواز', 'تماس با ما', 'راهنما و آموزش ها', 'راهنما', 'درباره ما', 'ورود', 'ثبت نام', 'خانه', 'صفحه اصلی', 'about', 'contact', 'Released', 'released on', 'در بارگذاری'];
        const isBlockedTitle = (t) => {
            if (!t || typeof t !== 'string') return true;
            const s = t.trim();
            if (s.length < 2) return true;
            if (blockedTitles.some(b => s === b || s.includes(b))) return true;
            if (/^\.\.\.?leased\s+on\s+\d/i.test(s) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) return true;
            return false;
        };
        const isBlockedUrl = (href) => {
            if (!href) return true;
            try {
                const path = (href.startsWith('http') ? href : baseUrl + (href.startsWith('/') ? href : '/' + href));
                const pathname = new URL(path).pathname.replace(/^\/|\/$/g, '').toLowerCase();
                return blockedPathParts.some(part => pathname.includes(part));
            } catch (_) { return true; }
        };
        const addTrack = (title, artist, url, image) => {
            if (!url || seen.has(url)) return;
            if (isBlockedTitle(title) || isBlockedUrl(url)) return;
            seen.add(url);
            const uniqueSuffix = (url.split('/').pop() || url).replace(/\?.*$/, '').slice(-36) || String(url.length);
            tracks.push({
                id: 'melovaz-t-' + tracks.length + '-' + uniqueSuffix,
                title: title || albumTrack.title || 'ترک',
                artist: artist || albumTrack.artist || 'ملواز',
                url,
                pageUrl: url,
                image: image || albumTrack.image || '',
                source: 'melovaz'
            });
        };

        // روش ۱: داده در response داخل #aramplayer > ul.audioplayer-audios > li با data-title, data-artist, data-src (داخل div زیر هر li)
        const aramplayer = doc.querySelector('#aramplayer');
        const audiosUl = aramplayer ? aramplayer.querySelector('ul.audioplayer-audios') : doc.querySelector('ul.audioplayer-audios');
        if (audiosUl) {
            const audioItems = audiosUl.querySelectorAll('li');
            audioItems.forEach((li, i) => {
                const elWithSrc = li.querySelector('[data-src]') || li;
                const src = (elWithSrc.getAttribute('data-src') || '').trim();
                if (!src) return;
                const title = (elWithSrc.getAttribute('data-title') || li.getAttribute('data-title') || li.querySelector('[data-title]')?.getAttribute('data-title') || '').trim();
                const artist = (elWithSrc.getAttribute('data-artist') || li.getAttribute('data-artist') || li.querySelector('[data-artist]')?.getAttribute('data-artist') || '').trim();
                let full = src.startsWith('http') ? src : (src.startsWith('/') ? baseUrl + src : baseUrl + '/' + src);
                try { full = new URL(full, baseUrl).href; } catch (_) {}
                if (seen.has(full)) return;
                seen.add(full);
                const slug = (full.split('/').pop() || full).replace(/\?.*$/, '').slice(-40) || String(full.length);
                tracks.push({
                    id: 'melovaz-t-' + i + '-' + slug,
                    title: title || albumTrack.title || 'ترک',
                    artist: artist || albumTrack.artist || 'ملواز',
                    url: full,
                    pageUrl: full,
                    image: albumTrack.image || '',
                    source: 'melovaz'
                });
            });
            if (tracks.length > 0) return tracks;
        }

        // روش ۲: ساختار DOM با li.audioplayer-track-item و لینک در .dldrop-links
        const tracklistRoot = doc.querySelector('#aramplayer') ||
            doc.querySelector('.aramplayer') ||
            doc.querySelector('.audioplayer-tracklist-container') ||
            doc.querySelector('.audioplayer-tracklist') ||
            doc;
        const trackItems = tracklistRoot.querySelectorAll('li.audioplayer-track-item');
        if (trackItems.length > 0) {
            trackItems.forEach((li, i) => {
                const titleEl = li.querySelector('.audioplayer-item-title');
                let title = '';
                if (titleEl) {
                    title = Array.from(titleEl.childNodes)
                        .filter(n => n.nodeType === Node.TEXT_NODE)
                        .map(n => (n.textContent || '').trim())
                        .join('')
                        .trim();
                    if (!title) {
                        let fullText = (titleEl.textContent || '').trim();
                        const span = titleEl.querySelector('span');
                        const artistInTitle = titleEl.querySelector('.artist-player-s');
                        if (span) fullText = fullText.replace((span.textContent || '').trim(), '').trim();
                        if (artistInTitle) fullText = fullText.replace((artistInTitle.textContent || '').trim(), '').trim();
                        title = fullText.trim();
                    }
                }
                const artistEl = li.querySelector('.artist-player-s');
                const artist = artistEl ? (artistEl.textContent || '').trim() : (albumTrack.artist || 'ملواز');
                const mp3Link = li.querySelector('.dldrop-links a[href*=".mp3"]') ||
                    li.querySelector('.audioplayer-item-dl a[href*=".mp3"]') ||
                    li.querySelector('.dldrop a[href*=".mp3"]') ||
                    li.querySelector('.audioplayer-item-dl a[href*="vip-dl"]');
                const href = mp3Link ? (mp3Link.getAttribute('href') || mp3Link.href) : '';
                if (!href || !(href.includes('.mp3') || href.includes('vip-dl'))) return;
                let full = href.startsWith('http') ? href : (href.startsWith('/') ? baseUrl + href : baseUrl + '/' + href);
                try { full = new URL(full, baseUrl).href; } catch (_) {}
                if (!title) {
                    try {
                        const u = new URL(full, baseUrl);
                        let filename = u.searchParams.get('filename') || '';
                        if (!filename && u.pathname.includes('vip-dl')) filename = (u.search || '').replace(/^\?/, '');
                        filename = decodeURIComponent(filename).split('/').pop() || filename;
                        const noExt = filename.replace(/\.(mp3|m4a|flac)(\?|$)/i, '').trim();
                        const withoutNumber = noExt.replace(/^\d{1,3}\s*[-.]?\s*/, '').trim();
                        if (withoutNumber.length > 0) title = withoutNumber;
                    } catch (_) {}
                }
                if (!title) title = `ترک ${i + 1}`;
                if (seen.has(full)) return;
                seen.add(full);
                const slug = (full.split('/').pop() || full).replace(/\?.*$/, '').slice(-40) || String(full.length);
                const uniqueId = 'melovaz-t-' + i + '-' + slug;
                tracks.push({
                    id: uniqueId,
                    title: title || albumTrack.title || 'ترک',
                    artist: artist || albumTrack.artist || 'ملواز',
                    url: full,
                    pageUrl: full,
                    image: albumTrack.image || '',
                    source: 'melovaz'
                });
            });
            if (tracks.length > 0) return tracks;
        }

        const root = tracklistRoot !== doc ? tracklistRoot : (
            doc.querySelector('.audioplayer-tracklist-container') ||
            doc.querySelector('[class*="audioplayer-tracklist"]') ||
            doc.querySelector('.tracklist, .playlist-tracks, [class*="tracklist"]') ||
            doc.querySelector('[id*="tracklist"], [class*="track-list"]') ||
            doc
        );

        const norm = (u) => (u || '').trim().replace(/#.*$/, '');
        const mp3Links = root.querySelectorAll('a[href*=".mp3"], a[href*=".m4a"], a[href*="vip-dl"]');
        mp3Links.forEach((a, i) => {
            const href = a.getAttribute('href') || a.href;
            if (!href || href.toLowerCase().includes('.zip')) return;
            if (href.includes('vip-dl') && !href.includes('.mp3') && !href.includes('.m4a')) return;
            let full = href.startsWith('http') ? href : (href.startsWith('/') ? baseUrl + href : baseUrl + '/' + href);
            try { full = new URL(full, baseUrl).href; } catch (_) {}
            const row = a.closest('tr, .track, .song, li.audioplayer-track-item, li');
            let title = (a.textContent || '').trim() || `ترک ${i + 1}`;
            let artist = albumTrack.artist || 'ملواز';
            if (row && row.classList && row.classList.contains('audioplayer-track-item')) {
                title = '';
                const titleEl = row.querySelector('.audioplayer-item-title');
                if (titleEl) {
                    title = Array.from(titleEl.childNodes)
                        .filter(n => n.nodeType === Node.TEXT_NODE)
                        .map(n => (n.textContent || '').trim())
                        .join('')
                        .trim();
                    if (!title) {
                        let fullText = (titleEl.textContent || '').trim();
                        const span = titleEl.querySelector('span');
                        const artistInTitle = titleEl.querySelector('.artist-player-s');
                        if (span) fullText = fullText.replace((span.textContent || '').trim(), '').trim();
                        if (artistInTitle) fullText = fullText.replace((artistInTitle.textContent || '').trim(), '').trim();
                        title = fullText.trim();
                    }
                }
                const artistEl = row.querySelector('.artist-player-s');
                if (artistEl) artist = (artistEl.textContent || '').trim() || artist;
            }
            if (!title && full) {
                try {
                    const u = new URL(full, baseUrl);
                    let filename = u.searchParams.get('filename') || '';
                    filename = decodeURIComponent(filename).split('/').pop() || filename;
                    const noExt = filename.replace(/\.(mp3|m4a|flac)(\?|$)/i, '').trim();
                    const withoutNumber = noExt.replace(/^\d{1,3}\s*[-.]?\s*/, '').trim();
                    if (withoutNumber.length > 0) title = withoutNumber;
                } catch (_) {}
            }
            if (!title) title = `ترک ${i + 1}`;
            if (row && !row.classList?.contains('audioplayer-track-item')) {
                const artistCell = row.querySelector('.artist, .singer, [class*="artist"]');
                if (artistCell) artist = (artistCell.textContent || '').trim() || artist;
            }
            addTrack(title, artist, full, '');
        });

        const tableRows = root.querySelectorAll('table tbody tr, .track-list tr, .playlist-table tr');
        tableRows.forEach((row, i) => {
            const link = row.querySelector('a[href*="melovaz.ir"]');
            if (!link) return;
            const href = link.getAttribute('href') || link.href;
            if (!href || href.includes('/category/') || href.includes('/tag/') || norm(href) === baseUrl) return;
            if (isBlockedUrl(href)) return;
            const full = href.startsWith('http') ? href : (href.startsWith('/') ? baseUrl + href : baseUrl + '/' + href);
            if (seen.has(full)) return;
            const title = (link.textContent || '').trim() || `ترک ${i + 1}`;
            const artistEl = row.querySelector('.artist a, .singer, [class*="artist"]');
            const artist = artistEl ? (artistEl.textContent || '').trim() : (albumTrack.artist || 'ملواز');
            addTrack(title, artist, full, '');
        });

        const listLinks = root.querySelectorAll('.track a, .song a, .playlist-item a, li a[href*="melovaz.ir"]');
        listLinks.forEach((a, i) => {
            const href = a.getAttribute('href') || a.href;
            if (!href || href.includes('/category/') || href.includes('/tag/') || href.includes('.zip')) return;
            if (isBlockedUrl(href)) return;
            const full = href.startsWith('http') ? href : (href.startsWith('/') ? baseUrl + href : baseUrl + '/' + href);
            if (seen.has(full)) return;
            const title = (a.textContent || '').trim() || `ترک ${i + 1}`;
            addTrack(title, albumTrack.artist || 'ملواز', full, '');
        });

        return tracks;
    }

    parseSearchResults(html, query, page = 1) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const results = [];

        // Parse based on the actual structure: div.grid-item contains each music track
        // Structure: div.grid-item > div.mcpplay (with data attributes) > div.title > div.artist
        const gridItems = doc.querySelectorAll('div.grid-item');
        
        console.log(`Found ${gridItems.length} grid items`);
        
        gridItems.forEach((gridItem, index) => {
            // Find the play button with data attributes
            const playButton = gridItem.querySelector('div.mcpplay');
            
            if (!playButton) {
                return; // Skip if no play button found
            }
            
            // Extract data from data attributes (most reliable)
            const trackTitle = playButton.getAttribute('data-track') || '';
            const artist = playButton.getAttribute('data-artist') || 'ناشناس';
            const imageUrl = playButton.getAttribute('data-image') || '';
            const musicUrl = playButton.getAttribute('data-music') || '';
            
            // Fallback: try to get from DOM elements if data attributes are missing
            let title = trackTitle;
            let image = imageUrl;
            let url = musicUrl; // This is the direct music URL from data-music
            let pageUrl = ''; // This is the page URL (fallback)
            
            // Get title from div.title if data-track is missing
            if (!title) {
                const titleEl = gridItem.querySelector('div.title a');
                if (titleEl) {
                    title = titleEl.textContent.trim();
                }
            }
            
            // Get artist from div.artist if data-artist is missing
            let finalArtist = artist;
            if (!finalArtist || finalArtist === 'ناشناس') {
                const artistEl = gridItem.querySelector('div.artist a');
                if (artistEl) {
                    finalArtist = artistEl.textContent.trim();
                }
            }
            
            // Get image from img tag if data-image is missing
            if (!image) {
                const imgEl = gridItem.querySelector('div.img img, img[src*="timthumb"], img[alt="Cover"]');
                if (imgEl) {
                    image = imgEl.src || imgEl.getAttribute('src') || '';
                    // If it's a timthumb URL, try to extract original or use as is
                    // timthumb URLs are fine to use directly
                }
            }
            
            // Get page URL (for fallback if music URL is missing)
            const pageLink = gridItem.querySelector('div.title a, div.img a');
            if (pageLink) {
                pageUrl = pageLink.href || pageLink.getAttribute('href') || '';
                if (pageUrl && !pageUrl.startsWith('http')) {
                    pageUrl = `https://mytehranmusic.com${pageUrl}`;
                }
            }
            
            // Normalize image URL
            if (image && !image.startsWith('http') && !image.startsWith('data:')) {
                if (image.startsWith('//')) {
                    image = 'https:' + image;
                } else if (image.startsWith('/')) {
                    image = 'https://mytehranmusic.com' + image;
                } else {
                    image = 'https://mytehranmusic.com/' + image;
                }
            }
            
            // Normalize music URL (direct audio file URL from data-music)
            if (url && !url.startsWith('http') && !url.startsWith('data:')) {
                if (url.startsWith('//')) {
                    url = 'https:' + url;
                } else if (url.startsWith('/')) {
                    url = 'https://mytehranmusic.com' + url;
                } else {
                    // If it's a relative path, make it absolute
                    url = 'https://mytehranmusic.com/' + url;
                }
            }
            
            // If no direct music URL, use page URL as fallback
            if (!url && pageUrl) {
                url = pageUrl;
            }
            
            // Only add if we have at least title and some URL
            if (title && url) {
                // Store both direct music URL and page URL
                const trackData = {
                    id: Date.now() + index + (page - 1) * 10000, // Unique ID per page
                    title: title.trim(),
                    artist: finalArtist.trim() || 'ناشناس',
                    url: url, // Direct music URL from data-music if available, otherwise page URL
                    image: image || '',
                    source: 'tehran'
                };
                
                // Store page URL separately if we have direct music URL
                if (musicUrl && musicUrl === url) {
                    // We have direct music URL, store page URL for fallback
                    trackData.pageUrl = pageUrl;
                } else if (pageUrl && pageUrl === url) {
                    // We only have page URL, no direct music URL
                    trackData.pageUrl = pageUrl;
                }
                
                console.log('Parsed track:', trackData.title, 'URL:', trackData.url, 'PageURL:', trackData.pageUrl);
                
                results.push(trackData);
            }
        });

        console.log(`Parsed ${results.length} tracks from page ${page}`);

        // Filter: only keep results that match the search query (exclude suggestion items when no real results)
        const queryNorm = (query || '').trim().toLowerCase();
        const filtered = queryNorm.length >= 2 ? results.filter(t => {
            const title = (t.title || '').toLowerCase();
            const artist = (t.artist || '').toLowerCase();
            return title.includes(queryNorm) || artist.includes(queryNorm);
        }) : results;

        // Check for pagination after parsing results
        let hasMore = false;
        if (filtered.length > 0) {
            hasMore = this.checkForMorePages(doc);
            console.log(`Has more pages: ${hasMore}`);
        }

        if (filtered.length === 0) {
            return { results: [], hasMore: false, page: page };
        }

        return {
            results: filtered,
            hasMore: hasMore,
            page: page
        };
    }

    checkForMorePages(doc) {
        // Check for pagination links - WordPress typically uses .page-numbers or .pagination
        const nextLink = doc.querySelector('a.next.page-numbers, .pagination a.next, .wp-pagenavi a.next, a[rel="next"]');
        if (nextLink) {
            return true;
        }
        
        // Check if there are multiple pages by looking for page numbers
        const pageNumbers = doc.querySelectorAll('.page-numbers, .pagination a, .wp-pagenavi a');
        if (pageNumbers.length > 1) {
            // Check if current page is not the last
            let maxPage = 1;
            pageNumbers.forEach(link => {
                const text = link.textContent.trim();
                const pageNum = parseInt(text);
                if (!isNaN(pageNum) && pageNum > maxPage) {
                    maxPage = pageNum;
                }
            });
            // If we found page numbers > 1, assume there might be more
            return maxPage > 1;
        }
        
        // Default: assume there might be more if we got results
        return true;
    }

    fallbackSearchResults(query) {
        return [];
    }

    displayResults(results) {
        // This function is for old layout, skip if containers don't exist
        if (!this.resultsContainer) {
            return; // Skip if container doesn't exist
        }
        
        this.resultsContainer.innerHTML = '';
        
        if (this.resultsCount) {
            this.resultsCount.textContent = results.length;
        }

        if (results.length === 0) {
            this.resultsContainer.innerHTML = '<p class="empty-state">نتیجه‌ای یافت نشد</p>';
            return;
        }

        results.forEach((track, index) => {
            const trackElement = this.createTrackElement(track, 'results');
            this.resultsContainer.appendChild(trackElement);
        });
    }

    getCurrentTrack() {
        if (this.currentIndex < 0) return null;
        if (this.playlist && this.playlist[this.currentIndex]) return this.playlist[this.currentIndex];
        if (this.currentTrackData) return this.currentTrackData;
        return null;
    }

    isTrackCurrentlyPlaying(track) {
        const current = this.getCurrentTrack();
        if (!current) return false;
        if (String(current.id) === String(track.id)) return true;
        const curUrl = (current.url || current.pageUrl || '').trim();
        const trUrl = (track.url || track.pageUrl || '').trim();
        if (curUrl && trUrl && this.normalizeUrl(curUrl) === this.normalizeUrl(trUrl)) return true;
        return false;
    }

    createTrackElement(track, source = 'playlist', index = null) {
        const div = document.createElement('div');
        div.className = 'track-item';
        
        // Add compact class for playlist-detail
        if (source === 'playlist-detail') {
            div.classList.add('compact');
        }
        
        div.dataset.trackId = track.id;
        const trackUrlKey = (track.url || track.pageUrl || '').trim();
        if (trackUrlKey) {
            div.dataset.trackUrl = this.normalizeUrl(trackUrlKey);
        }

        // در همه صفحات (جستجو، پلی‌لیست، اکسپلور، خانه): اگر این ترک الان در حال پخش است، حالت انتخاب‌شده
        const isCurrentlyPlaying = this.isTrackCurrentlyPlaying(track);
        if (isCurrentlyPlaying) {
            div.classList.add('active');
        }

        // Ensure track has required properties
        const trackTitle = track.title || 'بدون عنوان';
        const trackArtist = track.artist || 'ناشناس';
        const trackImage = track.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23b3b3b3"%3E%3Cpath d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/%3E%3C/svg%3E';
        
        // Check if track is in favorite list (pass track object for URL comparison)
        const isFavorite = this.isTrackInFavoritesByUrl(track);
        
        // Different layout for playlist-detail (Spotify-style)
        if (source === 'playlist-detail') {
            const trackNumber = index !== null ? index + 1 : '';
            const showPlayButton = isCurrentlyPlaying;
            div.innerHTML = `
                ${showPlayButton ? '' : `<span class="track-number">${trackNumber}</span>`}
                <button class="track-play-button" data-action="play" data-track-id="${track.id || Date.now()}" title="پخش" style="display: ${showPlayButton ? 'flex' : 'none'};">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </button>
                <div class="track-image-compact">
                    <img src="${trackImage}" alt="${this.escapeHtml(trackTitle)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'%23b3b3b3\\'%3E%3Cpath d=\\'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z\\'/%3E%3C/svg%3E'">
                </div>
                <div class="track-info-compact">
                    <span class="track-title-compact">${this.escapeHtml(trackTitle)}</span>
                    <span class="track-artist-compact">${this.escapeHtml(trackArtist)}</span>
                </div>
                <button class="btn-remove-compact" data-action="remove" data-track-id="${track.id || Date.now()}" title="حذف از پلی‌لیست">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            `;
        } else {
            // برای explore-top (برترین‌ها) دکمه‌های اکشن را حذف می‌کنیم
            if (source === 'explore-top') {
                div.innerHTML = `
                    <div class="track-image">
                        <img src="${trackImage}" alt="${this.escapeHtml(track.title)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'%23b3b3b3\\'%3E%3Cpath d=\\'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z\\'/%3E%3C/svg%3E'">
                    </div>
                    <div class="track-info">
                        <h4>${this.escapeHtml(track.title)}</h4>
                        <p>${this.escapeHtml(track.artist)}</p>
                    </div>
                `;
            } else {
                div.innerHTML = `
                    <div class="track-image">
                        <img src="${trackImage}" alt="${this.escapeHtml(track.title)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'%23b3b3b3\\'%3E%3Cpath d=\\'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z\\'/%3E%3C/svg%3E'">
                    </div>
                    <div class="track-info">
                        <h4>${this.escapeHtml(track.title)}</h4>
                        <p>${this.escapeHtml(track.artist)}</p>
                    </div>
                    <div class="track-actions">
                        ${source === 'results' || source === 'home' || source === 'explore' ? 
                            `<button class="btn btn-small btn-play" data-action="play" data-source="${source}" data-track-id="${track.id}" title="پخش">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                             </button>
                             <button class="btn btn-small btn-add-to-custom" data-action="add-to-custom" data-source="${source}" data-track-id="${track.id}" title="اضافه به پلی‌لیست سفارشی">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                                </svg>
                             </button>
                             <button class="btn btn-small btn-favorite ${isFavorite ? 'favorite-active' : ''}" data-action="toggle-favorite" data-source="${source}" data-track-id="${track.id}" title="${isFavorite ? 'حذف از علاقه‌مندی‌ها' : 'اضافه به علاقه‌مندی‌ها'}">
                                <svg class="heart-icon" width="16" height="16" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                                </svg>
                             </button>` :
                            `<button class="btn btn-small btn-play" data-action="play" data-track-id="${track.id}" title="پخش">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                             </button>
                             <button class="btn btn-small btn-remove" data-action="remove" data-track-id="${track.id}" title="حذف">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                </svg>
                             </button>`
                        }
                    </div>
                `;
            }
        }

        // Attach event listeners
        div.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const action = btn.dataset.action;
                const trackIdStr = btn.dataset.trackId;
                
                if (action === 'toggle-favorite') {
                    if (source === 'home' || source === 'explore') {
                        this.toggleFavoriteByTrack(track);
                        this.updateFavoriteButtons(track);
                    } else {
                        if (!trackIdStr) return;
                        const found = this.searchResults.find(t => String(t.id) === String(trackIdStr));
                        if (found) {
                            this.toggleFavoriteByTrack(found);
                            this.updateFavoriteButtons(found);
                        } else {
                            const trackId = parseInt(trackIdStr, 10);
                            if (!isNaN(trackId)) {
                                this.toggleFavorite(trackId);
                                this.updateFavoriteButtons(track);
                            }
                        }
                    }
                } else if (action === 'add-to-custom') {
                    if (source === 'home' || source === 'explore') {
                        this.showAddToPlaylistDialog(null, track);
                    } else {
                        if (!trackIdStr) return;
                        const found = this.searchResults.find(t => String(t.id) === String(trackIdStr));
                        if (found) {
                            this.showAddToPlaylistDialog(found.id, found);
                        } else {
                            const trackId = parseInt(trackIdStr, 10);
                            if (!isNaN(trackId)) this.showAddToPlaylistDialog(trackId);
                        }
                    }
                } else if (action === 'play') {
                    if (source === 'playlist-detail') {
                        if (!trackIdStr) return;
                        const trackIdNum = parseInt(trackIdStr, 10);
                        const trackIndex = !isNaN(trackIdNum)
                            ? this.playlist.findIndex(t => t.id === trackIdNum)
                            : this.playlist.findIndex(t => String(t.id) === String(trackIdStr));
                        if (trackIndex !== -1) {
                            this.currentIndex = trackIndex;
                            this.loadAndPlay(this.playlist[trackIndex]);
                            this.updatePlaylistDisplay();
                            // Update active state in detail view
                            if (this.playlistTracksContainer) {
                                this.displayPlaylistTracks(this.playlist);
                            }
                        }
                    } else if (source === 'explore') {
                        // For explore items:
                        // - اگر پلی‌لیست دایرکتوری لود شده (isDirectoryPlaylist)، بر اساس id در this.playlist پیدا کن
                        // - در غیر این صورت، مستقیماً از خود آبجکت track پخش کن
                        if (this.isDirectoryPlaylist && this.playlist && this.playlist.length > 0) {
                            const trackIndex = this.playlist.findIndex(t => String(t.id) === String(track.id));
                            if (trackIndex !== -1) {
                                this.currentIndex = trackIndex;
                                this.loadAndPlay(this.playlist[trackIndex]);
                            } else {
                                this.loadAndPlay(track);
                            }
                        } else {
                            this.loadAndPlay(track);
                        }
                    } else if (source === 'home') {
                        // For home page (recent tracks), play directly from track object
                        this.loadAndPlay(track);
                    } else if (source === 'results') {
                        // آلبوم و پلی‌لیست ملواز: باز کردن صفحه جزئیات و نمایش لیست آهنگ‌ها (مثل برترین‌ها)
                        if (track && track.source === 'melovaz' && track.isAlbumOrPlaylist) {
                            this.openMelovazAlbumDetail(track);
                            return;
                        }
                        if (!trackIdStr) return;
                        const trackId = parseInt(trackIdStr, 10);
                        if (isNaN(trackId)) {
                            const found = this.searchResults.find(t => String(t.id) === String(trackIdStr));
                            if (found) this.playTrack(found.id, source);
                            return;
                        }
                        this.playTrack(trackId, source);
                    } else {
                        if (!trackIdStr) return;
                        const trackId = parseInt(trackIdStr);
                        if (isNaN(trackId)) return;
                        this.playTrack(trackId, source);
                    }
                } else if (action === 'remove') {
                    this.removeFromPlaylist(trackId);
                    // Refresh playlist detail if we're viewing it
                    if (source === 'playlist-detail' && this.currentPlaylistId) {
                        const playlist = this.customPlaylists[this.currentPlaylistId];
                        if (playlist && this.playlistTracksContainer) {
                            this.displayPlaylistTracks(playlist.tracks);
                        }
                    }
                }
            });
        });

        // Click on track item to play (for playlist-detail)
        if (source === 'playlist-detail') {
            div.addEventListener('click', (e) => {
                // Don't trigger if clicking on a button
                if (e.target.closest('button')) {
                    return;
                }
                const trackIdRaw = div.dataset.trackId;
                const trackId = parseInt(trackIdRaw, 10);
                const trackIndex = !isNaN(trackId)
                    ? this.playlist.findIndex(t => t.id === trackId)
                    : this.playlist.findIndex(t => String(t.id) === String(trackIdRaw));
                if (trackIndex !== -1) {
                    this.currentIndex = trackIndex;
                    this.loadAndPlay(this.playlist[trackIndex]);
                    this.updatePlaylistDisplay();
                    // Update active state in detail view
                    if (this.playlistTracksContainer) {
                        this.displayPlaylistTracks(this.playlist);
                    }
                }
            });
        }

        return div;
    }

    showAddToPlaylistDialog(trackId, trackObject = null) {
        // If track object is provided (for home/explore), use it directly
        // Otherwise, find track from searchResults
        let track = trackObject;
        if (!track && trackId !== null) {
            track = this.searchResults.find(t => t.id === trackId);
        }
        if (!track) return;
        
        // Ensure customPlaylists is an object
        if (!this.customPlaylists || typeof this.customPlaylists !== 'object') {
            this.customPlaylists = {};
        }
        
        // Filter out favorite playlist and get other playlists
        const playlists = Object.entries(this.customPlaylists).filter(([id]) => id !== this.FAVORITE_PLAYLIST_ID);
        
        const dialog = document.createElement('div');
        dialog.className = 'playlist-selector-dialog';
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>اضافه کردن به پلی‌لیست</h3>
                <p>${this.escapeHtml(track.title)} - ${this.escapeHtml(track.artist)}</p>
                <div class="playlist-selector-list">
                    ${playlists.map(([id, playlist]) => `
                        <div class="playlist-selector-item">
                            <span>${this.escapeHtml(playlist.name)} (${playlist.tracks.length} موزیک)</span>
                            <button class="btn btn-small btn-select-playlist" data-playlist-id="${id}" data-track-id="${trackId}">انتخاب</button>
                        </div>
                    `).join('')}
                </div>
                <div class="dialog-actions">
                    <button class="btn btn-secondary btn-close-dialog">انصراف</button>
                    <button class="btn btn-primary btn-create-new-from-dialog">پلی‌لیست جدید</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Close button
        dialog.querySelector('.btn-close-dialog').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
        
        // Create new playlist
        dialog.querySelector('.btn-create-new-from-dialog').addEventListener('click', () => {
            const newPlaylistId = this.createNewPlaylist(track);
            if (newPlaylistId) {
                document.body.removeChild(dialog);
                this.showToast('پلی‌لیست جدید ساخته شد و موزیک اضافه شد', 'success');
            }
        });
        
        // Select playlist buttons
        dialog.querySelectorAll('.btn-select-playlist').forEach(btn => {
            btn.addEventListener('click', () => {
                const playlistId = btn.dataset.playlistId;
                this.addTrackToCustomPlaylist(playlistId, track);
                document.body.removeChild(dialog);
                this.showToast('موزیک به پلی‌لیست اضافه شد', 'success');
            });
        });
    }
    
    // Normalize URL for comparison
    normalizeUrl(url) {
        if (!url) return '';
        try {
            const urlObj = new URL(url);
            return urlObj.origin + urlObj.pathname;
        } catch (e) {
            return url.split('?')[0].split('#')[0];
        }
    }
    
    // Check if track is in favorites by track object (more reliable)
    isTrackInFavoritesByUrl(track) {
        if (!track) return false;
        if (!this.customPlaylists || !this.customPlaylists[this.FAVORITE_PLAYLIST_ID]) {
            return false;
        }
        const favoritePlaylist = this.customPlaylists[this.FAVORITE_PLAYLIST_ID];
        if (!favoritePlaylist.tracks) return false;
        
        const trackUrl = this.normalizeUrl(track.url);
        const trackPageUrl = track.pageUrl ? this.normalizeUrl(track.pageUrl) : null;
        
        // Check if track exists by URL
        return favoritePlaylist.tracks.some(t => {
            const existingUrl = this.normalizeUrl(t.url);
            const existingPageUrl = t.pageUrl ? this.normalizeUrl(t.pageUrl) : null;
            
            return existingUrl === trackUrl || 
                   (trackPageUrl && existingPageUrl === trackPageUrl) ||
                   (trackPageUrl && existingUrl === trackPageUrl) ||
                   (existingPageUrl && trackUrl === existingPageUrl);
        });
    }
    
    // Legacy method for backward compatibility
    isTrackInFavorites(trackId) {
        // Try to find track in search results
        const track = this.searchResults.find(t => t.id === trackId);
        if (track) {
            return this.isTrackInFavoritesByUrl(track);
        }
        return false;
    }
    
    toggleFavorite(trackId) {
        if (!trackId || isNaN(trackId)) {
            console.warn('Invalid trackId in toggleFavorite:', trackId);
            return;
        }
        
        const track = this.searchResults.find(t => t.id === trackId);
        if (!track) {
            console.warn('Track not found in searchResults for id:', trackId, 'Available tracks:', this.searchResults.map(t => t.id));
            return;
        }
        
        this.toggleFavoriteByTrack(track);
    }
    
    toggleFavoriteByTrack(track) {
        if (!track) {
            console.warn('Invalid track in toggleFavoriteByTrack');
            return;
        }
        
        // Ensure favorite playlist exists
        if (!this.customPlaylists[this.FAVORITE_PLAYLIST_ID]) {
            this.customPlaylists[this.FAVORITE_PLAYLIST_ID] = {
                name: 'علاقه‌مندی‌ها',
                tracks: [],
                downloaded: false,
                isFavorite: true
            };
        }
        
        const favoritePlaylist = this.customPlaylists[this.FAVORITE_PLAYLIST_ID];
        
        // Normalize URL for comparison
        const normalizeUrl = (url) => {
            if (!url) return '';
            try {
                const urlObj = new URL(url);
                return urlObj.origin + urlObj.pathname;
            } catch (e) {
                return url.split('?')[0].split('#')[0];
            }
        };
        
        const trackUrl = normalizeUrl(track.url);
        const trackPageUrl = track.pageUrl ? normalizeUrl(track.pageUrl) : null;
        
        // Check if track already exists by URL
        const existingIndex = favoritePlaylist.tracks.findIndex(t => {
            const existingUrl = normalizeUrl(t.url);
            const existingPageUrl = t.pageUrl ? normalizeUrl(t.pageUrl) : null;
            
            return existingUrl === trackUrl || 
                   (trackPageUrl && existingPageUrl === trackPageUrl) ||
                   (trackPageUrl && existingUrl === trackPageUrl) ||
                   (existingPageUrl && trackUrl === existingPageUrl);
        });
        
        if (existingIndex !== -1) {
            // Remove from favorites
            favoritePlaylist.tracks.splice(existingIndex, 1);
            this.saveCustomPlaylists();
            this.showToast('آهنگ از علاقه‌مندی‌ها حذف شد', 'success');
        } else {
            // Add to favorites
            favoritePlaylist.tracks.push({...track});
            this.saveCustomPlaylists();
            this.showToast('آهنگ به علاقه‌مندی‌ها اضافه شد', 'success');
        }
    }


    removeFromPlaylist(trackId) {
        if (this.currentPlaylistId) {
            // Remove from custom playlist
            const playlist = this.customPlaylists[this.currentPlaylistId];
            if (playlist) {
                const trackIndex = playlist.tracks.findIndex(t => t.id === trackId);
                if (trackIndex !== -1) {
                    this.removeTrackFromPlaylist(this.currentPlaylistId, trackIndex);
                }
            }
        } else {
            // Remove from search results playlist
            this.playlist = this.playlist.filter(t => t.id !== trackId);
            
            if (this.currentIndex >= this.playlist.length) {
                this.currentIndex = -1;
                this.audioPlayer.pause();
                this.updatePlayingStateInAllViews();
                // Hide bottom player bar if no track is playing
                if (this.bottomPlayerBar) {
                    this.bottomPlayerBar.style.display = 'none';
                }
            }
            
            this.updatePlaylistDisplay();
            this.savePlaylist();
        }
    }

    playTrack(trackId, source = 'playlist') {
        let track;
        
        if (source === 'results') {
            // For search results, set current playlist to search results
            this.currentPlaylistId = null;
            // Add all search results to playlist if not already there
            this.searchResults.forEach(result => {
                if (!this.playlist.find(t => t.id === result.id)) {
                    this.playlist.push({...result});
                }
            });
            track = this.searchResults.find(t => t.id === trackId);
        } else {
            // Playing from current playlist
            track = this.playlist.find(t => t.id === trackId);
        }
        
        if (!track) return;

        this.currentIndex = this.playlist.findIndex(t => t.id === trackId);
        this.loadAndPlay(track);
        this.updatePlaylistDisplay();
        this.savePlaylist();
    }

    updatePlayingStateInAllViews() {
        const current = this.getCurrentTrack();
        document.querySelectorAll('.track-item').forEach(el => {
            const trackId = el.dataset.trackId;
            const trackUrl = el.dataset.trackUrl || '';
            const isActive = current && (
                (trackId != null && String(current.id) === String(trackId)) ||
                (trackUrl && current.url && this.normalizeUrl((current.url || current.pageUrl || '').trim()) === trackUrl)
            );
            el.classList.toggle('active', !!isActive);
        });
    }

    loadAndPlay(track) {
        this.closeLyricsModal();
        this.currentTrackData = track;
        if (this.playlist && this.playlist.length > 0) {
            const idx = this.playlist.findIndex(t => String(t.id) === String(track.id) || (t.url === track.url && (t.pageUrl || t.url) === (track.pageUrl || track.url)));
            if (idx !== -1) this.currentIndex = idx;
        }
        this.updatePlayingStateInAllViews();
        this.updateTrackDisplay(track.title, track.artist);
        this.updatePlayerPageFavoriteBtn();
        document.title = `${track.title || 'آهنگ'} - ${track.artist || 'ناشناس'} | xPlayer`;
        
        // Update bottom player bar
        if (this.playerBarImage) {
            this.playerBarImage.src = track.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23b3b3b3"%3E%3Cpath d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/%3E%3C/svg%3E';
        }
        this.updateMediaSession?.();
        if (this.bottomPlayerBar) {
            this.bottomPlayerBar.style.display = 'flex';
        }
        
        // Reset progress bar
        if (this.playerBarProgressFill) {
            this.playerBarProgressFill.style.width = '0%';
        }
        if (this.playerBarProgressHandle) {
            this.playerBarProgressHandle.style.left = '0%';
        }
        
        // اگر در صفحه جزییات پلی‌لیست هستیم، وضعیت فعال (سبز) را به‌روز کن
        if (this.playlistTracksContainer && this.playlist && this.playlist.length > 0) {
            // بر اساس this.currentIndex، کلاس active روی آیتم‌ها تنظیم می‌شود
            this.displayPlaylistTracks(this.playlist);
        }
        
        // Update current track image
        const currentImageEl = document.getElementById('currentTrackImage');
        if (currentImageEl) {
            currentImageEl.src = track.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23b3b3b3"%3E%3Cpath d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/%3E%3C/svg%3E';
        }
        
        // Check if URL is a direct audio file (from data-music attribute)
        const audioUrl = track.url;
        
        // Check if this is a directory track with direct MP3 URL (before error handling)
        const isDirectoryTrack = this.isDirectoryPlaylist && 
                                 track.url && 
                                 (track.url.endsWith('.mp3') || track.url.endsWith('.m4a') || track.url.endsWith('.ogg')) &&
                                 track.pageUrl === track.url; // pageUrl همان url است یعنی از دایرکتوری آمده
        
        const isDirectAudio = audioUrl && (
            audioUrl.endsWith('.mp3') || 
            audioUrl.endsWith('.m4a') || 
            audioUrl.endsWith('.ogg') || 
            audioUrl.endsWith('.wav') ||
            audioUrl.includes('dl.mytehranmusic.com') ||
            audioUrl.includes('.mp3') ||
            audioUrl.includes('.m4a')
        );
        
        if (isDirectAudio) {
            // Direct audio URL - try to use it directly
            console.log('Using direct audio URL:', audioUrl);
            if (isDirectoryTrack) {
                console.log('This is a directory track with direct MP3 URL');
            }
            
            // First, try without CORS (some servers allow it)
            this.audioPlayer.crossOrigin = null;
            this.audioPlayer.src = audioUrl;
            
            // Set up error handler for CORS issues
            let errorHandled = false;
            const handleAudioError = (e) => {
                if (errorHandled) return;
                errorHandled = true;
                
                console.log('Audio error detected:', e);
                
                // اگر track از دایرکتوری آمده و مستقیماً MP3 است، نباید extractAudioFromPage صدا بزنیم
                if (isDirectoryTrack) {
                    console.log('Directory track with direct MP3 URL failed, trying with CORS...');
                    // Try one more time with CORS enabled
                    this.audioPlayer.crossOrigin = 'anonymous';
                    this.audioPlayer.src = audioUrl;
                    
                    this.audioPlayer.addEventListener('error', () => {
                        console.error('CORS still failing for directory track');
                        this.showError('خطا در پخش موزیک. لطفا موزیک دیگری انتخاب کنید.');
                    }, { once: true });
                    
                    this.audioPlayer.play().catch(() => {
                        this.showError('خطا در پخش موزیک. لطفا موزیک دیگری انتخاب کنید.');
                    });
                } else if (track.pageUrl) {
                    // Try CORS proxy - use a service that supports audio streaming
                    // Note: Most CORS proxies don't work well with audio, so we'll extract from page
                    console.log('Extracting audio from page URL...');
                    this.extractAudioFromPage(track);
                } else {
                    // Try one more time with CORS enabled
                    this.audioPlayer.crossOrigin = 'anonymous';
                    this.audioPlayer.src = audioUrl;
                    
                    this.audioPlayer.addEventListener('error', () => {
                        console.error('CORS still failing, need to extract from page');
                        this.showError('خطا در پخش موزیک. لطفا موزیک دیگری انتخاب کنید.');
                    }, { once: true });
                    
                    this.audioPlayer.play().catch(() => {
                        this.showError('خطا در پخش موزیک. لطفا موزیک دیگری انتخاب کنید.');
                    });
                }
            };
            
            // Listen for CORS/network errors
            this.audioPlayer.addEventListener('error', handleAudioError, { once: true });
            
            // Also check for CORS errors in play promise
            this.audioPlayer.play().then(() => {
                // Success - remove error handler and cache
                this.audioPlayer.removeEventListener('error', handleAudioError);
                this.cacheAudio(audioUrl);
                this.preloadNextTrack();
                // Show bottom player bar - player section is in playerPage
                if (this.bottomPlayerBar) {
                    this.bottomPlayerBar.style.display = 'block';
                }
                this.updatePlayButton();
                // Add to recent tracks
                this.addToRecentTracks(track);
            }).catch(err => {
                console.error('Play error:', err);
                // Check if it's a CORS error
                if (err.name === 'NotAllowedError' || err.message.includes('CORS') || err.message.includes('cross-origin')) {
                    handleAudioError(err);
                } else {
                    // Other error, try error handler anyway
                    handleAudioError(err);
                }
            });
        } else {
            // Page URL - need to extract audio from the page
            this.extractAudioFromPage(track);
        }
    }

    extractAudioFromPage(track, options = {}) {
        const fromTopMonthly = options.fromTopMonthly;
        const retryCount = options.retryCount ?? 0;
        const maxRetries = 3;
        if (!fromTopMonthly) {
            this.showLoading(true);
        }
        const pageUrl = track.pageUrl || track.url;
        
        if (!pageUrl) {
            if (!fromTopMonthly) this.showLoading(false);
            else if (this.exploreDetailLoadingIndicator) this.exploreDetailLoadingIndicator.style.display = 'none';
            this.showError('لینک موزیک یافت نشد');
            return;
        }
        
        const doRetry = () => {
            if (retryCount < maxRetries - 1) {
                const delay = 1500 + retryCount * 500;
                console.log(`Retrying in ${delay}ms (attempt ${retryCount + 2}/${maxRetries})...`);
                setTimeout(() => {
                    this.extractAudioFromPage(track, { ...options, retryCount: retryCount + 1 });
                }, delay);
            }
        };
        
        this.extractAudioUrl(pageUrl).then(result => {
            const url = result && typeof result === 'object' ? result.url : result;
            const metadata = result && typeof result === 'object' ? result : {};
            if (url) {
                // Check if URL is a directory marker
                if (url.startsWith('DIRECTORY:')) {
                    const directoryUrl = url.replace('DIRECTORY:', '');
                    console.log('Detected directory URL, loading playlist:', directoryUrl);
                    this.loadDirectoryPlaylist(directoryUrl, track, { displayInExploreDetail: fromTopMonthly });
                } else {
                    // Update track metadata from page (اگر صفحه متادیتا نداده، مقدار قبلی ترک را نگه می‌داریم)
                    if (metadata.title != null) track.title = metadata.title;
                    if (metadata.artist != null) track.artist = metadata.artist;
                    else if (!track.artist || (track.artist + '').trim() === '') track.artist = 'ناشناس';
                    if (metadata.image != null) track.image = metadata.image;
                    if (!track.title) {
                        try {
                            const path = new URL(pageUrl).pathname.replace(/^\/|\/$/g, '');
                            if (path) track.title = path.replace(/-/g, ' ');
                        } catch (_) {}
                        if (!track.title) track.title = 'آهنگ';
                    }
                    this.closeLyricsModal();
                    this.currentTrackData = track;
                    this.updateTrackDisplay(track.title, track.artist);
                    this.updatePlayerPageFavoriteBtn();
                    document.title = `${track.title || 'آهنگ'} - ${track.artist || 'ناشناس'} | xPlayer`;
                    const imgPlaceholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23b3b3b3"%3E%3Cpath d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/%3E%3C/svg%3E';
                    if (this.playerBarImage) this.playerBarImage.src = track.image || imgPlaceholder;
                    const currentImageEl = document.getElementById('currentTrackImage');
                    if (currentImageEl) currentImageEl.src = track.image || imgPlaceholder;
                    this.updateMediaSession?.();
                    console.log('Extracted audio URL:', url);
                    track.url = url;
                    const proxyUrls = [
                        `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
                        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
                        `https://corsproxy.io/?${encodeURIComponent(url)}`,
                        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
                        `https://cors.io/?${encodeURIComponent(url)}`
                    ];
                    const tryPlayFromProxy = async (index = 0) => {
                        if (index >= proxyUrls.length) {
                            this.audioPlayer.dispatchEvent(new Event('error'));
                            return;
                        }
                        try {
                            const res = await fetch(proxyUrls[index], { mode: 'cors' });
                            if (!res.ok) throw new Error(`HTTP ${res.status}`);
                            const blob = await res.blob();
                            const blobUrl = URL.createObjectURL(blob);
                            this.audioPlayer.src = blobUrl;
                            this.audioPlayer.onloadeddata = () => URL.revokeObjectURL(blobUrl);
                            this.cacheAudio(url);
                            await new Promise((resolve, reject) => {
                                this.audioPlayer.addEventListener('canplay', () => resolve(), { once: true });
                                this.audioPlayer.addEventListener('error', (e) => reject(e), { once: true });
                                if (this.audioPlayer.readyState >= 3) resolve();
                            });
                            await this.audioPlayer.play();
                        } catch (e) {
                            if (e.name === 'NotAllowedError' || (e.message && (e.message.includes('play') || e.message.includes('user gesture')))) {
                                hideLoading();
                                return;
                            }
                            console.warn('Proxy', index + 1, 'failed:', e.message);
                            tryPlayFromProxy(index + 1);
                        }
                    };
                    let directFailed = false;
                    const tryDirectFirst = () => {
                        this.audioPlayer.crossOrigin = null;
                        this.audioPlayer.src = url;
                        const onDirectError = () => {
                            if (directFailed) return;
                            directFailed = true;
                            console.log('Direct load failed, trying proxies...');
                            this.audioPlayer.crossOrigin = 'anonymous';
                            tryPlayFromProxy(0).catch(() => {});
                        };
                        this.audioPlayer.addEventListener('error', onDirectError, { once: true });
                        this.audioPlayer.play().then(() => {
                            if (!directFailed) this.cacheAudio(url);
                        }).catch((e) => {
                            if (e.name === 'NotAllowedError' || (e.message && (e.message.includes('play') || e.message.includes('user gesture')))) {
                                hideLoading();
                                return;
                            }
                            onDirectError();
                        });
                    };
                    let loadingHidden = false;
                    const hideLoading = () => {
                        if (loadingHidden) return;
                        loadingHidden = true;
                        if (!fromTopMonthly) this.showLoading(false);
                        else if (this.exploreDetailLoadingIndicator) this.exploreDetailLoadingIndicator.style.display = 'none';
                    };
                    this.audioPlayer.addEventListener('playing', hideLoading, { once: true });
                    this.audioPlayer.addEventListener('error', () => {
                        hideLoading();
                        this.showError('خطا در پخش موزیک. لطفا موزیک دیگری انتخاب کنید.');
                    }, { once: true });
                    setTimeout(hideLoading, 15000);
                    this.addToRecentTracks(track);
                    tryDirectFirst();
                    if (this.bottomPlayerBar) {
                        this.bottomPlayerBar.style.display = 'block';
                    }
                    this.updatePlayButton();
                }
            } else {
                if (retryCount < maxRetries - 1) {
                    doRetry();
                } else {
                    if (!fromTopMonthly) this.showLoading(false);
                    else if (this.exploreDetailLoadingIndicator) this.exploreDetailLoadingIndicator.style.display = 'none';
                    this.showError('نمی‌توان موزیک را پخش کرد. لطفا موزیک دیگری انتخاب کنید.');
                }
            }
        }).catch(err => {
            console.error('Error extracting audio:', err);
            if (retryCount < maxRetries - 1) {
                doRetry();
            } else {
                if (!fromTopMonthly) this.showLoading(false);
                else if (this.exploreDetailLoadingIndicator) this.exploreDetailLoadingIndicator.style.display = 'none';
                this.showError('خطا در بارگذاری موزیک. لطفا دوباره تلاش کنید.', {
                    retry: () => this.extractAudioFromPage(track, { ...options, retryCount: 0 })
                });
            }
        });
    }

    async extractAudioUrl(pageUrl) {
        console.log('extractAudioUrl called with pageUrl:', pageUrl);
        if (pageUrl && pageUrl.includes('melovaz.ir')) {
            return this.extractAudioUrlFromMelovazPage(pageUrl);
        }
        try {
            // Use multiple CORS proxies in parallel with short timeouts (robust for podcasts)
            const proxyPromises = [
                (async () => {
                    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(pageUrl)}`;
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    try {
                        const response = await fetch(proxyUrl, { signal: controller.signal });
                        clearTimeout(timeoutId);
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        if (response.headers.get('content-type')?.includes('application/json')) {
                            const data = await response.json();
                            return data.contents || '';
                        }
                        return await response.text();
                    } catch (e) {
                        clearTimeout(timeoutId);
                        throw e;
                    }
                })(),
                (async () => {
                    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(pageUrl)}`;
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    try {
                        const response = await fetch(proxyUrl, { signal: controller.signal });
                        clearTimeout(timeoutId);
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        return await response.text();
                    } catch (e) {
                        clearTimeout(timeoutId);
                        throw e;
                    }
                })(),
                (async () => {
                    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(pageUrl)}`;
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    try {
                        const response = await fetch(proxyUrl, { signal: controller.signal });
                        clearTimeout(timeoutId);
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        return await response.text();
                    } catch (e) {
                        clearTimeout(timeoutId);
                        throw e;
                    }
                })()
            ];

            let html;
            try {
                // Fastest successful proxy
                html = await Promise.race(proxyPromises);
            } catch {
                // Fallback: first fulfilled result
                const results = await Promise.allSettled(proxyPromises);
                const fulfilled = results.find(r => r.status === 'fulfilled');
                if (!fulfilled) {
                    throw new Error('All proxies failed for extractAudioUrl');
                }
                html = fulfilled.value;
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            console.log(`extractAudioUrl: Parsed HTML for ${pageUrl}, document title: ${doc.title || 'N/A'}`);
            
            const metadata = this.extractMetadataFromDoc(doc, pageUrl);
            
            const returnResult = (url) => url ? { url, ...metadata } : { url: null, ...metadata };
            
            // Method 1: Check for data-music attribute (most reliable for this site)
            const playButton = doc.querySelector('div.mcpplay[data-music]');
            if (playButton) {
                const musicUrl = playButton.getAttribute('data-music');
                if (musicUrl && musicUrl.trim() && musicUrl !== '/') {
                    const finalUrl = musicUrl.startsWith('http') ? musicUrl : `https://mytehranmusic.com${musicUrl}`;
                    if (finalUrl !== 'https://mytehranmusic.com/' && finalUrl !== 'https://mytehranmusic.com') {
                        console.log(`Method 1 found data-music: ${finalUrl}`);
                        return returnResult(finalUrl);
                    }
                }
            }
            console.log('Method 1: No valid data-music found');
            
            // Method 2: Direct audio source tag
            const audioSource = doc.querySelector('audio source');
            if (audioSource && audioSource.src) {
                const src = audioSource.src.trim();
                if (src && src !== '/' && (src.includes('.mp3') || src.includes('.m4a') || src.includes('.ogg'))) {
                    const finalUrl = src.startsWith('http') ? src : `https://mytehranmusic.com${src}`;
                    if (finalUrl !== 'https://mytehranmusic.com/' && finalUrl !== 'https://mytehranmusic.com') {
                        console.log(`Method 2 found audio source: ${finalUrl}`);
                        return returnResult(finalUrl);
                    }
                }
            }
            console.log('Method 2: No valid audio source found');
            
            // Method 3: Audio element with src
            const audioElement = doc.querySelector('audio');
            if (audioElement && audioElement.src) {
                const src = audioElement.src.trim();
                if (src && src !== '/' && (src.includes('.mp3') || src.includes('.m4a') || src.includes('.ogg'))) {
                    const finalUrl = src.startsWith('http') ? src : `https://mytehranmusic.com${src}`;
                    if (finalUrl !== 'https://mytehranmusic.com/' && finalUrl !== 'https://mytehranmusic.com') {
                        console.log(`Method 3 found audio element: ${finalUrl}`);
                        return returnResult(finalUrl);
                    }
                }
            }
            console.log('Method 3: No valid audio element found');
            
            // Method 4: Data attributes (fallback)
            const dataAudio = doc.querySelector('[data-audio], [data-src], [data-mp3]');
            if (dataAudio) {
                const src = (dataAudio.getAttribute('data-audio') || 
                           dataAudio.getAttribute('data-src') || 
                           dataAudio.getAttribute('data-mp3') || '').trim();
                if (src && src !== '/' && (src.includes('.mp3') || src.includes('.m4a') || src.includes('.ogg'))) {
                    const finalUrl = src.startsWith('http') ? src : `https://mytehranmusic.com${src}`;
                    if (finalUrl !== 'https://mytehranmusic.com/' && finalUrl !== 'https://mytehranmusic.com') {
                        console.log(`Method 4 found data attribute: ${finalUrl}`);
                        return returnResult(finalUrl);
                    }
                }
            }
            console.log('Method 4: No valid data attributes found');
            
            // Method 5: Look for download links (prioritize 320, then 128)
            // First, collect all download links with quality indicators
            // Try multiple selectors to find download links
            const allDownloadLinks1 = doc.querySelectorAll('a[href*="dl.mytehranmusic.com"]');
            const allDownloadLinks2 = doc.querySelectorAll('a[href*="download"]');
            const allDownloadLinks3 = doc.querySelectorAll('a[href*=".mp3"], a[href*=".m4a"], a[href*=".ogg"]');
            
            // Combine all links (remove duplicates)
            const linkSet = new Set();
            [...allDownloadLinks1, ...allDownloadLinks2, ...allDownloadLinks3].forEach(link => {
                const href = link.href || link.getAttribute('href');
                if (href) linkSet.add(link);
            });
            
            // Also check for links with text containing quality indicators
            const allLinks = doc.querySelectorAll('a[href]');
            allLinks.forEach(link => {
                const text = (link.textContent || '').toLowerCase();
                const href = link.href || link.getAttribute('href');
                if (href && (text.includes('320') || text.includes('128') || text.includes('mp3') || text.includes('دانلود'))) {
                    linkSet.add(link);
                }
            });
            
            const allDownloadLinks = Array.from(linkSet);
            const downloadLinks320 = [];
            const downloadLinks128 = [];
            const otherDownloadLinks = [];
            
            console.log(`Method 5: Found ${allDownloadLinks.length} potential download links on page: ${pageUrl}`);
            console.log(`  - dl.mytehranmusic.com: ${allDownloadLinks1.length}`);
            console.log(`  - containing "download": ${allDownloadLinks2.length}`);
            console.log(`  - containing .mp3/.m4a/.ogg: ${allDownloadLinks3.length}`);
            console.log(`  - total unique: ${allDownloadLinks.length}`);
            
            for (const link of allDownloadLinks) {
                const href = link.href || link.getAttribute('href');
                if (!href) continue;
                
                const linkText = (link.textContent || '').toLowerCase().trim();

                // Skip ZIP archive links (e.g. "320 ZIP", ".zip" files)
                if (linkText.includes('zip') || href.toLowerCase().includes('.zip')) {
                    console.log(`Skipping ZIP link: "${linkText}" -> ${href}`);
                    continue;
                }

                // Normalize href - handle relative URLs
                let normalizedHref;
                if (href.startsWith('http')) {
                    normalizedHref = href;
                } else if (href.startsWith('//')) {
                    normalizedHref = 'https:' + href;
                } else if (href.startsWith('/')) {
                    normalizedHref = 'https://mytehranmusic.com' + href;
                } else {
                    normalizedHref = 'https://mytehranmusic.com/' + href;
                }
                
                // Skip if normalized to root URL (invalid)
                if (normalizedHref === 'https://mytehranmusic.com/' || normalizedHref === 'https://mytehranmusic.com') {
                    console.warn(`Skipping invalid normalized href: ${href} -> ${normalizedHref}`);
                    continue;
                }
                
                console.log(`Processing download link: "${linkText}" -> ${normalizedHref}`);
                
                // Check if it's a direct .mp3/.m4a/.ogg file
                if (normalizedHref.includes('.mp3') || normalizedHref.includes('.m4a') || normalizedHref.includes('.ogg')) {
                    if (linkText.includes('320') || normalizedHref.includes('320')) {
                        downloadLinks320.push(normalizedHref);
                        console.log(`Added 320 link: ${normalizedHref}`);
                    } else if (linkText.includes('128') || normalizedHref.includes('128')) {
                        downloadLinks128.push(normalizedHref);
                        console.log(`Added 128 link: ${normalizedHref}`);
                    } else {
                        otherDownloadLinks.push(normalizedHref);
                        console.log(`Added other quality link: ${normalizedHref}`);
                    }
                } else if (normalizedHref.includes('dl.mytehranmusic.com')) {
                    // This is a directory link - we'll handle it specially
                    // Pattern: https://dl.mytehranmusic.com/music/1404/08/03/Top%20Music%20-%20Mehr%201404/
                    const baseDir = normalizedHref.endsWith('/') ? normalizedHref : normalizedHref + '/';
                    
                    console.log(`Found directory link (${linkText}): ${baseDir}`);
                    
                    // Store directory URL with a special marker to indicate it's a directory
                    // Priority: 320 first, then 128
                    if (linkText.includes('320')) {
                        console.log(`Returning directory URL (320): ${baseDir}`);
                        return returnResult(`DIRECTORY:${baseDir}`);
                    } else if (linkText.includes('128')) {
                        console.log(`Returning directory URL (128): ${baseDir}`);
                        return returnResult(`DIRECTORY:${baseDir}`);
                    } else {
                        console.log(`Returning directory URL (no quality specified): ${baseDir}`);
                        return returnResult(`DIRECTORY:${baseDir}`);
                    }
                }
            }
            
            console.log(`Collected links - 320: ${downloadLinks320.length}, 128: ${downloadLinks128.length}, other: ${otherDownloadLinks.length}`);
            
            // Priority: 320 first, then 128, then others
            if (downloadLinks320.length > 0) {
                console.log('Trying 320 quality links...');
                for (const url of downloadLinks320) {
                    // Validate URL format - must be a real audio file URL, not root domain
                    if (url && 
                        url !== 'https://mytehranmusic.com/' && 
                        url !== 'https://mytehranmusic.com' &&
                        (url.includes('.mp3') || url.includes('.m4a') || url.includes('.ogg'))) {
                        console.log(`Returning 320 URL: ${url}`);
                        return returnResult(url);
                    }
                }
            }
            
            if (downloadLinks128.length > 0) {
                console.log('Trying 128 quality links...');
                for (const url of downloadLinks128) {
                    if (url && 
                        url !== 'https://mytehranmusic.com/' && 
                        url !== 'https://mytehranmusic.com' &&
                        (url.includes('.mp3') || url.includes('.m4a') || url.includes('.ogg'))) {
                        console.log(`Returning 128 URL: ${url}`);
                        return returnResult(url);
                    }
                }
            }
            
            // Fallback to other download links
            if (otherDownloadLinks.length > 0) {
                console.log('Trying other quality links...');
                for (const url of otherDownloadLinks) {
                    if (url && 
                        url !== 'https://mytehranmusic.com/' && 
                        url !== 'https://mytehranmusic.com' &&
                        (url.includes('.mp3') || url.includes('.m4a') || url.includes('.ogg'))) {
                        console.log(`Returning other quality URL: ${url}`);
                        return returnResult(url);
                    }
                }
            }
            
            console.warn('No valid download links found in Method 5');
            
            // Method 6: Look in script tags for audio URLs
            const scripts = doc.querySelectorAll('script');
            for (const script of scripts) {
                const content = script.textContent || script.innerHTML;
                // Look for URLs ending with audio extensions (must end with .mp3/.m4a/.ogg)
                const audioUrlMatch = content.match(/https?:\/\/[^\s"']+\.(mp3|m4a|ogg)(?:\?[^\s"']*)?/i);
                if (audioUrlMatch && audioUrlMatch[0] && !audioUrlMatch[0].endsWith('/')) {
                    console.log(`Method 6 found audio URL in script: ${audioUrlMatch[0]}`);
                    return returnResult(audioUrlMatch[0]);
                }
                const dlMatch = content.match(/https?:\/\/dl\.mytehranmusic\.com[^\s"']+\.(mp3|m4a|ogg)(?:\?[^\s"']*)?/i);
                if (dlMatch && dlMatch[0] && !dlMatch[0].endsWith('/')) {
                    console.log(`Method 6 found dl.mytehranmusic.com URL in script: ${dlMatch[0]}`);
                    return returnResult(dlMatch[0]);
                }
            }
            
            console.warn(`extractAudioUrl: No audio URL found for ${pageUrl}, returning null`);
            return returnResult(null);
        } catch (error) {
            console.error('Error extracting audio URL:', error);
            return { url: null, title: null, artist: null, image: null };
        }
    }

    async extractAudioUrlFromMelovazPage(pageUrl, fromAlbumFallback = false) {
        const baseUrl = 'https://melovaz.ir';
        const returnResult = (url) => ({ url, title: null, artist: null, image: null });
        if (pageUrl && pageUrl.includes('vip-dl') && (pageUrl.includes('.mp3') || pageUrl.includes('.m4a'))) {
            return returnResult(pageUrl);
        }
        const encoded = encodeURIComponent(pageUrl);
        const proxyFetchers = [
            async () => {
                const r = await fetch(`https://corsproxy.io/?${encoded}`, { mode: 'cors' });
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return await r.text();
            },
            async () => {
                const r = await fetch(`https://api.allorigins.win/raw?url=${encoded}`, { mode: 'cors' });
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return await r.text();
            },
            async () => {
                const r = await fetch(`https://api.allorigins.win/get?url=${encoded}`, { mode: 'cors' });
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const data = await r.json();
                return (data && data.contents) || '';
            },
            async () => {
                const r = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encoded}`, { mode: 'cors' });
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return await r.text();
            },
            async () => {
                const r = await fetch(`https://api.cors.lol/?url=${encoded}`, { mode: 'cors' });
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const data = await r.json();
                return (data && data.contents) || (typeof data === 'string' ? data : '');
            }
        ];

        let html = '';
        for (let i = 0; i < proxyFetchers.length; i++) {
            try {
                html = await proxyFetchers[i]();
                if (html && html.length > 500) break;
            } catch (e) {
                console.warn('Melovaz proxy', i + 1, 'failed:', e.message);
            }
        }
        if (!html || html.length < 200) {
            console.error('extractAudioUrlFromMelovazPage: همه پراکسی‌ها ناموفق بودند');
            return { url: null, title: null, artist: null, image: null };
        }

        try {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const returnResult = (url) => ({ url, title: null, artist: null, image: null });

            const audioSrc = doc.querySelector('audio source, audio[src]');
            if (audioSrc) {
                const src = (audioSrc.src || audioSrc.getAttribute('src') || '').trim();
                if (src && (src.includes('.mp3') || src.includes('.m4a') || src.includes('.ogg'))) {
                    const final = src.startsWith('http') ? src : (src.startsWith('/') ? baseUrl + src : baseUrl + '/' + src);
                    return returnResult(final);
                }
            }
            const dataSrc = doc.querySelector('[data-src], [data-audio], [data-mp3]');
            if (dataSrc) {
                const src = (dataSrc.getAttribute('data-src') || dataSrc.getAttribute('data-audio') || dataSrc.getAttribute('data-mp3') || '').trim();
                if (src && (src.includes('.mp3') || src.includes('.m4a'))) {
                    const final = src.startsWith('http') ? src : (src.startsWith('/') ? baseUrl + src : baseUrl + '/' + src);
                    return returnResult(final);
                }
            }
            const mp3Links = doc.querySelectorAll('a[href*=".mp3"], a[href*=".m4a"]');
            for (const a of mp3Links) {
                const href = a.getAttribute('href') || a.href || '';
                if (href.includes('.zip')) continue;
                const final = href.startsWith('http') ? href : (href.startsWith('/') ? baseUrl + href : baseUrl + '/' + href);
                if (final && (final.endsWith('.mp3') || final.endsWith('.m4a') || final.includes('.mp3') || final.includes('.m4a'))) {
                    return returnResult(final);
                }
            }
            const scripts = doc.querySelectorAll('script');
            for (const script of scripts) {
                const content = script.textContent || '';
                let match = content.match(/https?:\/\/[^\s"']+\.(mp3|m4a)(?:\?[^\s"']*)?/i);
                if (!match) match = content.match(/(["'])(https?:\/\/[^"']+\.(?:mp3|m4a)[^"']*)\1/);
                if (match && match[0]) {
                    const url = match[2] || match[0];
                    if (url.includes('.mp3') || url.includes('.m4a')) return returnResult(url.trim());
                }
            }
            const anyMp3 = doc.querySelector('[href*=".mp3"], [href*=".m4a"], [src*=".mp3"], [src*=".m4a"], [data-src*=".mp3"], [data-url*=".mp3"]');
            if (anyMp3) {
                const u = anyMp3.getAttribute('href') || anyMp3.getAttribute('src') || anyMp3.getAttribute('data-src') || anyMp3.getAttribute('data-url') || '';
                if (u && !u.includes('.zip')) {
                    const final = u.startsWith('http') ? u : (u.startsWith('/') ? baseUrl + u : baseUrl + '/' + u);
                    if (final.includes('.mp3') || final.includes('.m4a')) return returnResult(final);
                }
            }
            // صفحه ممکن است آلبوم/کامپایل باشد؛ اولین لینک ترک را فقط از داخل لیست واقعی بگیر (نه پیشنهادی‌ها)
            if (!fromAlbumFallback) {
                const tracklistRoot = doc.querySelector('.audioplayer-tracklist-container') || doc;
                const firstTrackLink = tracklistRoot.querySelector('table tbody tr a[href*="melovaz.ir"], .track-list a[href*="melovaz.ir"], .track a[href*="melovaz.ir"], .song a[href*="melovaz.ir"], .playlist-item a[href*="melovaz.ir"]');
                if (firstTrackLink) {
                    let firstHref = firstTrackLink.getAttribute('href') || firstTrackLink.href || '';
                    if (firstHref && !firstHref.includes('/category/') && !firstHref.includes('/tag/') && !firstHref.includes('.zip')) {
                        const firstPageUrl = firstHref.startsWith('http') ? firstHref : (firstHref.startsWith('/') ? baseUrl + firstHref : baseUrl + '/' + firstHref);
                        if (firstPageUrl !== pageUrl) {
                            try {
                                const sub = await this.extractAudioUrlFromMelovazPage(firstPageUrl, true);
                                if (sub && sub.url) return returnResult(sub.url);
                            } catch (_) {}
                        }
                    }
                }
            }
            return returnResult(null);
        } catch (e) {
            console.error('extractAudioUrlFromMelovazPage parse error:', e);
            return { url: null, title: null, artist: null, image: null };
        }
    }

    extractMetadataFromDoc(doc, pageUrl = '') {
        let title = null, artist = null, image = null;
        // اول JSON-LD schema (mytehranmusic گاهی name/byArtist را جابه‌جا دارد: name=خواننده، byArtist.name=آهنگ)
        const ldScripts = doc.querySelectorAll('script[type="application/ld+json"]');
        for (const script of ldScripts) {
            try {
                const data = JSON.parse(script.textContent || '');
                const obj = Array.isArray(data) ? data.find(o => o && o['@type'] === 'MusicRecording') : (data && data['@type'] === 'MusicRecording' ? data : null);
                if (obj) {
                    const schemaName = (obj.name || '').trim();
                    const byArtistName = (obj.byArtist && (typeof obj.byArtist === 'string' ? obj.byArtist : obj.byArtist.name) || '').trim();
                    if (schemaName && byArtistName) {
                        artist = schemaName;
                        title = byArtistName;
                        if (obj.image) image = (typeof obj.image === 'string' ? obj.image : obj.image.url) || '';
                        break;
                    }
                }
            } catch (_) {}
        }
        // mcpplay با data-music (فقط اگر از schema نتونستیم بگیریم)
        if (!title || !artist) {
            let playButton = doc.querySelector('div.mcpplay[data-music]');
            if (!playButton) playButton = doc.querySelector('div.mcpplay');
            if (playButton) {
                if (!title) title = playButton.getAttribute('data-track') || '';
                if (!artist) artist = playButton.getAttribute('data-artist') || '';
                if (!image) image = playButton.getAttribute('data-image') || '';
            }
        }
        // Fallback: og:title و doc.title - فرمت معمول: "خواننده - نام آهنگ" یا "نام آهنگ | خواننده"
        const ogTitleEl = doc.querySelector('meta[property="og:title"]');
        const rawOg = ogTitleEl ? ogTitleEl.getAttribute('content') || '' : '';
        const parts = rawOg.split(/\s*[|\-–—]\s*/).map(s => s.trim()).filter(Boolean);
        const cleanParts = parts.filter(p => !/mytehran|tehranmusic|تهران\s*موزیک/i.test(p));
        if (cleanParts.length >= 2) {
            if (!artist) artist = cleanParts[0];
            if (!title) title = cleanParts[1];
        } else if (cleanParts.length >= 1 && !title) {
            title = cleanParts[0];
        }
        if (!title && doc.title) title = doc.title.replace(/\s*[-|]\s*xPlayer.*$/i, '').trim();
        if (!image) {
            const ogImage = doc.querySelector('meta[property="og:image"]');
            if (ogImage) image = ogImage.getAttribute('content') || '';
        }
        if (!artist) {
            const artistEl = doc.querySelector('.artist a, div.artist a, [class*="artist"] a');
            if (artistEl) artist = artistEl.textContent.trim();
            if (!artist) {
                const artistEl2 = doc.querySelector('.artist, div.artist, [class*="artist"], .singer, [class*="singer"]');
                if (artistEl2) artist = artistEl2.textContent.trim();
            }
        }
        // Fallback: از div.title یا h1 یا h2 (صفحه تک‌آهنگ اغلب h2 دارد)
        if (!title) {
            const titleEl = doc.querySelector('div.title a, h1, h2, .entry-title, .post-title');
            if (titleEl) {
                let txt = titleEl.textContent.trim();
                if (txt) title = txt;
            }
        }
        if (!title && !artist && pageUrl) {
            try {
                const path = new URL(pageUrl).pathname.replace(/^\/|\/$/g, '');
                if (path) title = path.replace(/-/g, ' ');
            } catch (_) {}
        }
        // Fallback: استخراج از نام فایل لینک دانلود (مثل Erfan Tahmasbi - Emshab.mp3)
        if ((!title || !artist) && doc.querySelector) {
            const mp3Link = doc.querySelector('a[href*=".mp3"], a[href*=".m4a"]');
            if (mp3Link) {
                const href = mp3Link.getAttribute('href') || mp3Link.href || '';
                try {
                    const pathname = href.includes('?') ? href.split('?')[0] : href;
                    const filename = pathname.split('/').pop() || '';
                    let decoded = decodeURIComponent(filename).replace(/\.(mp3|m4a|ogg)(\s|$)/i, '').trim();
                    decoded = decoded.replace(/\s*\(\d+\)\s*$/, '').trim();
                    const dashParts = decoded.split(/\s*-\s*/).map(s => s.trim()).filter(Boolean);
                    if (dashParts.length >= 2) {
                        if (!artist) artist = dashParts[0];
                        if (!title) title = dashParts[1];
                    } else if (dashParts.length === 1 && !title) {
                        title = dashParts[0];
                    }
                } catch (_) {}
            }
        }
        if (image && !image.startsWith('http') && !image.startsWith('data:')) {
            image = image.startsWith('//') ? 'https:' + image : (image.startsWith('/') ? 'https://mytehranmusic.com' + image : 'https://mytehranmusic.com/' + image);
        }
        if (title) {
            title = title
                .replace(/^دانلود\s*آهنگ\s*(جدید\s*)?/i, '')
                .replace(/^دانلود\s*پادکست\s*/i, '')
                .replace(/\s*\+\s*متن\s*آهنگ.*$/i, '')
                .replace(/\s*[\(\[]?\s*کیفیت\s*\d+.*$/i, '')
                .replace(/\s*با\s*کیفیت\s*[۰-۹0-9]+\s*$/gi, '')
                .replace(/\s*با\s*کیفیت\s*[۰-۹0-9]+/gi, '')
                .replace(/\s*quality\s*[۰-۹0-9]+/gi, '')
                .replace(/\s*کوالیتی\s*[۰-۹0-9]+/gi, '')
                .trim();
            // اگر عنوان به صورت "هنرمند (گروه) نام آهنگ" باشد، جدا کنیم
            const artistTitleMatch = title.match(/^(.+?)\)\s+(.+)$/);
            if (artistTitleMatch) {
                artist = (artistTitleMatch[1] + ')').trim();
                title = artistTitleMatch[2].trim();
            }
        }
        // اگر عنوان با نام خواننده شروع شود (مثل data-track: "ایهام بغض مدام")، جدا کنیم
        if (artist && title) {
            const artistTrim = artist.trim();
            const titleTrim = title.trim();
            if (artistTrim && titleTrim.startsWith(artistTrim)) {
                const rest = titleTrim.slice(artistTrim.length).replace(/^[\s\-–—]+/, '').trim();
                if (rest) title = rest;
            }
        }
        // اگر artist شامل " - " باشد (مثل "Ehaam - Boghze Modaam")، فقط بخش اول را نگه دار
        if (artist && /\s*[\-–—]\s+/.test(artist)) {
            const firstPart = artist.split(/\s*[\-–—]\s+/)[0].trim();
            if (firstPart) artist = firstPart;
        }
        return { title: title || null, artist: artist || null, image: image || null };
    }

    togglePlayPause() {
        if (this.audioPlayer.paused) {
            if (this.currentIndex === -1 && this.playlist.length > 0) {
                this.currentIndex = 0;
                this.loadAndPlay(this.playlist[0]);
            } else {
                this.audioPlayer.play();
            }
        } else {
            this.audioPlayer.pause();
        }
        this.updatePlayButton();
    }

    playNext() {
        if (this.playlist.length === 0) return;

        // If no track is currently playing, start from the first one
        if (this.currentIndex === -1) {
            this.currentIndex = 0;
            this.loadAndPlay(this.playlist[0]);
            return;
        }

        // Store previous index to detect wrap-around
        const previousIndex = this.currentIndex;
        let nextIndex;
        
        if (this.isShuffle) {
            if (this.shuffledIndices.length === 0) {
                this.generateShuffledIndices();
            }
            const currentShuffleIndex = this.shuffledIndices.indexOf(this.currentIndex);
            nextIndex = (currentShuffleIndex + 1) % this.shuffledIndices.length;
            this.currentIndex = this.shuffledIndices[nextIndex];
        } else {
            nextIndex = (this.currentIndex + 1) % this.playlist.length;
            this.currentIndex = nextIndex;
        }

        // If we've wrapped around to the first track (from last) and repeat all is off, stop
        if (this.currentIndex === 0 && previousIndex === this.playlist.length - 1 && this.repeatMode !== 2 && !this.isShuffle) {
            this.audioPlayer.pause();
            this.currentIndex = this.playlist.length - 1; // Stay on last track
            return;
        }

        // Continue playing next track
        this.loadAndPlay(this.playlist[this.currentIndex]);
    }

    playPrevious() {
        if (this.playlist.length === 0) return;

        if (this.isShuffle) {
            if (this.shuffledIndices.length === 0) {
                this.generateShuffledIndices();
            }
            const currentShuffleIndex = this.shuffledIndices.indexOf(this.currentIndex);
            const prevShuffleIndex = currentShuffleIndex === 0 ? 
                this.shuffledIndices.length - 1 : currentShuffleIndex - 1;
            this.currentIndex = this.shuffledIndices[prevShuffleIndex];
        } else {
            this.currentIndex = this.currentIndex === 0 ? 
                this.playlist.length - 1 : this.currentIndex - 1;
        }

        this.loadAndPlay(this.playlist[this.currentIndex]);
    }

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        this.updateShuffleButton();
        
        if (this.isShuffle) {
            this.generateShuffledIndices();
        }
        
        this.savePlaylist();
    }

    updateShuffleButton() {
        if (this.shuffleBtn) {
            if (this.isShuffle) {
                this.shuffleBtn.classList.add('active');
                this.shuffleBtn.title = 'Shuffle: فعال';
            } else {
                this.shuffleBtn.classList.remove('active');
                this.shuffleBtn.title = 'Shuffle: غیرفعال';
            }
        }
        // Bottom player bar
        if (this.playerBarShuffle) {
            if (this.isShuffle) {
                this.playerBarShuffle.classList.add('active');
                if (this.playerBarShuffleOffIcon) this.playerBarShuffleOffIcon.style.display = 'none';
                if (this.playerBarShuffleOnIcon) this.playerBarShuffleOnIcon.style.display = 'block';
            } else {
                this.playerBarShuffle.classList.remove('active');
                if (this.playerBarShuffleOffIcon) this.playerBarShuffleOffIcon.style.display = 'block';
                if (this.playerBarShuffleOnIcon) this.playerBarShuffleOnIcon.style.display = 'none';
            }
        }
    }

    toggleRepeat() {
        // Cycle through: 0 (no repeat) -> 1 (repeat one) -> 2 (repeat all) -> 0
        this.repeatMode = (this.repeatMode + 1) % 3;
        this.updateRepeatButton();
        this.savePlaylist();
    }

    updateRepeatButton() {
        if (this.repeatBtn) {
            // Remove all repeat classes
            this.repeatBtn.classList.remove('repeat-off', 'repeat-one', 'repeat-all', 'active');
            
            // Hide all icons first
            const repeatOffIcon = document.getElementById('repeatOffIcon');
            const repeatOneIcon = document.getElementById('repeatOneIcon');
            const repeatAllIcon = document.getElementById('repeatAllIcon');
            
            if (repeatOffIcon) repeatOffIcon.style.display = 'none';
            if (repeatOneIcon) repeatOneIcon.style.display = 'none';
            if (repeatAllIcon) repeatAllIcon.style.display = 'none';
            
            switch (this.repeatMode) {
                case 0: // No repeat
                    this.repeatBtn.classList.add('repeat-off');
                    if (repeatOffIcon) repeatOffIcon.style.display = 'block';
                    this.repeatBtn.title = 'Repeat: غیرفعال';
                    break;
                case 1: // Repeat one
                    this.repeatBtn.classList.add('repeat-one', 'active');
                    if (repeatOneIcon) repeatOneIcon.style.display = 'block';
                    this.repeatBtn.title = 'Repeat: تکرار یک موزیک';
                    break;
                case 2: // Repeat all
                    this.repeatBtn.classList.add('repeat-all', 'active');
                    if (repeatAllIcon) repeatAllIcon.style.display = 'block';
                    this.repeatBtn.title = 'Repeat: تکرار کل پلی‌لیست';
                    break;
            }
        }
        // Bottom player bar
        if (this.playerBarRepeat) {
            if (this.playerBarRepeatOffIcon) this.playerBarRepeatOffIcon.style.display = 'none';
            if (this.playerBarRepeatOneIcon) this.playerBarRepeatOneIcon.style.display = 'none';
            if (this.playerBarRepeatAllIcon) this.playerBarRepeatAllIcon.style.display = 'none';
            
            switch (this.repeatMode) {
                case 0:
                    if (this.playerBarRepeatOffIcon) this.playerBarRepeatOffIcon.style.display = 'block';
                    this.playerBarRepeat.classList.remove('active');
                    break;
                case 1:
                    if (this.playerBarRepeatOneIcon) this.playerBarRepeatOneIcon.style.display = 'block';
                    this.playerBarRepeat.classList.add('active');
                    break;
                case 2:
                    if (this.playerBarRepeatAllIcon) this.playerBarRepeatAllIcon.style.display = 'block';
                    this.playerBarRepeat.classList.add('active');
                    break;
            }
        }
    }

    generateShuffledIndices() {
        this.shuffledIndices = Array.from({length: this.playlist.length}, (_, i) => i);
        // Fisher-Yates shuffle
        for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.shuffledIndices[i], this.shuffledIndices[j]] = [this.shuffledIndices[j], this.shuffledIndices[i]];
        }
    }

    updatePlayButton() {
        const playIcon = document.getElementById('playIcon');
        const pauseIcon = document.getElementById('pauseIcon');
        
        if (this.audioPlayer.paused) {
            if (playIcon) playIcon.style.display = 'block';
            if (pauseIcon) pauseIcon.style.display = 'none';
            // Bottom player bar
            if (this.playerBarPlayIcon) this.playerBarPlayIcon.style.display = 'block';
            if (this.playerBarPauseIcon) this.playerBarPauseIcon.style.display = 'none';
        } else {
            if (playIcon) playIcon.style.display = 'none';
            if (pauseIcon) pauseIcon.style.display = 'block';
            // Bottom player bar
            if (this.playerBarPlayIcon) this.playerBarPlayIcon.style.display = 'none';
            if (this.playerBarPauseIcon) this.playerBarPauseIcon.style.display = 'block';
        }
    }

    // When clicking top monthly item: go to detail page immediately, show spinner, then load
    openTopMonthlyDirectoryFromExplore(track) {
        // 1. Navigate to explore detail page immediately
        this.navigateToPage('exploreDetail');
        // 2. Set title and show spinner
        if (this.exploreDetailTitle) {
            this.exploreDetailTitle.textContent = track.title || 'برترین‌های ماه';
        }
        if (this.exploreDetailLoadingIndicator) {
            this.exploreDetailLoadingIndicator.style.display = 'flex';
        }
        if (this.exploreDetailContainer) {
            this.exploreDetailContainer.innerHTML = '';
        }
        if (this.exploreDetailInfiniteLoader) {
            this.exploreDetailInfiniteLoader.style.display = 'none';
        }
        this.isDirectoryPlaylist = true;
        // 3. Load (extractAudioFromPage will handle directory vs single track)
        this.extractAudioFromPage(track, { fromTopMonthly: true });
    }

    // Load playlist from directory (Index of page)
    async loadDirectoryPlaylist(directoryUrl, originalTrack, options = {}) {
        const displayInExploreDetail = options.displayInExploreDetail;
        if (!displayInExploreDetail) {
            this.showLoading(true);
        }
        console.log('Loading directory playlist from:', directoryUrl);
        
        try {
            // چند مسیر مختلف برای دور زدن CORS (مشابه extractAudioUrl)
            const fetchCandidates = [
                // 1) مستقیماً خود URL (اگر از روی https هاست شود ممکن است کار کند)
                { type: 'direct', url: directoryUrl },
                // 2) allorigins
                { type: 'allorigins', url: `https://api.allorigins.win/get?url=${encodeURIComponent(directoryUrl)}` },
                // 3) codetabs
                { type: 'codetabs', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(directoryUrl)}` }
            ];
            
            let html = null;
            let lastError = null;
            
            for (const candidate of fetchCandidates) {
                try {
                    console.log(`Trying directory fetch via ${candidate.type}:`, candidate.url);
                    const response = await fetch(candidate.url);
                    
                    if (!response.ok) {
                        lastError = new Error(`HTTP error from ${candidate.type}! status: ${response.status}`);
                        console.warn(lastError);
                        continue;
                    }
                    
                    if (candidate.type === 'allorigins') {
                        const data = await response.json();
                        html = data.contents;
                    } else if (candidate.type === 'codetabs') {
                        html = await response.text();
                    } else {
                        // direct
                        html = await response.text();
                    }
                    
                    if (html) {
                        console.log(`Directory HTML fetched successfully via ${candidate.type}`);
                        break;
                    }
                } catch (err) {
                    console.warn(`Directory fetch failed via ${candidate.type}:`, err);
                    lastError = err;
                    continue;
                }
            }
            
            if (!html) {
                throw lastError || new Error('Failed to fetch directory HTML via all methods');
            }
            
            // Parse directory listing HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Find all .mp3 links in the directory listing
            // Directory listings typically have links like: <a href="filename.mp3">filename.mp3</a>
            const mp3Links = doc.querySelectorAll('a[href$=".mp3"], a[href*=".mp3"]');
            const tracks = [];
            
            console.log(`Found ${mp3Links.length} MP3 files in directory`);
            
            mp3Links.forEach((link, index) => {
                // همیشه ابتدا مقدار خام attribute را بگیر تا به localhost resolve نشود
                let href = link.getAttribute('href') || link.href;
                if (!href || href.includes('..') || href === '../' || href === '..') return; // Skip parent directory links
                
                // Decode URL-encoded characters
                try {
                    href = decodeURIComponent(href);
                } catch (e) {
                    // If decoding fails, use original href
                }
                
                // Construct full URL
                let fullUrl;
                if (href.startsWith('http://') || href.startsWith('https://')) {
                    fullUrl = href;
                } else {
                    // Handle relative URLs - use URL constructor for proper resolution
                    try {
                        // اگر href با / شروع می‌شود، از root دامنه استفاده می‌کنیم
                        if (href.startsWith('/')) {
                            // Extract base URL from directoryUrl (e.g., https://dl.mytehranmusic.com)
                            const baseUrl = new URL(directoryUrl).origin;
                            fullUrl = baseUrl + href;
                        } else {
                            // Relative URL - combine with directoryUrl
                            const dirUrlObj = new URL(directoryUrl);
                            // Ensure directoryUrl ends with / for proper resolution
                            const baseDir = dirUrlObj.href.endsWith('/') ? dirUrlObj.href : dirUrlObj.href + '/';
                            fullUrl = new URL(href, baseDir).href;
                        }
                    } catch (e) {
                        // Fallback: simple string concatenation
                        console.warn('URL constructor failed, using fallback:', e);
                        const cleanHref = href.startsWith('/') ? href.substring(1) : href;
                        const baseDir = directoryUrl.endsWith('/') ? directoryUrl : directoryUrl + '/';
                        fullUrl = baseDir + cleanHref;
                    }
                }
                
                // Ensure fullUrl is a valid absolute URL
                if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
                    console.error('Invalid URL constructed:', fullUrl, 'from href:', href, 'directoryUrl:', directoryUrl);
                    return; // Skip this track
                }
                
                console.log(`Constructed full URL: ${fullUrl} from href: ${href}`);
                
                // Extract title from filename (prefer textContent, fallback to href)
                let title = (link.textContent || link.innerText || href).trim();
                
                // Remove .mp3 extension if present
                if (title.endsWith('.mp3')) {
                    title = title.substring(0, title.length - 4);
                }
                
                // Also decode title if it's URL-encoded
                try {
                    title = decodeURIComponent(title);
                } catch (e) {
                    // If decoding fails, use original title
                }
                
                // Try to parse "Artist - Song Title" format
                let artist = 'نامشخص';
                let songTitle = title;
                if (title.includes(' - ')) {
                    const parts = title.split(' - ');
                    if (parts.length >= 2) {
                        artist = parts[0].trim();
                        songTitle = parts.slice(1).join(' - ').trim();
                    }
                }
                
                // Create track object
                const trackObj = {
                    id: Date.now() + index,
                    title: songTitle,
                    artist: artist,
                    url: fullUrl,
                    image: originalTrack?.image || '',
                    pageUrl: fullUrl
                };
                
                tracks.push(trackObj);
                console.log(`Added track: ${artist} - ${songTitle} (${fullUrl})`);
            });
            
            if (tracks.length === 0) {
                if (!displayInExploreDetail) this.showLoading(false);
                else if (this.exploreDetailLoadingIndicator) this.exploreDetailLoadingIndicator.style.display = 'none';
                this.showError('هیچ فایل صوتی در این دایرکتوری یافت نشد');
                return;
            }
            
            // Set as current playlist (but don't auto-play; let user choose a track)
            this.playlist = tracks;
            this.currentIndex = -1;
            this.currentPlaylistId = null; // Not a custom playlist
            
            // Save playlist
            this.savePlaylist();
            
            // Set flag to indicate this is a directory playlist
            this.isDirectoryPlaylist = true;
            
            if (displayInExploreDetail) {
                // We're already on exploreDetail page - just display tracks in exploreDetailContainer
                if (this.exploreDetailLoadingIndicator) {
                    this.exploreDetailLoadingIndicator.style.display = 'none';
                }
                if (this.exploreDetailContainer) {
                    this.exploreDetailContainer.innerHTML = '';
                    tracks.forEach(track => {
                        const trackEl = this.createTrackElement(track, 'explore');
                        this.exploreDetailContainer.appendChild(trackEl);
                    });
                }
                this.showToast(`پلی‌لیست با ${tracks.length} آهنگ بارگذاری شد. برای پخش، روی یکی از آهنگ‌ها کلیک کنید.`, 'success');
            } else {
                // Original flow: show playlist detail page
                Object.values(this.pages).forEach(p => {
                    if (p) {
                        p.classList.remove('active');
                        p.style.display = 'none';
                        p.style.visibility = 'hidden';
                    }
                });
                
                if (this.playlistDetailPage) {
                    this.playlistDetailPage.classList.add('active');
                    this.playlistDetailPage.style.display = 'block';
                    this.playlistDetailPage.style.visibility = 'visible';
                    
                    const titleEl = document.getElementById('playlistDetailTitle');
                    if (titleEl) {
                        titleEl.textContent = originalTrack?.title || 'پلی‌لیست';
                    }
                    
                    if (this.playlistTracksContainer) {
                        this.playlistTracksContainer.innerHTML = `
                            <div style="display: flex; justify-content: center; align-items: center; padding: 60px 20px;">
                                <div class="spinner"></div>
                            </div>
                        `;
                    }
                }
                
                setTimeout(() => {
                    this.displayPlaylistTracks(tracks);
                    this.showLoading(false);
                    this.showToast(`پلی‌لیست با ${tracks.length} آهنگ بارگذاری شد. برای پخش، روی یکی از آهنگ‌ها کلیک کنید.`, 'success');
                }, 300);
            }
            
        } catch (error) {
            if (!displayInExploreDetail) this.showLoading(false);
            else if (this.exploreDetailLoadingIndicator) this.exploreDetailLoadingIndicator.style.display = 'none';
            console.error('Error loading directory playlist:', error);
            this.showError('خطا در بارگذاری پلی‌لیست. لطفا دوباره تلاش کنید.', {
                retry: () => this.loadDirectoryPlaylist(directoryUrl, originalTrack, options)
            });
        }
    }

    extractMetadataFromAudioUrl(audioUrl) {
        if (!audioUrl || typeof audioUrl !== 'string') return { title: null, artist: null };
        try {
            const pathname = audioUrl.includes('?') ? audioUrl.split('?')[0] : audioUrl;
            const filename = pathname.split('/').pop() || '';
            let decoded = decodeURIComponent(filename).replace(/\.(mp3|m4a|ogg|wav)(\s|$)/i, '').trim();
            decoded = decoded.replace(/\s*\(\d+\)\s*$/, '').trim();
            const dashParts = decoded.split(/\s*-\s*/).map(s => s.trim()).filter(Boolean);
            if (dashParts.length >= 2) {
                return { artist: dashParts[0], title: dashParts[1] };
            }
            if (dashParts.length === 1 && dashParts[0]) {
                return { title: dashParts[0], artist: null };
            }
        } catch (_) {}
        return { title: null, artist: null };
    }

    handlePlayFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const playUrl = params.get('play');
        if (!playUrl) return;
        try {
            const url = decodeURIComponent(playUrl);
            const isDirectAudio = url && (
                url.endsWith('.mp3') || url.endsWith('.m4a') || url.endsWith('.ogg') || url.endsWith('.wav') ||
                (url.includes('dl.mytehranmusic.com') && (url.includes('.mp3') || url.includes('.m4a')))
            );
            const meta = isDirectAudio ? this.extractMetadataFromAudioUrl(url) : {};
            const track = {
                id: Date.now(),
                title: meta.title || 'آهنگ',
                artist: meta.artist || 'در حال بارگذاری...',
                url: url,
                pageUrl: url
            };
            this.playlist = [track];
            this.currentIndex = 0;
            this.loadAndPlay(track);
            history.replaceState({}, '', window.location.pathname);
        } catch (e) {
            console.warn('Could not play from URL:', e);
        }
    }

    async shareLyricsAsStory(selectedText) {
        const track = this.currentTrackData || (this.currentIndex >= 0 && this.playlist[this.currentIndex] ? this.playlist[this.currentIndex] : null);
        if (!track) {
            this.showToast('آهنگی انتخاب نشده', 'info');
            return;
        }
        const body = document.querySelector('#lyricsModal .lyrics-modal-body');
        if (!body) return;
        const isEmpty = body.querySelector('.lyrics-empty') || body.querySelector('.lyrics-error') || body.querySelector('.lyrics-loading');
        if (isEmpty) {
            this.showToast('متن آهنگ در دسترس نیست', 'info');
            return;
        }
        const lyricsText = selectedText || this.getSelectedLyricsText(body);
        if (!lyricsText || lyricsText.length < 10) {
            this.showToast('متن مورد نظر را انتخاب کنید، سپس روی استوری کلیک کنید', 'info');
            return;
        }
        this.showLoading(true, 'در حال ساخت استوری متن...');
        try {
            const blob = await this.generateLyricsStoryImage(track, lyricsText);
            this.showStoryShareModal(track, blob);
        } catch (e) {
            console.error('Lyrics story error:', e);
            this.showToast('خطا در ساخت استوری', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async shareAsStory() {
        const track = this.currentTrackData || (this.currentIndex >= 0 && this.playlist[this.currentIndex] ? this.playlist[this.currentIndex] : null);
        if (!track) {
            this.showToast('آهنگی برای استوری نیست', 'info');
            return;
        }
        this.showLoading(true, 'در حال ساخت استوری...');
        try {
            const blob = await this.generateStoryImage(track);
            this.showStoryShareModal(track, blob);
        } catch (e) {
            console.error('Story generation error:', e);
            this.showToast('خطا در ساخت استوری', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async generateStoryImage(track) {
        const W = 1080;
        const H = 1920;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        const title = (track.title || 'آهنگ').trim();
        const artist = (track.artist || 'ناشناس').trim();
        let imgUrl = (track.image || '').trim();
        if (imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('data:')) {
            imgUrl = imgUrl.startsWith('/') ? 'https://mytehranmusic.com' + imgUrl : 'https://mytehranmusic.com/' + imgUrl;
        }

        // background gradient - darker, Spotify-like
        const gradient = ctx.createLinearGradient(0, 0, W, H);
        gradient.addColorStop(0, '#0d0d14');
        gradient.addColorStop(0.35, '#12121e');
        gradient.addColorStop(0.7, '#0a0a12');
        gradient.addColorStop(1, '#050508');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);

        // عکس دقیقا وسط صفحه، کمی بالاتر؛ متن زیرش
        const coverSize = Math.min(W, H) * 0.5;
        const coverX = (W - coverSize) / 2;
        const coverY = (H - coverSize) / 2 - 80;

        if (imgUrl) {
            try {
                const img = await this.loadImage(imgUrl);
                ctx.save();
                this.roundRect(ctx, coverX, coverY, coverSize, coverSize, 20);
                ctx.clip();
                ctx.drawImage(img, coverX, coverY, coverSize, coverSize);
                ctx.restore();
                // subtle shadow under cover
                ctx.save();
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = '#000';
                this.roundRect(ctx, coverX + 8, coverY + 12, coverSize, coverSize, 20);
                ctx.fill();
                ctx.restore();
            } catch (_) {}
        }

        const coverBottom = coverY + coverSize;
        const gapAfterCover = 65;
        let ty = coverBottom + gapAfterCover;

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.direction = 'rtl';
        ctx.font = 'bold 48px "Vazirmatn", Tahoma, sans-serif';
        const maxTitleW = W - 80;
        const titleLines = this.wrapText(ctx, title, maxTitleW);
        const lineHeight = 54;
        titleLines.forEach((line, i) => {
            ctx.fillText(line, W / 2, ty + i * lineHeight);
        });
        ty += titleLines.length * lineHeight + 18;

        ctx.font = '500 36px "Vazirmatn", Tahoma, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(artist, W / 2, ty);

        ty += 52;
        ctx.font = '500 22px "Vazirmatn", Tahoma, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('برای گوش دادن لینک را بزنید', W / 2, ty);
        ty += 36;
        ctx.font = '600 20px "Vazirmatn", Tahoma, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText('xPlayer', W / 2, ty);

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas toBlob failed'));
            }, 'image/png', 0.95);
        });
    }

    getDominantColorFromImage(img) {
        const c = document.createElement('canvas');
        const size = 64;
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, size, size);
        const data = ctx.getImageData(size / 4, size / 4, size / 2, size / 2).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            n++;
        }
        if (n === 0) return { r: 26, g: 26, b: 30 };
        return {
            r: Math.round(r / n),
            g: Math.round(g / n),
            b: Math.round(b / n)
        };
    }

    async generateLyricsStoryImage(track, lyricsText) {
        const W = 1080;
        const H = 1920;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        const title = (track.title || 'آهنگ').trim();
        const artist = (track.artist || 'ناشناس').trim();
        const lines = (lyricsText || '').split(/\n+/).map(s => s.trim()).filter(Boolean).slice(0, 14);

        const gradient = ctx.createLinearGradient(0, 0, W, H);
        gradient.addColorStop(0, '#0d0d14');
        gradient.addColorStop(0.35, '#12121e');
        gradient.addColorStop(0.7, '#0a0a12');
        gradient.addColorStop(1, '#050508');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign = 'center';
        ctx.direction = 'rtl';

        // Load track image and extract dominant color for text box
        let boxColor = 'rgba(26, 26, 30, 0.9)';
        let imgUrl = (track.image || '').trim();
        if (imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('data:')) {
            imgUrl = imgUrl.startsWith('/') ? 'https://mytehranmusic.com' + imgUrl : 'https://mytehranmusic.com/' + imgUrl;
        }
        if (imgUrl) {
            try {
                const img = await this.loadImage(imgUrl);
                const { r, g, b } = this.getDominantColorFromImage(img);
                const dr = Math.round(r * 0.25);
                const dg = Math.round(g * 0.25);
                const db = Math.round(b * 0.25);
                boxColor = `rgba(${dr}, ${dg}, ${db}, 0.88)`;
            } catch (_) {}
        }

        // Pre-calculate all display lines and total height for vertical centering
        ctx.font = '500 38px "Vazirmatn", Tahoma, sans-serif';
        const maxLineW = W - 160;
        const lineHeight = 52;
        const padding = 48;
        const allDisplayLines = [];
        for (const line of lines) {
            const wrapped = this.wrapText(ctx, line, maxLineW);
            for (const w of wrapped) allDisplayLines.push(w);
        }
        const totalTextHeight = allDisplayLines.length * lineHeight;
        const boxHeight = totalTextHeight + padding * 2;
        const boxY = (H - boxHeight) / 2;
        const boxX = 60;
        const boxW = W - 120;

        // Draw text box with rounded corners (centered, with dominant color)
        ctx.fillStyle = boxColor;
        this.roundRect(ctx, boxX, boxY, boxW, boxHeight, 24);
        ctx.fill();

        // Draw lyrics centered inside box (so middle line is at H/2)
        ctx.fillStyle = '#ffffff';
        let y = boxY + padding + lineHeight * 0.75;
        for (const w of allDisplayLines) {
            ctx.fillText(w, W / 2, y);
            y += lineHeight;
        }

        // Title and artist small, below lyrics box
        const belowBoxY = boxY + boxHeight + 36;
        ctx.font = '500 24px "Vazirmatn", Tahoma, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(title, W / 2, belowBoxY);
        ctx.font = '400 20px "Vazirmatn", Tahoma, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText(artist, W / 2, belowBoxY + 32);

        ctx.font = '500 22px "Vazirmatn", Tahoma, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('برای گوش دادن لینک را بزنید', W / 2, H - 110);
        ctx.font = '600 20px "Vazirmatn", Tahoma, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText('xPlayer', W / 2, H - 80);

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas toBlob failed'));
            }, 'image/png', 0.95);
        });
    }

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    async loadImage(url) {
        if (!url || !url.trim()) throw new Error('No image URL');
        const u = url.trim();
        const isDataUrl = u.startsWith('data:');

        // data: URLs — مستقیم بدون CORS
        if (isDataUrl) {
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = u;
            });
            return img;
        }

        // بارگذاری با پروکسی (عکس‌های خارجی معمولاً CORS ندارند)
        const proxies = [
            (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
            (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
        ];

        for (const getProxyUrl of proxies) {
            try {
                const res = await fetch(getProxyUrl(u));
                if (!res.ok) continue;
                const blob = await res.blob();
                if (blob.type === 'text/html') continue; // پروکسی خطا برگرده
                const blobUrl = URL.createObjectURL(blob);
                const img = new Image();
                await new Promise((resolve, reject) => {
                    img.onload = () => { URL.revokeObjectURL(blobUrl); resolve(); };
                    img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(); };
                    img.src = blobUrl;
                });
                return img;
            } catch (_) {
                continue;
            }
        }

        // آخرین تلاش: مستقیم با crossOrigin
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = u;
        });
        return img;
    }

    wrapText(ctx, text, maxWidth) {
        const chars = [...text];
        const lines = [];
        let line = '';
        for (const c of chars) {
            const test = line + c;
            const m = ctx.measureText(test);
            if (m.width > maxWidth && line) {
                lines.push(line);
                line = c;
            } else {
                line = test;
            }
        }
        if (line) lines.push(line);
        return lines.slice(0, 3);
    }

    wrapLyricsInSelectableWords(html) {
        const div = document.createElement('div');
        div.innerHTML = html || '';
        const text = (div.textContent || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
        const parts = [];
        for (const line of lines) {
            const words = line.split(/\s+/).filter(Boolean);
            if (!words.length) continue;
            const wordSpans = words.map(w => `<span class="lyrics-word">${this.escapeHtml(w)}</span>`).join(' ');
            parts.push(`<div class="lyrics-line">${wordSpans}</div>`);
        }
        if (!parts.length) return html;
        return `<div class="lyrics-text lyrics-selectable">${parts.join('')}</div>`;
    }

    setupLyricsClickSelection(container) {
        if (!container) return;
        let lastWord = null;
        let clickCount = 0;
        let clickTimer = null;
        const MAX_LINES = 6;

        const getAllLines = () => [...(container?.querySelectorAll('.lyrics-line') || [])];
        const getWordsInLine = (line) => [...(line?.querySelectorAll('.lyrics-word') || [])];
        const isLineFullySelected = (line) => {
            const words = getWordsInLine(line);
            return words.length > 0 && words.every(w => w.classList.contains('lyrics-selected'));
        };
        const countFullySelectedLines = () => getAllLines().filter(l => isLineFullySelected(l)).length;

        const fillContiguousInLine = (line) => {
            const words = getWordsInLine(line);
            const indices = words.map((w, i) => w.classList.contains('lyrics-selected') ? i : -1).filter(i => i >= 0);
            if (indices.length === 0) return;
            const min = Math.min(...indices);
            const max = Math.max(...indices);
            for (let i = min; i <= max; i++) words[i].classList.add('lyrics-selected');
        };

        const clearAllSelection = () => {
            container?.querySelectorAll('.lyrics-word.lyrics-selected').forEach(w => w.classList.remove('lyrics-selected'));
        };

        const deselectContiguousBlock = (line, word) => {
            const words = getWordsInLine(line);
            const idx = words.indexOf(word);
            if (idx < 0) return;
            const selectedIndices = words.map((w, i) => w.classList.contains('lyrics-selected') ? i : -1).filter(i => i >= 0);
            if (selectedIndices.length === 0) return;
            const min = Math.min(...selectedIndices);
            const max = Math.max(...selectedIndices);
            if (idx >= min && idx <= max) {
                for (let i = min; i <= max; i++) words[i].classList.remove('lyrics-selected');
            }
        };

        const getLinesWithSelection = () => getAllLines().filter(l => getWordsInLine(l).some(w => w.classList.contains('lyrics-selected')));
        const hasSelectionInOtherLine = (currentLine) => getLinesWithSelection().some(l => l !== currentLine);

        const getFullySelectedLineIndices = () => {
            const all = getAllLines();
            return all.map((l, i) => isLineFullySelected(l) ? i : -1).filter(i => i >= 0);
        };
        const isLineAdjacentToSelection = (lineIndex) => {
            const sel = getFullySelectedLineIndices();
            if (sel.length === 0) return true;
            const min = Math.min(...sel);
            const max = Math.max(...sel);
            return lineIndex === min - 1 || lineIndex === max + 1;
        };

        container.addEventListener('click', (e) => {
            const word = e.target.closest('.lyrics-word');
            if (!word) return;
            e.preventDefault();
            e.stopPropagation();
            const sameWord = lastWord === word;
            const line = word.closest('.lyrics-line');

            if (clickTimer) clearTimeout(clickTimer);

            if (sameWord) {
                clickCount++;
            } else {
                clickCount = 1;
            }
            lastWord = word;

            clickTimer = setTimeout(() => {
                const wordsInLine = getWordsInLine(line);
                if (clickCount === 1) {
                    if (isLineFullySelected(line)) {
                    } else if (word.classList.contains('lyrics-selected')) {
                        deselectContiguousBlock(line, word);
                    } else {
                        if (hasSelectionInOtherLine(line)) clearAllSelection();
                        word.classList.add('lyrics-selected');
                        fillContiguousInLine(line);
                    }
                } else if (clickCount === 2) {
                    const others = getLinesWithSelection().filter(l => l !== line);
                    const hasPartial = others.some(l => !isLineFullySelected(l));
                    if (hasPartial) clearAllSelection();
                    const allLines = getAllLines();
                    const lineIndex = allLines.indexOf(line);
                    if (!isLineFullySelected(line) && countFullySelectedLines() >= MAX_LINES) {
                        this.showToast(`حداکثر ${MAX_LINES} خط می‌توانید انتخاب کنید`, 'info');
                    } else if (!isLineAdjacentToSelection(lineIndex)) {
                        this.showToast('خطوط انتخابی باید پشت سر هم باشند', 'info');
                    } else {
                        wordsInLine.forEach(w => w.classList.add('lyrics-selected'));
                    }
                } else if (clickCount >= 3) {
                    wordsInLine.forEach(w => w.classList.remove('lyrics-selected'));
                }
                clickCount = 0;
                lastWord = null;
                clickTimer = null;
            }, 320);
        });
    }

    getSelectedLyricsText(container) {
        if (!container) return '';
        const lines = [...container.querySelectorAll('.lyrics-line')];
        const parts = [];
        let inBlock = false;
        for (const line of lines) {
            const words = line.querySelectorAll('.lyrics-word.lyrics-selected');
            if (words.length) {
                parts.push([...words].map(w => w.textContent).join(' '));
                inBlock = true;
            } else if (inBlock) {
                break;
            }
        }
        return parts.join('\n').trim();
    }

    htmlToPlainText(html) {
        const div = document.createElement('div');
        div.innerHTML = html || '';
        return (div.textContent || div.innerText || '').trim();
    }

    getShareUrlForTrack(track) {
        if (!track) return '';
        const trackSourceUrl = track.pageUrl || track.url;
        const appUrl = new URL('index.html', window.location.href).href;
        return trackSourceUrl ? `${appUrl}${appUrl.includes('?') ? '&' : '?'}play=${encodeURIComponent(trackSourceUrl)}` : appUrl;
    }

    showStoryShareModal(track, blob) {
        const existing = document.getElementById('storyShareModal');
        if (existing) existing.remove();

        const imgUrl = URL.createObjectURL(blob);
        const shareUrl = this.getShareUrlForTrack(track);
        const modal = document.createElement('div');
        modal.id = 'storyShareModal';
        modal.className = 'story-modal-overlay';
        const trackTitle = this.escapeHtml((track.title || 'آهنگ').trim());
        const trackArtist = this.escapeHtml((track.artist || 'ناشناس').trim());
        modal.innerHTML = `
            <div class="story-modal">
                <button class="story-modal-close btn-close-story" title="بستن" aria-label="بستن">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
                <div class="story-modal-preview">
                    <img src="${imgUrl}" alt="Story preview">
                </div>
                <p class="story-modal-track">${trackTitle} — ${trackArtist}</p>
                <p class="story-modal-hint">لینک را کپی کنید و در استوری اینستاگرام اضافه کنید تا با کلیک آهنگ پخش شود</p>
                <div class="story-modal-actions">
                    <button class="story-modal-btn story-modal-btn-copy btn-copy-story-link" title="کپی لینک آهنگ">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                        <span>کپی لینک</span>
                    </button>
                    <button class="story-modal-btn story-modal-btn-share btn-share-story">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
                        <span>اشتراک‌گذاری</span>
                    </button>
                    <button class="story-modal-btn story-modal-btn-download btn-download-story">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                        <span>دانلود</span>
                    </button>
                </div>
            </div>
        `;

        modal.querySelector('.btn-close-story').addEventListener('click', () => {
            URL.revokeObjectURL(imgUrl);
            modal.remove();
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                URL.revokeObjectURL(imgUrl);
                modal.remove();
            }
        });

        modal.querySelector('.btn-copy-story-link').addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(shareUrl);
                this.showToast('لینک کپی شد. در اینستاگرام لینک را به استوری اضافه کنید', 'success');
            } catch (e) {
                this.showToast('کپی لینک انجام نشد', 'error');
            }
        });

        modal.querySelector('.btn-download-story').addEventListener('click', () => {
            const a = document.createElement('a');
            a.href = imgUrl;
            a.download = `xplayer-${(track.title || 'track').replace(/[^\w\u0600-\u06FF]/g, '-')}.png`;
            a.click();
            this.showToast('تصویر دانلود شد', 'success');
        });

        modal.querySelector('.btn-share-story').addEventListener('click', async () => {
            const file = new File([blob], 'xplayer-story.png', { type: 'image/png' });
            const shareText = `${track.title || 'آهنگ'} - ${track.artist || 'ناشناس'}\n${shareUrl}`;
            try {
                await navigator.clipboard.writeText(shareUrl);
            } catch (_) {}
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    const shareData = {
                        files: [file],
                        title: `${track.title || 'آهنگ'} - ${track.artist || 'ناشناس'}`,
                        text: shareText,
                        url: shareUrl
                    };
                    if (navigator.canShare(shareData)) {
                        await navigator.share(shareData);
                    } else {
                        await navigator.share({ files: [file], title: shareData.title, text: shareText });
                    }
                    this.showToast('لینک کپی شد. در اینستاگرام لینک را به استوری اضافه کنید تا با کلیک آهنگ پخش شود', 'success');
                } catch (e) {
                    if (e.name !== 'AbortError') this.showToast('اشتراک‌گذاری انجام نشد', 'error');
                }
            } else {
                const a = document.createElement('a');
                a.href = imgUrl;
                a.download = `xplayer-${(track.title || 'track').replace(/[^\w\u0600-\u06FF]/g, '-')}.png`;
                a.click();
                this.showToast('تصویر و لینک کپی شد. در اینستاگرام لینک را به استوری اضافه کنید', 'success');
            }
        });

        document.body.appendChild(modal);
    }

    async shareCurrentTrack() {
        const track = this.currentTrackData || (this.currentIndex >= 0 && this.playlist[this.currentIndex] ? this.playlist[this.currentIndex] : null);
        if (!track) {
            this.showToast('آهنگی برای اشتراک‌گذاری نیست', 'info');
            return;
        }
        const shareUrl = this.getShareUrlForTrack(track);
        const shareText = `${track.title || 'آهنگ'} - ${track.artist || 'ناشناس'}`;
        const shareData = {
            title: track.title || 'آهنگ',
            text: shareText,
            url: shareUrl
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
                this.showToast('اشتراک‌گذاری انجام شد', 'success');
            } else {
                const fullText = `${shareText}\n${shareUrl}`;
                await navigator.clipboard.writeText(fullText);
                this.showToast('لینک کپی شد', 'success');
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            try {
                await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
                this.showToast('لینک کپی شد', 'success');
            } catch (e) {
                this.showError('اشتراک‌گذاری انجام نشد');
            }
        }
    }

    preloadNextTrack() {
        const nextIdx = this.isShuffle ? 
            (this.shuffledIndices[this.shuffledIndices.indexOf(this.currentIndex) + 1]) :
            this.currentIndex + 1;
        const nextTrack = nextIdx >= 0 && nextIdx < this.playlist.length ? this.playlist[nextIdx] : null;
        if (!nextTrack?.url) return;
        const url = nextTrack.url;
        if (url.endsWith('.mp3') || url.endsWith('.m4a') || url.includes('dl.mytehranmusic.com')) {
            fetch(url).catch(() => {});
        }
    }

    async cacheAudio(audioUrl) {
        // Cache audio file using Service Worker (optional optimization)
        if (!audioUrl) return;

        if ('serviceWorker' in navigator && 'caches' in window) {
            try {
                // Only attempt to cache same-origin assets to avoid CORS errors in dev
                const urlObj = new URL(audioUrl, window.location.href);
                if (urlObj.origin !== window.location.origin) {
                    // Skip caching for cross-origin audio (will still play, فقط کش نمی‌شود)
                    return;
                }

                const cache = await caches.open('mytehran-audio-v1');
                const cached = await cache.match(audioUrl);
                if (!cached) {
                    await cache.add(audioUrl);
                    console.debug('Audio cached:', audioUrl);
                }
            } catch (error) {
                // در محیط‌های لوکال/بدون SW ممکن است خطا رخ دهد؛ نادیده می‌گیریم
                console.debug('Failed to cache audio (ignored):', error);
            }
        }
    }

    updatePlaylistDisplay() {
        // Check if playlistContainer exists (it might not exist in new layout)
        if (!this.playlistContainer) {
            return; // Skip if container doesn't exist
        }
        
        this.playlistContainer.innerHTML = '';
        
        if (this.playlistCount) {
            this.playlistCount.textContent = this.playlist.length;
        }

        if (this.playlist.length === 0) {
            this.playlistContainer.innerHTML = '<p class="empty-state">پلی‌لیست خالی است</p>';
            return;
        }

        this.playlist.forEach((track, index) => {
            const trackElement = this.createTrackElement(track, 'playlist');
            if (index === this.currentIndex) {
                trackElement.classList.add('active');
            }
            this.playlistContainer.appendChild(trackElement);
        });
    }

    clearPlaylist() {
        if (confirm('آیا مطمئن هستید که می‌خواهید پلی‌لیست را پاک کنید؟')) {
            this.playlist = [];
            this.currentIndex = -1;
            this.audioPlayer.pause();
            this.audioPlayer.src = '';
            this.updatePlayingStateInAllViews();
            // Hide bottom player bar if no track is playing
            if (this.bottomPlayerBar) {
                this.bottomPlayerBar.style.display = 'none';
            }
            this.updatePlaylistDisplay();
            this.savePlaylist();
        }
    }

    savePlaylist() {
        // Save current playing state (for search results or selected custom playlist)
        localStorage.setItem('mytehranPlaylist', JSON.stringify(this.playlist));
        localStorage.setItem('mytehranCurrentIndex', this.currentIndex.toString());
        localStorage.setItem('mytehranCurrentPlaylistId', this.currentPlaylistId);
        localStorage.setItem('mytehranRepeatMode', this.repeatMode.toString());
        localStorage.setItem('mytehranShuffle', this.isShuffle.toString());
    }

    saveCustomPlaylists() {
        localStorage.setItem('mytehranCustomPlaylists', JSON.stringify(this.customPlaylists));
        localStorage.setItem('mytehranNextPlaylistId', this.nextPlaylistId.toString());
    }

    loadCustomPlaylists() {
        // Ensure customPlaylists is initialized
        if (!this.customPlaylists || typeof this.customPlaylists !== 'object') {
            this.customPlaylists = {};
        }
        
        const saved = localStorage.getItem('mytehranCustomPlaylists');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') {
                    this.customPlaylists = parsed;
                } else {
                    this.customPlaylists = {};
                }
            } catch (e) {
                console.error('Error loading custom playlists:', e);
                this.customPlaylists = {};
            }
        }
        
        // Initialize favorite playlist if it doesn't exist
        if (!this.customPlaylists[this.FAVORITE_PLAYLIST_ID]) {
            this.customPlaylists[this.FAVORITE_PLAYLIST_ID] = {
                name: 'علاقه‌مندی‌ها',
                tracks: [],
                downloaded: false,
                isFavorite: true // Mark as favorite playlist
            };
            this.saveCustomPlaylists();
        }
        
        // Initialize favorite playlist if it doesn't exist
        if (!this.customPlaylists[this.FAVORITE_PLAYLIST_ID]) {
            this.customPlaylists[this.FAVORITE_PLAYLIST_ID] = {
                name: 'علاقه‌مندی‌ها',
                tracks: [],
                downloaded: false,
                isFavorite: true // Mark as favorite playlist
            };
            this.saveCustomPlaylists();
        }
        
        const savedNextId = localStorage.getItem('mytehranNextPlaylistId');
        if (savedNextId) {
            this.nextPlaylistId = parseInt(savedNextId);
        }
        
        // Don't display here - will be displayed when navigating to playlists page
        // This prevents error during initialization when currentPage is not set yet
    }

    createNewPlaylist(trackToAdd = null) {
        const name = prompt('نام پلی‌لیست را وارد کنید:');
        if (!name || !name.trim()) {
            return;
        }
        
        const id = this.nextPlaylistId++;
        this.customPlaylists[id] = {
            name: name.trim(),
            tracks: [],
            downloaded: false
        };
        
        // If track is provided, add it to the new playlist
        if (trackToAdd) {
            this.addTrackToCustomPlaylist(id, trackToAdd);
        }
        
        this.saveCustomPlaylists();
        
        // Only display if we're on playlists page
        if (this.currentPage === 'playlists') {
            this.displayCustomPlaylistsMain();
        }
        
        return id; // Return the new playlist ID
    }

    displayCustomPlaylists() {
        // This function is for old layout, use displayCustomPlaylistsMain instead
        if (this.playlistsListMain) {
            this.displayCustomPlaylistsMain();
            return;
        }
        
        // Fallback for old layout if playlistsList exists
        if (!this.playlistsList) {
            return;
        }
        
        this.playlistsList.innerHTML = '';
        
        // Ensure customPlaylists is an object
        if (!this.customPlaylists || typeof this.customPlaylists !== 'object') {
            this.customPlaylists = {};
        }
        
        const playlists = Object.entries(this.customPlaylists);
        if (playlists.length === 0) {
            this.playlistsList.innerHTML = '<p class="empty-state">هیچ پلی‌لیستی وجود ندارد</p>';
            return;
        }
        
        playlists.forEach(([id, playlist]) => {
            const playlistEl = document.createElement('div');
            playlistEl.className = 'custom-playlist-item';
            if (this.currentPlaylistId === id) {
                playlistEl.classList.add('active');
            }
            
            playlistEl.innerHTML = `
                <div class="playlist-info">
                    <h4>${this.escapeHtml(playlist.name)}</h4>
                    <p>${playlist.tracks.length} موزیک</p>
                    ${playlist.downloaded ? '<span class="downloaded-badge">✓ دانلود شده</span>' : ''}
                </div>
                <div class="playlist-actions">
                    <button class="btn btn-small btn-play-playlist" data-playlist-id="${id}" title="پخش">▶</button>
                    <button class="btn btn-small btn-download-playlist" data-playlist-id="${id}" title="دانلود برای آفلاین">⬇</button>
                    <button class="btn btn-small btn-edit-playlist" data-playlist-id="${id}" title="ویرایش">✏</button>
                    <button class="btn btn-small btn-delete-playlist" data-playlist-id="${id}" title="حذف">🗑</button>
                </div>
            `;
            
            // Attach event listeners
            playlistEl.querySelector('.btn-play-playlist').addEventListener('click', () => {
                this.selectCustomPlaylist(id);
            });
            
            playlistEl.querySelector('.btn-download-playlist').addEventListener('click', () => {
                this.downloadPlaylist(id);
            });
            
            playlistEl.querySelector('.btn-edit-playlist').addEventListener('click', () => {
                this.editPlaylist(id);
            });
            
            playlistEl.querySelector('.btn-delete-playlist').addEventListener('click', () => {
                this.deletePlaylist(id);
            });
            
            this.playlistsList.appendChild(playlistEl);
        });
    }

    selectCustomPlaylist(playlistId, autoPlay = false) {
        const playlist = this.customPlaylists[playlistId];
        if (!playlist) {
            console.error('Playlist not found:', playlistId);
            return;
        }
        
        if (playlist.tracks.length === 0) {
            this.showError('پلی‌لیست خالی است');
            return;
        }
        
        this.currentPlaylistId = playlistId;
        this.playlist = [...playlist.tracks];
        
        // Show playlist detail page
        this.showPlaylistDetail(playlistId, playlist);
        
        // If autoPlay is true, play the first track
        if (autoPlay) {
            this.currentIndex = 0;
            const firstTrack = this.playlist[0];
            if (firstTrack) {
                this.loadAndPlay(firstTrack);
            }
            this.savePlaylist();
        }
        
        // Add to recent playlists
        this.addToRecentPlaylists(playlistId, playlist.name, playlist.tracks);
    }
    
    showPlaylistDetail(playlistId, playlist) {
        // If playlist is not provided, get it from customPlaylists
        if (!playlist && playlistId) {
            playlist = this.customPlaylists[playlistId];
        }
        
        if (!playlist) {
            console.error('Playlist not found:', playlistId);
            return;
        }
        
        // Ensure tracks array exists
        if (!playlist.tracks || !Array.isArray(playlist.tracks)) {
            console.warn('Playlist tracks is not an array:', playlist);
            playlist.tracks = [];
        }
        
        // Hide all pages
        Object.values(this.pages).forEach(p => {
            if (p) {
                p.classList.remove('active');
                p.style.display = 'none';
                p.style.visibility = 'hidden';
            }
        });
        
        // Show playlist detail page
        if (this.playlistDetailPage) {
            this.playlistDetailPage.classList.add('active');
            this.playlistDetailPage.style.display = 'block';
            this.playlistDetailPage.style.visibility = 'visible';
            
            // Set title
            const titleEl = document.getElementById('playlistDetailTitle');
            if (titleEl) {
                titleEl.textContent = playlist.name || 'پلی‌لیست';
            }
            
            // Set current playlist for playback
            this.currentPlaylistId = playlistId;
            this.playlist = playlist.tracks;
            
            // Display tracks
            this.displayPlaylistTracks(playlist.tracks);
        }
    }
    
    displayPlaylistTracks(tracks) {
        if (!this.playlistTracksContainer) {
            console.error('playlistTracksContainer not found');
            return;
        }
        
        this.playlistTracksContainer.innerHTML = '';
        
        if (!tracks || tracks.length === 0) {
            this.playlistTracksContainer.innerHTML = '<p class="empty-state">این پلی‌لیست خالی است</p>';
            return;
        }
        
        const playlistId = this.currentPlaylistId;
        
        console.log('Displaying playlist tracks:', tracks.length, tracks);
        
        tracks.forEach((track, index) => {
            if (!track) {
                console.warn('Invalid track at index', index);
                return;
            }
            
            // Ensure track has required properties
            if (!track.title) {
                console.warn('Track missing title at index', index, track);
                track.title = 'بدون عنوان';
            }
            if (!track.artist) {
                console.warn('Track missing artist at index', index, track);
                track.artist = 'ناشناس';
            }
            if (!track.id) {
                track.id = Date.now() + index;
            }
            
            console.log('Creating track element:', track.title, track.artist, track);
            const trackElement = this.createTrackElement(track, 'playlist-detail', index);
            if (trackElement) {
                trackElement.draggable = true;
                trackElement.dataset.trackIndex = String(index);
                trackElement.dataset.playlistId = playlistId || '';
                trackElement.classList.add('draggable-track');
                this.playlistTracksContainer.appendChild(trackElement);
            } else {
                console.error('Failed to create track element for:', track);
            }
        });
        if (playlistId) {
            this.setupPlaylistDragDrop(playlistId);
            this.setupPlaylistImportExport(playlistId);
        }
    }

    setupPlaylistDragDrop(playlistId) {
        if (!this.playlistTracksContainer) return;
        const container = this.playlistTracksContainer;
        let draggedIndex = null;
        container.querySelectorAll('.draggable-track').forEach(el => {
            el.ondragstart = (e) => {
                draggedIndex = parseInt(el.dataset.trackIndex, 10);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', draggedIndex);
                el.classList.add('dragging');
            };
            el.ondragend = () => el.classList.remove('dragging');
            el.ondragover = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const idx = parseInt(el.dataset.trackIndex, 10);
                if (draggedIndex !== null && draggedIndex !== idx) {
                    el.classList.add('drag-over');
                }
            };
            el.ondragleave = () => el.classList.remove('drag-over');
            el.ondrop = (e) => {
                e.preventDefault();
                el.classList.remove('drag-over');
                const dropIndex = parseInt(el.dataset.trackIndex, 10);
                if (draggedIndex === null || draggedIndex === dropIndex) return;
                const playlist = this.customPlaylists[playlistId];
                if (!playlist) return;
                const tracks = playlist.tracks;
                const [moved] = tracks.splice(draggedIndex, 1);
                tracks.splice(dropIndex, 0, moved);
                this.saveCustomPlaylists();
                this.displayPlaylistTracks(playlist.tracks);
                if (this.currentPlaylistId === playlistId) {
                    this.playlist = [...playlist.tracks];
                    this.currentIndex = this.currentIndex === draggedIndex ? dropIndex : 
                        this.currentIndex === dropIndex ? draggedIndex : 
                        this.currentIndex < Math.min(draggedIndex, dropIndex) || this.currentIndex > Math.max(draggedIndex, dropIndex) ? this.currentIndex :
                        this.currentIndex + (draggedIndex < dropIndex ? -1 : 1);
                    this.updatePlaylistDisplay();
                }
            };
        });
    }

    setupPlaylistImportExport(playlistId) {
        const exportBtn = document.getElementById('playlistExportBtn');
        const importLabel = document.getElementById('playlistImportLabel');
        const importInput = document.getElementById('playlistImportInput');
        const playlist = this.customPlaylists[playlistId];
        if (!playlist) {
            if (exportBtn) exportBtn.style.display = 'none';
            if (importLabel) importLabel.style.display = 'none';
            return;
        }
        if (exportBtn) {
            exportBtn.style.display = '';
            exportBtn.onclick = () => {
                const playlist = this.customPlaylists[playlistId];
                if (!playlist) return;
                const data = JSON.stringify({ name: playlist.name, tracks: playlist.tracks }, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${playlist.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_')}.json`;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
                this.showToast('پلی‌لیست صادر شد', 'success');
            };
        }
        if (importLabel) importLabel.style.display = '';
        if (importInput) {
            importInput.onchange = (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const data = JSON.parse(reader.result);
                        const tracks = data.tracks || [];
                        if (tracks.length === 0) {
                            this.showError('فایل نامعتبر است');
                            return;
                        }
                        const playlist = this.customPlaylists[playlistId];
                        if (playlist) {
                            playlist.tracks.push(...tracks);
                            this.saveCustomPlaylists();
                            this.displayPlaylistTracks(playlist.tracks);
                            this.showToast(`${tracks.length} آهنگ وارد شد`, 'success');
                        }
                    } catch (err) {
                        this.showError('خطا در خواندن فایل');
                    }
                    importInput.value = '';
                };
                reader.readAsText(file);
            };
        }
    }

    async downloadPlaylist(playlistId) {
        const playlist = this.customPlaylists[playlistId];
        if (!playlist || playlist.tracks.length === 0) {
            this.showError('پلی‌لیست خالی است');
            return;
        }
        
        this.showLoading(true);
        this.showError('در حال دانلود موزیک‌ها...');
        
        try {
            let successCount = 0;
            let failCount = 0;
            
            for (const track of playlist.tracks) {
                const audioUrl = track.url;
                const isDirectAudio = audioUrl.endsWith('.mp3') || 
                                      audioUrl.endsWith('.m4a') || 
                                      audioUrl.endsWith('.ogg') || 
                                      audioUrl.includes('dl.mytehranmusic.com');
                
                if (isDirectAudio) {
                    try {
                        await this.cacheAudio(audioUrl);
                        successCount++;
                    } catch (err) {
                        console.warn('Failed to cache:', audioUrl, err);
                        failCount++;
                    }
                } else {
                    try {
                        const result = await this.extractAudioUrl(audioUrl);
                        const url = result && typeof result === 'object' ? result.url : result;
                        if (url) {
                            await this.cacheAudio(url);
                            successCount++;
                        } else {
                            failCount++;
                        }
                    } catch (err) {
                        console.warn('Failed to extract and cache:', audioUrl, err);
                        failCount++;
                    }
                }
            }
            
            playlist.downloaded = true;
            this.saveCustomPlaylists();
            this.displayCustomPlaylistsMain();
            
            this.showLoading(false);
            this.hideError();
            this.showError(`دانلود کامل شد: ${successCount} موفق، ${failCount} ناموفق`);
        } catch (error) {
            console.error('Download error:', error);
            this.showLoading(false);
            this.showError('خطا در دانلود پلی‌لیست');
        }
    }

    editPlaylist(playlistId) {
        const playlist = this.customPlaylists[playlistId];
        if (!playlist) return;
        
        // Show playlist tracks in a modal or section
        this.showPlaylistEditor(playlistId, playlist);
    }

    showPlaylistEditor(playlistId, playlist) {
        // Create a simple editor interface
        const editor = document.createElement('div');
        editor.className = 'playlist-editor';
        editor.innerHTML = `
            <div class="editor-header">
                <h3>ویرایش: ${this.escapeHtml(playlist.name)}</h3>
                <button class="btn-close-editor">✕</button>
            </div>
            <div class="editor-tracks">
                ${playlist.tracks.map((track, index) => `
                    <div class="editor-track-item">
                        <span>${index + 1}. ${this.escapeHtml(track.title)} - ${this.escapeHtml(track.artist)}</span>
                        <button class="btn btn-small btn-remove-from-playlist" data-playlist-id="${playlistId}" data-track-index="${index}">🗑</button>
                    </div>
                `).join('')}
            </div>
            <div class="editor-actions">
                <button class="btn btn-secondary btn-close-editor">بستن</button>
            </div>
        `;
        
        document.body.appendChild(editor);
        
        // Close button
        editor.querySelectorAll('.btn-close-editor').forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(editor);
            });
        });
        
        // Remove track buttons
        editor.querySelectorAll('.btn-remove-from-playlist').forEach(btn => {
            btn.addEventListener('click', () => {
                const trackIndex = parseInt(btn.dataset.trackIndex);
                this.removeTrackFromPlaylist(playlistId, trackIndex);
                document.body.removeChild(editor);
                this.displayCustomPlaylistsMain();
            });
        });
    }

    deletePlaylist(playlistId) {
        // Prevent deletion of favorite playlist
        if (playlistId === this.FAVORITE_PLAYLIST_ID) {
            this.showError('نمی‌توان پلی‌لیست علاقه‌مندی‌ها را حذف کرد');
            return;
        }
        
        if (confirm('آیا مطمئن هستید که می‌خواهید این پلی‌لیست را حذف کنید؟')) {
            delete this.customPlaylists[playlistId];
            if (this.currentPlaylistId === playlistId) {
                this.currentPlaylistId = null;
                this.playlist = [];
                this.currentIndex = -1;
            }
            this.saveCustomPlaylists();
            this.displayCustomPlaylistsMain();
            this.updatePlaylistDisplay();
        }
    }

    addTrackToCustomPlaylist(playlistId, track) {
        const playlist = this.customPlaylists[playlistId];
        if (!playlist) {
            console.error('Playlist not found:', playlistId);
            return;
        }
        
        // Normalize URL for comparison (remove query params, fragments, etc.)
        const normalizeUrl = (url) => {
            if (!url) return '';
            try {
                const urlObj = new URL(url);
                // Compare based on pathname and hostname, ignore query params
                return urlObj.origin + urlObj.pathname;
            } catch (e) {
                // If URL parsing fails, use as is
                return url.split('?')[0].split('#')[0];
            }
        };
        
        const trackUrl = normalizeUrl(track.url);
        const trackPageUrl = track.pageUrl ? normalizeUrl(track.pageUrl) : null;
        
        // Check if track already exists by URL (more reliable than ID)
        const existingTrack = playlist.tracks.find(t => {
            const existingUrl = normalizeUrl(t.url);
            const existingPageUrl = t.pageUrl ? normalizeUrl(t.pageUrl) : null;
            
            // Check if URLs match (either direct URL or page URL)
            return existingUrl === trackUrl || 
                   (trackPageUrl && existingPageUrl === trackPageUrl) ||
                   (trackPageUrl && existingUrl === trackPageUrl) ||
                   (existingPageUrl && trackUrl === existingPageUrl);
        });
        
        if (existingTrack) {
            this.showToast('این موزیک قبلا در پلی‌لیست است', 'info');
            return;
        }
        
        playlist.tracks.push({...track});
        playlist.downloaded = false; // Reset download status
        this.saveCustomPlaylists();
        
        // Only display if we're on playlists page
        if (this.currentPage === 'playlists') {
            this.displayCustomPlaylistsMain();
        }
        
        // Also update search results if track is displayed there
        this.updateTrackElementInResults(track.id);
    }
    
    updateTrackElementInResults(trackId) {
        // Update heart icon in search results if track is displayed
        const trackElement = document.querySelector(`[data-track-id="${trackId}"]`);
        if (trackElement) {
            const heartBtn = trackElement.querySelector('.btn-favorite');
            const heartIcon = trackElement.querySelector('.heart-icon');
            if (heartBtn && heartIcon) {
                const isFav = this.isTrackInFavorites(trackId);
                if (isFav) {
                    heartBtn.classList.add('favorite-active');
                    heartBtn.title = 'حذف از علاقه‌مندی‌ها';
                    heartIcon.setAttribute('fill', 'currentColor');
                } else {
                    heartBtn.classList.remove('favorite-active');
                    heartBtn.title = 'اضافه به علاقه‌مندی‌ها';
                    heartIcon.setAttribute('fill', 'none');
                }
            }
        }
    }

    removeTrackFromPlaylist(playlistId, trackIndex) {
        const playlist = this.customPlaylists[playlistId];
        if (!playlist) return;
        
        playlist.tracks.splice(trackIndex, 1);
        playlist.downloaded = false; // Reset download status
        
        if (this.currentPlaylistId === playlistId) {
            this.playlist = [...playlist.tracks];
            if (this.currentIndex >= this.playlist.length) {
                this.currentIndex = -1;
            }
            this.updatePlaylistDisplay();
            if (this.playlistTracksContainer) {
                this.displayPlaylistTracks(this.playlist);
            }
        }
        
        this.saveCustomPlaylists();
        this.showToast('موزیک از پلی‌لیست حذف شد', 'success');
    }

    loadPlaylist() {
        const saved = localStorage.getItem('mytehranPlaylist');
        if (saved) {
            try {
                this.playlist = JSON.parse(saved);
                const savedIndex = localStorage.getItem('mytehranCurrentIndex');
                if (savedIndex) {
                    this.currentIndex = parseInt(savedIndex);
                }
                
                // Load repeat mode
                const savedRepeatMode = localStorage.getItem('mytehranRepeatMode');
                if (savedRepeatMode !== null) {
                    this.repeatMode = parseInt(savedRepeatMode);
                }
                
                // Load shuffle state
                const savedShuffle = localStorage.getItem('mytehranShuffle');
                if (savedShuffle !== null) {
                    this.isShuffle = savedShuffle === 'true';
                }
                
                // Load current playlist ID
                const savedPlaylistId = localStorage.getItem('mytehranCurrentPlaylistId');
                if (savedPlaylistId !== null && savedPlaylistId !== 'null') {
                    this.currentPlaylistId = savedPlaylistId;
                    // If it's a custom playlist, load it
                    if (this.customPlaylists[savedPlaylistId]) {
                        this.playlist = [...this.customPlaylists[savedPlaylistId].tracks];
                    }
                } else {
                    this.currentPlaylistId = null;
                }
                
                // Only update display if container exists
                if (this.playlistContainer) {
                    this.updatePlaylistDisplay();
                }
                this.updateShuffleButton();
                this.updateRepeatButton();
            } catch (e) {
                console.error('Error loading playlist:', e);
            }
        }
    }

    showLoading(show, message) {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = show ? 'flex' : 'none';
            const p = this.loadingIndicator?.querySelector('.loading-overlay-content p');
            if (p && show) p.textContent = message || 'در حال بارگذاری آهنگ...';
        }
    }

    applyMarqueeIfNeeded(el, threshold = 22) {
        if (!el) return;
        const wrapper = el.parentElement;
        if (!wrapper) return;
        const len = (el.textContent || '').trim().length;
        wrapper.classList.toggle('marquee', len > threshold);
    }

    updateTrackDisplay(title, artist) {
        const t = title || 'آهنگ';
        const a = artist || 'ناشناس';
        if (this.currentTrackEl) {
            this.currentTrackEl.textContent = t;
            this.applyMarqueeIfNeeded(this.currentTrackEl, 22);
        }
        if (this.currentArtistEl) {
            this.currentArtistEl.textContent = a;
        }
        if (this.playerBarTitle) {
            this.playerBarTitle.textContent = t;
        }
        if (this.playerBarArtist) {
            this.playerBarArtist.textContent = a;
        }
    }

    showError(message, options = {}) {
        if (!this.errorMessage) return;
        (this.errorMessageText || this.errorMessage).textContent = message;
        if (this.errorRetryBtn) {
            this.errorRetryBtn.style.display = options.retry ? 'inline-block' : 'none';
            this.errorRetryBtn.onclick = () => {
                this.hideError();
                if (options.retry) options.retry();
            };
        }
        this.errorMessage.style.display = 'flex';
        if (!options.retry) {
            setTimeout(() => this.hideError(), 5000);
        }
    }

    hideError() {
        if (this.errorMessage) {
            this.errorMessage.style.display = 'none';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showToast(message, type = 'success') {
        if (!this.toastContainer) {
            console.warn('Toast container not found');
            return;
        }
        
        // Remove existing toast if any
        const existingToast = this.toastContainer.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${this.escapeHtml(message)}</span>
            </div>
        `;
        
        // Add to container
        this.toastContainer.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Auto remove after 2 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300); // Wait for animation to complete
        }, 2000);
    }

    setupNavigation() {
        // Try to load saved page from localStorage
        let savedPage = 'home';
        try {
            const saved = localStorage.getItem('mytehranCurrentPage');
            console.log('Saved page from localStorage:', saved);
            if (saved && (saved === 'home' || saved === 'search' || saved === 'playlists' || saved === 'settings' || saved === 'explore')) {
                savedPage = saved;
                console.log('Restoring saved page:', savedPage);
            } else {
                console.log('No valid saved page found, defaulting to home');
            }
        } catch (e) {
            console.warn('Could not load saved page from localStorage:', e);
        }
        
        console.log('Navigating to page:', savedPage);
        console.log('Available pages:', Object.keys(this.pages));
        
        // Navigate to saved page or default to home
        this.navigateToPage(savedPage);
    }

    navigateToPage(page) {
        console.log('Navigating to page:', page);
        console.log('Available pages:', this.pages);
        
        // Hide all pages first (force hide with !important via inline style)
        Object.values(this.pages).forEach(p => {
            if (p) {
                p.classList.remove('active');
                p.style.display = 'none';
                p.style.visibility = 'hidden';
            }
        });
        
        // Also hide playlistDetailPage if it exists (it's not in this.pages)
        if (this.playlistDetailPage) {
            this.playlistDetailPage.classList.remove('active');
            this.playlistDetailPage.style.display = 'none';
            this.playlistDetailPage.style.visibility = 'hidden';
        }
        
        // Remove active from all nav items
        if (this.navItems && this.navItems.length > 0) {
            this.navItems.forEach(item => item.classList.remove('active'));
        }
        
        // Show selected page
        if (this.pages[page]) {
            this.pages[page].classList.add('active');
            this.pages[page].style.display = 'block';
            this.pages[page].style.visibility = 'visible';
            console.log('Page', page, 'displayed successfully');
        } else {
            console.error('Page not found:', page, 'Available:', Object.keys(this.pages));
            // Fallback to home if page not found
            if (this.pages.home) {
                this.pages.home.classList.add('active');
                this.pages.home.style.display = 'block';
                this.pages.home.style.visibility = 'visible';
                page = 'home';
            }
        }
        
        // Activate nav item
        if (this.navItems && this.navItems.length > 0) {
            const navItem = Array.from(this.navItems).find(item => item.dataset.page === page);
            if (navItem) {
                navItem.classList.add('active');
            }
        }
        
        this.currentPage = page;
        
        // Scroll to top when switching pages
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Save current page to localStorage
        try {
            localStorage.setItem('mytehranCurrentPage', page);
            console.log('Saved current page to localStorage:', page);
        } catch (e) {
            console.warn('Could not save current page to localStorage:', e);
        }
        
        // Update page content
        if (page === 'home') {
            this.updateHomePage();
        } else if (page === 'playlists') {
            this.displayCustomPlaylistsMain();
        } else if (page === 'search') {
            // Ensure search history is displayed
            this.displaySearchHistory();
        } else if (page === 'explore') {
            this.loadExploreData();
        } else if (page === 'settings') {
            this.updateSettingsPage();
        } else if (page === 'player') {
            this.updatePlayerPageFavoriteBtn();
        }
    }

    async getCacheStats() {
        const result = { count: 0, size: 0, totalUsage: 0 };
        if (!('caches' in window)) return result;

        // Try to get audio cache stats from Service Worker first (more reliable)
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            try {
                const swResult = await new Promise((resolve) => {
                    const mc = new MessageChannel();
                    let done = false;
                    const t = setTimeout(() => {
                        if (!done) { done = true; resolve(null); }
                    }, 3000);
                    mc.port1.onmessage = (e) => {
                        if (!done) { done = true; clearTimeout(t); resolve(e.data); }
                    };
                    navigator.serviceWorker.controller.postMessage({ type: 'getCacheStats' }, [mc.port2]);
                });
                if (swResult) {
                    result.count = swResult.count || 0;
                    result.size = swResult.size || 0;
                }
            } catch (e) {
                console.debug('SW cache stats failed, using direct:', e);
            }
        }
        if (result.count === 0 && result.size === 0) {
            try {
                const cache = await caches.open('mytehran-audio-v1');
                const keys = await cache.keys();
                result.count = keys.length;
                for (const request of keys) {
                    try {
                        const response = await cache.match(request);
                        if (response) {
                            const cl = response.headers.get('content-length');
                            if (cl) {
                                result.size += parseInt(cl, 10) || 0;
                            } else {
                                const blob = await response.blob();
                                result.size += blob.size;
                            }
                        }
                    } catch (err) {
                        // Opaque response - skip
                    }
                }
            } catch (e) {
                console.warn('Could not get cache stats:', e);
            }
        }
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                result.totalUsage = estimate.usage || 0;
            } catch (e) {
                console.warn('Could not get storage estimate:', e);
            }
        }
        return result;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '۰ بایت';
        const k = 1024;
        const sizes = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const value = (bytes / Math.pow(k, i)).toFixed(2);
        const persianDigits = value.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
        return `${persianDigits} ${sizes[i]}`;
    }

    async updateSettingsPage() {
        const countEl = document.getElementById('settingsCachedCount');
        const sizeEl = document.getElementById('settingsCacheSize');
        const totalEl = document.getElementById('settingsTotalStorage');
        const hintEl = document.getElementById('settingsCacheHint');
        if (countEl) countEl.textContent = '...';
        if (sizeEl) sizeEl.textContent = '...';
        if (totalEl) totalEl.textContent = '...';
        if (hintEl) { hintEl.style.display = 'none'; hintEl.textContent = ''; }
        const stats = await this.getCacheStats();
        if (countEl) countEl.textContent = stats.count.toString();
        if (sizeEl) sizeEl.textContent = this.formatBytes(stats.size);
        if (totalEl) totalEl.textContent = stats.totalUsage > 0 ? this.formatBytes(stats.totalUsage) : '-';
        if (hintEl && stats.count === 0) {
            if (!window.isSecureContext || location.protocol === 'file:') {
                hintEl.textContent = 'برای کش شدن، اپ باید از localhost یا HTTPS اجرا شود (نه file://).';
                hintEl.style.display = 'block';
            } else if (!navigator.serviceWorker?.controller) {
                hintEl.textContent = 'Service Worker هنوز فعال نیست. صفحه را refresh کنید و دوباره آهنگ پخش کنید.';
                hintEl.style.display = 'block';
            }
        }
    }

    setupSettingsPage() {
        const refreshBtn = document.getElementById('settingsRefreshStatsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.updateSettingsPage());
        }
        const hardRefreshBtn = document.getElementById('settingsHardRefreshBtn');
        if (hardRefreshBtn) {
            hardRefreshBtn.addEventListener('click', () => location.reload(true));
        }
        const resetBtn = document.getElementById('settingsResetAllBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetAllData());
        }
    }

    setupOfflineIndicator() {
        if (!this.offlineIndicator) return;
        const update = () => {
            this.offlineIndicator.style.display = navigator.onLine ? 'none' : 'block';
        };
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        update();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            switch (e.key) {
                case ' ': e.preventDefault(); this.togglePlayPause(); break;
                case 'ArrowRight': e.preventDefault(); this.playNext(); break;
                case 'ArrowLeft': e.preventDefault(); this.playPrevious(); break;
            }
        });
    }

    setupMediaSession() {
        if (!('mediaSession' in navigator)) return;
        this.updateMediaSession = () => {
            const track = this.currentIndex >= 0 && this.playlist[this.currentIndex] ? this.playlist[this.currentIndex] : null;
            if (track) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: track.title || '-',
                    artist: track.artist || '-',
                    artwork: track.image ? [{ src: track.image, sizes: '96x96', type: 'image/jpeg' }] : []
                });
            }
        };
        navigator.mediaSession.setActionHandler('play', () => this.audioPlayer.play());
        navigator.mediaSession.setActionHandler('pause', () => this.audioPlayer.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrevious());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
        this.audioPlayer.addEventListener('play', () => this.updateMediaSession?.());
    }

    // Load explore page data (latest, top monthly, podcasts)
    async loadExploreData() {
        try {
        await Promise.all([
            this.loadLatestTracks(),
            this.loadTopMonthly(),
            this.loadPodcasts()
        ]);
        } catch (e) {
            console.error('Error loading explore data:', e);
        }
    }
    
    // Fetch and parse explore items from a URL with proxy and retry logic
    async fetchExploreItems(url, limit = 5, retryCount = 0, maxRetries = 1) {
        const proxyServices = [
            {
                name: 'allorigins',
                getUrl: (targetUrl) => `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
                parseResponse: async (response) => {
                    if (response.headers.get('content-type')?.includes('application/json')) {
                        const data = await response.json();
                        return data.contents;
                    }
                    return await response.text();
                }
            },
            {
                name: 'proxy',
                getUrl: (targetUrl) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
                parseResponse: async (response) => await response.text()
            }
        ];
        
        const proxyPromises = proxyServices.map(async (proxy) => {
            const proxyUrl = proxy.getUrl(url);
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                
                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const html = await proxy.parseResponse(response);
                if (!html || html.trim().length === 0) {
                    throw new Error('Empty response from proxy');
                }
                
                return { html, success: true };
            } catch (error) {
                return { error, success: false };
            }
        });
        
        try {
            const raceResult = await Promise.race(proxyPromises);
            if (raceResult.success) {
                const parsedResult = this.parseExploreItems(raceResult.html, limit);
                if (limit === 5 && parsedResult.items.length > 0) {
                    this.cacheExploreItems(url, parsedResult.items);
                }
                return parsedResult;
            }
        } catch {
            // ignore and fall back to allSettled
        }
        
        const results = await Promise.allSettled(proxyPromises);
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.success) {
                const parsedResult = this.parseExploreItems(result.value.html, limit);
                if (limit === 5 && parsedResult.items.length > 0) {
                    this.cacheExploreItems(url, parsedResult.items);
                }
                return parsedResult;
            }
        }
        
        if (retryCount < maxRetries) {
            const delay = 200;
            console.warn(`All proxies failed for ${url} (attempt ${retryCount + 1}/${maxRetries}), retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.fetchExploreItems(url, limit, retryCount + 1, maxRetries);
        }
        
        console.error(`All proxy services failed for ${url} after ${retryCount + 1} attempts`);
        return { items: [], hasMore: false };
    }
    
    // Parse explore items from HTML
    parseExploreItems(html, limit = 5) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const results = [];
        
        let gridItems = doc.querySelectorAll('div.grid-item');
        if (gridItems.length === 0) {
            gridItems = doc.querySelectorAll('article, .post-item, .item, [class*="grid"], [class*="item"]');
        }
        
        gridItems.forEach((gridItem, index) => {
            if (index >= limit) return;
            
            let playButton = gridItem.querySelector('div.mcpplay');
            if (!playButton) {
                playButton = gridItem.querySelector('[data-music], [data-track], .play-button, [class*="play"]');
            }
            
            if (!playButton) {
                if (gridItem.hasAttribute('data-music') || gridItem.hasAttribute('data-track')) {
                    playButton = gridItem;
                }
            }
            
            const trackTitle = playButton ? (playButton.getAttribute('data-track') || '') : '';
            const artistAttr = playButton ? (playButton.getAttribute('data-artist') || '') : '';
            const imageAttr = playButton ? (playButton.getAttribute('data-image') || '') : '';
            const musicAttr = playButton ? (playButton.getAttribute('data-music') || '') : '';
            
            let title = trackTitle;
            let artist = artistAttr || 'نامشخص';
            let image = imageAttr;
            let url = musicAttr;
            let pageUrl = '';
            
            if (!title) {
                let titleEl = gridItem.querySelector('div.title a, h2 a, h3 a, .title a, [class*="title"] a');
                if (!titleEl) titleEl = gridItem.querySelector('div.title, h2, h3, .title, [class*="title"]');
                if (titleEl) title = titleEl.textContent.trim();
            }
            
            let finalArtist = artist;
            if (!finalArtist || finalArtist === 'نامشخص') {
                let artistEl = gridItem.querySelector('div.artist a, .artist a, [class*="artist"] a');
                if (!artistEl) artistEl = gridItem.querySelector('div.artist, .artist, [class*="artist"]');
                if (artistEl) finalArtist = artistEl.textContent.trim();
            }
            
            if (!image) {
                let imgEl = gridItem.querySelector('div.img img, img[src*="timthumb"], img[src*="thumb"], .img img, [class*="img"] img, img');
                if (imgEl) image = imgEl.src || imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '';
            }
            
            let pageLink = gridItem.querySelector('div.title a, div.img a, h2 a, h3 a, a[href*="/"]');
            if (!pageLink) {
                pageLink = gridItem.querySelector('a[href]');
            }
            if (pageLink) {
                pageUrl = pageLink.href || pageLink.getAttribute('href') || '';
                if (pageUrl && !pageUrl.startsWith('http')) {
                    pageUrl = `https://mytehranmusic.com${pageUrl}`;
                }
                console.log(`parseExploreItems: Found pageUrl for "${title}": ${pageUrl}`);
            }
            
            if (!url && pageUrl) {
                url = pageUrl;
                console.log(`parseExploreItems: Using pageUrl as url: ${url}`);
            }
            
            if (image && !image.startsWith('http') && !image.startsWith('data:')) {
                if (image.startsWith('//')) image = 'https:' + image;
                else if (image.startsWith('/')) image = 'https://mytehranmusic.com' + image;
                else image = 'https://mytehranmusic.com/' + image;
            }
            
            if (url && !url.startsWith('http') && !url.startsWith('data:')) {
                if (url.startsWith('//')) url = 'https:' + url;
                else if (url.startsWith('/')) url = 'https://mytehranmusic.com' + url;
                else url = 'https://mytehranmusic.com/' + url;
            }
            
            if (!title || !url) {
                return;
                    }
                    
                    results.push({
                id: url,
                title: title,
                artist: finalArtist,
                image: image,
                url: url,
                pageUrl: pageUrl
            });
        });

        const hasMore = results.length >= limit;
        return { items: results, hasMore };
    }
    
    // Load latest tracks section
    async loadLatestTracks() {
        if (!this.latestTracksList) return;
        
        const url = 'https://mytehranmusic.com/';
        
        const cached = this.getCachedExploreItems(url);
        if (cached && cached.length > 0) {
            this.renderExploreItems(this.latestTracksList, cached, true, 'latest');
            this.latestTracksList.insertAdjacentHTML('afterbegin', '<div class="explore-loading-inline"><div class="spinner spinner-small"></div></div>');
        } else {
            this.latestTracksList.innerHTML = '<div class="explore-loading"><div class="spinner spinner-small"></div></div>';
        }
        
        const { items, hasMore } = await this.fetchExploreItems(url, 5);
        
        const loadingEl = this.latestTracksList.querySelector('.explore-loading-inline');
        if (loadingEl) loadingEl.remove();
        
        if (this.hasItemsChanged(cached, items)) {
            this.renderExploreItems(this.latestTracksList, items, hasMore, 'latest');
        }
    }
    
    // Load top monthly section
    async loadTopMonthly() {
        if (!this.topMonthlyList) return;
        
        const url = 'https://mytehranmusic.com/top-month-tehranmusic/';
        
        const cached = this.getCachedExploreItems(url);
        if (cached && cached.length > 0) {
            this.renderExploreItems(this.topMonthlyList, cached, true, 'topMonthly');
            this.topMonthlyList.insertAdjacentHTML('afterbegin', '<div class="explore-loading-inline"><div class="spinner spinner-small"></div></div>');
        } else {
            this.topMonthlyList.innerHTML = '<div class="explore-loading"><div class="spinner spinner-small"></div></div>';
        }
        
        try {
            const { items, hasMore } = await this.fetchExploreItems(url, 5);
            
            const loadingEl = this.topMonthlyList.querySelector('.explore-loading-inline');
            if (loadingEl) loadingEl.remove();
            
            if (items && items.length > 0) {
                if (this.hasItemsChanged(cached, items)) {
                    this.renderExploreItems(this.topMonthlyList, items, hasMore, 'topMonthly');
                }
            } else if (!cached || cached.length === 0) {
                this.topMonthlyList.innerHTML = '<div class="explore-loading"><p>موردی یافت نشد</p></div>';
            }
        } catch (error) {
            console.error('Error loading top monthly tracks:', error);
            const loadingEl = this.topMonthlyList.querySelector('.explore-loading-inline');
            if (loadingEl) loadingEl.remove();
            
            if (!cached || cached.length === 0) {
                this.topMonthlyList.innerHTML = '<div class="explore-loading"><p>خطا در بارگذاری</p></div>';
            }
        }
    }
    
    // Load podcasts section
    async loadPodcasts() {
        if (!this.podcastsList) return;
        
        const url = 'https://mytehranmusic.com/podcasts/';
        
        const cached = this.getCachedExploreItems(url);
        if (cached && cached.length > 0) {
            this.renderExploreItems(this.podcastsList, cached, true, 'podcasts');
            this.podcastsList.insertAdjacentHTML('afterbegin', '<div class="explore-loading-inline"><div class="spinner spinner-small"></div></div>');
        } else {
            this.podcastsList.innerHTML = '<div class="explore-loading"><div class="spinner spinner-small"></div></div>';
        }
        
        const { items, hasMore } = await this.fetchExploreItems(url, 5);
        
        const loadingEl = this.podcastsList.querySelector('.explore-loading-inline');
        if (loadingEl) loadingEl.remove();
        
        if (this.hasItemsChanged(cached, items)) {
            this.renderExploreItems(this.podcastsList, items, hasMore, 'podcasts');
        }
    }
    
    // Render explore items horizontally
    renderExploreItems(container, items, hasMore, type) {
        if (!container) return;
        
        container.innerHTML = '';
        
        items.forEach(track => {
            const trackEl = this.createExploreItem(track, type);
            container.appendChild(trackEl);
        });
        
        if (hasMore) {
            const viewMoreBtn = document.createElement('div');
            viewMoreBtn.className = 'explore-view-more';
            viewMoreBtn.innerHTML = `
                <div class="explore-view-more-content">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4l1.41 1.41L7.83 11H20v2H7.83l5.58 5.59L12 20l-8-8z"/>
                    </svg>
                    <span>مشاهده بیشتر</span>
                </div>
            `;
            viewMoreBtn.addEventListener('click', () => {
                this.openExploreDetail(type);
            });
            container.appendChild(viewMoreBtn);
        }
    }
    
    // Create explore item element (reuse track card)
    // type: 'latest' | 'topMonthly' | 'podcasts'
    createExploreItem(track, type = 'explore') {
        // برای برترین‌های ماه، یک کارت ساده بدون دکمه‌های play/delete می‌خواهیم
        const source = type === 'topMonthly' ? 'explore-top' : 'explore';
        const el = this.createTrackElement(track, source);
        
        if (type === 'topMonthly') {
            // روی کل باکس کلیک شود → اول به صفحه جزئیات برو، اسپینر نشان بده، بعد لود کن
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.openTopMonthlyDirectoryFromExplore(track);
            });
        }
        
        return el;
    }
    
    // Open explore detail page
    openExploreDetail(type) {
        this.isDirectoryPlaylist = false; // Reset flag - this is a regular explore detail
        this.currentExploreType = type;
        this.currentExplorePage = 1;
        this.navigateToPage('exploreDetail');
        this.loadExploreDetail(type, 1);
    }
    
    // Load explore detail page with infinite scroll
    async loadExploreDetail(type, page = 1, retryCount = 0, maxRetries = 3) {
        // Don't load if this is a directory playlist (already loaded)
        if (this.isDirectoryPlaylist) {
            console.log('Skipping loadExploreDetail - showing directory playlist');
            return;
        }
        if (this.exploreLoading) return;
        
        this.exploreLoading = true;
        
        if (page === 1) {
            if (this.exploreDetailLoadingIndicator) {
                this.exploreDetailLoadingIndicator.style.display = 'flex';
            }
            if (this.exploreDetailContainer) {
                this.exploreDetailContainer.innerHTML = '';
            }
        } else if (this.exploreDetailInfiniteLoader) {
                this.exploreDetailInfiniteLoader.style.display = 'flex';
        }
        
        let url = '';
        let title = '';
        
        switch (type) {
            case 'latest':
                url = 'https://mytehranmusic.com/';
                title = 'آهنگ‌های جدید';
                break;
            case 'topMonthly':
                url = 'https://mytehranmusic.com/top-month-tehranmusic/';
                title = 'برترین‌های ماه';
                break;
            case 'podcasts':
                url = 'https://mytehranmusic.com/podcasts/';
                title = 'پادکست‌ها';
                break;
        }
        
        if (this.exploreDetailTitle) {
            this.exploreDetailTitle.textContent = title;
        }
        
        if (page > 1) {
            if (type === 'latest') {
                url = `https://mytehranmusic.com/page/${page}/`;
            } else if (type === 'topMonthly') {
                url = `https://mytehranmusic.com/top-month-tehranmusic/page/${page}/`;
            } else if (type === 'podcasts') {
                url = `https://mytehranmusic.com/podcasts/page/${page}/`;
            }
        }
        
        try {
            const { items, hasMore } = await this.fetchExploreItems(url, 20, 0, maxRetries);
            this.exploreHasMore = hasMore;
            this.currentExplorePage = page;
            
            if (items.length === 0 && page > 1) {
                this.exploreHasMore = false;
            }
            
            if (page === 1 && this.exploreDetailContainer) {
                    this.exploreDetailContainer.innerHTML = '';
            }
            
            items.forEach(track => {
                const trackEl = this.createTrackElement(track, 'explore');
                if (this.exploreDetailContainer) {
                    this.exploreDetailContainer.appendChild(trackEl);
                }
            });
            
            if (this.exploreDetailInfiniteLoader) {
                this.exploreDetailInfiniteLoader.style.display = 'none';
            }
            if (this.exploreDetailLoadingIndicator) {
                this.exploreDetailLoadingIndicator.style.display = 'none';
            }
            
            this.exploreLoading = false;
            
            if (this.exploreHasMore && page === 1) {
                this.setupExploreDetailInfiniteScroll();
            }
        } catch (error) {
            console.error(`Error loading explore detail (attempt ${retryCount + 1}/${maxRetries}):`, error);
            
            if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                this.exploreLoading = false;
                return this.loadExploreDetail(type, page, retryCount + 1, maxRetries);
            }
            
            if (this.exploreDetailLoadingIndicator) {
                this.exploreDetailLoadingIndicator.style.display = 'none';
            }
            if (this.exploreDetailContainer) {
                this.exploreDetailContainer.innerHTML = '<div class="explore-loading"><p>خطا در بارگذاری. لطفاً بعداً دوباره تلاش کنید.</p></div>';
            }
            if (this.exploreDetailInfiniteLoader) {
                this.exploreDetailInfiniteLoader.style.display = 'none';
            }
            this.exploreLoading = false;
        }
    }
    
    // Setup infinite scroll for explore detail page
    setupExploreDetailInfiniteScroll() {
        if (this.exploreDetailScrollHandler) {
            window.removeEventListener('scroll', this.exploreDetailScrollHandler);
        }
        
        this.exploreDetailScrollHandler = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            
            if (this.exploreDetailScrollToTopBtn) {
                if (this.currentPage === 'exploreDetail' && scrollTop > 300) {
                    this.exploreDetailScrollToTopBtn.style.display = 'flex';
                } else {
                    this.exploreDetailScrollToTopBtn.style.display = 'none';
                }
            }
            
            if (!this.exploreLoading && this.exploreHasMore && scrollTop + windowHeight >= documentHeight - 200) {
                this.loadExploreDetail(this.currentExploreType, this.currentExplorePage + 1);
            }
        };
        
        window.addEventListener('scroll', this.exploreDetailScrollHandler);
    }
    
    // Cache explore items in memory and localStorage
    cacheExploreItems(url, items) {
        if (!items || items.length === 0) return;
        
        const cacheKey = this.getExploreCacheKey(url);
        this.exploreCache[cacheKey] = {
            items: items,
            timestamp: Date.now()
        };
        this.saveExploreCache();
    }
    
    getCachedExploreItems(url) {
        const cacheKey = this.getExploreCacheKey(url);
        const cached = this.exploreCache[cacheKey];
        
        if (cached && cached.items) {
            const cacheAge = Date.now() - cached.timestamp;
            if (cacheAge < 3600000) { // 1 hour
                return cached.items;
            }
        }
        
        return null;
    }
    
    getExploreCacheKey(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.origin + urlObj.pathname;
        } catch {
            return url.split('?')[0].split('#')[0];
        }
    }
    
    hasItemsChanged(oldItems, newItems) {
        if (!oldItems || oldItems.length === 0) return true;
        if (!newItems || newItems.length === 0) return false;
        if (oldItems.length !== newItems.length) return true;
        
        for (let i = 0; i < Math.min(oldItems.length, newItems.length); i++) {
            if (oldItems[i].title !== newItems[i].title || 
                oldItems[i].artist !== newItems[i].artist) {
                return true;
            }
        }
        
        return false;
    }
    
    saveExploreCache() {
        try {
            const cacheToSave = {};
            Object.keys(this.exploreCache).forEach(key => {
                cacheToSave[key] = {
                    items: this.exploreCache[key].items,
                    timestamp: this.exploreCache[key].timestamp
                };
            });
            localStorage.setItem('mytehranExploreCache', JSON.stringify(cacheToSave));
        } catch (e) {
            console.warn('Could not save explore cache:', e);
        }
    }
    
    loadExploreCache() {
        try {
            const cached = localStorage.getItem('mytehranExploreCache');
            if (cached) {
                this.exploreCache = JSON.parse(cached);
            } else {
                this.exploreCache = {};
            }
        } catch (e) {
            console.warn('Could not load explore cache:', e);
            this.exploreCache = {};
        }
    }

    updateHomePage() {
        this.displayRecentTracks();
        this.displayRecentPlaylists();
    }

    displayRecentTracks() {
        if (!this.recentTracksContainer) {
            console.warn('recentTracksContainer not found');
            return;
        }
        
        this.recentTracksContainer.innerHTML = '';
        
        if (!this.recentTracks || this.recentTracks.length === 0) {
            this.recentTracksContainer.innerHTML = '<p class="empty-state">هیچ موزیکی پخش نشده است</p>';
            return;
        }
        
        // Show first 6 tracks (most recent, since we use unshift)
        const tracksToShow = this.recentTracks.slice(0, 6);
        tracksToShow.forEach(track => {
            const trackEl = this.createTrackElement(track, 'home');
            this.recentTracksContainer.appendChild(trackEl);
        });
    }

    displayRecentPlaylists() {
        this.recentPlaylistsContainer.innerHTML = '';
        
        if (this.recentPlaylists.length === 0) {
            this.recentPlaylistsContainer.innerHTML = '<p class="empty-state">هیچ پلی‌لیستی پخش نشده است</p>';
            return;
        }
        
        // Show last 4 playlists
        const playlistsToShow = this.recentPlaylists.slice(-4).reverse();
        playlistsToShow.forEach(({ id, name, tracks }) => {
            // Ensure tracks is a number
            const tracksCount = typeof tracks === 'number' ? tracks : (Array.isArray(tracks) ? tracks.length : 0);
            
            const playlistEl = document.createElement('div');
            playlistEl.className = 'recent-playlist-item';
            playlistEl.innerHTML = `
                <div class="playlist-info">
                    <h4>${this.escapeHtml(name || 'بدون نام')}</h4>
                    <p>${tracksCount} موزیک</p>
                </div>
                <button class="btn btn-small btn-play-playlist" data-playlist-id="${id}">▶ پخش</button>
            `;
            
            playlistEl.querySelector('.btn-play-playlist').addEventListener('click', () => {
                this.selectCustomPlaylist(id);
            });
            
            this.recentPlaylistsContainer.appendChild(playlistEl);
        });
    }

    searchMain() {
        const query = this.searchInput.value.trim();
        if (!query) {
            this.showError('لطفا نام موزیک را وارد کنید');
            return;
        }

        // Add to search history
        this.addToSearchHistory(query);
        
        // Navigate to search page if not already there
        if (this.currentPage !== 'search') {
            this.navigateToPage('search');
        }
        
        // Show search loading indicator at the top
        if (this.searchLoadingIndicator) {
            this.searchLoadingIndicator.style.display = 'flex';
        }
        this.hideError();

        // Reset pagination for new search
        this.currentSearchQuery = query;
        this.currentSearchPage = 1;
        this.hasMoreResults = true;
        this.isLoadingMore = false;

        const fetchPromise = this.currentSearchSource === SEARCH_SOURCES.melovaz
            ? this.fetchSearchResultsMelovaz(query, 1)
            : this.fetchSearchResults(query, 1);

        fetchPromise.then(result => {
            console.log('Search results received:', result);
            console.log('Result type:', typeof result, 'Is array:', Array.isArray(result));
            
            // Handle both old format (array) and new format (object)
            let results = [];
            let hasMore = false;
            
            if (Array.isArray(result)) {
                // Old format - direct array (fallback)
                console.log('Received array format, converting...');
                results = result;
                hasMore = true; // Assume there might be more
            } else if (result && typeof result === 'object' && result.results) {
                // New format - object with results and hasMore
                results = result.results || [];
                hasMore = result.hasMore !== undefined ? result.hasMore : true;
            } else {
                console.error('Unexpected result format:', result);
                results = [];
                hasMore = false;
            }
            
            console.log(`Extracted ${results.length} results, hasMore: ${hasMore}`);
            console.log('First result:', results[0]);
            
            this.searchResults = results;
            this.hasMoreResults = hasMore;
            this.displaySearchResultsMain(this.searchResults, true);
            if (this.searchLoadingIndicator) {
                this.searchLoadingIndicator.style.display = 'none';
            }
        }).catch(error => {
            console.error('Search error:', error);
            this.showError('خطا در جستجو. لطفا دوباره تلاش کنید.', {
                retry: () => this.searchMain()
            });
            if (this.searchLoadingIndicator) {
                this.searchLoadingIndicator.style.display = 'none';
            }
        });
    }

    displaySearchResultsMain(results, clear = false) {
        console.log('displaySearchResultsMain called with:', results, 'clear:', clear);
        
        if (!this.resultsContainerMain) {
            console.error('resultsContainerMain not found');
            return;
        }
        
        if (!this.searchResultsMain) {
            console.error('searchResultsMain not found');
            return;
        }
        
        this.searchResultsMain.style.display = 'block';
        this.searchResultsMain.style.visibility = 'visible';

        if (clear) {
            this.resultsContainerMain.innerHTML = '';
        }

        if (!results || results.length === 0) {
            if (clear) {
                this.resultsContainerMain.innerHTML = `
                    <div class="empty-state-card">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" class="empty-state-icon">
                            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                        </svg>
                        <p>چیزی یافت نشد</p>
                    </div>
                `;
            }
            return;
        }

        console.log(`Displaying ${results.length} results (clear=${clear})`);
        console.log('Sample result:', results[0]);
        
        results.forEach((track, index) => {
            try {
                if (!track || !track.id) {
                    console.warn('Invalid track at index', index, ':', track);
                    return;
                }
                
                console.log(`Creating track element ${index + 1}/${results.length}:`, track.title);
                
                const trackElement = this.createTrackElement(track, 'results');
                if (trackElement) {
                    this.resultsContainerMain.appendChild(trackElement);
                    console.log(`Track ${index + 1} added successfully`);
                } else {
                    console.warn('Failed to create track element for:', track);
                }
            } catch (error) {
                console.error('Error creating track element:', error, track);
            }
        });
        
        // Force display with multiple methods
        this.searchResultsMain.style.display = 'block';
        this.searchResultsMain.style.visibility = 'visible';
        this.searchResultsMain.style.opacity = '1';
        this.searchResultsMain.removeAttribute('hidden');
        
        // Also set via class if needed
        this.searchResultsMain.classList.remove('hidden');
        this.searchResultsMain.classList.add('visible');
        
        console.log('Results displayed. Container children:', this.resultsContainerMain.children.length);
        console.log('searchResultsMain display:', window.getComputedStyle(this.searchResultsMain).display);
        console.log('searchResultsMain visibility:', window.getComputedStyle(this.searchResultsMain).visibility);
        console.log('resultsContainerMain:', this.resultsContainerMain);
        console.log('resultsContainerMain.innerHTML length:', this.resultsContainerMain.innerHTML.length);
        
        // Scroll to results after a short delay to ensure rendering (only on first load)
        if (clear) {
            setTimeout(() => {
                if (this.resultsContainerMain.children.length > 0) {
                    this.searchResultsMain.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
        
        // Show/hide infinite scroll loader
        const loader = document.getElementById('infiniteScrollLoader');
        if (loader) {
            // Show loader if there are more results
            if (this.hasMoreResults) {
                loader.style.display = 'flex';
            } else {
                loader.style.display = 'none';
            }
        }
        
        // Re-setup observer after displaying results
        // Always setup observer, not just on clear, to handle append cases
        setTimeout(() => {
            this.setupInfiniteScroll();
        }, clear ? 500 : 100);
    }

    addToSearchHistory(query) {
        // Initialize if not exists or not an array
        if (!Array.isArray(this.searchHistory)) {
            this.searchHistory = [];
        }
        
        // Remove if already exists
        this.searchHistory = this.searchHistory.filter(q => q !== query);
        // Add to beginning
        this.searchHistory.unshift(query);
        // Keep only last 10
        this.searchHistory = this.searchHistory.slice(0, 10);
        this.saveRecentData();
        this.displaySearchHistory();
    }

    displaySearchHistory() {
        if (!this.searchHistoryList) {
            console.warn('searchHistoryList not found');
            return;
        }
        
        if (!this.searchHistory) {
            this.searchHistory = [];
        }
        
        console.log('Displaying search history. searchHistory:', this.searchHistory, 'Length:', this.searchHistory.length);
        console.log('searchHistoryList element:', this.searchHistoryList);
        
        this.searchHistoryList.innerHTML = '';
        const clearBtn = document.getElementById('clearSearchHistoryBtn');
        if (clearBtn) clearBtn.style.display = (!Array.isArray(this.searchHistory) || this.searchHistory.length === 0) ? 'none' : 'inline-flex';

        if (!Array.isArray(this.searchHistory) || this.searchHistory.length === 0) {
            this.searchHistoryList.innerHTML = '<p class="empty-state">هیچ جستجویی انجام نشده است</p>';
            console.log('No search history to display');
            return;
        }
        
        console.log('Rendering', this.searchHistory.length, 'search history items');
        this.searchHistory.forEach((query, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'history-chip-wrapper';
            const chip = document.createElement('button');
            chip.className = 'history-chip';
            chip.textContent = query;
            chip.addEventListener('click', () => {
                this.searchInput.value = query;
                this.searchMain();
            });
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'history-chip-delete';
            deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
            deleteBtn.title = 'حذف';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.searchHistory = this.searchHistory.filter(q => q !== query);
                this.saveRecentData();
                this.displaySearchHistory();
                this.showToast('جستجو حذف شد', 'success');
            });
            wrapper.appendChild(chip);
            wrapper.appendChild(deleteBtn);
            this.searchHistoryList.appendChild(wrapper);
        });
    }

    clearSearchHistory() {
        this.searchHistory = [];
        this.saveRecentData();
        this.displaySearchHistory();
        this.showToast('همه جستجوهای اخیر حذف شد', 'success');
    }

    displayCustomPlaylistsMain() {
        if (!this.playlistsListMain) {
            console.error('playlistsListMain not found');
            return;
        }
        
        this.playlistsListMain.innerHTML = '';
        
        // Ensure customPlaylists is an object
        if (!this.customPlaylists || typeof this.customPlaylists !== 'object') {
            this.customPlaylists = {};
        }
        
        const playlists = Object.entries(this.customPlaylists);
        if (playlists.length === 0) {
            this.playlistsListMain.innerHTML = '<p class="empty-state">هیچ پلی‌لیستی وجود ندارد</p>';
            return;
        }
        
        // Sort playlists: favorite first, then others
        const sortedPlaylists = playlists.sort(([id1, p1], [id2, p2]) => {
            if (id1 === this.FAVORITE_PLAYLIST_ID) return -1;
            if (id2 === this.FAVORITE_PLAYLIST_ID) return 1;
            return 0;
        });
        
        sortedPlaylists.forEach(([id, playlist]) => {
            const isFavorite = id === this.FAVORITE_PLAYLIST_ID;
            const playlistEl = document.createElement('div');
            playlistEl.className = 'custom-playlist-item-main';
            if (isFavorite) {
                playlistEl.classList.add('favorite-playlist');
            }
            
            // Check if this playlist is currently selected
            const isSelected = this.currentPlaylistId === id;
            
            playlistEl.innerHTML = `
                <div class="playlist-info-main">
                    <div class="playlist-header-main">
                        <h3>${this.escapeHtml(playlist.name)} ${isFavorite ? '<span class="favorite-icon">❤️</span>' : ''}</h3>
                        ${isSelected ? '<span class="playing-badge">در حال پخش</span>' : ''}
                    </div>
                    <p class="playlist-meta">${playlist.tracks.length} موزیک ${playlist.downloaded ? '• ✓ دانلود شده' : ''}</p>
                </div>
                <div class="playlist-actions-main">
                    <button class="btn btn-small btn-play-playlist-main ${isSelected ? 'active' : ''}" data-playlist-id="${id}" title="پخش">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                    <button class="btn btn-small btn-download-playlist-main" data-playlist-id="${id}" title="دانلود">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                        </svg>
                    </button>
                    <button class="btn btn-small btn-edit-playlist-main" data-playlist-id="${id}" title="ویرایش">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                    </button>
                    ${!isFavorite ? `
                    <button class="btn btn-small btn-delete-playlist-main" data-playlist-id="${id}" title="حذف">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                    ` : ''}
                </div>
            `;
            
            // Make the whole playlist item clickable (except buttons)
            playlistEl.style.cursor = 'pointer';
            playlistEl.addEventListener('click', (e) => {
                // Only trigger if click is not on a button
                if (!e.target.closest('button')) {
                    this.selectCustomPlaylist(id);
                }
            });
            
            // Attach event listeners with error handling
            const playBtn = playlistEl.querySelector('.btn-play-playlist-main');
            const downloadBtn = playlistEl.querySelector('.btn-download-playlist-main');
            const editBtn = playlistEl.querySelector('.btn-edit-playlist-main');
            const deleteBtn = playlistEl.querySelector('.btn-delete-playlist-main');
            
            if (playBtn) {
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectCustomPlaylist(id);
                });
            }
            
            if (downloadBtn) {
                downloadBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.downloadPlaylist(id);
                });
            }
            
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.editPlaylist(id);
                });
            }
            
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deletePlaylist(id);
                });
            }
            
            this.playlistsListMain.appendChild(playlistEl);
        });
    }

    loadRecentData() {
        const saved = localStorage.getItem('mytehranRecentData');
        console.log('Loading recent data from localStorage:', saved);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.recentTracks = Array.isArray(data.tracks) ? data.tracks : [];
                this.recentPlaylists = Array.isArray(data.playlists) ? data.playlists : [];
                this.searchHistory = Array.isArray(data.searchHistory) ? data.searchHistory : [];
                console.log('Loaded searchHistory:', this.searchHistory, 'Length:', this.searchHistory.length);
            } catch (e) {
                console.error('Error loading recent data:', e);
                // Initialize as empty arrays on error
                this.recentTracks = [];
                this.recentPlaylists = [];
                this.searchHistory = [];
            }
        } else {
            // Initialize as empty arrays if no saved data
            this.recentTracks = [];
            this.recentPlaylists = [];
            this.searchHistory = [];
            console.log('No saved data, initializing empty arrays');
        }
        
        // Ensure searchHistory is always an array
        if (!Array.isArray(this.searchHistory)) {
            this.searchHistory = [];
        }
        
        console.log('Final searchHistory after load:', this.searchHistory);
        
        console.log('Final searchHistory after load:', this.searchHistory);
    }

    saveRecentData() {
        localStorage.setItem('mytehranRecentData', JSON.stringify({
            tracks: this.recentTracks,
            playlists: this.recentPlaylists,
            searchHistory: this.searchHistory
        }));
    }

    isSameTrackByUrl(trackA, trackB) {
        if (!trackA || !trackB) return false;
        const urlA = this.normalizeUrl(trackA.url);
        const pageUrlA = trackA.pageUrl ? this.normalizeUrl(trackA.pageUrl) : null;
        const urlB = this.normalizeUrl(trackB.url);
        const pageUrlB = trackB.pageUrl ? this.normalizeUrl(trackB.pageUrl) : null;
        return urlA === urlB || (pageUrlA && pageUrlB === pageUrlA) || (pageUrlB && pageUrlA === pageUrlB) ||
               (pageUrlA && urlB === pageUrlA) || (pageUrlB && urlA === pageUrlB);
    }

    addToRecentTracks(track) {
        // Remove if already exists (by id or by URL)
        this.recentTracks = this.recentTracks.filter(t => t.id !== track.id && !this.isSameTrackByUrl(t, track));
        // Add to beginning
        this.recentTracks.unshift({...track});
        // Keep only last 50
        this.recentTracks = this.recentTracks.slice(0, 50);
        this.saveRecentData();
        
        if (this.currentPage === 'home') {
            this.displayRecentTracks();
        }
    }

    addToRecentPlaylists(playlistId, playlistName, tracks) {
        // Ensure tracks is an array
        const tracksArray = Array.isArray(tracks) ? tracks : [];
        const tracksCount = tracksArray.length;
        
        // Remove if already exists
        this.recentPlaylists = this.recentPlaylists.filter(p => p.id !== playlistId);
        // Add to beginning
        this.recentPlaylists.unshift({ id: playlistId, name: playlistName, tracks: tracksCount });
        // Keep only last 20
        this.recentPlaylists = this.recentPlaylists.slice(0, 20);
        this.saveRecentData();
        
        if (this.currentPage === 'home') {
            this.displayRecentPlaylists();
        }
    }

    setupInfiniteScroll() {
        const loader = document.getElementById('infiniteScrollLoader');
        if (!loader) {
            console.warn('infiniteScrollLoader not found');
            return;
        }

        if (this.scrollObserver) {
            this.scrollObserver.disconnect();
            this.scrollObserver = null;
        }

        this.scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                if (!this.hasMoreResults || this.isLoadingMore || !this.currentSearchQuery || this.currentPage !== 'search') return;
                this.loadMoreResults();
            });
        }, {
            root: null,
            rootMargin: '400px',
            threshold: 0
        });

        this.scrollObserver.observe(loader);
    }

    async loadMoreResults() {
        if (this.isLoadingMore || !this.hasMoreResults || !this.currentSearchQuery) {
            console.log('Cannot load more:', {
                isLoading: this.isLoadingMore,
                hasMore: this.hasMoreResults,
                query: this.currentSearchQuery
            });
            return;
        }

        console.log('Loading more results for page:', this.currentSearchPage + 1);
        this.isLoadingMore = true;
        const loader = document.getElementById('infiniteScrollLoader');
        if (loader) {
            loader.style.display = 'flex';
        }

        try {
            const nextPage = this.currentSearchPage + 1;
            console.log(`Fetching page ${nextPage} for query: ${this.currentSearchQuery}`);
            const result = this.currentSearchSource === SEARCH_SOURCES.melovaz
                ? await this.fetchSearchResultsMelovaz(this.currentSearchQuery, nextPage)
                : await this.fetchSearchResults(this.currentSearchQuery, nextPage);
            
            // Handle both formats
            let newResults = [];
            let hasMore = false;
            
            if (Array.isArray(result)) {
                newResults = result;
                hasMore = true;
            } else if (result && result.results) {
                newResults = result.results || [];
                hasMore = result.hasMore !== undefined ? result.hasMore : true;
            }
            
            console.log(`Received ${newResults.length} new results, hasMore: ${hasMore}`);
            
            if (newResults.length > 0) {
                // Append new results
                this.searchResults = [...this.searchResults, ...newResults];
                this.currentSearchPage = nextPage;
                this.hasMoreResults = hasMore;
                
                // Display new results (append mode)
                this.displaySearchResultsMain(newResults, false);
            } else {
                console.log('No more results, stopping infinite scroll');
                this.hasMoreResults = false;
            }
        } catch (error) {
            console.error('Error loading more results:', error);
            this.hasMoreResults = false;
        } finally {
            this.isLoadingMore = false;
            if (loader) {
                loader.style.display = this.hasMoreResults ? 'flex' : 'none';
            }
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async resetAllData() {
        // Confirm with user
        if (!confirm('آیا مطمئن هستید که می‌خواهید همه داده‌ها و کش را پاک کنید؟\n\nاین عمل غیرقابل بازگشت است و:\n- همه پلی‌لیست‌ها حذف می‌شوند\n- تاریخچه جستجو پاک می‌شود\n- موزیک‌های اخیر پاک می‌شوند\n- همه کش‌ها پاک می‌شوند')) {
            return;
        }
        
        // Show loading
        this.showLoading(true);
        this.showError('در حال پاک کردن داده‌ها و کش...');
        
        try {
            // Clear all localStorage
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('mytehran')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            // Clear Service Worker cache
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName.startsWith('mytehran')) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            }
            
            // Unregister service worker
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(
                    registrations.map(registration => registration.unregister())
                );
            }
            
            this.showLoading(false);
            this.showError('همه داده‌ها و کش پاک شد. صفحه در حال بارگذاری مجدد...');
            
            // Reload page after a short delay
            setTimeout(() => {
                window.location.reload(true);
            }, 1500);
            
        } catch (error) {
            console.error('Error resetting data:', error);
            this.showLoading(false);
            this.showError('خطا در پاک کردن داده‌ها: ' + error.message);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.musicPlayer = new MusicPlayer();
});

