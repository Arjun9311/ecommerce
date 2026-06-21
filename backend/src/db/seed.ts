import { pool, connectPostgres } from './postgres.js';
import { valkey, connectValkey, jsonSet, ftCreate, ftSugAdd } from '../valkey/client.js';
import { createId, slugify, generateRandomVector } from '../utils/helpers.js';
import { logger } from '../utils/logger.js';
import bcrypt from 'bcryptjs';

// Seed static categories
const categoriesSeed = [
  { name: 'Electronics', slug: 'electronics', icon: 'Cpu', parentName: null },
  { name: 'Smartphones', slug: 'smartphones', icon: 'Smartphone', parentName: 'Electronics' },
  { name: 'Laptops', slug: 'laptops', icon: 'Laptop', parentName: 'Electronics' },
  { name: 'Audio', slug: 'audio', icon: 'Headphones', parentName: 'Electronics' },
  { name: 'Fashion', slug: 'fashion', icon: 'Shirt', parentName: null },
  { name: 'Mens Wear', slug: 'mens-wear', icon: 'User', parentName: 'Fashion' },
  { name: 'Womens Wear', slug: 'womens-wear', icon: 'User', parentName: 'Fashion' },
  { name: 'Shoes', slug: 'shoes', icon: 'Footprints', parentName: null },
  { name: 'Running Shoes', slug: 'running-shoes', icon: 'Activity', parentName: 'Shoes' },
  { name: 'Casual Shoes', slug: 'casual-shoes', icon: 'Smile', parentName: 'Shoes' },
  { name: 'Sports', slug: 'sports', icon: 'Dribbble', parentName: null },
  { name: 'Fitness', slug: 'fitness', icon: 'Barbell', parentName: 'Sports' },
  { name: 'Outdoor', slug: 'outdoor', icon: 'Compass', parentName: 'Sports' },
  { name: 'Books', slug: 'books', icon: 'Book', parentName: null },
  { name: 'Technology Books', slug: 'technology-books', icon: 'Terminal', parentName: 'Books' },
  { name: 'Fiction Books', slug: 'fiction-books', icon: 'BookOpen', parentName: 'Books' },
  { name: 'Gaming', slug: 'gaming', icon: 'Gamepad', parentName: null },
  { name: 'Consoles', slug: 'consoles', icon: 'Monitor', parentName: 'Gaming' },
  { name: 'Gaming Accessories', slug: 'gaming-accessories', icon: 'Mouse', parentName: 'Gaming' },
];

const vendorsSeed = [
  { name: 'TechWorld Electronics', slug: 'techworld', email: 'support@techworld.in', rating: 4.8 },
  { name: 'Vogue Styles', slug: 'vogue-styles', email: 'hello@voguestyles.com', rating: 4.6 },
  { name: 'StepUp Footwear', slug: 'stepup', email: 'contact@stepup.in', rating: 4.7 },
  { name: 'FitLife Sports', slug: 'fitlife', email: 'sales@fitlife.co', rating: 4.9 },
  { name: 'BookNook Publishing', slug: 'booknook', email: 'editorial@booknook.com', rating: 4.5 },
  { name: 'PixelPlay Gaming', slug: 'pixelplay', email: 'info@pixelplay.in', rating: 4.8 },
];

