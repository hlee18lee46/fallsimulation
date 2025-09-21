// lib/mongodb.ts
import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI!;
if (!uri) throw new Error("Missing MONGODB_URI in env");

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // allow global var across hot reloads in dev
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise!;
} else {
  client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
  clientPromise = client.connect();
}

export async function db() {
  const cli = await clientPromise;
  return cli.db(); // default DB from the URI
}