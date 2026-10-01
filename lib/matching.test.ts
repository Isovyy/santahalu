import { describe, expect, it } from "vitest";
import { canGiveTo, matchParticipants, matchBipartite, MatchParticipant } from "./matching";
import { AVOID_WHOLE_FANDOM } from "./avoidList";

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

  it("blocks every character in a fandom the giver excluded entirely", () => {
    const giver = participant({ id: "g", avoidList: `${AVOID_WHOLE_FANDOM} | Blue Lock` });
    const anyoneInThatFandom = participant({ id: "r", oshiName: "Whoever", fandomYume: "Blue Lock" });
    expect(canGiveTo(giver, anyoneInThatFandom)).toBe(false);
  });

  it("whole-fandom exclusion does not affect other fandoms", () => {
    const giver = participant({ id: "g", avoidList: `${AVOID_WHOLE_FANDOM} | Blue Lock` });
    const receiver = participant({ id: "r", oshiName: "Whoever", fandomYume: "Fandom A" });
    expect(canGiveTo(giver, receiver)).toBe(true);
  });

  it("'apa saja' fandom wildcard does not override a specific avoid entry", () => {
    const giver = participant({
      id: "g",
      fandomGive: "Apa saja",
      avoidList: "Isagi Yoichi | Blue Lock",
    });
    const avoided = participant({ id: "r", oshiName: "Isagi Yoichi", fandomYume: "Blue Lock" });
    const anyoneElse = participant({ id: "r2", oshiName: "Someone Else", fandomYume: "Blue Lock" });
    expect(canGiveTo(giver, avoided)).toBe(false);
    expect(canGiveTo(giver, anyoneElse)).toBe(true);
  });

  it("'apa saja' fandom wildcard does not override a whole-fandom avoid ('all except')", () => {
    const giver = participant({
      id: "g",
      fandomGive: "Apa saja",
      avoidList: `${AVOID_WHOLE_FANDOM} | Blue Lock`,
    });
    const inExcludedFandom = participant({ id: "r", oshiName: "Whoever", fandomYume: "Blue Lock" });
    const inOtherFandom = participant({ id: "r2", oshiName: "Someone Else", fandomYume: "Some Other Fandom" });
    expect(canGiveTo(giver, inExcludedFandom)).toBe(false);
    expect(canGiveTo(giver, inOtherFandom)).toBe(true);
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

  it("still requires a language match for a giver who does both Art and Writing", () => {
    const giver = participant({ id: "g", contentType: "Art, Writing", languageGive: "English" });
    const receiver = participant({ id: "r", languageReceive: "Indonesia" });
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

describe("matchBipartite", () => {
  it("pairs each broken giver to a broken receiver when compatible", () => {
    const givers = [participant({ id: "g1" }), participant({ id: "g2" })];
    const receivers = [participant({ id: "r1" }), participant({ id: "r2" })];
    const { matches, stats } = matchBipartite(givers, receivers, 1);
    expect(stats.matchedPairs).toBe(2);
    expect(stats.unmatchedGivers).toBe(0);
    expect(stats.unmatchedReceivers).toBe(0);
    // Every giver index should appear exactly once.
    expect(matches.map(([i]) => i).sort()).toEqual([0, 1]);
  });

  it("never pairs the same person as their own giver and receiver", () => {
    // "shared" appears as both a broken giver and a broken receiver (pulled
    // in from two different rows). It must never end up matched to itself.
    const givers = [participant({ id: "shared" }), participant({ id: "g2" })];
    const receivers = [participant({ id: "shared" }), participant({ id: "r2" })];
    const { matches } = matchBipartite(givers, receivers, 1);
    for (const [i, j] of matches) {
      expect(givers[i].id === receivers[j].id).toBe(false);
    }
  });

  it("leaves givers unmatched when no compatible receiver exists", () => {
    const givers = [participant({ id: "g1", oshiName: "Lonely", fandomGive: "Nonexistent Fandom" })];
    const receivers = [participant({ id: "r1", fandomYume: "Fandom A" })];
    const { matches, stats } = matchBipartite(givers, receivers, 1);
    expect(matches).toEqual([]);
    expect(stats.unmatchedGivers).toBe(1);
    expect(stats.unmatchedReceivers).toBe(1);
  });

  it("still respects the same-oshi block", () => {
    const givers = [participant({ id: "g1", oshiName: "Same" })];
    const receivers = [participant({ id: "r1", oshiName: "Same" })];
    const { matches } = matchBipartite(givers, receivers, 1);
    expect(matches).toEqual([]);
  });

  it("finds a full matching via augmenting paths where naive greedy would strand someone", () => {
    // giver1 can go to either A or B; giver2 can ONLY go to A. A one-pass
    // greedy that lets giver1 grab A first (its first candidate) strands
    // giver2 entirely, even though giver1->B, giver2->A matches both.
    const giver1 = participant({ id: "g1", fandomGive: "Apa saja" });
    const giver2 = participant({ id: "g2", fandomGive: "Fandom A" });
    const receiverA = participant({ id: "rA", oshiName: "OshiA", fandomYume: "Fandom A" });
    const receiverB = participant({ id: "rB", oshiName: "OshiB", fandomYume: "Fandom B" });

    for (let seed = 0; seed < 20; seed++) {
      const { stats } = matchBipartite(
        [giver1, giver2],
        [receiverA, receiverB],
        seed,
      );
      expect(stats.matchedPairs).toBe(2);
    }
  });
});

describe("matchParticipants (maximum matching)", () => {
  it("never strands a constrained participant when a full solution exists", () => {
    // W, X can give to anyone ("apa saja"); Y can ONLY give to X; Z can
    // ONLY give to W. A full 4-way matching exists (Y->X, Z->W, W->Y,
    // X->Z), but a one-pass greedy that happens to process W or X first
    // and grab the other's only receiver first can strand Y or Z, the
    // same failure mode that stranded two real participants in production.
    const w = participant({ id: "w", oshiName: "W", fandomGive: "Apa saja", fandomYume: "Fandom W" });
    const x = participant({ id: "x", oshiName: "X", fandomGive: "Apa saja", fandomYume: "Fandom X" });
    const y = participant({ id: "y", oshiName: "Y", fandomGive: "Fandom X", fandomYume: "Fandom Y" });
    const z = participant({ id: "z", oshiName: "Z", fandomGive: "Fandom W", fandomYume: "Fandom Z" });

    for (let seed = 0; seed < 20; seed++) {
      const { stats } = matchParticipants([w, x, y, z], seed);
      expect(stats.matchedPairs).toBe(4);
      expect(stats.unmatched).toBe(0);
    }
  });
});
