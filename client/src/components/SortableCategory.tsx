import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ReactNode } from 'react';

interface SortableCategoryProps {
  id: number;
  children: ReactNode;
}

export function SortableCategory({ id, children }: SortableCategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-secondary rounded-lg overflow-hidden">
      <div className="flex items-start">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-3 hover:bg-secondary-foreground/10 self-stretch flex items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

interface SortableSubcategoryProps {
  id: number;
  children: ReactNode;
}

export function SortableSubcategory({ id, children }: SortableSubcategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-secondary/50 rounded overflow-hidden">
      <div className="flex items-start">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-2 hover:bg-secondary-foreground/10 self-stretch flex items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </button>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
