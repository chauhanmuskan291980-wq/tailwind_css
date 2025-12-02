const trashTableBody = document.getElementById("trash-table-body");
const searchBar = document.getElementById("searchBar");


async function fetchTrashData() {
  try {
    const response = await fetch("https://account-recovery-app.onrender.com//api/trash");
    const data = await response.json();

    trashTableBody.innerHTML = ""; // clear table

    data.forEach((record) => {
      const row = document.createElement("tr");
      row.id = `row-${record.id}`;  // 🟢 FIX: row id added in correct place

      row.innerHTML = `
        <td>${record.id}</td>
        <td>${record.name}</td>
        <td>${record.email}</td>
        <td>${record.phone || "-"}</td>
        <td>${record.createdAt || "-"}</td>
        <td>${new Date(record.deletedAt).toLocaleString()}</td>
        <td>
          <button onclick="restoreRecord(${record.id})">Restore</button>
        </td>
      `;

      trashTableBody.appendChild(row);
    });

  } catch (err) {
    console.error("Error fetching trash data:", err);
  }
}

// Restore a soft-deleted record
async function restoreRecord(id) {
  try {
    const res = await fetch(`https://account-recovery-app.onrender.com//api/restore/${id}`, { method: "PATCH" });
    const data = await res.json();
    document.querySelector(`#row-${id}`)?.remove(); // remove row
    alert(data.message);

    // 🔥 Remove row instantly
    document.querySelector(`#row-${id}`)?.remove();

    fetchTrashData();
  } catch (err) {
    console.error("Error restoring record:", err);
  }
}


 




// Search / filter function
function applyFilters() {
  const filter = searchBar.value.toLowerCase();
  const rows = trashTableBody.getElementsByTagName("tr");

  Array.from(rows).forEach((row) => {
    const cells = row.getElementsByTagName("td");
    let match = false;
    Array.from(cells).forEach((cell) => {
      if (cell.textContent.toLowerCase().includes(filter)) match = true;
    });
    row.style.display = match ? "" : "none";
  });
}

// Initial fetch
fetchTrashData();

// Refresh button
document.getElementById("refreshBtn").addEventListener("click", fetchTrashData);

 
   document.addEventListener("keydown", function(e) {

    // Block Ctrl+C, V, X
    if (e.ctrlKey && ["c", "v", "x"].includes(e.key.toLowerCase())) {
        alert("Copy, paste and cut are disabled!");
        e.preventDefault();
    }

    // Block Ctrl+U (view source)
    if (e.ctrlKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
    }

    // Block Ctrl+S (save)
    if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
    }

    // Block DevTools (Ctrl+Shift+I)
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
    }

    // Block F12
    if (e.key === "F12") {
        e.preventDefault();
    }
});

