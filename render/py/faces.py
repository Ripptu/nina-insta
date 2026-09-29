"""Gesichter finden (YuNet). Aufruf: faces.py bild1 bild2 ... -> JSON {bild: [[x,y,w,h,score],...]}"""
import sys, json, os, cv2
here = os.path.dirname(os.path.abspath(__file__))
det = cv2.FaceDetectorYN.create(os.path.join(here, 'yunet.onnx'), '', (320, 320), 0.55, 0.3, 5000)
out = {}
for p in sys.argv[1:]:
    img = cv2.imread(p)
    if img is None:
        out[p] = []
        continue
    h, w = img.shape[:2]
    res = []
    # zwei Größen: Original und verkleinert, damit kleine wie große Gesichter gefunden werden
    for scale in (1.0, 0.5):
        im = img if scale == 1.0 else cv2.resize(img, (int(w * scale), int(h * scale)))
        det.setInputSize((im.shape[1], im.shape[0]))
        _, f = det.detect(im)
        if f is not None:
            for r in f:
                res.append([float(r[0] / scale), float(r[1] / scale), float(r[2] / scale), float(r[3] / scale), float(r[14])])
    out[p] = res
print(json.dumps(out))
