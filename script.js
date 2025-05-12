const dbName = "AdvancedDB";
const storeName = "records";
const pageSize = 10;
let db;
let allRecords = [];
let currentPage = 1;
let sortBy = 'id';
let sortDir = 'asc';

const openDB = () => {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName, 1);
        req.onerror = () => reject("Failed to open DB");
        req.onsuccess = () => {
            db = req.result;
            resolve();
        };
        req.onupgradeneeded = e => {
            db = e.target.result;
            const store = db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
            for (let i = 1; i <= 1000; i++) {
                store.add({ name: `Record ${i}` });
            }
        };
    });
};

const fetchAllRecords = () => {
    return new Promise(resolve => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.openCursor();
        const results = [];
        req.onsuccess = e => {
            const cursor = e.target.result;
            if (cursor) {
                results.push(cursor.value);
                cursor.continue();
            } else {
                resolve(results);
            }
        };
    });
};

const addRecord = () => {
    const name = document.getElementById("nameInput").value.trim();
    if (!name) return;
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).add({ name });
    tx.oncomplete = async () => {
        document.getElementById("nameInput").value = "";
        allRecords = await fetchAllRecords();
        renderTable();
    };
};

const deleteRecord = id => {
const tx = db.transaction(storeName, "readwrite");
tx.objectStore(storeName).delete(id);
tx.oncomplete = async () => {
    allRecords = await fetchAllRecords();
    renderTable();
};
};

const editRecord = (id, newName) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.get(id).onsuccess = e => {
        const record = e.target.result;
        record.name = newName;
        store.put(record);
    };
};

const changeSort = (key) => {

    if (sortBy === key) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
        sortBy = key;
        sortDir = 'asc';
    }

    renderTable();
};

const renderTable = () => {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase();
    let filtered = allRecords.filter(r => r.name.toLowerCase().includes(searchTerm));

    filtered.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        return sortDir === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    const totalPages = Math.ceil(filtered.length / pageSize);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    const start = (currentPage - 1) * pageSize;
    const pageRecords = filtered.slice(start, start + pageSize);

    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";
    pageRecords.forEach(record => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${record.id}</td>
            <td><input value="${record.name}" onchange="editRecord(${record.id}, this.value)"></td>
            <td><button onclick="deleteRecord(${record.id})">Delete</button></td>
        `;

        tbody.appendChild(row);
    });

    // Update headers for sort indicator
    document.querySelectorAll("th").forEach(th => {
        th.classList.remove("sort-asc", "sort-desc");
        if (th.textContent.toLowerCase().includes(sortBy)) {
        th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });

    renderPagination(filtered.length, totalPages);
};

const renderPagination = (totalItems, totalPages) => {
    const container = document.getElementById("paginationControls");
    container.innerHTML = "";

    if (totalPages <= 1) return;

    const createButton = (text, isActive, onClick) => {
        const btn = document.createElement("button");
        btn.textContent = text;
        if (isActive) btn.className = "active";
        btn.onclick = onClick;
        return btn;
    };

    if (currentPage > 1) {
        container.appendChild(createButton("← Prev", false, () => { currentPage--; renderTable(); }));
    }

    if (currentPage > 3) {
        container.appendChild(createButton("1", false, () => { currentPage = 1; renderTable(); }));
        if (currentPage > 4) {
            const dots = document.createElement("span");
            dots.textContent = "...";
            container.appendChild(dots);
        }
    }

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        container.appendChild(createButton(i, i === currentPage, () => { currentPage = i; renderTable(); }));
    }

    if (currentPage < totalPages - 2) {
        if (currentPage < totalPages - 3) {
            const dots = document.createElement("span");
            dots.textContent = "...";
            container.appendChild(dots);
        }
        container.appendChild(createButton(totalPages, false, () => { currentPage = totalPages; renderTable(); }));
    }

    if (currentPage < totalPages) {
        container.appendChild(createButton("Next →", false, () => { currentPage++; renderTable(); }));
    }
};

window.onload = async () => {
    await openDB();
    allRecords = await fetchAllRecords();
    renderTable();
};