import { 
    auth, 
    db, 
    googleProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    collection, 
    addDoc, 
    deleteDoc, 
    doc, 
    query, 
    where, 
    orderBy,
    onSnapshot
} from './firebase-config.js';

// State Management
let currentUser = null;
let allTransactions = [];
let expenseChart = null;
let currentJenis = 'pemasukan';

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const historyList = document.getElementById('historyList');
const totalSaldoEl = document.getElementById('totalSaldo');
const totalPemasukanEl = document.getElementById('totalPemasukan');
const totalPengeluaranEl = document.getElementById('totalPengeluaran');
const userNameEl = document.getElementById('userName');
const transactionForm = document.getElementById('transactionForm');
const jenisPemasukanBtn = document.getElementById('jenisPemasukan');
const jenisPengeluaranBtn = document.getElementById('jenisPengeluaran');
const kategoriSelect = document.getElementById('kategori');
const nominalInput = document.getElementById('nominal');
const tanggalInput = document.getElementById('tanggal');
const keteranganInput = document.getElementById('keterangan');
const searchKeyword = document.getElementById('searchKeyword');
const filterMonth = document.getElementById('filterMonth');
const filterJenis = document.getElementById('filterJenis');
const resetFilterBtn = document.getElementById('resetFilterBtn');

// Helper Functions
function showLoading() {
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka);
}

function formatDate(timestamp) {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// Update Dashboard
function updateDashboard() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let totalSaldo = 0;
    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    
    allTransactions.forEach(trans => {
        const transDate = trans.tanggal.toDate ? trans.tanggal.toDate() : new Date(trans.tanggal);
        const isCurrentMonth = transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear;
        
        if (trans.jenis === 'pemasukan') {
            totalSaldo += trans.nominal;
            if (isCurrentMonth) totalPemasukan += trans.nominal;
        } else {
            totalSaldo -= trans.nominal;
            if (isCurrentMonth) totalPengeluaran += trans.nominal;
        }
    });
    
    totalSaldoEl.textContent = formatRupiah(totalSaldo);
    totalPemasukanEl.textContent = formatRupiah(totalPemasukan);
    totalPengeluaranEl.textContent = formatRupiah(totalPengeluaran);
}

// Update Chart
function updateChart() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const kategoriMap = new Map();
    
    allTransactions.forEach(trans => {
        if (trans.jenis === 'pengeluaran') {
            const transDate = trans.tanggal.toDate ? trans.tanggal.toDate() : new Date(trans.tanggal);
            if (transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear) {
                const current = kategoriMap.get(trans.kategori) || 0;
                kategoriMap.set(trans.kategori, current + trans.nominal);
            }
        }
    });
    
    const labels = Array.from(kategoriMap.keys());
    const data = Array.from(kategoriMap.values());
    
    const ctx = document.getElementById('expenseChart').getContext('2d');
    
    if (expenseChart) {
        expenseChart.destroy();
    }
    
    if (labels.length > 0) {
        expenseChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
                        '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    } else {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'center';
        ctx.fillText('Belum ada data pengeluaran', ctx.canvas.width / 2, ctx.canvas.height / 2);
    }
}

// Render History dengan Filter
function renderHistory() {
    let filtered = [...allTransactions];
    
    // Filter keyword
    const keyword = searchKeyword.value.toLowerCase();
    if (keyword) {
        filtered = filtered.filter(t => 
            t.keterangan.toLowerCase().includes(keyword) || 
            t.kategori.toLowerCase().includes(keyword)
        );
    }
    
    // Filter bulan
    if (filterMonth.value) {
        const [year, month] = filterMonth.value.split('-');
        filtered = filtered.filter(t => {
            const transDate = t.tanggal.toDate ? t.tanggal.toDate() : new Date(t.tanggal);
            return transDate.getFullYear() === parseInt(year) && transDate.getMonth() === parseInt(month) - 1;
        });
    }
    
    // Filter jenis
    if (filterJenis.value !== 'all') {
        filtered = filtered.filter(t => t.jenis === filterJenis.value);
    }
    
    // Sort by date desc
    filtered.sort((a, b) => {
        const dateA = a.tanggal.toDate ? a.tanggal.toDate() : new Date(a.tanggal);
        const dateB = b.tanggal.toDate ? b.tanggal.toDate() : new Date(b.tanggal);
        return dateB - dateA;
    });
    
    if (filtered.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>Tidak ada transaksi yang ditemukan</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = filtered.map(trans => `
        <div class="transaction-item" data-id="${trans.id}">
            <div class="transaction-info">
                <div>
                    <span class="transaction-category">
                        <i class="fas ${trans.jenis === 'pemasukan' ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                        ${trans.kategori}
                    </span>
                    <span class="transaction-keterangan">${trans.keterangan || '-'}</span>
                </div>
                <div class="transaction-date">
                    <i class="far fa-calendar-alt"></i> ${formatDate(trans.tanggal)}
                </div>
            </div>
            <div class="transaction-amount ${trans.jenis}">
                ${trans.jenis === 'pemasukan' ? '+' : '-'} ${formatRupiah(trans.nominal)}
            </div>
            <button class="btn-delete" onclick="window.deleteTransaction('${trans.id}')">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `).join('');
}

// Delete Transaction
window.deleteTransaction = async (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
        showLoading();
        try {
            await deleteDoc(doc(db, 'transactions', id));
            // Data akan otomatis update melalui listener
        } catch (error) {
            console.error('Error deleting transaction:', error);
            alert('Gagal menghapus transaksi');
        } finally {
            hideLoading();
        }
    }
};

