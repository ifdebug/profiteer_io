/**
 * Data table component — sortable columns, row click handler, responsive.
 */

export function createTable({ columns, data, onRowClick, id = '' }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'table-responsive';

  let sortCol = null;
  let sortDir = 'asc';

  function render(rows) {
    const table = document.createElement('table');
    table.className = 'data-table';
    if (id) table.id = id;

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    columns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col.label;
      if (col.sortable !== false) {
        const arrow = sortCol === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
        th.innerHTML = `${col.label}<span class="sort-indicator">${arrow}</span>`;
        if (sortCol === col.key) th.classList.add('sorted');
        th.addEventListener('click', () => {
          if (sortCol === col.key) {
            sortDir = sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            sortCol = col.key;
            sortDir = 'asc';
          }
          const sorted = [...rows].sort((a, b) => {
            const va = a[col.key], vb = b[col.key];
            if (va == null) return 1;
            if (vb == null) return -1;
            const cmp = va < vb ? -1 : va > vb ? 1 : 0;
            return sortDir === 'asc' ? cmp : -cmp;
          });
          render(sorted);
        });
      }
      if (col.align === 'right') th.style.textAlign = 'right';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    rows.forEach(row => {
      const tr = document.createElement('tr');
      if (onRowClick) {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => onRowClick(row));
      }
      columns.forEach(col => {
        const td = document.createElement('td');
        if (col.render) {
          td.innerHTML = col.render(row[col.key], row);
        } else {
          td.textContent = row[col.key] ?? '';
        }
        if (col.align === 'right') td.style.textAlign = 'right';
        if (col.mono) td.classList.add('financial');
        td.appendChild(td.firstChild || document.createTextNode(''));
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    wrapper.innerHTML = '';
    wrapper.appendChild(table);
  }

  render(data);
  return wrapper;
}
