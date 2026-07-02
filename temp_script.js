
// ════ LOCALSTORAGE AUTH SYNC OVERRIDE ════
const originalLocalStorageSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  originalLocalStorageSetItem.apply(this, arguments);
  
  const dataKeys = ['inv_custom_tpls', 'inv_profile', 'inv_products', 'inv_product_groups', 'inv_clients'];
  if (dataKeys.includes(key)) {
    const activeUser = localStorage.getItem('inv_active_user') || 'guest';
    let users = JSON.parse(localStorage.getItem('inv_users') || '{}');
    if (!users[activeUser]) {
      users[activeUser] = { username: activeUser, data: {} };
    }
    if (!users[activeUser].data) users[activeUser].data = {};
    users[activeUser].data[key] = value;
    originalLocalStorageSetItem.call(localStorage, 'inv_users', JSON.stringify(users));
  }
};

function loadUserData(username) {
  let users = JSON.parse(localStorage.getItem('inv_users') || '{}');
  const user = users[username];
  
  originalLocalStorageSetItem.call(localStorage, 'inv_active_user', username);
  
  const dataKeys = ['inv_custom_tpls', 'inv_profile', 'inv_products', 'inv_product_groups', 'inv_clients'];
  dataKeys.forEach(key => {
    let val = '[]';
    if (key === 'inv_profile') val = '{}';
    
    if (user && user.data && user.data[key] !== undefined) {
      val = user.data[key];
    }
    
    originalLocalStorageSetItem.call(localStorage, key, val);
  });
}

function refreshAppDataAndUI() {
  loadClientsList();
  loadProductsAndGroups();
  loadProfile();
  items = [];
  renderItemsForm();
  renderColumnManager();
  renderTemplateCards();
  renderDashboardTemplates();
  const invDateEl = document.getElementById('invDate');
  if (invDateEl) invDateEl.value = getTodayDateString();
  updatePreview();
  updateDesignSettings();
}

function saveAuthSettings() {
  const usernameInput = document.getElementById('settingUsername');
  const passwordInput = document.getElementById('settingPassword');
  const phoneInput = document.getElementById('settingPhone');
  
  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  const phone = phoneInput.value.trim();
  
  if (!username || !password || !phone) {
    alert("Please fill in Username, Password, and Phone Number.");
    return;
  }
  
  let users = JSON.parse(localStorage.getItem('inv_users') || '{}');
  const activeUser = localStorage.getItem('inv_active_user') || 'guest';
  if (users[username] && activeUser !== username) {
    alert("This username already exists. Please choose a different username.");
    return;
  }
  
  users[username] = {
    username: username,
    password: password,
    phone: phone,
    data: {
      inv_custom_tpls: localStorage.getItem('inv_custom_tpls') || '[]',
      inv_profile: localStorage.getItem('inv_profile') || '{}',
      inv_products: localStorage.getItem('inv_products') || '[]',
      inv_product_groups: localStorage.getItem('inv_product_groups') || '[]',
      inv_clients: localStorage.getItem('inv_clients') || '[]'
    }
  };
  
  originalLocalStorageSetItem.call(localStorage, 'inv_users', JSON.stringify(users));
  originalLocalStorageSetItem.call(localStorage, 'inv_active_user', username);
  sessionStorage.setItem('inv_logged_in', 'true');
  
  toast("✅ Credentials saved! Current data bound to your account.");
  updateAuthUI();
}

function updateAuthUI() {
  const activeUser = localStorage.getItem('inv_active_user') || 'guest';
  const statusText = document.getElementById('authStatusText');
  const logoutBtn = document.getElementById('btnLogout');
  
  const usernameInput = document.getElementById('settingUsername');
  const passwordInput = document.getElementById('settingPassword');
  const phoneInput = document.getElementById('settingPhone');
  
  let users = JSON.parse(localStorage.getItem('inv_users') || '{}');
  
  if (activeUser && activeUser !== 'guest' && users[activeUser]) {
    if (statusText) {
      statusText.textContent = `Status: Logged in as "${activeUser}"`;
      statusText.style.background = 'rgba(22, 163, 74, 0.1)';
      statusText.style.borderColor = 'rgba(22, 163, 74, 0.2)';
      statusText.style.color = '#16a34a';
    }
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    
    if (usernameInput) usernameInput.value = activeUser;
    if (passwordInput) passwordInput.value = users[activeUser].password || '';
    if (phoneInput) phoneInput.value = users[activeUser].phone || '';
  } else {
    if (statusText) {
      statusText.textContent = 'Status: Not logged in (Guest)';
      statusText.style.background = 'rgba(148, 163, 184, 0.1)';
      statusText.style.borderColor = 'rgba(148, 163, 184, 0.2)';
      statusText.style.color = 'var(--muted)';
    }
    if (logoutBtn) logoutBtn.style.display = 'none';
    
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (phoneInput) phoneInput.value = '';
  }

  // Update Topbar Auth UI dropdown container
  const authContainer = document.getElementById('topbarAuthContainer');
  if (authContainer) {
    if (activeUser && activeUser !== 'guest' && users[activeUser]) {
      const user = users[activeUser];
      authContainer.innerHTML = `
        <button class="btn btn-accent btn-sm" onclick="toggleAuthDropdown(event)">👤 ${activeUser}</button>
        <div class="dropdown-menu" id="authMenu" style="display:none; position:absolute; right:0; left:auto; width:220px; padding:12px; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); box-shadow:var(--shadow-xl); z-index:9999; margin-top:8px;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text); border-bottom:1px solid var(--border); padding-bottom:8px; margin-bottom:8px;">
            👤 Profile Details
          </div>
          <div style="display:flex; flex-direction:column; gap:6px; font-size:0.75rem; color:var(--muted); line-height:1.4;">
            <div><strong>Username:</strong> ${activeUser}</div>
            <div><strong>Phone:</strong> ${user.phone || 'N/A'}</div>
          </div>
          <div class="dropdown-divider" style="margin:8px 0; border-top:1px solid var(--border);"></div>
          <button class="dropdown-item" onclick="switchNavTab('settings')" style="padding:6px 8px; border-radius:4px; font-size:0.72rem; display:block; width:100%; text-align:left; background:none; border:none; color:var(--text); cursor:pointer;">⚙️ Settings Panel</button>
          <button class="dropdown-item" onclick="logoutActiveUser()" style="padding:6px 8px; border-radius:4px; font-size:0.72rem; display:block; width:100%; text-align:left; background:none; border:none; color:#ef4444; cursor:pointer;">🚪 Log Out</button>
        </div>
      `;
    } else {
      authContainer.innerHTML = `
        <button class="btn btn-blue btn-sm" onclick="showLoginOverlayDirect(event)">🔓 Login</button>
      `;
    }
  }
}

function toggleAuthDropdown(event) {
  if (event) event.stopPropagation();
  const authMenu = document.getElementById('authMenu');
  if (authMenu) {
    const isHidden = authMenu.style.display === 'none';
    
    // Close export dropdown
    const exportMenu = document.getElementById('exportMenu');
    if (exportMenu) exportMenu.style.display = 'none';
    
    authMenu.style.display = isHidden ? 'block' : 'none';
  }
}

