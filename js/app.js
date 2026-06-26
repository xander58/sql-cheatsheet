// SQL Cheatsheet App
(function() {
    'use strict';

    // ===== Состояние =====
    const state = {
        data: null,
        filteredData: null,
        searchQuery: '',
        levelFilter: 'all',
        activeSection: null
    };

    // ===== DOM элементы =====
    const dom = {
        content: document.getElementById('content'),
        navList: document.getElementById('navList'),
        searchInput: document.getElementById('searchInput'),
        levelFilter: document.getElementById('levelFilter'),
        sidebar: document.getElementById('sidebar'),
        menuToggle: document.getElementById('menuToggle'),
        overlay: document.getElementById('overlay')
    };

    // ===== Загрузка данных =====
    async function loadData() {
        try {
            const response = await fetch('data/data.json');
            if (!response.ok) throw new Error('Не удалось загрузить данные');
            state.data = await response.json();
            state.filteredData = state.data;
            render();
            setupScrollSpy();
        } catch (err) {
            dom.content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <h3>Ошибка загрузки</h3>
                    <p>${err.message}. Проверьте, что файл data/data.json существует.</p>
                </div>
            `;
        }
    }

    // ===== Рендер =====
    function render() {
        renderNavigation();
        renderContent();
    }

    function renderNavigation() {
        if (!state.filteredData) return;
        
        dom.navList.innerHTML = '';
        state.filteredData.sections.forEach(section => {
            const li = document.createElement('li');
            li.innerHTML = `
                <a href="#${section.id}" class="nav-link" data-section="${section.id}">
                    <span class="nav-level ${section.level}"></span>
                    <span>${escapeHtml(section.title)}</span>
                </a>
            `;
            dom.navList.appendChild(li);
        });
    }

    function renderContent() {
        if (!state.filteredData) return;
        
        const sections = state.filteredData.sections;
        
        if (sections.length === 0) {
            dom.content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3>Ничего не найдено</h3>
                    <p>Попробуйте изменить поисковый запрос или фильтр.</p>
                </div>
            `;
            return;
        }
        
        const html = sections.map(section => renderSection(section)).join('');
        dom.content.innerHTML = html;
        
        // Подсветка кода
        if (window.Prism) {
            Prism.highlightAllUnder(dom.content);
        }
        
        // Навешиваем обработчики на кнопки копирования
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => copyCode(btn));
        });
    }

    function renderSection(section) {
        const levelLabels = {
            basic: 'Базовый',
            intermediate: 'Средний',
            advanced: 'Продвинутый'
        };
        
        const cardsHtml = section.cards.map(card => renderCard(card)).join('');
        
        return `
            <section class="section" id="${section.id}">
                <div class="section-header">
                    <h2 class="section-title">${escapeHtml(section.title)}</h2>
                    <span class="level-badge ${section.level}">${levelLabels[section.level]}</span>
                </div>
                ${section.description ? `<p class="section-desc">${escapeHtml(section.description)}</p>` : ''}
                ${cardsHtml}
            </section>
        `;
    }

    function renderCard(card) {
        let html = `
            <div class="card">
                <h3 class="card-title">${escapeHtml(card.title)}</h3>
                ${card.description ? `<p class="card-desc">${escapeHtml(card.description)}</p>` : ''}
        `;
        
        // Синтаксис
        if (card.syntax) {
            html += renderCodeBlock('Синтаксис', card.syntax);
        }
        
        // Примеры
        if (card.examples && card.examples.length > 0) {
            html += '<div class="examples">';
            card.examples.forEach(example => {
                html += `
                    <div class="example">
                        ${example.description ? `<p class="example-desc">${escapeHtml(example.description)}</p>` : ''}
                        ${renderCodeBlock('Пример', example.code)}
                        ${example.tables ? renderTables(example.tables) : ''}
                    </div>
                `;
            });
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }

    function renderCodeBlock(label, code) {
        const id = 'code-' + Math.random().toString(36).slice(2, 11);
        return `
            <div class="code-block">
                <div class="code-label">
                    <span class="code-label-text">${escapeHtml(label)}</span>
                    <button class="copy-btn" data-code-id="${id}" aria-label="Скопировать">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>Копировать</span>
                    </button>
                </div>
                <pre><code class="language-sql" id="${id}">${escapeHtml(code)}</code></pre>
            </div>
        `;
    }

    function renderTables(tables) {
        if (!tables.before && !tables.after) return '';
        
        let html = '<div class="tables-wrapper">';
        
        if (tables.before) {
            html += renderMiniTable(tables.before, 'До запроса');
        }
        if (tables.after) {
            html += renderMiniTable(tables.after, 'Результат');
        }
        
        html += '</div>';
        return html;
    }

    function renderMiniTable(table, label) {
        if (!table.columns || !table.rows) return '';
        
        const headers = table.columns.map(col => `<th>${escapeHtml(col)}</th>`).join('');
        const rows = table.rows.map(row => {
            const cells = row.map(cell => {
                if (cell === null) {
                    return '<td class="null-val">NULL</td>';
                }
                return `<td>${escapeHtml(String(cell))}</td>`;
            }).join('');
            return `<tr>${cells}</tr>`;
        }).join('');
        
        return `
            <div class="table-block">
                <div class="table-label">${escapeHtml(label)}</div>
                <table class="mini-table">
                    <thead><tr>${headers}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    // ===== Копирование =====
    async function copyCode(btn) {
        const codeId = btn.dataset.codeId;
        const codeEl = document.getElementById(codeId);
        if (!codeEl) return;
        
        const text = codeEl.textContent;
        
        try {
            await navigator.clipboard.writeText(text);
            showCopiedFeedback(btn);
        } catch (err) {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showCopiedFeedback(btn);
            } catch (e) {
                console.error('Ошибка копирования:', e);
            }
            document.body.removeChild(textarea);
        }
    }

    function showCopiedFeedback(btn) {
        const originalText = btn.querySelector('span').textContent;
        btn.classList.add('copied');
        btn.querySelector('span').textContent = 'Скопировано ✓';
        
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.querySelector('span').textContent = originalText;
        }, 1500);
    }

    // ===== Поиск и фильтрация =====
    function applyFilters() {
        if (!state.data) return;
        
        const query = state.searchQuery.toLowerCase().trim();
        const level = state.levelFilter;
        
        const filteredSections = state.data.sections
            .filter(section => level === 'all' || section.level === level)
            .map(section => {
                const filteredCards = section.cards.filter(card => {
                    if (!query) return true;
                    
                    const searchFields = [
                        card.title,
                        card.description || '',
                        card.syntax || '',
                        ...(card.examples || []).flatMap(ex => [
                            ex.description || '',
                            ex.code || ''
                        ])
                    ].join(' ').toLowerCase();
                    
                    return searchFields.includes(query);
                });
                
                if (filteredCards.length === 0) return null;
                
                return {
                    ...section,
                    cards: filteredCards
                };
            })
            .filter(Boolean);
        
        state.filteredData = { sections: filteredSections };
        render();
    }

    // ===== Скролл-шпион =====
    function setupScrollSpy() {
        const sections = document.querySelectorAll('.section');
        if (sections.length === 0) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    setActiveNav(id);
                }
            });
        }, {
            rootMargin: '-80px 0px -70% 0px',
            threshold: 0
        });
        
        sections.forEach(section => observer.observe(section));
    }

    function setActiveNav(sectionId) {
        if (state.activeSection === sectionId) return;
        state.activeSection = sectionId;
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.section === sectionId);
        });
    }

    // ===== Мобильное меню =====
    function toggleSidebar(show) {
        const shouldShow = show ?? !dom.sidebar.classList.contains('active');
        dom.sidebar.classList.toggle('active', shouldShow);
        dom.overlay.classList.toggle('active', shouldShow);
    }

    // ===== Утилиты =====
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ===== Обработчики событий =====
    function setupEventListeners() {
        // Поиск с debounce
        let searchTimeout;
        dom.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.searchQuery = e.target.value;
                applyFilters();
            }, 200);
        });
        
        // Фильтр уровня
        dom.levelFilter.addEventListener('change', (e) => {
            state.levelFilter = e.target.value;
            applyFilters();
        });
        
        // Мобильное меню
        dom.menuToggle.addEventListener('click', () => toggleSidebar());
        dom.overlay.addEventListener('click', () => toggleSidebar(false));
        
        // Закрытие сайдбара при клике по ссылке (мобилка)
        dom.navList.addEventListener('click', (e) => {
            if (e.target.closest('.nav-link') && window.innerWidth <= 768) {
                toggleSidebar(false);
            }
        });
        
        // Горячая клавиша для поиска
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                dom.searchInput.focus();
                dom.searchInput.select();
            }
            if (e.key === 'Escape') {
                if (dom.sidebar.classList.contains('active')) {
                    toggleSidebar(false);
                } else if (document.activeElement === dom.searchInput) {
                    dom.searchInput.blur();
                }
            }
        });
    }

    // ===== Инициализация =====
    function init() {
        setupEventListeners();
        loadData();
    }

    // Старт после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
