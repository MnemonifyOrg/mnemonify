export default function ListBlock({ block }) {
  const Tag = block.content.style === 'numbered' ? 'ol' : 'ul';
  return (
    <Tag className="block block-list">
      {block.content.items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </Tag>
  );
}
