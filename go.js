(function(root){
  const other=c=>c==='B'?'W':'B';
  const empty=n=>Array.from({length:n},()=>Array(n).fill(null));
  const key=b=>b.map(r=>r.map(c=>c||'.').join('')).join('');
  function group(b,x,y){
    const c=b[y][x],seen=new Set(),lib=new Set(),stones=[],todo=[[x,y]],n=b.length;
    while(todo.length){const [a,d]=todo.pop(),k=d*n+a;if(seen.has(k))continue;seen.add(k);stones.push([a,d]);
      for(const [u,v] of [[a-1,d],[a+1,d],[a,d-1],[a,d+1]])if(u>=0&&v>=0&&u<n&&v<n){if(!b[v][u])lib.add(v*n+u);else if(b[v][u]===c&&!seen.has(v*n+u))todo.push([u,v]);}}
    return {stones,liberties:lib.size};
  }
  function play(board,color,x,y,history=[]){
    if(x===null)return {board:board.map(r=>r.slice()),captured:0};
    const n=board.length;if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=n||y>=n)throw Error('请落在棋盘交叉点上');
    if(board[y][x])throw Error('这里已有棋子');
    const b=board.map(r=>r.slice());b[y][x]=color;let captured=0;
    for(const [u,v] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(u>=0&&v>=0&&u<n&&v<n&&b[v][u]===other(color)){
      const g=group(b,u,v);if(!g.liberties){captured+=g.stones.length;for(const [a,d] of g.stones)b[d][a]=null;}}
    if(!group(b,x,y).liberties)throw Error('禁入点：此处落子后无气');
    if(history.includes(key(b)))throw Error('劫争：不能重复已有局面');
    return {board:b,captured};
  }
  function area(b,komi=7.5){let B=0,W=komi;const n=b.length,seen=new Set();
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){if(b[y][x]==='B'){B++;continue;}if(b[y][x]==='W'){W++;continue;}if(seen.has(y*n+x))continue;
      const todo=[[x,y]],edge=new Set();let count=0;while(todo.length){const [a,d]=todo.pop(),k=d*n+a;if(seen.has(k))continue;seen.add(k);count++;
        for(const [u,v] of [[a-1,d],[a+1,d],[a,d-1],[a,d+1]])if(u>=0&&v>=0&&u<n&&v<n){if(b[v][u])edge.add(b[v][u]);else if(!seen.has(v*n+u))todo.push([u,v]);}}
      if(edge.size===1){if(edge.has('B'))B+=count;else W+=count;}}
    return {B,W};}
  const toGtp=(x,y,n=19)=>x===null?'pass':'ABCDEFGHJKLMNOPQRST'[x]+(n-y);
  function fromGtp(s,n=19){if(s.toLowerCase()==='pass')return [null,null];const x='ABCDEFGHJKLMNOPQRST'.indexOf(s[0].toUpperCase()),y=n-Number(s.slice(1));if(x<0||x>=n||y<0||y>=n||!Number.isInteger(y))throw Error('引擎返回无效坐标');return [x,y];}
  const api={other,empty,key,group,play,area,toGtp,fromGtp};if(typeof module!=='undefined')module.exports=api;else root.Go=api;
})(globalThis);
