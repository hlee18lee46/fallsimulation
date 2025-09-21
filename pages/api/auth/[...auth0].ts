// pages/api/auth/[...auth0].ts  (or src/pages/api/auth/[...auth0].ts)
import type { NextApiHandler } from "next";
import { handleAuth } from "@auth0/nextjs-auth0";

const handler: NextApiHandler = handleAuth();
export default handler;
