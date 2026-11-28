import assert from 'node:assert/strict';
import { mountWowP1ReferenceView } from '../assets/wow-dlc-p1-reference-view.mjs';
import { inspectWowP1ReferenceContract } from '../assets/wow-dlc-p1-reference.mjs';

const sha = 'a'.repeat(64);
const ids = {professionMaterial: 40, archaeologyFragment: 34,
  craftingResidue: 4, factionRenownRule: 12, featureBlessingCharm: 28};
const sourceType = {professionMaterial: 'loot', archaeologyFragment: 'loot',
  craftingResidue: 'loot', factionRenownRule: 'renown', featureBlessingCharm: 'feat'};
const entries = [];
let n = 0;
for (const [type, amount] of Object.entries(ids)) {
  for (let i = 0; i < amount; i++) {
    const id = type === 'professionMaterial' && i === 0 ? 'wowFish4RareReso' : 'wow' + String(n).padStart(13, '0');
    n++;
    const isLoot = sourceType[type] === 'loot', isArchaeology = type === 'archaeologyFragment';
    const isConflict = id === 'wowFish4RareReso';
    const price = isArchaeology || isConflict ? 0 : 10;
    const status = !isLoot ? 'NOT_APPLICABLE' : isArchaeology
      ? 'NATIVE_ZERO_WITHOUT_VALUE_AUTHORIZATION' : isConflict
      ? 'SOURCE_CONFLICT' : 'SOURCE_AGREEMENT_REFERENCE_VALUE_ONLY';
    entries.push({
      id, uuid: 'Compendium.dnd-world-warcraft.items.Item.' + id,
      source: 'wow-official', type, sourceType: sourceType[type],
      sourceEnglishName: isConflict ? 'Fishing Resource (Tier 4, Rare)' : 'Synthetic ' + type + ' ' + i,
      proposedZhName: '未授權文字不可顯示',
      labelQA: 'DRAFT_NEEDS_REVIEW', mechanicsQA: 'NOT_VERIFIED',
      sourceIdQA: 'PASS_NATIVE_INDEX', websiteAccess: 'REFERENCE_ONLY',
      autoGrant: false, published: false, marketPurchasable: false, craftingExecutable: false,
      quantity: isLoot ? 1 : null,
      price: isLoot ? {value: price, denomination: 'gp'} : null,
      priceIntegrity: {
        status,
        sourceItemPrice: isLoot ? {value: price, denomination: 'gp'} : null,
        rulebookTableReferenceGp: !isLoot || isArchaeology ? null : isConflict ? 2500 : price,
        displayReferenceValue: isLoot && !isArchaeology && !isConflict
          ? {value: price, denomination: 'gp'} : null,
        sourceConflictRequiresOwnerReview: isConflict,
        allowFreePurchase: false, allowPurchase: false, allowAutoCraft: false,
      },
    });
  }
}
const effects = Array.from({length: 7}, (_, i) => {
  const id = 'fx' + String(i).padStart(14, '0');
  return {id, uuid: 'Compendium.dnd-world-warcraft.effects.ActiveEffect.' + id,
    nativeMechanicsQA: 'NOT_VERIFIED', published: false, autoAttach: false};
});
const contract = {schema: 'wow.website-crafting-source-contract.v2',
  sourceBridgeSHA256: sha, sourceNative78SHA256: sha, referenceOnly: true,
  namesDraftUnapproved: true, release: {publicReleaseAllowed: false}, entries, effects};
// Synthetic-only trusted source projector; real private V2 contracts MUST be
// reduced before sending any browser payload or rendering the UI.
const reference = inspectWowP1ReferenceContract(contract);
assert.equal(reference.ok, true);

