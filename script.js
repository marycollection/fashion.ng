var SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwOfeJJ-UGqDaIemubaKjPzp5bmsF7Q3LKkI2QTFnnCWc6RRTcZnTi3OqXGHEvGQsx97Q/exec";
var lastPage = "home";
var adverts = [];
var advertIdx = 0;
var collection = [];
var cart = [];
var ceoName = "";
var _cache = {};
var _cacheTime = {};

function fixImg(url) {
  if (!url) return "https://via.placeholder.com/600x800?text=MARYS+COLLECTIONS";
  url = String(url);
  if (url.indexOf("drive.google.com") !== -1) {
    var id = "";
    var m = url.match(/[?&]id=([^&]+)/);
    if (m) { id = m[1]; }
    else { var m2 = url.match(/\/d\/([^\/]+)/); if (m2) { id = m2[1]; } }
    // SMALLER = FASTER: w600 instead of w1000
    if (id) return "https://drive.google.com/thumbnail?id=" + id + "&sz=w600";
  }
  return url;
}
function esc(s) { return String(s || "").replace(/&/g, "&amp;"); }
function showToast(m) {
  var t = document.getElementById("toast");
  t.innerText = m; t.style.display = "block";
  setTimeout(function () { t.style.display = "none"; }, 2500);
}
function isNotConnected() { return SCRIPT_URL.indexOf("YOUR_ID") !== -1; }