function showLoginOverlayDirect(event) {
  if (event) event.stopPropagation();
  const modal = document.getElementById('loginOverlayModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function logoutActiveUser() {
  if (!confirm("Are you sure you want to log out? Your guest profile will load.")) return;
  
  originalLocalStorageSetItem.call(localStorage, 'inv_active_user', 'guest');
  sessionStorage.setItem('inv_logged_in', 'guest');
  
  loadUserData('guest');
  
  toast("🚪 Logged out! Loaded guest profile.");
  updateAuthUI();
  refreshAppDataAndUI();
}

function submitLogin() {
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  const errorMsg = document.getElementById('loginErrorMsg');
  
  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  
  let users = JSON.parse(localStorage.getItem('inv_users') || '{}');
  const user = users[username];
  
  if (user && user.password === password) {
    originalLocalStorageSetItem.call(localStorage, 'inv_active_user', username);
    sessionStorage.setItem('inv_logged_in', 'true');
    if (errorMsg) errorMsg.style.display = 'none';
    
    loadUserData(username);
    
    document.getElementById('loginOverlayModal').style.display = 'none';
    
    toast(`🔓 Welcome back, ${username}!`);
    refreshAppDataAndUI();
    
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
  } else {
    if (errorMsg) errorMsg.style.display = 'block';
  }
}

function skipLogin() {
  originalLocalStorageSetItem.call(localStorage, 'inv_active_user', 'guest');
  sessionStorage.setItem('inv_logged_in', 'guest');
  
  loadUserData('guest');
  
  document.getElementById('loginOverlayModal').style.display = 'none';
  
  toast("➡️ Continued as Guest.");
  refreshAppDataAndUI();
}

// ════ STATE ════
let items = [];
let signatureImg   = null;
let stampImg       = null;
let companyLogo    = null;
let customerSealImg= null;

// ════ BUILT-IN TEMPLATES ════
const BUILTIN_TEMPLATES = [{
  id:'tpl_solar_189000_v5',
  name:'Tax Invoice – ₹1,89,000',
  amount:189000,
  docType:'TAX INVOICE',
  showSubjectLine: false,
  showValidUntil: false,
  showSystemCapacity: true,
  showSupplierRef: true,
  showPayMode: true,
  showBuyerOrderNo: true,
  showOtherRef: true,
  showSubsidyBlock: true,
  invNo:'',
  invDate:'',
  invValid:'',
  supplierRef:'',
  payMode:'',
  buyerOrderNo:'',
  otherRef:'',
  buyerName:'BISHWAJIT MUKHARJI',
  buyerPhone:'',
  buyerGST:'',
  buyerAddr:'1 No Sunajuli Bhergaon\nDist -Udalguri Pin-784526\nState: Assam',
  termsDelivery:'1 No Sunajuli Bhergaon, Dist-Udalguri',
  discount:0,
  addCharges:0,
  chargesNote:'',
  invNotes:'',
  manualTaxes: {
    subtotal: 176697.70,
    grand: 189000.00,
    cgst5: 3475.00,
    sgst5: 3475.00,
    cgst9: 2676.15,
    sgst9: 2676.15
  },
  items:[
    {desc:'Solar Inverter On Grid',hsn:'85044090',gst:5,qty:1,rate:25000,amount:25000},
    {desc:'Solar Panel',hsn:'85414300',gst:5,qty:6,rate:19000,amount:114000},
    {desc:'ACDB/DCDB Single phase',hsn:'85369090',gst:18,qty:2,rate:2300,amount:4600},
    {desc:'Lighting Arrester Copper',hsn:'85369090',gst:18,qty:1,rate:1525,amount:1525},
    {desc:'MC4 Connector 1 In 1 OUT',hsn:'85369090',gst:18,qty:4,rate:215.85,amount:860},
    {desc:'Aluminium Rail, Mid clamp, end clamp',hsn:'73089090',gst:18,qty:1,rate:3813.6,amount:3813.60},
    {desc:'Ring Lugs',hsn:'85369090',gst:18,qty:3,rate:50.83,amount:1524.90},
    {desc:'Tie Cable',hsn:'39174000',gst:18,qty:2,rate:217.92,amount:435.84},
    {desc:'Solar DC Cable 4 sq mm',hsn:'85444999',gst:18,qty:1,rate:3920,amount:3920},
    {desc:'AC Cable 4sq mm FR',hsn:'85444999',gst:18,qty:1,rate:4160,amount:4160},
    {desc:'Energy Matter Single phase LCD',hsn:'90283010',gst:18,qty:1,rate:762.62,amount:762.62},
    {desc:'Earthing Electrode G.I',hsn:'85359090',gst:18,qty:3,rate:1473.5,amount:4420.50},
    {desc:'BFC 15 Kg Silica base',hsn:'38249090',gst:18,qty:3,rate:254.23,amount:762.69},
    {desc:'AC cable 2.5 sq mm FR',hsn:'85444999',gst:18,qty:1,rate:2950,amount:2950},
    {desc:'Solar Installation Charge & Carrying Charge',hsn:'',gst:0,qty:'',rate:'',amount:7962.55},
  ]
}, {
  id:'tpl_solar_198000_v5',
  name:'Tax Invoice – ₹1,98,000',
  amount:198000,
  docType:'TAX INVOICE',
  showSubjectLine: false,
  showValidUntil: false,
  showSystemCapacity: true,
  showSupplierRef: true,
  showPayMode: true,
  showBuyerOrderNo: true,
  showOtherRef: true,
  showSubsidyBlock: true,
  invNo:'',
  invDate:'',
  invValid:'',
  supplierRef:'',
  payMode:'',
  buyerOrderNo:'',
  otherRef:'',
  buyerName:'BISHWAJIT MUKHARJI',
  buyerPhone:'',
  buyerGST:'',
  buyerAddr:'1 No Sunajuli Bhergaon\nDist -Udalguri Pin-784526\nState: Assam',
  termsDelivery:'1 No Sunajuli Bhergaon, Dist-Udalguri',
  discount:0,
  addCharges:0,
  chargesNote:'',
  invNotes:'',
  manualTaxes: {
    subtotal: 185697.70,
    grand: 198000.00,
    cgst5: 3475.00,
    sgst5: 3475.00,
    cgst9: 2676.15,
    sgst9: 2676.15
  },
  items:[
    {desc:'Solar Inverter On Grid',hsn:'85044090',gst:5,qty:1,rate:25000,amount:25000},
    {desc:'Solar Panel',hsn:'85414300',gst:5,qty:6,rate:19000,amount:114000},
    {desc:'ACDB/DCDB Single phase',hsn:'85369090',gst:18,qty:2,rate:2300,amount:4600},
    {desc:'Lighting Arrester Copper',hsn:'85369090',gst:18,qty:1,rate:1525,amount:1525},
    {desc:'MC4 Connector 1 In 1 OUT',hsn:'85369090',gst:18,qty:4,rate:215.85,amount:860},
    {desc:'Aluminium Rail, Mid clamp, end clamp',hsn: '73089090',gst:18,qty:1,rate:3813.6,amount:3813.60},
    {desc:'Ring Lugs',hsn:'85369090',gst:18,qty:3,rate:50.83,amount:1524.90},
    {desc:'Tie Cable',hsn:'39174000',gst:18,qty:2,rate:217.92,amount:435.84},
    {desc:'Solar DC Cable 4 sq mm',hsn:'85444999',gst:18,qty:1,rate:3920,amount:3920},
    {desc:'AC Cable 4sq mm FR',hsn:'85444999',gst:18,qty:1,rate:4160,amount:4160},
    {desc:'Energy Matter Single phase LCD',hsn:'90283010',gst:18,qty:1,rate:762.62,amount:762.62},
    {desc:'Earthing Electrode G.I',hsn:'85359090',gst:18,qty:3,rate:1473.5,amount:4420.50},
    {desc:'BFC 15 Kg Silica base',hsn:'38249090',gst:18,qty:3,rate:254.23,amount:762.69},
    {desc:'AC cable 2.5 sq mm FR',hsn:'85444999',gst:18,qty:1,rate:2950,amount:2950},
    {desc:'Solar Installation Charge & Carrying Charge',hsn:'',gst:0,qty:'',rate:'',amount:16962.55},
  ]
}, {
  id:'tpl_solar_210000_v5',
  name:'Tax Invoice – ₹2,10,000',
  amount:210000,
  docType:'TAX INVOICE',
  showSubjectLine: false,
  showValidUntil: false,
  showSystemCapacity: true,
  showSupplierRef: true,
  showPayMode: true,
  showBuyerOrderNo: true,
  showOtherRef: true,
  showSubsidyBlock: true,
  invNo:'',
  invDate:'',
  invValid:'',
  supplierRef:'',
  payMode:'',
  buyerOrderNo:'',
  otherRef:'',
  buyerName:'BISHWAJIT MUKHARJI',
  buyerPhone:'',
  buyerGST:'',
  buyerAddr:'1 No Sunajuli Bhergaon\nDist -Udalguri Pin-784526\nState: Assam',
  termsDelivery:'1 No Sunajuli Bhergaon, Dist-Udalguri',
  discount:0,
  addCharges:0,
  chargesNote:'',
  invNotes:'',
  manualTaxes: {
    subtotal: 196932.24,
    grand: 210000.00,
    cgst5: 3760.00,
    sgst5: 3760.00,
    cgst9: 2773.88,
    sgst9: 2773.88
  },
  items:[
    {desc:'Solar Inverter On Grid',hsn:'85044090',gst:5,qty:1,rate:26200,amount:26200},
    {desc:'Solar Panel',hsn:'85414300',gst:5,qty:6,rate:20800,amount:124800},
    {desc:'ACDB/DCDB Single phase',hsn:'85369090',gst:18,qty:2,rate:2300,amount:4600},
    {desc:'Lighting Arrester Copper',hsn:'85369090',gst:18,qty:1,rate:1525,amount:1525},
    {desc:'MC4 Connector 1 In 1 OUT',hsn:'85369090',gst:18,qty:4,rate:215.85,amount:860},
    {desc:'Aluminium Rail, Mid clamp, end clamp',hsn:'73089090',gst:18,qty:1,rate:3813.6,amount:3813.60},
    {desc:'Ring Lugs',hsn:'85369090',gst:18,qty:3,rate:50.83,amount:1524.90},
    {desc:'Tie Cable',hsn:'39174000',gst:18,qty:2,rate:217.92,amount:435.84},
    {desc:'Solar DC Cable 4 sq mm',hsn:'85444999',gst:18,qty:1,rate:3920,amount:3920},
    {desc:'AC Cable 4sq mm FR',hsn:'85444999',gst:18,qty:1,rate:4160,amount:4160},
    {desc:'Energy Matter Single phase LCD',hsn:'90283010',gst:18,qty:1,rate:762.62,amount:762.62},
    {desc:'Earthing Electrode G.I',hsn:'85359090',gst:18,qty:3,rate:1473.5,amount:4420.50},
    {desc:'BFC 15 Kg Silica base',hsn:'38249090',gst:18,qty:3,rate:254.23,amount:762.69},
    {desc:'AC cable 2.5 sq mm FR',hsn:'85444999',gst:18,qty:1,rate:2950,amount:2950},
    {desc:'Solar Installation Charge & Carrying Charge',hsn:'',gst:0,qty:'',rate:'',amount:16197.09},
  ]
}, {
  id:'tpl_solar_220000_v5',
  name:'Tax Invoice – ₹2,20,000',
  amount:220000,
  docType:'TAX INVOICE',
  showSubjectLine: false,
  showValidUntil: false,
  showSystemCapacity: true,
  showSupplierRef: true,
  showPayMode: true,
  showBuyerOrderNo: true,
  showOtherRef: true,
  showSubsidyBlock: true,
  invNo:'',
  invDate:'',
  invValid:'',
  supplierRef:'',
  payMode:'',
  buyerOrderNo:'',
  otherRef:'',
  buyerName:'BISHWAJIT MUKHARJI',
  buyerPhone:'',
  buyerGST:'',
  buyerAddr:'1 No Sunajuli Bhergaon\nDist -Udalguri Pin-784526\nState: Assam',
  termsDelivery:'1 No Sunajuli Bhergaon, Dist-Udalguri',
  discount:0,
  addCharges:0,
  chargesNote:'',
  invNotes:'',
  manualTaxes: {
    subtotal: 206617.06,
    grand: 220000.00,
    cgst5: 4015.00,
    sgst5: 4015.00,
    cgst9: 2676.47,
    sgst9: 2676.47
  },
  items:[
    {desc:'Solar Inverter On Grid',hsn:'85044090',gst:5,qty:1,rate:31000,amount:31000},
    {desc:'Solar Panel',hsn:'85414300',gst:5,qty:6,rate:21600,amount:129600},
    {desc:'ACDB/DCDB Single phase',hsn:'85369090',gst:18,qty:2,rate:2300,amount:4600},
    {desc:'Lighting Arrester Copper',hsn:'85369090',gst:18,qty:1,rate:1525,amount:1525},
    {desc:'MC4 Connector 1 In 1 OUT',hsn:'85369090',gst:18,qty:4,rate:215.85,amount:860},
    {desc:'Aluminium Rail, Mid clamp, end clamp',hsn:'73089090',gst:18,qty:1,rate:3813.6,amount:3813.60},
    {desc:'Ring Lugs',hsn:'85369090',gst:18,qty:3,rate:50.83,amount:1524.90},
    {desc:'Tie Cable',hsn:'39174000',gst:18,qty:2,rate:217.92,amount:435.84},
    {desc:'Solar DC Cable 4 sq mm',hsn:'85444999',gst:18,qty:1,rate:3920,amount:3920},
    {desc:'AC Cable 4sq mm FR',hsn:'85444999',gst:18,qty:1,rate:4160,amount:4160},
    {desc:'Energy Matter Single phase LCD',hsn:'90283010',gst:18,qty:1,rate:762.62,amount:762.62},
    {desc:'Earthing Electrode G.I',hsn:'85359090',gst:18,qty:3,rate:1473.5,amount:4420.50},
    {desc:'BFC 15 Kg Silica base',hsn:'38249090',gst:18,qty:3,rate:254.23,amount:762.69},
    {desc:'AC cable 2.5 sq mm FR',hsn:'85444999',gst:18,qty:1,rate:2950,amount:2950},
    {desc:'Solar Installation Charge & Carrying Charge',hsn:'',gst:0,qty:'',rate:'',amount:16281.91},
  ]
}, {
  id: 'tpl_quot_solar_3kw',
  name: 'Quotation – Solar 3KW Setup',
  amount: 145000,
  docType: 'QUOTATION',
  showSubjectLine: true,
  showValidUntil: true,
  showSystemCapacity: true,
  showSupplierRef: false,
  showPayMode: false,
  showBuyerOrderNo: false,
  showOtherRef: false,
  showSubsidyBlock: true,
  invNo: '',
  invDate: '2024-02-10',
  invValid: '2024-03-10',
  supplierRef: '',
  payMode: 'UPI/NetBanking',
  buyerOrderNo: '',
  otherRef: '',
  buyerName: 'GREENWAY SOLAR SOLUTIONS',
  buyerPhone: '9876543210',
  buyerGST: '18AABCDE1234F1Z1',
  buyerAddr: '12 Sector B, Industrial Area\nBhopal, Madhya Pradesh\nPin - 462001',
  termsDelivery: 'F.O.R Site, including transit insurance',
  discount: 5000,
  addCharges: 1200,
  chargesNote: 'Site Inspection Fee',
  invNotes: 'Validity: 30 days from proposal date.',
  
  // Custom design parameters for Classic layout
  invThemeColor: '#d97706',
  invThemePreset: '#d97706',
  invFontSize: '12',
  invFontFamily: 'Georgia, serif',
  layoutPreset: 'classic',
  items: [
    { desc: 'Solar Panel 540W Mono PERC', hsn: '85414300', gst: 5, qty: 6, rate: 16500, amount: 99000 },
    { desc: 'On-grid Solar Inverter 3KW', hsn: '85044090', gst: 5, qty: 1, rate: 32000, amount: 32000 },
    { desc: 'ACDB/DCDB Protection Box', hsn: '85369090', gst: 18, qty: 1, rate: 5800, amount: 5800 },
    { desc: 'Earthing Kit & Lightning Spike', hsn: '85359090', gst: 18, qty: 1, rate: 8200, amount: 8200 }
  ]
}, {
  id: 'tpl_quot_it_rack',
  name: 'Quotation – Office IT Server Rack',
  amount: 85500,
  docType: 'QUOTATION',
  showSubjectLine: true,
  showValidUntil: true,
  showSystemCapacity: false,
  showSupplierRef: false,
  showPayMode: false,
  showBuyerOrderNo: false,
  showOtherRef: false,
  showSubsidyBlock: false,
  invNo: '',
  invDate: '2024-02-15',
  invValid: '2024-03-01',
  supplierRef: '',
  payMode: 'Bank Transfer',
  buyerOrderNo: '',
  otherRef: '',
  buyerName: 'CYBERLABS SOLUTIONS PVT LTD',
  buyerPhone: '9123456780',
  buyerGST: '27ABCDE9876K1Z9',
  buyerAddr: 'Plot 45, Phase III, Hinjewadi Infotech Park\nPune, Maharashtra\nPin - 411057',
  termsDelivery: 'Delivery within 7 business days from PO',
  discount: 2500,
  addCharges: 1500,
  chargesNote: 'Installation & Routing Charges',
  invNotes: 'Requires standard 230V AC socket.',
  
  // Design settings for Tech Layout
  invThemeColor: '#000000',
  invThemePreset: '#000000',
  invFontSize: '11',
  invFontFamily: "'Courier New', Courier, monospace",
  layoutPreset: 'tech',
  items: [
    { desc: 'Network Server Rack 24U Glass Door', hsn: '85381000', gst: 18, qty: 1, rate: 18500, amount: 18500 },
    { desc: '24-Port Managed Gigabit Switch L3', hsn: '85176290', gst: 18, qty: 2, rate: 22000, amount: 44000 },
    { desc: 'CAT6 UTP LAN Cable Box 305M', hsn: '85444920', gst: 18, qty: 2, rate: 9500, amount: 19000 },
    { desc: 'MC4 RJ45 Connectors pack of 100', hsn: '85369090', gst: 18, qty: 2, rate: 2500, amount: 5000 }
  ]
}, {
  id: 'tpl_prof_bulk_inv',
  name: 'Proforma – Solar Inverters Bulk',
  amount: 580000,
  docType: 'PROFORMA INVOICE',
  showSubjectLine: true,
  showValidUntil: true,
  showSystemCapacity: false,
  showSupplierRef: false,
  showPayMode: false,
  showBuyerOrderNo: false,
  showOtherRef: false,
  showSubsidyBlock: false,
  invNo: '',
  invDate: '2024-02-12',
  invValid: '',
  supplierRef: 'PI/23-24/098',
  payMode: '100% Advance TT',
  buyerOrderNo: 'PO-GREEN-889',
  otherRef: '',
  buyerName: 'ADITYA SOLAR POWER LTD',
  buyerPhone: '8888777766',
  buyerGST: '09AABCDE7788A1Z5',
  buyerAddr: '34 Chowringhee Road\nKolkata, West Bengal\nPin - 700071',
  termsDelivery: 'Ex-Factory, dispatch via V-Trans',
  discount: 20000,
  addCharges: 8000,
  chargesNote: 'Wooden Crate Packing Charges',
  invNotes: 'Goods will be dispatched within 3 days of payment receipt.',
  items: [
    { desc: 'On-grid Inverter 50KW Three Phase', hsn: '85044090', gst: 5, qty: 3, rate: 145000, amount: 435000 },
    { desc: 'On-grid Inverter 20KW Three Phase', hsn: '85044090', gst: 5, qty: 2, rate: 73500, amount: 147000 },
    { desc: 'External WiFi Logger stick', hsn: '85176290', gst: 18, qty: 5, rate: 3600, amount: 18000 }
  ]
}, {
  id: 'tpl_prof_dev_svc',
  name: 'Proforma – Custom API Dev Svc',
  amount: 250000,
  docType: 'PROFORMA INVOICE',
  showSubjectLine: true,
  showValidUntil: true,
  showSystemCapacity: false,
  showSupplierRef: false,
  showPayMode: false,
  showBuyerOrderNo: false,
  showOtherRef: false,
  showSubsidyBlock: false,
  invNo: '',
  invDate: '2024-02-18',
  invValid: '',
  supplierRef: 'PI-SVC-012',
  payMode: '50% Signoff, 50% UAT',
  buyerOrderNo: 'SOW-APEX-4',
  otherRef: '',
  buyerName: 'APEX FINTECH LABS CORP',
  buyerPhone: '7778889990',
  buyerGST: '24ABCDE6677F1Z0',
  buyerAddr: 'Block C, GIDC Infocity\nGandhinagar, Gujarat\nPin - 382007',
  termsDelivery: 'Digital Delivery via Git Repository',
  discount: 0,
  addCharges: 0,
  chargesNote: '',
  invNotes: 'Tax SAC code: 998311 (Software consultancy).',
  
  // Design settings for Elegant Layout
  invThemeColor: '#1a237e',
  invThemePreset: '#1a237e',
  invFontSize: '11',
  invFontFamily: 'system-ui, sans-serif',
  layoutPreset: 'elegant',
  items: [
    { desc: 'Software Design & API Documentation Milestone', hsn: '998311', gst: 18, qty: 1, rate: 80000, amount: 80000 },
    { desc: 'Backend Architecture Design & Node.js Rest API development', hsn: '998311', gst: 18, qty: 1, rate: 170000, amount: 170000 }
  ]
}, {
  id: 'tpl_dc_transit',
  name: 'Challan – On-Grid Inverter Transit',
  amount: 0,
  docType: 'DELIVERY CHALLAN',
  showSubjectLine: false,
  showValidUntil: false,
  showSystemCapacity: false,
  showSupplierRef: true,
  showPayMode: true,
  showBuyerOrderNo: true,
  showOtherRef: true,
  showSubsidyBlock: false,
  invNo: '',
  invDate: '2024-02-20',
  invValid: '',
  supplierRef: 'DC-881',
  payMode: 'Not Applicable',
  buyerOrderNo: 'SO-1022',
  otherRef: 'Vehicle No: AS-01-DD-7722',
  buyerName: 'LOGISTICS PARK & TRANSIT AGENCY',
  buyerPhone: '9900881122',
  buyerGST: '18AABCDE5544B1Z4',
  buyerAddr: 'Warehouse 9, Guwahati ByePass road\nGuwahati, Assam\nPin - 781022',
  termsDelivery: 'Delivery for transit demonstration only.',
  discount: 0,
  addCharges: 0,
  chargesNote: '',
  invNotes: 'Non-commercial transit challan. Not for sale.',
  
  // Design settings for Classic Layout
  invThemeColor: '#16a34a',
  invThemePreset: '#16a34a',
  invFontSize: '12',
  invFontFamily: "'Times New Roman', Times, serif",
  layoutPreset: 'classic',
  items: [
    { desc: 'Solar Inverter 10KW Single Phase', hsn: '85044090', gst: 5, qty: 2, rate: 45000, amount: 90000 },
    { desc: 'DC MC4 Connector Y Branch pair', hsn: '85369090', gst: 18, qty: 10, rate: 450, amount: 4500 }
  ]
}, {
  id: 'tpl_dc_rental',
  name: 'Challan – Core Drill Machine Rental',
  amount: 0,
  docType: 'DELIVERY CHALLAN',
  showSubjectLine: false,
  showValidUntil: false,
  showSystemCapacity: false,
  showSupplierRef: true,
  showPayMode: true,
  showBuyerOrderNo: true,
  showOtherRef: true,
  showSubsidyBlock: false,
  invNo: '',
  invDate: '2024-02-22',
  invValid: '',
  supplierRef: 'DC-RENT-05',
  payMode: 'Monthly Rental Agreement',
  buyerOrderNo: 'PO-MATRIX-992',
  otherRef: 'Gate Pass Ref: GP-88',
  buyerName: 'MATRIX BUILDCON PROJECTS',
  buyerPhone: '9443322110',
  buyerGST: '33AABCDE9911C1Z8',
  buyerAddr: 'Metro Station Extension Project site\nChennai, Tamil Nadu\nPin - 600001',
  termsDelivery: 'To be returned within 30 days',
  discount: 0,
  addCharges: 0,
  chargesNote: '',
  invNotes: 'Equipment sent for rental usage purposes.',
  items: [
    { desc: 'Heavy Duty Concrete Core Drilling Machine 2200W', hsn: '84672100', gst: 18, qty: 1, rate: 85000, amount: 85000 },
    { desc: 'Diamond Core Bit 4 inch x 450mm', hsn: '82075000', gst: 18, qty: 2, rate: 7500, amount: 15000 }
  ]
}, {
  id: 'tpl_est_rooftop',
  name: 'Estimate – Rooftop Solar Setup',
  amount: 175000,
  docType: 'ESTIMATE',
  showSubjectLine: true,
  showValidUntil: true,
  showSystemCapacity: false,
  showSupplierRef: false,
  showPayMode: false,
  showBuyerOrderNo: false,
  showOtherRef: false,
  showSubsidyBlock: false,
  invNo: '',
  invDate: '2024-02-25',
  invValid: '2024-03-25',
  supplierRef: '',
  payMode: 'Cash/Check/UPI',
  buyerOrderNo: '',
  otherRef: '',
  buyerName: 'RAMESH PATEL',
  buyerPhone: '9988776655',
  buyerGST: '',
  buyerAddr: '44 Swastik Colony, Ring Road\nIndore, Madhya Pradesh\nPin - 452009',
  termsDelivery: 'Standard rooftop structure fabrication included',
  discount: 7500,
  addCharges: 0,
  chargesNote: '',
  invNotes: 'Estimated values only. Prices may vary based on actual cable lengths.',
  
  // Design settings for Elegant Layout
  invThemeColor: '#d97706',
  invThemePreset: '#d97706',
  invFontSize: '11',
  invFontFamily: 'Arial, sans-serif',
  layoutPreset: 'elegant',
  items: [
    { desc: 'Mono Solar Panel 400W High Efficiency', hsn: '85414300', gst: 5, qty: 8, rate: 12500, amount: 100000 },
    { desc: 'Off-grid Inverter 2.5KVA Smart Hybrid', hsn: '85044090', gst: 5, qty: 1, rate: 28000, amount: 28000 },
    { desc: 'Lead Acid Solar tubular Battery 150Ah', hsn: '85072000', gst: 28, qty: 2, rate: 14500, amount: 29000 },
    { desc: 'Structure Fabrication & DC Wire setup', hsn: '73089090', gst: 18, qty: 1, rate: 25500, amount: 25500 }
  ]
}, {
  id: 'tpl_est_plant_10kw',
  name: 'Estimate – 10KW Corporate Plant',
  amount: 490000,
  docType: 'ESTIMATE',
  showSubjectLine: true,
  showValidUntil: true,
  showSystemCapacity: false,
  showSupplierRef: false,
  showPayMode: false,
  showBuyerOrderNo: false,
  showOtherRef: false,
  showSubsidyBlock: false,
  invNo: '',
  invDate: '2024-02-28',
  invValid: '2024-03-28',
  supplierRef: '',
  payMode: 'NetBanking/LC',
  buyerOrderNo: '',
  otherRef: '',
  buyerName: 'SIGMA METALS & FOILS PVT LTD',
  buyerPhone: '8887776660',
  buyerGST: '23ABCDE1122D1Z3',
  buyerAddr: 'Plot 104, Industrial Area Sector 4\nPithampur, Dhar, Madhya Pradesh\nPin - 454775',
  termsDelivery: 'NetBanking/LC Payment terms apply',
  discount: 15000,
  addCharges: 5000,
  chargesNote: 'Net Metering Approval assistance fee',
  invNotes: 'Net metering approvals take 15-30 days.',
  items: [
    { desc: 'Mono Solar Panels 540W Tier 1 brand', hsn: '85414300', gst: 5, qty: 20, rate: 17500, amount: 350000 },
    { desc: 'On Grid Solar Inverter 10KW Three Phase', hsn: '85044090', gst: 5, qty: 1, rate: 85000, amount: 85000 },
    { desc: 'Hot Dip Galvanized Solar Structure 10KW', hsn: '73089090', gst: 18, qty: 1, rate: 32000, amount: 32000 },
    { desc: 'ACDB, DCDB & surge protection setup 3ph', hsn: '85369090', gst: 18, qty: 1, rate: 18000, amount: 18000 },
    { desc: 'Copper Earthing Pit Chemical type', hsn: '85359090', gst: 18, qty: 3, rate: 5000, amount: 15000 }
  ]
}, {
  id: 'tpl_quot_gnl_3kw_210000',
  name: 'Quotation – G&L Solar 3KW ₹2,10,000',
  amount: 210000,
  docType: 'QUOTATION',
  showSubjectLine: true,
  showValidUntil: true,
  showSystemCapacity: true,
  showSupplierRef: false,
  showPayMode: false,
  showBuyerOrderNo: false,
  showOtherRef: false,
  showSubsidyBlock: true,
  invNo: 'G&L/PMSGI/2026-27/068',
  invDate: '2026-06-27',
  invValid: '2026-07-12',
  supplierRef: '',
  payMode: 'UPI/NetBanking/Cash',
  buyerOrderNo: '',
  otherRef: '3 kW',
  systemCapacity: '3 kW',
  subjectLine: 'Quotation For On-Grid Solar Plant of 3 KW Capacity',
  buyerName: 'Biswajit Basak',
  buyerPhone: '',
  buyerGST: '',
  buyerAddr: 'Nagrijuli, Dist. Tamulpur, B.T.C. Assam. PIN-781368',
  termsDelivery: 'Included till single location',
  discount: 0,
  addCharges: 0,
  chargesNote: '',
  invNotes: 'Delivery Time: lead time for delivery is 15–30 days from date of invoicing, depending on the site.\nTransportation: Included till single location.\nWarranty: As per our terms & conditions, against manufacturing defects only and subject to warranty policy.\nPayment of Net Metering and Solar Generation Meter will be extra, to be paid by the consumer.\nPayment terms: (i) 80% as advance on confirmation of the order.\n(ii) 20% after delivery of materials, for installation and commissioning of the RTS System.\nThis quotation is valid for 15 days only.',

  // Subsidy Structure — 1KW / 2KW / 3KW (Central + State)
  sub1kwTotal: 48000, sub1kwCentral: 30000, sub1kwState: 18000,
  sub2kwTotal: 96000, sub2kwCentral: 60000, sub2kwState: 36000,
  sub3kwTotal: 130000, sub3kwCentral: 85800, sub3kwState: 45000,

  // Design settings matching G&L green header style
  invThemeColor: '#2d6a4f',
  invThemePreset: '#2d6a4f',
  invFontSize: '11',
  invFontFamily: 'Arial, sans-serif',
  layoutPreset: 'solar_quotation',

  manualTaxes: {
    subtotal: 190189,
    grand: 210000,
    cgst5: 2550,
    sgst5: 2550,
    cgst9: 7361,
    sgst9: 7361
  },
  items: [
    { desc: 'Solar panel DCR Bifacial 540Wp', hsn: '85414300', gst: 5,  qty: 6,      rate: 17000, amount: 107100 },
    { desc: '3kw, 1 phase inverter: V-sole',  hsn: '85044090', gst: 5,  qty: 1,      rate: 27000, amount: 28350  },
    { desc: 'ACDB',                           hsn: '853890',   gst: 18, qty: '1 set', rate: 3389,  amount: 3999  },
    { desc: 'DCDB',                           hsn: '853890',   gst: 18, qty: '1 set', rate: 8240,  amount: 9723  },
    { desc: 'DC cable 4 sq mm',               hsn: '85441920', gst: 18, qty: '1 set', rate: 7870,  amount: 9287  },
    { desc: 'DC cable 4 sq mm',               hsn: '85441920', gst: 18, qty: '1 set', rate: 11310, amount: 13344 },
    { desc: 'Earthing cable 16 sq mm',        hsn: '85441920', gst: 18, qty: '1 set', rate: 8170,  amount: 9641  },

    { desc: 'Chemical Earthing',              hsn: '85369060', gst: 18, qty: '1 set', rate: 6270,  amount: 9758  },
    { desc: 'LA',                             hsn: '85369060', gst: 18, qty: '1 set', rate: 3270,  amount: 3859  },
    { desc: 'MC4 Connector',                  hsn: '85369060', gst: 18, qty: '1 set', rate: 2680,  amount: 3162  },
    { desc: 'Lugs',                           hsn: '85369060', gst: 18, qty: '1 set', rate: 2750,  amount: 3245  },
    { desc: 'PVC cable Tray',                 hsn: '39173100', gst: 18, qty: '1 set', rate: 2640,  amount: 3115  },
    { desc: 'Flexible conduit',               hsn: '39173100', gst: 18, qty: '1 set', rate: 2280,  amount: 2690  },
    { desc: 'Monorail Structure',             hsn: '39174000', gst: 18, qty: '1 set', rate: 2310,  amount: 2726  }
  ]
}];

// ════ TEMPLATE FUNCTIONS ════
let loadedTemplateId = null;

function getAllTemplates(){
  const custom = JSON.parse(localStorage.getItem('inv_custom_tpls')||'[]');
  return [...BUILTIN_TEMPLATES,...custom];
}

function renderTemplateCards(){
  const sysContainer = document.getElementById('systemTplList');
  const userContainer = document.getElementById('userTplList');
  if(!sysContainer || !userContainer) return;
  
  const all = getAllTemplates();
  sysContainer.innerHTML = '';
  userContainer.innerHTML = '';
  
  let userCount = 0;
  
  all.forEach(tpl=>{
    const isBuiltin = BUILTIN_TEMPLATES.some(b=>b.id===tpl.id);
    const item = document.createElement('div');
    item.className = 'tpl-list-item ' + (isBuiltin ? 'default-tpl' : 'user-tpl') + (tpl.id === loadedTemplateId ? ' active-tpl' : '');
    item.id = 'tplcard_' + tpl.id;
    
    const badgeText = isBuiltin ? 'System' : 'My File';
    const badgeClass = isBuiltin ? 'sys' : 'usr';
    
    item.innerHTML = `
      <div class="tpl-item-details">
        <div class="tpl-item-name" title="${esc(tpl.name)}">${esc(tpl.name)}</div>
        <div class="tpl-item-meta">
          <span class="tpl-item-amount">₹${fmt(tpl.amount||0)}</span>
          <span style="color:var(--muted2)">•</span>
          <span class="tpl-badge ${badgeClass}">${badgeText}</span>
        </div>
      </div>
      <div class="tpl-item-actions">
        ${!isBuiltin ? `<button class="tpl-item-del" onclick="deleteTpl('${tpl.id}',event)">✕</button>` : ''}
      </div>
    `;
    
    item.onclick = (e) => { 
      if (e.target.classList.contains('tpl-item-del')) return; 
      showPreviewDirectly(tpl.id); 
    };
    
    if (isBuiltin) {
      sysContainer.appendChild(item);
    } else {
      userContainer.appendChild(item);
      userCount++;
    }
  });
  
  if (userCount === 0) {
    userContainer.innerHTML = '<div style="font-size:0.72rem; color:var(--muted); text-align:center; padding:12px; border:1px dashed var(--border); border-radius:8px">No custom templates saved.</div>';
  }
}

function loadTemplate(id){
  const tpl=getAllTemplates().find(t=>t.id===id); if(!tpl) return;
  loadedTemplateId = id;
  
  const isBuiltin = BUILTIN_TEMPLATES.some(b => b.id === id);
  const saveNameInput = document.getElementById('tplSaveName');
  if (saveNameInput) {
    saveNameInput.value = isBuiltin ? '' : (tpl.name || '');
  }
  updateTemplateUpdateButtons();
  
  document.querySelectorAll('.tpl-list-item').forEach(c=>c.classList.remove('active-tpl'));
  const ac=document.getElementById('tplcard_'+id); if(ac) ac.classList.add('active-tpl');

  const fields=['docType','invNo','invDate','invValid','supplierRef','payMode',
    'buyerOrderNo','otherRef','buyerName','buyerPhone','buyerGST','buyerAddr',
    'termsDelivery','discount','addCharges','chargesNote','invNotes',
    'systemCapacity','subjectLine'];
  fields.forEach(f=>{
    const el=document.getElementById(f);
    if(el&&tpl[f]!==undefined&&tpl[f]!==null) {
      if(f==='invNo') {
        el.value='';
      } else {
        el.value=tpl[f];
      }
    } else if(el) {
      el.value='';
    }
  });
  
  // Apply manual taxes override if defined
  const overCb = document.getElementById('overrideTaxes');
  const overFields = document.getElementById('manualTaxFields');
  if(tpl.manualTaxes && overCb && overFields) {
    overCb.checked = true;
    overFields.style.display = 'flex';
    document.getElementById('mSubtotal').value = tpl.manualTaxes.subtotal;
    document.getElementById('mGrand').value = tpl.manualTaxes.grand;
    document.getElementById('mCgst5').value = tpl.manualTaxes.cgst5;
    document.getElementById('mSgst5').value = tpl.manualTaxes.sgst5;
    document.getElementById('mCgst9').value = tpl.manualTaxes.cgst9;
    document.getElementById('mSgst9').value = tpl.manualTaxes.sgst9;
  } else if(overCb && overFields) {
    overCb.checked = false;
    overFields.style.display = 'none';
  }

  // Load template-specific design configurations (with clean defaults to prevent styling leaks between templates)
  document.getElementById('invThemeColor').value = tpl.invThemeColor || '#16a34a';
  document.getElementById('invThemePreset').value = tpl.invThemePreset || '#16a34a';
  document.getElementById('invFontSize').value = tpl.invFontSize || '11';
  document.getElementById('invFontFamily').value = tpl.invFontFamily || "'Times New Roman', Times, serif";
  document.getElementById('invLayoutPreset').value = tpl.layoutPreset || 'modern';
  
  if (tpl.invTitleAlign) document.getElementById('invTitleAlign').value = tpl.invTitleAlign;
  else document.getElementById('invTitleAlign').value = 'center';
  
  if (tpl.invSubjectAlign) document.getElementById('invSubjectAlign').value = tpl.invSubjectAlign;
  else document.getElementById('invSubjectAlign').value = 'left';
  
  if (tpl.invNotesAlign) document.getElementById('invNotesAlign').value = tpl.invNotesAlign;
  else document.getElementById('invNotesAlign').value = 'left';
  
  if (tpl.invSellerAlign) document.getElementById('invSellerAlign').value = tpl.invSellerAlign;
  else document.getElementById('invSellerAlign').value = 'left';
  
  // Load visibility checkboxes
  const visibilityToggles = [
    'showSubjectLine', 'showValidUntil', 'showSystemCapacity',
    'showSupplierRef', 'showPayMode', 'showBuyerOrderNo',
    'showOtherRef', 'showSubsidyBlock'
  ];
  visibilityToggles.forEach(tId => {
    const el = document.getElementById(tId);
    if (el) {
      el.checked = tpl[tId] !== undefined ? tpl[tId] : true;
    }
  });
  
  updateDesignSettings();

  // Load subsidy structure fields if present
  const subsidyFields = ['sub1kwTotal','sub1kwCentral','sub1kwState','sub2kwTotal','sub2kwCentral','sub2kwState','sub3kwTotal','sub3kwCentral','sub3kwState'];
  subsidyFields.forEach(f => {
    const el = document.getElementById(f);
    if (el && tpl[f] !== undefined) el.value = tpl[f];
    else if (el) el.value = '';
  });

  items=tpl.items.map(i=>({...i}));
  renderItemsForm();
  switchNavTab('form');
  toast('✅ Template "'+tpl.name+'" loaded!');
}

function updateTemplateUpdateButtons() {
  const btnUpdate = document.getElementById('btnUpdateTpl');
  const btnTopbarUpdate = document.getElementById('btnTopbarUpdateTemplate');
  
  const activeNavItem = document.querySelector('.nav-item.active');
  const onFormTab = activeNavItem && activeNavItem.id === 'navForm';
  
  const isBuiltin = BUILTIN_TEMPLATES.some(b => b.id === loadedTemplateId);
  const showUpdate = (loadedTemplateId && !isBuiltin && onFormTab);
  
  const displayVal = showUpdate ? 'inline-flex' : 'none';
  if (btnUpdate) btnUpdate.style.display = displayVal;
  if (btnTopbarUpdate) btnTopbarUpdate.style.display = displayVal;
}

function saveNewTemplateFromTopbar() {
  const modal = document.getElementById('saveTemplateModal');
  const input = document.getElementById('customTplSaveName');
  if (modal && input) {
    input.value = gv('buyerName') ? (gv('buyerName') + ' Template') : '';
    modal.style.display = 'flex';
    input.focus();
  }
}

function closeSaveTemplateModal() {
  const modal = document.getElementById('saveTemplateModal');
  if (modal) modal.style.display = 'none';
}

function confirmSaveTemplateFromModal() {
  const input = document.getElementById('customTplSaveName');
  if (!input) return;
  const name = input.value.trim();
  if (!name) {
    toast('⚠️ Template name is required!');
    return;
  }
  const saveNameInput = document.getElementById('tplSaveName');
  if (saveNameInput) saveNameInput.value = name;
  saveAsTemplate(false);
  closeSaveTemplateModal();
}

function updateTemplateFromTopbar() {
  if (!loadedTemplateId) {
    toast('⚠️ No template is currently loaded to update. Save as New instead!');
    return;
  }
  const isBuiltin = BUILTIN_TEMPLATES.some(b => b.id === loadedTemplateId);
  if (isBuiltin) {
    toast('⚠️ System templates cannot be updated directly. Save as New instead!');
    return;
  }
  
  const saveNameInput = document.getElementById('tplSaveName');
  const allTemplates = getAllTemplates();
  const tpl = allTemplates.find(t => t.id === loadedTemplateId);
  if (saveNameInput && tpl && !saveNameInput.value.trim()) {
    saveNameInput.value = tpl.name || 'Updated Template';
  }
  
  saveAsTemplate(true);
}

function saveTemplateToServer(tpl) {
  fetch('/api/save-template', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(tpl)
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log('Template files generated:', data);
      toast(`💾 JSON & Excel files generated in saved_templates/ !`);
    } else {
      console.warn('Server failed to save template:', data.error);
    }
  })
  .catch(err => {
    console.log('Desktop server not running. Saved to browser storage only.');
  });
}

function saveAsTemplate(isUpdate = false){
  const name=document.getElementById('tplSaveName').value.trim();
  if(!name){ toast('⚠️ Template name is required!'); return; }
  const {grand}=calcTotals();
  let custom=JSON.parse(localStorage.getItem('inv_custom_tpls')||'[]');
  
  const isOverride = document.getElementById('overrideTaxes')?.checked;
  let manualTaxes = null;
  if (isOverride) {
    manualTaxes = {
      subtotal: +gv('mSubtotal') || 0,
      grand: +gv('mGrand') || 0,
      cgst5: +gv('mCgst5') || 0,
      sgst5: +gv('mSgst5') || 0,
      cgst9: +gv('mCgst9') || 0,
      sgst9: +gv('mSgst9') || 0
    };
  }

  const isBuiltin = BUILTIN_TEMPLATES.some(b => b.id === loadedTemplateId);
  const targetId = (isUpdate && loadedTemplateId && !isBuiltin) ? loadedTemplateId : 'tpl_' + Date.now();

  const tpl={
    id: targetId,
    name,
    amount:grand,
    docType:gv('docType'),
    invNo:gv('invNo'),
    invDate:gv('invDate'),
    invValid:gv('invValid'),
    supplierRef:gv('supplierRef'),
    payMode:gv('payMode'),
    buyerOrderNo:gv('buyerOrderNo'),
    otherRef:gv('otherRef'),
    buyerName:gv('buyerName'),
    buyerPhone:gv('buyerPhone'),
    buyerGST:gv('buyerGST'),
    buyerAddr:gv('buyerAddr'),
    termsDelivery:gv('termsDelivery'),
    discount:+gv('discount')||0,
    addCharges:+gv('addCharges')||0,
    chargesNote:gv('chargesNote'),
    invNotes:gv('invNotes'),
    systemCapacity:gv('systemCapacity'),
    subjectLine:gv('subjectLine'),
    // Save subsidy structure
    sub1kwTotal:+gv('sub1kwTotal')||0, sub1kwCentral:+gv('sub1kwCentral')||0, sub1kwState:+gv('sub1kwState')||0,
    sub2kwTotal:+gv('sub2kwTotal')||0, sub2kwCentral:+gv('sub2kwCentral')||0, sub2kwState:+gv('sub2kwState')||0,
    sub3kwTotal:+gv('sub3kwTotal')||0, sub3kwCentral:+gv('sub3kwCentral')||0, sub3kwState:+gv('sub3kwState')||0,
    
    // Save seller profile fields in template for Excel generation
    forName:gv('forName'),
    sellerName:gv('sellerName'),
    sellerAddr:gv('sellerAddr'),
    sellerPhone:gv('sellerPhone'),
    sellerEmail:gv('sellerEmail'),
    sellerGST:gv('sellerGST'),
    sellerPAN:gv('sellerPAN'),
    
    // Save template-specific design configurations
    invThemeColor: document.getElementById('invThemeColor').value,
    invThemePreset: document.getElementById('invThemePreset').value,
    invFontSize: document.getElementById('invFontSize').value,
    invFontFamily: document.getElementById('invFontFamily').value,
    layoutPreset: document.getElementById('invLayoutPreset').value,
    invTitleAlign: document.getElementById('invTitleAlign').value,
    invSubjectAlign: document.getElementById('invSubjectAlign').value,
    invNotesAlign: document.getElementById('invNotesAlign').value,
    invSellerAlign: document.getElementById('invSellerAlign').value,
    
    // Save visibility checkboxes
    showSubjectLine: document.getElementById('showSubjectLine').checked,
    showValidUntil: document.getElementById('showValidUntil').checked,
    showSystemCapacity: document.getElementById('showSystemCapacity').checked,
    showSupplierRef: document.getElementById('showSupplierRef').checked,
    showPayMode: document.getElementById('showPayMode').checked,
    showBuyerOrderNo: document.getElementById('showBuyerOrderNo').checked,
    showOtherRef: document.getElementById('showOtherRef').checked,
    showSubsidyBlock: document.getElementById('showSubsidyBlock').checked,
    
    items:items.map(i=>({...i})),
    manualTaxes
  };
  
  if (isUpdate && loadedTemplateId && !isBuiltin) {
    const idx = custom.findIndex(t => t.id === loadedTemplateId);
    if (idx !== -1) {
      custom[idx] = tpl;
      toast('💾 Template "'+name+'" updated!');
    } else {
      custom.push(tpl);
      toast('💾 Template "'+name+'" saved!');
    }
  } else {
    custom.push(tpl);
    toast('💾 Template "'+name+'" saved!');
  }
  
  localStorage.setItem('inv_custom_tpls',JSON.stringify(custom));
  
  // Set loaded ID to the newly saved/updated template ID
  loadedTemplateId = targetId;
  updateTemplateUpdateButtons();

  document.getElementById('tplSaveName').value=name;
  renderTemplateCards();
  renderDashboardTemplates();
  
  // Try writing to local server files
  saveTemplateToServer(tpl);
}