// Setup Real-time Listener
function setupRealtimeListener() {
    if (!currentUser) return;
    
    const q = query(
        collection(db, 'transactions'),
        where('userId', '==', currentUser.uid),
        orderBy('tanggal', 'desc')
    );
    
    onSnapshot(q, (snapshot) => {
        allTransactions = [];
        snapshot.forEach(doc => {
            allTransactions.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        updateDashboard();
        renderHistory();
        updateChart();
    }, (error) => {
        console.error('Error getting transactions:', error);
    });
}

// Add Transaction
async function addTransaction(event) {
    event.preventDefault();
    
    if (!currentUser) {
        alert('Silakan login terlebih dahulu');
        return;
    }
    
    const nominal = parseInt(nominalInput.value);
    if (isNaN(nominal) || nominal <= 0) {
        alert('Masukkan nominal yang valid');
        return;
    }
    
    const tanggal = tanggalInput.value;
    if (!tanggal) {
        alert('Pilih tanggal transaksi');
        return;
    }
    
    const transaction = {
        userId: currentUser.uid,
        jenis: currentJenis,
        kategori: kategoriSelect.value,
        nominal: nominal,
        tanggal: new Date(tanggal),
        keterangan: keteranganInput.value || '-',
        createdAt: new Date()
    };
    
    showLoading();
    try {
        await addDoc(collection(db, 'transactions'), transaction);
        
        // Reset form
        nominalInput.value = '';
        keteranganInput.value = '';
        tanggalInput.value = new Date().toISOString().split('T')[0];
        
        alert('Transaksi berhasil ditambahkan!');
    } catch (error) {
        console.error('Error adding transaction:', error);
        alert('Gagal menambahkan transaksi');
    } finally {
        hideLoading();
    }
}

// Set tanggal default hari ini
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    tanggalInput.value = today;
}

// Jenis toggle
function setupJenisToggle() {
    jenisPemasukanBtn.addEventListener('click', () => {
        currentJenis = 'pemasukan';
        jenisPemasukanBtn.classList.add('active');
        jenisPengeluaranBtn.classList.remove('active');
        
        // Update kategori options
        Array.from(kategoriSelect.options).forEach(opt => {
            if (opt.parentElement.label === 'Pemasukan') {
                opt.disabled = false;
            } else {
                opt.disabled = true;
            }
        });
        kategoriSelect.value = 'Gaji';
    });
    
    jenisPengeluaranBtn.addEventListener('click', () => {
        currentJenis = 'pengeluaran';
        jenisPengeluaranBtn.classList.add('active');
        jenisPemasukanBtn.classList.remove('active');
        
        // Update kategori options
        Array.from(kategoriSelect.options).forEach(opt => {
            if (opt.parentElement.label === 'Pengeluaran') {
                opt.disabled = false;
            } else {
                opt.disabled = true;
            }
        });
        kategoriSelect.value = 'Makanan';
    });
    
    // Trigger initial
    jenisPemasukanBtn.click();
}

// Setup filter listeners
function setupFilters() {
    searchKeyword.addEventListener('input', () => renderHistory());
    filterMonth.addEventListener('change', () => renderHistory());
    filterJenis.addEventListener('change', () => renderHistory());
    resetFilterBtn.addEventListener('click', () => {
        searchKeyword.value = '';
        filterMonth.value = '';
        filterJenis.value = 'all';
        renderHistory();
    });
}

// Auth Functions
function setupAuthTabs() {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`${tabName}Form`).classList.add('active');
        });
    });
}

async function handleLogin(email, password) {
    showLoading();
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Login success:', userCredential.user.email);
    } catch (error) {
        console.error('Login error:', error);
        alert(error.message === 'Firebase: Error (auth/invalid-credential).' 
            ? 'Email atau password salah' 
            : error.message);
    } finally {
        hideLoading();
    }
}

async function handleRegister(name, email, password) {
    if (password.length < 6) {
        alert('Password minimal 6 karakter');
        return;
    }
    
    showLoading();
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        console.log('Register success:', userCredential.user.email);
    } catch (error) {
        console.error('Register error:', error);
        if (error.message.includes('email-already-in-use')) {
            alert('Email sudah terdaftar, silakan login');
        } else {
            alert(error.message);
        }
    } finally {
        hideLoading();
    }
}

async function handleGoogleLogin() {
    showLoading();
    try {
        await signInWithPopup(auth, googleProvider);
        console.log('Google login success');
    } catch (error) {
        console.error('Google login error:', error);
        alert('Gagal login dengan Google');
    } finally {
        hideLoading();
    }
}

async function handleLogout() {
    showLoading();
    try {
        await signOut(auth);
        console.log('Logout success');
    } catch (error) {
        console.error('Logout error:', error);
        alert('Gagal logout');
    } finally {
        hideLoading();
    }
}

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        userNameEl.textContent = user.displayName || user.email.split('@')[0];
        
        // Setup realtime listener
        setupRealtimeListener();
    } else {
        currentUser = null;
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        allTransactions = [];
        
        // Reset form
        if (transactionForm) transactionForm.reset();
        setDefaultDate();
    }
});

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    setDefaultDate();
    setupJenisToggle();
    setupFilters();
    setupAuthTabs();
    
    // Auth form submissions
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            handleLogin(email, password);
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            handleRegister(name, email, password);
        });
    }
    
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', handleGoogleLogin);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    if (transactionForm) {
        transactionForm.addEventListener('submit', addTransaction);
    }
});