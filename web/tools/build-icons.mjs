// Dependency-free raster export of our code-authored rope mark.
import {writeFileSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
const colors={green:[40,89,77],cream:[250,246,233],gold:[244,187,112]};
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);name.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([name,data])),data.length+8);return out;}
function icon(size){
  const scale=size*2/512,n=size*2,pixels=new Uint8Array(n*n*3);
  for(let i=0;i<pixels.length;i+=3)pixels.set(colors.green,i);
  function disk(cx,cy,r,color){cx*=scale;cy*=scale;r*=scale;for(let y=Math.max(0,Math.floor(cy-r));y<=Math.min(n-1,Math.ceil(cy+r));y++)for(let x=Math.max(0,Math.floor(cx-r));x<=Math.min(n-1,Math.ceil(cx+r));x++)if((x-cx)**2+(y-cy)**2<=r*r)pixels.set(color,(y*n+x)*3);}
  function curve(points,width,color){for(let i=0;i<=500;i++){const t=i/500,u=1-t;const x=u**3*points[0][0]+3*u*u*t*points[1][0]+3*u*t*t*points[2][0]+t**3*points[3][0];const y=u**3*points[0][1]+3*u*u*t*points[1][1]+3*u*t*t*points[2][1]+t**3*points[3][1];disk(x,y,width/2,color);}}
  curve([[145,152],[370,152],[145,360],[367,360]],34,colors.gold);
  curve([[367,152],[145,152],[370,360],[145,360]],58,colors.green);
  curve([[367,152],[145,152],[370,360],[145,360]],34,colors.cream);
  for(const [x,y,c] of [[145,152,colors.gold],[367,360,colors.gold],[367,152,colors.cream],[145,360,colors.cream]])disk(x,y,25,c);
  const raw=Buffer.alloc((size*3+1)*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)for(let c=0;c<3;c++)raw[y*(size*3+1)+1+x*3+c]=Math.round((pixels[((y*2)*n+x*2)*3+c]+pixels[((y*2)*n+x*2+1)*3+c]+pixels[((y*2+1)*n+x*2)*3+c]+pixels[((y*2+1)*n+x*2+1)*3+c])/4);
  const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
for(const size of [192,512])writeFileSync(new URL(`../icons/icon-${size}.png`,import.meta.url),icon(size));
writeFileSync(new URL('../icons/maskable-512.png',import.meta.url),icon(512));
console.log('Wrote 192px, 512px and maskable PNG icons.');
