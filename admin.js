// Check Admin Auth
function checkAdmin() {
    const token = localStorage.getItem("token");

    const redirectToLogin = () => {
        const currentPage = window.location.href;
        window.location.href = `login.html?returnUrl=${encodeURIComponent(currentPage)}`
    }

    if (!token) {
        if (confirm("Unauthorized! Click OK to login.")) {
            redirectToLogin();
        }
        return false;
    }

    try {
        // Ensure jwt_decode is loaded
        if (typeof jwt_decode === "undefined") {
            console.error("JWT Decode library not loaded");
            return false;
        }
        
        const decoded = jwt_decode(token);
        // Note: Check if your token uses "role" or "Role" (case sensitive)
        if (decoded.role !== "admin" && decoded.role !== "Admin") { 
            if (confirm("Access denied! Admins only.")) {
                window.location.href = "login.html";
            }
            return false;
        }
        return true;
    } catch (err) {
        console.error(err);
        localStorage.removeItem("token");
        if (confirm("Invalid token! Please login again.")) {
            window.location.href = "login.html";
        }
        return false;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (checkAdmin()) {
        fetchTickets();
    }
    
    // Refresh Button Logic
    document.getElementById("refreshBtn").addEventListener("click", fetchTickets);
});

let allTickets = [];

// ---------------------------------------------------------
// 🔴 MAPPING FIX: Syncing Frontend Strings with Backend Types
// ---------------------------------------------------------
function getIssueType(issueText) {
    if (!issueText) return "unknown";
    const text = issueText.trim().toLowerCase();

    const map = {
        "instagram recovery": "instagram",
        "facebook recovery": "facebook",
        "twitter recovery": "twitter",
        "youtube recovery": "youtube", // Maps to YouTubeRecovery (old)
        "youtube recovery request": "youtuberequest", // Maps to YouTubeRecoveryRequest (new)
        "whatsapp recovery": "whatsapp",
        "whatsapp marketing": "whatsappmarketing", // New Added
        "snapchat recovery": "snapchat",
        "tiktok recovery": "tiktok", // New Added
        "instagram collaboration": "collaboration", // New Added
        "account verification": "verification",
        "copy right removal": "removal",
        "digital marketing": "digitalmarketing", // Maps to WhatsAppRequest
        "username claim": "usernameclaim",
        "submit form as vendor": "vendor",
        "submit form as vender": "vendor", // Typo handler
        "trustpilot requests": "trustpilot",
        "tripadvisor removal": "tripadvisor",
        "google review requests": "googlereview"
    };

    return map[text] || "unknown";
}

