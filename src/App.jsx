import { useState } from 'react';
import { resolveConflict } from './rules';
import './App.css';

const emptyExam = () => ({ prefix: '', number: '', date: '', isCommon: false });

const LABELS = ['First Exam', 'Second Exam', 'Third Exam'];

export default function App() {
  const [exams, setExams] = useState([emptyExam(), emptyExam(), emptyExam()]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  function updateExam(idx, field, value) {
    setExams((prev) =>
      prev.map((exam, i) => (i === idx ? { ...exam, [field]: value } : exam))
    );
    setResult(null);
    setError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);

    // Basic field validation
    for (let i = 0; i < exams.length; i++) {
      const { prefix, number, date } = exams[i];
      if (!prefix.trim() || !number.trim() || !date) {
        setError(`Please fill in all fields for ${LABELS[i]}.`);
        return;
      }
      if (!/^\d+$/.test(number.trim())) {
        setError(
          `Course number for ${LABELS[i]} must be a positive integer (e.g. 631).`
        );
        return;
      }
      if (!/^[A-Za-z]{1,6}$/.test(prefix.trim())) {
        setError(
          `Subject code for ${LABELS[i]} should be letters only (e.g. CS, EE).`
        );
        return;
      }
    }

    // Same-date check – hard block
    const dates = exams.map((e) => e.date);
    const allSame = dates.every((d) => d === dates[0]);
    if (!allSame) {
      setError(
        'All three exams must be scheduled on the same calendar day to use this conflict resolver.'
      );
      return;
    }

    try {
      setResult(resolveConflict(exams));
    } catch (err) {
      setError(err.message);
    }
  }

  function handleReset() {
    setExams([emptyExam(), emptyExam(), emptyExam()]);
    setResult(null);
    setError('');
  }

  function courseLabel(exam) {
    return `${exam.prefix.toUpperCase()} ${exam.number}`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-icon" aria-hidden="true">🎓</div>
        <h1>NJIT Final Exam Conflict Resolver</h1>
        <p className="subtitle">Based on NJIT Final Exam Conflict Resolution Policy</p>
      </header>

      <main className="main">
        <form onSubmit={handleSubmit} noValidate>
          <p className="form-instructions">
            Enter three final exams scheduled on the same calendar day. This
            tool will apply NJIT's conflict resolution rules to determine which
            exam should be rescheduled.
          </p>
          <div className="exams-grid">
            {exams.map((exam, idx) => (
              <div key={idx} className="exam-card">
                <h2 className="exam-card__title">
                  <span className="exam-card__badge">{idx + 1}</span>
                  {LABELS[idx]}
                </h2>

                <div className="field-row">
                  <div className="field">
                    <label htmlFor={`prefix-${idx}`}>Subject Code</label>
                    <input
                      id={`prefix-${idx}`}
                      type="text"
                      placeholder="e.g. CS, MATH, ME"
                      maxLength={6}
                      value={exam.prefix}
                      onChange={(e) => updateExam(idx, 'prefix', e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`number-${idx}`}>Course Number</label>
                    <input
                      id={`number-${idx}`}
                      type="text"
                      placeholder="e.g. 332"
                      maxLength={6}
                      value={exam.number}
                      onChange={(e) => updateExam(idx, 'number', e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor={`date-${idx}`}>Exam Date</label>
                  <input
                    id={`date-${idx}`}
                    type="date"
                    value={exam.date}
                    onChange={(e) => updateExam(idx, 'date', e.target.value)}
                  />
                </div>

                <div className="field field--checkbox">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={exam.isCommon}
                      onChange={(e) =>
                        updateExam(idx, 'isCommon', e.target.checked)
                      }
                    />
                    <span>
                      Multiple sections with a{' '}
                      <strong>common final exam</strong>
                    </span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="error-banner" role="alert">
              ⚠️ {error}
            </div>
          )}

          <div className="actions">
            <button type="submit" className="btn btn--primary">
              Check Exam Conflict
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </form>

        {result && (
          <section className="result" aria-live="polite">
            <h2 className="result__heading">📋 Conflict Resolution Result</h2>

            <div className="result__summary">
              <span className="result__summary-icon">ℹ️</span>
              <p>{result.summary}</p>
            </div>

            <ol className="ranked-list">
              {result.rankedExams.map((exam) => {
                const isReschedule = exam.rank === 3;
                return (
                  <li
                    key={exam._idx}
                    className={`ranked-item ${
                      isReschedule
                        ? 'ranked-item--reschedule'
                        : 'ranked-item--stay'
                    }`}
                  >
                    <div
                      className="ranked-item__rank-badge"
                      aria-label={`Rank ${exam.rank}`}
                    >
                      {exam.rank}
                    </div>

                    <div className="ranked-item__body">
                      <div className="ranked-item__header">
                        <span className="ranked-item__course">
                          {courseLabel(exam)}
                        </span>
                        <span
                          className={`ranked-item__status ${
                            isReschedule ? 'status--reschedule' : 'status--stay'
                          }`}
                        >
                          {isReschedule ? '🔄 Reschedule' : '✅ Stays Scheduled'}
                        </span>
                      </div>

                      <div className="ranked-item__detail">
                        {formatDate(exam.date)}
                      </div>

                      <div className="ranked-item__reasoning">
                        <span className="ranked-item__reasoning-label">
                          Why:{' '}
                        </span>
                        {exam.reasoning}
                      </div>

                      {isReschedule && (
                        <div className="ranked-item__action">
                          Contact your instructor to arrange an alternate exam
                          time.
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            <p className="disclaimer">
              ⚠️ This is an unofficial student-built tool for guidance only.
              Students must confirm exam changes with their instructor or the
              Registrar.
            </p>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>
          This is an unofficial student-built tool for guidance only. Students
          must confirm exam changes with their instructor or the Registrar.
          &mdash; No data is stored or transmitted.
        </p>
      </footer>
    </div>
  );
}
