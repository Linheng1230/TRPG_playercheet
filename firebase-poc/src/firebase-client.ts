import {getApp,getApps,initializeApp,type FirebaseApp} from "firebase/app";
import {
  connectAuthEmulator,getAuth,GoogleAuthProvider,onAuthStateChanged,
  signInWithPopup,signOut,type Auth,type User
} from "firebase/auth";
import {connectFirestoreEmulator,getFirestore,type Firestore} from "firebase/firestore";

export type FirebaseServices={app:FirebaseApp;auth:Auth;db:Firestore};
const opts={
  apiKey:import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  appId:import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
};
export const configured=Object.values(opts).every(v=>typeof v==="string"&&v.length>0);
export const isSafeLocalEmulator=
  import.meta.env.VITE_FIREBASE_USE_EMULATORS==="true" &&
  typeof location!=="undefined" &&
  ["localhost","127.0.0.1"].includes(location.hostname) &&
  ["http:","https:"].includes(location.protocol);
let services:FirebaseServices|null=null;
export function getFirebaseServices():FirebaseServices|null{
  if(!configured)return null;
  if(services)return services;
  const app=getApps().length?getApp():initializeApp(opts as {apiKey:string;authDomain:string;projectId:string;appId:string});
  const auth=getAuth(app),db=getFirestore(app);
  if(isSafeLocalEmulator){
    connectAuthEmulator(auth,"http://127.0.0.1:9099",{disableWarnings:true});
    connectFirestoreEmulator(db,"127.0.0.1",8089);
  }
  services={app,auth,db};
  return services;
}
export function watchGoogleUser(onChange:(u:User|null)=>void):()=>void{
  const svc=getFirebaseServices();
  return svc?onAuthStateChanged(svc.auth,onChange):()=>onChange(null);
}
export async function loginWithGoogle():Promise<User>{
  const svc=getFirebaseServices();
  if(!svc)throw Error("尚未設定 Firebase 專案。");
  const provider=new GoogleAuthProvider();
  provider.setCustomParameters({prompt:"select_account"});
  // Popup avoids the third-party-storage redirect problems on GitHub Pages.
  const result=await signInWithPopup(svc.auth,provider);
  return result.user;
}
export async function logout():Promise<void>{
  const svc=getFirebaseServices();
  if(svc)await signOut(svc.auth);
}
