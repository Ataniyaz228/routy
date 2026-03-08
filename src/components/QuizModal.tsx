'use client';

import { useState } from 'react';
import { QuizQuestion } from '@/lib/types';

interface QuizModalProps {
    nodeLabel: string;
    quiz: QuizQuestion;
    onCorrect: () => void;
    onWrong: () => void;
    onClose: () => void;
}

export default function QuizModal({
    nodeLabel,
    quiz,
    onCorrect,
    onWrong,
    onClose,
}: QuizModalProps) {
    const [selected, setSelected] = useState<'A' | 'B' | null>(null);
    const [result, setResult] = useState<'correct' | 'wrong' | null>(null);

    const handleAnswer = (option: 'A' | 'B') => {
        setSelected(option);
        if (option === quiz.correctOption) {
            setResult('correct');
            setTimeout(() => onCorrect(), 800);
        } else {
            setResult('wrong');
            setTimeout(() => onWrong(), 1200);
        }
    };

    return (
        <>
            <div className="quiz-overlay" onClick={onClose} />
            <div className={`quiz-modal ${result || ''}`}>
                <div className="quiz-header">
                    <span className="quiz-badge">Verification</span>
                    <h3 className="quiz-node-label">{nodeLabel}</h3>
                </div>

                <p className="quiz-question">{quiz.question}</p>

                <div className="quiz-options">
                    <button
                        className={`quiz-option ${selected === 'A' ? (result === 'correct' ? 'correct' : result === 'wrong' ? 'wrong' : '') : ''}`}
                        onClick={() => handleAnswer('A')}
                        disabled={selected !== null}
                    >
                        <span className="quiz-option-key">A</span>
                        {quiz.optionA}
                    </button>
                    <button
                        className={`quiz-option ${selected === 'B' ? (result === 'correct' ? 'correct' : result === 'wrong' ? 'wrong' : '') : ''}`}
                        onClick={() => handleAnswer('B')}
                        disabled={selected !== null}
                    >
                        <span className="quiz-option-key">B</span>
                        {quiz.optionB}
                    </button>
                </div>

                {result === 'correct' && (
                    <div className="quiz-feedback correct">✓ Correct! Node completed.</div>
                )}
                {result === 'wrong' && (
                    <div className="quiz-feedback wrong">✕ Incorrect. Try reviewing the theory.</div>
                )}
            </div>
        </>
    );
}
