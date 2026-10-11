async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Request failed');
  }

  return response.json();
}

const inventoryTableBody = document.getElementById('inventoryTableBody');
const usageTableBody = document.getElementById('usageTableBody');
const usageItemSelect = document.getElementById('usageItem');

async function loadSummary() {
  const data = await fetchJSON('/api/summary');
  document.getElementById('totalItems').textContent = data.total_items;
  document.getElementById('lowStockItems').textContent = data.low_stock_items;
  document.getElementById('stockValue').textContent = `$${Number(data.total_stock_value || 0).toFixed(2)}`;
  document.getElementById('mostUsedItem').textContent = data.most_used_item || 'N/A';
}

function renderInventory(items) {
  inventoryTableBody.innerHTML = '';

  items.forEach((item) => {
    const row = document.createElement('tr');
    const lowStockClass = Number(item.stock) <= Number(item.reorder_level) ? 'low-stock' : '';

    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td class="${lowStockClass}">${Number(item.stock).toFixed(2)} ${item.unit}</td>
      <td>${Number(item.reorder_level).toFixed(2)} ${item.unit}</td>
      <td>$${Number(item.cost_per_unit).toFixed(2)}</td>
      <td>${item.supplier}</td>
      <td>
        <button class="delete-btn" data-id="${item.id}">Delete</button>
      </td>
    `;

    inventoryTableBody.appendChild(row);
  });

  usageItemSelect.innerHTML = items
    .map((item) => `<option value="${item.id}">${item.name}</option>`)
    .join('');
}

async function loadInventory() {
  const items = await fetchJSON('/api/items');
  renderInventory(items);
}

async function loadUsageHistory() {
  const usage = await fetchJSON('/api/usage');
  usageTableBody.innerHTML = '';

  usage.forEach((record) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${record.item_name}</td>
      <td>${record.usage_type}</td>
      <td>${Number(record.quantity).toFixed(2)}</td>
      <td>${record.note || '-'}</td>
      <td>${record.created_at}</td>
    `;
    usageTableBody.appendChild(row);
  });
}

async function reloadData() {
  await Promise.all([loadInventory(), loadUsageHistory(), loadSummary()]);
}

document.getElementById('inventoryForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    name: document.getElementById('name').value,
    category: document.getElementById('category').value,
    unit: document.getElementById('unit').value,
    supplier: document.getElementById('supplier').value,
    stock: Number(document.getElementById('stock').value),
    reorder_level: Number(document.getElementById('reorder_level').value),
    cost_per_unit: Number(document.getElementById('cost_per_unit').value),
  };

  await fetchJSON('/api/items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  event.target.reset();
  await reloadData();
});

document.getElementById('usageForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    item_id: Number(document.getElementById('usageItem').value),
    quantity: Number(document.getElementById('usageQuantity').value),
    usage_type: document.getElementById('usageType').value,
    note: document.getElementById('usageNote').value,
  };

  await fetchJSON('/api/usage', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  event.target.reset();
  await reloadData();
});

inventoryTableBody.addEventListener('click', async (event) => {
  const target = event.target;
  if (!target.classList.contains('delete-btn')) return;

  const id = Number(target.dataset.id);
  await fetchJSON(`/api/items/${id}`, {
    method: 'DELETE',
  });

  await reloadData();
});

document.getElementById('refreshBtn').addEventListener('click', reloadData);

reloadData();
