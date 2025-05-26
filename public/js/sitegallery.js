document.addEventListener('DOMContentLoaded', () => {
    // Конфигурация
    const PAGES_CONFIG = {
        main: {
            container: '.gallery-container-main',
            itemsPerPage: 4,
            path: ['/', '/main']
        },
        gallery: {
            container: '.gallerypanels',
            itemsPerPage: 9,
            path: '/sitegallery'
        }
    };

    // Состояние
    let currentPage = 1;
    let totalPages = 1;
    let currentView = null;

    // Элементы
    const elements = {
        modal: {
            overlay: document.querySelector('.modal-overlay'),
            image: document.querySelector('.modal-image'),
            caption: document.querySelector('.caption-text'),
            deleteBtn: document.querySelector('.delete-image-button')
        },
        pagination: {
            prev: document.querySelector('.prev'),
            next: document.querySelector('.next'),
            numbers: document.querySelector('.gallery-page-numbers')
        },
        containers: {
            main: document.querySelector(PAGES_CONFIG.main.container),
            gallery: document.querySelector(PAGES_CONFIG.gallery.container)
        }
    };

    // Инициализация
    function init() {
        detectViewMode();
        setupEventListeners();
        initGallerySearch();
        
        if (currentView === 'main') {
            loadGalleryData(1, PAGES_CONFIG.main.itemsPerPage)
                .then(data => renderGallery(data.images)) 
                .catch(handleError);
        } else if (currentView === 'gallery') {
            loadGalleryData(currentPage, PAGES_CONFIG.gallery.itemsPerPage)
                .then(data => {
                    renderGallery(data.images);
                    updatePagination(data.total);
                })
                .catch(handleError);
        }
    }

    // Определение режима отображения
    function detectViewMode() {
        const path = window.location.pathname;
        currentView = PAGES_CONFIG.main.path.includes(path) ? 'main' : 
                      path === PAGES_CONFIG.gallery.path ? 'gallery' : null;
    }

    function initGallerySearch() {
        const searchForm = document.querySelector('form[name="search"]');
        if (!searchForm) return; 
        const searchResults = document.createElement('div');
        searchResults.className = 'gallery-search-results';
        searchForm.appendChild(searchResults);

        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const query = e.target.search.value.trim();
            if (!query) return;

            try {
                const response = await fetch(`/api/gallery/search?q=${encodeURIComponent(query)}`);
                const images = await response.json();
                
                searchResults.innerHTML = images.map(image => `
                    <div class="gallery-search-item" 
                        data-id="${image._id}"
                        data-caption="${image.caption}"
                        data-src="${image.imagePath}">
                        ${image.caption || 'Без описания'}
                    </div>
                `).join('');
                
                searchResults.style.display = 'block';
            } catch (err) {
                console.error('Ошибка поиска:', err);
            }
        });
        // Скрытие результатов при клике вне области
        document.addEventListener('click', (e) => {
            if (!searchForm.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });

        // Обработчик клика по результатам
        searchResults.addEventListener('click', (e) => {
            const item = e.target.closest('.gallery-search-item');
            if (item) {
                searchResults.style.display = 'none';
                elements.modal.image.src = item.dataset.src;
                elements.modal.caption.textContent = item.dataset.caption;
                elements.modal.overlay.style.display = 'flex';
            }
        });
    }

    // Загрузка данных
    async function loadGalleryData(page = 1, limit = 9) {
        try {
            const response = await fetch(`/api/gallery?page=${page}&limit=${limit}`);
            const data = await response.json();
            console.log('API Response:', data); // Добавьте эту строку
            return data;
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            return { images: [] };
        }
    }

    // Рендеринг галереи
    function renderGallery(images) {
        if (!images || !Array.isArray(images)) return;

        const template = images.map(image => `
            <div class="${currentView === 'main' ? 'gallery-card-main' : 'gallery-item'}">
                <img src="${image.imagePath}" 
                     alt="${image.caption || 'Изображение'}"
                     class="${currentView === 'main' ? 'gallery-image-main' : 'gallery-image'}"
                     data-id="${image._id}"
                     data-caption="${image.caption || ''}">
                ${image.caption ? `
                <div class="${currentView === 'main' ? 'gallery-caption-main' : 'image-caption'}">
                    ${image.caption}
                </div>` : ''}
            </div>
        `).join('');

        getCurrentContainer().innerHTML = template;
    }

    // Пагинация
    function updatePagination(totalItems) {
        if (currentView !== 'gallery') return;

        totalPages = Math.ceil(totalItems / PAGES_CONFIG.gallery.itemsPerPage);
        
        // Кнопки страниц
        elements.pagination.numbers.innerHTML = Array.from({length: totalPages}, (_, i) => `
            <button class="gallery-page-btn ${i + 1 === currentPage ? 'active' : ''}" 
                    data-page="${i + 1}">
                ${i + 1}
            </button>
        `).join('');

        // Состояние кнопок
        elements.pagination.prev.disabled = currentPage <= 1;
        elements.pagination.next.disabled = currentPage >= totalPages;
    }

    // Модальное окно
    function showModal(e) {
        const img = e.target.closest('img');
        if (!img) return;

        elements.modal.image.src = img.src;
        elements.modal.caption.textContent = img.dataset.caption;
        elements.modal.deleteBtn.dataset.id = img.dataset.id;
        
        // Показываем кнопку удаления только для админов
        elements.modal.deleteBtn.classList.toggle('hidden', !window.userIsAdmin);
        
        elements.modal.overlay.style.display = 'flex';
    }

    function closeModal() {
        elements.modal.overlay.style.display = 'none';
        elements.modal.image.src = '';
        elements.modal.caption.textContent = '';
    }

    async function deleteImage() {
        if (!confirm('Вы уверены, что хотите удалить это изображение?')) return;

        try {
            await fetch(`/api/gallery/${elements.modal.deleteBtn.dataset.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            closeModal();
            await refreshGallery();
        } catch (error) {
            console.error('Ошибка удаления:', error);
            alert('Не удалось удалить изображение');
        }
    }

    // Обновление галереи
    async function refreshGallery() {
        try {
            const data = await loadGalleryData(
                currentView === 'main' ? 1 : currentPage,
                currentView === 'main' ? PAGES_CONFIG.main.itemsPerPage : PAGES_CONFIG.gallery.itemsPerPage
            );
            
            renderGallery(currentView === 'gallery' ? data.images : data.images);
            if (currentView === 'gallery') updatePagination(data.total);
        } catch (error) {
            handleError(error);
        }
    }

    // Обработчики событий
    function setupEventListeners() {
        // Клики по изображениям
        getCurrentContainer()?.addEventListener('click', e => {
            if (e.target.tagName === 'IMG') showModal(e);
        });

        // Пагинация
        if (currentView === 'gallery') {
            elements.pagination.prev.addEventListener('click', () => handlePageChange(-1));
            elements.pagination.next.addEventListener('click', () => handlePageChange(1));
            elements.pagination.numbers.addEventListener('click', e => {
                if (e.target.tagName === 'BUTTON') {
                    currentPage = parseInt(e.target.dataset.page);
                    refreshGallery();
                }
            });
        }

        // Модальное окно
        elements.modal.overlay.addEventListener('click', e => {
            if (e.target === elements.modal.overlay || e.target === elements.modal.caption) {
                closeModal();
            }
        });
        elements.modal.deleteBtn.addEventListener('click', deleteImage);
    }

    // Утилиты
    function handlePageChange(delta) {
        currentPage = Math.max(1, Math.min(totalPages, currentPage + delta));
        refreshGallery();
    }

    function getCurrentContainer() {
        return currentView === 'main' 
            ? elements.containers.main 
            : elements.containers.gallery;
    }

    function handleError(error) {
        console.error('Gallery Error:', error);
        const container = getCurrentContainer();
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <p>Произошла ошибка при загрузке изображений</p>
                    <button onclick="location.reload()">Обновить страницу</button>
                </div>
            `;
        }
    }

    // Запуск
    init();
});