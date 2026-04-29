/**
 * Final Exam Conflict Resolver – Core Logic
 *
 * Rule 1: Exams with multiple sections sharing a common final take highest priority.
 * Rule 2: Among exams in the same Rule-1 tier, higher course number wins.
 * Rule 3: If course numbers tie, alphabetically earlier prefix wins.
 *
 * All three exams are ranked 1–3. Top 2 stay scheduled; rank 3 is rescheduled.
 */

/**
 * Ranks all three exams and returns structured result.
 * @param {Array} exams - Array of three exam objects:
 *   { prefix: string, number: string, date: string, time: string, isCommon: boolean }
 * @returns {{
 *   rankedExams: object[],   // all 3, rank 1 = highest priority
 *   stayScheduled: object[], // ranks 1 & 2
 *   shouldReschedule: object, // rank 3
 *   summary: string
 * }}
 */
export function resolveConflict(exams) {
  if (!exams || exams.length !== 3) {
    throw new Error('Exactly three exams are required.');
  }

  // Enrich with computed fields
  const tagged = exams.map((exam, idx) => ({
    ...exam,
    _idx: idx,
    _num: parseInt(exam.number, 10) || 0,
    _prefix: exam.prefix.trim().toUpperCase(),
  }));

  // Sort: common first (Rule 1), then higher number (Rule 2), then earlier prefix (Rule 3)
  const ranked = [...tagged].sort((a, b) => {
    if (a.isCommon !== b.isCommon) return a.isCommon ? -1 : 1; // Rule 1
    if (b._num !== a._num) return b._num - a._num;             // Rule 2
    return a._prefix < b._prefix ? -1 : a._prefix > b._prefix ? 1 : 0; // Rule 3
  });

  const commonCount = tagged.filter((e) => e.isCommon).length;

  // Attach rank and reasoning to each exam
  const rankedExams = ranked.map((exam, i) => ({
    ...exam,
    rank: i + 1,
    reasoning: buildReasoning(exam, ranked, i, commonCount),
  }));

  return {
    rankedExams,
    stayScheduled: [rankedExams[0], rankedExams[1]],
    shouldReschedule: rankedExams[2],
    summary: buildSummary(ranked, commonCount),
  };
}

// ─── Reasoning ─────────────────────────────────────────────────────────────

function buildReasoning(exam, ranked, rankIdx, commonCount) {
  const [r0, r1, r2] = ranked;

  // ── All three common ──────────────────────────────────────────────────
  if (commonCount === 3) {
    if (rankIdx === 0) {
      if (r0._num > r1._num) return 'Multiple-section common final and highest course number (Rules 1 & 2)';
      return 'Multiple-section common final, tied course number, alphabetically earliest prefix (Rules 1, 2 & 3)';
    }
    if (rankIdx === 1) {
      if (r0._num > r1._num && r1._num > r2._num)
        return 'Multiple-section common final but middle course number (Rules 1 & 2)';
      if (r0._num === r1._num)
        return 'Multiple-section common final, tied course number with #1 but later prefix; higher than #3 (Rules 1, 2 & 3)';
      if (r1._num === r2._num)
        return 'Multiple-section common final but lower course number than #1; alphabetically earlier prefix than #3 (Rules 1, 2 & 3)';
      return 'Multiple-section common final but lower course number than #1 (Rules 1 & 2)';
    }
    // rank 3
    if (r1._num > r2._num)
      return 'Multiple-section common final but lowest course number among all three (Rules 1 & 2)';
    return 'Multiple-section common final but alphabetically latest prefix among tied course numbers (Rules 1, 2 & 3)';
  }

  // ── Two common ───────────────────────────────────────────────────────
  if (commonCount === 2) {
    const commonPair = ranked.filter((e) => e.isCommon);
    if (exam.isCommon) {
      const otherCommon = commonPair.find((e) => e._idx !== exam._idx);
      if (rankIdx === 0) {
        if (exam._num > otherCommon._num)
          return 'Multiple-section common final and higher course number among common finals (Rules 1 & 2)';
        return 'Multiple-section common final and alphabetically earlier prefix among tied course numbers (Rules 1, 2 & 3)';
      }
      // rankIdx === 1
      if (exam._num < otherCommon._num)
        return 'Multiple-section common final but lower course number than #1 (Rules 1 & 2)';
      return 'Multiple-section common final but alphabetically later prefix than #1 (Rules 1, 2 & 3)';
    }
    // non-common exam → always rank 3
    return 'No multiple-section common final exam; automatically lowest priority (Rule 1)';
  }

  // ── One common ───────────────────────────────────────────────────────
  if (commonCount === 1) {
    if (exam.isCommon) {
      return 'Only exam with a multiple-section common final – automatically highest priority (Rule 1)';
    }
    // non-common at rank 1 or 2
    const nonCommon = ranked.filter((e) => !e.isCommon);
    const [nc0, nc1] = nonCommon; // nc0 is rank 1 in non-common group (overall rank 1 or 2)
    if (rankIdx === 1) {
      // rank 2 among non-common
      if (nc0._num > nc1._num)
        return 'No common final; higher course number among the two remaining exams (Rule 2)';
      return 'No common final; tied course number, alphabetically earlier prefix (Rules 2 & 3)';
    }
    // rankIdx === 2 (rank 3 overall, rank 2 non-common)
    if (nc0._num > nc1._num)
      return 'No common final; lower course number among the two remaining exams (Rule 2)';
    return 'No common final; tied course number, alphabetically later prefix (Rules 2 & 3)';
  }

  // ── No common exams ──────────────────────────────────────────────────
  if (rankIdx === 0) {
    if (r0._num > r1._num) return 'Highest course number among all three exams (Rule 2)';
    return 'Tied highest course number; alphabetically earliest prefix (Rules 2 & 3)';
  }
  if (rankIdx === 1) {
    if (r0._num > r1._num && r1._num > r2._num) return 'Middle course number among all three exams (Rule 2)';
    if (r0._num === r1._num)
      return 'Tied highest course number with #1 but later prefix; higher than #3 (Rules 2 & 3)';
    if (r1._num === r2._num)
      return 'Tied course number with #3; alphabetically earlier prefix keeps it ahead (Rules 2 & 3)';
    return 'Higher course number than the lowest-ranked exam (Rule 2)';
  }
  // rank 3, no common
  if (r1._num > r2._num) return 'Lowest course number among all three exams (Rule 2)';
  return 'Tied course number; alphabetically latest prefix among all three (Rules 2 & 3)';
}

