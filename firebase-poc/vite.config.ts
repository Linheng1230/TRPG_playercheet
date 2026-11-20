import {defineConfig} from "vite";
import {fileURLToPath} from "node:url";
const deps=(name:string)=>fileURLToPath(new URL("./node_modules/"+name,import.meta.url));
export default defineConfig({
  base:"./",server:{host:"127.0.0.1",port:5187,strictPort:true},
  resolve:{alias:[
    {find:/^react$/,replacement:deps("react")},
    {find:/^react\//,replacement:deps("react")+"/"},
    {find:/^react-dom$/,replacement:deps("react-dom")},
    {find:/^react-dom\//,replacement:deps("react-dom")+"/"}
  ]}
});
