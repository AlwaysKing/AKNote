import { useState } from 'react';
import { X, Smile } from 'lucide-react';
import { usePageStore } from '../../stores/pageStore';

interface PageIconProps {
  icon: string | null | undefined;
  spaceSlug: string;
  pageId: number;
}

const COMMON_EMOJIS = [
  '📝', '📚', '💡', '🎯', '🚀', '⭐', '🔥', '💻', '📊', '🎨',
  '📌', '✅', '❤️', '🎵', '🌟', '💪', '🎉', '📈', '🔧', '🎁',
];

export default function PageIcon({ icon, spaceSlug, pageId }: PageIconProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { updateMetadata } = usePageStore();

  const handleSelectEmoji = (emoji: string) => {
    updateMetadata(spaceSlug, pageId, { icon: emoji });
    setIsOpen(false);
  };

  const handleRemove = () => {
    updateMetadata(spaceSlug, pageId, { icon: null });
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      {!icon ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-notion-hover rounded transition-colors text-notion-textSecondary"
        >
          <Smile className="w-5 h-5" />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-4xl hover:bg-notion-hover rounded p-1 transition-colors"
        >
          {icon}
        </button>
      )}

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full mt-2 p-3 bg-white border border-notion-border rounded-lg shadow-lg z-20 w-64">
            <div className="flex flex-wrap gap-1 mb-3">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSelectEmoji(emoji)}
                  className="w-8 h-8 text-xl hover:bg-notion-hover rounded flex items-center justify-center transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
            {icon && (
              <button
                onClick={handleRemove}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm text-notion-textSecondary hover:bg-notion-hover rounded transition-colors"
              >
                <X className="w-4 h-4" />
                Remove icon
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
