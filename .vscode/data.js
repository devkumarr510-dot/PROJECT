// Data – saved in localStorage so no server is needed.
const DB = (function () {
  const photo = id => 'https://images.unsplash.com/photo-' + id;
  const CATEGORIES = ['Vegetables', 'Fruits', 'Dairy, Eggs & Honey', 'Grains & Pulses', 'Spices', 'Bakery', 'Handloom & Crafts'];
  const BANNERS = [photo('1645707557947-3ed62700c066'), photo('1759399660581-d5e601cda1f6'), photo('1613548058193-1cd24c1bebcf'), photo('1509440159596-0249088772ff'), photo('1779359708197-643987ed6171')];
  const hash = s => { let h = 5381; for (const c of s) h = (h * 33 + c.charCodeAt(0)) | 0; return 'h' + (h >>> 0).toString(36); };

  function seed() {
    // type, name, category, city, description, farm size (acres), crops
    const vendors = [
      ['farmer', 'Gill Family Farm', 'Vegetables', 'Moga', 'Family farm growing seasonal vegetables. Picked at sunrise.', 12, 'Tomato, carrot, cauliflower'],
      ['farmer', 'Sandhu Orchards', 'Fruits', 'Hoshiarpur', 'Citrus and guava orchards, picked only when ripe.', 18, 'Kinnow, guava, lime'],
      ['farmer', 'Bains Dairy & Apiary', 'Dairy, Eggs & Honey', 'Kapurthala', 'Free-range hens and bee boxes. Small batches, no additives.', 6, 'Honey, eggs'],
      ['farmer', 'Dhillon Grain Farm', 'Grains & Pulses', 'Sangrur', 'Rice and pulses grown and cleaned on the farm.', 30, 'Basmati, masoor'],
      ['vendor', 'Sharma Kirana Store', 'Grains & Pulses', 'Model Town', 'Neighbourhood grocery serving daily staples since 1998.'],
      ['vendor', 'Punjab Bakehouse', 'Bakery', 'Main Bazaar', 'Breads and cakes baked fresh every morning.'],
      ['vendor', 'Handloom Haven', 'Handloom & Crafts', 'Textile Market', 'Hand-embroidered pieces made by village artisans.']
    ].map((v, i) => ({ id: i + 1, type: v[0], name: v[1], category: v[2], city: v[3], desc: v[4], acres: v[5] || 0, crops: v[6] || '', status: 'approved' }));

    // name, email, password, role, seller id
    const users = [
      ['Platform Admin', 'admin@localmart.in', 'admin123', 'admin'], ['Simran Kaur', 'customer@demo.in', 'customer123', 'customer'],
      ['Balwinder Gill', 'farmer@demo.in', 'farmer123', 'seller', 1], ['Harpreet Sandhu', 'farmer2@demo.in', 'farmer123', 'seller', 2],
      ['Jaswant Bains', 'farmer3@demo.in', 'farmer123', 'seller', 3], ['Gurdev Dhillon', 'farmer4@demo.in', 'farmer123', 'seller', 4],
      ['Ramesh Sharma', 'vendor@demo.in', 'vendor123', 'seller', 5], ['Harjit Kaur', 'vendor2@demo.in', 'vendor123', 'seller', 6],
      ['Anil Verma', 'vendor3@demo.in', 'vendor123', 'seller', 7]
    ].map((u, i) => ({ id: i + 1, name: u[0], email: u[1], pass: hash(u[2]), role: u[3], vendorId: u[4] || 0 }));

    // seller, name, category, price, unit, discount %, stock, photo, description
    const products = [
      [1, 'Tomatoes', 'Vegetables', 38, 'kg', 0, 120, '1518977822534-7049a61ee0c2', 'Vine-ripened tomatoes picked this morning.'],
      [1, 'Carrots', 'Vegetables', 45, 'kg', 10, 90, '1556934776-9ce92a5ce665', 'Sweet, crunchy winter carrots.'],
      [1, 'Cauliflower', 'Vegetables', 42, 'piece', 0, 60, '1510627498534-cf7e9002facc', 'Tight white heads, no chemical growth boosters.'],
      [1, 'Beetroot', 'Vegetables', 50, 'kg', 0, 4, '1757513671720-e95bb606ac82', 'Deep red beets, good for salads and juice.'],
      [2, 'Kinnow Oranges', 'Fruits', 70, 'kg', 10, 80, '1764575344012-01fc9e1270c7', 'Juicy Punjab kinnow, tree-ripened.'],
      [2, 'Guava', 'Fruits', 80, 'kg', 0, 35, '1759772515773-5748e3de1beb', 'Fragrant desi guavas.'],
      [2, 'Limes', 'Fruits', 60, '500 g', 0, 50, '1689996647327-5d263fbbc79d', 'Thin-skinned, juicy limes.'],
      [3, 'Raw Forest Honey', 'Dairy, Eggs & Honey', 320, '500 g', 12, 30, '1558642452-9d2a7deb7f62', 'Unprocessed honey, no heating, no added sugar.'],
      [3, 'Free-range Eggs', 'Dairy, Eggs & Honey', 96, 'dozen', 0, 40, '1506976785307-8732e854ad03', 'Eggs from hens that roam freely.'],
      [4, 'Basmati Rice', 'Grains & Pulses', 118, 'kg', 0, 200, '1723475158232-819e29803f4d', 'Aged long-grain basmati from our farm.'],
      [4, 'Masoor Dal', 'Grains & Pulses', 105, 'kg', 5, 80, '1770617476260-1addeea7c826', 'Quick-cooking red lentils.'],
      [5, 'Basmati Rice', 'Grains & Pulses', 125, 'kg', 0, 60, '1723475158232-819e29803f4d', 'Premium long-grain basmati.'],
      [5, 'Tomatoes', 'Vegetables', 44, 'kg', 0, 35, '1558818498-28c1e002b655', 'Fresh tomatoes from the mandi.'],
      [5, 'Whole Spice Mix', 'Spices', 180, '200 g', 8, 25, '1716816211590-c15a328a5ff0', 'Whole spices for garam masala.'],
      [6, 'Multigrain Loaf', 'Bakery', 65, 'loaf', 0, 30, '1509440159596-0249088772ff', 'Sunflower-seed loaf baked every morning.'],
      [6, 'Whole Wheat Bread', 'Bakery', 45, 'loaf', 0, 40, '1534620808146-d33bb39128b2', 'Soft sliced bread, no preservatives.'],
      [6, 'Chocolate Cherry Cake', 'Bakery', 520, 'each', 10, 8, '1606890737304-57a1ca8a5b62', 'Three-layer chocolate cake, 500 g.'],
      [7, 'Embroidered Linen Cloth', 'Handloom & Crafts', 650, 'piece', 0, 12, '1771409046893-d5c43a196743', 'Hand-embroidered motifs on pure linen.'],
      [7, 'Floral Dupatta', 'Handloom & Crafts', 1150, 'piece', 10, 9, '1599589915468-b4c71ed62543', 'Cotton dupatta with hand-stitched flowers.'],
      [7, 'Cross-stitch Table Runner', 'Handloom & Crafts', 480, 'piece', 0, 15, '1768943366478-3a39b2862505', 'Traditional cross-stitch table runner.']
    ].map((p, i) => ({ id: i + 1, vendorId: p[0], name: p[1], category: p[2], price: p[3], unit: p[4], discount: p[5], stock: p[6], img: photo(p[7]), desc: p[8], active: true }));

    const orders = [{ id: 1, userId: 2, vendorId: 1, total: 114 + 30, payment: 'UPI', status: 'Placed', address: 'Simran Kaur, 24 Green Avenue, Jalandhar 144001',
      items: [{ name: 'Tomatoes', qty: 3, price: 38 }] }];
    return { users, vendors, products, orders, me: 0 };
  }

  function load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem('lm4')); } catch (e) { /* ignore */ }
    if (!d) { d = seed(); localStorage.setItem('lm4', JSON.stringify(d)); }
    return d;
  }
  return {
    load, hash, CATEGORIES, BANNERS,
    save: d => { try { localStorage.setItem('lm4', JSON.stringify(d)); return true; } catch (e) { return false; } },
    cart: { get: () => JSON.parse(localStorage.getItem('lm4cart') || '[]'), set: a => localStorage.setItem('lm4cart', JSON.stringify(a)) },
    reset: () => { localStorage.removeItem('lm4'); localStorage.removeItem('lm4cart'); }
  };
})();