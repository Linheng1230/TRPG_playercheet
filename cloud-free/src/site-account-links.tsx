export function SiteAccountLinks({root="./"}:{root?:string}){
 return <nav className="site-account-links" aria-label="冒險者快速導覽">
  <a href={root+"home.html"}>冒險首頁</a><a href={root+"academy.html?step=lesson.welcome"}>新手創角教學</a>
  <a href={root+"index.html?view=creator"}>角色創建</a><a href={root+"index.html?view=characters"}>角色百科</a>
  <a href={root+"index.html?view=sheet"}>角色卡</a><a href={root+"index.html?view=play"}>跑團狀態</a>
  <a href={root+"cloud-vault/"}>雲端角色庫</a>
 </nav>;
}
