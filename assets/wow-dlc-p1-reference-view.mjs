/**
 * Public-safe WoW materials reference panel. This does not open the character
 * creator, authorize WoW source content, buy/sell items or grant rewards.
 * Caller must provide an approved mount location and a REDUCED public-safe
 * display snapshot. NEVER deliver the raw/private V2 source contract to a
 * browser: hiding draft translations in the DOM does not hide network data.
 */
import { inspectWowP1DisplaySnapshot, WOW_P1_REFERENCE_COUNTS } from './wow-dlc-p1-reference.mjs';

const LABELS = Object.freeze({
  all: '全部分類',
  professionMaterial: '專業採集素材',
  archaeologyFragment: '考古碎片',
  craftingResidue: '製作殘留物',
  factionRenownRule: '陣營與據點名望',
  featureBlessingCharm: '祝福與護符特性',
});

const PRICE_LABEL = Object.freeze({
  SOURCE_CONFLICT: '原始物品與規則表數值衝突｜待來源裁決',
  NATIVE_ZERO_WITHOUT_VALUE_AUTHORIZATION: '原生價格 0 GP｜不代表免費',
  NOT_APPLICABLE: '非商品規則項目',
  SOURCE_AGREEMENT_REFERENCE_VALUE_ONLY: '官方參考價｜不可直接購買',
});

const make = (doc, tag, cls, text = '') => {
  const element = doc.createElement(tag);
  element.className = cls;
  element.textContent = text;
  return element;
};
const append = (parent, ...children) => children.forEach(child => parent.appendChild(child));
const error = reason => ({ ok: false, reason, referenceOnly: true, playable: false });
// Ephemeral UI cleanup only. Not a durable auth state or entitlement store.
const activePanels = new WeakMap();

/**
 * Mount a real, responsive reference panel, with keyboard-accessible filter
 * controls. No source label or rule text is ever used as HTML markup.
 * The root is provided by the existing website Owner; no global DOM mutation.
 */
export function mountWowP1ReferenceView({ root, reference } = {}) {
  if (!root || typeof root.replaceChildren !== 'function' ||
      typeof root.ownerDocument?.createElement !== 'function')
    return error('P1_MOUNT_ROOT_REQUIRED');
  // Expired / revoked source must remove the previous rendered P1 panel;
  // a fail-closed validation result is not enough if stale DOM remains.
  activePanels.get(root)?.();
  const checked = inspectWowP1DisplaySnapshot(reference);
  if (!checked.ok) return error('P1_AUTHORIZED_SOURCE_METADATA_NOT_AVAILABLE');

  const doc = root.ownerDocument;
  const panel = make(doc, 'section', 'wow-p1-reference');
  panel.setAttribute('aria-label', '魔獸世界素材與來源參考');

  const heading = make(doc, 'h2', 'wow-p1-reference__heading', '魔獸世界｜素材與規則來源');
  const note = make(doc, 'p', 'wow-p1-reference__notice',
    '僅供來源參考；未核准譯名、效果、製作與配發均未開放。此清單不代表可購買或取得。');
  const controls = make(doc, 'div', 'wow-p1-reference__controls');
  const filterLabel = make(doc, 'label', 'wow-p1-reference__label', '分類');
  const filter = make(doc, 'select', 'wow-p1-reference__filter');
  filter.setAttribute('aria-label', '魔獸素材來源分類');
  for (const [key, value] of Object.entries(LABELS)) {
    const option = make(doc, 'option', '', value + (key === 'all' ? '' : '（' + WOW_P1_REFERENCE_COUNTS[key] + '）'));
    option.value = key;
    filter.appendChild(option);
  }
  filterLabel.appendChild(filter);
  const queryLabel = make(doc, 'label', 'wow-p1-reference__label', '搜尋原文名稱');
  const query = make(doc, 'input', 'wow-p1-reference__search');
  query.type = 'search';
  query.maxLength = 100;
  query.setAttribute('aria-label', '搜尋魔獸素材原文名稱');
  query.setAttribute('autocomplete', 'off');
  queryLabel.appendChild(query);
  append(controls, filterLabel, queryLabel);
  const count = make(doc, 'p', 'wow-p1-reference__count');
  count.setAttribute('aria-live', 'polite');
  const list = make(doc, 'ul', 'wow-p1-reference__items');
  const disclaimer = make(doc, 'p', 'wow-p1-reference__footer',
    '價格僅為來源參考值。完整規則、條件、效果及交易須由正式資料提供者與 GM 驗證。');
  append(panel, heading, note, controls, count, list, disclaimer);

  const render = () => {
    const key = Object.hasOwn(LABELS, filter.value) ? filter.value : 'all';
    const needle = String(query.value || '').trim().toLocaleLowerCase('en-US');
    const rows = checked.rows.filter(row =>
      (key === 'all' || key === row.type) &&
      (needle === '' || row.label.toLocaleLowerCase('en-US').includes(needle)));
    count.textContent = '顯示 ' + rows.length + '／' + checked.rows.length + ' 筆來源參考';
    list.replaceChildren();
    if (!rows.length) {
      list.appendChild(make(doc, 'li', 'wow-p1-reference__empty', '沒有符合條件的來源項目'));
      return;
    }
    for (const row of rows) {
      const item = make(doc, 'li', 'wow-p1-reference__item');
      const title = make(doc, 'strong', 'wow-p1-reference__item-title', row.label);
      const type = make(doc, 'span', 'wow-p1-reference__item-category', LABELS[row.type]);
      const status = make(doc, 'span', 'wow-p1-reference__item-status',
        row.priceStatus === 'SOURCE_AGREEMENT_REFERENCE_VALUE_ONLY'
          ? '參考值 ' + row.referenceGp.toLocaleString('en-US') + ' GP｜不可直接購買'
          : PRICE_LABEL[row.priceStatus] || '來源未核准');
      const id = make(doc, 'code', 'wow-p1-reference__source-id', row.id);
      append(item, title, type, status, id);
      list.appendChild(item);
    }
  };

  const onChange = () => render();
  const onInput = () => render();
  filter.addEventListener('change', onChange);
  query.addEventListener('input', onInput);
  root.replaceChildren(panel);
  filter.value = 'all';
  render();

  const unmount = () => {
    filter.removeEventListener('change', onChange);
    query.removeEventListener('input', onInput);
    if (panel.parentNode === root) root.removeChild(panel);
    if (activePanels.get(root) === unmount) activePanels.delete(root);
  };
  activePanels.set(root, unmount);
  return {
    ok: true,
    scope: 'P1_READ_ONLY_DOM_PROJECTION',
    referenceOnly: true,
    playable: false,
    count: checked.rows.length,
    unmount,
  };
}