// ─── Summary ────────────────────────────────────────────────────────────────

function buildSummary(ranked, commonCount) {
  const [r0, r1, r2] = ranked;
  const needsRule3 = r0._num === r1._num || r1._num === r2._num;

  if (commonCount === 0) {
    if (needsRule3) {
      return (
        'Based on NJIT\'s conflict rules: no exams have multiple-section common finals, so Rule 1 does not apply. ' +
        'Course numbers are compared (Rule 2). Because some course numbers are tied, ' +
        'Rule 3 is also applied — the alphabetically earlier subject code takes priority. ' +
        'The lowest-ranked exam should be rescheduled.'
      );
    }
    return (
      'Based on NJIT\'s conflict rules: no exams have multiple-section common finals, so Rule 1 does not apply. ' +
      'The exams are ranked by course number (Rule 2). ' +
      'The lowest-numbered course should be rescheduled.'
    );
  }

  if (commonCount === 1) {
    if (needsRule3) {
      return (
        'Based on NJIT\'s conflict rules: one exam has a multiple-section common final and automatically takes the top spot (Rule 1). ' +
        'The remaining two exams have equal course numbers, so Rule 3 is applied — ' +
        'the alphabetically earlier subject code ranks higher. ' +
        'The lowest-ranked exam should be rescheduled.'
      );
    }
    return (
      'Based on NJIT\'s conflict rules: one exam has a multiple-section common final and automatically takes the top spot (Rule 1). ' +
      'The remaining two exams are ranked by course number (Rule 2). ' +
      'The lower-numbered course should be rescheduled.'
    );
  }

  if (commonCount === 2) {
    return (
      'Based on NJIT\'s conflict rules: two exams share multiple-section common finals and occupy the top two spots (Rule 1). ' +
      'The exam without a common final is automatically ranked lowest and should be rescheduled.'
    );
  }

  // commonCount === 3
  if (needsRule3) {
    return (
      'Based on NJIT\'s conflict rules: all three courses have multiple-section common finals, so Rule 1 does not fully resolve the conflict. ' +
      'Course numbers are compared (Rule 2). Because some course numbers are tied, ' +
      'Rule 3 is also applied — the alphabetically earlier subject code takes priority. ' +
      'The lowest-ranked course should be rescheduled.'
    );
  }
  return (
    'Based on NJIT\'s conflict rules: all three courses have multiple-section common finals, so Rule 1 does not fully resolve the conflict. ' +
    'Rule 2 is applied, giving priority to higher course numbers. ' +
    'Therefore, the lowest-numbered course should be rescheduled.'
  );
}
