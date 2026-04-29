/**
 * NJIT Final Exam Conflict Resolver – Core Logic
 *
 * Rule 1: Exams with multiple sections sharing a common final take highest priority.
 * Rule 2: Among exams in the same Rule-1 tier, higher course number wins.
 * Rule 3: If course numbers tie, alphabetically earlier subject code wins.
 *
 * Supports 2 or more exams. All exams except the lowest-ranked stay scheduled.
 */

/**
 * Ranks all exams and returns a structured result.
 * @param {Array} exams - Array of exam objects (length >= 3):
 *   { prefix: string, number: string, date: string, isCommon: boolean }
 * @returns {{
 *   rankedExams: object[],     // all, rank 1 = highest priority
 *   stayScheduled: object[],   // all but the last
 *   shouldReschedule: object,  // rank N (lowest)
 *   summary: string
 * }}
 */
export function resolveConflict(exams) {
  if (!exams || exams.length < 2) {
    throw new Error('At least two exams are required.');
  }

  // Enrich with computed fields
  const tagged = exams.map((exam, idx) => ({
    ...exam,
    _idx: idx,
    _num: parseInt(exam.number, 10) || 0,
    _prefix: exam.prefix.trim().toUpperCase(),
  }));

  // Sort: common first (Rule 1), higher number (Rule 2), earlier prefix (Rule 3)
  const ranked = [...tagged].sort((a, b) => {
    if (a.isCommon !== b.isCommon) return a.isCommon ? -1 : 1;
    if (b._num !== a._num) return b._num - a._num;
    return a._prefix < b._prefix ? -1 : a._prefix > b._prefix ? 1 : 0;
  });

  const rankedExams = ranked.map((exam, i) => ({
    ...exam,
    rank: i + 1,
    reasoning: buildReasoning(exam, ranked, i),
  }));

  return {
    rankedExams,
    stayScheduled: rankedExams.slice(0, -1),
    shouldReschedule: rankedExams[rankedExams.length - 1],
    summary: buildSummary(ranked),
  };
}

// ─── Reasoning ──────────────────────────────────────────────────────────────

function buildReasoning(exam, ranked, rankIdx) {
  const n = ranked.length;
  const lastIdx = n - 1;
  const commonCount = ranked.filter((e) => e.isCommon).length;
  const isLast = rankIdx === lastIdx;
  const isFirst = rankIdx === 0;
  const prev = rankIdx > 0 ? ranked[rankIdx - 1] : null;
  const next = rankIdx < lastIdx ? ranked[rankIdx + 1] : null;

  // ── Common exam ──────────────────────────────────────────────────────
  if (exam.isCommon) {
    const commonGroup = ranked.filter((e) => e.isCommon);
    const posInCommon = commonGroup.findIndex((e) => e._idx === exam._idx);
    const isFirstInCommon = posInCommon === 0;
    const isLastInCommon = posInCommon === commonGroup.length - 1;

    if (isFirst) {
      if (commonCount === n) {
        // All common – distinguished only by Rule 2/3
        return next && exam._num > next._num
          ? 'Multiple-section common final and highest course number (Rules 1 & 2)'
          : 'Multiple-section common final, tied course number, alphabetically earliest subject code (Rules 1, 2 & 3)';
      }
      if (commonCount === 1) {
        return 'Only exam with a multiple-section common final – automatically highest priority (Rule 1)';
      }
      return prev === null || exam._num > (ranked[1]?._num ?? -1)
        ? 'Multiple-section common final and highest course number among common finals (Rules 1 & 2)'
        : 'Multiple-section common final, tied course number, alphabetically earliest subject code (Rules 1, 2 & 3)';
    }

    if (isLastInCommon && !isLast) {
      // Last common but not overall last – next exam is non-common
      return prev && prev._num > exam._num
        ? 'Multiple-section common final but lower course number than exams above (Rules 1 & 2)'
        : 'Multiple-section common final but later subject code than exams above; still outranks non-common exams (Rules 1, 2 & 3)';
    }

    if (isLast) {
      // Lowest ranked
      return prev && prev._num > exam._num
        ? 'Multiple-section common final but lowest course number among all exams (Rules 1 & 2)'
        : 'Multiple-section common final but alphabetically latest subject code among tied course numbers (Rules 1, 2 & 3)';
    }

    // Middle common exam
    return prev && prev._num > exam._num
      ? 'Multiple-section common final but lower course number than exam above (Rules 1 & 2)'
      : 'Multiple-section common final, tied course number; alphabetically later than exam above (Rules 1, 2 & 3)';
  }

  // ── Non-common exam ──────────────────────────────────────────────────
  const nonCommon = ranked.filter((e) => !e.isCommon);
  const posInNonCommon = nonCommon.findIndex((e) => e._idx === exam._idx);
  const isFirstNonCommon = posInNonCommon === 0;
  const prevNonCommon = posInNonCommon > 0 ? nonCommon[posInNonCommon - 1] : null;

  if (commonCount > 0) {
    // Some common exams outrank this group
    if (isFirstNonCommon) {
      return next && exam._num > next._num
        ? 'No common final; highest course number among remaining exams (Rule 2)'
        : 'No common final; tied course number, alphabetically earliest subject code among remaining exams (Rules 2 & 3)';
    }
    if (isLast) {
      return prevNonCommon && prevNonCommon._num > exam._num
        ? 'No common final; lowest course number — lowest priority overall (Rule 2)'
        : 'No common final; tied course number, alphabetically latest subject code — lowest priority (Rules 2 & 3)';
    }
    return prevNonCommon && prevNonCommon._num > exam._num
      ? 'No common final; lower course number than exam above (Rule 2)'
      : 'No common final; tied course number, alphabetically later than exam above (Rules 2 & 3)';
  }

  // No common exams at all
  if (isFirst) {
    return next && exam._num > next._num
      ? 'Highest course number among all exams (Rule 2)'
      : 'Tied highest course number; alphabetically earliest subject code (Rules 2 & 3)';
  }
  if (isLast) {
    return prev && prev._num > exam._num
      ? 'Lowest course number among all exams (Rule 2)'
      : 'Tied course number; alphabetically latest subject code — lowest priority (Rules 2 & 3)';
  }
  // Middle
  if (prev && prev._num > exam._num && next && exam._num > next._num) {
    return 'Middle course number among all exams (Rule 2)';
  }
  if (prev && prev._num === exam._num) {
    return 'Tied course number with exam above; alphabetically later subject code (Rules 2 & 3)';
  }
  if (next && exam._num === next._num) {
    return 'Tied course number with exam below; alphabetically earlier subject code (Rules 2 & 3)';
  }
  return 'Ranked by course number (Rule 2)';
}

// ─── Summary ────────────────────────────────────────────────────────────────

function buildSummary(ranked) {
  const commonCount = ranked.filter((e) => e.isCommon).length;
  const n = ranked.length;

  const rulesUsed = [];
  if (commonCount > 0 && commonCount < n) rulesUsed.push('Rule 1 (common finals)');
  if (commonCount === n) rulesUsed.push('Rule 1 does not fully resolve the conflict');

  // Check if Rule 3 was needed
  const needsRule3 = ranked.some((exam, i) => {
    if (i === 0) return false;
    return ranked[i - 1]._num === exam._num;
  });

  let base =
    "Based on NJIT's conflict rules, the entered exams are ranked by " +
    'multiple-section/common final status (Rule 1), course number (Rule 2)';

  if (needsRule3) {
    base += ', and alphabetically by subject code where course numbers are tied (Rule 3)';
  }

  base += '. The lowest-ranked exam should be rescheduled.';
  return base;
}
