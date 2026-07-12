export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
export function token(){ return typeof window !== "undefined" ? localStorage.getItem("token") : null }
export async function request(path:string, options:RequestInit={}){
  const res=await fetch(`${API}${path}`,{...options,headers:{"Content-Type":"application/json",...(token()?{Authorization:`Bearer ${token()}`} : {}),...(options.headers||{})}})
  if(!res.ok){ const data=await res.json().catch(()=>({detail:"请求失败"})); throw new Error(data.detail||"请求失败") }
  return res.json()
}
