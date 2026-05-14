import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  src: string;
  onCancel: () => void;
  onConfirm: (blob: Blob, width: number, height: number) => void;
};

type Frame = { x: number; y: number; size: number };

const STAGE_SIZE = 480;

export function CropDialog({ src, onCancel, onConfirm }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [frame, setFrame] = useState<Frame>({ x: 0, y: 0, size: STAGE_SIZE });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null
  );

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = src;
  }, [src]);

  const layout = useMemo(() => {
    if (!image) return null;
    const scale = STAGE_SIZE / Math.max(image.naturalWidth, image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const offsetX = (STAGE_SIZE - drawWidth) / 2;
    const offsetY = (STAGE_SIZE - drawHeight) / 2;
    const frameSize = Math.min(drawWidth, drawHeight);
    return { scale, drawWidth, drawHeight, offsetX, offsetY, frameSize };
  }, [image]);

  useEffect(() => {
    if (!layout) return;
    setFrame({
      x: layout.offsetX + (layout.drawWidth - layout.frameSize) / 2,
      y: layout.offsetY + (layout.drawHeight - layout.frameSize) / 2,
      size: layout.frameSize
    });
  }, [layout]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origX: frame.x,
      origY: frame.y
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !layout) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    const minX = layout.offsetX;
    const minY = layout.offsetY;
    const maxX = layout.offsetX + layout.drawWidth - frame.size;
    const maxY = layout.offsetY + layout.drawHeight - frame.size;
    setFrame((current) => ({
      ...current,
      x: Math.min(maxX, Math.max(minX, dragRef.current!.origX + dx)),
      y: Math.min(maxY, Math.max(minY, dragRef.current!.origY + dy))
    }));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleConfirm = async () => {
    if (!image || !layout) return;
    const sourceX = (frame.x - layout.offsetX) / layout.scale;
    const sourceY = (frame.y - layout.offsetY) / layout.scale;
    const sourceSize = frame.size / layout.scale;
    const outputSize = Math.min(512, Math.round(sourceSize));
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png", 0.95)
    );
    if (blob) onConfirm(blob, outputSize, outputSize);
  };

  return (
    <div className="brand-modal-overlay" role="dialog" aria-modal="true">
      <div className="brand-modal">
        <div className="brand-card-title">裁切 Logo（1:1）</div>
        <div className="brand-modal-hint">
          拖曳白色方框選取要保留的範圍。建議將品牌主視覺置中。
        </div>
        <div
          ref={stageRef}
          className="brand-crop-stage"
          style={{ width: STAGE_SIZE, height: STAGE_SIZE, alignSelf: "center" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {image && layout ? (
            <>
              <img
                className="brand-crop-image"
                src={src}
                alt="cropping source"
                style={{
                  width: layout.drawWidth,
                  height: layout.drawHeight,
                  left: layout.offsetX,
                  top: layout.offsetY
                }}
              />
              <div
                className="brand-crop-frame"
                style={{
                  left: frame.x,
                  top: frame.y,
                  width: frame.size,
                  height: frame.size
                }}
              />
            </>
          ) : null}
        </div>
        <div className="brand-modal-actions">
          <button type="button" className="brand-button brand-button-ghost" onClick={onCancel}>
            取消
          </button>
          <button
            type="button"
            className="brand-button brand-button-primary"
            onClick={() => void handleConfirm()}
            disabled={!image}
          >
            套用裁切
          </button>
        </div>
      </div>
    </div>
  );
}
