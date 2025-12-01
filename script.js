const API_URL = "http://localhost:5000/admin";
let users = [];

// ---------------- RENDER TABLE ----------------
function renderTable(data) {
  const tableBody = document.getElementById("userTableBody");
  tableBody.innerHTML = "";

  data.forEach(user => {
    tableBody.innerHTML += `
      <tr>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.phone}</td>
        <td>${user.role}</td>
        <td>
          <button class="edit-btn" onclick="openEditModal(${user.id})">Edit</button>
        </td>
      </tr>
    `;
  });
}

// ---------------- FETCH USERS ----------------
async function fetchAllUsers() {
  try {
    const res = await fetch(`${API_URL}/all`);
    const data = await res.json();
    if (data.success) {
      users = data.users;
      renderTable(users);
    }
  } catch (err) {
    console.error("Error fetching users:", err);
  }
}

// ---------------- FILTER ----------------
document.getElementById("roleFilter").addEventListener("change", e => {
  const role = e.target.value;
  if (!role) return renderTable(users);
  const filtered = users.filter(u => u.role === role);
  renderTable(filtered);
});

// ---------------- SEARCH ----------------
document.getElementById("searchInput").addEventListener("input", e => {
  const val = e.target.value.toLowerCase();
  const filtered = users.filter(u => u.name.toLowerCase().includes(val));
  renderTable(filtered);
});

// ---------------- EDIT MODAL ----------------
const modal = document.getElementById("editModal");
const closeModal = document.querySelector(".close");
closeModal.onclick = () => modal.style.display = "none";
window.onclick = e => { if (e.target === modal) modal.style.display = "none"; }

function openEditModal(id) {
  const user = users.find(u => u.id === id);
  document.getElementById("editUserId").value = user.id;
  document.getElementById("editName").value = user.name;
  document.getElementById("editEmail").value = user.email;
  document.getElementById("editPhone").value = user.phone;
  document.getElementById("editRole").value = user.role;
  modal.style.display = "block";
}

// ---------------- SUBMIT EDIT FORM ----------------
document.getElementById("editForm").addEventListener("submit", async e => {
  e.preventDefault();
  const id = parseInt(document.getElementById("editUserId").value);
  const name = document.getElementById("editName").value;
  const email = document.getElementById("editEmail").value;
  const phone = document.getElementById("editPhone").value;
  const role = document.getElementById("editRole").value;

  try {
    const res = await fetch(`${API_URL}/update/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, role })
    });
    const data = await res.json();
    if (data.success) {
      modal.style.display = "none";
      fetchAllUsers();
    } else {
      alert(data.message || "Failed to update");
    }
  } catch (err) {
    console.error("Error updating user:", err);
  }
});

// ---------------- INITIAL LOAD ----------------
fetchAllUsers();


 
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
