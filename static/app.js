// --- App State ---
let allUpdates = [];
let filteredUpdates = [];
let selectedIds = new Set();
let activeCategories = new Set();
let categoriesWithCounts = {};

// --- DOM Elements ---
const cardsContainer = document.getElementById('cards-container');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const categoryFilters = document.getElementById('category-filters');
const sortSelect = document.getElementById('sort-select');
const resultsCount = document.getElementById('results-count');

// Tweet Compiler Elements
const tweetTextarea = document.getElementById('tweet-textarea');
const charCount = document.getElementById('char-count');
const selectionCount = document.getElementById('selection-count');
const tweetSelectedBtn = document.getElementById('tweet-selected-btn');
const clearSelectionBtn = document.getElementById('clear-selection-btn');
const toastContainer = document.getElementById('toast-container');
const exportCsvBtn = document.getElementById('export-csv-btn');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// --- Event Listeners Setup ---
function setupEventListeners() {
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    searchInput.addEventListener('input', () => {
        if (searchInput.value.trim() !== '') {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        applyFilters();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        applyFilters();
    });

    sortSelect.addEventListener('change', () => {
        sortAndRender();
    });

    // Tweet compiler listeners
    tweetTextarea.addEventListener('input', updateCharCount);
    tweetSelectedBtn.addEventListener('click', tweetSelected);
    clearSelectionBtn.addEventListener('click', clearSelection);

    // Export CSV listener
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportToCsv);
    }
}

// --- Fetch Data ---
async function fetchReleaseNotes(forceRefresh = false) {
    showLoadingState();
    
    try {
        const url = forceRefresh ? '/api/release-notes?refresh=true' : '/api/release-notes';
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.status === 'success' || result.status === 'warning') {
            allUpdates = result.data;
            
            if (result.status === 'warning') {
                showToast(result.message, 'warning');
            } else if (forceRefresh) {
                showToast('Release notes updated successfully.', 'success');
            }
            
            // Re-initialize state
            selectedIds.clear();
            extractCategories();
            applyFilters();
        } else {
            showErrorState(result.message || 'An error occurred while fetching updates.');
        }
    } catch (error) {
        showErrorState('Failed to connect to the server. Please try again.');
        console.error(error);
    } finally {
        hideLoadingState();
    }
}

// --- Parse & Extract Categories ---
function extractCategories() {
    categoriesWithCounts = {};
    activeCategories.clear();
    
    allUpdates.forEach(update => {
        const cat = update.category || 'General';
        categoriesWithCounts[cat] = (categoriesWithCounts[cat] || 0) + 1;
        activeCategories.add(cat);
    });
    
    renderCategoryFilters();
}

// --- Render Categories Panel ---
function renderCategoryFilters() {
    categoryFilters.innerHTML = '';
    
    // Select/Deselect All Checkbox
    const allDiv = document.createElement('div');
    allDiv.className = 'filter-checkbox';
    allDiv.innerHTML = `
        <input type="checkbox" id="cat-all" checked>
        <span style="font-weight: 600;">Toggle All Categories</span>
    `;
    const allCheckbox = allDiv.querySelector('input');
    allCheckbox.addEventListener('change', (e) => {
        const checked = e.target.checked;
        const checkboxes = categoryFilters.querySelectorAll('.category-check');
        checkboxes.forEach(cb => {
            cb.checked = checked;
            const cat = cb.dataset.category;
            if (checked) {
                activeCategories.add(cat);
            } else {
                activeCategories.delete(cat);
            }
        });
        applyFilters();
    });
    categoryFilters.appendChild(allDiv);

    // Individual categories
    Object.keys(categoriesWithCounts).sort().forEach(cat => {
        const count = categoriesWithCounts[cat];
        const div = document.createElement('div');
        div.className = 'filter-checkbox';
        div.innerHTML = `
            <input type="checkbox" id="cat-${cat}" class="category-check" data-category="${cat}" checked>
            <span>${cat}</span>
            <span class="filter-count">${count}</span>
        `;
        
        const checkbox = div.querySelector('input');
        checkbox.addEventListener('change', (e) => {
            const categoryName = e.target.dataset.category;
            if (e.target.checked) {
                activeCategories.add(categoryName);
            } else {
                activeCategories.delete(categoryName);
            }
            
            // Handle "All" checkbox state
            const allCb = document.getElementById('cat-all');
            const totalCategories = Object.keys(categoriesWithCounts).length;
            if (activeCategories.size === totalCategories) {
                allCb.checked = true;
                allCb.indeterminate = false;
            } else if (activeCategories.size === 0) {
                allCb.checked = false;
                allCb.indeterminate = false;
            } else {
                allCb.indeterminate = true;
            }
            
            applyFilters();
        });
        
        categoryFilters.appendChild(div);
    });
}