async function fetchTickets() {
    try {
        const res = await fetch("http://localhost:5000/api/tickets", {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        
        if (!res.ok) throw new Error("Failed to fetch");
        
        allTickets = await res.json();
        renderTickets(allTickets);
    } catch (error) {
        console.error("Error fetching tickets:", error);
    }
}

function renderTickets(tickets) {
    const tableBody = document.getElementById("ticket-table-body");
    if (!tableBody) return;

    if (tickets.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='8' style='text-align:center;'>No tickets found</td></tr>";
        return;
    }

    tableBody.innerHTML = tickets.map(ticket => {
        // Determine status color class
        let statusClass = "status-unseen"; // default style (add to CSS if needed)
        if(ticket.status === "Resolved") statusClass = "status-resolved"; // Green in CSS?
        if(ticket.status === "Pending") statusClass = "status-pending";   // Orange in CSS?

        return `
        <tr id="ticket-${ticket.id}">
            <td>${ticket.id}</td>
            <td>${ticket.user?.name || "N/A"}</td>
            <td>${ticket.user?.email || "N/A"}</td>
            <td>${ticket.user?.phone || "N/A"}</td>
            <td>${ticket.issue}</td>
            <td>${ticket.maxBudgetUSD || ticket.budget || ticket.maxBudget || "N/A"}</td>
            <td><span class="status-label ${statusClass}">${ticket.status || "Unseen"}</span></td>
            <td>
                <button class="view-btn" onclick="viewDetails('${getIssueType(ticket.issue)}', ${ticket.id})">View</button>
                <button class="delete-btn" onclick="deleteTicket('${getIssueType(ticket.issue)}', ${ticket.id})">Delete</button>
                <button class="assign-btn" onclick="openAssignModal('${getIssueType(ticket.issue)}', ${ticket.id})">Assign</button>
            </td>
        </tr>
    `}).join("");
}

// ... (View Details function remains same as your code) ...
async function viewDetails(issueType, id) {
    if(issueType === 'unknown') { alert("Unknown Ticket Type"); return; }
    
    try {
        const response = await fetch(`http://localhost:5000/api/tickets/${issueType}/${id}`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        const data = await response.json();

        // Update status in table real-time if it changed to Pending
        const statusLabel = document.querySelector(`#ticket-${id} .status-label`);
        if (statusLabel && data.status) statusLabel.innerText = data.status;

        const detailsHTML = Object.entries(data).map(([key, value]) => {
            if (!value || key === 'user') return ""; // Skip empty or nested user obj
            const stringValue = String(value);
            const isUrl = stringValue.startsWith("http");

            return `
            <div class="detail-row">
                <span class="detail-label">${formatLabel(key)}:</span>
                <span class="detail-value">
                    ${isUrl 
                      ? `<a href="${value}" target="_blank" class="file-link">Open Link ↗</a>` 
                      : value}
                </span>
            </div>`;
        }).join("");

        document.getElementById("ticket-details").innerHTML = `
            ${detailsHTML}
            <div class="modal-actions">
                ${data.status !== 'Resolved' ? 
                `<button class="resolve-btn" onclick="markResolved('${issueType}', ${id})">Mark as Resolved</button>` 
                : '<p style="color:green; font-weight:bold;">Ticket Resolved</p>'}
            </div>
        `;

        document.getElementById("detailsModal").style.display = "block";
    } catch (error) {
        console.error("Error loading details:", error);
    }
}

function formatLabel(key) {
    return key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").replace(/\b\w/g, l => l.toUpperCase());
}

async function markResolved(issueType, id) {
    try {
        const res = await fetch(`http://localhost:5000/api/tickets/${issueType}/${id}/resolve`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });

        const data = await res.json();
        if (data.success) {
            const label = document.querySelector(`#ticket-${id} .status-label`);
            if(label) label.innerText = "Resolved";
            document.getElementById("detailsModal").style.display = "none";
            // Refresh local data to match
            const t = allTickets.find(x => x.id === id && getIssueType(x.issue) === issueType);
            if(t) t.status = "Resolved";
        }
    } catch (err) {
        console.error(err);
    }
}

async function deleteTicket(issueType, id) {
    if(issueType === 'unknown') { alert("Cannot delete unknown ticket type"); return; }
    if (!confirm("Are you sure you want to delete this ticket?")) return;

    try {
        const res = await fetch(`http://localhost:5000/api/tickets/${issueType}/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });

        const data = await res.json();
        if (data.success) {
            document.getElementById(`ticket-${id}`).remove();
            allTickets = allTickets.filter(t => t.id !== id);
        } else {
            alert("Error deleting: " + (data.error || "Unknown error"));
        }
    } catch (err) {
        console.error(err);
    }
}

// ---------------------------------------------------------
// ASSIGNMENT MODAL LOGIC
// ---------------------------------------------------------
async function openAssignModal(issueType, id) {
    if(issueType === 'unknown') { alert("Cannot assign unknown ticket type"); return; }
    
    window.assignType = issueType;
    window.assignId = id;

    try {
        const res = await fetch("http://localhost:5000/api/admins", {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        const admins = await res.json();

        const adminSelect = document.getElementById("adminSelect");
        if(admins.length > 0) {
            adminSelect.innerHTML = admins.map(a => 
                `<option value="${a.id}">${a.name} (${a.email})</option>`
            ).join("");
        } else {
            adminSelect.innerHTML = "<option>No admins found</option>";
        }

        document.getElementById("assignModal").style.display = "block";
    } catch(e) {
        console.error("Error fetching admins", e);
    }
}

document.getElementById("assignBtn").addEventListener("click", async () => {
    const adminId = document.getElementById("adminSelect").value;
    
    try {
        const res = await fetch(`http://localhost:5000/api/tickets/${window.assignType}/${window.assignId}/assign`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`,
                "Content-type": "application/json"
            },
            body: JSON.stringify({ adminId }) // Backend expects { adminId }
        });
        
        const data = await res.json();
        
        if(res.ok) {
            alert("Ticket Assigned Successfully!");
            document.getElementById("assignModal").style.display = "none";
            // Update UI to show Pending
            const label = document.querySelector(`#ticket-${window.assignId} .status-label`);
            if(label) label.innerText = "Pending";
        } else {
            alert("Failed: " + data.error);
        }
    } catch(e) {
        console.error(e);
        alert("Server error during assignment");
    }
});

// Close Modal Logic (Was missing in your snippet for Assign Modal)
document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("detailsModal").style.display = "none";
});

const closeAssign = document.getElementById("closeAssignModal");
if(closeAssign) {
    closeAssign.addEventListener("click", () => {
        document.getElementById("assignModal").style.display = "none";
    });
}

// Close modals if clicking outside content
window.onclick = function(event) {
    if (event.target == document.getElementById("detailsModal")) {
        document.getElementById("detailsModal").style.display = "none";
    }
    if (event.target == document.getElementById("assignModal")) {
        document.getElementById("assignModal").style.display = "none";
    }
}

// Filter Logic
function applyFilters() {
    const filterValue = document.getElementById("statusFilter").value;
    const searchValue = document.getElementById("searchBar").value.toLowerCase();

    let filtered = [...allTickets];

    if (filterValue !== "all") {
        filtered = filtered.filter(t => (t.status || "Unseen") === filterValue);
    }

    filtered = filtered.filter(t => {
        const text = `${t.user?.name} ${t.user?.email} ${t.user?.phone} ${t.issue} ${t.id}`.toLowerCase();
        return text.includes(searchValue);
    });

    renderTickets(filtered);
}

// Security features (Keep existing)
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener("keydown", e => {
    if (e.ctrlKey && ["c", "v", "x", "u", "s"].includes(e.key.toLowerCase())) e.preventDefault();
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") e.preventDefault();
    if (e.key === "F12") e.preventDefault();
});