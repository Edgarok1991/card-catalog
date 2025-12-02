// Константы
const ITEMS_PER_PAGE = 9;
const DEBOUNCE_DELAY = 300;
const ANIMATION_DURATION = 300;

// Данные курсов
const coursesData = [
    {
        id: 1,
        title: 'The Ultimate Google Ads Training Course',
        category: 'Marketing',
        price: 100,
        author: 'Jerome Bell',
        image: 'person-1'
    },
    {
        id: 2,
        title: 'Product Management Fundamentals',
        category: 'Management',
        price: 480,
        author: 'Marvin McKinney',
        image: 'person-2'
    },
    {
        id: 3,
        title: 'HR Management and Analytics',
        category: 'HR & Recruiting',
        price: 200,
        author: 'Leslie Alexander Li',
        image: 'person-3'
    },
    {
        id: 4,
        title: 'Brand Management & PR Communications',
        category: 'Marketing',
        price: 530,
        author: 'Kristin Watson',
        image: 'person-4'
    },
    {
        id: 5,
        title: 'Graphic Design Basic',
        category: 'Design',
        price: 500,
        author: 'Guy Hawkins',
        image: 'person-5'
    },
    {
        id: 6,
        title: 'Business Development Management',
        category: 'Management',
        price: 400,
        author: 'Dianne Russell',
        image: 'person-6'
    },
    {
        id: 7,
        title: 'Highload Software Architecture',
        category: 'Development',
        price: 600,
        author: 'Brooklyn Simmons',
        image: 'person-7'
    },
    {
        id: 8,
        title: 'Human Resources - Selection and Recruitment',
        category: 'HR & Recruiting',
        price: 150,
        author: 'Kathryn Murphy',
        image: 'person-8'
    },
    {
        id: 9,
        title: 'User Experience. Human-centered Design',
        category: 'Design',
        price: 240,
        author: 'Cody Fisher',
        image: 'person-9'
    },
    {
        id: 10,
        title: 'Advanced JavaScript Development',
        category: 'Development',
        price: 350,
        author: 'Wade Warren',
        image: 'person-10'
    },
    {
        id: 11,
        title: 'Strategic Management Essentials',
        category: 'Management',
        price: 450,
        author: 'Esther Howard',
        image: 'person-11'
    },
    {
        id: 12,
        title: 'Digital Marketing Strategy',
        category: 'Marketing',
        price: 320,
        author: 'Robert Fox',
        image: 'person-12'
    }
];

// Состояние приложения
let currentFilter = 'all';
let searchQuery = '';
let displayedCount = ITEMS_PER_PAGE;

// Кэш DOM элементов
let dom = {
    cardsContainer: null,
    searchInput: null,
    filterButtons: null,
    loadMoreButton: null,
    filterCountElements: new Map()
};

// Утилита: Функция debounce (задержка выполнения)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Утилита: Экранирование HTML для защиты от XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Кэширование DOM элементов
function cacheDOMElements() {
    dom.cardsContainer = document.querySelector('[data-cards]');
    dom.searchInput = document.querySelector('[data-search]');
    dom.filterButtons = document.querySelectorAll('[data-filter]');
    dom.loadMoreButton = document.querySelector('[data-load-more]');
    
    // Кэшируем элементы счётчиков фильтров
    dom.filterButtons.forEach(button => {
        const countElement = button.querySelector('.filters__count');
        if (countElement) {
            dom.filterCountElements.set(button.dataset.filter, countElement);
        }
    });
}

// Инициализация приложения
function init() {
    cacheDOMElements();
    
    // Проверка наличия обязательных DOM элементов
    if (!dom.cardsContainer || !dom.searchInput || !dom.loadMoreButton) {
        console.error('Не найдены обязательные DOM элементы');
        return;
    }
    
    // Восстановление состояния из URL
    restoreStateFromURL();
    
    renderCards();
    attachEventListeners();
    setupKeyboardNavigation();
}

