import { AppError } from "@/lib/errors";

const LINE_FRIENDSHIP_STATUS_URL = "https://api.line.me/friendship/v1/status";

type FriendshipStatusResponse = {
  friendFlag?: boolean;
};

export async function getLineFriendshipStatus(accessToken: string) {
  const response = await fetch(LINE_FRIENDSHIP_STATUS_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new AppError(`LINE friendship status check failed: ${await response.text()}`, 502);
  }

  const data = (await response.json()) as FriendshipStatusResponse;
  return data.friendFlag === true;
}
