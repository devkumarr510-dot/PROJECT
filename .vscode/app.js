// LocalMart – tiny single-page app in plain JavaScript.
(function () {
  const db = DB.load();
  const save = () => DB.save(db) || toast('Storage is full – use a smaller photo.');
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
  const money = n => '₹' + n;
  const cost = p => Math.round(p.price * (100 - p.discount) / 100);
  const next = list => Math.max(0, ...list.map(x => x.id)) + 1;
  const src = (u, w) => (u.startsWith('http') ? u + (u.includes('?') ? '&' : '?') + 'auto=format&fit=crop&w=' + w : u);
  const img = (u, w) => `<img src="${esc(src(u, w))}" alt="">`;
  const me = () => db.users.find(u => u.id === db.me);
  const vendor = id => db.vendors.find(v => v.id === id);
  const product = id => db.products.find(p => p.id === id);
  const live = () => db.products.filter(p => p.active && vendor(p.vendorId).status === 'approved');
  const STATUS = ['Placed', 'Confirmed', 'Packed', 'Out for Delivery', 'Delivered'];
  let search = '', category = '', photo = '', slide = 0, timer;

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast error'; t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }
  const go = hash => (location.hash === hash ? render() : (location.hash = hash));
  const notice = msg => `<div class="container page"><div class="card empty"><h2>${esc(msg)}</h2><a class="btn btn-primary" href="#/login">Login</a></div></div>`;

  /* ---------- cart: the button on the item turns into  –  qty  +  ---------- */
  const qtyOf = id => (DB.cart.get().find(c => c.pid === id) || { qty: 0 }).qty;
  function cartCtl(p) {
    const q = qtyOf(p.id);
    if (p.stock <= 0) return '<div class="cc" data-pid="' + p.id + '"><button class="btn btn-ghost btn-block" disabled>Out of stock</button></div>';
    return `<div class="cc" data-pid="${p.id}">` + (!q ? `<button class="btn btn-primary" data-act="add" data-id="${p.id}">Add to cart</button>`
      : `<div class="stepper"><button data-act="sub" data-id="${p.id}">−</button><span>${q}<small>in cart</small></span><button data-act="add" data-id="${p.id}" ${q >= p.stock ? 'disabled' : ''}>+</button></div>`) + '</div>';
  }
  function changeQty(id, change) {
    const u = me(), p = product(id), q = qtyOf(id) + change;
    if (u && u.role !== 'customer') return toast('Please use a customer account to shop.');
    if (q > p.stock) return toast('Only ' + p.stock + ' in stock.');
    DB.cart.set(DB.cart.get().filter(c => c.pid !== id).concat(q > 0 ? [{ pid: id, qty: q }] : []));
    if (location.hash === '#/cart') return render();
    document.querySelectorAll(`.cc[data-pid="${id}"]`).forEach(el => { el.outerHTML = cartCtl(p); });
    nav();
  }
  // Cart lines grouped by seller: each seller receives its own order.
  function groups() {
    const g = {};
    DB.cart.get().forEach(c => {
      const p = product(c.pid);
      if (!p) return;
      g[p.vendorId] = g[p.vendorId] || { v: vendor(p.vendorId), lines: [], total: 0 };
      g[p.vendorId].lines.push({ p, qty: c.qty });
      g[p.vendorId].total += cost(p) * c.qty;
    });
    return Object.values(g).map(x => Object.assign(x, { delivery: x.total >= 500 ? 0 : 30 }));
  }

  /* ---------- pieces ---------- */
  function nav() {
    const u = me(), n = DB.cart.get().reduce((s, c) => s + c.qty, 0), role = u && u.role;
    $('#nav').innerHTML = '<a href="#/shop">Shop</a><a href="#/sellers/farmer">Farmers</a><a href="#/sellers/vendor">Vendors</a>'
      + (role === 'seller' || role === 'admin' ? '' : '<a href="#/register/farmer">Sell with us</a><a href="#/cart">Cart' + (n ? `<span class="badge">${n}</span>` : '') + '</a>')
      + (role === 'customer' ? '<a href="#/orders">My orders</a>' : '') + (role === 'seller' ? '<a href="#/dashboard">Seller dashboard</a>' : '') + (role === 'admin' ? '<a href="#/admin">Admin</a>' : '')
      + (u ? `<button class="link" data-act="logout">Logout (${esc(u.name.split(' ')[0])})</button>` : '<a href="#/login">Login</a><a class="pill" href="#/register">Sign up</a>');
    $('#nav').classList.remove('open');
  }
  function card(p) {
    const v = vendor(p.vendorId);
    return `<article class="card pcard"><a href="#/product/${p.id}" class="pimg">${img(p.img, 600)}
        <span class="badges">${v.type === 'farmer' ? '<span class="bdg farm">Farm direct</span>' : ''}</span>${p.discount ? `<span class="off">${p.discount}% OFF</span>` : ''}</a>
      <div class="pbody"><a class="ptitle" href="#/product/${p.id}">${esc(p.name)}</a><a class="pvendor" href="#/store/${v.id}">${esc(v.name)} · ${esc(v.city)}</a>
        <div class="price"><b>${money(cost(p))}</b><span class="unit">/ ${esc(p.unit)}</span>${p.discount ? `<s>${money(p.price)}</s>` : ''}</div>
        <div class="pstock ${p.stock <= 5 ? 'low' : ''}">${p.stock <= 0 ? 'Out of stock' : p.stock <= 5 ? 'Only ' + p.stock + ' left' : 'In stock'}</div>
        <div class="pactions">${cartCtl(p)}</div></div></article>`;
  }
  function sellerCard(v) {
    const p = db.products.find(x => x.vendorId === v.id);
    return `<article class="card vcard"><a class="vcover" href="#/store/${v.id}" style="background-image:url('${p ? esc(src(p.img, 700)) : ''}')"></a>
      <div class="vbody"><h3><a href="#/store/${v.id}" style="color:inherit">${esc(v.name)}</a></h3>
        <div><span class="tag ${v.type === 'farmer' ? 'farm' : ''}">${v.type === 'farmer' ? 'Farmer' : 'Vendor'}</span> <span class="tag">${esc(v.category)}</span> <span class="muted">${esc(v.city)}</span></div>
        <p class="muted" style="margin:0">${esc(v.desc)}</p>${v.acres ? `<small>${v.acres} acres · ${esc(v.crops)}</small>` : ''}</div></article>`;
  }

  /* ---------- pages ---------- */
  // Slideshow: each slide has a banner photo, a headline and related products.
  const SLIDES = [['Straight from the farm', 'Vegetables picked this morning', 'Vegetables', [1, 2, 3]], ['Orchard fresh', 'Kinnow, guava and limes from Punjab’s orchards', 'Fruits', [5, 6, 7]],
    ['Honey & eggs', 'Raw honey and free-range eggs from local farms', 'Dairy, Eggs & Honey', [8, 9]], ['From the oven', 'Breads and cakes baked fresh nearby', 'Bakery', [15, 16, 17]],
    ['Handmade locally', 'Embroidery and handloom by village artisans', 'Handloom & Crafts', [18, 19, 20]]];
  function showSlide(i) {
    slide = (i + SLIDES.length) % SLIDES.length;
    document.querySelectorAll('.slide').forEach((el, k) => el.classList.toggle('active', k === slide));
    document.querySelectorAll('.dot').forEach((el, k) => el.classList.toggle('on', k === slide));
  }
  function home() {
    const farmers = db.vendors.filter(v => v.type === 'farmer').slice(0, 3);
    return `<section class="slider">${SLIDES.map((s, i) => `<div class="slide ${i ? '' : 'active'}" style="background-image:url('${DB.BANNERS[i]}?auto=format&fit=crop&w=1600')"><div class="container slide-in">
        <div class="slide-copy"><span class="kicker">${s[0]}</span><h1>${s[1]}</h1><div class="slide-cta"><button class="btn btn-accent btn-lg" data-act="cat" data-cat="${s[2]}">Shop ${s[2]}</button></div></div>
        <div class="slide-items">${s[3].map(id => product(id)).filter(Boolean).map(p => `<a class="mini" href="#/product/${p.id}"><div class="mimg">${img(p.img, 320)}</div><span>${esc(p.name)}</span><b>${money(cost(p))} / ${esc(p.unit)}</b></a>`).join('')}</div></div></div>`).join('')}
      <button class="s-nav prev" data-act="slide" data-d="-1" aria-label="Previous">‹</button><button class="s-nav next" data-act="slide" data-d="1" aria-label="Next">›</button>
      <div class="dots">${SLIDES.map((s, i) => `<button class="dot ${i ? '' : 'on'}" data-act="slide" data-i="${i}" aria-label="Slide ${i + 1}"></button>`).join('')}</div></section>
      <div class="container"><section class="section"><h2>Shop by category</h2><div class="cats">${DB.CATEGORIES.map(c => `<button class="cat" data-act="cat" data-cat="${esc(c)}">${img((db.products.find(p => p.category === c) || { img: '' }).img, 420)}<span>${esc(c)}</span></button>`).join('')}</div></section>
      <section class="section"><h2>Meet our farmers</h2><div class="grid grid-v">${farmers.map(sellerCard).join('')}</div></section></div>`;
  }
  const shopList = () => live().filter(p => (!category || p.category === category) && (p.name + p.category + vendor(p.vendorId).name).toLowerCase().includes(search.toLowerCase())).map(card).join('') || '<div class="card empty">No products found</div>';
  const shop = () => `<div class="container page"><h1 class="page-title">Shop local</h1><div class="card filters" style="grid-template-columns:2fr 1fr">
      <input data-filter="search" value="${esc(search)}" placeholder="Search products or sellers"><select data-filter="category"><option value="">All categories</option>${DB.CATEGORIES.map(c => `<option ${c === category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="grid" id="grid">${shopList()}</div></div>`;
  const sellers = type => `<div class="container page"><h1 class="page-title">${type === 'farmer' ? 'Our farmers' : 'Local vendors'}</h1><div class="grid grid-v">${db.vendors.filter(v => v.type === type && v.status === 'approved').map(sellerCard).join('')}</div></div>`;
  function store(id) {
    const v = vendor(+id);
    if (!v) return notice('Seller not found');
    return `<div class="container page"><h1>${esc(v.name)}</h1><p class="muted">${esc(v.city)} · ${esc(v.desc)} ${v.acres ? '· ' + v.acres + ' acres · ' + esc(v.crops) : ''}</p>
      <div class="grid">${live().filter(p => p.vendorId === v.id).map(card).join('') || '<p class="muted">No products yet.</p>'}</div></div>`;
  }
  function productPage(id) {
    const p = live().find(x => x.id === +id);
    if (!p) return notice('Product not found');
    const v = vendor(p.vendorId), others = live().filter(x => x.name === p.name && x.id !== p.id);
    return `<div class="container page"><div class="card detail"><div class="big-img">${img(p.img, 1000)}</div><div><h1>${esc(p.name)}</h1>
      <div class="price"><b>${money(cost(p))}</b><span class="unit">/ ${esc(p.unit)}</span>${p.discount ? `<s>${money(p.price)}</s>` : ''}</div><p>${esc(p.desc)}</p>
      <p>Sold by <a href="#/store/${v.id}">${esc(v.name)}</a> (${v.type === 'farmer' ? 'farmer' : 'vendor'}, ${esc(v.city)})</p>
      <p class="pstock ${p.stock <= 5 ? 'low' : ''}">${p.stock} available</p>${cartCtl(p)}
      ${others.length ? `<h4 style="margin-top:20px">Also sold by</h4>${others.map(x => `<p><a href="#/product/${x.id}">${esc(vendor(x.vendorId).name)}</a> – <b>${money(cost(x))}</b> / ${esc(x.unit)}</p>`).join('')}` : ''}</div></div></div>`;
  }
  function cartPage() {
    const gs = groups();
    if (!gs.length) return '<div class="container page"><div class="card empty"><h2>Your cart is empty</h2><a class="btn btn-primary" href="#/shop">Start shopping</a></div></div>';
    return `<div class="container page"><h1 class="page-title">Cart</h1>${gs.map(g => `<div class="card cart-group"><header>${esc(g.v.name)}</header>
      ${g.lines.map(l => `<div class="cart-line">${img(l.p.img, 160).replace('<img', '<img class="thumb"')}<b>${esc(l.p.name)}</b>${cartCtl(l.p)}<b>${money(cost(l.p) * l.qty)}</b><span></span></div>`).join('')}
      <div class="cart-line" style="grid-template-columns:1fr auto"><small class="muted">Delivery ${g.delivery ? money(g.delivery) : 'free'}</small><b>${money(g.total + g.delivery)}</b></div></div>`).join('')}
      <a class="btn btn-primary btn-lg" href="#/checkout">Checkout · ${money(gs.reduce((s, g) => s + g.total + g.delivery, 0))}</a></div>`;
  }
  function checkout() {
    const u = me();
    if (!u || u.role !== 'customer') return notice('Please login with a customer account to checkout.');
    if (!groups().length) return go('#/cart');
    return `<div class="container page"><h1 class="page-title">Checkout</h1><form data-form="checkout" class="card pad" style="max-width:600px"><div class="form-grid">
      <div class="field full"><label>Full name</label><input name="name" required value="${esc(u.name)}"></div>
      <div class="field full"><label>Address</label><input name="address" required></div>
      <div class="field"><label>Mobile</label><input name="phone" required pattern="[6-9][0-9]{9}" title="10-digit mobile number"></div>
      <div class="field"><label>Payment (demo)</label><select name="pay"><option>UPI</option><option>Card</option><option>Cash on delivery</option></select></div></div>
      <button class="btn btn-primary btn-block btn-lg">Place order</button></form></div>`;
  }
  function orderCard(o, seller) {
    const nextStatus = STATUS[STATUS.indexOf(o.status) + 1];
    return `<article class="card pad" style="margin-bottom:12px"><div class="row-between"><b>Order LM${1000 + o.id} · ${esc(vendor(o.vendorId).name)}</b><span class="tag warn">${o.status}</span></div>
      <p>${o.items.map(i => esc(i.name) + ' × ' + i.qty).join(', ')} — <b>${money(o.total)}</b></p><small class="muted">${esc(o.payment)} · ${esc(o.address)}</small>
      ${seller && nextStatus ? `<div style="margin-top:8px"><button class="btn btn-primary btn-sm" data-act="advance" data-id="${o.id}">Mark as ${nextStatus}</button></div>` : ''}</article>`;
  }
  const orders = () => me() && me().role === 'customer' ? `<div class="container page"><h1 class="page-title">My orders</h1>${db.orders.filter(o => o.userId === db.me).reverse().map(o => orderCard(o)).join('') || '<p class="muted">No orders yet.</p>'}</div>` : notice('Login as a customer.');

  const login = () => `<div class="container"><form data-form="login" class="card pad auth"><h2>Login</h2><div class="field"><label>Email</label><input name="email" type="email" required></div>
    <div class="field"><label>Password</label><input name="pass" type="password" required></div><button class="btn btn-primary btn-block">Login</button>
    <div class="alert" style="margin-top:14px"><small><b>Demo accounts</b><br>Customer: customer@demo.in / customer123<br>Farmer: farmer@demo.in / farmer123<br>Vendor: vendor@demo.in / vendor123<br>Admin: admin@localmart.in / admin123</small></div></form></div>`;
  const register = role => `<div class="container"><form data-form="register" id="reg" data-role="${role || 'customer'}" class="card pad auth"><h2>Create account</h2>
    <div class="field"><label>I want to</label><select name="role" data-act="role">${[['customer', 'Buy from local sellers'], ['farmer', 'Sell my farm produce'], ['vendor', 'Sell from my shop']].map(r => `<option value="${r[0]}" ${r[0] === role ? 'selected' : ''}>${r[1]}</option>`).join('')}</select></div>
    <div class="field"><label>Full name</label><input name="name" required></div><div class="field"><label>Email</label><input name="email" type="email" required></div>
    <div class="field"><label>Password (min 6)</label><input name="pass" type="password" minlength="6" required></div>
    <div class="seller-only"><div class="field"><label>Farm / store name</label><input name="store"></div><div class="field"><label>Category</label><select name="category">${DB.CATEGORIES.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
      <div class="field"><label>Village / area</label><input name="city"></div><div class="field farmer-only"><label>Farm size (acres)</label><input name="acres" type="number" min="1"></div>
      <div class="field farmer-only"><label>Main crops</label><input name="crops"></div><div class="field"><label>About</label><input name="desc"></div>
      <div class="alert warn"><small>Sellers are approved by the admin before products go live.</small></div></div><button class="btn btn-primary btn-block">Create account</button></form></div>`;

  function dashboard() {
    const u = me();
    if (!u || u.role !== 'seller') return notice('Seller access only.');
    const v = vendor(u.vendorId);
    return `<div class="container page"><h1 class="page-title">${esc(v.name)}</h1>${v.status !== 'approved' ? `<div class="alert warn">Status: <b>${v.status}</b> – products go live once the admin approves you.</div>` : ''}
      <div class="row-between" style="margin-bottom:12px"><h3 style="margin:0">Your products</h3><button class="btn btn-primary" data-act="newProduct">+ Add product</button></div>
      <div class="card table-wrap"><table><thead><tr><th>Product</th><th>Price</th><th>Stock</th><th></th></tr></thead><tbody>${db.products.filter(p => p.vendorId === v.id).map(p => `<tr>
        <td><div class="cell">${img(p.img, 120).replace('<img', '<img class="thumb"')}<b>${esc(p.name)}</b></div></td><td>${money(p.price)} / ${esc(p.unit)}</td>
        <td><input class="stock-in" type="number" min="0" value="${p.stock}" data-stock="${p.id}"></td>
        <td><button class="btn btn-ghost btn-sm" data-act="toggle" data-id="${p.id}">${p.active ? 'Hide' : 'Show'}</button> <button class="btn btn-danger btn-sm" data-act="delete" data-id="${p.id}">Delete</button></td></tr>`).join('') || '<tr><td colspan="4">No products yet.</td></tr>'}</tbody></table></div>
      <h3 style="margin-top:26px">Orders</h3>${db.orders.filter(o => o.vendorId === v.id).reverse().map(o => orderCard(o, true)).join('') || '<p class="muted">No orders yet.</p>'}</div>`;
  }
  const productForm = () => `<h3>Add a product</h3><form data-form="product"><div class="form-grid"><div class="field full"><label>Photo</label><input type="file" accept="image/*" data-upload="1">
    <input name="imgurl" placeholder="…or paste an image link" style="margin-top:6px"></div><div class="field full"><label>Name</label><input name="name" required></div>
    <div class="field"><label>Category</label><select name="category">${DB.CATEGORIES.map(c => `<option>${esc(c)}</option>`).join('')}</select></div><div class="field"><label>Sold per</label><input name="unit" value="kg" required></div>
    <div class="field"><label>Price (₹)</label><input name="price" type="number" min="1" required></div><div class="field"><label>Discount (%)</label><input name="discount" type="number" min="0" max="90" value="0"></div>
    <div class="field"><label>Quantity</label><input name="stock" type="number" min="0" required></div><div class="field full"><label>Description</label><input name="desc"></div></div><button class="btn btn-primary">Add product</button></form>`;
  function admin() {
    if (!me() || me().role !== 'admin') return notice('Admin access only.');
    return `<div class="container page"><h1 class="page-title">Admin</h1><p>${db.orders.length} orders · ${db.products.length} products · sales ${money(db.orders.reduce((s, o) => s + o.total, 0))}</p>
      <div class="card table-wrap"><table><thead><tr><th>Seller</th><th>Type</th><th>Status</th><th></th></tr></thead><tbody>${db.vendors.map(v => `<tr><td><b>${esc(v.name)}</b><br><small class="muted">${esc(v.city)}</small></td><td>${v.type}</td>
        <td><span class="tag ${v.status === 'approved' ? '' : 'warn'}">${v.status}</span></td><td><button class="btn btn-sm ${v.status === 'approved' ? 'btn-danger' : 'btn-primary'}" data-act="status" data-id="${v.id}">${v.status === 'approved' ? 'Suspend' : 'Approve'}</button></td></tr>`).join('')}</tbody></table></div></div>`;
  }

  /* ---------- router ---------- */
  const routes = { home, shop, sellers, store, product: productPage, cart: cartPage, checkout, orders, login, register, dashboard, admin };
  function render() {
    clearInterval(timer);
    const [name, arg] = location.hash.replace(/^#\/?/, '').split('/');
    $('#app').innerHTML = (routes[name || 'home'] || (() => notice('Page not found')))(arg) || '';
    nav();
    if (!name) timer = setInterval(() => showSlide(slide + 1), 5500);
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);

  /* ---------- events ---------- */
  const actions = {
    menu: () => $('#nav').classList.toggle('open'),
    closeModal: () => $('#modal').classList.add('hidden'),
    reset: () => { DB.reset(); location.hash = '#/'; location.reload(); },
    logout: () => { db.me = 0; save(); go('#/'); },
    add: el => changeQty(+el.dataset.id, 1),
    sub: el => changeQty(+el.dataset.id, -1),
    slide: el => showSlide(el.dataset.i ? +el.dataset.i : slide + +el.dataset.d),
    cat: el => { category = el.dataset.cat; search = ''; go('#/shop'); },
    newProduct: () => { photo = ''; $('#modalBody').innerHTML = productForm(); $('#modal').classList.remove('hidden'); },
    toggle: el => { const p = product(+el.dataset.id); p.active = !p.active; save(); render(); },
    delete: el => { if (confirm('Delete this product?')) { db.products = db.products.filter(p => p.id !== +el.dataset.id); save(); render(); } },
    advance: el => { const o = db.orders.find(x => x.id === +el.dataset.id); o.status = STATUS[STATUS.indexOf(o.status) + 1]; save(); render(); },
    status: el => { const v = vendor(+el.dataset.id); v.status = v.status === 'approved' ? 'suspended' : 'approved'; save(); render(); }
  };
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (e.target.id === 'modal') actions.closeModal();
    else if (el && el.tagName !== 'SELECT') actions[el.dataset.act](el);
  });
  document.addEventListener('input', e => {
    const key = e.target.dataset.filter;
    if (!key) return;
    if (key === 'search') search = e.target.value; else category = e.target.value;
    $('#grid').innerHTML = shopList();
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.act === 'role') $('#reg').dataset.role = t.value;   // CSS shows the seller / farmer fields
    if (t.dataset.stock) { product(+t.dataset.stock).stock = +t.value || 0; save(); }
    if (t.dataset.upload && t.files[0]) {
      if (t.files[0].size > 500000) { t.value = ''; return toast('Photo must be under 500 KB.'); }
      const reader = new FileReader();
      reader.onload = () => { photo = reader.result; };
      reader.readAsDataURL(t.files[0]);
    }
  });
  document.addEventListener('error', e => { if (e.target.tagName === 'IMG') e.target.style.visibility = 'hidden'; }, true);   // broken photo: hide it

  const forms = {
    login(f) {
      const d = Object.fromEntries(new FormData(f)), u = db.users.find(x => x.email === d.email.trim().toLowerCase() && x.pass === DB.hash(d.pass));
      if (!u) return toast('Incorrect email or password');
      db.me = u.id; save();
      go(u.role === 'seller' ? '#/dashboard' : u.role === 'admin' ? '#/admin' : '#/');
    },
    register(f) {
      const d = Object.fromEntries(new FormData(f)), email = d.email.trim().toLowerCase(), seller = d.role !== 'customer';
      if (db.users.some(x => x.email === email)) return toast('That email is already registered');
      if (seller && !(d.store.trim() && d.city.trim())) return toast('Please enter your farm/store name and area');
      const user = { id: next(db.users), name: d.name.trim(), email, pass: DB.hash(d.pass), role: seller ? 'seller' : 'customer', vendorId: 0 };
      if (seller) {
        user.vendorId = next(db.vendors);
        db.vendors.push({ id: user.vendorId, type: d.role, name: d.store.trim(), category: d.category, city: d.city.trim(), desc: d.desc || 'New on LocalMart.', acres: +d.acres || 0, crops: d.crops || '', status: 'pending' });
      }
      db.users.push(user); db.me = user.id; save();
      go(seller ? '#/dashboard' : '#/');
    },
    checkout(f) {
      const d = Object.fromEntries(new FormData(f)), gs = groups();
      for (const g of gs) for (const l of g.lines) if (l.qty > l.p.stock) return toast(l.p.name + ': only ' + l.p.stock + ' left.');
      gs.forEach(g => {
        db.orders.push({ id: next(db.orders), userId: db.me, vendorId: g.v.id, total: g.total + g.delivery, payment: d.pay, status: 'Placed', address: d.name + ', ' + d.address + ' (' + d.phone + ')',
          items: g.lines.map(l => ({ name: l.p.name, qty: l.qty, price: cost(l.p) })) });
        g.lines.forEach(l => { l.p.stock -= l.qty; });
      });
      DB.cart.set([]); save(); go('#/orders');
    },
    product(f) {
      const d = Object.fromEntries(new FormData(f)), picture = photo || d.imgurl.trim();
      if (!picture) return toast('Please add a photo of your product');
      db.products.push({ id: next(db.products), vendorId: me().vendorId, name: d.name.trim(), category: d.category, unit: d.unit, price: +d.price, discount: +d.discount || 0, stock: +d.stock, img: picture, desc: d.desc, active: true });
      save(); actions.closeModal(); render();
    },
    heroSearch(f) { search = new FormData(f).get('q').trim(); category = ''; f.reset(); go('#/shop'); }
  };
  document.addEventListener('submit', e => {
    const f = e.target.closest('form[data-form]');
    if (f) { e.preventDefault(); forms[f.dataset.form](f); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') actions.closeModal(); });

  render();
})();