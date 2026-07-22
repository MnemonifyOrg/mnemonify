import KnowledgeCheckBlock from './KnowledgeCheckBlock.jsx';
import { questionBlockId } from '../engine/scoring.js';

// The draw selection is materialized once during App boot. This component is
// deliberately only a renderer: it never samples on render, so React page
// revisits cannot silently change the learner's assessment.
export default function QuestionBankDrawBlock({ block, assets, onTrigger, onOpenModal, interactionStates, variables, printMode, worksheetMode }) {
  const questions = block.content?.drawn_questions || [];
  return (
    <div className="block block-question-bank-draw" data-bank-id={block.content?.bank_id}>
      {questions.map((question) => {
        const questionBlock = {
          block_id: questionBlockId(block.block_id, question.question_id),
          type: 'knowledge-check',
          content: { ...(question.content || {}), scored: question.scored !== false },
          triggers: [],
        };
        return (
          <KnowledgeCheckBlock
            key={questionBlock.block_id}
            block={questionBlock}
            assets={assets}
            onTrigger={onTrigger}
            onOpenModal={onOpenModal}
            interactionStates={interactionStates}
            variables={variables}
            printMode={printMode}
            worksheetMode={worksheetMode}
          />
        );
      })}
    </div>
  );
}
