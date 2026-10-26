import { describe, expect, it } from "vitest";
import { changeFor, containsPattern, friendActionSchema, relationFor, searchTerm, type FriendRequest } from "./friend";

const ANNA = "anna";
const BOB = "bob";
const request = (status: FriendRequest["status"], requesterId = ANNA, recipientId = BOB): FriendRequest => ({ requesterId, recipientId, status });

describe("relationFor", () => {
  it("is none without a request", () => {
    expect(relationFor(null, ANNA)).toBe("none");
    expect(relationFor(undefined, ANNA)).toBe("none");
  });

  it("is sent for the requester and received for the recipient while it waits", () => {
    expect(relationFor(request("pending"), ANNA)).toBe("sent");
    expect(relationFor(request("pending"), BOB)).toBe("received");
  });

  it("is friends for both once accepted", () => {
    expect(relationFor(request("accepted"), ANNA)).toBe("friends");
    expect(relationFor(request("accepted"), BOB)).toBe("friends");
  });

  it("keeps a declined request looking sent to the requester, and gone to the one who declined", () => {
    expect(relationFor(request("declined"), ANNA)).toBe("sent");
    expect(relationFor(request("declined"), BOB)).toBe("none");
  });
});

describe("changeFor", () => {
  it("sends a new request when there is none", () => {
    expect(changeFor("send", null, ANNA, BOB)).toEqual({ kind: "insert" });
  });

  it("never sends to oneself", () => {
    expect(changeFor("send", null, ANNA, ANNA)).toBeNull();
  });

  it("doesn't send twice, or to a friend", () => {
    expect(changeFor("send", request("pending"), ANNA, BOB)).toBeNull();
    expect(changeFor("send", request("declined"), ANNA, BOB)).toBeNull();
    expect(changeFor("send", request("accepted"), ANNA, BOB)).toBeNull();
    expect(changeFor("send", request("accepted"), BOB, ANNA)).toBeNull();
  });

  it("accepts the other's request instead of sending a second one", () => {
    expect(changeFor("send", request("pending"), BOB, ANNA)).toEqual({ kind: "respond", status: "accepted" });
    // Bob declined Anna earlier and changed his mind: her request still stands.
    expect(changeFor("send", request("declined"), BOB, ANNA)).toEqual({ kind: "respond", status: "accepted" });
  });

  it("lets only the requester cancel, also after a quiet decline", () => {
    expect(changeFor("cancel", request("pending"), ANNA, BOB)).toEqual({ kind: "delete" });
    expect(changeFor("cancel", request("declined"), ANNA, BOB)).toEqual({ kind: "delete" });
    expect(changeFor("cancel", request("pending"), BOB, ANNA)).toBeNull();
    expect(changeFor("cancel", request("accepted"), ANNA, BOB)).toBeNull();
    expect(changeFor("cancel", null, ANNA, BOB)).toBeNull();
  });

  it("lets only the recipient accept or decline a waiting request", () => {
    expect(changeFor("accept", request("pending"), BOB, ANNA)).toEqual({ kind: "respond", status: "accepted" });
    expect(changeFor("decline", request("pending"), BOB, ANNA)).toEqual({ kind: "respond", status: "declined" });
    expect(changeFor("accept", request("pending"), ANNA, BOB)).toBeNull();
    expect(changeFor("decline", request("pending"), ANNA, BOB)).toBeNull();
    expect(changeFor("accept", request("declined"), BOB, ANNA)).toBeNull();
    expect(changeFor("decline", request("accepted"), BOB, ANNA)).toBeNull();
    expect(changeFor("accept", null, BOB, ANNA)).toBeNull();
  });

  it("lets either friend remove the other", () => {
    expect(changeFor("remove", request("accepted"), ANNA, BOB)).toEqual({ kind: "delete" });
    expect(changeFor("remove", request("accepted"), BOB, ANNA)).toEqual({ kind: "delete" });
    expect(changeFor("remove", request("pending"), BOB, ANNA)).toBeNull();
  });

  it("ignores a request between two other users", () => {
    expect(changeFor("accept", request("pending", "carla", BOB), BOB, ANNA)).toBeNull();
    expect(changeFor("send", request("pending", "carla", BOB), BOB, ANNA)).toBeNull();
  });
});

describe("friendActionSchema", () => {
  it("takes a known action and a user id", () => {
    expect(friendActionSchema.parse({ action: "accept", userId: " 1f2e " })).toEqual({ action: "accept", userId: "1f2e" });
  });

  it("refuses unknown actions and missing users", () => {
    expect(friendActionSchema.safeParse({ action: "block", userId: "1f2e" }).success).toBe(false);
    expect(friendActionSchema.safeParse({ action: "send", userId: "" }).success).toBe(false);
    expect(friendActionSchema.safeParse({ action: "send", userId: null }).success).toBe(false);
  });
});

describe("searchTerm", () => {
  it("takes a username with or without the @, in any case", () => {
    expect(searchTerm(" @Pivar_42 ")).toBe("pivar_42");
    expect(searchTerm("pi")).toBe("pi");
  });

  it("gives nothing for too little, too much or what no username contains", () => {
    for (const q of ["", "p", "@", "a".repeat(21), "jan novák", "jan.novak", "%", null, undefined, ["pivar"]]) {
      expect(searchTerm(q)).toBeNull();
    }
  });
});

describe("containsPattern", () => {
  it("escapes the LIKE wildcard in usernames", () => {
    expect(containsPattern("pivar")).toBe("%pivar%");
    expect(containsPattern("e2e_x")).toBe("%e2e\\_x%");
  });
});
