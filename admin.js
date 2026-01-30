const adminContent = document.getElementById('adminContent');
const configMessage = document.getElementById('configMessage');

// In Vercel, we check for presence of products (assuming DB is ready if we can fetch)
adminContent.style.display = 'block';
configMessage.style.display = 'none';
loadAdminProducts();

const productForm = document.getElementById('productForm');
const saveBtn = document.getElementById('saveBtn');
const saveText = document.getElementById('saveText');
const adminProductList = document.getElementById('adminProductList');

// Form Submit Handler
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('pName').value;
    const category = document.getElementById('pCategory').value;
    const price = document.getElementById('pPrice').value;
    const desc = document.getElementById('pDesc').value;
    const badge = document.getElementById('pBadge').value;
    const imageFile = document.getElementById('pImage').files[0];

    if (!imageFile) {
        alert("Por favor selecciona una imagen.");
        return;
    }

    try {
        setLoading(true);

        // Convert image to base64 for submittal
        const base64 = await toBase64(imageFile);

        const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                category,
                price,
                description: desc,
                badge,
                imageBase64: base64,
                imageName: imageFile.name
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Error al subir");
        }

        alert("¡Producto guardado con éxito!");
        productForm.reset();
        loadAdminProducts();

    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Hubo un error: " + error.message);
    } finally {
        setLoading(false);
    }
});

// Load Products for Admin View
async function loadAdminProducts() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();

        adminProductList.innerHTML = '';

        if (!products || products.length === 0) {
            adminProductList.innerHTML = '<p style="text-align:center; opacity:0.5;">No hay productos aún.</p>';
            return;
        }

        products.forEach((p) => {
            const item = document.createElement('div');
            item.className = 'product-list-item';
            item.innerHTML = `
                <img src="${p.image}" alt="${p.name}">
                <div class="info">
                    <h4>${p.name}</h4>
                    <span>${p.category} | ${p.price}</span>
                </div>
                <button class="delete-btn" onclick="deleteProduct('${p.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            adminProductList.appendChild(item);
        });
    } catch (error) {
        console.error("Error al cargar productos:", error);
    }
}

// Delete Product
window.deleteProduct = async (id) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) return;

    try {
        const response = await fetch(`/api/products?id=${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error("No se pudo eliminar");

        alert("Producto eliminado.");
        loadAdminProducts();
    } catch (error) {
        alert("Error al eliminar: " + error.message);
    }
};

function setLoading(isLoading) {
    saveBtn.disabled = isLoading;
    if (isLoading) {
        saveText.innerHTML = '<span class="loader"></span>Guardando...';
    } else {
        saveText.innerHTML = 'Guardar Producto';
    }
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
