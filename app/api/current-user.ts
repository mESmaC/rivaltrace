import { getChatGPTUser } from "../chatgpt-auth";
import {
  InvalidIdentityError,
  userIdentityId,
} from "../../lib/identity.mjs";

type RuntimeEnv = {
  RIVALTRACE_IDENTITY_PEPPER?: string;
};

export async function getApiUserId(): Promise<string | null> {
  const user = await getChatGPTUser();
  if (!user) return null;
  const { env } = await import("cloudflare:workers");
  const pepper = (env as unknown as RuntimeEnv).RIVALTRACE_IDENTITY_PEPPER;
  try {
    return await userIdentityId(user.email, pepper);
  } catch (error) {
    if (error instanceof InvalidIdentityError) return null;
    throw error;
  }
}

export function unauthenticatedResponse(): Response {
  return Response.json(
    { error: "Sign in with ChatGPT to use this watchlist." },
    { status: 401 },
  );
}