function deleteTpl(id,e){
  e&&e.stopPropagation();
  if(!confirm('Delete this template?')) return;
  let custom=JSON.parse(localStorage.getItem('inv_custom_tpls')||'[]');
  custom=custom.filter(t=>t.id!==id);
  localStorage.setItem('inv_custom_tpls',JSON.stringify(custom));
  
  if (loadedTemplateId === id) {
    loadedTemplateId = null;
    document.getElementById('tplSaveName').value = '';
    updateTemplateUpdateButtons();
  }
  
  renderTemplateCards();
  renderDashboardTemplates();
  toast('🗑️ Deleted');
}

// ════ DRAG & DROP COLUMNS & ROWS ════
let dragIdx = null;
let dragColIdx = null;

let columns = [
  { id: 'desc', label: 'Description', type: 'text', fixed: true },
  { id: 'hsn', label: 'HSN/SAC', type: 'text' },
  { id: 'gst', label: 'GST%', type: 'select' },
  { id: 'qty', label: 'Qty', type: 'number' },
  { id: 'rate', label: 'Rate ₹', type: 'number' },
  { id: 'per', label: 'Per', type: 'text' },
  { id: 'disc', label: 'Disc%', type: 'text' },
  { id: 'amount', label: 'Amount', type: 'number', fixed: true }
];

// Row Drag Handlers
function rowDragStart(e, idx) {
  dragIdx = idx;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', idx);
  setTimeout(() => {
    const trs = document.querySelectorAll('#itemsFormBody tr');
    if(trs[idx]) trs[idx].style.opacity = '0.3';
  }, 0);
}
function rowDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('row-drag-over');
}
function rowDragLeave(e) {
  e.currentTarget.classList.remove('row-drag-over');
}
function rowDragDrop(e, targetIdx) {
  e.preventDefault();
  e.currentTarget.classList.remove('row-drag-over');
  if (dragIdx === null || dragIdx === targetIdx) return;
  const draggedItem = items[dragIdx];
  items.splice(dragIdx, 1);
  items.splice(targetIdx, 0, draggedItem);
  renderItemsForm();
}
function rowDragEnd() {
  dragIdx = null;
  renderItemsForm();
}

// Column Drag Handlers
function colDragStart(e, idx) {
  dragColIdx = idx;
  e.dataTransfer.effectAllowed = 'move';
  e.target.classList.add('dragging-col');
}
function colDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('col-drag-over');
}
function colDragLeave(e) {
  e.currentTarget.classList.remove('col-drag-over');
}
function colDragDrop(e, targetIdx) {
  e.preventDefault();
  e.currentTarget.classList.remove('col-drag-over');
  if (dragColIdx === null || dragColIdx === targetIdx) return;
  const temp = columns[dragColIdx];
  columns.splice(dragColIdx, 1);
  columns.splice(targetIdx, 0, temp);
  renderItemsForm();
}
function colDragEnd() {
  dragColIdx = null;
  document.querySelectorAll('.ftable th').forEach(th => th.classList.remove('dragging-col', 'col-drag-over'));
}

// ════ ITEMS ════
function renderItemsForm(){
  const thead = document.querySelector('.ftable thead tr');
  const tbody = document.getElementById('itemsFormBody');
  if(!thead || !tbody) return;

  const visibleCols = columns.filter(col => col.visible !== false);

  // Render headers dynamically based on column order
  let headHtml = '<th style="width:15px; cursor:default"></th><th style="width:22px; cursor:default">#</th>';
  visibleCols.forEach((col) => {
    const actualIdx = columns.findIndex(c => c.id === col.id);
    headHtml += `
      <th draggable="true" 
          ondragstart="colDragStart(event, ${actualIdx})" 
          ondragover="colDragOver(event)" 
          ondragleave="colDragLeave(event)" 
          ondrop="colDragDrop(event, ${actualIdx})" 
          ondragend="colDragEnd()">${esc(col.label)}</th>`;
  });
  headHtml += '<th style="width:75px; cursor:default"></th>';
  thead.innerHTML = headHtml;

  // Render body rows
  tbody.innerHTML = '';
  items.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.addEventListener('dragover', rowDragOver);
    tr.addEventListener('dragleave', rowDragLeave);
    tr.addEventListener('drop', (e) => rowDragDrop(e, idx));

    let cellsHtml = `
      <td style="text-align:center;">
        <span class="drag-handle" style="cursor:grab;font-size:1.1rem;color:var(--muted);user-select:none;display:inline-block;padding:2px 4px" 
              draggable="true" 
              ondragstart="rowDragStart(event, ${idx})" 
              ondragend="rowDragEnd()">⠿</span>
      </td>
      <td style="text-align:center;color:var(--muted);font-size:.64rem">${idx+1}</td>
    `;

    // Map inputs to columns in dynamic order
    visibleCols.forEach(col => {
      const val = item[col.id] !== undefined && item[col.id] !== null ? item[col.id] : '';
      if(col.id === 'desc') {
        cellsHtml += `
          <td style="position:relative;">
            <input type="text" id="itemDesc_${idx}" value="${esc(val)}" placeholder="Item name" 
                   onfocus="showItemDropdown(${idx})" 
                   oninput="handleItemDescInput(${idx}, this.value)" 
                   autocomplete="off"/>
            <div id="itemDropdown_${idx}" style="display:none; position:absolute; left:0; right:0; top:100%; background:var(--surface); border:1.5px solid var(--border); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.12); z-index:999; max-height:160px; overflow-y:auto; padding:4px 0;">
              <!-- Dynamically populated items/groups -->
            </div>
          </td>`;
      } else if(col.id === 'hsn') {
        cellsHtml += `<td><input type="text" value="${esc(val)}" placeholder="HSN" oninput="items[${idx}].hsn=this.value;updatePreview()"/></td>`;
      } else if(col.id === 'gst') {
        cellsHtml += `<td>
          <select onchange="items[${idx}].gst=+this.value;updatePreview()">
            ${[0,5,12,18,28].map(g=>`<option value="${g}"${+val===g?' selected':''} >${g}%</option>`).join('')}
          </select>
        </td>`;
      } else if(col.id === 'qty') {
        cellsHtml += `<td><input type="number" min="0" value="${val}" placeholder="Qty" oninput="items[${idx}].qty=this.value===''?undefined:+this.value;updatePreview()"/></td>`;
      } else if(col.id === 'rate') {
        cellsHtml += `<td><input type="number" min="0" step="0.01" value="${val}" placeholder="Rate" oninput="items[${idx}].rate=this.value===''?undefined:+this.value;updatePreview()"/></td>`;
      } else if(col.id === 'per') {
        cellsHtml += `<td><input type="text" value="${esc(val)}" placeholder="Unit" oninput="items[${idx}].per=this.value;updatePreview()"/></td>`;
      } else if(col.id === 'disc') {
        cellsHtml += `<td><input type="text" value="${esc(val)}" placeholder="Disc%" oninput="items[${idx}].disc=this.value;updatePreview()"/></td>`;
      } else if(col.id === 'amount') {
        const autoCalc = ((+item.qty || 0) * (+item.rate || 0)).toFixed(2);
        cellsHtml += `<td><input type="number" min="0" step="0.01" value="${val}" placeholder="${autoCalc}" oninput="items[${idx}].amount=this.value===''?undefined:+this.value;updatePreview()" style="font-weight:700;color:var(--green)"/></td>`;
      } else {
        // Custom Column
        cellsHtml += `<td><input type="text" value="${esc(val)}" placeholder="${esc(col.label)}" oninput="items[${idx}]['${col.id}']=this.value;updatePreview()"/></td>`;
      }
    });

    cellsHtml += `
      <td>
        <div style="display:flex;gap:3px;align-items:center">
          <button class="btn btn-accent btn-sm" style="padding:2px 5px;font-size:.65rem;border-radius:4px" onclick="insertItem(${idx})" title="Insert row below">＋</button>
          <button class="btn btn-green btn-sm" style="padding:2px 5px;font-size:.65rem;border-radius:4px" onclick="saveItemToDb(${idx})" title="Save item to database">&#x1F4BE;</button>
          <button class="del-btn" style="padding:2px 5px;font-size:.65rem;border-radius:4px" onclick="delItem(${idx})">✕</button>
        </div>
      </td>
    `;
    tr.innerHTML = cellsHtml;
    tbody.appendChild(tr);
  });
  updatePreview();
}

function addItem(n){
  n = Math.max(1, Math.min(+n||1, 50));
  for(let i=0;i<n;i++) items.push({desc:'',hsn:'',gst:18,qty:'',rate:'',per:'',disc:'',amount:undefined});
  renderItemsForm();
  toast(`➕ ${n} row${n>1?'s':''} added`);
}

function insertItem(idx){
  items.splice(idx + 1, 0, {desc:'',hsn:'',gst:18,qty:'',rate:'',per:'',disc:'',amount:undefined});
  renderItemsForm();
  toast('➕ Row inserted!');
}

function delItem(i){ items.splice(i,1); renderItemsForm(); }

// ════ CALC ════
function calcTotals(tplItems, tplDiscount, tplAddCharges, tplManualTaxes){
  const isOverride = tplManualTaxes ? true : document.getElementById('overrideTaxes')?.checked;
  
  if (isOverride) {
    let mSub, mGrd, mC5, mS5, mC9, mS9;
    if (tplManualTaxes) {
      mSub = tplManualTaxes.subtotal || 0;
      mGrd = tplManualTaxes.grand || 0;
      mC5 = tplManualTaxes.cgst5 || 0;
      mS5 = tplManualTaxes.sgst5 || 0;
      mC9 = tplManualTaxes.cgst9 || 0;
      mS9 = tplManualTaxes.sgst9 || 0;
    } else {
      mSub = +gv('mSubtotal') || 0;
      mGrd = +gv('mGrand') || 0;
      mC5 = +gv('mCgst5') || 0;
      mS5 = +gv('mSgst5') || 0;
      mC9 = +gv('mCgst9') || 0;
      mS9 = +gv('mSgst9') || 0;
    }
    
    const overrideByGST = {};
    if (mC5 > 0 || mS5 > 0) {
      overrideByGST[5] = { cgst: mC5, sgst: mS5 };
    }
    if (mC9 > 0 || mS9 > 0) {
      overrideByGST[18] = { cgst: mC9, sgst: mS9 };
    }
    
    return {
      byGST: overrideByGST,
      subtotal: mSub,
      discount: 0,
      addChrg: 0,
      taxableAfterDisc: mSub,
      totalTax: mC5 + mS5 + mC9 + mS9,
      grand: mGrd
    };
  }

  const byGST={};
  const activeItems = tplItems || items;
  activeItems.forEach(item=>{
    const amt = item.amount !== undefined ? item.amount : ((+item.qty || 0) * (+item.rate || 0));
    const g=item.gst;
    if(!byGST[g]) byGST[g]={taxable:0};
    byGST[g].taxable+=amt;
  });
  let subtotal=0; Object.values(byGST).forEach(v=>subtotal+=v.taxable);
  const discount = tplDiscount !== undefined ? tplDiscount : +(gv('discount')||0);
  const addChrg = tplAddCharges !== undefined ? tplAddCharges : +(gv('addCharges')||0);
  const taxableAfterDisc=Math.max(0,subtotal-discount);
  let totalTax=0;
  Object.entries(byGST).forEach(([g,v])=>{
    const ratio=subtotal>0?v.taxable/subtotal:0;
    const taxBase=taxableAfterDisc*ratio;
    // Round individual taxes to 2 decimal places
    v.cgst=Math.round(( (taxBase*(+g)/100)/2 ) * 100) / 100;
    v.sgst=v.cgst;
    totalTax+=v.cgst+v.sgst;
  });
  // Round grand total to 2 decimal places
  const grand=Math.round((taxableAfterDisc+totalTax+addChrg) * 100) / 100;
  return {byGST,subtotal,discount,addChrg,taxableAfterDisc,totalTax,grand};
}

function toggleTaxOverride(checked) {
  const container = document.getElementById('manualTaxFields');
  if(!container) return;
  container.style.display = checked ? 'flex' : 'none';
  if(checked) {
    // Pre-fill with current calculated values
    const totals = calcTotals();
    document.getElementById('mSubtotal').value = totals.subtotal.toFixed(2);
    document.getElementById('mGrand').value = totals.grand.toFixed(2);
    
    // Fallbacks
    document.getElementById('mCgst5').value = (totals.byGST[5]?.cgst || 0).toFixed(2);
    document.getElementById('mSgst5').value = (totals.byGST[5]?.sgst || 0).toFixed(2);
    document.getElementById('mCgst9').value = (totals.byGST[18]?.cgst || 0).toFixed(2);
    document.getElementById('mSgst9').value = (totals.byGST[18]?.sgst || 0).toFixed(2);
  }
  updatePreview();
}

// ════ UPDATE PREVIEW ════
function updatePreview(tempData){
  const isTempPreview = !!tempData;
  const gc = (id) => {
    if (isTempPreview && tempData && tempData[id] !== undefined) {
      return !!tempData[id];
    }
    const el = document.getElementById(id);
    return el ? el.checked : false;
  };
  if (!isTempPreview) {
    previewedTplId = null; // Revert layout preview state when user edits
  }
  const warningBar = document.getElementById('previewWarningBar');
  if (warningBar) {
    warningBar.style.display = isTempPreview ? 'flex' : 'none';
  }
  const sidebarOverlay = document.getElementById('sidebarPreviewOverlay');
  if (sidebarOverlay) {
    sidebarOverlay.style.display = isTempPreview ? 'flex' : 'none';
  }

  // Dynamically apply design variables
  const themeColor = isTempPreview ? (tempData.invThemeColor || '#16a34a') : (document.getElementById('invThemeColor').value || '#16a34a');
  const fontSize = isTempPreview ? (tempData.invFontSize || '11') : (document.getElementById('invFontSize').value || '11');
  const fontFamily = isTempPreview ? (tempData.invFontFamily || 'Arial, sans-serif') : (document.getElementById('invFontFamily').value || 'Arial, sans-serif');
  const layoutPreset = isTempPreview ? (tempData.layoutPreset || 'modern') : (document.getElementById('invLayoutPreset').value || 'modern');

  const doc = document.getElementById('invoiceDoc');
  if (doc) {
    // ═══ SOLAR QUOTATION LAYOUT — special renderer ═══
    if (layoutPreset === 'solar_quotation') {
      renderSolarQuotation(isTempPreview, tempData, themeColor, fontFamily, fontSize);
      currentLayoutPreset = 'solar_quotation';
      return;
    }
    
    // Switch back to standard layout: restore standard HTML template structure if currently solar
    if (currentLayoutPreset === 'solar_quotation' || !document.getElementById('p_sellerName')) {
      doc.innerHTML = ORIGINAL_INVOICE_HTML;
    }
    currentLayoutPreset = layoutPreset;
    
    doc.className = '';
    doc.classList.add('layout-' + layoutPreset);
    doc.style.setProperty('--inv-theme', themeColor);
    doc.style.setProperty('--inv-font-size', fontSize + 'px');
    doc.style.setProperty('--inv-font-family', fontFamily);
    
    let headerBg = '#bae6fd';
    let headerText = '#0c4a6e';
    if (themeColor === '#1a237e') { headerBg = '#bae6fd'; headerText = '#0c4a6e'; }
    else if (themeColor === '#dc2626') { headerBg = '#fee2e2'; headerText = '#991b1b'; }
    else if (themeColor === '#16a34a') { headerBg = '#dcfce7'; headerText = '#166534'; }
    else if (themeColor === '#d97706') { headerBg = '#fef3c7'; headerText = '#92400e'; }
    else if (themeColor === '#000000') { headerBg = '#e5e5e5'; headerText = '#000000'; }
    else {
      headerBg = themeColor + '1f';
      headerText = themeColor;
    }
    doc.style.setProperty('--inv-header-bg', headerBg);
    doc.style.setProperty('--inv-header-text', headerText);
  }

  // Doc type and dynamic number label
  const docType = isTempPreview ? (tempData.docType || 'TAX INVOICE') : (gv('docType') || 'TAX INVOICE');
  sp('p_docType', docType);
  
  let labelText = 'Invoice No.';
  if (docType === 'QUOTATION') labelText = 'Quotation No.';
  else if (docType === 'PROFORMA INVOICE') labelText = 'Proforma Inv. No.';
  else if (docType === 'DELIVERY CHALLAN') labelText = 'Challan No.';
  else if (docType === 'ESTIMATE') labelText = 'Estimate No.';
  sp('p_invNoLabel', labelText);

  // Seller
  sp('p_sellerName',gv('sellerName'));
  sh('p_sellerAddr',gv('sellerAddr').replace(/\n/g,'<br/>'));
  sp('p_sellerEmail',gv('sellerEmail'));
  sp('p_sellerPhone',gv('sellerPhone'));
  
  // Render GST / PAN dynamically (hide label if empty)
  const gst = gv('sellerGST');
  const pan = gv('sellerPAN');
  let taxIdsHtml = '';
  if (gst) taxIdsHtml += `GST NO : <span>${esc(gst)}</span>`;
  if (pan) {
    if (taxIdsHtml) taxIdsHtml += '&nbsp;&nbsp; ';
    taxIdsHtml += `PAN : <span>${esc(pan)}</span>`;
  }
  sh('p_sellerTaxIds', taxIdsHtml);

  // Invoice meta
  sp('p_invNo', isTempPreview ? (tempData.invNo || 'DRAFT') : gv('invNo'));
  sp('p_invDate', formatDate(isTempPreview ? (tempData.invDate || getTodayDateString()) : gv('invDate')));
  
  // Dynamic Supplier Ref
  const showSupplier = gc('showSupplierRef');
  const supplierRef = isTempPreview ? (tempData.supplierRef || '') : gv('supplierRef');
  const supplierCell = document.getElementById('p_supplierRefCell');
  if (supplierCell) {
    if (showSupplier) {
      supplierCell.style.visibility = 'visible';
      supplierCell.style.display = '';
      sp('p_supplierRef', supplierRef);
    } else {
      supplierCell.style.visibility = 'hidden';
      supplierCell.style.display = 'none';
    }
  }
  
  // Dynamic Payment Mode
  const showPm = gc('showPayMode');
  const pm = isTempPreview ? (tempData.payMode || '') : gv('payMode');
  const payModeCell = document.getElementById('p_payModeCell');
  if (payModeCell) {
    if (showPm) {
      payModeCell.style.visibility = 'visible';
      payModeCell.style.display = '';
      sp('p_payMode', (pm === 'None' || !pm) ? '' : pm);
    } else {
      payModeCell.style.visibility = 'hidden';
      payModeCell.style.display = 'none';
    }
  }
  
  // Toggle row 2 based on children visibility
  const rowSupplierPay = document.getElementById('p_row_supplier_pay');
  if (rowSupplierPay) {
    rowSupplierPay.style.display = (showSupplier || showPm) ? 'grid' : 'none';
  }
  
  // Dynamic Buyer Order No
  const showBuyerOrder = gc('showBuyerOrderNo');
  const buyerOrderNo = isTempPreview ? (tempData.buyerOrderNo || '') : gv('buyerOrderNo');
  const buyerOrderCell = document.getElementById('p_buyerOrderNoCell');
  if (buyerOrderCell) {
    if (showBuyerOrder) {
      buyerOrderCell.style.visibility = 'visible';
      buyerOrderCell.style.display = '';
      sp('p_buyerOrderNo', buyerOrderNo);
    } else {
      buyerOrderCell.style.visibility = 'hidden';
      buyerOrderCell.style.display = 'none';
    }
  }
  
  // Dynamic Other References
  const showOtherRef = gc('showOtherRef');
  const otherRef = isTempPreview ? (tempData.otherRef || '') : gv('otherRef');
  const otherRefCell = document.getElementById('p_otherRefCell');
  if (otherRefCell) {
    if (showOtherRef) {
      otherRefCell.style.visibility = 'visible';
      otherRefCell.style.display = '';
      sp('p_otherRef', otherRef);
    } else {
      otherRefCell.style.visibility = 'hidden';
      otherRefCell.style.display = 'none';
    }
  }
  
  // Toggle row 3 based on children visibility
  const rowBuyerOther = document.getElementById('p_row_buyer_other');
  if (rowBuyerOther) {
    rowBuyerOther.style.display = (showBuyerOrder || showOtherRef) ? 'grid' : 'none';
  }

  // Buyer
  sp('p_buyerName', isTempPreview ? (tempData.buyerName || '') : gv('buyerName'));
  sh('p_buyerAddr', (isTempPreview ? (tempData.buyerAddr || '') : gv('buyerAddr')).replace(/\n/g,'<br/>'));
  const ph = isTempPreview ? (tempData.buyerPhone || '') : gv('buyerPhone');
  sp('p_buyerPhone', ph ? 'Ph: ' + ph : '');
  const bg = isTempPreview ? (tempData.buyerGST || '') : gv('buyerGST');
  sp('p_buyerGST', bg ? 'GSTIN: ' + bg : '');
  sh('p_termsDelivery', (isTempPreview ? (tempData.termsDelivery || '') : gv('termsDelivery')).replace(/\n/g,'<br/>'));

  // Dynamic preview items table header
  const pHead = document.getElementById('p_itemsHead');
  if(pHead){
    let headHtml = '<tr><th style="width:30px">Sl.</th>';
    columns.forEach(col => {
      headHtml += `<th style="${col.id==='desc'?'text-align:left;padding-left:6px':''}">${col.label}</th>`;
    });
    headHtml += '</tr>';
    pHead.innerHTML = headHtml;
  }

  // Dynamic preview items table body
  const itbody=document.getElementById('p_itemsBody');
  if(itbody){
    itbody.innerHTML='';
    const activeItems = isTempPreview ? (tempData.items || []) : items;
    activeItems.forEach((item,idx)=>{
      const amt = item.amount !== undefined ? item.amount : ((+item.qty || 0) * (+item.rate || 0));
      const tr=document.createElement('tr');
      let cellsHtml = `<td class="c">${idx+1}</td>`;
      
      const visibleCols = columns.filter(col => col.visible !== false);
      visibleCols.forEach(col => {
        const val = item[col.id];
        if(col.id === 'desc') {
          let extra = '';
          if (item.customFields && Object.keys(item.customFields).length > 0) {
            extra = `<div style="font-size:0.65rem; color:var(--muted); margin-top:2px; display:flex; flex-wrap:wrap; gap:5px; line-height:1.2;">` +
              Object.entries(item.customFields).map(([k, v]) => `<span style="font-style:italic;"><strong>${esc(k)}:</strong> ${esc(v)}</span>`).join(' | ') +
              `</div>`;
          }
          cellsHtml += `<td style="text-align:left;padding-left:6px">${esc(val)}${extra}</td>`;
        } else if(col.id === 'hsn') {
          cellsHtml += `<td class="c">${esc(val)}</td>`;
        } else if(col.id === 'gst') {
          cellsHtml += `<td class="c">${val!==undefined&&val!==''?val+'%':''}</td>`;
        } else if(col.id === 'qty') {
          cellsHtml += `<td class="c">${val!==undefined&&val!==''?val:''}</td>`;
        } else if(col.id === 'rate') {
          cellsHtml += `<td class="r">${val!==undefined&&val!==''?fmt(val):''}</td>`;
        } else if(col.id === 'per') {
          const showQty = item.qty !== undefined && item.qty !== '' ? item.qty : '';
          cellsHtml += `<td class="c">${val!==undefined&&val!==''?esc(val):''}</td>`;
        } else if(col.id === 'disc') {
          cellsHtml += `<td class="c">${val!==undefined&&val!==''?esc(val):''}</td>`;
        } else if(col.id === 'amount') {
          cellsHtml += `<td class="r">${fmt(amt)}</td>`;
        } else {
          // Custom Column print cell
          cellsHtml += `<td class="c">${val!==undefined&&val!==null?esc(val):''}</td>`;
        }
      });
      tr.innerHTML = cellsHtml;
      itbody.appendChild(tr);
    });
  }

  // Totals
  const tplDisc = isTempPreview ? tempData.discount : undefined;
  const tplChrg = isTempPreview ? tempData.addCharges : undefined;
  const tplTaxes = isTempPreview ? tempData.manualTaxes : undefined;
  
  const {byGST,subtotal,discount,addChrg,grand}=calcTotals(
    isTempPreview ? tempData.items : undefined,
    tplDisc,
    tplChrg,
    tplTaxes
  );
  
  const chargesNote = isTempPreview ? (tempData.chargesNote || 'Additional Charges') : (gv('chargesNote')||'Additional Charges');
  let html='';
  html+=`<div class="d-trow"><span class="tl">Total Amount Before Tax</span><span class="tv">₹${fmt(subtotal)}</span></div>`;
  if(discount>0) html+=`<div class="d-trow"><span class="tl">Discount (−)</span><span class="tv">₹${fmt(discount)}</span></div>`;
  Object.entries(byGST).sort(([a],[b])=>+a-+b).forEach(([g,v])=>{
    if(+g===0) return;
    const h = (+g === 5) ? 5 : (+g / 2);
    html+=`<div class="d-trow"><span class="tl">CGST @${h}%</span><span class="tv">₹${fmt(v.cgst)}</span></div>`;
    html+=`<div class="d-trow"><span class="tl">SGST @${h}%</span><span class="tv">₹${fmt(v.sgst)}</span></div>`;
  });
  if(addChrg>0) html+=`<div class="d-trow"><span class="tl">${esc(chargesNote)}</span><span class="tv">₹${fmt(addChrg)}</span></div>`;
  html+=`<div class="d-trow grand"><span class="tl">Grand Total</span><span class="tv">₹${fmt(grand)}</span></div>`;
  document.getElementById('p_totalsBlock').innerHTML=html;
  sp('p_amtWords',numberToWords(grand));

  // Notes
  const notes = isTempPreview ? tempData.invNotes : gv('invNotes');
  const nr=document.getElementById('p_notesRow');
  if(notes){ nr.style.display='block'; sp('p_notes',notes); } else { nr.style.display='none'; }

  // Dynamic Subject Line for standard layouts
  const showSubject = gc('showSubjectLine');
  const subject = isTempPreview ? (tempData.subjectLine || '') : gv('subjectLine');
  const subRow = document.getElementById('p_subjectLineRow');
  if (subRow) {
    if (showSubject) {
      subRow.style.display = 'block';
      sp('p_subjectLine', subject);
    } else {
      subRow.style.display = 'none';
    }
  }

  // Dynamic System Capacity for standard layouts
  const showSysCap = gc('showSystemCapacity');
  const sysCap = isTempPreview 
    ? (tempData.systemCapacity || tempData.otherRef || '') 
    : (gv('systemCapacity') || gv('otherRef') || '');
  const sysRow = document.getElementById('p_systemCapacityRow');
  const lastMetaRow = document.querySelector('.d-meta .d-meta-r:nth-child(3)');
  if (sysRow) {
    if (showSysCap) {
      sysRow.style.display = 'grid';
      sp('p_systemCapacity', sysCap);
      if (lastMetaRow) lastMetaRow.style.borderBottom = '1px solid #999';
    } else {
      sysRow.style.display = 'none';
      if (lastMetaRow) lastMetaRow.style.borderBottom = 'none';
    }
  }

  // Dynamic Subsidy Structure for standard layouts
  const showSubsidy = gc('showSubsidyBlock');
  const subBlock = document.getElementById('p_subsidyBlock');
  if (subBlock) {
    const hasSubsidyData = isTempPreview 
      ? (tempData.sub1kwTotal !== undefined || tempData.sub2kwTotal !== undefined || tempData.sub3kwTotal !== undefined)
      : (gv('sub1kwTotal') || gv('sub2kwTotal') || gv('sub3kwTotal'));
      
    if (showSubsidy && hasSubsidyData) {
      subBlock.style.display = 'block';
      const gN = (id, def) => isTempPreview ? (tempData[id] || def || 0) : (+gv(id) || def || 0);
      const sub1Total   = gN('sub1kwTotal', 48000);
      const sub1Central = gN('sub1kwCentral', 30000);
      const sub1State   = gN('sub1kwState', 18000);
      const sub2Total   = gN('sub2kwTotal', 96000);
      const sub2Central = gN('sub2kwCentral', 60000);
      const sub2State   = gN('sub2kwState', 36000);
      const sub3Total   = gN('sub3kwTotal', 130000);
      const sub3Central = gN('sub3kwCentral', 78000);
      const sub3State   = gN('sub3kwState', 52000);

      const sysCapText = (sysCap || '').toLowerCase();
      const is1kwActive = sysCapText.includes('1 kw') || sysCapText.includes('1kw') || sysCapText === '1';
      const is2kwActive = sysCapText.includes('2 kw') || sysCapText.includes('2kw') || sysCapText === '2';
      const is3kwActive = sysCapText.includes('3 kw') || sysCapText.includes('3kw') || sysCapText === '3';
      
      const fmtSub = (v) => '₹' + fmt(v);
      
      subBlock.innerHTML = `
        <div style="background:var(--inv-theme); color:#fff; font-weight:700; padding:6px 12px; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px;">
          Subsidy Structure
        </div>
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); background:#fff;">
          <div style="padding:10px; border-right:1px solid #e2e8f0; text-align:center; ${is1kwActive ? 'background:var(--inv-header-bg); font-weight:bold;' : ''}">
            <div style="font-size:0.65rem; color:#64748b; text-transform:uppercase;">1 KW</div>
            <div style="font-size:0.95rem; color:var(--inv-theme); font-weight:700; margin:3px 0;">${fmtSub(sub1Total)}</div>
            <div style="font-size:0.6rem; color:#64748b; line-height:1.2;">${fmtSub(sub1Central)} Central +<br/>${fmtSub(sub1State)} State</div>
          </div>
          <div style="padding:10px; border-right:1px solid #e2e8f0; text-align:center; ${is2kwActive ? 'background:var(--inv-header-bg); font-weight:bold;' : ''}">
            <div style="font-size:0.65rem; color:#64748b; text-transform:uppercase;">2 KW</div>
            <div style="font-size:0.95rem; color:var(--inv-theme); font-weight:700; margin:3px 0;">${fmtSub(sub2Total)}</div>
            <div style="font-size:0.6rem; color:#64748b; line-height:1.2;">${fmtSub(sub2Central)} Central +<br/>${fmtSub(sub2State)} State</div>
          </div>
          <div style="padding:10px; text-align:center; ${is3kwActive ? 'background:var(--inv-header-bg); font-weight:bold;' : ''}">
            <div style="font-size:0.65rem; color:#64748b; text-transform:uppercase;">3 KW ${is3kwActive ? '(THIS PLAN)' : ''}</div>
            <div style="font-size:0.95rem; color:var(--inv-theme); font-weight:700; margin:3px 0;">${fmtSub(sub3Total)}</div>
            <div style="font-size:0.6rem; color:#64748b; line-height:1.2;">${fmtSub(sub3Central)} Central +<br/>${fmtSub(sub3State)} State</div>
          </div>
        </div>
      `;
    } else {
      subBlock.style.display = 'none';
    }
  }

  // Bank
  sp('p_bankName',gv('bankName'));
  sp('p_bankHolder',gv('bankHolder'));
  sp('p_bankBranch',gv('bankBranch'));
  sp('p_bankAcc',gv('bankAcc'));
  sp('p_bankIFSC',gv('bankIFSC'));
  sp('p_bankGST',gv('bankGST'));
  sp('p_declText',gv('declText'));

  // RIGHT: For, Company + sign
  const fn = gv('forName');
  if (fn) {
    sh('p_forNameBlock', `For, <span>${esc(fn)}</span>`);
  } else {
    sh('p_forNameBlock', '');
  }
  const propName=gv('propName'), propDesig=gv('propDesig');
  sp('p_propName',propName); sp('p_propDesig',propDesig);
  document.getElementById('p_propBlock').style.display=(propName||propDesig)?'block':'none';

  // Signature image
  const pSign=document.getElementById('p_signImg');
  const pStmp=document.getElementById('p_stampImg');
  const pSBlank=document.getElementById('p_signBlank');
  
  if(signatureImg){
    pSign.src=signatureImg;
    pSign.style.display='block';
    const sWidth = gv('signImgWidth') || '300';
    const sOffset = gv('signImgOffset') || '0';
    pSign.style.width = sWidth + 'px';
    pSign.style.marginTop = (-sOffset) + 'px';
    pSign.style.marginBottom = sOffset + 'px';
  } else {
    pSign.style.display='none';
  }
  
  if(stampImg){
    pStmp.src=stampImg;
    pStmp.style.display='block';
    const stWidth = gv('stampImgWidth') || '300';
    const stOffset = gv('stampImgOffset') || '0';
    pStmp.style.width = stWidth + 'px';
    pStmp.style.marginTop = (-stOffset) + 'px';
    pStmp.style.marginBottom = stOffset + 'px';
  } else {
    pStmp.style.display='none';
  }
  
  pSBlank.style.display = 'none';

  // LEFT: Customer seal
  const pCS=document.getElementById('p_custSealImg');
  const pCSB=document.getElementById('p_custSealBlank');
  if(customerSealImg){
    pCS.src=customerSealImg;
    pCS.style.display='block';
    pCSB.style.display='none';
  } else {
    pCS.style.display='none';
    pCSB.style.display='none';
  }
}

