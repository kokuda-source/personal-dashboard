// ============================================================
// date.js
// 日付関連の共通処理
// ============================================================

const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土'];

/** 今日の日付を YYYY-MM-DD 形式で返す */
export function todayStr() {
  return toDateStr(new Date());
}

/** 明日の日付を YYYY-MM-DD 形式で返す */
export function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDateStr(d);
}

export function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 今日から見て何日後か(過去ならマイナス)を返す */
export function daysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** 締切表示用の文言(例: "明日締切" "3日後" "2日超過") */
export function deadlineLabel(dateStr) {
  if (!dateStr) return '締切なし';
  const diff = daysUntil(dateStr);
  if (diff < 0) return `${Math.abs(diff)}日超過`;
  if (diff === 0) return '本日締切';
  if (diff === 1) return '明日締切';
  return `${diff}日後`;
}

/** YYYY-MM-DD -> "8/2(日)" のような短い表示 */
export function toShortJaDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_JA[d.getDay()]})`;
}

/**
 * 定期リマインドが「今日」表示対象かどうかを判定
 * reminder.type: 'monthly' (value=1〜31, 月末は31を指定し月末日で丸める) | 'weekly' (value=0〜6, 0=日曜)
 */
export function isReminderDueToday(reminder) {
  const now = new Date();
  if (reminder.type === 'weekly') {
    return now.getDay() === Number(reminder.value);
  }
  if (reminder.type === 'monthly') {
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const targetDay = Math.min(Number(reminder.value), lastDayOfMonth);
    return now.getDate() === targetDay;
  }
  return false;
}
