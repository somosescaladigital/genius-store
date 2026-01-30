// Product Data - Now dynamic!
let products = [];

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const filterBtns = document.querySelectorAll('.filter-btn');
const mobileMenu = document.getElementById('mobile-menu');
const navLinks = document.querySelector('.nav-links');
const header = document.getElementById('header');
const modal = document.getElementById('productModal');
const modalClose = document.querySelector('.modal-close');

// Load Products from Vercel API
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        products = await response.json();
        renderProducts();
    } catch (error) {
        console.error("Error fetching products:", error);
        productsGrid.innerHTML = '<p class="text-center">Error al cargar productos.</p>';
    }
}

// Global Function to handle categories clicks from the categories section
window.scrollToProducts = (category) => {
    document.getElementById('products').scrollIntoView();
    renderProducts(category);
    // Update filter buttons
    filterBtns.forEach(btn => {
        if(btn.dataset.filter === category) btn.classList.add('active');
        else btn.classList.remove('active');
    });
};

// Render Products
function renderProducts(filter = 'all') {
    if (!productsGrid) return;

    const filtered = filter === 'all' 
        ? products 
        : products.filter(p => p.category === filter);

    if (filtered.length === 0) {
        productsGrid.innerHTML = '<p class="text-center" style="grid-column: 1/-1; opacity: 0.5; padding: 2rem;">No hay productos en esta categoría.</p>';
        return;
    }

    productsGrid.innerHTML = filtered.map(product => `
        <div class="product-card reveal">
            <div class="product-img">
                ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                <h3>${product.name}</h3>
                <p class="product-price">${product.price}</p>
                <button class="product-btn" onclick="openProductModal('${product.id}')">Ver Detalles</button>
            </div>
        </div>
    `).join('');

    // Trigger reveal for new elements
    setTimeout(() => {
        const reveals = productsGrid.querySelectorAll('.reveal');
        reveals.forEach(el => el.classList.add('active'));
    }, 100);
}

// Modal Logic
window.openProductModal = (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('modalImg').src = product.image;
    document.getElementById('modalTitle').textContent = product.name;
    document.getElementById('modalPrice').textContent = product.price;
    document.getElementById('modalDesc').textContent = product.description;
    
    // WhatsApp prefilled message
    const message = `¡Hola Genius Store! 👋 Vi este producto en su web y me interesa: ${product.name} (${product.price})`;
    const waUrl = `https://wa.me/5491131563172/?text=${encodeURIComponent(message)}`;
    document.getElementById('waOrderBtn').href = waUrl;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Stop scrolling
};

modalClose.addEventListener('click', () => {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
});

// Category Cards listeners
document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
        const cat = card.dataset.category;
        window.scrollToProducts(cat);
    });
});

// Filter Handlers
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProducts(btn.dataset.filter);
    });
});

// Mobile Menu
if (mobileMenu) {
    mobileMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileMenu.classList.toggle('active');
    });
}

// Header Scroll Effect
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Scroll Reveal
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            revealObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Close mobile menu on link click
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        mobileMenu.classList.remove('active');
    });
});

// Initial Load
loadProducts();