// FAST FETCH - 8 sec timeout + cache 30 sec
function api(a, p) {
  var key = a + "|" + (p || "");
  var now = Date.now();
  if (_cache[key] && (now - _cacheTime[key] < 30000)) {
    return Promise.resolve(_cache[key]);
  }
  var ctrl = new AbortController();
  var timer = setTimeout(function(){ ctrl.abort(); }, 8000);
  return fetch(SCRIPT_URL + "?action=" + a + "&" + (p || ""), { signal: ctrl.signal, cache: "no-store" })
    .then(function (r) { clearTimeout(timer); return r.json(); })
    .then(function(j){ _cache[key]=j; _cacheTime[key]=Date.now(); return j; })
    .catch(function(){ clearTimeout(timer); return _cache[key] || {data:[]}; });
}
function apiPost(a, payload) {
  payload = payload || {}; payload.action = a;
  // Clear cache after write so next load is fresh
  _cache = {}; _cacheTime = {};
  return fetch(SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) }).then(function (r) { return r.json(); });
}
function copyText(txt) {
  if (navigator.clipboard) { navigator.clipboard.writeText(txt).then(function () { showToast("COPIED: " + txt); }); }
  else { prompt("Copy this:", txt); }
}
// INSTANT NAV - show page FIRST, load data AFTER
function go(id, btn) {
  if (!id) return;
  var pages = document.querySelectorAll(".page");
  for (var i = 0; i < pages.length; i++) pages[i].classList.remove("active");
  var t = document.getElementById(id);
  if (t) t.classList.add("active");
  var nb = document.querySelectorAll("#mainNav button");
  for (var j = 0; j < nb.length; j++) nb[j].classList.remove("active");
  if (btn) btn.classList.add("active");
  else { var b = document.querySelector('#mainNav button[data-page="' + id + '"]'); if (b) b.classList.add("active"); }
  window.scrollTo(0, 0);
  // Load in background, do NOT block page
  setTimeout(function(){
    if (id === "home") loadHome();
    if (id === "collection") loadCollection();
  }, 10);
}
function goBack() { go(lastPage); }
function showDynamic(html) {
  var cur = document.querySelector(".page.active");
  lastPage = cur ? cur.id : "home";
  var pages = document.querySelectorAll(".page");
  for (var i = 0; i < pages.length; i++) pages[i].classList.remove("active");
  document.getElementById("dynamic").classList.add("active");
  document.getElementById("dynamicBox").innerHTML = html;
  window.scrollTo(0, 0);
}
function hideModals() { var ms = document.querySelectorAll(".modal"); for (var i = 0; i < ms.length; i++) ms[i].style.display = "none"; }
// Clock only every 30 sec, not every 1 sec - saves battery / speed
setInterval(function () { var el = document.getElementById("clock"); if (el) el.innerText = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }, 30000);
function demoCollection() {
  return [
    { id: "demo1", name: "Executive Gown - Classy", img: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=60", price: 35000, status: "AVAILABLE" },
    { id: "demo2", name: "Executive Suit - Premium", img: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&q=60", price: 45000, status: "AVAILABLE" },
    { id: "demo3", name: "Ankara Elegance", img: "https://images.unsplash.com/photo-1537832816519-689ad163238b?w=400&q=60", price: 28000, status: "AVAILABLE" }
  ];
}
function loadHome() {
  if (isNotConnected()) {
    adverts = [{ title: "MARY'S COLLECTIONS - New Arrivals", img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=60", url: "" }];
    showAdvert();
    renderHome(demoCollection());
    return;
  }
  // Show cached / demo instantly, then update when real data comes
  if (collection.length) renderHome(collection);
  api("getAdverts").then(function (j) { if (j.data && j.data.length) { adverts = j.data; showAdvert(); } }).catch(function () {});
  api("getCollection").then(function (j) { if (j.data) renderHome(j.data); }).catch(function () {});
}
function renderHome(list) {
  collection = list;
  var el = document.getElementById("homeCollection");
  if (!el) return;
  if (!list.length) { el.innerHTML = "<p>No collection yet. CEO should upload.</p>"; return; }
  var latest = list.slice(0, 5);
  var h = "";
  for (var i = 0; i < latest.length; i++) {
    var x = latest[i];
    var id = x.id || x[0]; var name = x.name || x[1]; var img = x.img || x[2]; var price = x.price || x[3]; var st = x.status || x[4];
    var sold = (st === "SOLD");
    h += '<div class="card" style="position:relative">' + (sold ? '<div class="soldTag">SOLD</div>' : '') + '<img class="colImg" loading="lazy" src="' + fixImg(img) + '" onclick="openFullImg(\'' + fixImg(img) + '\')"><h3>' + esc(name) + '</h3><p class="priceTag">N' + Number(price || 0).toLocaleString() + '</p><button class="btnDark full" onclick="go(\'collection\')">VIEW IN COLLECTION</button><button class="btnLight full" onclick="copyText(window.location.href)">COPY SITE URL</button>' + (sold ? '<button class="btnLight full" disabled>SOLD OUT</button>' : '<button class="btnGold full" onclick="addToCartById(\'' + id + '\')">BUY NOW</button>') + '</div>';
  }
  el.innerHTML = h;
}
function showAdvert() {
  if (!adverts.length) return;
  var a = adverts[advertIdx % adverts.length];
  var img = a.img || a[2]; var title = a.title || a[1]; var url = a.url || a[3] || "";
  var im = document.getElementById("advertImg");
  if (im) im.src = fixImg(img);
  var tt = document.getElementById("advertTitle");
  if (tt) tt.innerText = title;
  var bn = document.getElementById("advertBanner");
  if (bn) bn.setAttribute("data-url", url);
}
function clickAdvert() {
  var url = document.getElementById("advertBanner").getAttribute("data-url");
  if (url) { window.open(url, "_blank"); } else { go("collection"); }
}
setInterval(function () { if (adverts.length) { advertIdx++; showAdvert(); } }, 30000);
var _searchTimer = null;
function loadCollection() {
  if (isNotConnected()) { renderCollection(demoCollection()); return; }
  var q = document.getElementById("colSearch") ? document.getElementById("colSearch").value.toLowerCase() : "";
  // If we already have collection, filter instantly without waiting for network
  if (collection.length && !q) { renderCollection(collection); }
  api("getCollection").then(function (j) {
    var list = j.data || []; var f = [];
    for (var i = 0; i < list.length; i++) { if (!q || String(list[i][1]).toLowerCase().indexOf(q) !== -1) f.push(list[i]); }
    renderCollection(f);
  });
}
function renderCollection(list) {
  var el = document.getElementById("collectionList");
  if (!el) return;
  if (!list.length) { el.innerHTML = "<p>No collection found.</p>"; return; }
  var h = "";
  for (var i = 0; i < list.length; i++) {
    var x = list[i];
    var id, name, img, price, st;
    if (x.id) { id = x.id; name = x.name; img = x.img; price = x.price; st = x.status; }
    else { id = x[0]; name = x[1]; img = x[2]; price = x[3]; st = x[4]; }
    var sold = (st === "SOLD");
    h += '<div class="card" style="position:relative">' + (sold ? '<div class="soldTag">SOLD</div>' : '') + '<img class="colImg" loading="lazy" src="' + fixImg(img) + '" onclick="openFullImg(\'' + fixImg(img) + '\')"><h3>' + esc(name) + '</h3><p class="priceTag">N' + Number(price || 0).toLocaleString() + '</p>' + (sold ? '<button class="btnLight full" disabled>SOLD OUT</button>' : '<button class="btnGold full" onclick="addToCartById(\'' + id + '\')">BUY</button>') + '</div>';
  }
  el.innerHTML = h;
  if (isNotConnected()) collection = list;
  else collection = list.map(function (r) { return { id: r[0], name: r[1], img: r[2], price: r[3], status: r[4] }; });
}
function openFullImg(src) { document.getElementById("fullImgTag").src = fixImg(src); document.getElementById("fullImg").style.display = "flex"; }
function closeFullImg() { document.getElementById("fullImg").style.display = "none"; }
function addToCartById(id) {
  var item = null;
  for (var i = 0; i < collection.length; i++) { if (String(collection[i].id) === String(id)) { item = collection[i]; break; } }
  if (!item) return;
  cart.push(item);
  document.getElementById("cartCount").innerText = cart.length;
  showToast("SUCCESSFUL! Added to Cart");
  openCart();
}
function openCart() {
  var el = document.getElementById("cartItems");
  if (!cart.length) { el.innerHTML = "<p>Cart is empty. Go to Executive Collection and tap BUY.</p>"; document.getElementById("cartTotal").innerText = ""; }
  else {
    var h = "", total = 0;
    for (var i = 0; i < cart.length; i++) {
      total += Number(cart[i].price || 0);
      h += '<div style="display:flex;gap:10px;align-items:center;border:1px solid #eee;padding:8px;border-radius:12px;margin:6px 0"><img src="' + fixImg(cart[i].img) + '" style="width:70px;height:70px;object-fit:cover;object-position:center;border-radius:10px"><div><b>' + esc(cart[i].name) + '</b><br>N' + Number(cart[i].price || 0).toLocaleString() + '</div><button class="btnLight" onclick="removeCart(' + i + ')">X</button></div>';
    }
    el.innerHTML = h;
    document.getElementById("cartTotal").innerText = "Total Amount To Pay: N" + total.toLocaleString();
  }
  document.getElementById("cartModal").style.display = "flex";
}
function removeCart(i) { cart.splice(i, 1); document.getElementById("cartCount").innerText = cart.length; openCart(); }
function submitOrder() {
  if (!cart.length) return alert("Cart is empty");
  var addr = document.getElementById("ordAddress").value.trim();
  var phone = document.getElementById("ordPhone").value.trim();
  if (!addr || !phone) return alert("Fill Address and Phone Number");
  var total = 0;
  for (var i = 0; i < cart.length; i++) total += Number(cart[i].price || 0);
  var tracking = "MC" + Math.floor(100000 + Math.random() * 900000);
  if (isNotConnected()) {
    cart = []; document.getElementById("cartCount").innerText = "0"; hideModals();
    showDynamic('<div class="card"><h2>SUCCESSFUL!</h2><p>Thank you for shopping with Mary\'s Collections.</p><p>Pay <b>N' + total.toLocaleString() + '</b> to<br><b>ACCT Number: 1234567890 | Bank: Opay | Name: Mary Emmanuel</b></p><p>Your Tracking ID is:</p><h1 style="color:#D4A017">' + tracking + '</h1><button class="btnGold" onclick="copyText(\'' + tracking + '\')">COPY TRACKING ID</button><button class="btnDark" onclick="go(\'track\')">TRACK ORDER NOW</button><p><small>Demo - Connect Google Sheet to save order for CEO.</small></p></div>');
    return;
  }
  var items = [];
  for (var j = 0; j < cart.length; j++) items.push({ id: cart[j].id, name: cart[j].name, price: cart[j].price, img: cart[j].img });
  showToast("Submitting... Please wait");
  apiPost("createOrder", { tracking: tracking, address: addr, phone: phone, total: total, items: items }).then(function () {
    showToast("SUCCESSFUL! Order Submitted");
    cart = []; document.getElementById("cartCount").innerText = "0"; hideModals();
    showDynamic('<div class="card"><h2>SUCCESSFUL!</h2><p>Thank you for shopping with Mary\'s Collections.</p><p>Pay <b>N' + total.toLocaleString() + '</b> to<br><b>ACCT Number: 1234567890 | Bank: Opay | Name: Mary Emmanuel</b></p><p>Your Tracking ID is:</p><h1 style="color:#D4A017">' + tracking + '</h1><button class="btnGold" onclick="copyText(\'' + tracking + '\')">COPY TRACKING ID</button><button class="btnDark" onclick="go(\'track\')">TRACK ORDER NOW</button></div>');
  });
}
function trackOrder() {
  var id = document.getElementById("trackId").value.trim().toUpperCase();
  if (!id) return alert("Enter Tracking ID");
  if (isNotConnected()) {
    document.getElementById("trackResult").innerHTML = '<div class="card"><h3>Tracking: ' + esc(id) + ' (Demo)</h3><div class="trackStep done"><span>1. ORDER PAID</span><span>✓</span></div><div class="trackStep"><span>2. 3DAYS TO DELIVERED</span><span>○</span></div><div class="trackStep"><span>3. ORDER ON WAY</span><span>○</span></div><div class="trackStep"><span>4. DELIVERED</span><span>○</span></div><p>Connect Sheet for real live status.</p></div>';
    return;
  }
  document.getElementById("trackResult").innerHTML = "<p>Loading...</p>";
  api("getOrderById", "id=" + encodeURIComponent(id)).then(function (j) { renderTrack(j.order, j.status); });
}
function renderTrack(order, status) {
  var el = document.getElementById("trackResult");
  if (!order) { el.innerHTML = "<p>Order not found. Check Tracking ID.</p>"; return; }
  var steps = ["ORDER PAID", "3DAYS TO DELIVERED", "ORDER ON WAY", "DELIVERED"];
  var cur = steps.indexOf(status || "ORDER PAID");
  var h = '<div class="card"><h3>Tracking: ' + esc(order.tracking) + '</h3><p>Total: N' + Number(order.total || 0).toLocaleString() + ' | Phone: ' + esc(order.phone) + '</p>';
  for (var i = 0; i < steps.length; i++) {
    var cls = (i <= cur) ? "trackStep done" : "trackStep";
    h += '<div class="' + cls + '"><span>' + (i + 1) + '. ' + steps[i] + '</span><span>' + (i <= cur ? "✓" : "○") + '</span></div>';
  }
  h += "</div>";
  el.innerHTML = h;
}
function ceoStep1() {
  var n = document.getElementById("ceoName").value.trim();
  if (!n) return alert("Enter CEO Name");
  ceoName = n;
  document.getElementById("ceoStep1").style.display = "none";
  document.getElementById("ceoStep2").style.display = "block";
  document.getElementById("ceoNameShow").innerText = n;
}
function ceoLogin() {
  var code = document.getElementById("ceoCode").value.trim();
  var pass = document.getElementById("ceoPass").value.trim();
  if (!code || !pass) return alert("Fill Verify Code and Password");
  if (isNotConnected()) {
    if (code === "30507555" && pass === "admin123") showCeoDash();
    else alert("Wrong Verify Code or Password - Demo: 30507555 / admin123");
    return;
  }
  apiPost("ceoLogin", { name: ceoName, code: code, pass: pass }).then(function (j) {
    if (!j.valid) return alert("Wrong Verify Code or Password");
    showCeoDash();
  });
}
function showCeoDash() {
  showToast("SUCCESSFUL! Welcome CEO " + ceoName);
  document.getElementById("ceoDash").innerHTML = '<div class="card"><h3>Welcome CEO, ' + esc(ceoName) + '</h3><div class="grid3"><button class="btnGold" onclick="ceoAdvert()">ADVERT PLACEMENT</button><button class="btnDark" onclick="ceoCollection()">COLLECTION</button><button class="btnGold" onclick="ceoSold()">SOLD ITEMS</button><button class="btnDark" onclick="ceoTrack()">TRACK ORDER</button><button class="btnLight" onclick="ceoReset()">RESET PASSWORD</button></div></div>';
}
function ceoAdvert() {
  if (isNotConnected()) {
    showDynamic('<div class="card"><h3>ADVERT PLACEMENT - CEO (Demo)</h3><p>Connect Sheet to save for all devices.</p><input id="adTitle" placeholder="Short Title *"><input id="adUrl" placeholder="URL (if any) e.g https://..."><label>Upload Image png/jpg</label><input id="adFile" type="file" accept="image/*"><input id="adImg" placeholder="OR paste Image URL"><button class="btnGold full" onclick="saveAdvert()">SAVE - Show on Home</button></div>');
    return;
  }
  showDynamic('<div class="card"><p>Loading adverts...</p></div>');
  api("getAdverts").then(function (j) {
    var list = j.data || [];
    var h = '<div class="card"><h3>ADVERT PLACEMENT - CEO</h3><input id="adTitle" placeholder="Short Title *"><input id="adUrl" placeholder="URL (if any) e.g https://..."><label>Upload Image png/jpg</label><input id="adFile" type="file" accept="image/*"><input id="adImg" placeholder="OR paste Image URL"><button class="btnGold full" onclick="saveAdvert()">SAVE - Show on Home</button></div>';
    h += '<div class="card"><h3>Current Adverts - Stay On List</h3><table><tr><th>TITLE</th><th>IMAGE</th><th>ACTION</th></tr>';
    for (var i = 0; i < list.length; i++) { h += '<tr><td>' + esc(list[i][1]) + '</td><td><img loading="lazy" src="' + fixImg(list[i][2]) + '" style="width:60px;height:80px;object-fit:cover;object-position:center"></td><td><button class="btnLight" onclick="deleteAdvert(\'' + list[i][0] + '\')">DELETE</button></td></tr>'; }
    h += "</table>" + (!list.length ? "<p>No adverts yet</p>" : "") + "</div>";
    showDynamic(h);
  });
}
function saveAdvert() {
  var title = document.getElementById("adTitle").value.trim();
  var url = document.getElementById("adUrl").value.trim();
  var imgUrl = document.getElementById("adImg").value.trim();
  if (!title) return alert("Enter Title");
  if (isNotConnected()) { showToast("SUCCESSFUL! Advert Saved (Demo)"); alert("SUCCESSFUL! Advert Saved - Connect Sheet to show on Home"); return; }
  var file = document.getElementById("adFile").files[0];
  if (file) {
    var r = new FileReader();
    r.onload = function (ev) { var b64 = ev.target.result.split(",")[1]; apiPost("uploadImage", { name: file.name, data: b64, mime: file.type }).then(function (up) { if (up.status === "ok") imgUrl = up.url; finishAdvert(title, url, imgUrl); }); };
    r.readAsDataURL(file);
  } else { finishAdvert(title, url, imgUrl); }
}
function finishAdvert(title, url, imgUrl) {
  if (!imgUrl) return alert("Upload Image or Paste URL");
  apiPost("saveAdvert", { title: title, url: url, img: imgUrl }).then(function () { showToast("SUCCESSFUL! Advert Saved"); alert("SUCCESSFUL! Advert Now On Home"); ceoAdvert(); });
}
function deleteAdvert(id) {
  if (!confirm("Delete this advert from Home?")) return;
  apiPost("deleteAdvert", { id: id }).then(function () { showToast("SUCCESSFUL! Advert Deleted"); alert("SUCCESSFUL! Advert Deleted From Home"); ceoAdvert(); });
}
function ceoCollection() {
  if (isNotConnected()) {
    showDynamic('<div class="card"><h3>COLLECTION - CEO Upload (Demo)</h3><p>Connect Sheet to save.</p><input id="colName" placeholder="Product Name *"><input id="colPrice" type="number" placeholder="Price Tag *"><label>Upload Image png/jpg</label><input id="colFile" type="file" accept="image/*"><input id="colImg" placeholder="OR paste Image URL"><button class="btnGold full" onclick="saveCollection()">SAVE</button></div>');
    return;
  }
  showDynamic('<div class="card"><p>Loading collection...</p></div>');
  api("getCollection").then(function (j) {
    var list = j.data || [];
    var h = '<div class="card"><h3>COLLECTION - CEO Upload</h3><input id="colName" placeholder="Product Name *"><input id="colPrice" type="number" placeholder="Price Tag *"><label>Upload Image png/jpg</label><input id="colFile" type="file" accept="image/*"><input id="colImg" placeholder="OR paste Image URL"><button class="btnGold full" onclick="saveCollection()">SAVE - Show in Collection + Home</button></div>';
    h += '<div class="card"><h3>Collection List - Stay On List</h3><table><tr><th>NAME</th><th>PRICE</th><th>STATUS</th><th>ACTION</th></tr>';
    for (var i = 0; i < list.length; i++) { h += '<tr><td>' + esc(list[i][1]) + '</td><td>N' + Number(list[i][3] || 0).toLocaleString() + '</td><td>' + esc(list[i][4] || "AVAILABLE") + '</td><td><button class="btnLight" onclick="deleteCollection(\'' + list[i][0] + '\')">DELETE</button></td></tr>'; }
    h += "</table>" + (!list.length ? "<p>No collection yet</p>" : "") + "</div>";
    showDynamic(h);
  });
}
function saveCollection() {
  var name = document.getElementById("colName").value.trim();
  var price = document.getElementById("colPrice").value;
  var imgUrl = document.getElementById("colImg").value.trim();
  if (!name || !price) return alert("Fill Name and Price Tag");
  if (isNotConnected()) { showToast("SUCCESSFUL! Collection Saved (Demo)"); alert("SUCCESSFUL! Collection Saved - Connect Sheet to show for all"); return; }
  var file = document.getElementById("colFile").files[0];
  if (file) {
    var r = new FileReader();
    r.onload = function (ev) { var b64 = ev.target.result.split(",")[1]; apiPost("uploadImage", { name: file.name, data: b64, mime: file.type }).then(function (up) { if (up.status === "ok") imgUrl = up.url; finishCollection(name, price, imgUrl); }); };
    r.readAsDataURL(file);
  } else { finishCollection(name, price, imgUrl); }
}
function finishCollection(name, price, imgUrl) {
  if (!imgUrl) return alert("Upload Image or Paste URL");
  apiPost("saveCollection", { name: name, price: price, img: imgUrl }).then(function () { showToast("SUCCESSFUL! Collection Saved"); alert("SUCCESSFUL! Collection Saved"); ceoCollection(); });
}
function deleteCollection(id) {
  if (!confirm("Delete this item? It will be deleted from Collection and Home.")) return;
  apiPost("deleteCollection", { id: id }).then(function () { showToast("SUCCESSFUL! Deleted"); alert("SUCCESSFUL! Deleted"); ceoCollection(); });
}
function ceoSold() {
  if (isNotConnected()) { showDynamic('<div class="card"><h3>SOLD ITEMS - CEO (Demo)</h3><p>Connect Sheet to see real orders.</p></div>'); return; }
  showDynamic('<div class="card"><p>Loading sold items...</p></div>');
  api("getOrders").then(function (j) {
    var list = j.data || [];
    var h = '<div class="card"><h3>SOLD ITEMS - CEO</h3><p>Click PAID when customer has paid. Item will show SOLD.</p><table><tr><th>TRACKING</th><th>IMAGE</th><th>PRICE</th><th>ADDRESS</th><th>PHONE</th><th>STATUS</th><th>ACTION</th></tr>';
    for (var i = 0; i < list.length; i++) { var x = list[i]; h += '<tr><td><b>' + esc(x[1]) + '</b></td><td><img loading="lazy" src="' + fixImg(x[5] || "") + '" style="width:60px;height:60px;object-fit:cover;object-position:center"></td><td>N' + Number(x[4] || 0).toLocaleString() + '</td><td>' + esc(x[2]) + '</td><td>' + esc(x[3]) + '</td><td>' + esc(x[6] || "PENDING") + '</td><td><button class="btnGreen" onclick="markPaid(\'' + x[0] + '\',\'' + x[7] + '\')">PAID</button> <button class="btnLight" onclick="deleteOrder(\'' + x[0] + '\')">DELETE</button></td></tr>'; }
    h += "</table>" + (!list.length ? "<p>No sold items yet</p>" : "") + "</div>";
    showDynamic(h);
  });
}
function markPaid(orderId, itemId) { apiPost("markPaid", { orderId: orderId, itemId: itemId }).then(function () { showToast("SUCCESSFUL! Marked PAID - Item Now Shows SOLD"); alert("SUCCESSFUL! Marked PAID - Item Now Shows SOLD"); ceoSold(); }); }
function deleteOrder(id) { if (!confirm("Delete this sold item?")) return; apiPost("deleteOrder", { id: id }).then(function () { showToast("SUCCESSFUL! Deleted"); alert("SUCCESSFUL! Deleted"); ceoSold(); }); }
function ceoTrack() { showDynamic('<div class="card"><h3>TRACK ORDER - CEO Update</h3><input id="ceoTrackId" placeholder="Tracking ID"><button class="btnGold full" onclick="ceoTrackLoad()">TRACK</button><div id="ceoTrackBox"></div></div>'); }
function ceoTrackLoad() {
  var id = document.getElementById("ceoTrackId").value.trim().toUpperCase();
  if (!id) return alert("Enter Tracking ID");
  if (isNotConnected()) { document.getElementById("ceoTrackBox").innerHTML = "<p>Demo - Connect Sheet to update real order.</p>"; return; }
  api("getOrderById", "id=" + encodeURIComponent(id)).then(function (j) {
    if (!j.order) { document.getElementById("ceoTrackBox").innerHTML = "<p>Order not found</p>"; return; }
    var steps = ["ORDER PAID", "3DAYS TO DELIVERED", "ORDER ON WAY", "DELIVERED"];
    var h = "<p>Tracking: <b>" + esc(id) + "</b> - Current: <b>" + esc(j.status) + "</b></p><p>Click any step - it will turn GREEN for customer at TRACK ORDER.</p>";
    for (var i = 0; i < steps.length; i++) { h += '<button class="btnLight full" onclick="ceoSetStatus(\'' + id + '\',\'' + steps[i] + '\')">Set To: ' + steps[i] + '</button>'; }
    document.getElementById("ceoTrackBox").innerHTML = h;
  });
}
function ceoSetStatus(id, status) { apiPost("setOrderStatus", { tracking: id, status: status }).then(function () { showToast("SUCCESSFUL! Status Updated To " + status); alert("SUCCESSFUL! Status Updated To " + status); ceoTrackLoad(); }); }
function ceoReset() { showDynamic('<div class="card"><h3>RESET PASSWORD - CEO PORTAL</h3><input id="rpOld" type="password" placeholder="OLD PASSWORD"><input id="rpNew" type="password" placeholder="NEW PASSWORD"><button class="btnGold full" onclick="doCeoReset()">SAVE</button></div>'); }
function doCeoReset() {
  var oldP = document.getElementById("rpOld").value;
  var newP = document.getElementById("rpNew").value;
  if (!oldP || !newP) return alert("Fill Old and New Password");
  if (isNotConnected()) { showToast("SUCCESSFUL! Password Changed (Demo)"); alert("SUCCESSFUL! Password Changed"); return; }
  apiPost("ceoResetPass", { old: oldP, new: newP }).then(function (j) { if (j.status === "ok") { showToast("SUCCESSFUL! Password Changed"); alert("SUCCESSFUL! Password Changed"); } else { alert("Wrong Old Password"); } });
}
document.addEventListener("DOMContentLoaded", function () {
  var nav = document.getElementById("mainNav");
  if (nav) {
    nav.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      var page = btn.getAttribute("data-page");
      if (page) go(page, btn);
    });
  }
  loadHome();
});