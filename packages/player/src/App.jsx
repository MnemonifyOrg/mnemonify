import { useEffect, useState } from 'react';
import course from '../../../samples/sample-course.json';
import BlockRenderer from './blocks/BlockRenderer.jsx';
import { runTriggers } from './engine/triggerEngine.js';

function initialVariables(course) {
  const vars = {};
  course.variables.forEach((v) => {
    vars[v.name] = v.default;
  });
  return vars;
}

export default function App() {
  const [variables, setVariables] = useState(() => initialVariables(course));
  const page = course.pages[0];

  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', course.meta.theme.accent);
  }, []);

  useEffect(() => {
    console.log('[player] variable state:', variables);
  }, [variables]);

  function handleTrigger(block, eventName) {
    setVariables((current) => runTriggers(current, block.triggers, eventName));
  }

  return (
    <div className="player">
      <main className="player__page">
        <h1 className="player__page-title">{page.title}</h1>
        {page.blocks.map((block) => (
          <BlockRenderer key={block.block_id} block={block} assets={course.assets} onTrigger={handleTrigger} />
        ))}
      </main>
    </div>
  );
}