async function seed() {
  logger.info('🚀 Starting seeding process...');
  await connectPostgres();
  await connectValkey();

  // Clear PostgreSQL canonical tables
  logger.info('🧹 Cleaning up PostgreSQL tables...');
  await pool.query(
    'TRUNCATE TABLE order_items, orders, reviews, wishlist_items, products, categories, vendors, users CASCADE'
  );

  // Clear Valkey completely to avoid index clashes
  logger.info('🧹 Flushing Valkey...');
  await valkey.call('FLUSHALL');

  // 1. Seed Categories
  logger.info('📦 Seeding categories...');
  const categoryIdMap = new Map<string, string>();
  for (const cat of categoriesSeed) {
    const parentId = cat.parentName ? categoryIdMap.get(cat.parentName) : null;
    const catId = createId('category');
    categoryIdMap.set(cat.name, catId);

    // Insert into Postgres
    await pool.query(
      `INSERT INTO categories (id, name, slug, icon, parent_id) VALUES ($1, $2, $3, $4, $5)`,
      [catId, cat.name, cat.slug, cat.icon, parentId]
    );

    // Save to Valkey JSON
    await jsonSet(catId, {
      id: catId,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      parentId,
      children: [],
    });

    // Add category suggestions
    await ftSugAdd('autocomplete', cat.name, 100);
    await ftSugAdd('autocomplete', cat.slug, 100);
  }

  // Update categories children array in Valkey JSON
  for (const cat of categoriesSeed) {
    if (cat.parentName) {
      const parentId = categoryIdMap.get(cat.parentName)!;
      const childId = categoryIdMap.get(cat.name)!;
      // Get parent from Valkey
      const parent: any = await valkey.call('JSON.GET', parentId);
      if (parent) {
        const parentObj = JSON.parse(parent);
        parentObj.children.push(childId);
        await jsonSet(parentId, parentObj);
      }
    }
  }

  // 2. Seed Vendors
  logger.info('📦 Seeding vendors...');
  const vendorIdMap = new Map<string, string>();
  for (const ven of vendorsSeed) {
    const venId = createId('vendor');
    vendorIdMap.set(ven.name, venId);

    const address = {
      street: 'Plot 42, HITEC City',
      city: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500081',
      country: 'IN',
    };

    await pool.query(
      `INSERT INTO vendors (id, name, slug, email, rating, address, verified) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [venId, ven.name, ven.slug, ven.email, ven.rating, JSON.stringify(address), true]
    );

    await jsonSet(venId, {
      id: venId,
      name: ven.name,
      slug: ven.slug,
      email: ven.email,
      rating: ven.rating,
      address,
      verified: true,
    });
  }

  // 3. Seed Users
  logger.info('📦 Seeding users...');
  const adminId = createId('user');
  const customerId = createId('user');
  const passwordHash = await bcrypt.hash('password123', 10);

  await pool.query(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6)`,
    [adminId, 'admin@valkey.com', passwordHash, 'Admin', 'User', 'admin']
  );
  await pool.query(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6)`,
    [customerId, 'customer@valkey.com', passwordHash, 'Priya', 'Sharma', 'customer']
  );

  const customerObj = {
    id: customerId,
    email: 'customer@valkey.com',
    role: 'customer',
    firstName: 'Priya',
    lastName: 'Sharma',
    phone: '+91-9876543210',
    addresses: [
      {
        id: createId('addr'),
        label: 'Home',
        street: '42 MG Road, Banjara Hills',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500034',
        country: 'IN',
        lat: 17.4156,
        lng: 78.4347,
        isDefault: true,
      },
    ],
    preferences: {
      currency: 'INR',
      language: 'en',
      notifications: true,
    },
  };
  await jsonSet(customerId, customerObj);

  // 4. Generate 200 Products
  logger.info('📦 Generating 200 products across categories...');
  const products: any[] = [];

  // Data helpers to generate catalog
  const brands = {
    Smartphones: ['Apple', 'Samsung', 'OnePlus', 'Google', 'Xiaomi'],
    Laptops: ['Apple', 'Dell', 'HP', 'Lenovo', 'Asus'],
    Audio: ['Sony', 'Bose', 'Sennheiser', 'JBL', 'boAt'],
    'Mens Wear': ['Nike', 'Adidas', 'Puma', 'Zara', 'Levi’s'],
    'Womens Wear': ['Zara', 'H&M', 'Nike', 'FabIndia', 'Biba'],
    'Running Shoes': ['Nike', 'Adidas', 'Puma', 'Asics', 'Brooks'],
    'Casual Shoes': ['Vans', 'Converse', 'Adidas', 'Crocs', 'Nike'],
    Fitness: ['Decathlon', 'Flex', 'Lifelong', 'Bowflex', 'Fitbit'],
    Outdoor: ['Quechua', 'Wildcraft', 'Columbia', 'The North Face', 'Coleman'],
    'Technology Books': ['O’Reilly', 'Manning', 'Packt', 'Pearson', 'Addison-Wesley'],
    'Fiction Books': ['Penguin', 'HarperCollins', 'Scholastic', 'Random House', 'Vintage'],
    Consoles: ['Sony', 'Microsoft', 'Nintendo', 'Valve', 'Asus'],
    'Gaming Accessories': ['Logitech G', 'Razer', 'Corsair', 'SteelSeries', 'HyperX'],
  };

  const productTemplates: Record<string, { names: string[]; keywords: string[] }> = {
    Smartphones: {
      names: ['Phone 16 Pro Max', 'Galaxy S25 Ultra', 'Nord 4 5G', 'Pixel 9 Pro XL', 'Redmi Note 14 Pro'],
      keywords: ['5g', 'smartphone', 'camera', 'oled', 'battery'],
    },
    Laptops: {
      names: ['MacBook Pro M4', 'XPS 15 OLED', 'Pavilion Plus 14', 'ThinkPad X1 Carbon', 'ROG Zephyrus G14'],
      keywords: ['laptop', 'notebook', 'ryzen', 'intel', 'rtx'],
    },
    Audio: {
      names: ['WH-1000XM6 Headphones', 'QuietComfort Ultra Buds', 'Momentum 4 Wireless', 'Flip 7 Portable Speaker', 'Airdopes 141'],
      keywords: ['bluetooth', 'anc', 'wireless', 'bass', 'earbuds'],
    },
    'Mens Wear': {
      names: ['Dri-FIT Training Tee', 'Essentials Fleece Hoodie', 'Dry Fit Joggers', 'Slim Fit Cotton Shirt', '511 Slim Fit Jeans'],
      keywords: ['clothing', 'menswear', 'cotton', 'athleisure', 'comfort'],
    },
    'Womens Wear': {
      names: ['Oversized Satin Blazer', 'Rib-Knit Mock Neck Dress', 'Yoga Leggings High Rise', 'Anarkali Cotton Kurta', 'Floral Print Maxi Dress'],
      keywords: ['clothing', 'womenswear', 'dresses', 'activewear', 'ethnic'],
    },
    'Running Shoes': {
      names: ['Air Zoom Pegasus 41', 'Ultraboost Light', 'Velocity Nitro 3', 'Gel-Kayano 31', 'Ghost 16 running shoes'],
      keywords: ['shoes', 'sneakers', 'cushion', 'running', 'comfort'],
    },
    'Casual Shoes': {
      names: ['Old Skool Skate Shoes', 'Chuck Taylor All Star', 'Stan Smith Classic', 'Classic Lined Clogs', 'Air Force 1 ’07'],
      keywords: ['shoes', 'sneakers', 'casual', 'skate', 'unisex'],
    },
    Fitness: {
      names: ['Adjustable Dumbbells Set', 'Anti-Burst Yoga Ball', 'Heavy Duty Pull Up Bar', 'SelectTech Kettlebell', 'Charge 6 Fitness Tracker'],
      keywords: ['gym', 'workout', 'fitness', 'homegym', 'exercise'],
    },
    Outdoor: {
      names: ['Waterproof Camping Tent', 'High Altitude Sleeping Bag', 'Thermal Hydration Flask', 'Trekking Backpack 50L', 'Ultralight Hiking Pole'],
      keywords: ['camping', 'trekking', 'hiking', 'adventure', 'waterproof'],
    },
    'Technology Books': {
      names: ['Designing Data-Intensive Applications', 'Clean Code Architecture', 'Learning Go Programming', 'Rust in Action Book', 'Hands-On Machine Learning'],
      keywords: ['programming', 'software', 'coding', 'kubernetes', 'architecture'],
    },
    'Fiction Books': {
      names: ['The Midnight Library Novel', 'Project Hail Mary Sci-Fi', 'Where the Crawdads Sing', 'Dune Deluxe Edition', 'Norwegian Wood Novel'],
      keywords: ['novel', 'fiction', 'scifi', 'bestseller', 'paperback'],
    },
    Consoles: {
      names: ['PlayStation 5 Pro', 'Xbox Series X 1TB', 'Nintendo Switch OLED', 'Steam Deck OLED 512GB', 'ROG Ally X Handheld'],
      keywords: ['console', 'gaming', '4k', 'handheld', 'switch'],
    },
    'Gaming Accessories': {
      names: ['G502 X Lightspeed Mouse', 'BlackWidow V4 Keyboard', 'HS80 RGB Wireless Headset', 'Apex Pro TKL Keyboard', 'Cloud III Gaming Headset'],
      keywords: ['mouse', 'keyboard', 'headset', 'rgb', 'gaming'],
    },
  };

  let count = 0;
  const categoriesList = Object.keys(brands);

  for (const catName of categoriesList) {
    const catId = categoryIdMap.get(catName)!;
    const vendorName = vendorsSeed.find((v) => v.name.toLowerCase().includes(catName.toLowerCase().split(' ')[0]))?.name || vendorsSeed[0].name;
    const vendorId = vendorIdMap.get(vendorName)!;

    const templates = productTemplates[catName];
    const brandList = brands[catName as keyof typeof brands];

    // Generate ~16 products per subcategory to reach 200+
    for (let i = 0; i < 16; i++) {
      count++;
      const pId = createId('product');
      const templateName = templates.names[i % templates.names.length];
      const brand = brandList[i % brandList.length];
      const name = `${brand} ${templateName} #${i + 1}`;
      const slug = `${slugify(name)}-${count}`;
      const price = Math.floor((Math.random() * 80000 + 1000) * 100); // 1,000 to 80,000 INR in paise
      const compareAt = Math.random() > 0.3 ? Math.floor(price * 1.15) : null;
      
      const stock = Math.floor(Math.random() * 150) + 10;
      const attributes: Record<string, string> = {
        brand,
        condition: 'New',
        warranty: '1 Year',
      };
      
      if (catName === 'Smartphones' || catName === 'Laptops') {
        attributes.storage = ['128GB', '256GB', '512GB', '1TB'][i % 4];
        attributes.ram = ['8GB', '12GB', '16GB', '32GB'][i % 4];
        attributes.color = ['Midnight Black', 'Space Grey', 'Titanium Gold'][i % 3];
      } else if (catName.includes('Shoes') || catName.includes('Wear')) {
        attributes.size = ['S', 'M', 'L', 'XL', '7', '8', '9', '10'][i % 8];
        attributes.color = ['Crimson Red', 'Navy Blue', 'Classic Black', 'Forest Green'][i % 4];
      }

      const product = {
        id: pId,
        sku: `SKU-${catName.substring(0, 3).toUpperCase()}-${brand.substring(0, 3).toUpperCase()}-${1000 + count}`,
        name,
        slug,
        description: `This high-performance ${name} is premium grade, crafted by ${brand} for maximum comfort, utility, and modern aesthetics. Featuring top-of-the-line specs designed to fulfill all modern requirements.`,
        shortDescription: `Best-in-class ${name} by ${brand}`,
        categoryId: catId,
        vendorId,
        brand,
        price: {
          amount: price,
          currency: 'INR',
          compareAt,
        },
        images: [
          {
            url: `/assets/products/placeholder.jpg`,
            alt: name,
            isPrimary: true,
          },
        ],
        attributes,
        tags: [...templates.keywords, brand.toLowerCase(), catName.toLowerCase().split(' ')[0]],
        inventory: {
          quantity: stock,
          reserved: 0,
          warehouse: 'HYD-WH-01',
        },
        ratings: {
          average: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)), // 3.5 to 5.0
          count: Math.floor(Math.random() * 1500) + 50,
        },
        embedding: generateRandomVector(384),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      products.push(product);
    }
  }

  // Insert products in batches to Postgres & Valkey JSON
  logger.info(`💾 Saving ${products.length} products to databases...`);
  for (const p of products) {
    // 1. Postgres
    await pool.query(
      `INSERT INTO products (
        id, sku, name, slug, description, short_description, category_id, vendor_id, brand, 
        price, compare_at, currency, images, attributes, tags, stock, warehouse, rating_average, rating_count, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
      [
        p.id,
        p.sku,
        p.name,
        p.slug,
        p.description,
        p.shortDescription,
        p.categoryId,
        p.vendorId,
        p.brand,
        p.price.amount,
        p.price.compareAt,
        p.price.currency,
        JSON.stringify(p.images),
        JSON.stringify(p.attributes),
        p.tags,
        p.inventory.quantity,
        p.inventory.warehouse,
        p.ratings.average,
        p.ratings.count,
        p.status,
      ]
    );

    // 2. Valkey JSON
    await jsonSet(p.id, p);

    // 3. Add brand products set & price index for legacy query compatibility
    await valkey.sadd(`brand_products:${p.brand}`, p.id);
    await valkey.zadd('price_index', p.price.amount, p.id);

    // 4. Seeding categories products index sorted set
    await valkey.zadd(`category_products:${p.categoryId}`, Date.now(), p.id);

    // 5. Add Autocomplete suggestions
    await ftSugAdd('autocomplete', p.name, 100);
    await ftSugAdd('autocomplete', p.brand, 100);
    for (const tag of p.tags) {
      await ftSugAdd('autocomplete', tag, 100);
    }
    const words = p.name.split(/\s+/);
    for (const word of words) {
      const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
      if (cleanWord.length >= 3) {
        await ftSugAdd('autocomplete', cleanWord, 100);
      }
    }
  }

  // 5. Create Valkey Search Indices
  logger.info('🔍 Initializing search indexes inside Valkey...');

  // FT.CREATE idx:product_vectors for Semantic VSS
  await ftCreate([
    'idx:product_vectors',
    'ON', 'JSON',
    'PREFIX', '1', 'product:',
    'SCHEMA',
    '$.categoryId', 'AS', 'categoryId', 'tag',
    '$.price.amount', 'AS', 'price', 'numeric',
    '$.embedding', 'AS', 'embedding', 'vector', 'hnsw', '6',
    'type', 'float32',
    'dim', '384',
    'distance_metric', 'cosine'
  ]);

  // 6. Generate Coupon Codes
  logger.info('🎟️  Seeding coupon codes in Valkey JSON...');
  const coupons = [
    {
      code: 'VALKEY10',
      type: 'percentage',
      value: 10,
      minOrderAmount: 200000, // 2,000 INR
      maxDiscount: 50000,    // 500 INR
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      usageLimit: 1000,
      usedCount: 0,
      applicableCategories: [],
      active: true,
    },
    {
      code: 'FREESHIP',
      type: 'fixed',
      value: 15000, // 150 INR
      minOrderAmount: 50000,
      maxDiscount: 15000,
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      usageLimit: 5000,
      usedCount: 0,
      applicableCategories: [],
      active: true,
    },
  ];

  for (const c of coupons) {
    await jsonSet(`coupon:${c.code}`, c);
  }

  // 7. Seed Ad creatives
  logger.info('📺 Seeding ad creatives in Valkey JSON...');
  const ads = [
    {
      id: createId('ad'),
      title: 'Summer Electronics Bash - 10% OFF',
      imageUrl: '/assets/ads/electronics-sale.jpg',
      targetUrl: '/shop?category=electronics',
      targetCategories: [categoryIdMap.get('Electronics')!, categoryIdMap.get('Smartphones')!],
      targetKeywords: ['phone', 'laptop', 'audio'],
      bidAmount: 500, // in paise
      dailyBudget: 50000, // 500 INR
      status: 'active',
    },
    {
      id: createId('ad'),
      title: 'Supercharge Your Run: Asics Premium Outlets',
      imageUrl: '/assets/ads/shoes-sale.jpg',
      targetUrl: '/shop?brand=asics',
      targetCategories: [categoryIdMap.get('Shoes')!, categoryIdMap.get('Running Shoes')!],
      targetKeywords: ['shoes', 'running', 'marathon'],
      bidAmount: 600,
      dailyBudget: 60000,
      status: 'active',
    },
  ];

  for (const ad of ads) {
    await jsonSet(`ad:${ad.id}`, ad);
    // Index ads by category
    for (const catId of ad.targetCategories) {
      await valkey.zadd(`ads:category:${catId}`, ad.bidAmount, ad.id);
    }
  }

  // Close connections
  await pool.end();
  await valkey.disconnect();
  logger.info('🎉 Databases seeded successfully!');
}

seed().catch((err) => {
  logger.error('❌ Seeding failed', err);
  process.exit(1);
});
