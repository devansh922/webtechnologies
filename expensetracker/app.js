// ============================================
//  XPENSE — Frontend App Logic
//  Features: Dark Mode, Search, Budget, Edit
// ============================================

const API      = 'http://localhost/expensetracker/api.php';
const AUTH_API = 'http://localhost/expensetracker/auth.php';

const CATEGORY_ICONS = {
    'Food & Dining': '🍽', 'Transport': '🚌', 'Shopping': '🛍',
    'Entertainment': '🎬', 'Health': '💊', 'Education': '📚',
    'Bills & Utilities': '💡', 'Other': '📦'
};

const BAR_COLORS = ['#c94f1e','#2a7a4e','#1e6fc9','#8b2fc9','#c9a41e','#c91e5e','#1ec9b2','#7a4e2a'];

// ─── Auth Guard ───────────────────────────────
const userRaw = localStorage.getItem('xpense_user');
if (!userRaw) window.location.href = 'login.html';
const currentUser = JSON.parse(userRaw || '{}');

// ─── State ────────────────────────────────────
let currentMonth     = getCurrentMonth();
let selectedCategory = null;
let allExpenses      = [];

// ─── DOM Helper ───────────────────────────────
const $ = id => document.getElementById(id);
const fmt = n => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(str) {
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function monthLabel(ym) {
    const [y, m] = ym.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[+m - 1]} ${y}`;
}

// ─── Dark Mode ────────────────────────────────
function initDarkMode() {
    const saved = localStorage.getItem('xpense_theme') || 'light';
    applyTheme(saved);

    $('darkModeToggle').addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        applyTheme(current === 'dark' ? 'light' : 'dark');
    });

    $('mobileDarkToggle').addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        applyTheme(current === 'dark' ? 'light' : 'dark');
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('xpense_theme', theme);
    $('mobileDarkToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ─── Mobile Sidebar ───────────────────────────
function initMobileSidebar() {
    const sidebar   = document.getElementById('sidebar');
    const overlay   = $('sidebarOverlay');
    const hamburger = $('hamburger');

    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
    });

    overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    });
}

function closeMobileSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    $('sidebarOverlay').classList.remove('open');
}

// ─── User Info ────────────────────────────────
function loadUserInfo() {
    const name  = currentUser.name  || 'User';
    const email = currentUser.email || '';
    $('userName').textContent   = name;
    $('userEmail').textContent  = email;
    $('userAvatar').textContent = name.charAt(0).toUpperCase();
}

// ─── Logout ───────────────────────────────────
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('xpense_user');
        window.location.href = 'login.html';
    }
}

// ─── API Calls ────────────────────────────────
async function fetchJSON(url, options = {}) {
    try {
        const res  = await fetch(url, options);
        const json = await res.json();
        if (res.status === 401) {
            localStorage.removeItem('xpense_user');
            window.location.href = 'login.html';
            return null;
        }
        return json;
    } catch (err) {
        console.error('Fetch error:', err);
        return null;
    }
}

async function getExpenses(month, category) {
    let url = `${API}?user_id=${currentUser.user_id}&month=${month}`;
    if (category && category !== 'All') url += `&category=${encodeURIComponent(category)}`;
    return fetchJSON(url);
}

async function getSummary(month) {
    return fetchJSON(`${API}?action=summary&user_id=${currentUser.user_id}&month=${month}`);
}

async function addExpense(data) {
    return fetchJSON(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, user_id: currentUser.user_id })
    });
}

async function updateExpense(id, data) {
    return fetchJSON(`${API}?id=${id}&user_id=${currentUser.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, user_id: currentUser.user_id })
    });
}

async function deleteExpense(id) {
    return fetchJSON(`${API}?id=${id}&user_id=${currentUser.user_id}`, { method: 'DELETE' });
}

// ─── Budget ───────────────────────────────────
function getBudget() {
    return parseFloat(localStorage.getItem(`xpense_budget_${currentUser.user_id}`) || '0');
}

function saveBudget(amount) {
    localStorage.setItem(`xpense_budget_${currentUser.user_id}`, amount);
}

