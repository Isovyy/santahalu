import { describe, expect, it } from "vitest";
import { canGiveTo, matchParticipants, MatchParticipant } from "./matching";

function participant(overrides: Partial<MatchParticipant> & { id: string }): MatchParticipant {
  return {
    oshiName: `Oshi-${overrides.id}`,
    fandomYume: "Fandom A",
    yumeTypeReceive: "HL",
    contentType: "Writing",
    fandomGive: "Fandom A",
    languageGive: "English",
    languageReceive: "English",
    yumeTypeGive: "HL",
    ...overrides,
  };
}

describe("canGiveTo", () => {
  it("blocks pairing with the same oshi", () => {
    const giver = participant({ id: "g", oshiName: "Same Oshi" });
    const receiver = participant({ id: "r", oshiName: "Same Oshi" });
    expect(canGiveTo(giver, receiver)).toBe(false);
  });

  it("blocks a receiver whose character+fandom is on the giver's avoid list", () => {
    const giver = participant({ id: "g", avoidList: "Yoichi Isagi | Blue Lock; Other | Elsewhere" });
    const avoided = participant({ id: "r", oshiName: "Isagi Yoichi", fandomYume: "Blue Lock" });
    expect(canGiveTo(giver, avoided)).toBe(false);
  });

  it("does not block same character name in a different fandom", () => {
    const giver = participant({ id: "g", avoidList: "Sora | Kingdom Hearts" });
    const receiver = participant({ id: "r", oshiName: "Sora", fandomYume: "Fandom A" });
    expect(canGiveTo(giver, receiver)).toBe(true);
  });

  it("allows fandom wildcard 'apa saja' to bypass fandom overlap", () => {
    const giver = participant({ id: "g", fandomGive: "Apa saja" });
    const receiver = participant({ id: "r", fandomYume: "Some Other Fandom" });
    expect(canGiveTo(giver, receiver)).toBe(true);
  });

  it("blocks when fandoms don't overlap and no wildcard is present", () => {
    const giver = participant({ id: "g", fandomGive: "Fandom A" });
    const receiver = participant({ id: "r", fandomYume: "Fandom B" });
    expect(canGiveTo(giver, receiver)).toBe(false);
  });

  it("lets art givers bypass the language restriction", () => {
    const giver = participant({ id: "g", contentType: "Art", languageGive: "Japanese" });
    const receiver = participant({ id: "r", languageReceive: "English" });
    expect(canGiveTo(giver, receiver)).toBe(true);
  });

  it("blocks non-art givers when languages don't overlap", () => {
    const giver = participant({ id: "g", contentType: "Writing", languageGive: "Japanese" });
    const receiver = participant({ id: "r", languageReceive: "English" });
    expect(canGiveTo(giver, receiver)).toBe(false);
  });

  it("treats receiver language 'apa saja' as accepting anyone", () => {
    const giver = participant({ id: "g", contentType: "Writing", languageGive: "Japanese" });
    const receiver = participant({ id: "r", languageReceive: "Apa saja" });
    expect(canGiveTo(giver, receiver)).toBe(true);
  });

  it("treats giver yume_type_give 'all' as accepting any receiver type", () => {
    const giver = participant({ id: "g", yumeTypeGive: "All" });
    const receiver = participant({ id: "r", yumeTypeReceive: "BL" });
    expect(canGiveTo(giver, receiver)).toBe(true);
  });

  it("blocks when yume types don't overlap and no wildcard is present", () => {
    const giver = participant({ id: "g", yumeTypeGive: "HL" });
    const receiver = participant({ id: "r", yumeTypeReceive: "BL" });
    expect(canGiveTo(giver, receiver)).toBe(false);
  });

  it("returns false when receiver has no fandom_yume at all", () => {
    const giver = participant({ id: "g", fandomGive: "Apa saja" });
    const receiver = participant({ id: "r", fandomYume: "" });
    expect(canGiveTo(giver, receiver)).toBe(false);
  });
});

describe("matchParticipants", () => {
  function makePool(n: number): MatchParticipant[] {
    return Array.from({ length: n }, (_, i) =>
      participant({
        id: `p${i}`,
        oshiName: `Oshi ${i}`,
        fandomGive: "Apa saja",
        yumeTypeGive: "All",
        languageReceive: "Apa saja",
      })
    );
  }

  it("produces the same result for the same seed", () => {
    const pool = makePool(20);
    const a = matchParticipants(pool, 42);
    const b = matchParticipants(pool, 42);
    expect(a.matches).toEqual(b.matches);
    expect(a.stats).toEqual(b.stats);
  });

  it("never assigns someone to give to themselves", () => {
    const pool = makePool(15);
    const { matches } = matchParticipants(pool, 7);
    for (const [giverIdx, receiverIdx] of matches) {
      expect(giverIdx).not.toBe(receiverIdx);
    }
  });

  it("never assigns a receiver to more than one giver", () => {
    const pool = makePool(15);
    const { matches } = matchParticipants(pool, 7);
    const receiverCounts = new Map<number, number>();
    for (const [, receiverIdx] of matches) {
      receiverCounts.set(receiverIdx, (receiverCounts.get(receiverIdx) ?? 0) + 1);
    }
    for (const count of receiverCounts.values()) {
      expect(count).toBe(1);
    }
  });

  it("matches everyone when the whole pool is mutually compatible", () => {
    const pool = makePool(10);
    const { stats } = matchParticipants(pool, 1);
    expect(stats.matchedPairs).toBe(10);
    expect(stats.unmatched).toBe(0);
  });

  it("respects the same-oshi block across the full run", () => {
    // Two participants who share an oshi with everyone else blocked out,
    // leaving them only able to match each other (which is disallowed).
    const pool = [
      participant({ id: "a", oshiName: "Shared", fandomGive: "Apa saja", yumeTypeGive: "All" }),
      participant({ id: "b", oshiName: "Shared", fandomGive: "Apa saja", yumeTypeGive: "All" }),
    ];
    const { matches } = matchParticipants(pool, 1);
    expect(matches).toEqual([]);
  });
});
