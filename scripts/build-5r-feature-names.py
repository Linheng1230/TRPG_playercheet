import difflib, html, json, os, re
from pathlib import Path
from opencc import OpenCC

repo=Path(__file__).resolve().parents[1]
root=Path(os.environ.get("FIVERTOOLS_ROOT",r"D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\5rtools-2024"))
cc=OpenCC("s2twp")

def parse_obj(path,prefix):
    s=path.read_text(encoding="utf-8")
    m=re.search(re.escape(prefix)+r"Object\.freeze\((\{.*\})\);",s,re.S)
    if not m: raise RuntimeError(f"Could not parse {path}")
    return json.loads(m.group(1))

def flatten(v):
    if isinstance(v,str): return [v]
    if isinstance(v,list):
        out=[]
        for x in v: out+=flatten(x)
        return out
    if isinstance(v,dict):
        out=[]
        if v.get("name"): out.append(str(v["name"])+"：")
        for k in ("entry","entries","items"):
            if k in v: out+=flatten(v[k])
        return out
    return []

def clean(t):
    t=html.unescape(str(t or ""))
    t=re.sub(r"\{@(?:damage|dice|dc|hit|chance|scaledice|scaledamage) ([^}|]+)(?:\|[^}]*)?\}",r"\1",t)
    t=re.sub(r"\{@[^ }]+ ([^}|]+)(?:\|[^}]*)?\}",r"\1",t)
    t=re.sub(r"<[^>]+>"," ",t)
    t=re.sub(r"\s+"," ",t).strip()
    for _ in range(3):
        n=cc.convert(t)
        if n==t: break
        t=n
    return t

class_eng={"野蠻人":"Barbarian","吟遊詩人":"Bard","牧師":"Cleric","德魯伊":"Druid","戰士":"Fighter","武僧":"Monk","聖武士":"Paladin","遊俠":"Ranger","遊蕩者":"Rogue","術士":"Sorcerer","邪術師":"Warlock","法師":"Wizard"}
sub_eng={
"狂戰士之道":"Path of the Berserker","野心之道":"Path of Wild Heart","世界樹之道":"Path of the World Tree","狂熱者之道":"Path of the Zealot",
"舞蹈學院":"College of Dance","魅音學院":"College of Glamour ","傳識學院":"College of Lore","勇氣學院":"College of Valor",
"生命領域":"Life Domain","光明領域":"Light Domain","詭術領域":"Trickery Domain","戰爭領域":"War Domain",
"大地結社":"Circle of the Land","月亮結社":"Circle of the Moon","海洋結社":"Circle of the Sea","星辰結社":"Circle of the Stars",
"戰鬥大師":"Battle Master","冠軍":"Champion","魔能騎士":"Eldritch Knight","靈能武士":"Psi Warrior",
"開手之道":"Warrior of the Open Hand","慈悲之手":"Warrior of Mercy","陰影之道":"Warrior of Shadow","四象之道":"Warrior of the Elements",
"奉獻誓言":"Oath of Devotion","榮耀誓言":"Oath of Glory","古賢誓言":"Oath of Ancients","復仇誓言":"Oath of Vengeance",
"獸王":"Beast Master","精類浪遊者":"Fey Wanderer","幽域追獵者":"Gloom Stalker","獵人":"Hunter",
"盜賊":"Thief","刺客":"Assassin","奧術騙徒":"Arcane Trickster","靈魂之刃":"Soulknife",
"龍族血脈":"Draconic Sorcery","狂野魔法":"Wild Magic","時鐘靈魂":"Clockwork Sorcery","異怪心靈":"Aberrant Sorcery",
"至高妖精宗主":"Archfey Patron","天界宗主":"Celestial Patron","邪魔宗主":"Fiend Patron","舊日支配者":"Great Old One Patron",
"防護師":"Abjurer","預言師":"Diviner","塑能師":"Evoker","幻術師":"Illusionist"}

