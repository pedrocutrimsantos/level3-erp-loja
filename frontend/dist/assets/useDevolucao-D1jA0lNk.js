import{d as n,o as s,h as o}from"./index-BDAGN2uW.js";import{u}from"./useQuery-DyfR6Pnk.js";import{u as i}from"./useMutation-CtYXSGag.js";/**
 * @license lucide-react v0.312.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=n("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]),r={buscarItens:e=>s.get(`/vendas/${e}/itens`).then(t=>t.data),registrar:(e,t)=>s.post(`/vendas/${e}/devolver`,t).then(a=>a.data),listar:(e=200)=>s.get("/devolucoes",{params:{limit:e}}).then(t=>t.data)};function v(e){return u({queryKey:["venda-itens",e],queryFn:()=>r.buscarItens(e),enabled:!!e,staleTime:3e4})}function p(){const e=o();return i({mutationFn:({vendaId:t,req:a})=>r.registrar(t,a),onSuccess:()=>{e.invalidateQueries({queryKey:["vendas"]}),e.invalidateQueries({queryKey:["estoque"]}),e.invalidateQueries({queryKey:["devolucoes"]})}})}function q(e=200){return u({queryKey:["devolucoes",e],queryFn:()=>r.listar(e),staleTime:3e4})}export{l as R,p as a,q as b,v as u};
