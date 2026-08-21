const API_BASE = '/api';

const DEMO_VENDOR_ID = 1; 
let currentVendor = null;

// DOM Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const statusPanel = document.getElementById('status-panel');
const currentStatusText = document.getElementById('current-status-text');
const toggleStatusBtn = document.getElementById('toggle-status-btn');
const vendorNameLabel = document.getElementById('vendor-name');
const stockList = document.getElementById('stock-list');

// Profile Form Elements
const profileForm = document.getElementById('profile-form');
const updateGpsBtn = document.getElementById('update-gps-btn');
const gpsStatus = document.getElementById('gps-status');

// --- 1. Auth Flow ---
if (localStorage.getItem('vendaLink_vendorId')) {
  showDashboard();
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  localStorage.setItem('vendaLink_vendorId', DEMO_VENDOR_ID);
  showDashboard();
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('vendaLink_vendorId');
  authSection.classList.remove('hidden');
  dashboardSection.classList.add('hidden');
});

function showDashboard() {
  authSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');
  loadDashboardData();
}

// --- 2. Load Dashboard Data ---
async function loadDashboardData() {
  const vendorId = localStorage.getItem('vendaLink_vendorId');
  
  try {
    const vRes = await fetch(`${API_BASE}/vendors`);
    const vendors = await vRes.json();
    currentVendor = vendors.find(v => v.VendorID == vendorId);
    
    if (currentVendor) {
      vendorNameLabel.textContent = currentVendor.BusinessName;
      updateStatusUI(currentVendor.IsOpen);
      
      // Populate Profile Form
      document.getElementById('prof-business').value = currentVendor.BusinessName || '';
      document.getElementById('prof-owner').value = currentVendor.OwnerName || '';
      document.getElementById('prof-phone').value = currentVendor.PhoneNumber || '';
      document.getElementById('prof-payments').value = currentVendor.PaymentTypes || '';
      document.getElementById('prof-location').value = currentVendor.LocationDescription || '';
      gpsStatus.textContent = `Current GPS: ${currentVendor.Latitude}, ${currentVendor.Longitude}`;
    }

    const pRes = await fetch(`${API_BASE}/vendors/${vendorId}/products`);
    const products = await pRes.json();
    
    stockList.innerHTML = products.length
      ? products.map(p => `
          <div class="item-row ${p.IsAvailable ? '' : 'unavailable'}" style="padding: 8px 0;">
            <span style="font-size: 14px;">${p.ProductName}</span>
            <span class="price">R${Number(p.Price).toFixed(2)}</span>
          </div>
        `).join('')
      : '<p class="no-results">No items listed.</p>';
      
  } catch (err) {
    console.error("Error loading dashboard:", err);
    alert("Could not load your stall data.");
  }
}

// --- 3. Profile Update Logic ---

// Get new GPS Coordinates
updateGpsBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }
  
  gpsStatus.textContent = "Fetching location...";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentVendor.Latitude = position.coords.latitude;
      currentVendor.Longitude = position.coords.longitude;
      gpsStatus.textContent = `New GPS ready to save: ${currentVendor.Latitude.toFixed(5)}, ${currentVendor.Longitude.toFixed(5)}`;
      gpsStatus.style.color = "var(--teal-600)";
    },
    (err) => {
      gpsStatus.textContent = "Failed to get location. Ensure permissions are granted.";
      gpsStatus.style.color = "var(--coral-600)";
    }
  );
});

// Submit Profile Form
profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const vendorId = localStorage.getItem('vendaLink_vendorId');
  const submitBtn = document.getElementById('save-profile-btn');
  
  const updatedData = {
    businessName: document.getElementById('prof-business').value,
    ownerName: document.getElementById('prof-owner').value,
    phoneNumber: document.getElementById('prof-phone').value,
    paymentTypes: document.getElementById('prof-payments').value,
    locationDescription: document.getElementById('prof-location').value,
    latitude: currentVendor.Latitude,
    longitude: currentVendor.Longitude
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    const res = await fetch(`${API_BASE}/vendors/${vendorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });

    if (!res.ok) throw new Error('Failed to update database');

    submitBtn.textContent = 'Saved Successfully!';
    submitBtn.style.background = 'var(--teal-400)';
    vendorNameLabel.textContent = updatedData.businessName; // Update header immediately
    
    setTimeout(() => {
      submitBtn.textContent = 'Save Profile Info';
      submitBtn.style.background = 'var(--teal-600)';
      submitBtn.disabled = false;
    }, 2500);

  } catch (error) {
    alert('Error saving data to the database.');
    submitBtn.textContent = 'Save Profile Info';
    submitBtn.disabled = false;
  }
});


// --- 4. Status Toggle Logic ---
toggleStatusBtn.addEventListener('click', async () => {
  if (!currentVendor) return;
  
  const vendorId = localStorage.getItem('vendaLink_vendorId');
  const newStatus = !currentVendor.IsOpen;
  
  toggleStatusBtn.disabled = true;
  toggleStatusBtn.textContent = 'Updating...';

  try {
    const res = await fetch(`${API_BASE}/vendors/${vendorId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOpen: newStatus })
    });
    
    if (!res.ok) throw new Error('Status update failed');
    
    currentVendor.IsOpen = newStatus;
    updateStatusUI(newStatus);
    
  } catch (err) {
    alert('Failed to update status. Check your connection.');
    updateStatusUI(currentVendor.IsOpen);
  } finally {
    toggleStatusBtn.disabled = false;
  }
});

function updateStatusUI(isOpen) {
  if (isOpen) {
    statusPanel.classList.remove('is-closed');
    statusPanel.classList.add('is-open');
    currentStatusText.innerHTML = '<span style="color: var(--teal-600)">🟢 YOU ARE OPEN</span>';
    toggleStatusBtn.textContent = 'Close Stall for the Day';
  } else {
    statusPanel.classList.remove('is-open');
    statusPanel.classList.add('is-closed');
    currentStatusText.innerHTML = '<span style="color: var(--coral-600)">🔴 YOU ARE CLOSED</span>';
    toggleStatusBtn.textContent = 'Open Stall';
  }
}