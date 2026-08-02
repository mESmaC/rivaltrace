import { getChatGPTUser } from "../chatgpt-auth";
import { userIdentityId } from "../../lib/identity.mjs";

export async function getApiUserId(): Promise<string | null> {
  const user = await getChatGPTUser();
  if (!user) return null;
  return userIdentityId(user.email);
}

export function unauthenticatedResponse(): Response {
  return Response.json(
    { error: "Sign in with ChatGPT to use this watchlist." },
    { status: 401 },
  );
}
