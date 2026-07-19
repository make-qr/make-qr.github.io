// Homepage calculator search — uses CALCULATOR_SEARCH_INDEX from search-index.js
document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('siteSearch');
    var results = document.getElementById('searchResults');
    var btn = document.getElementById('siteSearchBtn');
    if (!input || !results) return;

    var index = (window.CALCULATOR_SEARCH_INDEX || []).map(function (item) {
        var shortLabel = item.label.split(' - ')[0].trim();
        return {
            label: shortLabel,
            href: item.href,
            category: item.category || '',
            keywords: (item.keywords || '') + ' ' + shortLabel + ' ' + item.href.replace('.html', '').replace(/-/g, ' ')
        };
    });

    // Fallback if search-index.js failed to load
    if (!index.length) {
        index = Array.from(document.querySelectorAll('.category-list a[href$=".html"]')).map(function (a) {
            var label = a.textContent.trim();
            return {
                label: label,
                href: a.getAttribute('href'),
                category: '',
                keywords: label.toLowerCase() + ' ' + a.getAttribute('href').replace('.html', '').replace(/-/g, ' ')
            };
        });
    }

    var activeIndex = -1;

    function escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function hideResults() {
        results.hidden = true;
        results.innerHTML = '';
        activeIndex = -1;
        input.setAttribute('aria-expanded', 'false');
    }

    function showResults() {
        results.hidden = false;
        input.setAttribute('aria-expanded', 'true');
    }

    function getMatches(query) {
        var q = query.trim().toLowerCase();
        if (q.length < 2) return [];

        return index.filter(function (item) {
            return item.keywords.toLowerCase().indexOf(q) !== -1 ||
                item.label.toLowerCase().indexOf(q) !== -1;
        }).slice(0, 10);
    }

    function render(items) {
        if (!items.length) {
            results.innerHTML = '<p class="search-empty">No calculators found. Try "mortgage", "BMI", or "concrete".</p>';
            showResults();
            return;
        }

        results.innerHTML = items.map(function (item, i) {
            var cat = item.category ? '<span class="search-result-cat">' + escapeHtml(item.category) + '</span>' : '';
            return '<a class="search-result" role="option" data-index="' + i + '" href="' + escapeHtml(item.href) + '">' +
                '<i class="fas fa-calculator" aria-hidden="true"></i>' +
                '<span class="search-result-text">' + escapeHtml(item.label) + cat + '</span>' +
                '</a>';
        }).join('');
        showResults();
    }

    function search() {
        activeIndex = -1;
        var items = getMatches(input.value);
        render(items);
    }

    function goToFirstResult() {
        var q = input.value.trim();
        if (q.length < 2) return;

        var items = getMatches(q);
        if (items.length) {
            window.location.href = items[0].href;
            return;
        }
        window.location.href = 'sitemap.html?q=' + encodeURIComponent(q);
    }

    function setActive(index) {
        var links = results.querySelectorAll('.search-result');
        if (!links.length) return;

        activeIndex = Math.max(0, Math.min(index, links.length - 1));
        links.forEach(function (link, i) {
            link.classList.toggle('is-active', i === activeIndex);
        });
        links[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    input.addEventListener('input', search);

    input.addEventListener('focus', function () {
        if (input.value.trim().length >= 2) search();
    });

    input.addEventListener('keydown', function (e) {
        var links = results.querySelectorAll('.search-result');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (results.hidden) search();
            setActive(activeIndex + 1);
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive(activeIndex <= 0 ? 0 : activeIndex - 1);
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (!results.hidden && activeIndex >= 0 && links[activeIndex]) {
                window.location.href = links[activeIndex].getAttribute('href');
                return;
            }
            goToFirstResult();
            return;
        }

        if (e.key === 'Escape') {
            hideResults();
            input.blur();
        }
    });

    if (btn) {
        btn.addEventListener('click', goToFirstResult);
    }

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.site-search')) {
            hideResults();
        }
    });
});