// --- Apply Search & Category Filters ---
function applyFilters() {
    const searchQuery = searchInput.value.toLowerCase().trim();
    
    filteredUpdates = allUpdates.filter(update => {
        // Category Filter
        const cat = update.category || 'General';
        if (!activeCategories.has(cat)) return false;
        
        // Search Filter
        if (searchQuery) {
            const matchesSearch = 
                update.date.toLowerCase().includes(searchQuery) ||
                update.category.toLowerCase().includes(searchQuery) ||
                update.text.toLowerCase().includes(searchQuery);
            return matchesSearch;
        }
        
        return true;
    });
    
    sortAndRender();
}

// --- Sort and Render Release Notes ---
function sortAndRender() {
    const sortBy = sortSelect.value;
    
    filteredUpdates.sort((a, b) => {
        const dateA = new Date(a.date_iso || a.date);
        const dateB = new Date(b.date_iso || b.date);
        return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    renderCards();
    updateCompilerPreview();
}

// --- Render Release Notes Cards ---
function renderCards() {
    cardsContainer.innerHTML = '';
    resultsCount.textContent = `${filteredUpdates.length} update${filteredUpdates.length !== 1 ? 's' : ''} found`;
    
    if (exportCsvBtn) {
        exportCsvBtn.disabled = filteredUpdates.length === 0;
    }
    
    if (filteredUpdates.length === 0) {
        cardsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-folder-open"></i>
                <h3>No updates found</h3>
                <p>Try refining your search or selecting more categories.</p>
            </div>
        `;
        return;
    }
    
    filteredUpdates.forEach(update => {
        const card = document.createElement('div');
        const isSelected = selectedIds.has(update.id);
        card.className = `card ${isSelected ? 'selected' : ''}`;
        card.dataset.id = update.id;
        
        // Badge color class helper
        const badgeClass = getBadgeClass(update.category);
        
        card.innerHTML = `
            <div class="card-header">
                <div class="header-meta">
                    <span class="badge ${badgeClass}">${update.category}</span>
                    <span class="card-date"><i class="fa-regular fa-calendar"></i> ${update.date}</span>
                </div>
                <div class="card-select-btn" title="Select to Tweet">
                    <i class="fa-solid fa-check"></i>
                </div>
            </div>
            <div class="card-body">
                ${update.html}
            </div>
            <div class="card-actions">
                <button class="btn btn-secondary btn-sm copy-text-btn" data-text="${update.text.replace(/"/g, '&quot;')}">
                    <i class="fa-regular fa-clipboard"></i> Copy Text
                </button>
                <button class="btn btn-secondary btn-sm copy-link-btn" data-link="${update.link}">
                    <i class="fa-regular fa-copy"></i> Copy Link
                </button>
                <button class="btn btn-twitter btn-sm tweet-card-btn" data-id="${update.id}">
                    <i class="fa-brands fa-x-twitter"></i> Tweet This
                </button>
            </div>
        `;
        
        // Wire selection when clicking card (except buttons and links)
        card.addEventListener('click', (e) => {
            if (e.target.closest('a') || e.target.closest('.btn')) {
                return; // Let links and actions function normally
            }
            toggleSelection(update.id, card);
        });
        
        // Copy text button handler
        card.querySelector('.copy-text-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const text = e.currentTarget.dataset.text;
            navigator.clipboard.writeText(text)
                .then(() => showToast('Update text copied to clipboard!', 'success'))
                .catch(() => showToast('Failed to copy text.', 'error'));
        });
        
        // Copy link button handler
        card.querySelector('.copy-link-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const link = e.currentTarget.dataset.link;
            navigator.clipboard.writeText(link)
                .then(() => showToast('Link copied to clipboard!', 'success'))
                .catch(() => showToast('Failed to copy link.', 'error'));
        });
        
        // Single Tweet button handler
        card.querySelector('.tweet-card-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const id = e.currentTarget.dataset.id;
            tweetSingleCard(id);
        });
        
        // Keep links working inside card body
        card.querySelectorAll('.card-body a').forEach(a => {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
        });
        
        cardsContainer.appendChild(card);
    });
}

// --- Export to CSV ---
function exportToCsv() {
    if (filteredUpdates.length === 0) return;
    
    let csvContent = "\ufeffDate,Category,Text Summary,URL\n";
    
    filteredUpdates.forEach(update => {
        const escapeCsv = (val) => {
            if (val === null || val === undefined) return '';
            let formatted = val.toString().replace(/"/g, '""');
            if (formatted.includes(',') || formatted.includes('\n') || formatted.includes('"')) {
                formatted = `"${formatted}"`;
            }
            return formatted;
        };
        
        const row = [
            escapeCsv(update.date),
            escapeCsv(update.category),
            escapeCsv(update.text),
            escapeCsv(update.link)
        ].join(',');
        
        csvContent += row + "\n";
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_release_notes_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Exported filtered updates to CSV!', 'success');
}

// Helper: Badge color mapping
function getBadgeClass(category) {
    const cat = (category || '').toLowerCase();
    if (cat.includes('feature')) return 'badge-feature';
    if (cat.includes('announcement')) return 'badge-announcement';
    if (cat.includes('issue') || cat.includes('fixed') || cat.includes('change')) return 'badge-issue';
    if (cat.includes('deprecation')) return 'badge-deprecation';
    return 'badge-general';
}

// --- Multi-Select Mechanics ---
function toggleSelection(id, cardElement) {
    if (selectedIds.has(id)) {
        selectedIds.delete(id);
        cardElement.classList.remove('selected');
    } else {
        selectedIds.add(id);
        cardElement.classList.add('selected');
    }
    
    updateCompilerPreview();
}

function clearSelection() {
    selectedIds.clear();
    document.querySelectorAll('.card.selected').forEach(card => {
        card.classList.remove('selected');
    });
    updateCompilerPreview();
    showToast('Selection cleared.', 'info');
}

// --- Tweet Generation ---
function updateCompilerPreview() {
    const selected = Array.from(selectedIds).map(id => allUpdates.find(u => u.id === id)).filter(Boolean);
    
    // Sort selection by date
    selected.sort((a, b) => new Date(b.date_iso || b.date) - new Date(a.date_iso || a.date));
    
    if (selected.length === 0) {
        tweetTextarea.value = '';
        tweetSelectedBtn.disabled = true;
        clearSelectionBtn.disabled = true;
        selectionCount.textContent = '0 Selected';
        updateCharCount();
        return;
    }
    
    selectionCount.textContent = `${selected.length} Selected`;
    tweetSelectedBtn.disabled = false;
    clearSelectionBtn.disabled = false;
    
    let tweet = '';
    
    if (selected.length === 1) {
        const item = selected[0];
        const datePart = item.date;
        const catPart = item.category;
        const textPart = item.text;
        const linkPart = item.link;
        
        // Shorten title date for spacing if needed
        // Standard Twitter URL takes 23 characters.
        // Format: "Google #BigQuery [Category] (Date): Description... Link"
        const prefix = `Google #BigQuery [${catPart}] (${datePart}): `;
        const suffix = `\n\nLink: ${linkPart}`;
        
        // 280 - 23 (url) - prefix length - spacer length
        const availableTextLen = 280 - 23 - prefix.length - 8;
        
        let cleanText = textPart;
        if (cleanText.length > availableTextLen) {
            cleanText = cleanText.substring(0, availableTextLen - 3) + '...';
        }
        
        tweet = `${prefix}${cleanText}${suffix}`;
    } else {
        // Multi-compile summary
        tweet = `New Google #BigQuery Releases 🚀\n`;
        
        for (const item of selected) {
            const datePart = item.date.split(',')[0]; // Just "June 16" instead of "June 16, 2026"
            const line = `\n• [${datePart} - ${item.category}] ${item.text}`;
            
            // Leave room for footer URL (23 chars + newline/spacing ~ 35 chars)
            if (tweet.length + line.length + 35 <= 280) {
                tweet += line;
            } else {
                // Try to add a truncated version of the current item if there is room
                const remaining = 280 - tweet.length - 38; // 38 for ellipsis + footer
                if (remaining > 20) {
                    tweet += `\n• [${datePart} - ${item.category}] ${item.text.substring(0, remaining)}...`;
                }
                break;
            }
        }
        
        tweet += `\n\nDetails: https://docs.cloud.google.com/bigquery/docs/release-notes`;
    }
    
    tweetTextarea.value = tweet;
    updateCharCount();
}