function initBudgetModal() {
    $('setBudgetBtn').addEventListener('click', () => {
        $('budgetInput').value = getBudget() || '';
        $('budgetModal').classList.add('open');
    });

    $('closeBudgetModal').addEventListener('click', () => {
        $('budgetModal').classList.remove('open');
    });

    $('budgetModal').addEventListener('click', e => {
        if (e.target === $('budgetModal')) $('budgetModal').classList.remove('open');
    });

    $('saveBudgetBtn').addEventListener('click', () => {
        const val = parseFloat($('budgetInput').value);
        if (!val || val <= 0) { alert('Please enter a valid budget amount.'); return; }
        saveBudget(val);
        $('budgetModal').classList.remove('open');
        loadDashboard();
    });

    $('clearBudgetBtn').addEventListener('click', () => {
        localStorage.removeItem(`xpense_budget_${currentUser.user_id}`);
        $('budgetModal').classList.remove('open');
        loadDashboard();
    });
}

function updateBudgetUI(totalSpent) {
    const budget = getBudget();

    if (!budget) {
        $('budgetDisplay').textContent = 'Not Set';
        $('budgetStatus').innerHTML = '<button class="set-budget-btn" id="setBudgetBtn2">Set Budget</button>';
        $('budgetProgressWrap').style.display = 'none';
        $('setBudgetBtn2').addEventListener('click', () => {
            $('budgetInput').value = '';
            $('budgetModal').classList.add('open');
        });
        return;
    }

    const pct       = Math.min((totalSpent / budget) * 100, 100);
    const remaining = budget - totalSpent;

    $('budgetDisplay').textContent = fmt(budget);

    if (totalSpent > budget) {
        $('budgetStatus').innerHTML = `<span style="color:#ef4444;font-size:11px;font-family:var(--font-mono)">⚠ Over by ${fmt(Math.abs(remaining))}</span>`;
    } else {
        $('budgetStatus').innerHTML = `<span style="font-size:11px;font-family:var(--font-mono);color:var(--ink-muted)">${fmt(remaining)} left</span>`;
    }

    const fill = $('budgetProgressFill');
    fill.style.width = `${pct.toFixed(1)}%`;
    fill.className   = 'budget-progress-fill';
    if (pct >= 100)      fill.classList.add('danger');
    else if (pct >= 80)  fill.classList.add('warning');

    $('budgetProgressText').textContent = `${fmt(totalSpent)} of ${fmt(budget)} used`;
    $('budgetProgressPct').textContent  = `${pct.toFixed(0)}%`;
    $('budgetProgressWrap').style.display = 'block';
}

// ─── Dashboard ────────────────────────────────
async function loadDashboard() {
    $('dashSubtitle').textContent = `Summary for ${monthLabel(currentMonth)}`;

    const [summary, expenses] = await Promise.all([
        getSummary(currentMonth),
        getExpenses(currentMonth, 'All')
    ]);

    if (!summary || !expenses) return;

    const total = parseFloat(summary.total) || 0;
    $('totalSpent').textContent = fmt(total);
    $('totalCount').textContent = `${expenses.length} transaction${expenses.length !== 1 ? 's' : ''}`;

    const cats = summary.categories || [];
    if (cats.length > 0) {
        $('topCategory').textContent = cats[0].category;
        $('topAmount').textContent   = fmt(cats[0].total);
    } else {
        $('topCategory').textContent = '—';
        $('topAmount').textContent   = '₹0';
    }

    const now = new Date();
    const [y, m] = currentMonth.split('-').map(Number);
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m;
    const daysElapsed    = isCurrentMonth ? now.getDate() : new Date(y, m, 0).getDate();
    $('dailyAvg').textContent = daysElapsed > 0 ? fmt(total / daysElapsed) : '₹0';

    updateBudgetUI(total);
    renderCategoryChart(cats, total);
    renderRecentList(expenses.slice(0, 6));
}

function renderCategoryChart(cats, total) {
    const area = $('categoryChart');
    if (cats.length === 0) {
        area.innerHTML = '<div style="color:var(--ink-muted);font-size:13px;font-family:var(--font-mono);padding:20px 0">No data for this month.</div>';
        return;
    }
    area.innerHTML = cats.map((cat, i) => {
        const pct   = total > 0 ? (cat.total / total) * 100 : 0;
        const color = BAR_COLORS[i % BAR_COLORS.length];
        return `
        <div class="chart-bar-item">
            <div class="chart-bar-label">
                <span class="cat-name">${CATEGORY_ICONS[cat.category] || '📦'} ${cat.category}</span>
                <span class="cat-amt">${fmt(cat.total)}</span>
            </div>
            <div class="chart-bar-track">
                <div class="chart-bar-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div>
            </div>
        </div>`;
    }).join('');
}

