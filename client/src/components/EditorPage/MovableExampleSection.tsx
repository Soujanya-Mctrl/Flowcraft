import React, { useRef, useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import ExampleList from "../../pages/Diagram/ExampleList";

interface MovableExampleSectionProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  zIndex?: number;
  onFocus?: () => void;
}

const MovableExampleSection: React.FC<MovableExampleSectionProps> = ({ 
  isOpen, 
  setIsOpen,
  zIndex = 500,
  onFocus,
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 100, y: 300 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    onFocus?.();
    setDragging(true);
    const box = boxRef.current;
    if (box) {
      const rect = box.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    });
  }, [dragging]);

  const onMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    } else {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging, onMouseMove, onMouseUp]);


  if (!isOpen) return null;

  return (
    <div
      ref={boxRef}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: zIndex,
        width: 550,
        height: 400,
      }}
      onMouseDown={() => onFocus?.()}
      className="border border-border-primary bg-bg-primary flex flex-col overflow-hidden rounded-container"
    >
      {/* Minimal Header */}
      <div
        className="drag-handle cursor-move w-full flex justify-between items-center py-2.5 px-6 bg-bg-primary border-b border-border-primary select-none"
        onMouseDown={onMouseDown}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black tracking-[0.2em] opacity-40 uppercase text-text-primary">Templates</span>
        </div>
        
        <button
          className="p-2 hover:bg-bg-secondary rounded-pill transition-colors"
          onClick={() => setIsOpen(false)}
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto bg-bg-primary">

        <ExampleList />
      </div>
    </div>
  );
};


export default MovableExampleSection;