function updateCharCount() {
    const text = tweetTextarea.value;
    // Twitter custom URL shortening counts all URLs as 23 characters.
    // Let's replace URLs in text with a 23-char placeholder for realistic count.
    const urlRegex = /https?:\/\/[^\s]+/g;
    let computedLength = text.length;
    
    const matches = text.match(urlRegex);
    if (matches) {
        matches.forEach(url => {
            computedLength = computedLength - url.length + 23;
        });
    }
    
    charCount.textContent = computedLength;
    
    // Styling warnings for X's 280 limit
    if (computedLength > 280) {
        charCount.className = 'error';
        tweetSelectedBtn.disabled = true;
    } else if (computedLength > 250) {
        charCount.className = 'warning';
        tweetSelectedBtn.disabled = false;
    } else {
        charCount.className = '';
        tweetSelectedBtn.disabled = false;
    }
}

// --- Share Intents ---
function tweetSelected() {
    const text = tweetTextarea.value;
    if (!text) return;
    
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(tweetUrl, '_blank', 'width=600,height=400,resizable=yes');
}

function tweetSingleCard(id) {
    const item = allUpdates.find(u => u.id === id);
    if (!item) return;
    
    const prefix = `Google #BigQuery [${item.category}] (${item.date}): `;
    const suffix = `\n\nLink: ${item.link}`;
    const availableTextLen = 280 - 23 - prefix.length - 8;
    
    let cleanText = item.text;
    if (cleanText.length > availableTextLen) {
        cleanText = cleanText.substring(0, availableTextLen - 3) + '...';
    }
    
    const tweetText = `${prefix}${cleanText}${suffix}`;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(tweetUrl, '_blank', 'width=600,height=400,resizable=yes');
}

