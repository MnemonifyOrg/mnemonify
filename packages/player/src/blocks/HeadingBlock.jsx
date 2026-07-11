export default function HeadingBlock({ block }) {
  const level = block.content.level && block.content.level >= 1 && block.content.level <= 6 ? block.content.level : 2;
  const Tag = `h${level}`;
  return (
    <Tag className="block block-heading" data-level={level}>
      {block.content.text}
    </Tag>
  );
}
