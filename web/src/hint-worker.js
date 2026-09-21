import {solve} from './engine.js';
self.onmessage=({data})=>{
  try {self.postMessage({id:data.id,solution:solve(data.ropes,data.cols,data.rows)});}
  catch {self.postMessage({id:data.id,solution:null});}
};