// ════ SOLAR QUOTATION RENDERER ════
function renderSolarQuotation(isTempPreview, tempData, themeColor, fontFamily, fontSize) {
  const doc = document.getElementById('invoiceDoc');
  if (!doc) return;
  doc.className = 'layout-solar_quotation';
  doc.style.setProperty('--inv-theme', themeColor);
  doc.style.setProperty('--inv-font-size', fontSize + 'px');
  doc.style.setProperty('--inv-font-family', fontFamily);

  const g = (id) => isTempPreview ? (tempData[id] || '') : gv(id);
  const gN = (id, def) => isTempPreview ? (tempData[id] || def || 0) : (+gv(id) || def || 0);

  // Gather data
  const sellerName   = gv('sellerName');
  const sellerAddr   = gv('sellerAddr');
  const sellerEmail  = gv('sellerEmail');
  const sellerPhone  = gv('sellerPhone');
  const sellerGST    = gv('sellerGST');
  const refNo        = g('invNo');
  const date         = formatDate(g('invDate') || getTodayDateString());
  const validRaw     = isTempPreview ? (tempData.invValid || '') : gv('invValid');
  const validStr     = validRaw ? formatDate(validRaw) : '15 Days';
  const systemCap    = isTempPreview ? (tempData.systemCapacity || tempData.otherRef || '') : (gv('systemCapacity') || gv('otherRef') || '');
  const sysCapText   = (systemCap || '').toLowerCase();
  const is1kwActive  = sysCapText.includes('1 kw') || sysCapText.includes('1kw') || sysCapText === '1';
  const is2kwActive  = sysCapText.includes('2 kw') || sysCapText.includes('2kw') || sysCapText === '2';
  const is3kwActive  = sysCapText.includes('3 kw') || sysCapText.includes('3kw') || sysCapText === '3';
  const buyerName    = g('buyerName');
  const buyerPhone   = g('buyerPhone');
  const buyerAddr    = g('buyerAddr');
  const subjectLine  = isTempPreview ? (tempData.subjectLine || '') : gv('subjectLine');
  const invNotes     = g('invNotes');
  const bankName     = gv('bankName');
  const bankHolder   = gv('bankHolder');
  const bankBranch   = gv('bankBranch');
  const bankAcc      = gv('bankAcc');
  const bankIFSC     = gv('bankIFSC');
  const forName      = gv('forName');
  const propName     = gv('propName');
  const propDesig    = gv('propDesig');
  const gc = (id) => {
    if (isTempPreview && tempData && tempData[id] !== undefined) {
      return !!tempData[id];
    }
    const el = document.getElementById(id);
    return el ? el.checked : false;
  };
  



  // Subsidy data
  const sub1Total   = gN('sub1kwTotal', 48000);
  const sub1Central = gN('sub1kwCentral', 30000);
  const sub1State   = gN('sub1kwState', 18000);
  const sub2Total   = gN('sub2kwTotal', 96000);
  const sub2Central = gN('sub2kwCentral', 60000);
  const sub2State   = gN('sub2kwState', 36000);
  const sub3Total   = gN('sub3kwTotal', 130000);
  const sub3Central = gN('sub3kwCentral', 78000);
  const sub3State   = gN('sub3kwState', 52000);

  // Items
  const activeItems = isTempPreview ? (tempData.items || []) : items;

  // Totals
  const tplTaxes = isTempPreview ? tempData.manualTaxes : undefined;
  const {byGST, subtotal, grand} = calcTotals(
    isTempPreview ? activeItems : undefined,
    isTempPreview ? tempData.discount : undefined,
    isTempPreview ? tempData.addCharges : undefined,
    tplTaxes
  );

  // Compute total GST
  let totalGST = 0;
  if (tplTaxes) {
    totalGST = (tplTaxes.cgst5||0)+(tplTaxes.sgst5||0)+(tplTaxes.cgst9||0)+(tplTaxes.sgst9||0);
  } else {
    Object.values(byGST).forEach(v => totalGST += (v.cgst||0) + (v.sgst||0));
  }

  // Build items rows
  let itemRowsHtml = '';
  activeItems.forEach((item, idx) => {
    const rate = +item.rate || 0;
    const qty  = +item.qty  || 1;
    const gstP = +item.gst  || 0;
    const taxable = (item.amount !== undefined ? +item.amount : rate * qty) / (1 + gstP/100);
    const taxAmt  = (item.amount !== undefined ? +item.amount : rate * qty) - taxable;
    const amount  = item.amount !== undefined ? +item.amount : rate * qty;
    
    let extra = '';
    if (item.customFields && Object.keys(item.customFields).length > 0) {
      extra = `<div style="font-size:0.65rem; color:var(--muted); margin-top:2px; display:flex; flex-wrap:wrap; gap:5px; line-height:1.2;">` +
        Object.entries(item.customFields).map(([k, v]) => `<span style="font-style:italic;"><strong>${esc(k)}:</strong> ${esc(v)}</span>`).join(' | ') +
        `</div>`;
    }

    itemRowsHtml += `<tr>
      <td class="left">${esc(item.desc||'')}${extra}</td>
      <td>${esc(item.hsn||'')}</td>
      <td class="right">${rate ? '₹'+fmt(rate) : ''}</td>
      <td>${gstP ? gstP+'%' : '0%'}</td>
      <td>${item.qty !== undefined && item.qty !== '' ? item.qty : ''}</td>
      <td class="right">${taxable ? '₹'+fmt(taxable) : ''}</td>
      <td class="right">${taxAmt ? '₹'+fmt(taxAmt) : ''}</td>
      <td class="right">₹${fmt(amount)}</td>
    </tr>`;
  });

  // Parse notes into bullet list
  const noteLines = invNotes ? invNotes.split('\n').filter(l => l.trim()) : [];
  const termsHtml = noteLines.length > 0
    ? '<ul class="sq-terms-list">' + noteLines.map(l => `<li>${esc(l.replace(/^[-•*]\s*/,''))}</li>`).join('') + '</ul>'
    : '<p style="font-size:9.5px;color:#555;">No terms specified.</p>';

  // Format subsidy amounts
  const fmtSub = (v) => '₹' + fmt(v);

  const html = `<div class="sq-doc">

    <!-- Header — unified green card with meta row inside -->
    <div class="sq-header">
      <!-- Company info row -->
      <div class="sq-header-top">
        <div class="sq-header-left" style="text-align: ${gv('invSellerAlign') || 'left'};">
          <div class="sq-company-name">${esc(sellerName || '')}</div>
          <div class="sq-company-sub">${esc(sellerAddr || '').replace(/\n/g, ' &mdash; ')}</div>
          <div class="sq-company-sub2">${sellerGST ? 'GST: '+esc(sellerGST) : ''}${sellerEmail ? (sellerGST ? '&nbsp;&nbsp;|&nbsp;&nbsp;' : '') + esc(sellerEmail) : ''}</div>
        </div>
        <div class="sq-badge">QUOTATION</div>
      </div>
      <!-- Meta row: Ref No, Date, Valid Upto, System Capacity — inside the green card -->
      <div class="sq-meta-row">
        <div class="sq-meta-cell">
          <div class="sq-meta-label">Ref No.</div>
          <div class="sq-meta-value">${esc(refNo) || '&mdash;'}</div>
        </div>
        <div class="sq-meta-cell">
          <div class="sq-meta-label">Date</div>
          <div class="sq-meta-value">${date}</div>
        </div>
        <div class="sq-meta-cell" style="${gc('showValidUntil') ? '' : 'visibility: hidden;'}">
          <div class="sq-meta-label">Valid Upto</div>
          <div class="sq-meta-value">${esc(validStr)}</div>
        </div>
        <div class="sq-meta-cell" style="${gc('showSystemCapacity') ? '' : 'visibility: hidden;'}">
          <div class="sq-meta-label">System Capacity</div>
          <div class="sq-meta-value">${esc(systemCap) || '3 kW'}</div>
        </div>
      </div>
    </div>

    <!-- Customer Details -->
    <div class="sq-cust-section">
      <div class="sq-cust-title">Customer Details</div>
      <div class="sq-cust-grid">
        <span class="sq-cust-label">CUSTOMER NAME</span>
        <span class="sq-cust-value">${esc(buyerName) || '—'}</span>
        ${buyerPhone ? `
          <span class="sq-cust-label">MOBILE</span>
          <span class="sq-cust-value">${esc(buyerPhone)}</span>
        ` : ''}
      </div>
      ${buyerAddr ? `
        <div style="margin-top:5px;">
          <span class="sq-cust-label" style="font-size:8.5px;display:block;margin-bottom:2px;">ADDRESS</span>
          <div class="sq-cust-addr">${esc(buyerAddr).replace(/\n/g,'<br/>')}</div>
        </div>
      ` : ''}
    </div>

    <!-- Subject -->
    ${gc('showSubjectLine') ? `<div class="sq-subject" style="text-align: ${gv('invSubjectAlign') || 'left'};"><strong>Subject:</strong> ${esc(subjectLine)}</div>` : ''}

    <!-- System Components & Pricing -->
    <div class="sq-items-section">
      <div class="sq-items-header">System Components &amp; Pricing</div>
      <table class="sq-items-table">
        <thead>
          <tr>
            <th class="left" style="width:28%">Item</th>
            <th style="width:10%">HSN/SAC</th>
            <th style="width:10%">Rate</th>
            <th style="width:7%">GST%</th>
            <th style="width:7%">Qty</th>
            <th style="width:12%">Taxable</th>
            <th style="width:10%">Tax</th>
            <th style="width:12%">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRowsHtml}</tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="sq-totals-section">
      <div class="sq-totals-row">
        <span class="sq-tl">Total Taxable Value</span>
        <span class="sq-tv">₹${fmt(subtotal)}</span>
      </div>
      <div class="sq-totals-row">
        <span class="sq-tl">Total GST</span>
        <span class="sq-tv">₹${fmt(totalGST)}</span>
      </div>
      <div class="sq-total-cost-row">
        <span>Total Project Cost (Incl. GST &amp; Installation)</span>
        <span>₹${fmt(grand)}</span>
      </div>
      <div class="sq-payable-bar">
        <span>Total Value Payable</span>
        <span>₹${fmt(grand)}</span>
      </div>
    </div>

    <!-- Subsidy Structure -->
    <div class="sq-subsidy-section" style="${gc('showSubsidyBlock') ? '' : 'display: none;'}">
      <div class="sq-subsidy-title">Subsidy Structure</div>
      <div class="sq-subsidy-grid">
        <div class="sq-sub-box ${is1kwActive ? 'active' : ''}">
          <div class="sq-sub-kw">1 KW${is1kwActive ? ' (THIS PLAN)' : ''}</div>
          <div class="sq-sub-amount">${fmtSub(sub1Total)}</div>
          <div class="sq-sub-breakdown">${fmtSub(sub1Central)} Central +<br/>${fmtSub(sub1State)} Assam State</div>
        </div>
        <div class="sq-sub-box ${is2kwActive ? 'active' : ''}">
          <div class="sq-sub-kw">2 KW${is2kwActive ? ' (THIS PLAN)' : ''}</div>
          <div class="sq-sub-amount">${fmtSub(sub2Total)}</div>
          <div class="sq-sub-breakdown">${fmtSub(sub2Central)} Central +<br/>${fmtSub(sub2State)} Assam State</div>
        </div>
        <div class="sq-sub-box ${is3kwActive ? 'active' : ''}">
          <div class="sq-sub-kw">3 KW${is3kwActive ? ' (THIS PLAN)' : ''}</div>
          <div class="sq-sub-amount">${fmtSub(sub3Total)}</div>
          <div class="sq-sub-breakdown">${fmtSub(sub3Central)} Central +<br/>${fmtSub(sub3State)} Assam State</div>
        </div>
      </div>
    </div>

    <!-- Terms & Conditions -->
    <div class="sq-terms-section" style="text-align: ${gv('invNotesAlign') || 'left'};">
      <div class="sq-terms-title">Terms &amp; Conditions</div>
      ${termsHtml}
    </div>

    <!-- Bank Account Details -->
    ${(bankHolder || bankAcc) ? `
    <div class="sq-bank-section">
      <div class="sq-bank-title">Bank Account Details</div>
      ${bankHolder ? `<div class="sq-bank-row"><strong>A/C Holder:</strong> ${esc(bankHolder)}</div>` : ''}
      ${bankAcc    ? `<div class="sq-bank-row"><strong>A/c No:</strong> ${esc(bankAcc)}</div>` : ''}
      ${bankIFSC   ? `<div class="sq-bank-row"><strong>IFSC Code:</strong> ${esc(bankIFSC)}</div>` : ''}
      ${bankName   ? `<div class="sq-bank-row"><strong>Bank &amp; Branch:</strong> ${esc(bankName)}${bankBranch ? ', ' + esc(bankBranch) : ''}</div>` : ''}
    </div>` : ''}

    <!-- Footer / Signature -->
    <div class="sq-footer">
      <div class="sq-regards">
        <div style="font-size:10px;color:#555;margin-bottom:4px;">Regards,</div>
        <div style="font-weight:700;font-size:11px;">${esc(forName || sellerName || '')}</div>
        <div style="font-size:9.5px;color:#666;margin-top:2px;">${esc(sellerAddr || '').replace(/\n/g,' ')}</div>
      </div>
      <div class="sq-sign-area">
        <div style="font-size:9px;color:#555;">Authorised Signatory</div>
        <div style="position:relative; display:flex; flex-direction:column; align-items:flex-end;">
          ${signatureImg ? `<img src="${signatureImg}" style="width:${gv('signImgWidth') || '140'}px; max-height:120px; margin-top:${-(gv('signImgOffset') || 0)}px; margin-bottom:${gv('signImgOffset') || 0}px; object-fit:contain; display:block;"/>` : ''}
          ${stampImg ? `<img src="${stampImg}" style="width:${gv('stampImgWidth') || '100'}px; max-height:120px; margin-top:${-(gv('stampImgOffset') || 0)}px; margin-bottom:${gv('stampImgOffset') || 0}px; object-fit:contain; display:block;"/>` : ''}
        </div>
        <div style="font-size:10px;font-weight:700;color:var(--inv-theme);">${esc(propName || '')}</div>
        <div style="font-size:9.5px;color:#555;">${esc(propDesig || '')}</div>
      </div>
    </div>
    <div class="sq-auth-bar">Authorised Signatory</div>

  </div>`;

  // Replace the inner d-body content
  const previewWarnBar = document.getElementById('previewWarningBar');
  const warnBarHtml = previewWarnBar ? previewWarnBar.outerHTML : '';
  doc.innerHTML = warnBarHtml + html;

  // Re-attach warning bar events
  const wb = doc.querySelector('#previewWarningBar');
  if (wb) wb.style.display = isTempPreview ? 'flex' : 'none';
  const sidebarOverlay = document.getElementById('sidebarPreviewOverlay');
  if (sidebarOverlay) sidebarOverlay.style.display = isTempPreview ? 'flex' : 'none';
}

// ════ PROFILE SAVE/LOAD ════
function saveProfile(){
  const profile={};
  ['forName','sellerName','sellerAddr','sellerEmail','sellerPhone','sellerGST','sellerPAN',
   'propName','propDesig',
   'bankName','bankBranch','bankHolder','bankAcc','bankIFSC','bankType','bankGST','declText',
   'signImgWidth', 'signImgOffset', 'stampImgWidth', 'stampImgOffset'].forEach(id=>{
    profile[id]=gv(id);
  });
  if(signatureImg)    profile.signatureImg=signatureImg;
  if(stampImg)        profile.stampImg=stampImg;
  if(companyLogo)     profile.companyLogo=companyLogo;
  if(customerSealImg) profile.customerSealImg=customerSealImg;
  localStorage.setItem('inv_profile',JSON.stringify(profile));
  toast('💾 Company profile saved!');
  renderDashboardTemplates();
}

function loadProfile(){
  const raw=localStorage.getItem('inv_profile');
  if(!raw) return;
  const p=JSON.parse(raw);
  ['forName','sellerName','sellerAddr','sellerEmail','sellerPhone','sellerGST','sellerPAN',
   'propName','propDesig',
   'bankName','bankBranch','bankHolder','bankAcc','bankIFSC','bankType','bankGST','declText',
   'signImgWidth', 'signImgOffset', 'stampImgWidth', 'stampImgOffset'].forEach(id=>{
    const el=document.getElementById(id);
    if(el&&p[id]!==undefined) el.value=p[id];
  });
  if(p.signatureImg)  { signatureImg=p.signatureImg;     setImgPreview('signPreview',signatureImg); }
  if(p.stampImg)      { stampImg=p.stampImg;             setImgPreview('stampPreview',stampImg); }
  if(p.companyLogo)   { companyLogo=p.companyLogo;       setImgPreview('logoPreview',companyLogo); }
  if(p.customerSealImg){ customerSealImg=p.customerSealImg; setImgPreview('custSealPreview',customerSealImg); }
}

function updateSignatureSettings() {
  updatePreview();
}

// ════ IMAGE UPLOAD ════
function uploadImage(input,boxId,previewId,storeKey){
  const file=input.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    const b64=e.target.result;
    if(storeKey==='signatureImg')   signatureImg=b64;
    if(storeKey==='stampImg')       stampImg=b64;
    if(storeKey==='companyLogo')    companyLogo=b64;
    if(storeKey==='customerSealImg')customerSealImg=b64;
    setImgPreview(previewId,b64);
    updatePreview();
    toast('✅ Image uploaded!');
  };
  reader.readAsDataURL(file);
}
function setImgPreview(id,src){ const el=document.getElementById(id); if(el){el.src=src;el.style.display='block';} }
function clearImage(previewId,storeKey){
  if(storeKey==='signatureImg')   signatureImg=null;
  if(storeKey==='stampImg')       stampImg=null;
  if(storeKey==='companyLogo')    companyLogo=null;
  if(storeKey==='customerSealImg')customerSealImg=null;
  const el=document.getElementById(previewId);
  if(el){ el.src=''; el.style.display='none'; }
  updatePreview(); toast('Image removed');
}

