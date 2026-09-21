// Pure puzzle rules: positions are row-major cell indexes; null ropes are cleared.
export const clone = (ropes) => ropes.map(rope => rope && [...rope]);
export const point = (cell, cols) => [cell % cols, Math.floor(cell / cols)];
const cross = (a, b, c) => (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0]);
const onSegment = (a,b,p) => cross(a,b,p) === 0 && p[0] >= Math.min(a[0],b[0]) && p[0] <= Math.max(a[0],b[0]) && p[1] >= Math.min(a[1],b[1]) && p[1] <= Math.max(a[1],b[1]);

export function intersects(first, second, cols) {
  const [a,b] = first.map(c => point(c, cols));
  const [c,d] = second.map(c => point(c, cols));
  const abC=cross(a,b,c), abD=cross(a,b,d), cdA=cross(c,d,a), cdB=cross(c,d,b);
  return (abC*abD < 0 && cdA*cdB < 0) || onSegment(a,b,c) || onSegment(a,b,d) || onSegment(c,d,a) || onSegment(c,d,b);
}

export function crossings(ropes, cols) {
  let count=0;
  for(let i=0;i<ropes.length;i++) for(let j=i+1;j<ropes.length;j++) {
    if(ropes[i] && ropes[j] && intersects(ropes[i],ropes[j],cols)) count++;
  }
  return count;
}

export function settle(ropes, cols) {
  return ropes.map((rope,i) => rope && ropes.some((other,j) => j!==i && other && intersects(rope,other,cols)) ? [...rope] : null);
}

export function neighbors(cell, cols, rows) {
  const [c,r]=point(cell,cols);
  return [[c,r-1],[c-1,r],[c+1,r],[c,r+1]].filter(([x,y])=>x>=0&&x<cols&&y>=0&&y<rows).map(([x,y])=>y*cols+x);
}

export function endpointAt(ropes, cell) {
  for(let rope=0;rope<ropes.length;rope++) if(ropes[rope]) {
    const end=ropes[rope].indexOf(cell);
    if(end!==-1) return {rope,end};
  }
  return null;
}

export function move(ropes, action, cols, rows) {
  const {rope,end,to}=action;
  if(!Number.isInteger(rope)||!Number.isInteger(to)||![0,1].includes(end)||!ropes[rope]) return null;
  if(!neighbors(ropes[rope][end],cols,rows).includes(to)||endpointAt(ropes,to)) return null;
  const next=clone(ropes);
  next[rope][end]=to;
  return settle(next,cols);
}

export const solved = ropes => ropes.every(rope => rope === null);
export const stateKey = ropes => ropes.map(rope => rope ? rope.join(',') : '-').join('|');

export function validBoard(ropes, cols, rows) {
  if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<2||rows<2||!Array.isArray(ropes)||ropes.length<2||ropes.length>12) return false;
  const cells=[];
  for(const rope of ropes) {
    if(rope===null) continue;
    if(!Array.isArray(rope)||rope.length!==2) return false;
    for(const cell of rope) { if(!Number.isInteger(cell)||cell<0||cell>=cols*rows) return false; cells.push(cell); }
  }
  return new Set(cells).size===cells.length;
}

class MinHeap {
  items=[];
  push(item) {
    const a=this.items; a.push(item); let i=a.length-1;
    while(i>0){const p=(i-1)>>1; if(a[p].score<=item.score) break; a[i]=a[p]; i=p;} a[i]=item;
  }
  pop() {
    const a=this.items, first=a[0], last=a.pop();
    if(a.length){let i=0; while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].score<a[c].score)c++;if(a[c].score>=last.score)break;a[i]=a[c];i=c;}a[i]=last;}
    return first;
  }
}

// Bounded best-first search. A null answer is inconclusive, never proof of no solution.
export function solve(ropes, cols, rows, maxNodes=16000) {
  const initial=settle(ropes,cols);
  if(solved(initial)) return [];
  const heap=new MinHeap(), visited=new Set([stateKey(initial)]);
  heap.push({ropes:initial,path:[],score:0});
  let expanded=0;
  while(heap.items.length&&expanded++<maxNodes){
    const node=heap.pop();
    for(let i=0;i<node.ropes.length;i++) if(node.ropes[i]) for(let end=0;end<2;end++) {
      for(const to of neighbors(node.ropes[i][end],cols,rows)){
        const action={rope:i,end,to}; const next=move(node.ropes,action,cols,rows);
        if(!next) continue;
        const key=stateKey(next); if(visited.has(key))continue; visited.add(key);
        const path=[...node.path,action]; if(solved(next))return path;
        heap.push({ropes:next,path,score:next.filter(Boolean).length*100+crossings(next,cols)*3+path.length*0.5});
      }
    }
  }
  return null;
}
