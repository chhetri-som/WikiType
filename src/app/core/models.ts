export type Status = 'idle' | 'running' | 'finished';
export type CharState = 'pending' | 'correct' | 'wrong';

export interface Keystroke {
    t: number;
    expected: string | null;
    typed: string;
    correct: boolean;
}

export interface CharView {
    ch: string;
    state: CharState;
}