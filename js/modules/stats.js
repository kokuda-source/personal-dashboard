// ============================================================
// stats.js
// 校舎×学年ごとの数値実績(在籍/募集動員/退学/休学)を表示・編集し、
// 「姫路学区合計」を自動計算して表示する
//
// 【データ構造】
// 1レコード = 1校舎×1学年。id は "{campus}__{grade}" で一意化。
// 参照元URLは校舎単位で1つ(3学年ぶんのレコードに同じ値を複製して保存)。
// ============================================================

import { CONFIG } from '../../config/config.js';
import { getItem, setItem } from '../utils/storage.js';
import { fetchSheet, replaceAllRows } from '../utils/gas-client.js';

const els = {};
let statsCache = [];

const GRADES = ['高1', '高2', '高3'];

const FIELDS = [
  { key: 'enrolled', label: '在籍人数' },
  { key: 'recruit', label: '募集動員人数' },
  { key: 'withdrawn', label: '退学人数' },
  { key: 'suspended', label: '休学人数' },
];

export function initStatsModule() {
  els.summary = document.getElementById('stats-summary');
  els.grid = document.getElementById('stats-grid');

  statsCache = getItem('stats_cache', defaultStats());
  render();
  syncFromGAS();
}

function makeId(campus, grade) {
  return `${campus}__${grade}`;
}

function defaultStats() {
  const rows = [];
  for (const campus of CONFIG.CAMPUSES) {
    for (const grade of GRADES) {
      rows.push({ id: makeId(campus, grade), campus, grade, enrolled: '', recruit: '', withdrawn: '', suspended: '', sourceUrl: '' });
    }
  }
  return rows;
}

async function syncFromGAS() {
  try {
    const rows = await fetchSheet('Stats');
    if (rows.length > 0) {
      statsCache = mergeWithDefaults(rows);
      setItem('stats_cache', statsCache);
      render();
    }
  } catch (err) {
    console.warn('[stats] GAS同期に失敗。ローカルキャッシュのまま表示します', err);
  }
}

// GAS側のデータに、config.js側で新しく増えた校舎/学年が漏れていたら補完する
function mergeWithDefaults(rows) {
  const byId = new Map(rows.map(r => [r.id || makeId(r.campus, r.grade), r]));
  const merged = [];
  for (const campus of CONFIG.CAMPUSES) {
    for (const grade of GRADES) {
      const id = makeId(campus, grade);
      merged.push(byId.get(id) || { id, campus, grade, enrolled: '', recruit: '', withdrawn: '', suspended: '', sourceUrl: '' });
    }
  }
  return merged;
}

function getRecord(campus, grade) {
  return statsCache.find(r => r.campus === campus && r.grade === grade);
}

function sumField(records, key) {
  return records.reduce((total, r) => total + (Number(r[key]) || 0), 0);
}

// ---- 描画 ----

function render() {
  renderSummary();
  renderCampusCards();
}

/** 姫路学区合計(全校舎×学年の自動集計。編集不可) */
function renderSummary() {
  if (!els.summary) return;

  const gradeColumns = GRADES.map(grade => {
    const gradeRecords = statsCache.filter(r => r.grade === grade);
    return { grade, records: gradeRecords };
  });

  els.summary.innerHTML = `
    <div class="stats-card stats-card--summary">
      <div class="stats-card__header">
        <span class="stats-card__campus">姫路学区合計</span>
      </div>
      <table class="stats-table">
        <thead>
          <tr>
            <th></th>
            ${GRADES.map(g => `<th>${g}</th>`).join('')}
            <th class="stats-table__total-col">合計</th>
          </tr>
        </thead>
        <tbody>
          ${FIELDS.map(f => `
            <tr>
              <th class="stats-table__row-label">${f.label}</th>
              ${gradeColumns.map(col => `<td class="stats-table__value">${sumField(col.records, f.key)}</td>`).join('')}
              <td class="stats-table__value stats-table__total-col">${sumField(statsCache, f.key)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/** 校舎別カード(校舎×学年の入力テーブル) */
function renderCampusCards() {
  if (!els.grid) return;

  els.grid.innerHTML = CONFIG.CAMPUSES.map(campus => {
    const campusRecords = GRADES.map(grade => getRecord(campus, grade));
    const sourceUrl = campusRecords.find(r => r?.sourceUrl)?.sourceUrl || '';

    return `
      <div class="stats-card">
        <div class="stats-card__header">
          <span class="stats-card__campus">${escapeHtml(campus)}</span>
          ${sourceUrl ? `<a href="${escapeAttr(sourceUrl)}" target="_blank" rel="noopener" class="stats-card__link">参照元</a>` : ''}
        </div>
        <table class="stats-table">
          <thead>
            <tr>
              <th></th>
              ${GRADES.map(g => `<th>${g}</th>`).join('')}
              <th class="stats-table__total-col">小計</th>
            </tr>
          </thead>
          <tbody>
            ${FIELDS.map(f => `
              <tr>
                <th class="stats-table__row-label">${f.label}</th>
                ${GRADES.map(grade => `
                  <td>
                    <input type="number" inputmode="numeric" min="0"
                      data-campus="${escapeAttr(campus)}" data-grade="${escapeAttr(grade)}" data-key="${f.key}"
                      value="${escapeAttr(getRecord(campus, grade)?.[f.key] ?? '')}">
                  </td>
                `).join('')}
                <td class="stats-table__value stats-table__total-col">${sumField(campusRecords, f.key)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <label class="stats-field stats-field--url">
          <span>参照元URL</span>
          <input type="url" data-campus="${escapeAttr(campus)}" data-key="sourceUrl" value="${escapeAttr(sourceUrl)}" placeholder="https://...">
        </label>
      </div>
    `;
  }).join('');

  els.grid.querySelectorAll('input').forEach(input => {
    input.addEventListener('change', onFieldChange);
  });
}

function onFieldChange(e) {
  const { campus, grade, key } = e.target.dataset;
  const value = e.target.value;

  if (key === 'sourceUrl') {
    // 参照元URLは校舎単位の値なので、その校舎の全学年レコードに複製する
    for (const g of GRADES) {
      const record = getRecord(campus, g);
      if (record) record.sourceUrl = value;
    }
  } else {
    const record = getRecord(campus, grade);
    if (record) record[key] = value;
  }

  setItem('stats_cache', statsCache);
  render();

  clearTimeout(onFieldChange._timer);
  onFieldChange._timer = setTimeout(() => {
    replaceAllRows('Stats', statsCache).catch(err => console.warn('[stats] sync failed', err));
  }, 800);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
