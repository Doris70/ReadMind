'use client';

const stickers = [
  { className: 'sticker-piece sticker-paper-page', label: '纸页贴纸装饰' },
  { className: 'sticker-piece sticker-botanical-a', label: '植物贴纸装饰' },
  { className: 'sticker-piece sticker-botanical-b', label: '花枝贴纸装饰' },
  { className: 'sticker-piece sticker-botanical-c', label: '叶片贴纸装饰' },
  { className: 'sticker-piece sticker-tape-a', label: '水彩纸胶带装饰' },
  { className: 'sticker-piece sticker-tape-b', label: '青绿色纸胶带装饰' },
  { className: 'sticker-piece sticker-tape-c', label: '浅色纸胶带装饰' },
  { className: 'sticker-piece sticker-botanical-d', label: '边缘花朵贴纸装饰' },
  { className: 'sticker-piece sticker-botanical-e', label: '边缘叶片贴纸装饰' },
  { className: 'sticker-piece sticker-botanical-f', label: '边缘小花贴纸装饰' },
  { className: 'sticker-piece sticker-tape-d', label: '边缘纸胶带装饰' },
];

export default function DecorativeStickers() {
  return (
    <div className="decorative-stickers" aria-hidden="true">
      {stickers.map(sticker => (
        <span key={sticker.className} className={sticker.className} title={sticker.label} />
      ))}
    </div>
  );
}
