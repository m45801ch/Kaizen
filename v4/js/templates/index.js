/* 模板註冊與解析 */
import generic from "./generic/index.js";
import safety from "./safety/index.js";
import quality from "./quality/index.js";
import slide from "./slide/index.js";

export const templates = [generic, safety, quality, slide];
export function getTemplate(id){
  return templates.find(t=>t.id===id) || generic;
}
export function listTemplates(){ return templates.slice(); }