// Отрисовка карточек с анимацией
function renderCards(animate = false) {
    const filteredCourses = getFilteredCourses();
    
    // Добавляем анимацию исчезновения перед перерисовкой
    if (animate) {
        dom.cardsContainer.classList.add('cards--fade-out');
    }
    
    setTimeout(() => {
        // Обработка пустого состояния
        if (filteredCourses.length === 0) {
            dom.cardsContainer.innerHTML = `
                <div class="cards__empty" role="status" aria-live="polite">
                    <p class="cards__empty-text">Курсы не найдены</p>
                    <p class="cards__empty-hint">Попробуйте изменить параметры поиска или фильтры</p>
                </div>
            `;
            dom.loadMoreButton.classList.add('button--hidden');
            updateFilterCounts();
            updateAriaLive(filteredCourses.length);
            return;
        }
        
        const displayedCourses = filteredCourses.slice(0, displayedCount);
        
        // Используем DocumentFragment для оптимизации производительности
        const fragment = document.createDocumentFragment();
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = displayedCourses.map(course => createCardHTML(course)).join('');
        
        while (tempContainer.firstChild) {
            fragment.appendChild(tempContainer.firstChild);
        }
        
        dom.cardsContainer.innerHTML = '';
        dom.cardsContainer.appendChild(fragment);
        
        // Убираем класс анимации
        dom.cardsContainer.classList.remove('cards--fade-out');
        
        // Обновляем видимость кнопки "Загрузить ещё"
        dom.loadMoreButton.classList.toggle('button--hidden', filteredCourses.length <= displayedCount);
        
        updateFilterCounts();
        updateAriaLive(filteredCourses.length);
        updateURL();
    }, animate ? ANIMATION_DURATION : 0);
}

// Обновление ARIA live региона для скрин-ридеров
function updateAriaLive(count) {
    const message = count === 0 
        ? 'Курсы не найдены' 
        : `Показано ${Math.min(displayedCount, count)} из ${count} курсов`;
    
    // Обновляем или создаём aria-live регион
    let liveRegion = document.getElementById('results-announcement');
    if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'results-announcement';
        liveRegion.className = 'sr-only';
        liveRegion.setAttribute('role', 'status');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = message;
}

// Создание HTML карточки курса
function createCardHTML(course) {
    // Нормализация названия категории для CSS класса
    const categoryClass = course.category.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-');
    
    // PNG изображения людей с прозрачным фоном
    // Используем PNG Tree и FreePNG для качественных изображений без фона
    const photoUrls = [
        'https://www.freepnglogos.com/uploads/men-png/men-png-image-download-picture-7.png',
        'https://www.freepnglogos.com/uploads/women-png/download-beautiful-women-png-image-png-image-pngimg-21.png',
        'https://www.freepnglogos.com/uploads/men-png/men-person-wearing-blue-denim-jeans-png-image-26.png',
        'https://www.freepnglogos.com/uploads/women-png/women-business-transparent-png-pictures-icons-and-png-0.png',
        'https://www.freepnglogos.com/uploads/men-png/man-png-image-purepng-transparent-png-image-library-2.png',
        'https://www.freepnglogos.com/uploads/women-png/women-png-image-purepng-transparent-png-image-library-0.png',
        'https://www.freepnglogos.com/uploads/men-png/men-png-images-download-picture-gallery-8.png',
        'https://www.freepnglogos.com/uploads/women-png/beautiful-girl-png-pic-image-png-arts-3.png',
        'https://www.freepnglogos.com/uploads/men-png/man-people-transparent-png-pictures-icons-and-png-6.png',
        'https://www.freepnglogos.com/uploads/women-png/women-business-transparent-background-png-15.png',
        'https://www.freepnglogos.com/uploads/men-png/men-business-png-transparent-images-png-all-12.png',
        'https://www.freepnglogos.com/uploads/women-png/women-professional-transparent-png-18.png'
    ];
    
    const avatarUrl = photoUrls[(course.id - 1) % photoUrls.length];
    
    return `
        <article class="card" data-category="${escapeHtml(course.category)}" tabindex="0" role="article" aria-label="${escapeHtml(course.title)} course">
            <div class="card__image">
                <img 
                    src="${avatarUrl}" 
                    alt="${escapeHtml(course.author)}"
                    class="card__image-photo"
                    loading="lazy"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                >
                <div class="card__image-placeholder" style="display: none;">
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <circle cx="30" cy="20" r="12" fill="#E5E5E5"/>
                        <path d="M10 50C10 38.9543 18.9543 30 30 30C41.0457 30 50 38.9543 50 50" fill="#E5E5E5"/>
                    </svg>
                </div>
            </div>
            <div class="card__content">
                <span class="card__category card__category--${categoryClass}" aria-label="Category: ${escapeHtml(course.category)}">
                    ${escapeHtml(course.category)}
                </span>
                <h3 class="card__title">${escapeHtml(course.title)}</h3>
                <div class="card__footer">
                    <span class="card__price" aria-label="Price: $${course.price}">$${course.price}</span>
                    <span class="card__author">${escapeHtml(course.author)}</span>
                </div>
            </div>
        </article>
    `;
}

