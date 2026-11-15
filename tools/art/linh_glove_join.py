"""Găng Linh: nối cổ găng của chiếc phải (ref/linh_glove_right.png) vào nắm tay bạn tách (ref/linh_fist_user.png).
   Căn khớp bằng SIFT: ảnh bạn → găng đơn trong ảnh mẫu → chiếc găng phải (cùng bộ vẽ). → ref/linh_glove_joined.png"""
import sys; sys.path.insert(0,'/home/user/martial-peak/tools/art')
import numpy as np, cv2
from PIL import Image
import gear_from_ai as g
S='/tmp/claude-0/-home-user-martial-peak/964fa7fa-ce04-565e-ab42-72b315aab5e3/'
src=cv2.imread(f'{g.REF}/gear_t2_ai.webp'); H,W=src.shape[:2]
msk=np.array(Image.open(f'{g.REF}/gear_t2_mask.png').convert('L'))/255
user=cv2.imread(g.REF+'/linh_fist_user.png')
sift=cv2.SIFT_create(contrastThreshold=0.005)
gs=cv2.cvtColor(src,cv2.COLOR_BGR2GRAY); m=np.zeros_like(gs); m[255:500,0:250]=255
k1,d1=sift.detectAndCompute(cv2.cvtColor(user,cv2.COLOR_BGR2GRAY),None); k2,d2=sift.detectAndCompute(gs,m)
ms=[a for a,b in cv2.BFMatcher().knnMatch(d1,d2,k=2) if a.distance<0.8*b.distance]
T_US,inl=cv2.estimateAffinePartial2D(np.float32([k1[a.queryIdx].pt for a in ms]),np.float32([k2[a.trainIdx].pt for a in ms]),ransacReprojThreshold=2)
print('user->single',len(ms),int(inl.sum()),np.round(T_US,3))
# mặt nạ nắm tay theo đường cắt của bạn
um=(np.abs(user.astype(int)-254).max(2)>20).astype(np.uint8)
n,lab,st,_=cv2.connectedComponentsWithStats(um); um=(lab==1+np.argmax(st[1:,4])).astype(np.uint8)*255
from scipy import ndimage; um=(ndimage.binary_fill_holes(um>0)*255).astype(np.uint8)
fm=cv2.warpAffine(um,T_US,(W,H))
full=g.cutout(src,msk)
fist=full.copy(); fist[...,3]=(fist[...,3].astype(int)*fm//255).astype(np.uint8)
T_SR=np.float32([[0.729,0.121,1023.461],[-0.121,0.729,-114.088]])
fist=cv2.warpAffine(fist,T_SR,(W,H),flags=cv2.INTER_AREA,borderValue=(0,0,0,0))
# cổ găng: lấy từ chiếc găng phải đã làm sạch
rg=np.array(Image.open(f'{g.REF}/linh_glove_right.png'))
res=cv2.matchTemplate(cv2.cvtColor(full[...,:3][...,::-1].copy(),cv2.COLOR_RGB2GRAY), cv2.cvtColor(rg[...,:3],cv2.COLOR_RGB2GRAY), cv2.TM_SQDIFF, mask=(rg[...,3]>200).astype(np.uint8)*255)
_,_,(ox,oy),_=cv2.minMaxLoc(res); print('right glove offset',ox,oy)
cuff=np.zeros((H,W,4),np.uint8); cuff[oy:oy+rg.shape[0],ox:ox+rg.shape[1]]=rg
cp=np.zeros((H,W),np.uint8)
cv2.fillPoly(cp,[np.array([(1140,40),(1260,40),(1260,150),(1200,166),(1128,148)],np.int32)],255)   # phần trên vòng đai
cuff[...,3]=(cuff[...,3].astype(int)*cp//255).astype(np.uint8)
out=np.array(Image.alpha_composite(Image.fromarray(cuff,'RGBA'),Image.fromarray(fist,'RGBA')))
im=Image.fromarray(out,'RGBA'); im=im.crop(im.getchannel('A').point(lambda v:255 if v>30 else 0).getbbox())
im.save(g.REF+'/linh_glove_joined.png'); im.save('/home/user/martial-peak/tools/art/out/linh_glove_joined.png')
Image.alpha_composite(Image.new('RGBA',im.size,(255,255,255,255)),im).convert('RGB').save('/home/user/martial-peak/tools/art/out/linh_glove_joined_white.png')
Image.alpha_composite(Image.new('RGBA',im.size,(255,0,255,255)),im).convert('RGB').resize((im.width*3,im.height*3),Image.NEAREST).save(S+'scratchpad/x.png')
print(im.size)