// --- Loading / UI State handlers ---
function showLoadingState() {
    refreshIcon.classList.add('spinning');
    refreshBtn.disabled = true;
    if (exportCsvBtn) {
        exportCsvBtn.disabled = true;
    }
    
    // Clear dynamic filters
    categoryFilters.innerHTML = `
        <div class="skeleton-filters">
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
        </div>
    `;
    
    // Show skeleton cards
    cardsContainer.innerHTML = `
        <div class="skeleton-card">
            <div class="skeleton-header"><div class="skeleton-badge"></div><div class="skeleton-date"></div></div>
            <div class="skeleton-body"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line"></div></div>
            <div class="skeleton-footer"></div>
        </div>
        <div class="skeleton-card">
            <div class="skeleton-header"><div class="skeleton-badge"></div><div class="skeleton-date"></div></div>
            <div class="skeleton-body"><div class="skeleton-line"></div><div class="skeleton-line"></div><div class="skeleton-line"></div></div>
            <div class="skeleton-footer"></div>
        </div>
    `;
}

function hideLoadingState() {
    refreshIcon.classList.remove('spinning');
    refreshBtn.disabled = false;
}

function showErrorState(message) {
    cardsContainer.innerHTML = `
        <div class="empty-state" style="border-color: var(--danger);">
            <i class="fa-solid fa-triangle-exclamation" style="color: var(--danger);"></i>
            <h3>Unable to load release notes</h3>
            <p>${message}</p>
            <button class="btn btn-secondary btn-sm" onclick="fetchReleaseNotes()" style="margin-top: 15px;">
                <i class="fa-solid fa-arrows-rotate"></i> Try Again
            </button>
        </div>
    `;
    resultsCount.textContent = 'Error';
}

// --- Toast Notifications Helper ---
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '<i class="fa-solid fa-circle-info"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check" style="color: var(--success)"></i>';
    if (type === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation" style="color: var(--warning)"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-xmark" style="color: var(--danger)"></i>';
    
    toast.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after animation completes
    setTimeout(() => {
        toast.remove();
    }, 4000);
}
