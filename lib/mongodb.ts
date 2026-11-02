import mongoose from "mongoose";
import dns from "dns";

// Force Node.js to resolve IPv4 addresses first
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

// In-memory DNS cache to bypass Alpine Linux / Docker DNS stub timeout on IPv6 AAAA lookups
const dnsCache = new Map<string, string>([
  ["ac-vds6zmy-shard-00-00.3wy20fh.mongodb.net", "65.62.2.140"],
  ["ac-vds6zmy-shard-00-01.3wy20fh.mongodb.net", "65.62.2.161"],
  ["ac-vds6zmy-shard-00-02.3wy20fh.mongodb.net", "65.62.2.152"],
]);

const publicResolver = new dns.promises.Resolver();
try {
  publicResolver.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore fallback
}

// Intercept dns.lookup to serve MongoDB hostnames directly via IPv4 cache/resolver
const origLookup: any = dns.lookup;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(dns as any).lookup = function (hostname: string, options: any, callback: any) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }

  if (typeof hostname === "string" && dnsCache.has(hostname)) {
    const ip = dnsCache.get(hostname)!;
    if (options && options.all) {
      process.nextTick(() => callback(null, [{ address: ip, family: 4 }]));
    } else {
      process.nextTick(() => callback(null, ip, 4));
    }
    return;
  }

  // If a MongoDB Atlas shard hostname is requested that is not yet cached, resolve via public IPv4 DNS
  if (typeof hostname === "string" && hostname.endsWith(".mongodb.net")) {
    publicResolver
      .resolve4(hostname)
      .then((ips) => {
        if (ips && ips.length > 0) {
          dnsCache.set(hostname, ips[0]);
          if (options && options.all) {
            callback(null, [{ address: ips[0], family: 4 }]);
          } else {
            callback(null, ips[0], 4);
          }
        } else {
          origLookup.call(dns, hostname, { ...options, family: 4 }, callback);
        }
      })
      .catch(() => {
        origLookup.call(dns, hostname, { ...options, family: 4 }, callback);
      });
    return;
  }

  return origLookup.call(dns, hostname, options, callback);
};

const rawUri = process.env.MONGODB_URI;

if (!rawUri) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env");
}

// Convert mongodb+srv to direct replica set URI to eliminate 5-15s SRV DNS timeouts in Docker
function resolveMongoUri(uri: string): string {
  if (uri.startsWith("mongodb+srv://") && uri.includes("replas.3wy20fh.mongodb.net")) {
    const credMatch = uri.match(/^mongodb\+srv:\/\/([^@]+)@replas\.3wy20fh\.mongodb\.net(\/[^?]*)?(.*)$/);
    if (credMatch) {
      const credentials = credMatch[1];
      const dbPath = credMatch[2] || "/avero";
      return `mongodb://${credentials}@ac-vds6zmy-shard-00-00.3wy20fh.mongodb.net:27017,ac-vds6zmy-shard-00-01.3wy20fh.mongodb.net:27017,ac-vds6zmy-shard-00-02.3wy20fh.mongodb.net:27017${dbPath}?ssl=true&replicaSet=atlas-13u8gm-shard-0&authSource=admin&retryWrites=true&w=majority`;
    }
  }
  return uri;
}

const MONGODB_URI = resolveMongoUri(rawUri);

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  // Check if existing connection is active (readyState 1 = connected)
  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn;
  }

  const t0 = performance.now();
  console.log("⏱️ [MONGODB] Connecting to database...");

  if (!cached.promise || (cached.conn && cached.conn.connection.readyState !== 1)) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log(`✅ [MONGODB] Connected in ${(performance.now() - t0).toFixed(1)}ms`);
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    throw e;
  }

  return cached.conn;
}