manual={
"野蠻人||本能撲擊|7":("莽馳","Instinctive Pounce","feature"),
"戰士|戰鬥大師|戰鬥優勢|3":("卓越戰技","Combat Superiority","nested"),
"戰士|戰鬥大師|軍略學徒|3":("戰爭學者","Student of War","nested"),
"戰士|靈能武士|防護力場|3":("庇護力場","Protective Field","nested"),
"戰士|靈能武士|靈能打擊|3":("靈能打擊","Psionic Strike","nested"),
"遊俠|獸王|原初夥伴|3":("原初行侶","Primal Companion","feature"),
"術士|狂野魔法|狂野魔法湧動|3":("狂野魔法浪湧","Wild Magic Surge","feature"),
"牧師||神力波湧|2":("神聖火花","Divine Spark","nested"),
"牧師||引導神力|18":("引導神力(3/休息)","Channel Divinity (3/rest)","feature"),
"德魯伊||施法|1":("施法","Spellcasting","feature"),
"德魯伊||德魯伊語|1":("德魯伊語","Druidic","feature"),
"德魯伊||原初秩序|1":("原初職能","Primal Order","feature"),
"遊蕩者|奧術騙徒|施法|3":("施法","Spellcasting","feature"),
"遊蕩者|奧術騙徒|魔法巧手|3":("法師之手詐術","Mage Hand Legerdemain","feature"),
"遊蕩者|奧術騙徒|魔法伏擊|9":("詭術伏擊","Magical Ambush","feature"),
"遊蕩者|奧術騙徒|多才騙徒|13":("萬能詭術","Versatile Trickster","feature"),
"遊蕩者|奧術騙徒|法術竊賊|17":("法術竊賊","Spell Thief","feature"),
"遊蕩者|刺客|暗殺|3":("暗殺","Assassinate","feature"),
"遊蕩者|刺客|刺客工具|3":("刺客工具","Assassin's Tools","feature"),
"遊蕩者|刺客|滲透專精|9":("專業滲透","Infiltration Expertise","feature"),
"遊蕩者|刺客|奪命打擊|17":("致命襲殺","Death Strike","feature"),
"遊蕩者|靈魂之刃|靈能力量|3":("靈能力量","Psionic Power","feature"),
"遊蕩者|靈魂之刃|念刃|3":("念刃","Psychic Blades","feature"),
"遊蕩者|靈魂之刃|靈魂之刃|9":("靈魂之刃","Soul Blades","feature"),
"遊蕩者|靈魂之刃|撕裂心智|17":("撕裂心智","Rend Mind","feature"),
"遊蕩者|盜賊|巧手速用|3":("快手","Fast Hands","feature"),
"遊蕩者|盜賊|飛簷走壁|3":("樑上君子","Second-Story Work","feature"),
"遊蕩者|盜賊|使用魔法裝置|13":("使用魔法裝置","Use Magic Device","feature"),
"遊蕩者|盜賊|盜賊的反射|17":("竊盜本能","Thief's Reflexes","feature"),
"聖武士||靈光擴展|18":("靈光增效","Aura Improvements","feature"),
"遊俠||獵殺恢復|13":("永恆追獵","Relentless Hunter","feature"),
"遊俠||精準獵殺|17":("致命獵殺","Precise Hunter","feature"),
"遊俠||弒敵者|20":("屠滅眾敵","Foe Slayer","feature"),
"遊蕩者||滑溜心靈|15":("圓滑心智","Slippery Mind","feature"),
"遊蕩者|刺客|淬毒武器|13":("淬毒武器","Poisoned Weapons","feature"),
"遊蕩者|靈魂之刃|靈能面紗|13":("靈能面紗","Psychic Veil","feature"),
"遊蕩者|盜賊|至上潛行|9":("極效潛行","Supreme Sneak","feature"),
"遊俠|精類浪遊者|流派法術|3":("妖精漫遊者魔法","Fey Wanderer Magic","feature"),
"遊俠|幽域追獵者|流派法術|3":("幽域追獵者魔法","Gloom Stalker Magic","feature"),
"戰士|靈能武士|念動移物|3":("念力控物","Telekinetic Movement","nested"),
"牧師||引導神力|6":("引導神力","Channel Divinity","progression")}

local=parse_obj(repo/"assets/data/feature-5r-full-rules.js","window.ZIZI_5R_FULL_FEATURE_RULES=")
candidates=[];full_to_short={}
for f in sorted(root.glob("data__class__class-*.json")):
    d=json.loads(f.read_text(encoding="utf-8-sig"))
    for cl in d.get("class",[]):
        if cl.get("source")=="PHB2024":
            for sc in cl.get("subclasses",[]):
                if sc.get("source")=="PHB2024":
                    full_to_short[(cl.get("ENG_name",""),sc.get("ENG_name",""))]=sc.get("ENG_shortName","")
    for kind in ("classFeature","subclassFeature"):
        for x in d.get(kind,[]):
            if not (x.get("source")=="PHB2024" or x.get("classSource")=="PHB2024") or not x.get("ENG_name"): continue
            candidates.append({"kind":kind,"class":x.get("className"),"sub":x.get("subclassShortName",""),"level":int(x.get("level") or 0),"en":x["ENG_name"],"zh":cc.convert(x.get("name","")),"text":clean(" ".join(flatten(x.get("entries",[]))))})

aliases={}
for key,text in local.items():
    if key in manual: continue
    cls,sub,name,lv=key.split("|");lv=int(lv);ce=class_eng.get(cls,"");full=sub_eng.get(sub,"") if sub else "";se=full_to_short.get((ce,full),full) if sub else ""
    pool=[x for x in candidates if x["level"]==lv and (not ce or x["class"]==ce) and ((not sub and x["kind"]=="classFeature") or (sub and x["kind"]=="subclassFeature" and (not se or x["sub"]==se)))]
    if not pool and sub: pool=[x for x in candidates if x["level"]==lv and (not ce or x["class"]==ce) and x["kind"]=="subclassFeature"]
    lt=clean(text);ranked=[]
    for x in pool:
        ct=x["text"]
        text_score=(min(len(lt),len(ct))/max(len(lt),len(ct))) if lt and ct and (lt in ct or ct in lt) else difflib.SequenceMatcher(None,lt[:1200],ct[:1200]).ratio()
        name_score=difflib.SequenceMatcher(None,clean(name),clean(x["zh"])).ratio()
        ranked.append((max(text_score,name_score*.92),x))
    ranked.sort(key=lambda z:z[0],reverse=True)
    if ranked and ranked[0][0]>=.88:
        x=ranked[0][1];aliases[key]={"zh":x["zh"],"en":x["en"],"source":"feature"}

for key,(zh,en,source) in manual.items(): aliases[key]={"zh":zh,"en":en,"source":source}
missing=sorted(set(local)-set(aliases))
if missing: raise RuntimeError("Feature-name mapping incomplete: "+json.dumps(missing,ensure_ascii=False))
if len(aliases)!=len(local): raise RuntimeError(f"Feature-name coverage mismatch {len(aliases)}/{len(local)}")
js="/* Generated by scripts/build-5r-feature-names.py. Legacy runtime keys map to fixed 5RTools display names. */\n"+"globalThis.ZIZI_5R_FEATURE_NAMES="+json.dumps(aliases,ensure_ascii=False,separators=(",",":"))+";\n"
(repo/"assets/data/feature-names-5r.js").write_text(js,encoding="utf-8")
print(json.dumps({"features":len(local),"mapped":len(aliases),"manual":len(manual)},ensure_ascii=False))