class FakeNode {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase(); this.ownerDocument = doc;
    this.children = []; this.parentNode = null; this.attributes = {};
    this.textContent = ''; this.className = ''; this.value = ''; this.handlers = {};
  }
  appendChild(x) {this.children.push(x); x.parentNode = this; return x;}
  replaceChildren(...xs) {this.children.forEach(x=>x.parentNode=null); this.children=[]; xs.forEach(x=>this.appendChild(x));}
  removeChild(x) {const i=this.children.indexOf(x); assert(i>=0); this.children.splice(i,1); x.parentNode=null;}
  setAttribute(k,v) {this.attributes[k]=String(v);}
  addEventListener(k,v) {this.handlers[k]=v;}
  removeEventListener(k,v) {if(this.handlers[k]===v) delete this.handlers[k];}
  trigger(k) {this.handlers[k]?.();}
}
const doc={createElement(tag){return new FakeNode(tag,doc)}};
const root=new FakeNode('div',doc);
const find=(node,selector)=>{
  if(node.className===selector) return node;
  for(const child of node.children) {const value=find(child,selector);if(value)return value;}
  return null;
};
const flatten=(node)=>[node.textContent||'',...node.children.map(flatten)].join(' ');
let tests=0;
const check=(description,fn)=>{fn();tests++;};
check('reject invalid source without touching DOM',()=>{
  const blocked=mountWowP1ReferenceView({root,reference:{}});
  assert.equal(blocked.ok,false);assert.equal(root.children.length,0);
});
check('raw private V2 input rejected instead of hiding its text only',()=>{
  const leaking = mountWowP1ReferenceView({root,reference:contract});
  assert.equal(leaking.ok,false);
  assert.equal(root.children.length,0);
});
check('snapshot with extra private fields rejected',()=>{
  const withPrivate = structuredClone(reference);
  withPrivate.rows[0].privateFullBody = '<p>must never leave server</p>';
  const rejected = mountWowP1ReferenceView({root,reference:withPrivate});
  assert.equal(rejected.ok,false);
  assert.equal(root.children.length,0);
});
const mounted=mountWowP1ReferenceView({root,reference});
check('118 safe-only records mount',()=>{
  assert.equal(mounted.ok,true);assert.equal(mounted.playable,false);
  assert.equal(mounted.count,118);assert.equal(root.children.length,1);
  assert(!flatten(root).includes('未授權文字不可顯示'));
  assert(!flatten(root).includes('購買按鈕'));
});
const filter=find(root,'wow-p1-reference__filter'),search=find(root,'wow-p1-reference__search');
const list=find(root,'wow-p1-reference__items'),counter=find(root,'wow-p1-reference__count');
check('accessible filter and live count',()=>{
  assert.equal(filter.attributes['aria-label'],'魔獸素材來源分類');
  assert.equal(search.attributes['aria-label'],'搜尋魔獸素材原文名稱');
  assert.equal(counter.attributes['aria-live'],'polite');
  assert.equal(list.children.length,118);
});
check('original disagreement never shown as free price',()=>{
  const conflict=list.children.find(x=>flatten(x).includes('wowFish4RareReso'));
  assert(conflict);assert(flatten(conflict).includes('數值衝突'));
  assert(!flatten(conflict).includes('參考值 0 GP'));
});
check('mobile-style category filtering is interactive',()=>{
  filter.value='archaeologyFragment';filter.trigger('change');
  assert.equal(list.children.length,34);
  assert(list.children.every(x=>flatten(x).includes('不代表免費')));
  assert(counter.textContent.includes('34／118'));
});
check('category and search combine with no match fallback',()=>{
  search.value='no-such-item';search.trigger('input');
  assert.equal(list.children.length,1);assert(flatten(list).includes('沒有符合條件'));
  search.value='Synthetic archaeologyFragment 5';search.trigger('input');
  assert.equal(list.children.length,1);
  assert(flatten(list).includes('Synthetic archaeologyFragment 5'));
});
check('type filtering recovers and no grant buttons',()=>{
  filter.value='featureBlessingCharm';filter.trigger('change');search.value='';search.trigger('input');
  assert.equal(list.children.length,28);
  assert(!flatten(root).includes('申領獎勵'));
});
let latestMount = mounted;
check('revoked or malformed source removes previously valid panel',()=>{
  const blocked=mountWowP1ReferenceView({root,reference:{}});
  assert.equal(blocked.ok,false);
  assert.equal(root.children.length,0);
  assert.equal(Object.keys(filter.handlers).length,0);
  assert.equal(Object.keys(search.handlers).length,0);
});
check('recovery remount cannot be removed by old stale mount handle',()=>{
  latestMount=mountWowP1ReferenceView({root,reference});
  assert.equal(latestMount.ok,true);
  assert.equal(root.children.length,1);
  mounted.unmount();
  assert.equal(root.children.length,1);
  assert.equal(find(root,'wow-p1-reference__items').children.length,118);
});
check('unmount removes active listeners and panel',()=>{
  const activeFilter=find(root,'wow-p1-reference__filter');
  const activeSearch=find(root,'wow-p1-reference__search');
  latestMount.unmount();
  assert.equal(root.children.length,0);
  assert.equal(Object.keys(activeFilter.handlers).length,0);
  assert.equal(Object.keys(activeSearch.handlers).length,0);
});
console.log(JSON.stringify({status:'PASS_P1_REFERENCE_DOM_ISOLATED',assertions:tests,privateData:'NONE',liveSite:'NOT_VERIFIED'}));