// Получение отфильтрованных курсов
function getFilteredCourses() {
    return coursesData.filter(course => {
        const matchesCategory = currentFilter === 'all' || course.category === currentFilter;
        const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });
}

// Обновление счётчиков фильтров
function updateFilterCounts() {
    dom.filterButtons.forEach(button => {
        const filter = button.dataset.filter;
        const count = filter === 'all' 
            ? coursesData.length 
            : coursesData.filter(course => course.category === filter).length;
        
        const countElement = dom.filterCountElements.get(filter);
        if (countElement) {
            countElement.textContent = count;
        }
    });
}

// Обработка поиска с debounce
function handleSearch(value) {
    searchQuery = value;
    displayedCount = ITEMS_PER_PAGE;
    renderCards(true); // Анимация при поиске
}

// Привязка обработчиков событий
function attachEventListeners() {
    // Поиск с debounce для оптимизации производительности
    const debouncedSearch = debounce(handleSearch, DEBOUNCE_DELAY);
    
    dom.searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
    });
    
    // Фильтры
    dom.filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            handleFilterChange(button.dataset.filter);
        });
        
        // Поддержка клавиатуры для фильтров
        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleFilterChange(button.dataset.filter);
            }
        });
    });
    
    // Кнопка "Загрузить ещё"
    dom.loadMoreButton.addEventListener('click', () => {
        const previousCount = Math.min(displayedCount, getFilteredCourses().length);
        displayedCount += ITEMS_PER_PAGE;
        renderCards();
        
        // Фокус на первой новой карточке для accessibility
        setTimeout(() => {
            const cards = dom.cardsContainer.querySelectorAll('.card');
            if (cards[previousCount]) {
                cards[previousCount].focus();
            }
        }, 100);
    });
}

// Обработка изменения фильтра
function handleFilterChange(filter) {
    currentFilter = filter;
    displayedCount = ITEMS_PER_PAGE;
    
    // Обновление активного состояния
    dom.filterButtons.forEach(btn => btn.classList.remove('filters__button--active'));
    const activeButton = Array.from(dom.filterButtons).find(btn => btn.dataset.filter === filter);
    if (activeButton) {
        activeButton.classList.add('filters__button--active');
    }
    
    renderCards(true); // Анимация при смене фильтра
}

// Настройка навигации с клавиатуры
function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // Очистка поиска по Escape
        if (e.key === 'Escape' && document.activeElement === dom.searchInput) {
            dom.searchInput.value = '';
            handleSearch('');
            dom.searchInput.blur();
        }
        
        // Навигация по карточкам стрелками вверх/вниз
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const cards = Array.from(dom.cardsContainer.querySelectorAll('.card'));
            const currentIndex = cards.indexOf(document.activeElement);
            
            if (currentIndex !== -1) {
                e.preventDefault();
                let nextIndex;
                
                if (e.key === 'ArrowDown') {
                    nextIndex = Math.min(currentIndex + 3, cards.length - 1); // Вниз на ряд (3 карточки)
                } else {
                    nextIndex = Math.max(currentIndex - 3, 0); // Вверх на ряд
                }
                
                cards[nextIndex]?.focus();
            }
        }
        
        // Навигация стрелками влево/вправо
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            const cards = Array.from(dom.cardsContainer.querySelectorAll('.card'));
            const currentIndex = cards.indexOf(document.activeElement);
            
            if (currentIndex !== -1) {
                e.preventDefault();
                const nextIndex = e.key === 'ArrowRight' 
                    ? Math.min(currentIndex + 1, cards.length - 1)
                    : Math.max(currentIndex - 1, 0);
                
                cards[nextIndex]?.focus();
            }
        }
    });
}

// Сохранение состояния в URL (History API)
function updateURL() {
    const params = new URLSearchParams();
    
    if (currentFilter !== 'all') {
        params.set('category', currentFilter);
    }
    
    if (searchQuery) {
        params.set('search', searchQuery);
    }
    
    const newURL = params.toString() 
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
    
    window.history.replaceState({}, '', newURL);
}

// Восстановление состояния из URL
function restoreStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    
    const category = params.get('category');
    if (category) {
        currentFilter = category;
    }
    
    const search = params.get('search');
    if (search) {
        searchQuery = search;
        dom.searchInput.value = search;
    }
}

// Запуск приложения
init();

