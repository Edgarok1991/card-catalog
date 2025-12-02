// Constants
const ITEMS_PER_PAGE = 9;
const DEBOUNCE_DELAY = 300;
const ANIMATION_DURATION = 300;

// Course data
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

// State
let currentFilter = 'all';
let searchQuery = '';
let displayedCount = ITEMS_PER_PAGE;

// DOM elements cache
let dom = {
    cardsContainer: null,
    searchInput: null,
    filterButtons: null,
    loadMoreButton: null,
    filterCountElements: new Map()
};

// Utility: Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Utility: Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Cache DOM elements
function cacheDOMElements() {
    dom.cardsContainer = document.querySelector('[data-cards]');
    dom.searchInput = document.querySelector('[data-search]');
    dom.filterButtons = document.querySelectorAll('[data-filter]');
    dom.loadMoreButton = document.querySelector('[data-load-more]');
    
    // Cache filter count elements
    dom.filterButtons.forEach(button => {
        const countElement = button.querySelector('.filters__count');
        if (countElement) {
            dom.filterCountElements.set(button.dataset.filter, countElement);
        }
    });
}

// Initialize
function init() {
    cacheDOMElements();
    
    // Validate required DOM elements
    if (!dom.cardsContainer || !dom.searchInput || !dom.loadMoreButton) {
        console.error('Required DOM elements not found');
        return;
    }
    
    // Restore state from URL
    restoreStateFromURL();
    
    renderCards();
    attachEventListeners();
    setupKeyboardNavigation();
}

// Render cards with animation
function renderCards(animate = false) {
    const filteredCourses = getFilteredCourses();
    
    // Add fade out animation before re-render
    if (animate) {
        dom.cardsContainer.classList.add('cards--fade-out');
    }
    
    setTimeout(() => {
        // Handle empty state
        if (filteredCourses.length === 0) {
            dom.cardsContainer.innerHTML = `
                <div class="cards__empty" role="status" aria-live="polite">
                    <p class="cards__empty-text">No courses found matching your criteria</p>
                    <p class="cards__empty-hint">Try adjusting your search or filters</p>
                </div>
            `;
            dom.loadMoreButton.classList.add('button--hidden');
            updateFilterCounts();
            updateAriaLive(filteredCourses.length);
            return;
        }
        
        const displayedCourses = filteredCourses.slice(0, displayedCount);
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = displayedCourses.map(course => createCardHTML(course)).join('');
        
        while (tempContainer.firstChild) {
            fragment.appendChild(tempContainer.firstChild);
        }
        
        dom.cardsContainer.innerHTML = '';
        dom.cardsContainer.appendChild(fragment);
        
        // Remove fade animation class
        dom.cardsContainer.classList.remove('cards--fade-out');
        
        // Update load more button visibility using CSS class
        dom.loadMoreButton.classList.toggle('button--hidden', filteredCourses.length <= displayedCount);
        
        updateFilterCounts();
        updateAriaLive(filteredCourses.length);
        updateURL();
    }, animate ? ANIMATION_DURATION : 0);
}

// Update ARIA live region for screen readers
function updateAriaLive(count) {
    const message = count === 0 
        ? 'No courses found' 
        : `Showing ${Math.min(displayedCount, count)} of ${count} courses`;
    
    // Update or create aria-live region
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

// Create card HTML
function createCardHTML(course) {
    // Normalize category name for CSS class
    const categoryClass = course.category.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-');
    
    // Use UI Avatars for realistic placeholder images
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(course.author)}&size=400&background=random&color=fff&bold=true`;
    
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

// Get filtered courses
function getFilteredCourses() {
    return coursesData.filter(course => {
        const matchesCategory = currentFilter === 'all' || course.category === currentFilter;
        const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });
}

// Update filter counts
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

// Handle search with debounce
function handleSearch(value) {
    searchQuery = value;
    displayedCount = ITEMS_PER_PAGE;
    renderCards(true); // Animate on search
}

// Attach event listeners
function attachEventListeners() {
    // Search with debounce for better performance
    const debouncedSearch = debounce(handleSearch, DEBOUNCE_DELAY);
    
    dom.searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
    });
    
    // Filters
    dom.filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            handleFilterChange(button.dataset.filter);
        });
        
        // Keyboard support for filters
        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleFilterChange(button.dataset.filter);
            }
        });
    });
    
    // Load more
    dom.loadMoreButton.addEventListener('click', () => {
        const previousCount = Math.min(displayedCount, getFilteredCourses().length);
        displayedCount += ITEMS_PER_PAGE;
        renderCards();
        
        // Focus on first new card for accessibility
        setTimeout(() => {
            const cards = dom.cardsContainer.querySelectorAll('.card');
            if (cards[previousCount]) {
                cards[previousCount].focus();
            }
        }, 100);
    });
}

// Handle filter change
function handleFilterChange(filter) {
    currentFilter = filter;
    displayedCount = ITEMS_PER_PAGE;
    
    // Update active state
    dom.filterButtons.forEach(btn => btn.classList.remove('filters__button--active'));
    const activeButton = Array.from(dom.filterButtons).find(btn => btn.dataset.filter === filter);
    if (activeButton) {
        activeButton.classList.add('filters__button--active');
    }
    
    renderCards(true); // Animate on filter change
}

// Setup keyboard navigation
function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // Clear search with Escape
        if (e.key === 'Escape' && document.activeElement === dom.searchInput) {
            dom.searchInput.value = '';
            handleSearch('');
            dom.searchInput.blur();
        }
        
        // Navigate cards with arrow keys when focused
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const cards = Array.from(dom.cardsContainer.querySelectorAll('.card'));
            const currentIndex = cards.indexOf(document.activeElement);
            
            if (currentIndex !== -1) {
                e.preventDefault();
                let nextIndex;
                
                if (e.key === 'ArrowDown') {
                    nextIndex = Math.min(currentIndex + 3, cards.length - 1); // Move down a row (3 cards)
                } else {
                    nextIndex = Math.max(currentIndex - 3, 0); // Move up a row
                }
                
                cards[nextIndex]?.focus();
            }
        }
        
        // Navigate with left/right arrows
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

// Save state to URL (History API)
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

// Restore state from URL
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

// Start the app
init();