function renderRecentList(expenses) {
    const list = $('recentList');
    if (expenses.length === 0) {
        list.innerHTML = '<div style="color:var(--ink-muted);font-size:13px;font-family:var(--font-mono);padding:12px">No recent transactions.</div>';
        return;
    }
    list.innerHTML = expenses.map(exp => `
        <div class="recent-item">
            <div class="recent-icon">${CATEGORY_ICONS[exp.category] || '📦'}</div>
            <div class="recent-info">
                <div class="recent-title">${escHtml(exp.title)}</div>
                <div class="recent-meta">${formatDate(exp.date)} · ${exp.category}</div>
            </div>
            <div class="recent-amount">${fmt(exp.amount)}</div>
        </div>
    `).join('');
}

// ─── Expenses List ────────────────────────────
async function loadExpenses() {
    const cat  = $('categoryFilter').value;
    const wrap = $('expensesList');
    wrap.innerHTML = '<div class="loading-state">Loading...</div>';

    const expenses = await getExpenses(currentMonth, cat);
    if (!expenses) return;

    allExpenses = expenses;
    renderExpensesTable(expenses);
}

function renderExpensesTable(expenses) {
    const wrap = $('expensesList');
    if (expenses.length === 0) {
        wrap.innerHTML = '<div class="empty-state">No expenses found for this period.</div>';
        return;
    }

    wrap.innerHTML = `
        <table class="expenses-table">
            <thead>
                <tr>
                    <th>Date</th><th>Title</th><th>Category</th><th>Note</th><th>Amount</th><th></th>
                </tr>
            </thead>
            <tbody>
                ${expenses.map(exp => `
                <tr>
                    <td data-label="Date" style="font-family:var(--font-mono);font-size:12px;color:var(--ink-muted)">${formatDate(exp.date)}</td>
                    <td data-label="Title" style="font-weight:600">${escHtml(exp.title)}</td>
                    <td data-label="Category"><span class="cat-badge">${CATEGORY_ICONS[exp.category] || '📦'} ${exp.category}</span></td>
                    <td data-label="Note" style="color:var(--ink-muted);font-size:12px">${escHtml(exp.note || '—')}</td>
                    <td data-label="Amount" class="amount-cell">${fmt(exp.amount)}</td>
                    <td data-label="">
                        <div class="action-btns">
                            <button class="edit-btn" onclick="openEditModal(${exp.id})" title="Edit">
                                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="delete-btn" onclick="handleDelete(${exp.id})" title="Delete">
                                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>`;
}

// ─── Search ───────────────────────────────────
function initSearch() {
    $('searchInput').addEventListener('input', () => {
        const query = $('searchInput').value.trim().toLowerCase();
        if (!query) { renderExpensesTable(allExpenses); return; }
        const filtered = allExpenses.filter(exp =>
            exp.title.toLowerCase().includes(query) ||
            exp.category.toLowerCase().includes(query) ||
            (exp.note && exp.note.toLowerCase().includes(query))
        );
        renderExpensesTable(filtered);
    });
}

// ─── Delete ───────────────────────────────────
async function handleDelete(id) {
    if (!confirm('Delete this expense?')) return;
    await deleteExpense(id);
    loadExpenses();
    if ($('view-dashboard').classList.contains('active')) loadDashboard();
}

// ─── Edit Expense ─────────────────────────────
function openEditModal(id) {
    const exp = allExpenses.find(e => e.id === id);
    if (!exp) return;

    $('editId').value       = exp.id;
    $('editTitle').value    = exp.title;
    $('editAmount').value   = exp.amount;
    $('editDate').value     = exp.date;
    $('editCategory').value = exp.category;
    $('editNote').value     = exp.note || '';
    $('editError').classList.add('hidden');
    $('editModal').classList.add('open');
}

function initEditModal() {
    $('closeEditModal').addEventListener('click', () => $('editModal').classList.remove('open'));

    $('editModal').addEventListener('click', e => {
        if (e.target === $('editModal')) $('editModal').classList.remove('open');
    });

    $('saveEditBtn').addEventListener('click', async () => {
        const id       = parseInt($('editId').value);
        const title    = $('editTitle').value.trim();
        const amount   = parseFloat($('editAmount').value);
        const date     = $('editDate').value;
        const category = $('editCategory').value;
        const note     = $('editNote').value.trim();

        if (!title)                { showEditError('Please enter a title.');        return; }
        if (!amount || amount <= 0){ showEditError('Please enter a valid amount.'); return; }
        if (!date)                 { showEditError('Please select a date.');        return; }

        $('saveEditBtn').disabled = true;
        $('saveEditBtn').querySelector('span').textContent = 'Saving...';

        const res = await updateExpense(id, { title, amount, category, date, note });

        $('saveEditBtn').disabled = false;
        $('saveEditBtn').querySelector('span').textContent = 'Save Changes';

        if (res && res.success) {
            $('editModal').classList.remove('open');
            loadExpenses();
            if ($('view-dashboard').classList.contains('active')) loadDashboard();
        } else {
            showEditError(res?.error || 'Failed to save. Try again.');
        }
    });
}

function showEditError(msg) {
    $('editError').textContent = msg;
    $('editError').classList.remove('hidden');
}

// ─── Add Expense Form ─────────────────────────
function initAddForm() {
    $('expDate').value = new Date().toISOString().split('T')[0];
    document.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
            pill.classList.add('selected');
            selectedCategory = pill.dataset.cat;
        });
    });
    $('submitExpense').addEventListener('click', handleSubmit);
}

async function handleSubmit() {
    const title  = $('expTitle').value.trim();
    const amount = parseFloat($('expAmount').value);
    const date   = $('expDate').value;
    const note   = $('expNote').value.trim();

    $('formError').classList.add('hidden');
    $('formSuccess').classList.add('hidden');

    if (!title)                { showError('Please enter a title.');        return; }
    if (!amount || amount <= 0){ showError('Please enter a valid amount.'); return; }
    if (!date)                 { showError('Please select a date.');        return; }
    if (!selectedCategory)     { showError('Please select a category.');    return; }

    const btn = $('submitExpense');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Adding...';

    try {
        const res = await addExpense({ title, amount, category: selectedCategory, date, note });
        if (res && res.success) {
            $('formSuccess').classList.remove('hidden');
            $('expTitle').value  = '';
            $('expAmount').value = '';
            $('expNote').value   = '';
            $('expDate').value   = new Date().toISOString().split('T')[0];
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
            selectedCategory = null;
            setTimeout(() => $('formSuccess').classList.add('hidden'), 3000);
        } else {
            showError(res?.error || 'Failed to add expense. Try again.');
        }
    } catch (e) {
        showError('Network error. Make sure PHP server is running.');
    }

    btn.disabled = false;
    btn.querySelector('span').textContent = 'Add Expense';
}

function showError(msg) {
    const el = $('formError');
    el.textContent = msg;
    el.classList.remove('hidden');
}

// ─── Navigation ───────────────────────────────
function setView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    $('view-' + name).classList.add('active');
    document.querySelector(`.nav-item[data-view="${name}"]`).classList.add('active');
    if (name === 'dashboard') loadDashboard();
    if (name === 'expenses')  loadExpenses();
    closeMobileSidebar();
}

// ─── Utility ──────────────────────────────────
function escHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Init ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadUserInfo();
    initDarkMode();
    initMobileSidebar();
    initBudgetModal();
    initEditModal();
    initSearch();

    const monthInput = $('monthFilter');
    monthInput.value = currentMonth;
    monthInput.addEventListener('change', () => {
        currentMonth = monthInput.value;
        const activeView = document.querySelector('.view.active').id.replace('view-', '');
        if (activeView === 'dashboard') loadDashboard();
        if (activeView === 'expenses')  loadExpenses();
    });

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => setView(btn.dataset.view));
    });

    $('categoryFilter').addEventListener('change', loadExpenses);
    $('logoutBtn').addEventListener('click', handleLogout);

    initAddForm();
    loadDashboard();
});