// src/lib/db.ts
import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI!;
let _db: Db | null = null;

export async function getDb() {
  if (_db) return _db;
  const client = await new MongoClient(uri).connect();
  _db = client.db();
  return _db;
}