// ════ CLEAR INVOICE ════
function clearInvoice(){
  if(!confirm('Clear invoice fields? (Company profile kept)')) return;
  ['buyerName','buyerPhone','buyerGST','buyerAddr','termsDelivery',
   'invNo','supplierRef','buyerOrderNo','otherRef','invNotes','chargesNote',
   'subjectLine','payMode','systemCapacity','invValid',
   'sub1kwTotal','sub1kwCentral','sub1kwState',
   'sub2kwTotal','sub2kwCentral','sub2kwState',
   'sub3kwTotal','sub3kwCentral','sub3kwState'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  
  const dateEl = document.getElementById('invDate');
  if(dateEl) dateEl.value = getTodayDateString();
  const docTypeEl = document.getElementById('docType');
  if(docTypeEl) docTypeEl.value = 'TAX INVOICE';
  
  document.getElementById('discount').value='0';
  document.getElementById('addCharges').value='0';
  
  const visibilityToggles = [
    'showSubjectLine', 'showValidUntil', 'showSystemCapacity',
    'showSupplierRef', 'showPayMode', 'showBuyerOrderNo',
    'showOtherRef', 'showSubsidyBlock', 'overrideTaxes'
  ];
  visibilityToggles.forEach(tId => {
    const el = document.getElementById(tId);
    if (el) el.checked = false;
  });
  
  const overFields = document.getElementById('manualTaxFields');
  if(overFields) overFields.style.display = 'none';

  document.querySelectorAll('.tpl-list-item').forEach(c=>c.classList.remove('active-tpl'));
  loadedTemplateId = null;
  updateTemplateUpdateButtons();
  document.getElementById('tplSaveName').value = '';
  items=[]; renderItemsForm(); 
  updatePreview();
  toast('🆕 Invoice cleared!');
}

// ════ HELPERS ════
function getTodayDateString(){
  const d=new Date();
  const yyyy=d.getFullYear();
  const mm=String(d.getMonth()+1).padStart(2,'0');
  const dd=String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}
function gv(id){ const el=document.getElementById(id); return el?el.value||'':''; }
function sp(id,v){ const el=document.getElementById(id); if(el) el.textContent=v; }
function sh(id,v){ const el=document.getElementById(id); if(el) el.innerHTML=v; }
function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmt(n){ return (+n||0).toFixed(2); }
function formatDate(s){ if(!s) return ''; try{ return new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }catch(e){ return s; } }
function switchRightTab(tab) {
  const tplTab = document.getElementById('tabRightTpl');
  const designTab = document.getElementById('tabRightDesign');
  const tplPanel = document.getElementById('panelRightTpl');
  const designPanel = document.getElementById('panelRightDesign');
  
  if (!tplTab || !designTab || !tplPanel || !designPanel) return;
  
  if (tab === 'tpl') {
    tplTab.classList.add('active');
    designTab.classList.remove('active');
    tplPanel.style.display = '';
    designPanel.style.display = 'none';
  } else {
    tplTab.classList.remove('active');
    designTab.classList.add('active');
    tplPanel.style.display = 'none';
    designPanel.style.display = '';
  }
}

function openDesignPanel() {
  const rSidebar = document.querySelector('.sidebar-right');
  if (rSidebar) {
    rSidebar.classList.remove('hidden-sidebar');
    const handle = document.getElementById('resizeHandleRight');
    if (handle) handle.style.display = 'block';
  }
  switchRightTab('design');
}

function createNewInvoiceBtn() {
  clearInvoice();
  switchNavTab('form');
  toast('🆕 Created a new invoice draft!');
}

let selectedTplId = null;
let previewedTplId = null;
let ORIGINAL_INVOICE_HTML = '';
let currentLayoutPreset = 'modern';

function getInitials(name) {
  const cleanName = (name || 'Draft Client').trim().toUpperCase();
  const words = cleanName.split(/\s+/);
  let initials = '';
  if (words.length > 0 && words[0]) initials += words[0][0];
  if (words.length > 1 && words[1]) initials += words[1][0];
  if (!initials) initials = '?';
  
  const colors = [
    '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', 
    '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', 
    '#84cc16', '#eab308', '#f97316', '#ef4444'
  ];
  const charCode = cleanName.charCodeAt(0) || 0;
  const color = colors[charCode % colors.length];
  
  return `<div class="client-avatar" style="background:${color}">${esc(initials)}</div>`;
}

function getDocBadge(type) {
  const cleanType = (type || 'TAX INVOICE').trim().toUpperCase();
  let badgeClass = 'invoice';
  if (cleanType === 'QUOTATION') badgeClass = 'quotation';
  else if (cleanType === 'PROFORMA INVOICE') badgeClass = 'proforma';
  else if (cleanType === 'DELIVERY CHALLAN') badgeClass = 'challan';
  else if (cleanType === 'ESTIMATE') badgeClass = 'estimate';
  
  return `<span class="doc-badge ${badgeClass}">${esc(cleanType)}</span>`;
}

function renderSalesChart(templates) {
  const container = document.getElementById('salesChartWrapper');
  if (!container) return;
  
  if (!templates || templates.length === 0) {
    container.innerHTML = `<div style="font-size:0.75rem; color:var(--muted)">No templates to display in the chart.</div>`;
    return;
  }
  
  const width = 500;
  const height = 180;
  const paddingLeft = 45;
  const paddingBottom = 24;
  const paddingTop = 20;
  const paddingRight = 20;
  
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;
  
  const maxVal = Math.max(...templates.map(t => t.amount || 0), 1000);
  
  const yTicks = 4;
  let yAxisHtml = '';
  for (let i = 0; i <= yTicks; i++) {
    const val = Math.round((maxVal / yTicks) * i);
    const y = paddingTop + chartH - (chartH / yTicks) * i;
    yAxisHtml += `<text x="${paddingLeft - 8}" y="${y + 3}" class="chart-text" text-anchor="end">₹${(val / 1000).toFixed(0)}k</text>`;
    yAxisHtml += `<line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" class="chart-axis" stroke-dasharray="3,3" opacity="0.3"></line>`;
  }
  
  const barCount = templates.length;
  const gap = 16;
  const barW = Math.max((chartW - gap * (barCount - 1)) / barCount, 8);
  
  let barsHtml = '';
  let xLabelsHtml = '';
  
  templates.forEach((tpl, idx) => {
    const val = tpl.amount || 0;
    const barH = (val / maxVal) * chartH;
    const x = paddingLeft + idx * (barW + gap);
    const y = paddingTop + chartH - barH;
    
    barsHtml += `
      <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" class="svg-bar" onclick="showPreviewDirectly('${tpl.id}')">
        <title>${esc(tpl.name)}: ₹${fmt(val)}</title>
      </rect>
      <text x="${x + barW / 2}" y="${y - 6}" class="chart-text" text-anchor="middle" style="fill:#06d6a0; font-weight:700">₹${(val/1000).toFixed(0)}k</text>
    `;
    
    let shortName = tpl.name;
    if (shortName.length > 10) shortName = shortName.substring(0, 8) + '...';
    xLabelsHtml += `<text x="${x + barW / 2}" y="${height - 8}" class="chart-text" text-anchor="middle" title="${esc(tpl.name)}">${esc(shortName)}</text>`;
  });
  
  container.innerHTML = `
    <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" style="overflow:visible">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c32027" />
          <stop offset="100%" stop-color="#ef4444" stop-opacity="0.2" />
        </linearGradient>
        <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ef4444" />
          <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.5" />
        </linearGradient>
      </defs>
      
      <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${height - paddingBottom}" class="chart-axis"></line>
      <line x1="${paddingLeft}" y1="${height - paddingBottom}" x2="${width - paddingRight}" y2="${height - paddingBottom}" class="chart-axis"></line>
      
      ${yAxisHtml}
      ${barsHtml}
      ${xLabelsHtml}
    </svg>
  `;
}

function renderGstBreakdown(templates) {
  const container = document.getElementById('dashGstBreakdown');
  if (!container) return;
  
  const slabs = { 5: 0, 12: 0, 18: 0, 28: 0, 0: 0 };
  
  templates.forEach(tpl => {
    let tplDisc = tpl.discount || 0;
    let tplChrg = tpl.addCharges || 0;
    let tplTaxes = tpl.manualTaxes;
    
    const totals = calcTotals(tpl.items || [], tplDisc, tplChrg, tplTaxes);
    
    if (totals.byGST) {
      Object.entries(totals.byGST).forEach(([g, v]) => {
        const slab = +g;
        const cgst = v.cgst || 0;
        const sgst = v.sgst || 0;
        const taxVal = cgst + sgst;
        if (slabs[slab] !== undefined) {
          slabs[slab] += taxVal;
        } else {
          slabs[slab] = taxVal;
        }
      });
    }
  });
  
  const activeSlabs = Object.entries(slabs).filter(([_, val]) => val > 0);
  
  if (activeSlabs.length === 0) {
    container.innerHTML = `<div style="font-size:0.75rem; color:var(--muted); text-align:center; padding:10px 0;">No taxes collected yet.</div>`;
    return;
  }
  
  const maxSlabAmount = Math.max(...activeSlabs.map(([_, v]) => v), 100);
  
  let html = '';
  activeSlabs.sort((a,b) => b[1]-a[1]).forEach(([slab, amount]) => {
    const pct = (amount / maxSlabAmount) * 100;
    html += `
      <div class="gst-progress-item">
        <div class="gst-progress-lbl">
          <span>GST @${slab}% Slab</span>
          <span style="font-weight:700; color:var(--accent)">₹${fmt(amount)}</span>
        </div>
        <div class="gst-progress-bg">
          <div class="gst-progress-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

function showPreviewDirectly(id) {
  loadTemplate(id);
}

function clearPreviewState() {
  previewedTplId = null;
  const warningBar = document.getElementById('previewWarningBar');
  if (warningBar) warningBar.style.display = 'none';
  updatePreview();
}

function applyPreviewedTpl() {
  if (!previewedTplId) return;
  const id = previewedTplId;
  previewedTplId = null;
  const warningBar = document.getElementById('previewWarningBar');
  if (warningBar) warningBar.style.display = 'none';
  loadTemplate(id);
  toast('⚡ Template Applied & Loaded!');
}

function renderDashboardTemplates(){
  const tbody = document.getElementById('dashTemplatesBody'); if(!tbody) return;
  const all = JSON.parse(localStorage.getItem('inv_custom_tpls')||'[]');
  tbody.innerHTML='';
  
  let totalSales = 0;
  all.forEach(tpl=>{
    totalSales += tpl.amount || 0;
    const isBuiltin = BUILTIN_TEMPLATES.some(b=>b.id===tpl.id);
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border2)';
    tr.style.cursor = 'pointer';
    tr.onclick = (e) => {
      if (e.target.closest('.action-btn')) return;
      showPreviewDirectly(tpl.id);
    };
    
    tr.innerHTML = `
      <td style="padding:12px 8px; font-weight:600; color:var(--text);">📋 ${esc(tpl.name)}</td>
      <td style="padding:12px 8px;">${getDocBadge(tpl.docType)}</td>
      <td style="padding:12px 8px;">
        <div class="client-cell">
          ${getInitials(tpl.buyerName)}
          <span>${esc(tpl.buyerName || 'Draft Client')}</span>
        </div>
      </td>
      <td style="padding:12px 8px; text-align:right; font-weight:700; color:#06d6a0;">₹${fmt(tpl.amount||0)}</td>
      <td style="padding:12px 8px; text-align:center; display:flex; gap:6px; justify-content:center; align-items:center;">
        <button class="action-btn btn btn-blue btn-sm" style="display:inline-flex; align-items:center; gap:4px; padding:4px 8px; font-size:0.7rem; border-radius:5px;" onclick="printSingleTemplateDirectly('${tpl.id}', event)">🖨️ Print</button>
        <button class="action-btn btn btn-green btn-sm" style="display:inline-flex; align-items:center; gap:4px; padding:4px 8px; font-size:0.7rem; border-radius:5px;" onclick="pdfSingleTemplateDirectly('${tpl.id}', event)">📄 PDF</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  renderSalesChart(all);
  renderGstBreakdown(all);
  
  document.getElementById('dashTemplateCount').textContent = all.length;
  document.getElementById('dashSalesVolume').textContent = '₹' + totalSales.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  
  const sellerName = gv('sellerName') || 'My Business';
  const sellerGST = gv('sellerGST') || 'Not Set';
  document.getElementById('dashCompanyName').textContent = sellerName;
  document.getElementById('dashCompanyGST').textContent = 'GSTIN: ' + sellerGST;
  document.getElementById('dashCompanySub').textContent = `Manage Invoices for ${sellerName}`;
  
  const sideProfileName = document.getElementById('sideProfileName');
  if (sideProfileName) sideProfileName.textContent = sellerName;
}

function switchNavTab(tab) {
  // Update left nav items active classes
  const navItems = ['Dash', 'Form', 'Clients', 'Items', 'Company', 'Bank', 'Settings'];
  navItems.forEach(item => {
    const el = document.getElementById('nav' + item);
    if (el) el.classList.remove('active');
  });
  
  let activeId = 'nav' + tab.charAt(0).toUpperCase() + tab.slice(1);
  if (tab === 'dashboard') activeId = 'navDash';
  const activeNavItem = document.getElementById(activeId);
  if (activeNavItem) activeNavItem.classList.add('active');
  
  // Get components
  const sidebar = document.querySelector('.sidebar');
  const previewArea = document.querySelector('.preview-area');
  const dashContainer = document.getElementById('panelDashboard');
  const invoiceDoc = document.getElementById('invoiceDoc');
  const previewTopbar = document.querySelector('.preview-topbar');
  const rSidebar = document.querySelector('.sidebar-right');
  const handleLeft = document.getElementById('resizeHandle');
  const handleRight = document.getElementById('resizeHandleRight');
  const pageTitle = document.getElementById('topbarPageTitle');

  if (tab === 'dashboard') {
    // Hide editor layout components
    if (sidebar) sidebar.style.display = 'none';
    if (handleLeft) handleLeft.style.display = 'none';
    
    // Hide right templates/styling sidebar on dashboard as it is redundant there and ruins layout
    if (rSidebar) {
      rSidebar.classList.add('hidden-sidebar');
      if (handleRight) handleRight.style.display = 'none';
    }
    
    // Show dashboard inside preview area
    if (invoiceDoc) invoiceDoc.style.display = 'none';
    if (previewTopbar) previewTopbar.style.display = 'none';
    if (dashContainer) dashContainer.style.display = 'flex';
    
    if (pageTitle) pageTitle.textContent = 'Dashboard';
    renderDashboardTemplates();
  } else {
    // Show editor layout components
    if (sidebar) sidebar.style.display = 'flex';
    if (handleLeft) handleLeft.style.display = 'block';
    
    // Hide dashboard, show invoice doc and live preview bar
    if (dashContainer) dashContainer.style.display = 'none';
    if (invoiceDoc) invoiceDoc.style.display = 'block';
    if (previewTopbar) previewTopbar.style.display = 'flex';
    
    // Switch left sidebar panel
    const panels = {
      'form': 'Form',
      'company': 'Company',
      'bank': 'Bank',
      'clients': 'Clients',
      'items': 'Items',
      'settings': 'Settings'
    };
    Object.entries(panels).forEach(([key, val]) => {
      const el = document.getElementById('panel' + val);
      if (el) {
        if (key === tab) el.style.display = '';
        else el.style.display = 'none';
      }
    });
    
    if (pageTitle) {
      if (tab === 'form') pageTitle.textContent = 'Invoice Editor';
      else if (tab === 'company') pageTitle.textContent = 'Company Profile';
      else if (tab === 'bank') pageTitle.textContent = 'Bank & Terms';
      else if (tab === 'clients') pageTitle.textContent = 'Clients Database';
      else if (tab === 'items') pageTitle.textContent = 'Items & Groups';
      else if (tab === 'settings') pageTitle.textContent = 'Settings & Security';
    }

    if (tab === 'clients') {
      renderClientsDirectory();
    }
    if (tab === 'items') {
      renderItemsDirectory();
    }

    if (tab === 'form') {
      // Auto open right templates sidebar
      if (rSidebar) {
        rSidebar.classList.remove('hidden-sidebar');
        if (handleRight) handleRight.style.display = 'block';
      }
      switchRightTab('tpl');
    } else {
      // Auto open design sidebar or close it
      if (rSidebar) {
        rSidebar.classList.remove('hidden-sidebar');
        if (handleRight) handleRight.style.display = 'block';
      }
      switchRightTab('design');
    }
  }
  updateTemplateUpdateButtons();
}
function toggleSec(head){ const b=head.nextElementSibling,t=head.querySelector('.sec-toggle'); if(!b) return; b.classList.toggle('hidden'); t.classList.toggle('open',!b.classList.contains('hidden')); }
function toast(msg,d=2800){ const t=document.getElementById('toast'); document.getElementById('toastMsg').textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),d); }

// Number to words
function numberToWords(n){
  n=Math.round(n); if(!n) return 'ZERO ONLY';
  const o=['','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN'];
  const t=['','','TWENTY','THIRTY','FORTY','FIFTY','SIXTY','SEVENTY','EIGHTY','NINETY'];
  function h(n){ if(!n)return''; if(n<20)return o[n]+' '; if(n<100)return t[Math.floor(n/10)]+(n%10?' '+o[n%10]:'')+' '; if(n<1000)return o[Math.floor(n/100)]+' HUNDRED '+h(n%100); if(n<100000)return h(Math.floor(n/1000))+'THOUSAND '+h(n%1000); if(n<10000000)return h(Math.floor(n/100000))+'LAKH '+h(n%100000); return h(Math.floor(n/10000000))+'CRORE '+h(n%10000000); }
  return 'INR '+h(n).trim()+' ONLY';
}

// PDF
function printPDF(){
  exportToPDFDirect();
}

let currentPdfBlobUrl = null;
let currentPdfFilename = "";

function closePdfPreviewModal() {
  const modal = document.getElementById('pdfPreviewModal');
  if (modal) modal.style.display = 'none';
  
  const iframe = document.getElementById('pdfPreviewIframe');
  if (iframe) iframe.src = 'about:blank';
  
  if (currentPdfBlobUrl) {
    URL.revokeObjectURL(currentPdfBlobUrl);
    currentPdfBlobUrl = null;
  }
}

function exportToPDFDirect() {
  const element = document.getElementById('invoiceDoc');
  if(!element) return;
  
  const docType = gv('docType') || 'INVOICE';
  const invNo = gv('invNo') || 'DRAFT';
  
  const filename = `${docType.replace(/\s+/g, '_')}_${invNo.replace(/\s+/g, '_')}.pdf`;
  currentPdfFilename = filename;
  
  // Save original styles to restore later
  const originalWidth = element.style.width;
  const originalBoxShadow = element.style.boxShadow;
  const originalBorderRadius = element.style.borderRadius;
  
  // Apply direct high-fidelity print specifications temporarily
  element.style.width = '794px'; // Exact 210mm print scaling width
  element.style.boxShadow = 'none';
  element.style.borderRadius = '0';
  
  const opt = {
    margin:       0, // Zero margins for full bleed matching the live preview
    filename:     filename,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { 
      scale: 2, 
      useCORS: true, 
      logging: false, 
      letterRendering: true,
      scrollY: 0,
      scrollX: 0
    },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' },
    pagebreak:    { mode: ['css', 'legacy'] }
  };
  
  toast('⏳ Generating PDF preview...');
  
  // High-fidelity promise chain
  html2pdf().set(opt).from(element).toPdf().get('pdf').then((pdf) => {
    const blob = pdf.output('blob');
    
    // Restore layout styles
    element.style.width = originalWidth;
    element.style.boxShadow = originalBoxShadow;
    element.style.borderRadius = originalBorderRadius;
    
    currentPdfBlobUrl = URL.createObjectURL(blob);
    
    const iframe = document.getElementById('pdfPreviewIframe');
    if (iframe) iframe.src = currentPdfBlobUrl;
    
    const modal = document.getElementById('pdfPreviewModal');
    if (modal) modal.style.display = 'flex';
    
    toast('✅ PDF preview ready!');
  }).catch(err => {
    // Restore layout styles on error
    element.style.width = originalWidth;
    element.style.boxShadow = originalBoxShadow;
    element.style.borderRadius = originalBorderRadius;
    
    console.error(err);
    toast('❌ PDF preview generation failed!');
  });
}

function getFormState() {
  const state = {
    loadedTemplateId: loadedTemplateId,
    items: JSON.stringify(items),
    fields: {},
    checkboxes: {}
  };
  
  const fieldsList = [
    'docType','invNo','invDate','invValid','supplierRef','payMode',
    'buyerOrderNo','otherRef','buyerName','buyerPhone','buyerGST','buyerAddr',
    'termsDelivery','discount','addCharges','chargesNote','invNotes',
    'systemCapacity','subjectLine', 'invThemeColor', 'invThemePreset', 'invFontSize', 
    'invFontFamily', 'invLayoutPreset', 'invTitleAlign', 'invSubjectAlign', 
    'invNotesAlign', 'invSellerAlign',
    'sub1kwTotal','sub1kwCentral','sub1kwState',
    'sub2kwTotal','sub2kwCentral','sub2kwState',
    'sub3kwTotal','sub3kwCentral','sub3kwState',
    'mSubtotal', 'mGrand', 'mCgst5', 'mSgst5', 'mCgst9', 'mSgst9', 'mCgst14', 'mSgst14', 'mIgst5', 'mIgst18', 'mIgst28'
  ];
  
  fieldsList.forEach(f => {
    const el = document.getElementById(f);
    if (el) state.fields[f] = el.value;
  });
  
  const checkList = [
    'overrideTaxes', 'showSubjectLine', 'showValidUntil', 'showSystemCapacity',
    'showSupplierRef', 'showPayMode', 'showBuyerOrderNo', 'showOtherRef', 'showSubsidyBlock'
  ];
  
  checkList.forEach(c => {
    const el = document.getElementById(c);
    if (el) state.checkboxes[c] = el.checked;
  });
  
  return state;
}

function restoreFormState(state) {
  if (!state) return;
  
  loadedTemplateId = state.loadedTemplateId;
  items = JSON.parse(state.items);
  
  Object.keys(state.fields).forEach(f => {
    const el = document.getElementById(f);
    if (el) el.value = state.fields[f];
  });
  
  Object.keys(state.checkboxes).forEach(c => {
    const el = document.getElementById(c);
    if (el) el.checked = state.checkboxes[c];
  });
  
  const overCb = document.getElementById('overrideTaxes');
  const overFields = document.getElementById('manualTaxFields');
  if (overCb && overFields) {
    overFields.style.display = overCb.checked ? 'flex' : 'none';
  }
  
  renderItemsForm();
  updateDesignSettings();
  updatePreview();
}

function generateBulkInvoicesHTML() {
  const allTemplates = JSON.parse(localStorage.getItem('inv_custom_tpls') || '[]');
  if (allTemplates.length === 0) {
    alert("No saved templates found! Please save some templates first.");
    return null;
  }

  const savedState = getFormState();

  const bulkWrapper = document.createElement('div');
  bulkWrapper.style.display = 'flex';
  bulkWrapper.style.flexDirection = 'column';
  bulkWrapper.style.gap = '20px';
  bulkWrapper.style.background = '#ffffff';

  allTemplates.forEach((tpl, idx) => {
    const fieldsList = [
      'docType','invNo','invValid','supplierRef','payMode',
      'buyerOrderNo','otherRef','buyerName','buyerPhone','buyerGST','buyerAddr',
      'termsDelivery','discount','addCharges','chargesNote','invNotes',
      'systemCapacity','subjectLine', 'invThemeColor', 'invThemePreset', 'invFontSize', 
      'invFontFamily', 'invLayoutPreset', 'invTitleAlign', 'invSubjectAlign', 
      'invNotesAlign', 'invSellerAlign',
      'sub1kwTotal','sub1kwCentral','sub1kwState',
      'sub2kwTotal','sub2kwCentral','sub2kwState',
      'sub3kwTotal','sub3kwCentral','sub3kwState'
    ];
    
    fieldsList.forEach(f => {
      const el = document.getElementById(f);
      if (el) {
        const valKey = (f === 'invLayoutPreset') ? 'layoutPreset' : f;
        if (tpl[valKey] !== undefined && tpl[valKey] !== null) {
          el.value = tpl[valKey];
        } else {
          if (f === 'invThemeColor' || f === 'invThemePreset') {
            el.value = '#16a34a';
          } else if (f === 'invFontSize') {
            el.value = '11';
          } else if (f === 'invFontFamily') {
            el.value = "'Times New Roman', Times, serif";
          } else if (f === 'invLayoutPreset') {
            el.value = 'modern';
          } else {
            el.value = (f === 'invTitleAlign') ? 'center' : ((f === 'invSubjectAlign' || f === 'invNotesAlign' || f === 'invSellerAlign') ? 'left' : '');
          }
        }
      }
    });

    const dateEl = document.getElementById('invDate');
    if (dateEl) {
      dateEl.value = tpl.invDate || getTodayDateString();
    }

    const checkList = [
      'showSubjectLine', 'showValidUntil', 'showSystemCapacity',
      'showSupplierRef', 'showPayMode', 'showBuyerOrderNo', 'showOtherRef', 'showSubsidyBlock'
    ];
    checkList.forEach(c => {
      const el = document.getElementById(c);
      if (el) el.checked = tpl[c] !== undefined ? !!tpl[c] : true;
    });

    const overCb = document.getElementById('overrideTaxes');
    const overFields = document.getElementById('manualTaxFields');
    if (overCb && overFields) {
      if (tpl.manualTaxes) {
        overCb.checked = true;
        overFields.style.display = 'flex';
        
        const taxFields = {
          'mSubtotal': tpl.manualTaxes.subtotal,
          'mGrand': tpl.manualTaxes.grand,
          'mCgst5': tpl.manualTaxes.cgst5,
          'mSgst5': tpl.manualTaxes.sgst5,
          'mCgst9': tpl.manualTaxes.cgst9,
          'mSgst9': tpl.manualTaxes.sgst9,
          'mCgst14': tpl.manualTaxes.cgst14,
          'mSgst14': tpl.manualTaxes.sgst14,
          'mIgst5': tpl.manualTaxes.igst5,
          'mIgst18': tpl.manualTaxes.igst18,
          'mIgst28': tpl.manualTaxes.igst28
        };
        Object.entries(taxFields).forEach(([id, val]) => {
          const el = document.getElementById(id);
          if (el) el.value = val || '';
        });
      } else {
        overCb.checked = false;
        overFields.style.display = 'none';
      }
    }

    items = (tpl.items || []).map(i => ({...i}));
    renderItemsForm();

    updateDesignSettings();
    updatePreview();

    const invoiceDoc = document.getElementById('invoiceDoc');
    const clone = invoiceDoc.cloneNode(true);
    
    // Ensure the clone is visible in print output (overriding dashboard's display: none)
    clone.style.display = 'block';
    
    const warningBar = clone.querySelector('#previewWarningBar');
    if (warningBar) warningBar.remove();

    if (idx > 0) {
      clone.style.pageBreakBefore = 'always';
      clone.style.breakBefore = 'page';
    }
    
    clone.style.width = '794px';
    clone.style.boxShadow = 'none';
    clone.style.borderRadius = '0';
    clone.style.border = 'none';
    
    bulkWrapper.appendChild(clone);
  });

  restoreFormState(savedState);
  return bulkWrapper;
}

function bulkPrintAll() {
  const bulkWrapper = generateBulkInvoicesHTML();
  if (!bulkWrapper) return;
  
  let iframe = document.getElementById('bulkPrintIframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'bulkPrintIframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
  }
  
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <html>
      <head>
        <title>Bulk Print Invoices</title>
        <style>
          body { margin: 0; background: #fff; }
          .d-items tr, .d-bottom, .d-row3, .d-row4, .d-auth-bar {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          ${Array.from(document.querySelectorAll('style')).map(s => s.innerHTML).join('\n')}
        </style>
      </head>
      <body>
        ${bulkWrapper.innerHTML}
      </body>
    </html>
  `);
  doc.close();
  
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 500);
}

function bulkExportAllPDF() {
  const bulkWrapper = generateBulkInvoicesHTML();
  if (!bulkWrapper) return;
  
  const opt = {
    margin:       0,
    filename:     `Bulk_Invoices_${Date.now()}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { 
      scale: 2, 
      useCORS: true, 
      logging: false, 
      letterRendering: true,
      scrollY: 0,
      scrollX: 0
    },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' },
    pagebreak:    { mode: ['css', 'legacy'] }
  };
  
  toast('⏳ Generating Bulk PDF (all saved templates)...');
  
  html2pdf().set(opt).from(bulkWrapper).toPdf().get('pdf').then((pdf) => {
    const blob = pdf.output('blob');
    currentPdfBlobUrl = URL.createObjectURL(blob);
    currentPdfFilename = opt.filename;
    
    const iframe = document.getElementById('pdfPreviewIframe');
    if (iframe) iframe.src = currentPdfBlobUrl;
    
    const modal = document.getElementById('pdfPreviewModal');
    if (modal) modal.style.display = 'flex';
    
    toast('✅ Bulk PDF preview ready!');
  }).catch(err => {
    console.error(err);
    toast('❌ Bulk PDF generation failed!');
  });
}

function printSingleTemplateDirectly(id, event) {
  if (event) event.stopPropagation();
  
  const allTemplates = getAllTemplates();
  const tpl = allTemplates.find(t => t.id === id);
  if (!tpl) {
    toast('⚠️ Template not found!');
    return;
  }

  const savedState = getFormState();
  
  const fieldsList = [
    'docType','invNo','invValid','supplierRef','payMode',
    'buyerOrderNo','otherRef','buyerName','buyerPhone','buyerGST','buyerAddr',
    'termsDelivery','discount','addCharges','chargesNote','invNotes',
    'systemCapacity','subjectLine', 'invThemeColor', 'invThemePreset', 'invFontSize', 
    'invFontFamily', 'invLayoutPreset', 'invTitleAlign', 'invSubjectAlign', 
    'invNotesAlign', 'invSellerAlign',
    'sub1kwTotal','sub1kwCentral','sub1kwState',
    'sub2kwTotal','sub2kwCentral','sub2kwState',
    'sub3kwTotal','sub3kwCentral','sub3kwState'
  ];
  
  fieldsList.forEach(f => {
    const el = document.getElementById(f);
    if (el) {
      const valKey = (f === 'invLayoutPreset') ? 'layoutPreset' : f;
      if (tpl[valKey] !== undefined && tpl[valKey] !== null) {
        el.value = tpl[valKey];
      } else {
        if (f === 'invThemeColor' || f === 'invThemePreset') {
          el.value = '#16a34a';
        } else if (f === 'invFontSize') {
          el.value = '11';
        } else if (f === 'invFontFamily') {
          el.value = "'Times New Roman', Times, serif";
        } else if (f === 'invLayoutPreset') {
          el.value = 'modern';
        } else {
          el.value = (f === 'invTitleAlign') ? 'center' : ((f === 'invSubjectAlign' || f === 'invNotesAlign' || f === 'invSellerAlign') ? 'left' : '');
        }
      }
    }
  });

  const dateEl = document.getElementById('invDate');
  if (dateEl) {
    dateEl.value = tpl.invDate || getTodayDateString();
  }

  const checkList = [
    'showSubjectLine', 'showValidUntil', 'showSystemCapacity',
    'showSupplierRef', 'showPayMode', 'showBuyerOrderNo', 'showOtherRef', 'showSubsidyBlock'
  ];
  checkList.forEach(c => {
    const el = document.getElementById(c);
    if (el) el.checked = tpl[c] !== undefined ? !!tpl[c] : true;
  });

  const overCb = document.getElementById('overrideTaxes');
  const overFields = document.getElementById('manualTaxFields');
  if (overCb && overFields) {
    if (tpl.manualTaxes) {
      overCb.checked = true;
      overFields.style.display = 'flex';
      const taxFields = {
        'mSubtotal': tpl.manualTaxes.subtotal,
        'mGrand': tpl.manualTaxes.grand,
        'mCgst5': tpl.manualTaxes.cgst5,
        'mSgst5': tpl.manualTaxes.sgst5,
        'mCgst9': tpl.manualTaxes.cgst9,
        'mSgst9': tpl.manualTaxes.sgst9,
        'mCgst14': tpl.manualTaxes.cgst14,
        'mSgst14': tpl.manualTaxes.sgst14,
        'mIgst5': tpl.manualTaxes.igst5,
        'mIgst18': tpl.manualTaxes.igst18,
        'mIgst28': tpl.manualTaxes.igst28
      };
      Object.entries(taxFields).forEach(([fid, val]) => {
        const el = document.getElementById(fid);
        if (el) el.value = val || '';
      });
    } else {
      overCb.checked = false;
      overFields.style.display = 'none';
    }
  }

  items = (tpl.items || []).map(i => ({...i}));
  renderItemsForm();
  updateDesignSettings();
  updatePreview();

  const invoiceDoc = document.getElementById('invoiceDoc');
  const clone = invoiceDoc.cloneNode(true);
  clone.style.display = 'block';
  clone.style.width = '794px';
  clone.style.boxShadow = 'none';
  clone.style.borderRadius = '0';
  clone.style.border = 'none';
  
  const warningBar = clone.querySelector('#previewWarningBar');
  if (warningBar) warningBar.remove();

  let iframe = document.getElementById('bulkPrintIframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'bulkPrintIframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
  }
  
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <html>
      <head>
        <title>Print Template</title>
        <style>
          body { margin: 0; background: #fff; }
          .d-items tr, .d-bottom, .d-row3, .d-row4, .d-auth-bar {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          ${Array.from(document.querySelectorAll('style')).map(s => s.innerHTML).join('\n')}
        </style>
      </head>
      <body>
        ${clone.outerHTML}
      </body>
    </html>
  `);
  doc.close();
  
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    restoreFormState(savedState);
  }, 500);
}

function pdfSingleTemplateDirectly(id, event) {
  if (event) event.stopPropagation();
  
  const allTemplates = getAllTemplates();
  const tpl = allTemplates.find(t => t.id === id);
  if (!tpl) {
    toast('⚠️ Template not found!');
    return;
  }

  const savedState = getFormState();
  
  const fieldsList = [
    'docType','invNo','invValid','supplierRef','payMode',
    'buyerOrderNo','otherRef','buyerName','buyerPhone','buyerGST','buyerAddr',
    'termsDelivery','discount','addCharges','chargesNote','invNotes',
    'systemCapacity','subjectLine', 'invThemeColor', 'invThemePreset', 'invFontSize', 
    'invFontFamily', 'invLayoutPreset', 'invTitleAlign', 'invSubjectAlign', 
    'invNotesAlign', 'invSellerAlign',
    'sub1kwTotal','sub1kwCentral','sub1kwState',
    'sub2kwTotal','sub2kwCentral','sub2kwState',
    'sub3kwTotal','sub3kwCentral','sub3kwState'
  ];
  
  fieldsList.forEach(f => {
    const el = document.getElementById(f);
    if (el) {
      const valKey = (f === 'invLayoutPreset') ? 'layoutPreset' : f;
      if (tpl[valKey] !== undefined && tpl[valKey] !== null) {
        el.value = tpl[valKey];
      } else {
        if (f === 'invThemeColor' || f === 'invThemePreset') {
          el.value = '#16a34a';
        } else if (f === 'invFontSize') {
          el.value = '11';
        } else if (f === 'invFontFamily') {
          el.value = "'Times New Roman', Times, serif";
        } else if (f === 'invLayoutPreset') {
          el.value = 'modern';
        } else {
          el.value = (f === 'invTitleAlign') ? 'center' : ((f === 'invSubjectAlign' || f === 'invNotesAlign' || f === 'invSellerAlign') ? 'left' : '');
        }
      }
    }
  });

  const dateEl = document.getElementById('invDate');
  if (dateEl) {
    dateEl.value = tpl.invDate || getTodayDateString();
  }

  const checkList = [
    'showSubjectLine', 'showValidUntil', 'showSystemCapacity',
    'showSupplierRef', 'showPayMode', 'showBuyerOrderNo', 'showOtherRef', 'showSubsidyBlock'
  ];
  checkList.forEach(c => {
    const el = document.getElementById(c);
    if (el) el.checked = tpl[c] !== undefined ? !!tpl[c] : true;
  });

  const overCb = document.getElementById('overrideTaxes');
  const overFields = document.getElementById('manualTaxFields');
  if (overCb && overFields) {
    if (tpl.manualTaxes) {
      overCb.checked = true;
      overFields.style.display = 'flex';
      const taxFields = {
        'mSubtotal': tpl.manualTaxes.subtotal,
        'mGrand': tpl.manualTaxes.grand,
        'mCgst5': tpl.manualTaxes.cgst5,
        'mSgst5': tpl.manualTaxes.sgst5,
        'mCgst9': tpl.manualTaxes.cgst9,
        'mSgst9': tpl.manualTaxes.sgst9,
        'mCgst14': tpl.manualTaxes.cgst14,
        'mSgst14': tpl.manualTaxes.sgst14,
        'mIgst5': tpl.manualTaxes.igst5,
        'mIgst18': tpl.manualTaxes.igst18,
        'mIgst28': tpl.manualTaxes.igst28
      };
      Object.entries(taxFields).forEach(([fid, val]) => {
        const el = document.getElementById(fid);
        if (el) el.value = val || '';
      });
    } else {
      overCb.checked = false;
      overFields.style.display = 'none';
    }
  }

  items = (tpl.items || []).map(i => ({...i}));
  renderItemsForm();
  updateDesignSettings();
  updatePreview();

  const invoiceDoc = document.getElementById('invoiceDoc');
  const clone = invoiceDoc.cloneNode(true);
  clone.style.display = 'block';
  clone.style.width = '794px';
  clone.style.boxShadow = 'none';
  clone.style.borderRadius = '0';
  clone.style.border = 'none';
  
  const warningBar = clone.querySelector('#previewWarningBar');
  if (warningBar) warningBar.remove();

  const docType = gv('docType') || 'INVOICE';
  const invNo = gv('invNo') || 'DRAFT';
  const filename = `${docType.replace(/\s+/g, '_')}_${invNo.replace(/\s+/g, '_')}.pdf`;
  
  const opt = {
    margin:       0, // Zero margins for full bleed matching the live preview
    filename:     filename,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { 
      scale: 2, 
      useCORS: true, 
      logging: false, 
      letterRendering: true,
      scrollY: 0,
      scrollX: 0
    },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' },
    pagebreak:    { mode: ['css', 'legacy'] }
  };
  
  toast('⏳ Generating PDF...');
  
  html2pdf().set(opt).from(clone).toPdf().get('pdf').then((pdf) => {
    const blob = pdf.output('blob');
    currentPdfBlobUrl = URL.createObjectURL(blob);
    currentPdfFilename = opt.filename;
    
    const iframe = document.getElementById('pdfPreviewIframe');
    if (iframe) iframe.src = currentPdfBlobUrl;
    
    const modal = document.getElementById('pdfPreviewModal');
    if (modal) modal.style.display = 'flex';
    
    toast('✅ PDF preview ready!');
    restoreFormState(savedState);
  }).catch(err => {
    console.error(err);
    toast('❌ PDF generation failed!');
    restoreFormState(savedState);
  });
}

function exportToPNGDirect() {
  const element = document.getElementById('invoiceDoc');
  if(!element) return;
  
  const docType = gv('docType') || 'INVOICE';
  const invNo = gv('invNo') || 'DRAFT';
  
  toast('⏳ Generating image with design...');
  
  html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false
  }).then(canvas => {
    const link = document.createElement('a');
    link.download = `${docType.replace(/\s+/g, '_')}_${invNo.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('✅ PNG image downloaded successfully!');
  }).catch(err => {
    console.error(err);
    toast('❌ Image generation failed!');
  });
}

// ════ EXPORT / IMPORT ════
function toggleExportDropdown(){
  const el = document.getElementById('exportMenu');
  if(!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

document.addEventListener('click', e => {
  // Close export dropdown if click is outside its parent container
  const exportMenu = document.getElementById('exportMenu');
  if (exportMenu && !e.target.closest('.dropdown') && exportMenu.style.display === 'block') {
    exportMenu.style.display = 'none';
  }
  
  // Close auth dropdown if click is outside its parent container
  const authMenu = document.getElementById('authMenu');
  if (authMenu && !e.target.closest('#topbarAuthContainer') && authMenu.style.display === 'block') {
    authMenu.style.display = 'none';
  }
});

function cell(val, type = 's', style = {}) {
  return { v: val, t: type, s: style };
}

function exportToExcel() {
  const docType = gv('docType') || 'INVOICE';
  const invNo = gv('invNo') || 'DRAFT';
  const themeColor = (gv('invThemeColor') || '#16a34a').replace('#', '').toUpperCase();
  
  // Excel Cell Styles
  const titleStyle = {
    fill: { fgColor: { rgb: themeColor } },
    font: { name: "Arial", size: 14, bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center" }
  };

  const sectionHeaderStyle = {
    fill: { fgColor: { rgb: "F3F4F6" } },
    font: { name: "Arial", size: 10, bold: true, color: { rgb: "111827" } },
    border: {
      bottom: { style: "medium", color: { rgb: "9CA3AF" } }
    }
  };

  const metaLabelStyle = {
    font: { name: "Arial", size: 9, bold: true, color: { rgb: "4B5563" } },
    fill: { fgColor: { rgb: "F9FAFB" } }
  };

  const metaValueStyle = {
    font: { name: "Arial", size: 9, color: { rgb: "111827" } }
  };

  const tableHeaderStyle = {
    fill: { fgColor: { rgb: themeColor } },
    font: { name: "Arial", size: 9, bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } }
    }
  };

  const borderThin = {
    top: { style: "thin", color: { rgb: "E5E7EB" } },
    bottom: { style: "thin", color: { rgb: "E5E7EB" } },
    left: { style: "thin", color: { rgb: "E5E7EB" } },
    right: { style: "thin", color: { rgb: "E5E7EB" } }
  };

  const cellLeft = { font: { name: "Arial", size: 9 }, alignment: { horizontal: "left" }, border: borderThin };
  const cellCenter = { font: { name: "Arial", size: 9 }, alignment: { horizontal: "center" }, border: borderThin };
  const cellRight = { font: { name: "Arial", size: 9 }, alignment: { horizontal: "right" }, border: borderThin };

  const totalLabelStyle = {
    font: { name: "Arial", size: 9, bold: true },
    alignment: { horizontal: "right" }
  };

  const totalValueStyle = {
    font: { name: "Arial", size: 9, bold: true },
    alignment: { horizontal: "right" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "double", color: { rgb: "000000" } }
    }
  };

  const grandTotalStyle = {
    fill: { fgColor: { rgb: themeColor } },
    font: { name: "Arial", size: 10, bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "right" }
  };

  const rows = [];
  
  // Row 1: Document Type Header
  rows.push([
    cell(docType, 's', titleStyle),
    cell('', 's', titleStyle),
    cell('', 's', titleStyle),
    cell('', 's', titleStyle),
    cell('', 's', titleStyle),
    cell('', 's', titleStyle),
    cell('', 's', titleStyle),
    cell('', 's', titleStyle),
    cell('', 's', titleStyle)
  ]);
  
  rows.push([]); // Row 2 empty
  
  // Row 3: Company Header & Invoice Info Header
  rows.push([
    cell("SELLER DETAILS", 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle),
    cell("DOCUMENT METADATA", 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle)
  ]);
  
  // Row 4: Company Name & Invoice No
  rows.push([
    cell("Name:", 's', metaLabelStyle),
    cell(gv('sellerName'), 's', metaValueStyle),
    cell('', 's'), cell('', 's'), cell('', 's'),
    cell("Invoice / Quote No.:", 's', metaLabelStyle),
    cell(gv('invNo'), 's', metaValueStyle),
    cell('', 's'), cell('', 's')
  ]);
  
  // Row 5: Company Address & Invoice Date
  rows.push([
    cell("Address:", 's', metaLabelStyle),
    cell(gv('sellerAddr'), 's', metaValueStyle),
    cell('', 's'), cell('', 's'), cell('', 's'),
    cell("Date:", 's', metaLabelStyle),
    cell(formatDate(gv('invDate')), 's', metaValueStyle),
    cell('', 's'), cell('', 's')
  ]);
  
  // Row 6: Company Email/Phone & Payment Mode
  rows.push([
    cell("Contact:", 's', metaLabelStyle),
    cell((gv('sellerPhone') ? gv('sellerPhone') + ' ' : '') + gv('sellerEmail'), 's', metaValueStyle),
    cell('', 's'), cell('', 's'), cell('', 's'),
    cell("Mode of Payment:", 's', metaLabelStyle),
    cell(gv('payMode'), 's', metaValueStyle),
    cell('', 's'), cell('', 's')
  ]);

  // Row 7: Company GST/PAN & Order No
  rows.push([
    cell("GSTIN / PAN:", 's', metaLabelStyle),
    cell((gv('sellerGST') ? 'GST: ' + gv('sellerGST') + ' ' : '') + (gv('sellerPAN') ? 'PAN: ' + gv('sellerPAN') : ''), 's', metaValueStyle),
    cell('', 's'), cell('', 's'), cell('', 's'),
    cell("Buyer's Order No.:", 's', metaLabelStyle),
    cell(gv('buyerOrderNo'), 's', metaValueStyle),
    cell('', 's'), cell('', 's')
  ]);

  // Row 8: Supplier Ref & Other Ref
  rows.push([
    cell("Supplier Ref:", 's', metaLabelStyle),
    cell(gv('supplierRef'), 's', metaValueStyle),
    cell('', 's'), cell('', 's'), cell('', 's'),
    cell("Other Reference:", 's', metaLabelStyle),
    cell(gv('otherRef'), 's', metaValueStyle),
    cell('', 's'), cell('', 's')
  ]);

  rows.push([]); // Row 9 empty

  // Row 10: Buyer Header & Delivery Header
  rows.push([
    cell("BUYER / CUSTOMER DETAILS", 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle),
    cell("DELIVERY TERMS", 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle)
  ]);

  // Row 11: Buyer Name & Delivery
  rows.push([
    cell("Customer Name:", 's', metaLabelStyle),
    cell(gv('buyerName'), 's', metaValueStyle),
    cell('', 's'), cell('', 's'), cell('', 's'),
    cell("Terms of Delivery:", 's', metaLabelStyle),
    cell(gv('termsDelivery'), 's', metaValueStyle),
    cell('', 's'), cell('', 's')
  ]);

  // Row 12: Buyer Phone & GST
  rows.push([
    cell("Phone:", 's', metaLabelStyle),
    cell(gv('buyerPhone'), 's', metaValueStyle),
    cell('', 's'), cell('', 's'), cell('', 's'),
    cell("Customer GSTIN:", 's', metaLabelStyle),
    cell(gv('buyerGST'), 's', metaValueStyle),
    cell('', 's'), cell('', 's')
  ]);

  // Row 13: Buyer Address
  rows.push([
    cell("Billing Address:", 's', metaLabelStyle),
    cell(gv('buyerAddr'), 's', metaValueStyle),
    cell('', 's'), cell('', 's'), cell('', 's'),
    cell('', 's'), cell('', 's'), cell('', 's'), cell('', 's')
  ]);

  rows.push([]); // Row 14 empty
  rows.push([]); // Row 15 empty

  // Row 16: Items Header
  const visibleCols = columns.filter(col => col.visible !== false);
  
  // Row 16: Table Headers
  const headerCells = [cell("Sl No.", 's', tableHeaderStyle)];
  visibleCols.forEach(col => {
    headerCells.push(cell(col.label, 's', tableHeaderStyle));
  });
  rows.push(headerCells);

  // Row 17+: Items Data
  items.forEach((item, idx) => {
    const amt = item.amount !== undefined ? item.amount : ((+item.qty || 0) * (+item.rate || 0));
    
    const rowCells = [cell(idx + 1, 'n', cellCenter)];
    visibleCols.forEach(col => {
      const val = item[col.id];
      if (col.id === 'desc') {
        let excelDesc = item.desc || '';
        if (item.customFields && Object.keys(item.customFields).length > 0) {
          excelDesc += ' (' + Object.entries(item.customFields).map(([k, v]) => `${k}: ${v}`).join(' | ') + ')';
        }
        rowCells.push(cell(excelDesc, 's', cellLeft));
      } else if (col.id === 'hsn') {
        rowCells.push(cell(val || '', 's', cellCenter));
      } else if (col.id === 'gst') {
        rowCells.push(cell(val !== undefined && val !== '' ? val + '%' : '', 's', cellCenter));
      } else if (col.id === 'qty') {
        rowCells.push(cell(val !== undefined && val !== '' ? +val : '', 'n', cellCenter));
      } else if (col.id === 'rate') {
        rowCells.push(cell(val !== undefined && val !== '' ? +val : '', 'n', cellRight));
      } else if (col.id === 'per') {
        rowCells.push(cell(val || '', 's', cellCenter));
      } else if (col.id === 'disc') {
        rowCells.push(cell(val !== undefined && val !== '' ? +val : '', 'n', cellCenter));
      } else if (col.id === 'amount') {
        rowCells.push(cell(amt, 'n', cellRight));
      } else {
        // Custom column value in Excel
        rowCells.push(cell(val || '', 's', cellCenter));
      }
    });
    rows.push(rowCells);
  });

  // Totals
  const totals = calcTotals();
  rows.push([]);
  
  const addTotalRow = (label, value, isGrand = false) => {
    const labelS = isGrand ? grandTotalStyle : totalLabelStyle;
    const valueS = isGrand ? grandTotalStyle : totalValueStyle;
    rows.push([
      cell('', 's'), cell('', 's'), cell('', 's'), cell('', 's'), cell('', 's'), cell('', 's'), cell('', 's'),
      cell(label, 's', labelS),
      cell(value, 'n', valueS)
    ]);
  };

  addTotalRow("Total Before Tax:", totals.subtotal);
  if (totals.discount > 0) {
    addTotalRow("Discount (-):", totals.discount);
  }
  
  Object.entries(totals.byGST).sort(([a],[b])=>+a-+b).forEach(([g, v]) => {
    if (+g === 0) return;
    const h = (+g === 5) ? 5 : (+g / 2);
    addTotalRow(`CGST @${h}%:`, v.cgst);
    addTotalRow(`SGST @${h}%:`, v.sgst);
  });
  
  if (totals.addChrg > 0) {
    const chargesNote = gv('chargesNote') || 'Additional Charges';
    addTotalRow(chargesNote + ":", totals.addChrg);
  }
  
  addTotalRow("Grand Total:", totals.grand, true);
  
  // Row for words
  rows.push([
    cell("Amount in Words:", 's', metaLabelStyle),
    cell(numberToWords(totals.grand), 's', metaValueStyle),
    cell('', 's'), cell('', 's'), cell('', 's'), cell('', 's'), cell('', 's'), cell('', 's'), cell('', 's')
  ]);

  rows.push([]);
  
  // Bank Details row
  rows.push([
    cell("BANK DETAILS", 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle),
    cell('', 's'),
    cell("DECLARATION", 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle),
    cell('', 's', sectionHeaderStyle)
  ]);
  
  rows.push([
    cell("Bank Name:", 's', metaLabelStyle),
    cell(gv('bankName'), 's', metaValueStyle),
    cell('', 's'), cell('', 's'), cell('', 's'),
    cell(gv('declText'), 's', metaValueStyle),
    cell('', 's'), cell('', 's'), cell('', 's')
  ]);
  rows.push([
    cell("Account No:", 's', metaLabelStyle),
    cell(gv('bankAcc'), 's', metaValueStyle),
    cell('', 's'), cell('', 's'), cell('', 's'),
    cell('', 's'), cell('', 's'), cell('', 's'), cell('', 's')
  ]);
  rows.push([
    cell("IFSC Code:", 's', metaLabelStyle),
    cell(gv('bankIFSC'), 's', metaValueStyle),
    cell('', 's'), cell('', 's'), cell('', 's'),
    cell(`For, ${gv('forName') || gv('sellerName')}`, 's', { font: { bold: true, name: "Arial", size: 9 } }),
    cell('', 's'), cell('', 's'), cell('', 's')
  ]);

  // Create Workbook and Sheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  
  // Merges configuration
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
    { s: { r: 2, c: 5 }, e: { r: 2, c: 8 } },
    { s: { r: 3, c: 1 }, e: { r: 3, c: 4 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 4 } },
    { s: { r: 5, c: 1 }, e: { r: 5, c: 4 } },
    { s: { r: 6, c: 1 }, e: { r: 6, c: 4 } },
    { s: { r: 7, c: 1 }, e: { r: 7, c: 4 } },
    { s: { r: 3, c: 6 }, e: { r: 3, c: 8 } },
    { s: { r: 4, c: 6 }, e: { r: 4, c: 8 } },
    { s: { r: 5, c: 6 }, e: { r: 5, c: 8 } },
    { s: { r: 6, c: 6 }, e: { r: 6, c: 8 } },
    { s: { r: 7, c: 6 }, e: { r: 7, c: 8 } },
    { s: { r: 9, c: 0 }, e: { r: 9, c: 3 } },
    { s: { r: 9, c: 5 }, e: { r: 9, c: 8 } },
    { s: { r: 10, c: 1 }, e: { r: 10, c: 4 } },
    { s: { r: 11, c: 1 }, e: { r: 11, c: 4 } },
    { s: { r: 12, c: 1 }, e: { r: 12, c: 4 } },
    { s: { r: 10, c: 6 }, e: { r: 10, c: 8 } },
    { s: { r: 11, c: 6 }, e: { r: 11, c: 8 } },
    { s: { r: rows.length - 6, c: 1 }, e: { r: rows.length - 6, c: 8 } },
    { s: { r: rows.length - 4, c: 0 }, e: { r: rows.length - 4, c: 3 } },
    { s: { r: rows.length - 4, c: 5 }, e: { r: rows.length - 4, c: 8 } },
    { s: { r: rows.length - 3, c: 1 }, e: { r: rows.length - 3, c: 3 } },
    { s: { r: rows.length - 3, c: 5 }, e: { r: rows.length - 3, c: 8 } },
    { s: { r: rows.length - 2, c: 1 }, e: { r: rows.length - 2, c: 3 } },
    { s: { r: rows.length - 1, c: 1 }, e: { r: rows.length - 1, c: 3 } },
    { s: { r: rows.length - 1, c: 5 }, e: { r: rows.length - 1, c: 8 } }
  ];

  // Column widths
  ws['!cols'] = [
    { wch: 15 },
    { wch: 35 },
    { wch: 12 },
    { wch: 10 },
    { wch: 4 },
    { wch: 18 },
    { wch: 15 },
    { wch: 22 },
    { wch: 16 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Invoice");
  
  const filename = `${docType.replace(/\s+/g, '_')}_${invNo.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, filename);
  toast('📊 Excel file downloaded!');
}

function exportToCSV() {
  const docType = gv('docType') || 'INVOICE';
  const invNo = gv('invNo') || 'DRAFT';
  
  const headers = ["Sl No.", "Description", "HSN/SAC", "GST%", "Qty", "Rate", "Per", "Disc%", "Amount"];
  const rows = [headers];
  
  items.forEach((item, idx) => {
    const amt = item.amount !== undefined ? item.amount : ((+item.qty || 0) * (+item.rate || 0));
    rows.push([
      idx + 1,
      `"${(item.desc || '').replace(/"/g, '""')}"`,
      item.hsn,
      item.gst,
      item.qty,
      item.rate,
      item.per,
      item.disc,
      amt
    ]);
  });
  
  const csvContent = "data:text/csv;charset=utf-8," 
    + rows.map(r => r.join(",")).join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  const filename = `${docType.replace(/\s+/g, '_')}_${invNo.replace(/\s+/g, '_')}.csv`;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast('📄 CSV file downloaded!');
}

