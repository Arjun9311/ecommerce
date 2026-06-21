# Valkey Commerce AI — Premium Intelligent E-Commerce Platform

A production-quality, startup-grade e-commerce platform designed and built for the **Valkey Hackathon**. This application demonstrates real-world, high-performance usage of **Valkey** as the intelligent data backbone, going far beyond simple key-value caching.

## 🚀 Live Demo Features

Valkey Commerce AI leverages **10 distinct Valkey superpowers** to deliver a responsive, personalized, and robust shopper and merchant experience:

1. **Intelligent Sessions**: Scalable, persistent user sessions backed by JWTs and verified against Valkey string stores (`session:{token}`) with auto-expiration.
2. **Persistent JSON Carts**: Fast shopping cart CRUD operations powered by the **Valkey JSON Module** (`cart:{userId}` / `cart:guest:{sessionId}`), supporting guest cart merging upon user login.
3. **Advanced Autocomplete Suggestions**: Ultra-fast Search Suggestion dropdown powered by a Valkey Sorted Set using lexicographical filtering (`ZRANGE` with `BYLEX`).
4. **Natural Language Discovery & Vector Search**: AI Assistant parsing natural language to filters with semantic caching and semantic vector search using Valkey Vector Similarity Search (HNSW Index `idx:product_vectors`).
5. **Real-time Trending Analytics**: Time-windowed global and category trending leaderboards powered by Valkey Sorted Sets (`ZINCRBY` / `ZREVRANGE`).
6. **Collaborative Recommendations**: Intelligent "Frequently Bought Together" cross-sells and personalized recommendations based on active tracking of user interest hashes (`user_interests:{userId}`) and recently viewed lists (`recently_viewed:{userId}`).
7. **Distributed Inventory Locks**: Race-condition safe checkout logic using atomic Valkey mutex locks (`SET NX EX`) to guarantee stock reservation consistency before database commits.
8. **Real-time Inventory Pub/Sub**: Push-based stock level updates using Valkey Pub/Sub (`inventory:updates` channel) to update connected clients instantly.
9. **Performance rate limiting**: Sliding-window rate limit middleware powered by Valkey key increments to shield API endpoints from brute-force login attempts and DDoS.
10. **Merchant Observability**: Real-time admin dashboard powered by Valkey HyperLogLog (`PFADD` / `PFCOUNT`) to track unique daily/hourly visitors and real-time command latency.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, Framer Motion, Lucide Icons |
| **Backend** | Node.js 20, Express, TypeScript, `iovalkey` (Valkey Client) |
| **Valkey Engine** | Valkey Bundle 9-alpine (JSON, Search, Vector Index, Bloom Filters, Pub/Sub) |
| **Relational Database** | PostgreSQL 16 (Canonical Persistence Store) |
| **AI Integration** | OpenAI API for Natural Language Filtering and Query Translation |
| **Orchestration** | Docker & Docker Compose |

---

## 📦 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose installed.
- [Node.js](https://nodejs.org/) (v20+ recommended).

### 1. Launch the Database and Valkey Containers

From the root directory, start the database services:

```bash
docker-compose up -d
```

This brings up:
- **Valkey Bundle** (`valkey/valkey-bundle:9-alpine`) on port `6379`.
- **PostgreSQL 16** (`postgres:16-alpine`) on port `5432`.

### 2. Install Dependencies

Install packages for both the backend and frontend:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Seed the Database

Run the seeder script to populate **208 products** across 6 categories (with realistic Indian INR pricing in paise, attributes, and tags) into both PostgreSQL and Valkey (JSON documents, Vector Search Indexes, Autocomplete zsets, and Ad creatives):

```bash
cd ../backend
npm run seed
```

### 4. Run Development Servers

Launch both the backend and frontend servers:

```bash
# Run Backend (Port 4000)
cd backend
npm run dev

# Run Frontend (Port 3000) in a new terminal
cd frontend
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 📈 Demo Credentials

You can log in to the application using these seeded accounts:

- **Customer Account**:
  - Email: `customer@valkey.com`
  - Password: `password123`
  - Name: Priya Sharma

- **Admin Account**:
  - Email: `admin@valkey.com`
  - Password: `password123`
  - Name: Admin User (provides access to the Valkey Admin Dashboard at `/admin`)

---

## 🔍 Valkey Integration Map

| Feature | Key Pattern / Channel | Valkey Data Structure | Purpose |
|---|---|---|---|
| **Sessions** | `session:{token}` | String | JWT session verification |
| **Rate Limit** | `rate_limit:{ip}:{endpoint}` | String (INCR) | Sliding-window API defense |
| **Carts** | `cart:{userId}` / `cart:guest:{sessionId}` | JSON | Cart persistence |
| **Search Autocomplete** | `autocomplete` | Sorted Set | BYLEX search queries suggestions |
| **Product Cache** | `product:{productId}` | JSON | Zero-latency product catalog fetch |
| **Trending Leaderboard** | `trending:global:24h` / `trending:category:{id}:24h` | Sorted Set | Trending score counters |
| **Vector Search Index** | `idx:product_vectors` | FT Search Index | VSS Semantic Search (HNSW) |
| **User Interests** | `user_interests:{userId}` | Hash | Real-time personalization weights |
| **Inventory Locks** | `inventory_lock:{productId}` | String | Mutex stock locks (SET NX EX) |
| **Pub/Sub Channel** | `inventory:updates` | Pub/Sub | Real-time stock alerts to browser |
| **Unique Visitors** | `analytics:visitors:{date}` | HyperLogLog | Cardinality tracking for dashboard |
| **Valkey Latency** | `GET /api/health` | PING | Live latency monitoring |

---

## 🛡️ License

This project is open-source and created for the **Valkey Hackathon**.
