document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = '/api/articles';
    const ARTICLES_CONTAINER = document.querySelector('.articles-container');
    const ITEMS_PER_PAGE_MAIN = 4;
    const ITEMS_PER_PAGE_ARTICLES = 8;
    let currentPage = 1;
    

    // Инициализация
    async function init() {
        
        if (isMainPage()) {
            await loadMainPageArticles();
        } else if (isArticlesPage()) {
            await initPagination();
            await loadArticlesPage();
        }
        
        initSearch();
        initArticleClickHandlers();
    }

    // Загрузка статей для главной
    async function loadMainPageArticles() {
        try {
            const articles = await fetchArticles(1, ITEMS_PER_PAGE_MAIN);
            renderArticles(articles, true);
        } catch (err) {
            showError('Ошибка загрузки последних статей');
        }
    }

    // Загрузка статей для страницы /articles
    async function loadArticlesPage() {
    try {
            const articles = await fetchArticles(currentPage, ITEMS_PER_PAGE_ARTICLES);
            renderArticles(articles);
        } catch (err) {
            showError('Ошибка загрузки списка статей');
        }
    }

    // Получение статей с API
    async function fetchArticles(page = 1, limit = 10) {
        try {
            const response = await fetch(`${API_URL}?page=${page}&limit=${limit}`);
            if (!response.ok) throw new Error('Ошибка API');
            return await response.json();
        } catch (err) {
            throw new Error('Не удалось загрузить статьи');
        }
    }

    // Отрисовка статей
    function renderArticles(articles, isMainPage) {
        if (!ARTICLES_CONTAINER) return;

        ARTICLES_CONTAINER.innerHTML = articles.map(article => `
            <div class="article-card" data-id="${article._id}">
                <img src="${article.image || '/images/default-article.jpg'}" 
                     alt="${article.title}" 
                     class="article-image">
                <div class="article-content">
                    <h3 class="article-title">${article.title}</h3>
                    <p class="article-summary">${article.summary}</p>
                    <div class="article-meta">
                        <span class="author">${article.author?.username || 'Аноним'}</span>
                        <span class="date">
                            ${new Date(article.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Обработчики кликов
    function initArticleClickHandlers() {
        ARTICLES_CONTAINER?.addEventListener('click', (e) => {
            const articleCard = e.target.closest('.article-card');
            if (articleCard) {
                const articleId = articleCard.dataset.id;
                window.location.href = `/article.html?id=${articleId}`;
            }
        });
    }

    // Пагинация
    async function initPagination() {
    const pagination = document.querySelector('.pagination');
    const prevBtn = document.querySelector('.prev-next:first-child');
    const nextBtn = document.querySelector('.prev-next:last-child');
    const pageNumbersContainer = document.querySelector('.page-numbers');
    
    if (!pagination || !prevBtn || !nextBtn || !pageNumbersContainer) return;

    // Получение общего количества статей
    const totalArticles = await getTotalArticlesCount();
    const totalPages = Math.ceil(totalArticles / ITEMS_PER_PAGE_ARTICLES);

    // Обработчик изменения страницы
    const handlePageChange = async (newPage) => {
        if (newPage < 1 || newPage > totalPages) return;
        
        currentPage = newPage;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        await loadArticlesPage();
        updatePaginationUI();
    };

    // Создание кнопки страницы
    const createPageButton = (pageNumber) => {
        const button = document.createElement('button');
        button.className = `pagination-button ${pageNumber === currentPage ? 'active' : ''}`;
        button.textContent = pageNumber;
        button.addEventListener('click', () => handlePageChange(pageNumber));
        return button;
    };

    // Обновление интерфейса пагинации
    const updatePaginationUI = () => {
        // Очистка предыдущих элементов
        pageNumbersContainer.innerHTML = '';
        
        // Определение диапазона страниц
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages/2));
        let endPage = startPage + maxVisiblePages - 1;

        if(endPage > totalPages) {
            endPage = totalPages;
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Кнопки страниц
        for(let i = startPage; i <= endPage; i++) {
            pageNumbersContainer.appendChild(createPageButton(i));
        }

        // Состояние кнопок
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
    };

    // Обработчики для кнопок "Назад/Вперед"
    prevBtn.addEventListener('click', () => handlePageChange(currentPage - 1));
    nextBtn.addEventListener('click', () => handlePageChange(currentPage + 1));

    // Получение общего количества статей
    async function getTotalArticlesCount() 
    {
        try {
            const response = await fetch(`/api/articles/count`, {
            credentials: 'include'
            });
            if (!response.ok) {
            const errorData = await response.json(); // Читаем тело ошибки
            throw new Error(errorData.error || 'Ошибка сервера');
            }
            return await response.json();
        } catch(err) {
            console.error('Ошибка:', err);
            return 0;
        }
    }

    // Инициализация
    updatePaginationUI();
}

    // Поиск
    function initSearch() {
        const searchForm = document.querySelector('form[name="search"]');
        if (!searchForm) return; 
        const searchResults = document.createElement('div');
        searchResults.className = 'search-results';
        searchForm.parentNode.insertBefore(searchResults, searchForm.nextSibling);

        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const query = e.target.search.value.trim();
            if (!query) return;
            
            try {
                const results = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
                const articles = await results.json();
                
                searchResults.innerHTML = articles.map(article => `
                    <a href="/article.html?id=${article._id}" class="search-result-item">
                        ${article.title}
                    </a>
                `).join('');
                
                searchResults.style.display = 'block';
            } catch (err) {
                showError('Ошибка поиска');
            }
        });

        // Скрытие результатов при клике вне области
        document.addEventListener('click', (e) => {
            if (!searchForm.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
    }

    // Вспомогательные функции
    function isMainPage() {
        return window.location.pathname === '/' || 
               window.location.pathname === '/main';
    }

    function isArticlesPage() {
        return window.location.pathname === '/articles';
    }

    function showError(message) {
        if (ARTICLES_CONTAINER) {
            ARTICLES_CONTAINER.innerHTML = `
                <div class="error-message">
                    <p>${message}</p>
                    <button onclick="location.reload()">Обновить</button>
                </div>
            `;
        }
    }

    // Запуск
    init();
});