function exportToJSON() {
  const docType = gv('docType') || 'INVOICE';
  const invNo = gv('invNo') || 'DRAFT';
  
  const data = {
    docType: gv('docType'),
    invNo: gv('invNo'),
    invDate: gv('invDate'),
    invValid: gv('invValid'),
    supplierRef: gv('supplierRef'),
    payMode: gv('payMode'),
    buyerOrderNo: gv('buyerOrderNo'),
    otherRef: gv('otherRef'),
    buyerName: gv('buyerName'),
    buyerPhone: gv('buyerPhone'),
    buyerGST: gv('buyerGST'),
    buyerAddr: gv('buyerAddr'),
    termsDelivery: gv('termsDelivery'),
    discount: +gv('discount') || 0,
    addCharges: +gv('addCharges') || 0,
    chargesNote: gv('chargesNote'),
    invNotes: gv('invNotes'),
    // Override settings
    overrideTaxes: document.getElementById('overrideTaxes')?.checked,
    mSubtotal: gv('mSubtotal'),
    mGrand: gv('mGrand'),
    mCgst5: gv('mCgst5'),
    mSgst5: gv('mSgst5'),
    mCgst9: gv('mCgst9'),
    mSgst9: gv('mSgst9'),
    // Items
    items: items.map(i => ({...i}))
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  const filename = `${docType.replace(/\s+/g, '_')}_${invNo.replace(/\s+/g, '_')}_backup.json`;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast('⚙️ Backup JSON downloaded!');
}

function importFromJSON(input) {
  const file = input.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      
      const fields = [
        'docType', 'invNo', 'invDate', 'invValid', 'supplierRef', 'payMode',
        'buyerOrderNo', 'otherRef', 'buyerName', 'buyerPhone', 'buyerGST', 'buyerAddr',
        'termsDelivery', 'discount', 'addCharges', 'chargesNote', 'invNotes'
      ];
      
      fields.forEach(f => {
        const el = document.getElementById(f);
        if (el && data[f] !== undefined && data[f] !== null) {
          el.value = data[f];
        }
      });
      
      const overCb = document.getElementById('overrideTaxes');
      const overFields = document.getElementById('manualTaxFields');
      if (overCb && overFields) {
        overCb.checked = !!data.overrideTaxes;
        overFields.style.display = data.overrideTaxes ? 'flex' : 'none';
        
        ['mSubtotal', 'mGrand', 'mCgst5', 'mSgst5', 'mCgst9', 'mSgst9'].forEach(f => {
          const el = document.getElementById(f);
          if (el && data[f] !== undefined && data[f] !== null) el.value = data[f];
        });
      }
      
      if (Array.isArray(data.items)) {
        items = data.items.map(i => ({...i}));
        renderItemsForm();
      }
      
      updatePreview();
      toast('📥 Invoice backup loaded successfully!');
    } catch(err) {
      toast('❌ Invalid JSON backup file!');
    }
    input.value = '';
  };
  reader.readAsText(file);
}

// ════ DESIGN SETTINGS ════
function updateDesignSettings() {
  const doc = document.getElementById('invoiceDoc');
  if(!doc) return;
  
  const layoutPreset = document.getElementById('invLayoutPreset').value || 'modern';
  doc.className = '';
  doc.classList.add('layout-' + layoutPreset);
  
  const theme = document.getElementById('invThemeColor').value;
  const fontSize = document.getElementById('invFontSize').value + 'px';
  const fontFamily = document.getElementById('invFontFamily').value;
  
  const titleAlign = document.getElementById('invTitleAlign')?.value || 'center';
  const subjectAlign = document.getElementById('invSubjectAlign')?.value || 'left';
  const notesAlign = document.getElementById('invNotesAlign')?.value || 'left';
  const sellerAlign = document.getElementById('invSellerAlign')?.value || 'left';
  
  // Sync values to topbar controls
  const topLayout = document.getElementById('topbarLayoutPreset');
  const topColor = document.getElementById('topbarThemeColor');
  const topPreset = document.getElementById('topbarThemePreset');
  if (topLayout) topLayout.value = layoutPreset;
  if (topColor) topColor.value = theme;
  if (topPreset) {
    const presetSelect = document.getElementById('invThemePreset');
    if (presetSelect) presetSelect.value = theme;
    topPreset.value = theme;
  }
  
  doc.style.setProperty('--inv-theme', theme);
  
  // Generate light header background and header text based on theme color
  let headerBg = '#bae6fd';
  let headerText = '#0c4a6e';
  
  if (theme === '#1a237e') { headerBg = '#bae6fd'; headerText = '#0c4a6e'; }
  else if (theme === '#dc2626') { headerBg = '#fee2e2'; headerText = '#991b1b'; }
  else if (theme === '#16a34a') { headerBg = '#dcfce7'; headerText = '#166534'; }
  else if (theme === '#d97706') { headerBg = '#fef3c7'; headerText = '#92400e'; }
  else if (theme === '#000000') { headerBg = '#e5e5e5'; headerText = '#000000'; }
  else {
    // Custom hex color fallback
    headerBg = theme + '1f'; // 12% opacity
    headerText = theme;
  }
  
  doc.style.setProperty('--inv-header-bg', headerBg);
  doc.style.setProperty('--inv-header-text', headerText);
  doc.style.setProperty('--inv-font-size', fontSize);
  doc.style.setProperty('--inv-font-family', fontFamily);
  
  doc.style.setProperty('--inv-title-align', titleAlign);
  doc.style.setProperty('--inv-subject-align', subjectAlign);
  doc.style.setProperty('--inv-notes-align', notesAlign);
  doc.style.setProperty('--inv-seller-align', sellerAlign);
  
  // Set direct style properties for standard elements (assures compatibility with pdf prints/html2canvas)
  const elDocType = document.getElementById('p_docType');
  if (elDocType) elDocType.style.textAlign = titleAlign;
  const elSubjectRow = document.getElementById('p_subjectLineRow');
  if (elSubjectRow) elSubjectRow.style.textAlign = subjectAlign;
  const elNotesRow = document.getElementById('p_notesRow');
  if (elNotesRow) elNotesRow.style.textAlign = notesAlign;
  const elSeller = document.querySelector('.d-seller');
  if (elSeller) elSeller.style.textAlign = sellerAlign;

  // Trigger preview update to re-render dynamic template layout
  updatePreview();
}

function syncDesignFromTopbar(type) {
  const sidebarLayout = document.getElementById('invLayoutPreset');
  const sidebarColor = document.getElementById('invThemeColor');
  const sidebarPreset = document.getElementById('invThemePreset');
  
  const topLayout = document.getElementById('topbarLayoutPreset');
  const topColor = document.getElementById('topbarThemeColor');
  const topPreset = document.getElementById('topbarThemePreset');
  
  if (type === 'layout' && topLayout && sidebarLayout) {
    sidebarLayout.value = topLayout.value;
  } 
  else if (type === 'color' && topColor && sidebarColor) {
    sidebarColor.value = topColor.value;
  }
  else if (type === 'preset' && topPreset && sidebarPreset && sidebarColor && topColor) {
    sidebarPreset.value = topPreset.value;
    sidebarColor.value = topPreset.value;
    topColor.value = topPreset.value;
  }
  
  updateDesignSettings();
}

// ════ ITEMS & GROUPS DIRECTORY ENGINE ════
let productsList = [];
let groupsList = [];
let itemSubTab = 'items';

function switchItemSubTab(tab) {
  itemSubTab = tab;
  const btnItems = document.getElementById('subTabItems');
  const btnGroups = document.getElementById('subTabGroups');
  const secItems = document.getElementById('itemManagerSection');
  const secGroups = document.getElementById('groupManagerSection');
  
  if (tab === 'items') {
    btnItems.style.color = '#fff';
    btnItems.style.borderBottom = '2px solid var(--accent)';
    btnItems.style.background = 'var(--card2)';
    
    btnGroups.style.color = 'var(--muted)';
    btnGroups.style.borderBottom = 'none';
    btnGroups.style.background = 'none';
    
    secItems.style.display = 'block';
    secGroups.style.display = 'none';
    renderItemsDirectory();
  } else {
    btnGroups.style.color = '#fff';
    btnGroups.style.borderBottom = '2px solid var(--accent)';
    btnGroups.style.background = 'var(--card2)';
    
    btnItems.style.color = 'var(--muted)';
    btnItems.style.borderBottom = 'none';
    btnItems.style.background = 'none';
    
    secItems.style.display = 'none';
    secGroups.style.display = 'block';
    renderGroupsDirectory();
  }
}

function loadProductsAndGroups() {
  productsList = JSON.parse(localStorage.getItem('inv_products') || '[]');
  groupsList = JSON.parse(localStorage.getItem('inv_product_groups') || '[]');
}

function renderItemsDirectory() {
  const container = document.getElementById('itemsContainer');
  if (!container) return;
  container.innerHTML = '';
  
  const query = document.getElementById('itemSearchInput').value.trim().toLowerCase();
  const filtered = productsList.filter(p => 
    p.desc.toLowerCase().includes(query) || 
    (p.hsn && p.hsn.includes(query))
  );

  if (filtered.length === 0) {
    container.innerHTML = `<div style="font-size:0.75rem; color:var(--muted); text-align:center; padding:12px; border:1px dashed var(--border); border-radius:8px">No items found.</div>`;
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'db-card item-card';
    
    const hsnBadge = p.hsn ? `<span class="db-badge hsn">HSN: ${esc(p.hsn)}</span>` : '';
    const gstBadge = `<span class="db-badge gst">GST ${p.gst}%</span>`;
    const perBadge = p.per ? `<span class="db-badge per">${esc(p.per)}</span>` : '';

    card.innerHTML = `
      <div style="overflow:hidden; display:flex; flex-direction:column; gap:4px; text-align:left; flex:1;">
        <div style="font-weight:700; color:var(--text); font-size:0.82rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(p.desc)}">📦 ${esc(p.desc)}</div>
        <div style="display:flex; align-items:center; flex-wrap:wrap; gap:4px; margin-top:2px;">
          <span style="font-weight:800; color:var(--blue); font-size:0.78rem;">₹${fmt(p.rate)}</span>
          ${perBadge}
          ${gstBadge}
          ${hsnBadge}
        </div>
      </div>
      <div style="display:flex; gap:2px; flex-shrink:0;">
        <button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')" style="padding:4px; border:none; background:none; font-size:0.85rem; cursor:pointer;" title="Edit">✏️</button>
        <button class="btn btn-ghost btn-sm" onclick="deleteProduct('${p.id}')" style="padding:4px; border:none; background:none; font-size:0.85rem; color:var(--accent); cursor:pointer;" title="Delete">🗑️</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function searchItemsList() {
  renderItemsDirectory();
}

function showAddItemForm() {
  document.getElementById('editProductId').value = '';
  document.getElementById('itemFormTitle').textContent = 'Add New Item';
  document.getElementById('p_desc').value = '';
  document.getElementById('p_hsn').value = '';
  document.getElementById('p_per').value = '';
  document.getElementById('p_rate').value = '';
  document.getElementById('p_gst').value = '18';
  
  // Clear custom fields rows
  document.getElementById('itemFormCustomFieldsContainer').innerHTML = '';
  
  document.getElementById('itemListState').style.display = 'none';
  document.getElementById('itemFormState').style.display = 'flex';
}

function hideItemForm() {
  document.getElementById('itemListState').style.display = 'block';
  document.getElementById('itemFormState').style.display = 'none';
}

function saveProductDetails() {
  const id = document.getElementById('editProductId').value;
  const desc = document.getElementById('p_desc').value.trim();
  const hsn = document.getElementById('p_hsn').value.trim();
  const per = document.getElementById('p_per').value.trim();
  const rate = +document.getElementById('p_rate').value;
  const gst = +document.getElementById('p_gst').value;
  const customFields = getCustomFieldsFromForm('itemFormCustomFieldsContainer');
  
  if (!desc) {
    toast('⚠️ Item description is required!');
    return;
  }
  if (isNaN(rate) || rate <= 0) {
    toast('⚠️ Valid unit rate is required!');
    return;
  }

  if (id) {
    const idx = productsList.findIndex(p => p.id === id);
    if (idx !== -1) {
      productsList[idx] = { id, desc, hsn, per, rate, gst, customFields };
      toast('💾 Item details updated!');
    }
  } else {
    const newProduct = {
      id: 'prod_' + Date.now(),
      desc, hsn, per, rate, gst, customFields
    };
    productsList.push(newProduct);
    toast('💾 Item added successfully!');
  }
  
  localStorage.setItem('inv_products', JSON.stringify(productsList));
  hideItemForm();
  renderItemsDirectory();
}

function editProduct(id) {
  const p = productsList.find(x => x.id === id);
  if (!p) return;
  
  document.getElementById('editProductId').value = p.id;
  document.getElementById('itemFormTitle').textContent = 'Edit Item Details';
  document.getElementById('p_desc').value = p.desc || '';
  document.getElementById('p_hsn').value = p.hsn || '';
  document.getElementById('p_per').value = p.per || '';
  document.getElementById('p_rate').value = p.rate || '';
  document.getElementById('p_gst').value = p.gst !== undefined ? p.gst : '18';
  
  // Populate custom fields rows
  populateCustomFieldsFormRows('itemFormCustomFieldsContainer', p.customFields);
  
  document.getElementById('itemListState').style.display = 'none';
  document.getElementById('itemFormState').style.display = 'flex';
}

function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this item?')) return;
  productsList = productsList.filter(p => p.id !== id);
  localStorage.setItem('inv_products', JSON.stringify(productsList));
  renderItemsDirectory();
  toast('🗑️ Item Deleted');
}

function saveItemToDb(idx) {
  const item = items[idx];
  if (!item) return;
  
  const desc = (item.desc || '').trim();
  const hsn = (item.hsn || '').trim();
  const per = (item.per || '').trim();
  const rate = +item.rate || 0;
  const gst = item.gst !== undefined ? +item.gst : 18;
  
  if (!desc) {
    toast('⚠️ Item Description cannot be empty to save!');
    return;
  }
  if (isNaN(rate) || rate <= 0) {
    toast('⚠️ Item Rate must be greater than 0 to save!');
    return;
  }
  
  // Check if item with this description already exists (case-insensitive)
  const existingIdx = productsList.findIndex(p => p.desc.toLowerCase() === desc.toLowerCase());
  
  if (existingIdx !== -1) {
    // Already exists - update details
    productsList[existingIdx] = {
      ...productsList[existingIdx],
      hsn,
      per,
      rate,
      gst
    };
    localStorage.setItem('inv_products', JSON.stringify(productsList));
    toast(`💾 Item "${desc}" updated in database!`);
  } else {
    // Does not exist - create a new entry
    const newProduct = {
      id: 'prod_' + Date.now(),
      desc,
      hsn,
      per,
      rate,
      gst
    };
    productsList.push(newProduct);
    localStorage.setItem('inv_products', JSON.stringify(productsList));
    toast(`💾 Item "${desc}" saved to database!`);
  }
  
  // Re-render items list if active
  if (document.getElementById('itemsContainer')) {
    renderItemsDirectory();
  }
}

function saveAllItemsToDb() {
  if (items.length === 0) {
    toast('⚠️ No items in the list to save!');
    return;
  }
  
  let addedCount = 0;
  let updatedCount = 0;
  
  items.forEach((item, index) => {
    const desc = (item.desc || '').trim();
    const hsn = (item.hsn || '').trim();
    const per = (item.per || '').trim();
    const rate = +item.rate || 0;
    const gst = item.gst !== undefined ? +item.gst : 18;
    
    // Only save items that have a description and a valid rate
    if (desc && !isNaN(rate) && rate > 0) {
      const existingIdx = productsList.findIndex(p => p.desc.toLowerCase() === desc.toLowerCase());
      if (existingIdx !== -1) {
        // Update existing item
        productsList[existingIdx] = {
          ...productsList[existingIdx],
          hsn,
          per,
          rate,
          gst
        };
        updatedCount++;
      } else {
        // Create new item
        const newProduct = {
          id: 'prod_' + (Date.now() + index),
          desc,
          hsn,
          per,
          rate,
          gst
        };
        productsList.push(newProduct);
        addedCount++;
      }
    }
  });
  
  if (addedCount === 0 && updatedCount === 0) {
    toast('⚠️ No valid items (with name & price) found to save!');
    return;
  }
  
  localStorage.setItem('inv_products', JSON.stringify(productsList));
  
  if (document.getElementById('itemsContainer')) {
    renderItemsDirectory();
  }
  
  toast(`💾 Success: ${addedCount} items added, ${updatedCount} items updated in database!`);
}

function saveAsGroupInline() {
  const validItems = items.filter(item => {
    const desc = (item.desc || '').trim();
    const rate = +item.rate || 0;
    return desc && !isNaN(rate) && rate > 0;
  });
  
  if (validItems.length === 0) {
    toast('⚠️ No valid items in the list to group!');
    return;
  }
  
  // Show custom HTML Modal dialog
  document.getElementById('g_save_name').value = '';
  document.getElementById('saveGroupModal').style.display = 'flex';
}

function closeSaveGroupModal() {
  document.getElementById('saveGroupModal').style.display = 'none';
}

function submitSaveGroup() {
  const groupName = document.getElementById('g_save_name').value.trim();
  if (!groupName) {
    toast('⚠️ Group name is required!');
    return;
  }
  
  const validItems = items.filter(item => {
    const desc = (item.desc || '').trim();
    const rate = +item.rate || 0;
    return desc && !isNaN(rate) && rate > 0;
  });
  
  const groupItems = validItems.map(item => ({
    desc: (item.desc || '').trim(),
    hsn: (item.hsn || '').trim(),
    per: (item.per || '').trim(),
    qty: +item.qty || 1,
    rate: +item.rate || 0,
    gst: item.gst !== undefined ? +item.gst : 18
  }));
  
  const existingIdx = groupsList.findIndex(g => g.name.toLowerCase() === groupName.toLowerCase());
  
  if (existingIdx !== -1) {
    groupsList[existingIdx] = {
      id: groupsList[existingIdx].id,
      name: groupName,
      items: groupItems
    };
    toast(`💾 Group "${groupName}" updated in database!`);
  } else {
    const newGroup = {
      id: 'group_' + Date.now(),
      name: groupName,
      items: groupItems
    };
    groupsList.push(newGroup);
    toast(`💾 Group "${groupName}" saved successfully!`);
  }
  
  localStorage.setItem('inv_product_groups', JSON.stringify(groupsList));
  closeSaveGroupModal();
  
  if (document.getElementById('groupsContainer')) {
    renderGroupsDirectory();
  }
}

// ════ ITEM GROUPS LOGIC ════
function renderGroupsDirectory() {
  const container = document.getElementById('groupsContainer');
  if (!container) return;
  container.innerHTML = '';
  
  const query = document.getElementById('groupSearchInput').value.trim().toLowerCase();
  const filtered = groupsList.filter(g => g.name.toLowerCase().includes(query));

  if (filtered.length === 0) {
    container.innerHTML = `<div style="font-size:0.75rem; color:var(--muted); text-align:center; padding:12px; border:1px dashed var(--border); border-radius:8px">No groups found.</div>`;
    return;
  }

  filtered.forEach(g => {
    const card = document.createElement('div');
    card.className = 'db-card group-card';
    
    const itemsPreview = g.items.map(i => `${i.qty}x ${esc(i.desc)}`).join(', ');

    card.innerHTML = `
      <div style="overflow:hidden; display:flex; flex-direction:column; gap:4px; text-align:left; flex:1;">
        <div style="font-weight:700; color:var(--text); font-size:0.82rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(g.name)}">📂 ${esc(g.name)}</div>
        <div style="font-size:0.7rem; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${itemsPreview}">
          <span style="font-weight:600; color:var(--yellow);">${g.items.length} Bundle Items</span>
          <span style="color:var(--muted2)">•</span>
          <span style="font-size:0.65rem;">${itemsPreview}</span>
        </div>
      </div>
      <div style="display:flex; gap:2px; flex-shrink:0;">
        <button class="btn btn-ghost btn-sm" onclick="editGroup('${g.id}')" style="padding:4px; border:none; background:none; font-size:0.85rem; cursor:pointer;" title="Edit">✏️</button>
        <button class="btn btn-ghost btn-sm" onclick="deleteGroup('${g.id}')" style="padding:4px; border:none; background:none; font-size:0.85rem; color:var(--accent); cursor:pointer;" title="Delete">🗑️</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function searchGroupsList() {
  renderGroupsDirectory();
}

function showAddGroupForm() {
  document.getElementById('editGroupId').value = '';
  document.getElementById('groupFormTitle').textContent = 'Create New Group';
  document.getElementById('g_name').value = '';
  
  populateGroupItemsSelector();
  document.getElementById('groupListState').style.display = 'none';
  document.getElementById('groupFormState').style.display = 'flex';
}

function hideGroupForm() {
  document.getElementById('groupListState').style.display = 'block';
  document.getElementById('groupFormState').style.display = 'none';
}

function populateGroupItemsSelector(selectedItems = []) {
  const container = document.getElementById('groupItemsSelectorList');
  if (!container) return;
  container.innerHTML = '';
  
  if (productsList.length === 0) {
    container.innerHTML = `<div style="font-size:0.7rem; color:var(--muted); text-align:center; padding:10px 0;">No items saved yet. Save items first.</div>`;
    return;
  }
  
  productsList.forEach(p => {
    // Check if product is in selectedItems
    const match = selectedItems.find(x => x.desc === p.desc);
    const checked = match ? 'checked' : '';
    const qty = match ? match.qty : 1;
    
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'space-between';
    div.style.gap = '8px';
    div.style.padding = '4px 0';
    div.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
    
    div.innerHTML = `
      <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.72rem; color:var(--text); overflow:hidden; flex:1; margin:0;">
        <input type="checkbox" class="g-item-check" data-id="${p.id}" ${checked} style="cursor:pointer;"/>
        <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(p.desc)}</span>
      </label>
      <div style="display:flex; align-items:center; gap:4px;">
        <span style="font-size:0.6rem; color:var(--muted)">Qty:</span>
        <input type="number" class="g-item-qty" data-id="${p.id}" min="1" value="${qty}" style="width:45px; background:var(--card2); border:1px solid var(--border); color:var(--text); border-radius:4px; padding:2px 4px; font-size:0.7rem; text-align:center;"/>
      </div>
    `;
    container.appendChild(div);
  });
}

function saveGroupDetails() {
  const id = document.getElementById('editGroupId').value;
  const name = document.getElementById('g_name').value.trim();
  
  if (!name) {
    toast('⚠️ Group name is required!');
    return;
  }
  
  // Find selected items
  const checks = document.querySelectorAll('.g-item-check');
  const selectedItems = [];
  checks.forEach(check => {
    if (check.checked) {
      const pId = check.dataset.id;
      const product = productsList.find(p => p.id === pId);
      if (product) {
        const qtyEl = document.querySelector(`.g-item-qty[data-id="${pId}"]`);
        const qty = qtyEl ? +qtyEl.value || 1 : 1;
        selectedItems.push({
          desc: product.desc,
          hsn: product.hsn,
          per: product.per,
          rate: product.rate,
          gst: product.gst,
          qty: qty
        });
      }
    }
  });
  
  if (selectedItems.length === 0) {
    toast('⚠️ Select at least one item to bundle!');
    return;
  }

  if (id) {
    const idx = groupsList.findIndex(g => g.id === id);
    if (idx !== -1) {
      groupsList[idx] = { id, name, items: selectedItems };
      toast('💾 Item Group updated!');
    }
  } else {
    const newGroup = {
      id: 'group_' + Date.now(),
      name,
      items: selectedItems
    };
    groupsList.push(newGroup);
    toast('💾 Item Group created!');
  }
  
  localStorage.setItem('inv_product_groups', JSON.stringify(groupsList));
  hideGroupForm();
  renderGroupsDirectory();
}

function editGroup(id) {
  const g = groupsList.find(x => x.id === id);
  if (!g) return;
  
  document.getElementById('editGroupId').value = g.id;
  document.getElementById('groupFormTitle').textContent = 'Edit Item Group';
  document.getElementById('g_name').value = g.name || '';
  
  populateGroupItemsSelector(g.items || []);
  document.getElementById('groupListState').style.display = 'none';
  document.getElementById('groupFormState').style.display = 'flex';
}

function deleteGroup(id) {
  if (!confirm('Are you sure you want to delete this group?')) return;
  groupsList = groupsList.filter(g => g.id !== id);
  localStorage.setItem('inv_product_groups', JSON.stringify(groupsList));
  renderGroupsDirectory();
  toast('🗑️ Group Deleted');
}

// ════ INLINE ITEM SEARCH DROPDOWN FOR TABLE ROWS ════
function showItemDropdown(idx) {
  const dropdown = document.getElementById('itemDropdown_' + idx);
  if (dropdown) {
    dropdown.style.display = 'block';
    populateItemsDropdown(idx, '');
  }
}

function populateItemsDropdown(idx, query) {
  const container = document.getElementById('itemDropdown_' + idx);
  if (!container) return;
  container.innerHTML = '';
  
  const q = query.trim().toLowerCase();
  
  // Filter products
  const matchedProducts = productsList.filter(p => p.desc.toLowerCase().includes(q));
  // Filter groups
  const matchedGroups = groupsList.filter(g => g.name.toLowerCase().includes(q));
  
  if (matchedProducts.length === 0 && matchedGroups.length === 0) {
    container.innerHTML = `<div style="font-size:0.65rem; color:var(--muted); text-align:center; padding:8px;">No matching items/groups.</div>`;
    return;
  }
  
  // Render groups first (bundles)
  matchedGroups.forEach(g => {
    const div = document.createElement('div');
    div.style.padding = '8px 12px';
    div.style.cursor = 'pointer';
    div.style.fontSize = '0.74rem';
    div.style.color = 'var(--accent)';
    div.style.borderBottom = '1px solid var(--border2)';
    div.style.fontWeight = '700';
    div.style.textAlign = 'left';
    div.style.transition = 'background 0.15s';
    
    div.onmouseover = () => { div.style.background = 'var(--accent-ultra)'; };
    div.onmouseout = () => { div.style.background = 'none'; };
    
    div.onclick = (e) => {
      e.stopPropagation();
      selectGroupForInvoice(idx, g);
    };
    
    div.innerHTML = `📂 Apply Group: ${esc(g.name)} (${g.items.length} items)`;
    container.appendChild(div);
  });
  
  // Render products
  matchedProducts.forEach(p => {
    const div = document.createElement('div');
    div.style.padding = '8px 12px';
    div.style.cursor = 'pointer';
    div.style.fontSize = '0.74rem';
    div.style.color = 'var(--text)';
    div.style.borderBottom = '1px solid var(--border2)';
    div.style.textAlign = 'left';
    div.style.transition = 'background 0.15s';
    
    div.onmouseover = () => { div.style.background = 'var(--accent-ultra)'; };
    div.onmouseout = () => { div.style.background = 'none'; };
    
    div.onclick = (e) => {
      e.stopPropagation();
      selectProductForRow(idx, p);
    };
    
    div.innerHTML = `
      <div style="font-weight:600;">📦 ${esc(p.desc)}</div>
      <div style="font-size:0.65rem; color:var(--muted);">₹${p.rate} / ${esc(p.per)} | GST: ${p.gst}%</div>
    `;
    container.appendChild(div);
  });
}

function handleItemDescInput(idx, val) {
  items[idx].desc = val;
  populateItemsDropdown(idx, val);
  updatePreview();
}

function selectProductForRow(idx, p) {
  items[idx].desc = p.desc || '';
  items[idx].hsn = p.hsn || '';
  items[idx].per = p.per || '';
  items[idx].rate = p.rate || 0;
  items[idx].gst = p.gst !== undefined ? p.gst : 18;
  items[idx].customFields = p.customFields ? { ...p.customFields } : null;
  
  // Close dropdown
  document.getElementById('itemDropdown_' + idx).style.display = 'none';
  renderItemsForm();
  updatePreview();
  toast('📦 Item auto-filled!');
}

function selectGroupForInvoice(idx, g) {
  // If the target row was empty, let's overwrite it. Otherwise append.
  const isRowEmpty = !items[idx].desc && !items[idx].rate;
  
  const formattedItems = g.items.map(item => ({
    desc: item.desc || '',
    hsn: item.hsn || '',
    per: item.per || '',
    qty: item.qty || 1,
    rate: item.rate || 0,
    gst: item.gst !== undefined ? item.gst : 18,
    disc: '',
    customFields: item.customFields ? { ...item.customFields } : null
  }));
  
  if (isRowEmpty) {
    // Overwrite row index idx with the first item, and append rest
    items[idx] = formattedItems[0];
    items.splice(idx + 1, 0, ...formattedItems.slice(1));
  } else {
    // Append all items of group to the invoice items list
    items.push(...formattedItems);
  }
  
  // Close dropdown
  document.getElementById('itemDropdown_' + idx).style.display = 'none';
  renderItemsForm();
  updatePreview();
  toast(`📂 Applied Group: ${g.name}`);
}

// Global click event to close inline item dropdowns
document.addEventListener('click', function(e) {
  items.forEach((item, idx) => {
    const dropdown = document.getElementById('itemDropdown_' + idx);
    const input = document.getElementById('itemDesc_' + idx);
    if (dropdown && e.target !== input && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
});

// ════ CLIENTS DIRECTORY ENGINE ════
let clientsList = [];

function loadClientsList() {
  clientsList = JSON.parse(localStorage.getItem('inv_clients') || '[]');
}

function renderClientsDirectory() {
  const container = document.getElementById('clientsDirContainer');
  if (!container) return;
  container.innerHTML = '';
  
  const query = document.getElementById('clientSearchInput').value.trim().toLowerCase();
  const filtered = clientsList.filter(c => 
    c.name.toLowerCase().includes(query) || 
    (c.phone && c.phone.includes(query)) || 
    (c.gst && c.gst.toLowerCase().includes(query))
  );

  if (filtered.length === 0) {
    container.innerHTML = `<div style="font-size:0.75rem; color:var(--muted); text-align:center; padding:12px; border:1px dashed var(--border); border-radius:8px">No clients found.</div>`;
    return;
  }

  filtered.forEach(client => {
    const card = document.createElement('div');
    card.className = 'db-card client-card';
    
    const gstBadge = client.gst ? `<span class="db-badge gst">GST: ${esc(client.gst)}</span>` : '';
    const phoneDetail = client.phone ? `<span style="font-size:0.68rem; font-weight:600; color:var(--text);">📞 ${esc(client.phone)}</span>` : '';

    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; overflow:hidden; flex:1;">
        <div style="width:34px; height:34px; border-radius:50%; background:var(--accent-ultra); color:var(--accent); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.75rem; border:1px solid var(--border); flex-shrink:0;">
          ${getInitials(client.name)}
        </div>
        <div style="overflow:hidden; display:flex; flex-direction:column; gap:3px; text-align:left;">
          <div style="font-weight:700; color:var(--text); font-size:0.82rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(client.name)}">${esc(client.name)}</div>
          <div style="display:flex; align-items:center; flex-wrap:wrap; gap:4px; margin-top:1px;">
            ${phoneDetail}
            ${gstBadge}
          </div>
        </div>
      </div>
      <div style="display:flex; gap:2px; flex-shrink:0;">
        <button class="btn btn-ghost btn-sm" onclick="editClient('${client.id}')" style="padding:4px; border:none; background:none; font-size:0.85rem; cursor:pointer;" title="Edit">✏️</button>
        <button class="btn btn-ghost btn-sm" onclick="deleteClient('${client.id}')" style="padding:4px; border:none; background:none; font-size:0.85rem; color:var(--accent); cursor:pointer;" title="Delete">🗑️</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function searchClientsList() {
  renderClientsDirectory();
}

function showAddClientForm() {
  document.getElementById('editClientId').value = '';
  document.getElementById('clientFormTitle').textContent = 'Add New Client';
  document.getElementById('c_name').value = '';
  document.getElementById('c_phone').value = '';
  document.getElementById('c_gst').value = '';
  document.getElementById('c_addr').value = '';
  
  document.getElementById('clientListState').style.display = 'none';
  document.getElementById('clientFormState').style.display = 'flex';
}

function hideClientForm() {
  document.getElementById('clientListState').style.display = 'block';
  document.getElementById('clientFormState').style.display = 'none';
}

function saveClientDetails() {
  const id = document.getElementById('editClientId').value;
  const name = document.getElementById('c_name').value.trim();
  const phone = document.getElementById('c_phone').value.trim();
  const gst = document.getElementById('c_gst').value.trim().toUpperCase();
  const addr = document.getElementById('c_addr').value.trim();
  
  if (!name) {
    toast('⚠️ Customer Name is required!');
    return;
  }

  if (id) {
    const idx = clientsList.findIndex(c => c.id === id);
    if (idx !== -1) {
      clientsList[idx] = { id, name, phone, gst, addr };
      toast('💾 Client details updated!');
    }
  } else {
    const newClient = {
      id: 'cli_' + Date.now(),
      name, phone, gst, addr
    };
    clientsList.push(newClient);
    toast('💾 Client added successfully!');
  }
  
  localStorage.setItem('inv_clients', JSON.stringify(clientsList));
  hideClientForm();
  renderClientsDirectory();
  populateClientsDropdown();
}

function editClient(id) {
  const client = clientsList.find(c => c.id === id);
  if (!client) return;
  
  document.getElementById('editClientId').value = client.id;
  document.getElementById('clientFormTitle').textContent = 'Edit Client Details';
  document.getElementById('c_name').value = client.name || '';
  document.getElementById('c_phone').value = client.phone || '';
  document.getElementById('c_gst').value = client.gst || '';
  document.getElementById('c_addr').value = client.addr || '';
  
  document.getElementById('clientListState').style.display = 'none';
  document.getElementById('clientFormState').style.display = 'flex';
}

function deleteClient(id) {
  if (!confirm('Are you sure you want to delete this client?')) return;
  clientsList = clientsList.filter(c => c.id !== id);
  localStorage.setItem('inv_clients', JSON.stringify(clientsList));
  renderClientsDirectory();
  populateClientsDropdown();
  toast('🗑️ Client Deleted');
}

// ════ INLINE CLIENT SELECTION LOGIC ════
function showClientDropdown() {
  const dropdown = document.getElementById('buyerClientDropdown');
  if (dropdown) {
    dropdown.style.display = 'block';
    populateClientsDropdown();
  }
}

function populateClientsDropdown() {
  const container = document.getElementById('clientDropdownItems');
  if (!container) return;
  container.innerHTML = '';
  
  const query = document.getElementById('buyerName').value.trim().toLowerCase();
  const filtered = clientsList.filter(c => c.name.toLowerCase().includes(query));
  
  if (filtered.length === 0) {
    container.innerHTML = `<div style="font-size:0.7rem; color:var(--muted); text-align:center; padding:8px 12px;">No matching clients.</div>`;
    return;
  }
  
  filtered.forEach(client => {
    const item = document.createElement('div');
    item.style.padding = '8px 12px';
    item.style.cursor = 'pointer';
    item.style.fontSize = '0.76rem';
    item.style.color = 'var(--text)';
    item.style.display = 'flex';
    item.style.flexDirection = 'column';
    item.style.gap = '2px';
    item.style.textAlign = 'left';
    item.style.transition = 'background 0.15s';
    
    item.onmouseover = () => { item.style.background = 'var(--accent-ultra)'; };
    item.onmouseout = () => { item.style.background = 'none'; };
    
    item.onclick = (e) => {
      e.stopPropagation();
      selectClientForInvoice(client);
    };
    
    item.innerHTML = `
      <div style="font-weight:600; color:var(--text)">${esc(client.name)}</div>
      <div style="font-size:0.65rem; color:var(--muted);">${client.phone ? `📞 ${esc(client.phone)}` : ''} ${client.gst ? ` | GST: ${esc(client.gst)}` : ''}</div>
    `;
    container.appendChild(item);
  });
}

function handleBuyerNameInput() {
  populateClientsDropdown();
  updatePreview();
}

function selectClientForInvoice(client) {
  document.getElementById('buyerName').value = client.name || '';
  document.getElementById('buyerPhone').value = client.phone || '';
  document.getElementById('buyerGST').value = client.gst || '';
  document.getElementById('buyerAddr').value = client.addr || '';
  
  document.getElementById('buyerClientDropdown').style.display = 'none';
  updatePreview();
  toast('👤 Client details filled!');
}

function syncClientDatabaseFromForm() {
  const name = document.getElementById('buyerName').value.trim();
  if (!name) return;
  
  const phone = document.getElementById('buyerPhone').value.trim();
  const gst = document.getElementById('buyerGST').value.trim();
  const addr = document.getElementById('buyerAddr').value.trim();
  
  // Find index of client in database (case-insensitive name match)
  const idx = clientsList.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
  
  if (idx !== -1) {
    // Client exists - update details if they differ
    const client = clientsList[idx];
    if (client.phone !== phone || client.gst !== gst || client.addr !== addr) {
      clientsList[idx] = { ...client, phone, gst, addr };
      localStorage.setItem('inv_clients', JSON.stringify(clientsList));
      if (document.getElementById('clientsDirContainer')) {
        renderClientsDirectory();
      }
    }
  } else {
    // Client does not exist - automatically create and save
    const newClient = {
      id: 'cli_' + Date.now(),
      name: name,
      phone: phone,
      gst: gst,
      addr: addr
    };
    clientsList.push(newClient);
    localStorage.setItem('inv_clients', JSON.stringify(clientsList));
    if (document.getElementById('clientsDirContainer')) {
      renderClientsDirectory();
    }
    toast(`👤 Client "${name}" auto-saved to directory!`);
  }
}

function createNewClientInline(e) {
  e.stopPropagation();
  document.getElementById('buyerClientDropdown').style.display = 'none';
  
  document.getElementById('q_c_name').value = document.getElementById('buyerName').value.trim();
  document.getElementById('q_c_phone').value = '';
  document.getElementById('q_c_gst').value = '';
  document.getElementById('q_c_addr').value = '';
  
  document.getElementById('quickClientModal').style.display = 'flex';
}

function closeQuickClientModal() {
  document.getElementById('quickClientModal').style.display = 'none';
}

function saveQuickClient() {
  const name = document.getElementById('q_c_name').value.trim();
  const phone = document.getElementById('q_c_phone').value.trim();
  const gst = document.getElementById('q_c_gst').value.trim().toUpperCase();
  const addr = document.getElementById('q_c_addr').value.trim();
  
  if (!name) {
    toast('⚠️ Customer Name is required!');
    return;
  }
  
  const newClient = {
    id: 'cli_' + Date.now(),
    name, phone, gst, addr
  };
  clientsList.push(newClient);
  localStorage.setItem('inv_clients', JSON.stringify(clientsList));
  
  selectClientForInvoice(newClient);
  closeQuickClientModal();
  populateClientsDropdown();
}

function addCustomFieldFormRow(e, containerId, key = '', val = '') {
  if (e) e.preventDefault();
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const row = document.createElement('div');
  row.className = 'custom-field-row';
  row.style.display = 'flex';
  row.style.gap = '6px';
  row.style.alignItems = 'center';
  row.style.marginTop = '4px';
  
  row.innerHTML = `
    <input type="text" class="cf-key" placeholder="Field e.g. Brand" value="${esc(key)}" style="flex:1; background:var(--input); border:1.5px solid var(--border); border-radius:6px; color:var(--text); padding:6px 8px; font-size:.73rem;" />
    <input type="text" class="cf-val" placeholder="Value e.g. Tata" value="${esc(val)}" style="flex:1; background:var(--input); border:1.5px solid var(--border); border-radius:6px; color:var(--text); padding:6px 8px; font-size:.73rem;" />
    <button class="btn btn-ghost btn-sm" onclick="this.parentElement.remove()" style="padding:4px 6px; border:none; background:none; font-size:0.8rem; color:var(--accent); cursor:pointer;" title="Delete Field">✕</button>
  `;
  container.appendChild(row);
}

function getCustomFieldsFromForm(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;
  
  const rows = container.querySelectorAll('.custom-field-row');
  const fields = {};
  let count = 0;
  
  rows.forEach(row => {
    const key = row.querySelector('.cf-key').value.trim();
    const val = row.querySelector('.cf-val').value.trim();
    if (key) {
      fields[key] = val;
      count++;
    }
  });
  
  return count > 0 ? fields : null;
}

function populateCustomFieldsFormRows(containerId, customFields) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  
  if (customFields && typeof customFields === 'object') {
    Object.entries(customFields).forEach(([k, v]) => {
      addCustomFieldFormRow(null, containerId, k, v);
    });
  }
}

function openQuickProductModal(e) {
  if (e) e.preventDefault();
  document.getElementById('q_p_desc').value = '';
  document.getElementById('q_p_hsn').value = '';
  document.getElementById('q_p_per').value = '';
  document.getElementById('q_p_rate').value = '';
  document.getElementById('q_p_gst').value = '18';
  
  // Clear custom fields rows
  document.getElementById('quickProductCustomFieldsContainer').innerHTML = '';
  
  document.getElementById('quickProductModal').style.display = 'flex';
}

function closeQuickProductModal() {
  document.getElementById('quickProductModal').style.display = 'none';
}

function saveQuickProduct() {
  const desc = document.getElementById('q_p_desc').value.trim();
  const hsn = document.getElementById('q_p_hsn').value.trim();
  const per = document.getElementById('q_p_per').value.trim();
  const rate = +document.getElementById('q_p_rate').value;
  const gst = +document.getElementById('q_p_gst').value;
  const customFields = getCustomFieldsFromForm('quickProductCustomFieldsContainer');
  
  if (!desc) {
    toast('⚠️ Product Name/Description is required!');
    return;
  }
  if (isNaN(rate) || rate <= 0) {
    toast('⚠️ Valid rate is required!');
    return;
  }
  
  const newProduct = {
    id: 'prod_' + Date.now(),
    desc, hsn, per, rate, gst, customFields
  };
  productsList.push(newProduct);
  localStorage.setItem('inv_products', JSON.stringify(productsList));
  
  closeQuickProductModal();
  toast(`💾 Item "${desc}" created!`);
  
  // Re-render items directories
  if (document.getElementById('itemsContainer')) {
    renderItemsDirectory();
  }
  
  // Gather currently selected items in Group form checkboxes
  const currentlySelected = [];
  const checks = document.querySelectorAll('.g-item-check');
  checks.forEach(check => {
    const pId = check.dataset.id;
    const qtyEl = document.querySelector(`.g-item-qty[data-id="${pId}"]`);
    const qty = qtyEl ? +qtyEl.value || 1 : 1;
    
    const product = productsList.find(p => p.id === pId);
    if (product && check.checked) {
      currentlySelected.push({
        desc: product.desc,
        qty: qty
      });
    }
  });
  
  // Force select the newly created product
  if (!currentlySelected.some(x => x.desc === newProduct.desc)) {
    currentlySelected.push({
      desc: newProduct.desc,
      qty: 1
    });
  }
  
  // Refresh the selector checkbox list in the Group form with selections preserved + new product checked!
  populateGroupItemsSelector(currentlySelected);
}

function openAddColModal(e) {
  if (e) e.preventDefault();
  document.getElementById('custom_col_name').value = '';
  document.getElementById('addColModal').style.display = 'flex';
}

function closeAddColModal() {
  document.getElementById('addColModal').style.display = 'none';
}

function submitAddCustomColumn() {
  const name = document.getElementById('custom_col_name').value.trim();
  if (!name) {
    toast('⚠️ Column name is required!');
    return;
  }
  
  const colId = 'c_col_' + Date.now();
  const newCol = {
    id: colId,
    label: name,
    type: 'text',
    isCustom: true
  };
  
  // Insert before the last column ('amount')
  const amtIdx = columns.findIndex(c => c.id === 'amount');
  if (amtIdx !== -1) {
    columns.splice(amtIdx, 0, newCol);
  } else {
    columns.push(newCol);
  }
  
  closeAddColModal();
  renderItemsForm();
  updatePreview();
  renderColumnManager();
  toast(`➕ Custom column "${name}" added!`);
}

function renderColumnManager() {
  const container = document.getElementById('columnToggleContainer');
  if (!container) return;
  container.innerHTML = '';
  
  columns.forEach((col, idx) => {
    if (col.fixed) return;
    
    const isChecked = col.visible !== false;
    
    const label = document.createElement('label');
    label.style.display = 'inline-flex';
    label.style.alignItems = 'center';
    label.style.gap = '6px';
    label.style.background = isChecked ? 'var(--accent-ultra)' : 'var(--bg)';
    label.style.border = `1px solid ${isChecked ? 'var(--accent)' : 'var(--border)'}`;
    label.style.color = isChecked ? 'var(--accent)' : 'var(--muted)';
    label.style.padding = '4px 10px';
    label.style.borderRadius = '20px';
    label.style.fontSize = '0.68rem';
    label.style.fontWeight = '700';
    label.style.cursor = 'pointer';
    label.style.transition = 'all 0.15s ease';
    label.style.userSelect = 'none';
    
    label.innerHTML = `
      <input type="checkbox" style="margin:0; cursor:pointer;" ${isChecked ? 'checked' : ''} onchange="toggleColumnVisibility(${idx})" />
      <span>${esc(col.label)}</span>
      ${col.isCustom ? `<span style="margin-left:4px; font-size:0.65rem; color:var(--accent); cursor:pointer; font-weight:800;" onclick="removeCustomColumn(event, ${idx})">✕</span>` : ''}
    `;
    container.appendChild(label);
  });
}

function toggleColumnVisibility(idx) {
  columns[idx].visible = !(columns[idx].visible !== false);
  renderItemsForm();
  updatePreview();
  renderColumnManager();
}

function removeCustomColumn(e, idx) {
  if (e) e.stopPropagation();
  if (!confirm(`Are you sure you want to delete the custom column "${columns[idx].label}"?`)) return;
  
  const colId = columns[idx].id;
  columns.splice(idx, 1);
  
  // Clean up data for this column from all invoice items
  items.forEach(item => {
    delete item[colId];
  });
  
  renderItemsForm();
  updatePreview();
  renderColumnManager();
  toast('🗑️ Custom column deleted.');
}

// Global click event to close inline dropdowns
document.addEventListener('click', function(e) {
  const dropdown = document.getElementById('buyerClientDropdown');
  const input = document.getElementById('buyerName');
  if (dropdown && e.target !== input && !dropdown.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});

// ════ INIT ════
function init(){
  ORIGINAL_INVOICE_HTML = document.getElementById('invoiceDoc')?.innerHTML || '';
  
  // Set up login password enter key handlers
  document.getElementById('loginPassword')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitLogin();
  });
  document.getElementById('loginUsername')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitLogin();
  });

  // Set up PDF preview actions
  document.getElementById('btnDownloadPdfPreview')?.addEventListener('click', () => {
    if (currentPdfBlobUrl) {
      const link = document.createElement('a');
      link.href = currentPdfBlobUrl;
      link.download = currentPdfFilename || 'document.pdf';
      link.click();
      toast('✅ PDF downloaded!');
    }
  });

  document.getElementById('btnPrintPdfPreview')?.addEventListener('click', () => {
    const iframe = document.getElementById('pdfPreviewIframe');
    if (iframe) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  });

  // Normalize existing user keys to lowercase for case-insensitivity support
  let users = JSON.parse(localStorage.getItem('inv_users') || '{}');
  let usersChanged = false;
  let normalizedUsers = {};
  Object.keys(users).forEach(k => {
    const lowerKey = k.toLowerCase();
    if (lowerKey !== k) {
      usersChanged = true;
    }
    normalizedUsers[lowerKey] = users[k];
    if (normalizedUsers[lowerKey] && normalizedUsers[lowerKey].username) {
      normalizedUsers[lowerKey].username = normalizedUsers[lowerKey].username.toLowerCase();
    }
  });
  if (usersChanged) {
    originalLocalStorageSetItem.call(localStorage, 'inv_users', JSON.stringify(normalizedUsers));
  }

  const registeredUsers = Object.keys(normalizedUsers).filter(u => u !== 'guest');
  const activeUser = (localStorage.getItem('inv_active_user') || 'guest').toLowerCase();
  const loggedIn = sessionStorage.getItem('inv_logged_in');
  
  if (registeredUsers.length > 0 && loggedIn !== 'true' && loggedIn !== 'guest') {
    document.getElementById('loginOverlayModal').style.display = 'flex';
  } else {
    document.getElementById('loginOverlayModal').style.display = 'none';
  }
  
  updateAuthUI();

  // Clean up seeded default items/clients from localStorage so they are removed for the user
  if (localStorage.getItem('has_cleaned_defaults_v2') !== 'true') {
    localStorage.removeItem('inv_clients');
    localStorage.removeItem('inv_products');
    localStorage.removeItem('inv_product_groups');
    localStorage.setItem('has_cleaned_defaults_v2', 'true');
  }
  loadClientsList();
  loadProductsAndGroups();
  loadProfile();
  items=[];
  renderItemsForm();
  renderColumnManager();
  renderTemplateCards();
  renderDashboardTemplates();
  const invDateEl=document.getElementById('invDate');
  if(invDateEl) invDateEl.value=getTodayDateString();
  updatePreview();
  updateDesignSettings();
  switchNavTab('dashboard'); // Start on Dashboard
  
  // Desktop Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveProfile();
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      createNewInvoiceBtn();
    }
    if (e.ctrlKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      printPDF();
    }
    if (e.key === 'Escape') {
      clearPreviewState();
    }
  });
}
init();
// ════ TOGGLE RIGHT SIDEBAR ════
function toggleRightSidebar(){
  const rSidebar = document.querySelector('.sidebar-right');
  const handle = document.getElementById('resizeHandleRight');
  if(!rSidebar) return;
  rSidebar.classList.toggle('hidden-sidebar');
  if(rSidebar.classList.contains('hidden-sidebar')){
    if(handle) handle.style.display = 'none';
  } else {
    if(handle) handle.style.display = 'block';
  }
}

// ════ SIDEBAR RESIZE ════
(function(){
  const handle  = document.getElementById('resizeHandle');
  const sidebar = document.querySelector('.sidebar');
  let dragging = false, startX = 0, startW = 0;

  // Restore saved width
  const saved = localStorage.getItem('sidebarWidth');
  if(saved) sidebar.style.width = saved + 'px';

  handle.addEventListener('mousedown', e => {
    dragging = true;
    startX   = e.clientX;
    startW   = sidebar.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.cursor    = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const delta = e.clientX - startX;
    // Removed MAX_W limit to allow full page resize! Min width set to 150px to prevent complete collapse.
    const newW  = Math.max(150, startW + delta);
    sidebar.style.width = newW + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.cursor    = '';
    document.body.style.userSelect = '';
    localStorage.setItem('sidebarWidth', sidebar.offsetWidth);
  });
})();

// ════ RIGHT SIDEBAR RESIZE ════
(function(){
  const handle  = document.getElementById('resizeHandleRight');
  const rSidebar = document.querySelector('.sidebar-right');
  if(!handle || !rSidebar) return;
  let dragging = false, startX = 0, startW = 0;

  // Set initial handle state
  handle.style.display = 'none';

  // Restore saved width
  const saved = localStorage.getItem('rightSidebarWidth');
  if(saved) rSidebar.style.width = saved + 'px';

  handle.addEventListener('mousedown', e => {
    dragging = true;
    startX   = e.clientX;
    startW   = rSidebar.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.cursor    = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const delta = e.clientX - startX;
    // Subtraction is correct here because drag-left (negative delta) increases the right sidebar's width.
    const newW  = Math.max(150, startW - delta);
    rSidebar.style.width = newW + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    document.body.style.cursor    = '';
    document.body.style.userSelect = '';
    localStorage.setItem('rightSidebarWidth', rSidebar.offsetWidth);
  });
})();

